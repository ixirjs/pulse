/**
 * `animateGradient()` — tween between two CSS `linear-gradient` backgrounds.
 *
 * WAAPI cannot interpolate `background-image`, so this runs its own rAF loop:
 * it parses both gradients, resolves colour keywords through a canvas (so
 * `"rebeccapurple"`, `currentColor`-resolved values, etc. all work), and writes
 * an interpolated gradient string each frame. Best results when both gradients
 * share the same number of colour stops; otherwise it snaps to the target.
 *
 * ponytail: main-thread rAF loop + hand-rolled colour math. Registered
 * `@property` custom properties (`<color>` / `<percentage>` / `<angle>`) would
 * let the browser interpolate the stops and drop `lerpRGBA` + the canvas
 * keyword-resolution hack — at the cost of a permanent global property
 * registry and a Firefox 128 / Safari 16.4 floor. Switch when that floor is
 * acceptable; the parser is needed either way.
 *
 * @example
 * ```ts
 * animateGradient(
 *   el,
 *   'linear-gradient(90deg, #f00 0%, #00f 100%)',
 *   'linear-gradient(180deg, #0f0 0%, #ff0 100%)',
 *   { duration: 600 },
 * );
 * ```
 */

import { isBrowser } from '../shared/browser';
import { frameTween } from '../shared/frame-tween';
import { easeOut } from '../easing';
import type { EasingFn } from '../shared/types';
import {
	formatInterpolatedLinearGradient,
	parseLinearGradient,
	parseRGBA,
	resolvePositions,
	type RGBA
} from './parse';

export interface GradientOptions {
	/** Duration in ms. Default 400. */
	duration?: number;
	/** Easing function. Default ease-out. */
	easing?: EasingFn;
	/** Delay before starting (ms). Default 0. */
	delay?: number;
	/** CSS property to write. Default `'background-image'`. */
	property?: string;
	/** Called once when the tween settles. */
	onComplete?: () => void;
}

export interface GradientController {
	/** Resolves when the tween settles (or is cancelled). */
	readonly finished: Promise<void>;
	/** Stop the tween where it is. */
	cancel(): void;
}

let canvasCtx: CanvasRenderingContext2D | null | undefined;

/** Resolve any CSS colour (named, hex, rgb, hsl) to normalized RGBA via canvas. */
const resolveColor = (color: string): RGBA => {
	if (canvasCtx === undefined) {
		canvasCtx = document.createElement('canvas').getContext('2d');
	}
	if (!canvasCtx) return parseRGBA(color);
	canvasCtx.fillStyle = '#000';
	canvasCtx.fillStyle = color;
	return parseRGBA(canvasCtx.fillStyle);
};

interface Resolved {
	angle: number;
	colors: RGBA[];
	positions: number[];
}

const resolve = (gradient: string): Resolved => {
	const { angle, stops } = parseLinearGradient(gradient);
	return {
		angle,
		colors: stops.map((s) => resolveColor(s.color)),
		positions: resolvePositions(stops)
	};
};

/** Animate `element` from one linear-gradient to another. */
export const animateGradient = (
	element: HTMLElement | SVGElement,
	from: string,
	to: string,
	options: GradientOptions = {}
): GradientController => {
	const {
		duration = 400,
		easing = easeOut,
		delay = 0,
		property = 'background-image',
		onComplete
	} = options;

	if (!isBrowser()) return { finished: Promise.resolve(), cancel: () => {} };

	const a = resolve(from);
	const b = resolve(to);
	const write = (value: string): void => element.style.setProperty(property, value);

	// Mismatched stop counts can't be interpolated stop-for-stop: snap to target.
	if (a.colors.length !== b.colors.length) {
		write(to);
		onComplete?.();
		return { finished: Promise.resolve(), cancel: () => {} };
	}

	const tween = frameTween({
		duration,
		delay,
		renderInitial: true,
		onFrame: (progress) =>
			write(
				formatInterpolatedLinearGradient(
					a.angle,
					b.angle,
					a.colors,
					b.colors,
					a.positions,
					b.positions,
					easing(progress)
				)
			),
		onComplete
	});

	return { finished: tween.finished, cancel: tween.cancel };
};
