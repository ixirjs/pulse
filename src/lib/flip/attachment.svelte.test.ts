import { flushSync } from 'svelte';
import { afterEach, describe, expect, it } from 'vitest';
import { flip } from './index';
import type { FlipOptions } from './types';

let mounted: Element[] = [];
let roots: Array<() => void> = [];

const mountBox = (): HTMLDivElement => {
	const element = document.createElement('div');
	Object.assign(element.style, {
		position: 'fixed',
		top: '0px',
		left: '20px',
		width: '40px',
		height: '20px'
	});
	document.body.appendChild(element);
	mounted.push(element);
	return element;
};

/** Attach `flip()` inside an effect root so its `$effect`s run under `flushSync`. */
const attach = (element: HTMLElement, options: () => FlipOptions): void => {
	// Returning the attachment's cleanup makes the root's dispose tear it down,
	// the way Svelte's attachment machinery does.
	const dispose = $effect.root(() => flip(options)(element));
	roots.push(dispose);
	flushSync();
};

const settleAnimations = async (element: Element): Promise<void> => {
	await Promise.all(
		element.getAnimations().map((animation) => animation.finished.catch(() => undefined))
	);
	await Promise.resolve();
};

afterEach(() => {
	for (const dispose of roots) dispose();
	roots = [];
	for (const element of mounted) element.remove();
	mounted = [];
});

describe('flip() reactive class/style', () => {
	it('applies a style change and animates the resulting layout shift', async () => {
		const element = mountBox();
		let open = $state(false);
		attach(element, () => ({
			duration: 40,
			style: () => (open ? 'left: 200px' : 'left: 20px')
		}));

		expect(element.getAnimations()).toHaveLength(0);

		open = true;
		flushSync();

		expect(element.style.left).toBe('200px');
		expect(element.getAnimations().length).toBeGreaterThan(0);

		await settleAnimations(element);
		expect(element.getBoundingClientRect().x).toBeCloseTo(200, 0);
		expect(element.style.getPropertyValue('--motion-x')).toBe('');
	});

	it('applies the initial class before the first measure, so mounting does not animate', () => {
		const element = mountBox();
		attach(element, () => ({ duration: 40, class: () => ({ 'is-open': true }) }));

		expect(element.classList.contains('is-open')).toBe(true);
		expect(element.getAnimations()).toHaveLength(0);
	});

	it('counts only cycles that move, so skip sees the first real change', async () => {
		const element = mountBox();
		let open = $state(false);
		const renders: number[] = [];
		attach(element, () => ({
			duration: 40,
			skip: (render) => {
				renders.push(render);
				return render === 0;
			},
			style: () => (open ? 'left: 200px' : 'left: 20px')
		}));

		open = true;
		flushSync();

		expect(renders).toEqual([0]);
		expect(element.getAnimations()).toHaveLength(0);
		await settleAnimations(element);
	});

	it('removes the classes it applied on teardown', () => {
		const element = mountBox();
		element.classList.add('from-markup');
		attach(element, () => ({ class: () => 'is-open' }));
		expect(element.classList.contains('is-open')).toBe(true);

		for (const dispose of roots) dispose();
		roots = [];

		expect([...element.classList]).toEqual(['from-markup']);
	});
});
