# Repository Index

> Repository-wide router and architectural map for AI agents. This is a single-project Svelte library repository; read this index before modifying the project.

## Repository overview

`@ixirjs/pulse` is a TypeScript/Svelte 5 library of spring-powered Web Animations API utilities, FLIP layout transitions, gestures, scroll utilities, presence transitions, and related motion helpers. The repository is a **single project**, not a monorepo: the root `package.json` contains one package and its scripts, `src/lib/index.ts` is the public barrel, and `src/routes`/`src/stories` provide the SvelteKit demo and Storybook material. Build and package behavior is defined by `vite.config.ts`, `svelte.config.js`, `tsconfig.json`, and the package scripts.

## Start here

- `package.json` — package identity, public exports, peer dependency, and verified scripts.
- `README.md` — public API examples and consumer-facing behavior.
- `src/lib/index.ts` — root public export surface.
- `src/lib/animate/index.ts` and `src/lib/flip/index.ts` — the two deepest core API entry points.
- `vite.config.ts` — SvelteKit/Vite and Vitest client, server, and Storybook test projects.
- `svelte.config.js` and `tsconfig.json` — Svelte 5 compiler and TypeScript setup.
- `src/routes/+page.svelte` — executable demo exercising the library features.

## Project index router

This is a single-project repository. There are no subordinate `INDEX.md` files: `src/lib` is the library source tree, not an independently built package, and `src/routes` and `src/stories` are project-local demo/documentation surfaces.

| Project or subsystem | Responsibility | Index | When to read it |
|---|---|---|---|
| Root project | Published `@ixirjs/pulse` package plus SvelteKit demo and Storybook fixtures | `INDEX.md` | Always; this index is the local project guide |

## Repository topology

| Path | Responsibility | Index or source of truth |
|---|---|---|
| `src/lib/` | Authored library implementation and public subpath entry points | `src/lib/index.ts`, each module's `index.ts`, and module `README.md` files |
| `src/lib/animate/` | WAAPI animation runtime, controllers, keyframes, springs, timelines, and numeric helpers | `src/lib/animate/index.ts` |
| `src/lib/flip/` | FLIP measurement, animation, Svelte attachments, shared-element bridges, and tracking | `src/lib/flip/index.ts` |
| `src/lib/easing/` | Easing primitives, CSS easings, cubic bezier, and spring easing | `src/lib/easing/index.ts` |
| `src/lib/gestures/` | Svelte 5 pointer, touch, wheel, and reorder attachments | `src/lib/gestures/index.ts` |
| `src/lib/scroll/` | Scroll progress and in-view utilities | `src/lib/scroll/index.ts` |
| `src/lib/presence/`, `variants/`, `view-transition/` | Svelte transitions, named animation states, and native View Transitions integration | Their local `index.ts` files |
| `src/lib/gradient/`, `morph/`, `text/` | Gradient interpolation, SVG path morphing, and text splitting | Their local `index.ts` files |
| `src/lib/shared/` | Browser checks, math, shared types, and spring core used across modules | `src/lib/shared/index.ts` |
| `src/routes/` | SvelteKit demo page and layout; imports library internals through `$lib` | `src/routes/+page.svelte` |
| `src/stories/` | Storybook component stories and Storybook test inputs | `.storybook/main.ts` |
| `static/` | Static SvelteKit assets | SvelteKit configuration |
| `.storybook/` | Storybook framework, addons, story discovery, and preview configuration | `.storybook/main.ts`, `.storybook/preview.ts` |
| `.changeset/` | Release notes and Changesets publishing configuration | `.changeset/config.json` |

## Cross-project architecture

There are no cross-project dependencies: this is one package. Within the package, `src/lib/index.ts` re-exports feature barrels, while `package.json` also exposes feature subpaths such as `./animate`, `./flip`, and `./gestures`. The `animate` and FLIP implementations share motion types and browser helpers; FLIP, gestures, presence, variants, scroll, and view-transition features use the animation/easing machinery or shared `--motion-*` transform conventions where applicable. Feature modules are authored together and are packaged by `svelte-package` into `dist`.

The SvelteKit demo (`src/routes/+page.svelte`) is a consumer-like integration surface and imports feature modules directly from `$lib`; changes to public exports or behavior should be checked against it. Storybook stories are a separate test/documentation surface in the same project, discovered by `.storybook/main.ts` and included in the Storybook Vitest project.

```text
public package entry points (src/lib/index.ts, package.json exports)
        ├── animate / easing / shared
        ├── flip / gestures / scroll
        └── presence / variants / gradient / morph / text / view-transition
             ├── SvelteKit demo: src/routes
             └── Storybook stories/tests: src/stories + .storybook
```

## Shared development workflows

| Task | Command | Scope | Evidence or notes |
|---|---|---|---|
| Start SvelteKit/Vite development server | `npm run dev` | Root app | `package.json` |
| Type and Svelte validation | `npm run check` | Whole configured project | Runs `svelte-kit sync` and `svelte-check` from `package.json` |
| Unit tests | `npm test` | Root Vitest suite; configured client/server projects | `test` invokes `test:unit -- --run`; `vite.config.ts` defines test projects |
| Watch unit tests | `npm run test:unit` | Vitest in watch mode | `package.json` |
| Lint and formatting check | `npm run lint` | Repository files not ignored by ESLint/Prettier | `eslint.config.js`, `.gitignore`, and `package.json` |
| Build package and app | `npm run build` | SvelteKit build followed by package preparation | `package.json`; `prepack` runs `svelte-package` and `publint` |
| Build Storybook | `npm run build-storybook` | Storybook stories | `.storybook/main.ts` and `package.json` |
| Analyze package size | `npm run analyze` | Package output and size-limit check | `package.json`, `.size-limit.json` |
| Release | `npm run release` | Package publishing via Changesets | `.changeset/config.json`; publishing is an external side effect and requires release intent |

No command is claimed here for deployment: `svelte.config.js` uses `adapter-auto`, but no repository deployment workflow or platform configuration was found.

## Shared configuration and infrastructure

- `package.json` controls package exports, Svelte peer dependency, build/package tooling, test/lint scripts, and Changesets release scripts.
- `bun.lock` records dependency resolution; `.npmrc` enables strict engine checking.
- `vite.config.ts` configures Tailwind, SvelteKit, Vitest browser testing through Playwright, Node tests, and Storybook tests.
- `svelte.config.js` configures Svelte 5 runes mode, `adapter-auto`, and mdsvex extensions.
- `tsconfig.json` extends generated SvelteKit settings and enables strict TypeScript/bundler resolution.
- `eslint.config.js`, `.prettierrc`, and `.prettierignore` define lint/format behavior.
- `.storybook/main.ts` and `.storybook/preview.ts` define Storybook discovery, addons, and accessibility settings.
- `.changeset/config.json` defines public Changesets release behavior.

## Repository-wide conventions and constraints

- Keep library implementation under `src/lib`; expose new public APIs through the appropriate local barrel and, when intended, `src/lib/index.ts` and `package.json` exports.
- Svelte source uses Svelte 5 runes by default through `svelte.config.js`; library code also has non-component TypeScript modules.
- The package targets Svelte `^5.0.0` as a peer dependency and Node `>=18`.
- Transform-related features compose through the library's `--motion-*` custom-property approach; avoid introducing transform clobbering in animation, FLIP, or gesture code.
- Tests sit beside implementations as `*.test.ts` and `*.svelte.test.ts`; preserve that association.
- `.claude/CLAUDE.md` requests a global review after each change. No source file should be treated as generated merely because it is under `src`.

## Cross-project change guide

This is a single project, so the table identifies project-local surfaces rather than separate workspaces.

| Change type | Affected indexes or projects | Validation | Risks |
|---|---|---|---|
| Public API, type, or export change | `src/lib`, `package.json`, demo, relevant stories | `npm run check`, `npm test`, `npm run build` | Broken subpath exports or consumer types |
| Animation/keyframe/controller change | `src/lib/animate`, `src/lib/shared`, dependent motion modules | Narrow colocated tests, `npm test`, `npm run check` | WAAPI timing, browser-only behavior, transform composition |
| FLIP/layout/observer change | `src/lib/flip`, demo and relevant Svelte tests | FLIP tests, browser tests, `npm test` | Layout measurement, reflow timing, shared-element state |
| Gesture/scroll/transition feature change | Relevant `src/lib/<feature>` module and demo | Colocated tests, browser tests, `npm run check` | Pointer/browser APIs and reduced-motion behavior |
| Storybook/demo change | `src/routes`, `src/stories`, `.storybook` | `npm run check`, `npm run build-storybook`, Storybook Vitest via `npm test` | Integration examples can expose public API regressions |
| Release metadata or package output change | `.changeset`, `package.json`, generated `dist` | `npm run prepack` or `npm run build` | Do not hand-edit generated package output |

## Generated, vendored, and ignored areas

- `node_modules/` is installed dependency content and must not be edited.
- `.svelte-kit/` is generated by SvelteKit synchronization and is ignored by `.gitignore`.
- `dist/` is package/build output and is ignored; its source of truth is `src/lib/` plus package/build configuration.
- `.output/`, `.vercel/`, `.netlify/`, `.wrangler/`, and `/build` are ignored output/deployment areas when produced.
- Environment files matching `.env*` are ignored except explicitly allowed example/test names; never copy values into documentation.
- `bun.lock` is committed dependency metadata, not authored runtime source.

## Risks and fragile boundaries

**Verified:** browser APIs are central: the animation runtime uses WAAPI, FLIP uses DOM measurement/observers, gestures use pointer/touch/wheel behavior, and view transitions depend on optional platform support. `vite.config.ts` separates browser Svelte tests from Node tests. Reduced-motion handling is part of the public behavior described in `README.md` and implemented in motion modules.

**Verified:** package consumers use the `package.json` export map and generated `dist` declarations; changing barrels without updating intended subpath exports can make APIs unavailable after packaging.

**Inference:** the broad root barrel and shared transform custom properties create higher coupling than the directory layout suggests. Validate changes across adjacent feature tests and the demo rather than relying only on a narrow unit test.

No deployment, database, migration, or external service boundary is defined in the current working tree.

## Unindexed areas

None identified. Internal feature directories are meaningful implementation modules but are not independent package, build, deployment, or ownership boundaries; local module READMEs and barrels provide sufficient navigation without nested indexes.

## Open questions

- The repository contains `src/routes` and Storybook configuration alongside a publishable library, but no separate manifest or deployment configuration establishes them as independent projects; they are treated as project-local demo/test surfaces.
- `adapter-auto` selects a deployment adapter based on the consuming environment; the current working tree does not identify a deployment target.

## Index maintenance

Update this index when the package exports, workspace shape, major library module boundaries, scripts, test projects, generated-output rules, or deployment/release configuration changes. Recheck the root router if a new independent package, application, service, or ownership/build boundary appears; only then add a subordinate `INDEX.md`.

_Last verified against the current working tree on 2026-07-18. No claim in this index overrides source code or executable configuration._
