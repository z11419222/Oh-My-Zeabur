# MirrorZeabur Agent Notes

## Stack and boundaries
- Root app is a single-package Vite + React 19 + TypeScript frontend. Main entrypoints are `src/main.tsx` and `src/App.tsx`.
- Desktop/backend layer lives in `src-tauri/`. `src-tauri/src/main.rs` only calls `mirrorzeabur_lib::run()`, and the real Tauri command bridge is in `src-tauri/src/lib.rs`.
- Deployment state is split intentionally:
  - `src/store/deploymentStore.ts` persists non-secret config, generated YAML, and history in browser storage via Zustand `persist`.
  - Zeabur API keys are stored in the OS keyring through Tauri commands, with metadata mirrored to app data `zeabur-keys.json`.
- YAML generation is centralized in `src/utils/template.ts`. If deployment shape changes, update the typed config in `src/types/deployment.ts` and the generator together.

## Commands that matter
- Install JS deps: `npm install`
- Frontend dev server only: `npm run dev`
- Desktop dev flow: `npm run tauri:dev`
- Frontend build/typecheck: `npm run build`
- Desktop build: `npm run tauri:build`
- Lint: `npm run lint`
- Rust check: `cargo check` (run inside `src-tauri`)

## Command quirks
- Do not assume one package manager everywhere. Root scripts are run via `npm`, but `src-tauri/tauri.conf.json` hardcodes `beforeDevCommand: "bun run dev"` and `beforeBuildCommand: "bun run build"`. Tauri dev/build therefore expects `bun` to be available even though CI installs frontend deps with `npm install`.
- Vite dev server is fixed to port `5173` (`vite.config.ts`) and Tauri `devUrl` points to `http://localhost:5173`.
- There is no verified JS test workflow in this repo: `package.json` has no `test` script.

## Verification checklist
- For frontend-only changes: run `npm run lint` and `npm run build`.
- For Rust/Tauri changes: run `cargo check` in `src-tauri` in addition to the frontend checks.
- For changes touching the Tauri bridge or deployment flow, verify both sides: the TS wrapper in `src/lib/tauri.ts` and the matching Rust command in `src-tauri/src/lib.rs`.

## Runtime and integration gotchas
- Zeabur auth/deploy validation is not mocked: Rust shells out to `npx zeabur@latest ...` in `src-tauri/src/lib.rs`. Any deployment-related change implicitly depends on Node/npm/npx being available at runtime.
- Secure key restore can legitimately return metadata entries with `hasSecret: false` when the JSON file exists but the OS keyring entry does not on the current machine. Preserve that behavior unless you are intentionally changing cross-machine restore semantics.
- `src/utils/template.ts` treats `cluster-slave` as “app only” and omits Postgres/Redis services. Do not change deploy-mode behavior in pages/forms without checking the YAML generator.
- The app forces dark mode on mount in `src/App.tsx` via `document.body.setAttribute('theme-mode', 'dark')`; visual changes should be validated against the dark theme, not only default Semi UI styling.

## High-value files
- `README.md` - product scope and deploy-mode intent
- `docs/technical-architecture.md` - domain model and intended workflow
- `src/types/deployment.ts` - source of truth for deploy config shape
- `src/utils/template.ts` - Zeabur YAML rendering rules
- `src/store/deploymentStore.ts` - persisted UI state and Zeabur key metadata flow
- `src/lib/tauri.ts` + `src-tauri/src/lib.rs` - TS/Rust command contract
- `.github/workflows/windows-release.yml` - release flow builds Windows artifacts from tags only
