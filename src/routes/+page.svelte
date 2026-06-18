<script lang="ts">
	import { tick } from 'svelte';
	import { animate, timeline, stagger, easings } from '$lib/animate';
	import { flip, snapshotRect, flipFrom } from '$lib/flip';

	const { easeInOut, easeOut, easeIn, backOut } = easings;

	// ---------------------------------------------------------------------------
	// 1. Basic animate()  — exit → enter chaining via .finished
	// ---------------------------------------------------------------------------
	let basicBox = $state<HTMLElement | undefined>();
	let basicRunning = $state(false);

	async function runBasic() {
		if (!basicBox || basicRunning) return;
		basicRunning = true;
		// Exit: fly out to the right
		await animate(basicBox, {
			x: [0, 200],
			opacity: [1, 0],
			scale: [1, 0.8]
		}, { duration: 280, easing: easeIn }).finished;
		// Enter: fly in from the left with a slight overshoot
		await animate(basicBox, {
			x: [-40, 0],
			opacity: [0, 1],
			scale: [0.85, 1]
		}, { duration: 480, easing: backOut }).finished;
		basicRunning = false;
	}

	// ---------------------------------------------------------------------------
	// 2. Spring physics
	// ---------------------------------------------------------------------------
	let springBox = $state<HTMLElement | undefined>();
	let springActive = $state(false);

	function triggerSpring() {
		if (!springBox) return;
		springActive = !springActive;
		animate(springBox, {
			scale: { to: springActive ? 1.6 : 1, spring: { stiffness: 220, damping: 12 } },
			rotate: { to: springActive ? 20 : 0, spring: { stiffness: 180, damping: 14 } }
		});
	}

	// ---------------------------------------------------------------------------
	// 3. Stagger
	// ---------------------------------------------------------------------------
	const staggerItems = ['Motion', 'Spring', 'FLIP', 'Timeline', 'Easing'];
	let staggerEls = $state<(HTMLElement | undefined)[]>([]);
	let staggerVisible = $state(false);
	const delay = stagger(70, { from: 'start' });

	function toggleStagger() {
		staggerVisible = !staggerVisible;
		staggerEls.forEach((el, i) => {
			if (!el) return;
			animate(el, {
				opacity: [staggerVisible ? 0 : 1, staggerVisible ? 1 : 0],
				y: [staggerVisible ? 24 : 0, staggerVisible ? 0 : -12]
			}, {
				delay: delay(i, staggerItems.length),
				duration: 320,
				easing: easeOut
			});
		});
	}

	// ---------------------------------------------------------------------------
	// 4. Timeline
	// ---------------------------------------------------------------------------
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

	// ---------------------------------------------------------------------------
	// 5. FLIP — auto-tracked reorder
	// ---------------------------------------------------------------------------
	let flipItems = $state(['🍎', '🍊', '🍋', '🍇', '🍓', '🫐']);

	function shuffleFlip() {
		flipItems = [...flipItems].sort(() => Math.random() - 0.5);
	}

	// ---------------------------------------------------------------------------
	// 6. flipFrom — manual expand/collapse
	// ---------------------------------------------------------------------------
	let expandCard = $state<HTMLElement | undefined>();
	let expanded = $state(false);

	async function toggleExpand() {
		if (!expandCard) return;
		const from = snapshotRect(expandCard);
		expanded = !expanded;
		await tick();
		flipFrom(expandCard, from, { duration: 420, easing: easeInOut });
	}
</script>

<main class="mx-auto max-w-4xl space-y-16 px-6 py-12">
	<header class="space-y-1">
		<h1 class="text-3xl font-bold tracking-tight">vibra</h1>
		<p class="text-gray-500">WAAPI animation library — feature examples</p>
	</header>

	<!-- 1. Basic animate() -->
	<section class="space-y-4">
		<h2 class="text-xl font-semibold">animate()</h2>
		<p class="text-sm text-gray-500">Chain exit → enter by awaiting <code>.finished</code>.</p>
		<div class="flex items-center gap-8">
			<div
				bind:this={basicBox}
				class="size-16 rounded-xl bg-indigo-500"
			></div>
			<button
				onclick={runBasic}
				disabled={basicRunning}
				class="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-40"
			>
				Launch
			</button>
		</div>
		<pre class="rounded-lg bg-gray-100 p-4 text-xs">{`// Exit: fly out
await animate(el, { x: [0, 200], opacity: [1, 0], scale: [1, 0.8] },
  { duration: 280, easing: easeIn }).finished;

// Enter: fly in with overshoot
await animate(el, { x: [-40, 0], opacity: [0, 1], scale: [0.85, 1] },
  { duration: 480, easing: backOut }).finished;`}</pre>
	</section>

	<!-- 2. Spring physics -->
	<section class="space-y-4">
		<h2 class="text-xl font-semibold">Spring physics</h2>
		<p class="text-sm text-gray-500">Per-property spring overrides easing and duration.</p>
		<div class="flex items-center gap-8">
			<div
				bind:this={springBox}
				class="size-16 rounded-xl bg-rose-500"
			></div>
			<button
				onclick={triggerSpring}
				class="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
			>
				{springActive ? 'Reset' : 'Spring!'}
			</button>
		</div>
		<pre class="rounded-lg bg-gray-100 p-4 text-xs">{`animate(el, {
  scale: { to: 1.6, spring: { stiffness: 220, damping: 12 } },
  rotate: { to: 20, spring: { stiffness: 180, damping: 14 } },
})`}</pre>
	</section>

	<!-- 3. Stagger -->
	<section class="space-y-4">
		<h2 class="text-xl font-semibold">stagger()</h2>
		<p class="text-sm text-gray-500">Generate cascading delays for list animations.</p>
		<div class="flex items-start gap-8">
			<div class="flex flex-col gap-2">
				{#each staggerItems as item, i (item)}
					<div
						bind:this={staggerEls[i]}
						class="rounded-lg bg-emerald-100 px-4 py-2 text-sm font-medium text-emerald-800"
					>
						{item}
					</div>
				{/each}
			</div>
			<button
				onclick={toggleStagger}
				class="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
			>
				{staggerVisible ? 'Hide' : 'Show'}
			</button>
		</div>
		<pre class="rounded-lg bg-gray-100 p-4 text-xs">{`const delay = stagger(70, { from: 'start' });

items.forEach((el, i) => {
  animate(el, { opacity: [0, 1], y: [24, 0] }, {
    delay: delay(i, items.length),
    duration: 320,
    easing: 'easeOut',
  });
})`}</pre>
	</section>

	<!-- 4. Timeline -->
	<section class="space-y-4">
		<h2 class="text-xl font-semibold">timeline()</h2>
		<p class="text-sm text-gray-500">Sequence animations with a shared clock and position labels.</p>
		<div class="flex items-start gap-8">
			<div
				bind:this={tlCard}
				class="w-64 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
			>
				<div bind:this={tlLabel} class="mb-2 text-xs font-semibold uppercase tracking-widest text-violet-500">
					New
				</div>
				<div bind:this={tlTitle} class="mb-1 text-lg font-bold">Card reveal</div>
				<div bind:this={tlBody} class="mb-4 text-sm text-gray-500">
					Each child enters on its own offset from the parent.
				</div>
				<button bind:this={tlCta} class="rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white">
					Action
				</button>
			</div>
			<button
				onclick={runTimeline}
				class="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
			>
				Replay
			</button>
		</div>
		<pre class="rounded-lg bg-gray-100 p-4 text-xs">{`timeline({ duration: 380, easing: 'easeOut' })
  .add(card,    { opacity: [0, 1], y: [32, 0] })
  .add(label,   { opacity: [0, 1], x: [-8, 0] }, undefined, '<+40')
  .add(title,   { opacity: [0, 1], y: [8, 0] },  undefined, '<+60')
  .add(body,    { opacity: [0, 1] },              undefined, '<+80')
  .add(cta,     { opacity: [0, 1], scale: [0.88, 1] }, undefined, '<+60')
  .play()`}</pre>
	</section>

	<!-- 5. FLIP auto-tracked reorder -->
	<section class="space-y-4">
		<h2 class="text-xl font-semibold">flip() attachment</h2>
		<p class="text-sm text-gray-500">
			Pass <code>auto</code> as a reactive thunk — the attachment subscribes to its dependencies
			and re-measures after each DOM update.
		</p>
		<div class="flex items-start gap-8">
			<div class="grid grid-cols-3 gap-3">
				{#each flipItems as item (item)}
					<div
						{@attach flip({ duration: 400, easing: easeInOut, auto: () => { void flipItems; } })}
						class="flex size-20 items-center justify-center rounded-2xl bg-amber-100 text-3xl"
					>
						{item}
					</div>
				{/each}
			</div>
			<button
				onclick={shuffleFlip}
				class="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
			>
				Shuffle
			</button>
		</div>
		<pre class="rounded-lg bg-gray-100 p-4 text-xs">{`let items = $state(['🍎', '🍊', '🍋', '🍇', '🍓', '🫐']);

{#each items as item (item)}
  <div {@attach flip({ duration: 400, easing: easeInOut, auto: () => { void items; } })}>
    {item}
  </div>
{/each}`}</pre>
	</section>

	<!-- 6. flipFrom — manual expand/collapse -->
	<section class="space-y-4">
		<h2 class="text-xl font-semibold">flipFrom()</h2>
		<p class="text-sm text-gray-500">
			Capture a rect before a DOM change, then animate from it after the DOM settles.
		</p>
		<div class="flex items-start gap-8">
			<div
				bind:this={expandCard}
				class="overflow-hidden rounded-2xl bg-sky-500 text-white transition-none"
				class:w-48={!expanded}
				class:w-80={expanded}
				class:p-4={!expanded}
				class:p-8={expanded}
			>
				<p class="font-semibold">{expanded ? 'Expanded' : 'Collapsed'}</p>
				{#if expanded}
					<p class="mt-2 text-sm opacity-80">
						The layout change is captured before the DOM updates, then
						animated smoothly from the old rect to the new one.
					</p>
				{/if}
			</div>
			<button
				onclick={toggleExpand}
				class="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
			>
				{expanded ? 'Collapse' : 'Expand'}
			</button>
		</div>
		<pre class="rounded-lg bg-gray-100 p-4 text-xs">{`async function toggle() {
  const from = snapshotRect(el);
  expanded = !expanded;
  await tick();
  flipFrom(el, from, { duration: 420, easing: 'easeInOut' });
}`}</pre>
	</section>
</main>
