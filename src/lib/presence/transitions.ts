/**
 * Spring-powered enter/exit transitions compatible with Svelte's
 * `transition:` / `in:` / `out:` directives.
 *
 * Svelte already orchestrates presence (a keyed `{#each}` runs `out:` before
 * unmount and `in:` on mount). What it lacks is spring timing — these
 * transitions accept a `spring` option and derive both the eased curve and the
 * natural settling `duration` from the simulation, so enters/exits feel like
 * the rest of the library.
 *
 * @example
 * ```svelte
 * {#each items as item (item.id)}
 *   <div transition:fly={{ y: 24, spring: { stiffness: 240, damping: 22 } }}>{item.text}</div>
 * {/each}
 * ```
 */

import type { TransitionConfig } from 'svelte/transition';
import { easeOut, springEasing } from '../easing';
import { restoreStyleProp, saveStyleProp } from '../shared/inline-style';
import type { EasingFn, SpringOptions } from '../shared/types';

export interface PresenceParams {
	/** Delay before the transition starts (ms). */
	delay?: number;
	/** Explicit duration (ms). Overrides the spring's natural duration. */
	duration?: number;
	/** Easing function. Overrides the spring curve when both are given. */
	easing?: EasingFn;
	/** Spring physics for the curve + auto-sized duration. `true` = defaults. */
	spring?: SpringOptions | boolean;
}

const DEFAULT_DURATION = 400;

/** Resolve `{ duration, easing }` from presence params, honoring `spring`. */
const resolveTiming = (params: PresenceParams): { duration: number; easing: EasingFn } => {
	if (params.spring) {
		const fn = springEasing(params.spring === true ? {} : params.spring);
		return {
			duration: params.duration ?? fn.duration,
			easing: params.easing ?? fn
		};
	}
	return {
		duration: params.duration ?? DEFAULT_DURATION,
		easing: params.easing ?? easeOut
	};
};

const config = (
	params: PresenceParams,
	css: (t: number, u: number) => string
): TransitionConfig => {
	const { duration, easing } = resolveTiming(params);
	return { delay: params.delay ?? 0, duration, easing, css };
};

/** Numeric value of a computed style property (px), defaulting to 0. */
const px = (style: CSSStyleDeclaration, prop: string): number =>
	parseFloat(style.getPropertyValue(prop)) || 0;

/** A size endpoint: a px number, or any CSS length (`'2rem'`, `'50%'`, `'auto'`, …). */
export type SizeValue = number | string;

/** Optional width/height a transition can tween *alongside* its main effect. */
export interface SizeFields {
	/** Width to start/end at — px number or any CSS length. Tweens to the natural width. */
	width?: SizeValue;
	/** Height to start/end at — px number or any CSS length. Tweens to the natural height. */
	height?: SizeValue;
}

/**
 * Resolve a size endpoint to px against the element itself. Numbers pass
 * through; CSS lengths (`'2rem'`, `'50%'`, `'auto'`, `'calc(…)'`) are resolved
 * by briefly assigning the value inline and reading back the computed px, then
 * restoring whatever was there. This means `%` / viewport / font-relative
 * units resolve in the element's real context.
 */
const resolveSize = (node: Element, axis: 'width' | 'height', value: SizeValue): number => {
	if (typeof value === 'number') return value;
	const style = (node as HTMLElement).style;
	const saved = saveStyleProp(style, axis);
	style.setProperty(axis, value);
	const resolved = px(getComputedStyle(node), axis);
	restoreStyleProp(style, axis, saved);
	return resolved;
};

/** The box-spacing that contributes to an axis's footprint, by side. */
const AXIS_SPACING = {
	width: [
		'padding-left',
		'padding-right',
		'border-left-width',
		'border-right-width',
		'margin-left',
		'margin-right'
	],
	height: [
		'padding-top',
		'padding-bottom',
		'border-top-width',
		'border-bottom-width',
		'margin-top',
		'margin-bottom'
	]
} as const;

interface AxisPlan {
	main: 'width' | 'height';
	natural: number;
	/** `[cssProp, naturalPx]` for every spacing contribution on the axis. */
	spacing: Array<[string, number]>;
	/** Start size as a fraction of the natural size. */
	startFraction: number;
}

/**
 * Snapshot an axis's natural footprint: the main size plus every spacing
 * contribution (padding, border, margin) on that axis. Scaling only
 * `width`/`height` isn't enough — under `box-sizing: border-box` the box floors
 * at its padding, so a `width: 0` element never fully closes its slot.
 * Collapsing the spacing by the same fraction takes the footprint to zero.
 */
const axisMetrics = (node: Element, axis: 'width' | 'height'): Omit<AxisPlan, 'startFraction'> => {
	const style = getComputedStyle(node);
	return {
		main: axis,
		natural: px(style, axis),
		spacing: AXIS_SPACING[axis].map((prop): [string, number] => [prop, px(style, prop)])
	};
};

/**
 * Plan a collapse for one axis from a caller-supplied start size. Naturals are
 * read before `resolveSize()`, which momentarily overrides the inline size.
 */
const planAxis = (node: Element, axis: 'width' | 'height', value: SizeValue): AxisPlan => {
	const metrics = axisMetrics(node, axis);
	const start = resolveSize(node, axis, value);
	return {
		...metrics,
		startFraction: metrics.natural > 0 ? start / metrics.natural : 0
	};
};

/**
 * Declarations that place every planned axis at eased progress `t` — the single
 * emitter shared by the `width`/`height` fields and the `size` transition.
 */
const growDecls = (plans: readonly AxisPlan[], t: number): string[] => {
	const decls = ['overflow: hidden'];
	for (const p of plans) {
		const f = p.startFraction + t * (1 - p.startFraction);
		decls.push(`${p.main}: ${f * p.natural}px`);
		for (const [prop, nat] of p.spacing) decls.push(`${prop}: ${f * nat}px`);
	}
	return decls;
};

/**
 * Build a `(t) => declarations[]` that grows the element from the given start
 * size to its natural footprint on each requested axis. Returns `null` when
 * neither dimension is requested.
 */
const sizeTween = (
	node: Element,
	{ width, height }: SizeFields
): ((t: number) => string[]) | null => {
	if (width == null && height == null) return null;
	const plans: AxisPlan[] = [];
	if (width != null) plans.push(planAxis(node, 'width', width));
	if (height != null) plans.push(planAxis(node, 'height', height));
	return (t) => growDecls(plans, t);
};

export type FadeParams = PresenceParams;

/** Fade opacity in/out. */
export const fade = (_node: Element, params: FadeParams = {}): TransitionConfig =>
	config(params, (t) => `opacity: ${t}`);

export interface FlyParams extends PresenceParams, SizeFields {
	/** Horizontal offset to travel from/to (px). */
	x?: number;
	/** Vertical offset to travel from/to (px). */
	y?: number;
	/** Opacity to start/end at. Default 0. */
	opacity?: number;
}

/** Slide + fade from an offset (Svelte's `fly`, spring-capable), optionally
 *  tweening width/height alongside the travel. */
export const fly = (node: Element, params: FlyParams = {}): TransitionConfig => {
	const { x = 0, y = 0, opacity = 0 } = params;
	const resize = sizeTween(node, params);
	return config(params, (t, u) => {
		const o = opacity + t * (1 - opacity);
		const decls = [`transform: translate(${u * x}px, ${u * y}px)`, `opacity: ${o}`];
		if (resize) decls.push(...resize(t));
		return decls.join('; ');
	});
};

export interface ScaleParams extends PresenceParams, SizeFields {
	/** Scale to start/end at. Default 0.92. */
	start?: number;
	/** Opacity to start/end at. Default 0. */
	opacity?: number;
}

/** Scale + fade (a "pop"), optionally tweening width/height alongside. */
export const scale = (node: Element, params: ScaleParams = {}): TransitionConfig => {
	const { start = 0.92, opacity = 0 } = params;
	const resize = sizeTween(node, params);
	return config(params, (t) => {
		const s = start + t * (1 - start);
		const o = opacity + t * (1 - opacity);
		const decls = [`transform: scale(${s})`, `opacity: ${o}`, 'transform-origin: center'];
		if (resize) decls.push(...resize(t));
		return decls.join('; ');
	});
};

export interface SizeParams extends PresenceParams {
	/** Which axis to collapse. `'both'` animates width *and* height. Default `'y'`. */
	axis?: 'x' | 'y' | 'both';
	/** Fraction of the natural size to start/end at. `0` = fully collapsed. Default 0. */
	start?: number;
	/**
	 * Opacity to start/end at. Omit to leave opacity untouched (size-only);
	 * pass `0` to fade alongside the collapse.
	 */
	opacity?: number;
}

/**
 * Collapse/expand an element's width and/or height (with its padding, border,
 * and margin on that axis) — like Svelte's `slide`, but for either or both
 * axes. Measures the element's natural size up front and scales every
 * box-spacing contribution by the eased progress so the layout reflows cleanly.
 */
export const size = (node: Element, params: SizeParams = {}): TransitionConfig => {
	const { axis = 'y', start = 0, opacity } = params;

	// Snapshot the natural box metrics once; growDecls() scales them by `f`.
	// `start` is already a fraction here, so no resolveSize() round-trip.
	const plans: AxisPlan[] = [];
	if (axis === 'x' || axis === 'both')
		plans.push({ ...axisMetrics(node, 'width'), startFraction: start });
	if (axis === 'y' || axis === 'both')
		plans.push({ ...axisMetrics(node, 'height'), startFraction: start });

	return config(params, (t) => {
		const decls = growDecls(plans, t);
		if (opacity != null) decls.push(`opacity: ${opacity + t * (1 - opacity)}`);
		return decls.join('; ');
	});
};
