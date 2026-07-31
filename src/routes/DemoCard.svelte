<script lang="ts">
	import type { Snippet } from 'svelte';

	let { title, code, children }: { title: string; code: string; children: Snippet } = $props();

	let dialog = $state<HTMLDialogElement>();

	const close = (e: MouseEvent) => {
		// Clicking the ::backdrop reports the <dialog> itself as the target.
		if (e.target === dialog) dialog?.close();
	};
</script>

<article
	class="flex min-h-64 flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white transition-colors hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700"
>
	<header
		class="flex items-center justify-between gap-3 border-b border-zinc-100 px-5 py-3 dark:border-zinc-800"
	>
		<h2 class="truncate font-mono text-xs font-medium text-zinc-700 dark:text-zinc-300">
			{title}
		</h2>
		<button
			onclick={() => dialog?.showModal()}
			class="shrink-0 rounded-md border border-zinc-200 px-2.5 py-1 font-mono text-[10px] font-medium text-zinc-500 transition-colors hover:border-indigo-300 hover:text-indigo-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-indigo-500/60 dark:hover:text-indigo-400"
		>
			code
		</button>
	</header>

	<div class="flex flex-1 flex-col items-center justify-center gap-5 p-7">
		{@render children()}
	</div>
</article>

<dialog
	bind:this={dialog}
	onclick={close}
	class="m-auto w-[calc(100%-2rem)] max-w-2xl overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950 p-0 shadow-2xl backdrop:bg-zinc-950/60 backdrop:backdrop-blur-sm"
>
	<div class="flex items-center justify-between border-b border-zinc-800 bg-zinc-900 px-5 py-3">
		<span class="font-mono text-xs text-zinc-300">{title}</span>
		<button
			onclick={() => dialog?.close()}
			aria-label="Close"
			class="rounded-md p-1.5 text-zinc-500 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400"
		>
			✕
		</button>
	</div>
	<pre
		class="max-h-[70vh] overflow-auto bg-zinc-950 p-5 font-mono text-xs leading-6 text-zinc-200"><code
			>{code}</code
		></pre>
</dialog>
