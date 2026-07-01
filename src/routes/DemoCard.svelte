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
	class="flex min-h-56 flex-col rounded-xl border border-zinc-200 bg-white transition-colors hover:border-zinc-300"
>
	<header class="flex items-center justify-between gap-2 border-b border-zinc-100 px-4 py-2.5">
		<h2 class="truncate font-mono text-[13px] text-zinc-800">{title}</h2>
		<button
			onclick={() => dialog?.showModal()}
			class="shrink-0 rounded-md px-2 py-1 text-xs font-medium text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700"
		>
			&lt;/&gt; code
		</button>
	</header>

	<div class="flex flex-1 flex-col items-center justify-center gap-5 p-6">
		{@render children()}
	</div>
</article>

<dialog
	bind:this={dialog}
	onclick={close}
	class="m-auto w-full max-w-2xl rounded-xl p-0 backdrop:bg-zinc-950/40 backdrop:backdrop-blur-sm"
>
	<div class="flex items-center justify-between border-b border-zinc-800 bg-zinc-900 px-4 py-2.5">
		<span class="font-mono text-[13px] text-zinc-300">{title}</span>
		<button
			onclick={() => dialog?.close()}
			aria-label="Close"
			class="rounded-md px-2 py-1 text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-200"
		>
			✕
		</button>
	</div>
	<pre class="overflow-x-auto bg-zinc-900 p-4 font-mono text-xs leading-relaxed text-zinc-100"><code
			>{code}</code
		></pre>
</dialog>
