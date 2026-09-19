---
'@ixirjs/pulse': minor
---

Move transform animations off the main thread.

`animate()` drives transforms through CSS custom properties so independent
animations compose on one element, but Chromium cannot run a custom-property
animation on the compositor, and one such property pins everything animating
alongside it. A dialog morph was a style recalc and a full repaint every frame.

Three changes, all automatic and with no new options:

- Transform-animated elements get a `will-change` hint while an animation is in
  flight, so they are no longer repainted every frame. Every gesture takes the
  same hint for as long as it is writing, and hands it back after.
- When nothing else is composing on an element, the variable keyframes are
  folded into real `translate` / `scale` / `rotate` keyframes. The fold reverses
  itself the moment anything else touches the element, so composition is
  unchanged.
- Props are no longer grouped across the compositability boundary, so a
  `width` can no longer drag a sibling `opacity` onto the main thread.

One visible consequence: an `animate()` call mixing compositable and layout
properties now produces two entries in `controller.animations` instead of one.
