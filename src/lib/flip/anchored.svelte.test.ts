import { afterEach, describe, expect, it, vi } from 'vitest';
import { anchoredFlip } from './index';

const FLIP_PROPERTIES = ['--flip-x', '--flip-y', '--flip-scale-x', '--flip-scale-y'] as const;

let mounted: Element[] = [];

const mountBox = (styles: Partial<CSSStyleDeclaration>): HTMLDivElement => {
	const element = document.createElement('div');
	Object.assign(element.style, { position: 'fixed', ...styles });
	document.body.appendChild(element);
	mounted.push(element);
	return element;
};

const settleAnimations = async (element: Element): Promise<void> => {
	const animations = element.getAnimations();
	await Promise.all(animations.map((animation) => animation.finished.catch(() => undefined)));
	await Promise.resolve();
};

const expectRestingVisualState = (element: HTMLElement): void => {
	const rect = element.getBoundingClientRect();
	expect(rect.x).toBeCloseTo(200, 0);
	expect(rect.y).toBeCloseTo(100, 0);
	expect(rect.width).toBeCloseTo(240, 0);
	expect(rect.height).toBeCloseTo(120, 0);
	expect(getComputedStyle(element).opacity).toBe('1');
	expect(element.style.pointerEvents).toBe('');
	for (const property of FLIP_PROPERTIES) {
		expect(element.style.getPropertyValue(property)).toBe('');
	}
};

afterEach(() => {
	for (const element of mounted) element.remove();
	mounted = [];
});

describe('anchoredFlip()', () => {
	it('opens, closes, and reopens a mounted element at its resting geometry', async () => {
		const reference = mountBox({ left: '20px', top: '30px', width: '40px', height: '20px' });
		const overlay = mountBox({ left: '200px', top: '100px', width: '240px', height: '120px' });
		let open = true;
		const transition = anchoredFlip(
			() => open,
			() => reference,
			{
				duration: 30,
				disablePointerEvents: true
			}
		);

		let cleanup = transition(overlay);
		await settleAnimations(overlay);
		expectRestingVisualState(overlay);

		open = false;
		cleanup?.();
		cleanup = transition(overlay);
		await settleAnimations(overlay);

		open = true;
		cleanup?.();
		cleanup = transition(overlay);
		await settleAnimations(overlay);
		expectRestingVisualState(overlay);

		cleanup?.();
	});

	it('clears stale FLIP variables before measuring an enter', async () => {
		const reference = mountBox({ left: '20px', top: '30px', width: '40px', height: '20px' });
		const overlay = mountBox({ left: '200px', top: '100px', width: '240px', height: '120px' });
		overlay.style.translate =
			'calc(var(--motion-x, 0px) + var(--flip-x, 0px)) calc(var(--motion-y, 0px) + var(--flip-y, 0px))';
		overlay.style.scale = 'var(--flip-scale-x, 1) var(--flip-scale-y, 1)';
		overlay.style.setProperty('--flip-x', '-180px');
		overlay.style.setProperty('--flip-y', '-70px');
		overlay.style.setProperty('--flip-scale-x', `${40 / 240}`);
		overlay.style.setProperty('--flip-scale-y', `${20 / 120}`);
		const transition = anchoredFlip(
			() => true,
			() => reference,
			{ duration: 30 }
		);

		const cleanup = transition(overlay);
		await settleAnimations(overlay);

		expectRestingVisualState(overlay);
		cleanup?.();
	});

	it('restores the open visual state when an exit is interrupted by a new enter', async () => {
		const reference = mountBox({ left: '20px', top: '30px', width: '40px', height: '20px' });
		const overlay = mountBox({ left: '200px', top: '100px', width: '240px', height: '120px' });
		let open = true;
		const transition = anchoredFlip(
			() => open,
			() => reference,
			{ duration: 150 }
		);

		let cleanup = transition(overlay);
		await settleAnimations(overlay);

		open = false;
		cleanup?.();
		cleanup = transition(overlay);
		await new Promise((resolve) => requestAnimationFrame(resolve));

		open = true;
		cleanup?.();
		cleanup = transition(overlay);
		await settleAnimations(overlay);

		expectRestingVisualState(overlay);
		expect(overlay.style.opacity).toBe('');
		cleanup?.();
	});

	it('does nothing for an initially closed mounted element', () => {
		const overlay = mountBox({ left: '200px', top: '100px', width: '240px', height: '120px' });
		let referenceReads = 0;
		const transition = anchoredFlip(
			() => false,
			() => {
				referenceReads++;
				return null;
			}
		);

		const cleanup = transition(overlay);

		expect(referenceReads).toBe(0);
		expect(overlay.getAnimations()).toHaveLength(0);
		expectRestingVisualState(overlay);
		cleanup?.();
	});

	it('settles closed without geometry when the reference disappears before exit', async () => {
		const reference = mountBox({ left: '20px', top: '30px', width: '40px', height: '20px' });
		const overlay = mountBox({ left: '200px', top: '100px', width: '240px', height: '120px' });
		let open = true;
		let currentReference: Element | null = reference;
		const transition = anchoredFlip(
			() => open,
			() => currentReference,
			{ duration: 150 }
		);

		let cleanup = transition(overlay);
		await settleAnimations(overlay);

		currentReference = null;
		open = false;
		cleanup?.();
		cleanup = transition(overlay);

		expect(overlay.getAnimations()).toHaveLength(0);
		expect(getComputedStyle(overlay).opacity).toBe('0');
		expect(overlay.getBoundingClientRect().width).toBeCloseTo(240, 0);
		cleanup?.();
	});

	it('cancels safely and restores styles when the reference disappears', async () => {
		const reference = mountBox({ left: '20px', top: '30px', width: '40px', height: '20px' });
		const overlay = mountBox({ left: '200px', top: '100px', width: '240px', height: '120px' });
		let open = true;
		let currentReference: Element | null = reference;
		const transition = anchoredFlip(
			() => open,
			() => currentReference,
			{ duration: 150 }
		);

		let cleanup = transition(overlay);
		await settleAnimations(overlay);

		open = false;
		cleanup?.();
		cleanup = transition(overlay);
		await new Promise((resolve) => requestAnimationFrame(resolve));

		currentReference = null;
		open = true;
		cleanup?.();
		expect(() => {
			cleanup = transition(overlay);
		}).not.toThrow();

		expect(overlay.getAnimations()).toHaveLength(0);
		expectRestingVisualState(overlay);
		cleanup?.();
	});

	it('restores pre-existing inline styles when destroyed during a transition', async () => {
		const reference = mountBox({ left: '20px', top: '30px', width: '40px', height: '20px' });
		const overlay = mountBox({
			left: '200px',
			top: '100px',
			width: '240px',
			height: '120px',
			opacity: '0.75',
			pointerEvents: 'auto'
		});
		const transition = anchoredFlip(
			() => true,
			() => reference,
			{
				duration: 200,
				disablePointerEvents: true
			}
		);

		const cleanup = transition(overlay);
		await new Promise((resolve) => requestAnimationFrame(resolve));
		cleanup?.();

		expect(overlay.getAnimations()).toHaveLength(0);
		expect(overlay.style.opacity).toBe('0.75');
		expect(overlay.style.pointerEvents).toBe('auto');
		for (const property of FLIP_PROPERTIES) {
			expect(overlay.style.getPropertyValue(property)).toBe('');
		}
	});

	it('reaches the closed anchor state when enter is interrupted by exit', async () => {
		const reference = mountBox({ left: '20px', top: '30px', width: '40px', height: '20px' });
		const overlay = mountBox({ left: '200px', top: '100px', width: '240px', height: '120px' });
		let open = true;
		const transition = anchoredFlip(
			() => open,
			() => reference,
			{ duration: 150 }
		);

		let cleanup = transition(overlay);
		await new Promise((resolve) => requestAnimationFrame(resolve));

		open = false;
		cleanup?.();
		cleanup = transition(overlay);
		await settleAnimations(overlay);

		const rect = overlay.getBoundingClientRect();
		expect(rect.x).toBeCloseTo(20, 0);
		expect(rect.y).toBeCloseTo(30, 0);
		expect(rect.width).toBeCloseTo(40, 0);
		expect(rect.height).toBeCloseTo(20, 0);
		expect(getComputedStyle(overlay).opacity).toBe('0');
		cleanup?.();
	});

	it('settles immediately in valid open and closed states under reduced motion', async () => {
		const originalMatchMedia = window.matchMedia;
		window.matchMedia = vi.fn().mockReturnValue({
			matches: true,
			addEventListener: vi.fn(),
			removeEventListener: vi.fn()
		}) as unknown as typeof window.matchMedia;
		vi.resetModules();

		try {
			const { anchoredFlip: reducedAnchoredFlip } = await import('./index');
			const reference = mountBox({ left: '20px', top: '30px', width: '40px', height: '20px' });
			const overlay = mountBox({ left: '200px', top: '100px', width: '240px', height: '120px' });
			let open = true;
			const transition = reducedAnchoredFlip(
				() => open,
				() => reference,
				{ duration: 500 }
			);

			let cleanup = transition(overlay);
			expect(overlay.getAnimations()).toHaveLength(0);
			expectRestingVisualState(overlay);

			open = false;
			cleanup?.();
			cleanup = transition(overlay);
			expect(overlay.getAnimations()).toHaveLength(0);
			expect(getComputedStyle(overlay).opacity).toBe('0');
			expect(overlay.getBoundingClientRect().width).toBeCloseTo(240, 0);

			open = true;
			cleanup?.();
			cleanup = transition(overlay);
			expectRestingVisualState(overlay);
			cleanup?.();
		} finally {
			window.matchMedia = originalMatchMedia;
			vi.resetModules();
		}
	});

	it('accepts a virtual reference element', async () => {
		const overlay = mountBox({ left: '200px', top: '100px', width: '240px', height: '120px' });
		const reference = {
			getBoundingClientRect: () => ({ left: 20, top: 30, width: 40, height: 20 })
		};
		const transition = anchoredFlip(
			() => true,
			() => reference,
			{ duration: 30 }
		);

		const cleanup = transition(overlay);
		await settleAnimations(overlay);

		expectRestingVisualState(overlay);
		cleanup?.();
	});
});
