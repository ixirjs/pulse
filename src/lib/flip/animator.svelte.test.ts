import { afterEach, describe, expect, it } from 'vitest';
import { animateFlip } from './animator';
import { measure } from './geometry';

let element: HTMLDivElement | null = null;

afterEach(() => {
	element?.remove();
	element = null;
});

describe('forward FLIP opacity', () => {
	it('reverses crossfade endpoints for a forward exit', async () => {
		element = document.createElement('div');
		Object.assign(element.style, {
			position: 'fixed',
			left: '200px',
			top: '100px',
			width: '240px',
			height: '120px'
		});
		document.body.appendChild(element);

		const controller = animateFlip({
			element,
			from: measure(element),
			to: { x: 20, y: 30, width: 40, height: 20 },
			options: { duration: 30, opacity: { from: 0.2, to: 0.8 } },
			forward: true
		});

		expect(controller).not.toBeNull();
		await controller?.finished;
		expect(getComputedStyle(element).opacity).toBe('0.2');
	});
});
