---
'@ixirjs/pulse': minor
---

Emit CSS easing keywords instead of resampling them. An easing that _is_ a CSS
keyword curve (`ease`, `easeIn`, `easeOut`, `easeInOut`, `linear`) now reaches
WAAPI as that keyword rather than a 25-point `linear(…)` approximation of it —
exact timing, smaller keyframes.
