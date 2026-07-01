/**
 * Tests for the property registry, transform bit-flags, and the
 * register/deregister animation tracking helpers.
 * No DOM access — runs in the `server` vitest project.
 */

import { describe, expect, it } from 'vitest';
import {
	PROPERTY_REGISTRY,
	TRANSFORM_TEMPLATES,
	VAR_BIT,
	deregisterTransformAnimation,
	registerTransformAnimation
} from './properties';
import { ensurePropertiesRegistered } from './transform-setup';

// ---------------------------------------------------------------------------
// PROPERTY_REGISTRY
// ---------------------------------------------------------------------------

describe('PROPERTY_REGISTRY', () => {
	it('is a non-empty object', () => {
		expect(typeof PROPERTY_REGISTRY).toBe('object');
		expect(Object.keys(PROPERTY_REGISTRY).length).toBeGreaterThan(0);
	});

	it('contains the core transform props', () => {
		for (const key of ['x', 'y', 'z', 'scale', 'scaleX', 'scaleY', 'rotate']) {
			expect(PROPERTY_REGISTRY).toHaveProperty(key);
			expect(PROPERTY_REGISTRY[key]!.transform).toBe(true);
		}
	});

	it('contains FLIP-exclusive vars', () => {
		for (const key of ['flipX', 'flipY', 'flipScaleX', 'flipScaleY']) {
			expect(PROPERTY_REGISTRY).toHaveProperty(key);
			expect(PROPERTY_REGISTRY[key]!.transform).toBe(true);
		}
	});

	it('contains common CSS props like opacity, width, height', () => {
		expect(PROPERTY_REGISTRY).toHaveProperty('opacity');
		expect(PROPERTY_REGISTRY).toHaveProperty('width');
		expect(PROPERTY_REGISTRY).toHaveProperty('height');
	});

	it('every PropDef has a css string and unit string', () => {
		for (const [key, def] of Object.entries(PROPERTY_REGISTRY)) {
			expect(typeof def.css, `${key}.css`).toBe('string');
			expect(def.css.length, `${key}.css length`).toBeGreaterThan(0);
			expect(typeof def.unit, `${key}.unit`).toBe('string');
		}
	});

	it('every PropDef has an initial string', () => {
		for (const [key, def] of Object.entries(PROPERTY_REGISTRY)) {
			expect(typeof def.initial, `${key}.initial`).toBe('string');
		}
	});

	it('transform props animate via CSS custom properties (css starts with --)', () => {
		for (const [key, def] of Object.entries(PROPERTY_REGISTRY)) {
			if (def.transform) {
				expect(def.css, `${key}.css should start with --`).toMatch(/^--/);
			}
		}
	});
});

// ---------------------------------------------------------------------------
// TRANSFORM_TEMPLATES
// ---------------------------------------------------------------------------

describe('TRANSFORM_TEMPLATES', () => {
	it('translate references --motion-x, --motion-y and --flip-x, --flip-y', () => {
		expect(TRANSFORM_TEMPLATES.translate).toContain('--motion-x');
		expect(TRANSFORM_TEMPLATES.translate).toContain('--motion-y');
		expect(TRANSFORM_TEMPLATES.translate).toContain('--flip-x');
		expect(TRANSFORM_TEMPLATES.translate).toContain('--flip-y');
	});

	it('scale references --motion-scale and --flip-scale', () => {
		expect(TRANSFORM_TEMPLATES.scale).toContain('--motion-scale');
		expect(TRANSFORM_TEMPLATES.scale).toContain('--flip-scale-x');
	});

	it('rotate references --motion-rotate', () => {
		expect(TRANSFORM_TEMPLATES.rotate).toContain('--motion-rotate');
	});
});

// ---------------------------------------------------------------------------
// VAR_BIT
// ---------------------------------------------------------------------------

describe('VAR_BIT', () => {
	it('is an object with entries for the motion CSS vars', () => {
		expect(VAR_BIT).toHaveProperty('--motion-x');
		expect(VAR_BIT).toHaveProperty('--motion-y');
		expect(VAR_BIT).toHaveProperty('--motion-scale');
		expect(VAR_BIT).toHaveProperty('--motion-rotate');
		expect(VAR_BIT).toHaveProperty('--flip-x');
		expect(VAR_BIT).toHaveProperty('--flip-y');
	});

	it('every bit value is a power of two', () => {
		for (const [name, bit] of Object.entries(VAR_BIT)) {
			expect(Number.isInteger(bit), `${name} is integer`).toBe(true);
			expect(bit & (bit - 1), `${name} is power of 2`).toBe(0);
		}
	});

	it('all bit values are distinct', () => {
		const bits = Object.values(VAR_BIT);
		const unique = new Set(bits);
		expect(unique.size).toBe(bits.length);
	});
});

// ---------------------------------------------------------------------------
// ensurePropertiesRegistered
// ---------------------------------------------------------------------------

describe('ensurePropertiesRegistered()', () => {
	it('does not throw in non-browser environment (CSS undefined)', () => {
		expect(() => ensurePropertiesRegistered()).not.toThrow();
	});

	it('can be called multiple times without throwing', () => {
		expect(() => {
			ensurePropertiesRegistered();
			ensurePropertiesRegistered();
		}).not.toThrow();
	});
});

// ---------------------------------------------------------------------------
// registerTransformAnimation / deregisterTransformAnimation
// ---------------------------------------------------------------------------

describe('registerTransformAnimation() + deregisterTransformAnimation()', () => {
	// Use a plain object cast — we only need WeakMap identity, no DOM.
	const el = {} as Element;

	it('register increments and deregister decrements without error', () => {
		const bit = VAR_BIT['--motion-x']!;
		expect(() => registerTransformAnimation(el, bit)).not.toThrow();
		expect(() => deregisterTransformAnimation(el, bit)).not.toThrow();
	});

	it('deregistering an element with no active animations is a no-op', () => {
		const bit = VAR_BIT['--motion-y']!;
		const newEl = {} as Element;
		expect(() => deregisterTransformAnimation(newEl, bit)).not.toThrow();
	});

	it('registering multiple bits and deregistering one at a time', () => {
		const el2 = {} as Element;
		const xBit = VAR_BIT['--motion-x']!;
		const yBit = VAR_BIT['--motion-y']!;
		expect(() => {
			registerTransformAnimation(el2, xBit | yBit);
			deregisterTransformAnimation(el2, xBit);
			deregisterTransformAnimation(el2, yBit);
		}).not.toThrow();
	});

	it('double-deregistering does not underflow below zero (clamped)', () => {
		const el3 = {} as Element;
		const bit = VAR_BIT['--motion-scale']!;
		registerTransformAnimation(el3, bit);
		deregisterTransformAnimation(el3, bit);
		// Second deregister on an element with counts already at zero is safe
		expect(() => deregisterTransformAnimation(el3, bit)).not.toThrow();
	});
});
