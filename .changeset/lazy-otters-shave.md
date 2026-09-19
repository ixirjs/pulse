---
'@ixirjs/pulse': minor
---

Remove the `disabled` option from every gesture attachment.

It duplicated what Svelte already gives you, and did it worse: `disabled: true`
only short-circuited the setup, so toggling it did nothing to an attachment that
was already live. Conditional attachment is the working form and actually tears
the listeners down:

```svelte
<!-- before -->
<div {@attach draggable({ disabled: !enabled })}>…</div>

<!-- after -->
<div {@attach enabled ? draggable() : undefined}>…</div>
```
