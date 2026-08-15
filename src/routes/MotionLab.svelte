<script lang="ts">
	import { tick } from 'svelte';
	import {
		animate,
		timeline,
		stagger,
		easings,
		motionPath,
		draw,
		countUp,
		type AnimationController,
		type MotionElement
	} from '$lib/animate';
	import { flip, snapshotRect, flipFrom } from '$lib/flip';
	import {
		draggable,
		reorder,
		pinchable,
		moveable,
		focusable,
		pressable,
		wheelable,
		type DragInfo
	} from '$lib/gestures';
	import { inView } from '$lib/scroll';
	import { fly, size } from '$lib/presence';
	import { variants } from '$lib/variants';
	import { animateGradient } from '$lib/gradient';
	import { morph } from '$lib/morph';
	import { splitText } from '$lib/text';
	import { viewTransition, viewTransitionName } from '$lib/view-transition';
	import DemoCard from './DemoCard.svelte';

	const { easeInOut, easeOut, backOut } = easings;
	const range = (n: number): number[] => Array.from({ length: n }, (_, i) => i);

	// Theme — the class is set before hydration by the inline script in app.html;
	// read it back here so the toggle reflects the active theme.
	let dark = $derived(
		typeof document !== 'undefined' && document.documentElement.classList.contains('dark')
	);
	function toggleTheme() {
		dark = !dark;
		document.documentElement.classList.toggle('dark', dark);
		localStorage.setItem('theme', dark ? 'dark' : 'light');
	}

	/**
	 * Re-run a reversible, per-element animation. Any in-flight run is frozen at
	 * its current on-screen position via `stop()`, so the freshly-built animation
	 * can resume from there — reverse a half-finished toggle and it stays smooth
	 * instead of snapping. The factory should therefore omit the start keyframe
	 * (pass a target only) and read the current value implicitly. Returns the new
	 * controllers so the next toggle can interrupt this run in turn.
	 */
	function retrigger(
		prev: AnimationController[],
		els: (HTMLElement | undefined)[],
		make: (el: HTMLElement, i: number) => AnimationController
	): AnimationController[] {
		prev.forEach((c) => c.stop());
		return els.flatMap((el, i) => (el ? [make(el, i)] : []));
	}

	// 1. animate() — toggle a row of boxes into a smooth arch (lift only, no
	// overlap), squares rounding into pills as they rise.
	const BASIC_COUNT = 6;
	let basicBoxes = $state<(HTMLElement | undefined)[]>([]);
	let basicOn = $state(false);
	let basicControllers: AnimationController[] = [];
	function runBasic() {
		basicOn = !basicOn;
		basicControllers = retrigger(basicControllers, basicBoxes, (el, i) => {
			const lift = -Math.sin((i / (BASIC_COUNT - 1)) * Math.PI) * 38;
			return animate(
				el,
				{
					y: basicOn ? lift : 0,
					borderRadius: basicOn ? 18 : 6,
					backgroundColor: basicOn ? '#8b5cf6' : '#6366f1'
				},
				{ delay: i * 55, duration: 520, easing: backOut }
			);
		});
	}

	// 2. Spring physics — a grid of dots springing with staggered params
	let springEls = $state<(HTMLElement | undefined)[]>([]);
	let springActive = $state(false);
	let springControllers: AnimationController[] = [];
	function triggerSpring() {
		springActive = !springActive;
		springControllers = retrigger(springControllers, springEls, (el, i) =>
			animate(el, {
				scale: { to: springActive ? 1.2 : 1, spring: { stiffness: 240 - i * 8, damping: 10 } },
				rotate: { to: springActive ? 45 : 0, spring: { stiffness: 200, damping: 12 } }
			})
		);
	}

	// 3. stagger() — pop a grid in from the centre
	let staggerEls = $state<(HTMLElement | undefined)[]>([]);
	let staggerVisible = $state(true);
	const STAGGER_COUNT = 16;
	const delay = stagger(45, { from: 'center' });
	let staggerControllers: AnimationController[] = [];
	function toggleStagger() {
		staggerVisible = !staggerVisible;
		staggerControllers = retrigger(staggerControllers, staggerEls, (el, i) =>
			animate(
				el,
				{ opacity: staggerVisible ? 1 : 0, scale: staggerVisible ? 1 : 0.3 },
				{ delay: delay(i, STAGGER_COUNT), duration: 320, easing: backOut }
			)
		);
	}

	// 4. timeline() — orchestrate a card reveal
	let tlCard = $state<HTMLElement | undefined>();
	let tlLabel = $state<HTMLElement | undefined>();
	let tlTitle = $state<HTMLElement | undefined>();
	let tlBody = $state<HTMLElement | undefined>();
	let tlCta = $state<HTMLElement | undefined>();
	function runTimeline() {
		if (!tlCard || !tlLabel || !tlTitle || !tlBody || !tlCta) return;
		timeline({ duration: 380, easing: easeOut })
			.add(tlCard, { opacity: [0, 1], y: [32, 0] })
			.add(tlLabel, { opacity: [0, 1], x: [-8, 0] }, undefined, '<+40')
			.add(tlTitle, { opacity: [0, 1], y: [8, 0] }, undefined, '<+60')
			.add(tlBody, { opacity: [0, 1] }, undefined, '<+80')
			.add(tlCta, { opacity: [0, 1], scale: [0.88, 1] }, undefined, '<+60')
			.play();
	}

	// 5. flip() — auto-tracked reorder
	let flipItems = $state(['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I']);
	function shuffleFlip() {
		flipItems = [...flipItems].sort(() => Math.random() - 0.5);
	}

	// 5b. flip({ class }) — flip owns the attribute, so the write and the
	// measurement happen in the same tick.
	let flipExpanded = $state(false);

	// 6. flipFrom() — manual expand / collapse. FLIP the card *and* the button
	// below it: FLIP animates transform, not flow, so the sibling would jump to
	// the new layout instantly unless it animates from its old rect too.
	let expandCard = $state<HTMLElement | undefined>();
	let expandBtn = $state<HTMLElement | undefined>();
	let expanded = $state(false);
	async function toggleExpand() {
		if (!expandCard || !expandBtn) return;
		const cardFrom = snapshotRect(expandCard);
		const btnFrom = snapshotRect(expandBtn);
		expanded = !expanded;
		await tick();
		flipFrom(expandCard, cardFrom, { duration: 420, easing: easeInOut });
		flipFrom(expandBtn, btnFrom, { duration: 420, easing: easeInOut });
	}

	// 8. variants — named hover / press states (per button)
	let btnStates = $state(['rest', 'rest', 'rest']);

	// 10. presence — spring fly transitions on a keyed list
	let chipId = 4;
	let chips = $state([
		{ id: 1, label: 'Alpha' },
		{ id: 2, label: 'Beta' },
		{ id: 3, label: 'Gamma' }
	]);
	const chipNames = ['Delta', 'Epsilon', 'Zeta', 'Eta', 'Theta'];
	function addChip() {
		const label = chipNames[(chipId - 4) % chipNames.length];
		chips = [...chips, { id: chipId++, label }];
	}
	function removeChip(id: number) {
		chips = chips.filter((c) => c.id !== id);
	}

	// presence — size: collapse rows by height (and a panel by width)
	let rowId = 4;
	let rows = $state([
		{ id: 1, label: 'First row' },
		{ id: 2, label: 'Second row' },
		{ id: 3, label: 'Third row' }
	]);
	function addRow() {
		rows = [...rows, { id: rowId, label: `Row ${rowId++}` }];
	}
	function removeRow(id: number) {
		rows = rows.filter((r) => r.id !== id);
	}

	// 11. gradient — tween a grid of tiles together
	let gradEls = $state<(HTMLElement | undefined)[]>([]);
	let gradOn = $state(false);
	const GRAD_A = 'linear-gradient(90deg, #6366f1 0%, #8b5cf6 100%)';
	const GRAD_B = 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)';
	function toggleGradient() {
		gradEls.forEach((el, i) => {
			if (!el) return;
			animateGradient(el, gradOn ? GRAD_B : GRAD_A, gradOn ? GRAD_A : GRAD_B, {
				duration: 600,
				delay: i * 60,
				easing: easeInOut
			});
		});
		gradOn = !gradOn;
	}

	// 12. motionPath — several dots travelling different paths
	const PATHS = [
		'M0,0 C 60,-70 180,70 240,0',
		'M0,0 C 60,70 180,-70 240,0',
		'M0,0 C 80,-40 160,40 240,0'
	];
	let pathDots = $state<(HTMLElement | undefined)[]>([]);
	function runPath() {
		pathDots.forEach((el, i) => {
			if (el) motionPath(el, PATHS[i], { duration: 1400, easing: easeInOut });
		});
	}

	// 13. draw — draw several SVG strokes on, staggered
	let drawPaths = $state<(SVGPathElement | undefined)[]>([]);
	function runDraw() {
		drawPaths.forEach((p, i) => {
			if (p) draw(p, { duration: 1100, delay: i * 180, easing: easeInOut });
		});
	}

	// 14. morph — minimal-distance anchor alignment
	const SQUARE = 'M20 20 L80 20 L80 80 L20 80 Z';
	const DIAMOND = 'M80 50 L50 80 L20 50 L50 20 Z'; // rotated vertex order
	let morphOpt = $state<SVGPathElement | undefined>();
	let morphRaw = $state<SVGPathElement | undefined>();
	let morphIsSquare = $state(true);
	function runMorph() {
		const from = morphIsSquare ? SQUARE : DIAMOND;
		const to = morphIsSquare ? DIAMOND : SQUARE;
		if (morphOpt) morph(morphOpt, from, to, { duration: 700, easing: easeInOut });
		if (morphRaw) morph(morphRaw, from, to, { duration: 700, easing: easeInOut, optimize: false });
		morphIsSquare = !morphIsSquare;
	}

	// 15. multi-keyframe sequences — N stops, not just [from, to]
	let kfBoxes = $state<(HTMLElement | undefined)[]>([]);
	function runKeyframes() {
		kfBoxes.forEach((el, i) => {
			if (!el) return;
			animate(
				el,
				{ y: [0, -44, 0, -20, 0], rotate: [0, 0, 180, 180, 360], scale: [1, 1.3, 1, 1.15, 1] },
				{ duration: 1000, delay: i * 70, easing: easeInOut }
			);
		});
	}

	// 16. splitText — per-character reveal driven by stagger
	let splitEl = $state<HTMLElement | undefined>();
	let splitRevert: (() => void) | undefined;
	const splitDelay = stagger(28, { from: 'start' });
	function runSplit() {
		if (!splitEl) return;
		splitRevert?.(); // restore before re-splitting
		const { chars, revert } = splitText(splitEl, { type: 'chars' });
		splitRevert = revert;
		chars.forEach((c, i) =>
			animate(
				c,
				{ opacity: [0, 1], y: [24, 0], rotate: [-35, 0] },
				{ delay: splitDelay(i, chars.length), duration: 440, easing: backOut }
			)
		);
	}

	// 17. reorder — drag to reorder a list
	let reorderList = $state(['Drag', 'a', 'row', 'to', 'reorder']);
	const reorderer = reorder<string>({
		items: () => reorderList,
		onReorder: (next) => (reorderList = next)
	});

	// 22. swipe to dismiss — draggable tracks the finger live; on release a row
	// flung past a distance/velocity threshold flies out, otherwise snapToOrigin
	// springs it back.
	const SWIPE_ITEMS = ['Drag', 'a', 'row', 'aside'];
	let swipeItems = $state([...SWIPE_ITEMS]);
	const dismissSwipe = (value: string) => (swipeItems = swipeItems.filter((v) => v !== value));
	const resetSwipe = () => (swipeItems = [...SWIPE_ITEMS]);
	function maybeDismiss(value: string, info: DragInfo, el: MotionElement) {
		const flung = Math.abs(info.x) > 100 || Math.abs(info.velocityX) > 500;
		if (!flung) return; // draggable's snapToOrigin springs the row back
		// Carry it the rest of the way off, then drop it — the survivors FLIP up.
		// animate() drives --motion-x via WAAPI, which overrides draggable's
		// inline-style snap-back, so the two never fight.
		animate(
			el,
			{ x: info.x > 0 ? 360 : -360, opacity: 0 },
			{ duration: 220, easing: easeOut }
		).finished.then(() => dismissSwipe(value));
	}

	// 24. pressable — long-press & double-tap ride the same press lifecycle
	let pressStatus = $state('Press, hold, or double-tap');

	// 18. animateValue / countUp — tween a number into text
	let counterEl = $state<HTMLElement | undefined>();
	function runCount() {
		if (counterEl) countUp(counterEl, 12480, { duration: 1400, easing: easeOut });
	}

	// 19. onUpdate — render a live readout CSS can't (text), synced to a CSS
	// stroke animation via the same eased clock.
	const RING_R = 42;
	const RING_C = 2 * Math.PI * RING_R; // circumference
	let ringEl = $state<SVGCircleElement | undefined>();
	let ringPct = $state(0);
	function runProgress() {
		if (!ringEl) return;
		ringEl.style.strokeDasharray = String(RING_C);
		// CSS animates the ring stroke; onUpdate writes the centered percentage.
		animate(
			ringEl,
			{ strokeDashoffset: [RING_C, 0] },
			{ duration: 1700, easing: easeInOut, onUpdate: (p) => (ringPct = Math.round(p * 100)) }
		);
	}

	// 26. viewTransition — native View Transitions API, re-eased with a spring.
	// Clicking a tile promotes it to a featured "hero"; because the tile keeps
	// the same view-transition-name across the swap, the browser morphs it from
	// its grid cell into the hero (and back) instead of cross-fading. The DOM
	// swap runs inside viewTransition(); await tick() lets Svelte flush the
	// layout change before the "after" snapshot is taken.
	const vtItems = [
		{ id: 'aurora', label: 'Aurora', color: 'bg-indigo-500' },
		{ id: 'borealis', label: 'Borealis', color: 'bg-violet-500' },
		{ id: 'cosmos', label: 'Cosmos', color: 'bg-blue-500' },
		{ id: 'drift', label: 'Drift', color: 'bg-cyan-600' }
	];
	let vtSelected = $state<string | null>(null);
	let vtActive: ReturnType<typeof viewTransition> | undefined;
	let vtRequest = 0;
	async function selectViewTransition(id: string) {
		const request = ++vtRequest;
		const previous = vtActive;

		// Starting a document transition cancels the previous one, but the spec
		// permits their async update callbacks to overlap and run out of sequence.
		// Finish the stale transition's cleanup first; only the latest click wins.
		if (previous) {
			previous.stop();
			await previous.finished;
			if (request !== vtRequest) return;
		}

		const controller = viewTransition(
			async () => {
				vtSelected = vtSelected === id ? null : id;
				await tick();
			},
			{ spring: { stiffness: 220, damping: 26 } }
		);
		vtActive = controller;
		void controller.finished.then(() => {
			if (vtActive === controller) vtActive = undefined;
		});
	}
</script>

{#snippet trigger(label: string, onclick: () => void, disabled = false)}
	<button
		{onclick}
		{disabled}
		class="rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 transition-colors hover:border-zinc-400 hover:bg-zinc-100 disabled:opacity-40 disabled:hover:border-zinc-300 disabled:hover:bg-transparent dark:border-zinc-700 dark:text-zinc-300 dark:hover:border-zinc-600 dark:hover:bg-zinc-800 dark:disabled:hover:border-zinc-700 dark:disabled:hover:bg-transparent"
	>
		{label}
	</button>
{/snippet}

<div class="min-h-screen bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
	<div class="dots pointer-events-none fixed inset-0" aria-hidden="true"></div>

	<main class="relative mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
		<nav class="flex items-center justify-between py-5">
			<a href="#top" class="flex items-center gap-2.5" aria-label="Pulse home">
				<span
					class="grid size-8 place-items-center rounded-lg bg-indigo-600 font-mono text-sm font-bold text-white"
					>P</span
				>
				<span class="font-mono text-sm font-semibold tracking-tight">pulse</span>
			</a>
			<div class="flex items-center gap-3">
				<span class="hidden font-mono text-[11px] text-zinc-500 sm:block"
					>Svelte 5 motion toolkit</span
				>
				<a
					href="#demos"
					class="rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 transition-colors hover:border-zinc-400 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:border-zinc-600 dark:hover:bg-zinc-800"
					>Demos</a
				>
				<button
					onclick={toggleTheme}
					aria-label={dark ? 'Switch to light theme' : 'Switch to dark theme'}
					class="grid size-8 place-items-center rounded-md border border-zinc-300 text-zinc-600 transition-colors hover:border-zinc-400 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:border-zinc-600 dark:hover:bg-zinc-800"
				>
					{#if dark}
						<svg
							viewBox="0 0 24 24"
							class="size-4"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
						>
							<circle cx="12" cy="12" r="4" />
							<path
								d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"
							/>
						</svg>
					{:else}
						<svg
							viewBox="0 0 24 24"
							class="size-4"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"
						>
							<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />
						</svg>
					{/if}
				</button>
			</div>
		</nav>

		<header
			id="top"
			class="border-b border-zinc-200 pt-14 pb-14 sm:pt-20 sm:pb-18 dark:border-zinc-800"
		>
			<p class="font-mono text-xs font-medium text-indigo-600 dark:text-indigo-400">
				Built on the Web Animations API
			</p>
			<h1 class="mt-4 max-w-2xl text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">
				Motion primitives for
				<span class="text-indigo-600 dark:text-indigo-400">Svelte 5</span>.
			</h1>
			<p class="mt-5 max-w-xl text-base leading-7 text-zinc-600 sm:text-lg dark:text-zinc-400">
				Springs, FLIP, gestures, scroll and view transitions as small composable functions. No
				runtime dependencies, no wrapper components.
			</p>
			<div class="mt-8 flex flex-wrap items-center gap-3">
				<code
					class="rounded-lg border border-zinc-200 bg-white px-4 py-2.5 font-mono text-sm text-zinc-800 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200"
					>npm install @ixirjs/pulse</code
				>
				<a
					href="#demos"
					class="rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-indigo-500"
					>Browse the demos</a
				>
			</div>
			<p class="mt-10 font-mono text-xs text-zinc-500">
				26 live demos · 11 modules · 0 dependencies
			</p>
		</header>

		<section id="demos" aria-labelledby="demos-title" class="py-14 sm:py-16">
			<div class="mb-8 flex flex-wrap items-end justify-between gap-4">
				<h2 id="demos-title" class="text-2xl font-semibold tracking-tight sm:text-3xl">
					Every primitive, live
				</h2>
				<p class="max-w-sm text-sm leading-6 text-zinc-500 dark:text-zinc-400">
					Each card runs the real implementation. Open the code to see how.
				</p>
			</div>

			<div class="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
				<!-- 1. animate() -->
				<DemoCard
					title="animate()"
					code={`// Toggle a state; each box lifts into an arch and rounds into a pill.
let on = $state(false);

function run() {
  on = !on;
  // stop() freezes each box where it is; omitting the start keyframe
  // resumes from there, so toggling mid-arch reverses smoothly.
  controllers.forEach((c) => c.stop());
  controllers = boxes.map((el, i) => {
    const lift = -Math.sin((i / (boxes.length - 1)) * Math.PI) * 38;
    return animate(el, {
      y:               on ? lift : 0,
      borderRadius:    on ? 18 : 6,
      backgroundColor: on ? '#8b5cf6' : '#6366f1',
    }, { delay: i * 55, duration: 520, easing: backOut });
  });
}`}
				>
					<div class="flex items-end gap-2.5 pt-10">
						{#each range(BASIC_COUNT) as i (i)}
							<div bind:this={basicBoxes[i]} class="size-7 rounded-md bg-indigo-500"></div>
						{/each}
					</div>
					{@render trigger(basicOn ? 'Reset' : 'Launch', runBasic)}
				</DemoCard>

				<!-- 2. spring -->
				<DemoCard
					title="spring physics"
					code={`els.forEach((el, i) =>
  animate(el, {
    scale:  { to: 1.2, spring: { stiffness: 240 - i * 8, damping: 10 } },
    rotate: { to: 45,  spring: { stiffness: 200, damping: 12 } },
  })
);`}
				>
					<div class="grid grid-cols-3 gap-5">
						{#each range(9) as i (i)}
							<div bind:this={springEls[i]} class="size-6 rounded-lg bg-violet-500"></div>
						{/each}
					</div>
					{@render trigger(springActive ? 'Reset' : 'Spring', triggerSpring)}
				</DemoCard>

				<!-- 3. stagger -->
				<DemoCard
					title="stagger()"
					code={`const delay = stagger(45, { from: 'center' });

// stop() freezes each item where it is, and omitting
// the start keyframe resumes from there — so hitting
// Hide mid-reveal reverses smoothly instead of snapping.
controllers.forEach((c) => c.stop());
controllers = els.map((el, i) =>
  animate(el, { opacity: show ? 1 : 0, scale: show ? 1 : 0.3 }, {
    delay: delay(i, els.length),
    duration: 320,
    easing: backOut,
  })
);`}
				>
					<div class="grid grid-cols-4 gap-2">
						{#each range(STAGGER_COUNT) as i (i)}
							<div bind:this={staggerEls[i]} class="size-6 rounded bg-indigo-400"></div>
						{/each}
					</div>
					{@render trigger(staggerVisible ? 'Hide' : 'Show', toggleStagger)}
				</DemoCard>

				<!-- 4. timeline -->
				<DemoCard
					title="timeline()"
					code={`timeline({ duration: 380, easing: easeOut })
  .add(card,  { opacity: [0, 1], y: [32, 0] })
  .add(label, { opacity: [0, 1], x: [-8, 0] }, undefined, '<+40')
  .add(title, { opacity: [0, 1], y: [8, 0] },  undefined, '<+60')
  .add(body,  { opacity: [0, 1] },             undefined, '<+80')
  .add(cta,   { opacity: [0, 1], scale: [0.88, 1] }, undefined, '<+60')
  .play();`}
				>
					<div
						bind:this={tlCard}
						class="w-full max-w-[15rem] rounded-lg border border-zinc-200 p-4 dark:border-zinc-700"
					>
						<div
							bind:this={tlLabel}
							class="mb-1.5 font-mono text-[10px] font-semibold text-indigo-600 uppercase dark:text-indigo-400"
						>
							New
						</div>
						<div bind:this={tlTitle} class="mb-1 text-sm font-semibold">Card reveal</div>
						<div bind:this={tlBody} class="mb-3 text-xs text-zinc-500 dark:text-zinc-400">
							Each child enters on its own offset.
						</div>
						<button
							bind:this={tlCta}
							class="rounded-md bg-indigo-600 px-2.5 py-1 text-[11px] font-semibold text-white"
						>
							Action
						</button>
					</div>
					{@render trigger('Replay', runTimeline)}
				</DemoCard>

				<!-- 5. flip -->
				<DemoCard
					title="flip() attachment"
					code={`let items = $state(['A', 'B', 'C', …]);

{#each items as item (item)}
  <div {@attach flip({ duration: 400, easing: easeInOut })}>
    {item}
  </div>
{/each}`}
				>
					<div class="grid grid-cols-3 gap-2">
						{#each flipItems as item (item)}
							<div
								{@attach flip({ duration: 400, easing: easeInOut })}
								class="flex size-12 items-center justify-center rounded-lg bg-zinc-100 font-mono text-sm font-semibold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
							>
								{item}
							</div>
						{/each}
					</div>
					{@render trigger('Shuffle', shuffleFlip)}
				</DemoCard>

				<!-- 5b. flip({ class }) -->
				<DemoCard
					title={'flip({ class })'}
					code={`let expanded = $state(false);

<!-- flip writes the class, then measures and animates
     the resulting layout change in the same tick -->
<div
  {@attach flip({
    duration: 380,
    easing: easeInOut,
    class: () => (expanded ? 'w-48 h-24' : 'w-16 h-16')
  })}
  class="rounded-lg bg-indigo-600"
></div>`}
				>
					<div class="flex justify-center">
						<div
							{@attach flip({
								duration: 380,
								easing: easeInOut,
								class: () => (flipExpanded ? 'w-48 h-24' : 'w-16 h-16')
							})}
							class="rounded-lg bg-indigo-600"
						></div>
					</div>
					{@render trigger('Toggle', () => (flipExpanded = !flipExpanded))}
				</DemoCard>

				<!-- 6. flipFrom -->
				<DemoCard
					title="flipFrom()"
					code={`async function toggle() {
  // Snapshot the card AND the button that flows below it.
  const cardFrom = snapshotRect(card);
  const btnFrom = snapshotRect(button);
  expanded = !expanded;
  await tick();
  // Both animate from their old rects, so the button glides instead of jumping.
  flipFrom(card, cardFrom, { duration: 420, easing: easeInOut });
  flipFrom(button, btnFrom, { duration: 420, easing: easeInOut });
}`}
				>
					<div
						bind:this={expandCard}
						class="overflow-hidden rounded-lg bg-indigo-600 text-white"
						class:w-32={!expanded}
						class:w-56={expanded}
						class:p-3={!expanded}
						class:p-5={expanded}
					>
						<p class="text-sm font-semibold">{expanded ? 'Expanded' : 'Collapsed'}</p>
						{#if expanded}
							<p class="mt-1.5 text-xs opacity-80">
								Captured before the DOM update, animated from the old rect to the new.
							</p>
						{/if}
					</div>
					<button
						bind:this={expandBtn}
						onclick={toggleExpand}
						class="rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 transition-colors hover:border-zinc-400 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:border-zinc-600 dark:hover:bg-zinc-800"
					>
						{expanded ? 'Collapse' : 'Expand'}
					</button>
				</DemoCard>

				<!-- 7. draggable -->
				<DemoCard
					title="draggable()"
					code={`<div {@attach draggable({
  constraints: { left: -120, right: 120, top: -50, bottom: 50 },
  elastic: 0.2,
  spring: { stiffness: 320, damping: 22 },
})} />`}
				>
					<div
						class="relative h-32 w-full rounded-lg border border-dashed border-zinc-300 dark:border-zinc-700"
					>
						{#each ['drag', 'me', 'too'] as label, i (label)}
							<div
								{@attach draggable({
									constraints: { left: -120, right: 120, top: -50, bottom: 50 },
									elastic: 0.2,
									spring: { stiffness: 320, damping: 22 }
								})}
								style:left={`${30 + i * 28}%`}
								class="absolute top-1/2 -mt-6 -ml-6 flex size-12 cursor-grab items-center justify-center rounded-xl bg-indigo-500 text-[11px] font-semibold text-white active:cursor-grabbing"
							>
								{label}
							</div>
						{/each}
					</div>
				</DemoCard>

				<!-- 8. variants -->
				<DemoCard
					title="variants()"
					code={`<button {@attach variants({
  active: () => state,
  initial: 'rest',
  variants: {
    rest:    { scale: 1, y: 0 },
    hover:   { scale: 1.06, y: -4 },
    pressed: { scale: 0.95, y: 0 },
  },
  defaults: { spring: { stiffness: 320, damping: 20 } },
})} />`}
				>
					<div class="flex gap-2">
						{#each ['Tap', 'Me', 'Now'] as label, i (label)}
							<button
								onpointerenter={() => (btnStates[i] = 'hover')}
								onpointerleave={() => (btnStates[i] = 'rest')}
								onpointerdown={() => (btnStates[i] = 'pressed')}
								onpointerup={() => (btnStates[i] = 'hover')}
								{@attach variants({
									active: () => btnStates[i],
									initial: 'rest',
									variants: {
										rest: { scale: 1, y: 0 },
										hover: { scale: 1.06, y: -4 },
										pressed: { scale: 0.95, y: 0 }
									},
									defaults: { spring: { stiffness: 320, damping: 20 } }
								})}
								class="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white"
							>
								{label}
							</button>
						{/each}
					</div>
				</DemoCard>

				<!-- 9. inView -->
				<DemoCard
					title="inView()"
					code={`<div {@attach inView({
  once: true,
  amount: 0.6,
  onEnter: (el) => animate(el, { opacity: [0, 1], y: [24, 0] }),
})} />`}
				>
					<div class="grid w-full grid-cols-3 gap-2">
						{#each ['Lazy', 'Reveal', 'On', 'Scroll', 'Into', 'View'] as label (label)}
							<div
								{@attach inView({
									once: true,
									amount: 0.6,
									onEnter: (el) =>
										animate(el, { opacity: [0, 1], y: [20, 0] }, { duration: 420, easing: easeOut })
								})}
								class="flex h-14 items-center justify-center rounded-lg bg-indigo-50 text-xs font-medium text-indigo-700 opacity-0 dark:bg-indigo-500/10 dark:text-indigo-300"
							>
								{label}
							</div>
						{/each}
					</div>
				</DemoCard>

				<!-- 10. presence -->
				<DemoCard
					title="presence — fly"
					code={`// fly takes optional width/height that tween to the natural
// size alongside the x/y travel.
{#each chips as chip (chip.id)}
  <button transition:fly={{ y: 16, width: 0, spring: { stiffness: 260, damping: 22 } }}>
    {chip.label}
  </button>
{/each}`}
				>
					<!-- Spacing comes from each chip's own margin (not flex gap), so the
			     fly collapse — which also shrinks margin — closes the slot fully
			     and leaves no gap to snap shut on unmount. -->
					<div class="flex flex-wrap items-center justify-center">
						{#each chips as chip (chip.id)}
							<button
								onclick={() => removeChip(chip.id)}
								transition:fly={{ y: 16, width: 0, spring: { stiffness: 260, damping: 22 } }}
								class="m-0.75 overflow-hidden rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium whitespace-nowrap text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-500/10 dark:text-indigo-300 dark:hover:bg-indigo-500/20"
							>
								{chip.label} ✕
							</button>
						{/each}
					</div>
					{@render trigger('+ Add', addChip)}
				</DemoCard>

				<!-- 10b. presence — size -->
				<DemoCard
					title="presence — size"
					code={`// Collapse height (with padding/border/margin) on enter/exit —
// like Svelte's slide, but spring-capable and any axis.
{#each rows as row (row.id)}
  <div transition:size={{ opacity: 0, spring: { stiffness: 280, damping: 26 } }}>
    {row.label}
  </div>
{/each}

// axis: 'x' | 'y' | 'both'  ·  start: 0..1  ·  opacity?`}
				>
					<!-- Row spacing comes from each row's own margin (not flex gap): size
			     collapses margin alongside height, so the slot closes fully and
			     leaves no parent-owned gap to snap shut on unmount. -->
					<div class="flex w-full max-w-60 flex-col">
						{#each rows as row (row.id)}
							<div
								transition:size={{ opacity: 0, spring: { stiffness: 280, damping: 26 } }}
								class="my-0.75 flex items-center justify-between rounded-lg bg-zinc-100 px-3 py-2 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
							>
								{row.label}
								<button
									onclick={() => removeRow(row.id)}
									aria-label="Remove"
									class="text-zinc-400 hover:text-zinc-700 dark:text-zinc-500 dark:hover:text-zinc-200"
									>✕</button
								>
							</div>
						{/each}
					</div>
					{@render trigger('+ Add row', addRow)}
				</DemoCard>

				<!-- 11. gradient -->
				<DemoCard
					title="animateGradient()"
					code={`animateGradient(el,
  'linear-gradient(90deg, #6366f1 0%, #8b5cf6 100%)',
  'linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)',
  { duration: 600, delay: i * 60 });`}
				>
					<div class="grid grid-cols-3 gap-2">
						{#each range(6) as i (i)}
							<div
								bind:this={gradEls[i]}
								style:background-image={GRAD_A}
								class="size-14 rounded-lg"
							></div>
						{/each}
					</div>
					{@render trigger('Tween', toggleGradient)}
				</DemoCard>

				<!-- 12. motionPath -->
				<DemoCard
					title="motionPath()"
					code={`motionPath(el, 'M0,0 C 60,-70 180,70 240,0', {
  duration: 1400,
  easing: easeInOut,
}); // offset-rotate faces travel by default`}
				>
					<div class="relative h-24 w-full">
						{#each range(PATHS.length) as i (i)}
							<div
								bind:this={pathDots[i]}
								style:top={`${30 + i * 18}%`}
								class="absolute left-2 size-4 rounded bg-cyan-600"
							></div>
						{/each}
					</div>
					{@render trigger('Travel', runPath)}
				</DemoCard>

				<!-- 13. draw -->
				<DemoCard
					title="draw()"
					code={`paths.forEach((p, i) =>
  draw(p, { duration: 1100, delay: i * 180, easing: easeInOut })
); // animates stroke-dashoffset from length → 0`}
				>
					<svg viewBox="0 0 200 90" class="h-20 w-full max-w-[13rem]">
						{#each ['M5,25 C 50,-5 70,55 100,25 S 160,-5 195,25', 'M5,45 C 50,15 70,75 100,45 S 160,15 195,45', 'M5,65 C 50,35 70,95 100,65 S 160,35 195,65'] as d, i (d)}
							<path
								bind:this={drawPaths[i]}
								{d}
								fill="none"
								stroke={['#6366f1', '#8b5cf6', '#06b6d4'][i]}
								stroke-width="4"
								stroke-linecap="round"
							/>
						{/each}
					</svg>
					{@render trigger('Draw', runDraw)}
				</DemoCard>

				<!-- 14. morph -->
				<DemoCard
					title="morph()"
					code={`const square  = 'M20 20 L80 20 L80 80 L20 80 Z';
const diamond = 'M80 50 L50 80 L20 50 L50 20 Z'; // rotated vertex order

morph(el, square, diamond, { duration: 700 });                  // clean
morph(el, square, diamond, { duration: 700, optimize: false }); // twists`}
				>
					<div class="flex items-end gap-6">
						<div class="space-y-1 text-center">
							<svg viewBox="0 0 100 100" class="size-16">
								<path bind:this={morphOpt} d={SQUARE} class="fill-indigo-500" />
							</svg>
							<div class="font-mono text-[10px] text-zinc-400 dark:text-zinc-500">
								optimize: true
							</div>
						</div>
						<div class="space-y-1 text-center">
							<svg viewBox="0 0 100 100" class="size-16">
								<path bind:this={morphRaw} d={SQUARE} class="fill-zinc-300 dark:fill-zinc-600" />
							</svg>
							<div class="font-mono text-[10px] text-zinc-400 dark:text-zinc-500">
								optimize: false
							</div>
						</div>
					</div>
					{@render trigger('Morph', runMorph)}
				</DemoCard>

				<!-- 15. multi-keyframe -->
				<DemoCard
					title="multi-keyframe"
					code={`// 3+ values become evenly-spaced keyframes (not just [from, to]).
animate(el, {
  y:      [0, -44, 0, -20, 0],
  rotate: [0, 0, 180, 180, 360],
  scale:  [1, 1.3, 1, 1.15, 1],
}, { duration: 1000, easing: easeInOut });

// Custom timing per stop:
animate(el, { x: { values: [0, 120, 80], offset: [0, 0.7, 1] } });`}
				>
					<div class="flex gap-2">
						{#each range(5) as i (i)}
							<div bind:this={kfBoxes[i]} class="size-7 rounded-md bg-indigo-500"></div>
						{/each}
					</div>
					{@render trigger('Sequence', runKeyframes)}
				</DemoCard>

				<!-- 16. splitText -->
				<DemoCard
					title="splitText()"
					code={`const { chars } = splitText(el, { type: 'chars' });
const delay = stagger(28, { from: 'start' });

chars.forEach((c, i) =>
  animate(c, { opacity: [0, 1], y: [24, 0], rotate: [-35, 0] },
    { delay: delay(i, chars.length), duration: 440, easing: backOut })
);`}
				>
					<div bind:this={splitEl} class="text-2xl font-bold tracking-tight">
						Animate every letter
					</div>
					{@render trigger('Reveal', runSplit)}
				</DemoCard>

				<!-- 17. reorder -->
				<DemoCard
					title="reorder()"
					code={`let list = $state(['Drag', 'a', 'row', 'to', 'reorder']);
const r = reorder({ items: () => list, onReorder: (next) => (list = next) });

{#each list as value (value)}
  <div {@attach r.item(value)}>{value}</div>
{/each}`}
				>
					<div class="flex w-full max-w-60 flex-col gap-1.5">
						{#each reorderList as value (value)}
							<div
								{@attach reorderer.item(value)}
								class="flex cursor-grab items-center gap-2 rounded-lg bg-zinc-100 px-3 py-2 text-xs font-medium text-zinc-700 select-none active:cursor-grabbing dark:bg-zinc-800 dark:text-zinc-300"
							>
								<span class="text-zinc-400 dark:text-zinc-500">⠿</span>
								{value}
							</div>
						{/each}
					</div>
				</DemoCard>

				<!-- 18. countUp -->
				<DemoCard
					title="countUp()"
					code={`// Tween a number into an element's text — built on animateValue().
countUp(el, 12480, { duration: 1400, easing: easeOut });

// Or drive any value yourself:
animateValue(0, 100, { onUpdate: (v) => (label.textContent = \`\${v}%\`) });`}
				>
					<div
						bind:this={counterEl}
						class="text-3xl font-bold tracking-tight text-indigo-600 dark:text-indigo-400"
					>
						0
					</div>
					{@render trigger('Count up', runCount)}
				</DemoCard>

				<!-- 19. onUpdate -->
				<DemoCard
					title="onUpdate"
					code={`// WAAPI can't call JS per frame — onUpdate spins a rAF loop alongside it,
// reporting the eased progress (0→1). Here CSS animates the ring stroke and
// onUpdate renders the live %, which CSS alone can't draw as text.
const C = 2 * Math.PI * r;

animate(ring, { strokeDashoffset: [C, 0] }, {
  duration: 1700,
  easing: easeInOut,
  onUpdate: (progress) => (pct = Math.round(progress * 100)),
});`}
				>
					<div class="relative size-28">
						<svg viewBox="0 0 100 100" class="size-28 -rotate-90">
							<circle
								cx="50"
								cy="50"
								r={RING_R}
								fill="none"
								stroke-width="8"
								class="stroke-zinc-200 dark:stroke-zinc-700"
							/>
							<circle
								bind:this={ringEl}
								cx="50"
								cy="50"
								r={RING_R}
								fill="none"
								stroke-width="8"
								stroke-linecap="round"
								stroke-dasharray={RING_C}
								stroke-dashoffset={RING_C}
								class="stroke-indigo-500"
							/>
						</svg>
						<div class="absolute inset-0 grid place-items-center text-2xl font-bold tabular-nums">
							{ringPct}%
						</div>
					</div>
					{@render trigger('Run', runProgress)}
				</DemoCard>

				<!-- 20. pinch -->
				<DemoCard
					title="pinchable()"
					code={`// Two-pointer pinch-zoom + rotate; writes --motion-scale / --motion-rotate.
<div {@attach pinchable({ scaleBounds: { min: 0.5, max: 3 } })} />`}
				>
					<div class="flex h-32 w-full items-center justify-center">
						<div
							{@attach pinchable({ scaleBounds: { min: 0.5, max: 3 } })}
							class="flex size-20 touch-none items-center justify-center rounded-2xl bg-indigo-500 text-center text-[10px] font-semibold text-white"
						>
							pinch&nbsp;/&nbsp;rotate
						</div>
					</div>
					<p class="text-center text-[11px] text-zinc-400 dark:text-zinc-500">
						Use a touch screen or trackpad pinch.
					</p>
				</DemoCard>

				<!-- 21. moveable -->
				<DemoCard
					title="moveable()"
					code={`// Tracks the pointer over the element (no button) and springs a
// magnetic pull via --motion-x / --motion-y. onMove also reports
// nx / ny in -1…1 for headless tilt / parallax / spotlight.
<button {@attach moveable({ applyTransform: true, strength: 0.5 })} />`}
				>
					<div class="flex h-32 w-full items-center justify-center">
						<button
							{@attach moveable({
								applyTransform: true,
								strength: 0.5,
								spring: { stiffness: 260, damping: 18 }
							})}
							class="rounded-xl bg-indigo-600 px-6 py-3 text-xs font-semibold text-white"
						>
							Magnetic
						</button>
					</div>
					<p class="text-center text-[11px] text-zinc-400 dark:text-zinc-500">
						Move your cursor across the button.
					</p>
				</DemoCard>

				<!-- 22. swipe to dismiss -->
				<DemoCard
					title="swipe to dismiss"
					code={`// draggable tracks the finger live; on release a row flung past a
// distance/velocity threshold flies out, else snapToOrigin springs back.
<div {@attach draggable({ axis: 'x', snapToOrigin: true, onEnd: (info, el) => {
  if (Math.abs(info.x) > 100 || Math.abs(info.velocityX) > 500)
    animate(el, { x: info.x > 0 ? 360 : -360, opacity: 0 })
      .finished.then(() => dismiss(value));
} })} />`}
				>
					<div class="flex min-h-32 w-full max-w-60 flex-col gap-1.5">
						{#each swipeItems as value (value)}
							<div
								{@attach draggable({
									axis: 'x',
									snapToOrigin: true,
									spring: { stiffness: 380, damping: 30 },
									onEnd: (info, el) => maybeDismiss(value, info, el)
								})}
								{@attach flip({ duration: 260, easing: easeOut })}
								class="flex cursor-grab items-center justify-between rounded-lg bg-indigo-50 px-3 py-2 text-xs font-medium text-indigo-700 select-none active:cursor-grabbing dark:bg-indigo-500/10 dark:text-indigo-300"
							>
								{value}
								<span class="text-indigo-300 dark:text-indigo-500/60">↔</span>
							</div>
						{/each}
					</div>
					{@render trigger('Reset', resetSwipe, swipeItems.length === SWIPE_ITEMS.length)}
				</DemoCard>

				<!-- 23. focusable -->
				<DemoCard
					title="focusable()"
					code={`// Keyboard counterpart of hover — drive the same motion on focus.
<button {@attach focusable({
  onFocusStart: (el) => animate(el, { scale: 1.1, y: -4 }),
  onFocusEnd:   (el) => animate(el, { scale: 1,   y: 0 }),
})} />`}
				>
					<div class="flex h-32 w-full items-center justify-center gap-2">
						{#each ['Tab', 'through', 'these'] as label (label)}
							<button
								{@attach focusable({
									onFocusStart: (el) =>
										animate(el, { scale: 1.1, y: -4 }, { duration: 220, easing: backOut }),
									onFocusEnd: (el) =>
										animate(el, { scale: 1, y: 0 }, { duration: 220, easing: backOut })
								})}
								class="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white outline-none focus-visible:ring-2 focus-visible:ring-indigo-300 dark:focus-visible:ring-indigo-500"
							>
								{label}
							</button>
						{/each}
					</div>
					<p class="text-center text-[11px] text-zinc-400 dark:text-zinc-500">
						Press Tab to move focus.
					</p>
				</DemoCard>

				<!-- 24. pressable -->
				<DemoCard
					title="pressable()"
					code={`// onPress, onLongPress (held past longPressDelay, suppresses the
// click) and onDoubleTap all ride the same press lifecycle.
<button {@attach pressable({
  onPressStart: (el) => animate(el, { scale: 0.92 }),
  onPressEnd:   (el) => animate(el, { scale: 1 }),
  onPress:      () => (status = 'Tap'),
  onLongPress:  () => (status = 'Long press!'),
  onDoubleTap:  () => (status = 'Double tap!'),
})} />`}
				>
					<div class="flex h-32 flex-col items-center justify-center gap-3">
						<button
							{@attach pressable({
								onPressStart: (el) => animate(el, { scale: 0.92 }, { duration: 120 }),
								onPressEnd: (el) => animate(el, { scale: 1 }, { duration: 180, easing: backOut }),
								onPress: () => (pressStatus = 'Tap'),
								onLongPress: () => (pressStatus = 'Long press!'),
								onDoubleTap: () => (pressStatus = 'Double tap!')
							})}
							class="rounded-xl bg-indigo-600 px-6 py-4 text-sm font-semibold text-white select-none"
						>
							Press me
						</button>
						<span class="font-mono text-xs text-zinc-500 dark:text-zinc-400">{pressStatus}</span>
					</div>
				</DemoCard>

				<!-- 25. wheelable -->
				<DemoCard
					title="wheelable()"
					code={`// Desktop wheel / trackpad zoom — the pointer-free counterpart
// of pinchable. Shares --motion-scale, so the two compose on
// one element.
<div {@attach wheelable({ scaleBounds: { min: 0.5, max: 3 } })} />`}
				>
					<div class="flex h-32 w-full items-center justify-center overflow-hidden">
						<div
							{@attach wheelable({ scaleBounds: { min: 0.5, max: 3 } })}
							class="grid size-20 touch-none place-items-center rounded-2xl bg-violet-500 text-center text-[10px] font-semibold text-white"
						>
							scroll to zoom
						</div>
					</div>
					<p class="text-center text-[11px] text-zinc-400 dark:text-zinc-500">
						Hover and scroll, or trackpad pinch.
					</p>
				</DemoCard>

				<!-- 26. viewTransition -->
				<DemoCard
					title="viewTransition()"
					code={`// Native View Transitions API, re-eased with a spring. Clicking a
// tile promotes it to a featured hero. Capture a non-interactive child,
// not the button: captured elements cannot receive pointer events.
let selected = $state<string | null>(null);

function select(id: string) {
  viewTransition(async () => {
    selected = selected === id ? null : id;
    await tick(); // let Svelte flush before the "after" snapshot
  }, { spring: { stiffness: 220, damping: 26 } });
}

{#if selected}
  {@const item = items.find((i) => i.id === selected)}
  <button type="button" onclick={() => select(item.id)}>
    <span {@attach viewTransitionName(item.id)}>{item.label}</span>
  </button>
{/if}
<div class="grid grid-cols-3">
  {#each items.filter((i) => i.id !== selected) as item (item.id)}
    <button type="button" onclick={() => select(item.id)}>
      <span {@attach viewTransitionName(item.id)}>{item.label}</span>
    </button>
  {/each}
</div>

<style>
  /* Keep the document and controls live/hit-testable during this local morph. */
  :global(html) { view-transition-name: none; }
  :global(::view-transition) { pointer-events: none; }
</style>`}
				>
					<div class="flex w-full max-w-60 flex-col gap-2">
						{#if vtSelected}
							{@const item = vtItems.find((i) => i.id === vtSelected)!}
							<button
								type="button"
								onclick={() => selectViewTransition(item.id)}
								class="h-20 w-full"
							>
								<span
									{@attach viewTransitionName(item.id)}
									class={`flex size-full items-center justify-center rounded-lg text-sm font-semibold text-white ${item.color}`}
								>
									{item.label}
								</span>
							</button>
						{/if}
						<div class={`grid gap-2 ${vtSelected ? 'grid-cols-3' : 'grid-cols-2'}`}>
							{#each vtItems.filter((i) => i.id !== vtSelected) as item (item.id)}
								<button
									type="button"
									onclick={() => selectViewTransition(item.id)}
									class="h-12 min-w-0"
								>
									<span
										{@attach viewTransitionName(item.id)}
										class={`flex size-full items-center justify-center rounded-lg text-[11px] font-semibold text-white ${item.color}`}
									>
										{item.label}
									</span>
								</button>
							{/each}
						</div>
					</div>
					<p class="text-center text-[11px] text-zinc-400 dark:text-zinc-500">
						Tap a tile to expand it. Chrome &amp; Safari morph; Firefox swaps instantly.
					</p>
				</DemoCard>
			</div>
		</section>

		<footer
			class="flex flex-col gap-2 border-t border-zinc-200 py-8 font-mono text-xs text-zinc-500 sm:flex-row sm:items-center sm:justify-between dark:border-zinc-800"
		>
			<span>@ixirjs/pulse</span>
			<span>Motion primitives for Svelte 5</span>
		</footer>
	</main>
</div>
