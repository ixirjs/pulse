---
'@ixirjs/pulse': patch
---

The published `dist` now uses fully specified relative imports (`./x.js`, `./dir/index.js`), so the package loads under native Node ESM (server scripts, SSR without a bundler) instead of failing with `ERR_UNSUPPORTED_DIR_IMPORT`. `prepack` now import-checks the build.
