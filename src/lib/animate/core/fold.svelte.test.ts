/**
 * The transform fold, end to end in a real browser. Runs in the `client`
 * project, where `style.translate` and registered custom properties actually
 * exist — the unit tests in `keyframes/fold.test.ts` cover the substitution
 * itself, this covers whether `animate()` engages it and gives it back.
 *
 * Nothing here asserts that an animation is composited: Chromium exposes no
 * API for that. What is assertable is the shape the compositor requires —
 * real transform properties in the effect and no custom properties beside
 * them — plus the promise that the fold is invisible to everything else.
 */

import { afterEach, describe, expect, it } from 'vitest';
import { animate } from './animate';
import { measureWithoutAncestorTransforms } from '../properties/properties';

let node: HTMLElement | null = null;

const mount = (): HTMLElement => {
	const el = document.createElement('div');
	el.style.cssText = 'position:fixed;top:50px;left:50px;width:100px;height:100px';
	document.body.appendChild(el);
	node = el;
	return el;
};

afterEach(() => {
	node?.remove();
	node = null;
});

/** Keys WAAPI adds to every computed keyframe that are not animated properties. */
const KEYFRAME_METADATA = new Set(['offset', 'computedOffset', 'easing', 'composite']);

/** The property names an effect animates, as WAAPI reports them back. */
const animatedProps = (animation: Animation): string[] => [
	...new Set(
		(animation.effect as KeyframeEffect)
			.getKeyframes()
			.flatMap((frame: Keyframe) => Object.keys(frame))
			.filter((key: string) => !KEYFRAME_METADATA.has(key))
	)
];

describe('transform folding', () => {
	it('drives real transform properties instead of custom properties', () => {
		const el = mount();

		const controller = animate(
			el,
			{
				flipX: [120, 0],
				flipY: [40, 0],
				flipScaleX: [0.5, 1],
				flipScaleY: [0.5, 1],
				opacity: [0, 1]
			},
			{ duration: 400 }
		);

		const props = animatedProps(controller.animations[0]!);
		expect(props).toContain('translate');
		expect(props).toContain('scale');
		expect(props.some((prop) => prop.startsWith('--'))).toBe(false);
		controller.cancel();
	});

	it('hands the element back to the variables when a second animation starts', () => {
		const el = mount();
		const first = animate(el, { flipX: [120, 0] }, { duration: 400 });
		expect(animatedProps(first.animations[0]!)).toContain('translate');

		// A sibling animation owns `--motion-x`; the fold would mask it.
		const second = animate(el, { x: [0, 30] }, { duration: 400 });

		expect(animatedProps(first.animations[0]!)).toEqual(['--flip-x']);
		expect(first.animations[0]!.playState).toBe('running');
		first.cancel();
		second.cancel();
	});

	it('still measures the resting box while folded', () => {
		const el = mount();
		const resting = el.getBoundingClientRect();

		const controller = animate(el, { flipX: [200, 0] }, { duration: 400 });

		// The element is visibly displaced, but FLIP must still read its slot.
		expect(measureWithoutAncestorTransforms(el).left).toBeCloseTo(resting.left, 1);
		controller.cancel();
	});

	it('leaves the transform alone when the caller set their own', () => {
		const el = mount();
		el.style.translate = '10px 10px';

		const controller = animate(el, { flipX: [120, 0] }, { duration: 400 });

		// Folding here would animate a value we do not own.
		expect(animatedProps(controller.animations[0]!)).toEqual(['--flip-x']);
		expect(el.style.translate).toBe('10px 10px');
		controller.cancel();
	});
});
