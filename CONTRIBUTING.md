# Contributing to Webbit

Webbit is a free side project. Bug reports and focused fixes are welcome.

## Reporting a bug

Include the build, steps to reproduce, expected result and actual result. Attach a small example project if possible, with credentials and personal information removed. Send security reports privately to support@ravitzcomputers.com; see SECURITY.md.

## Working on it

Use the locked dependencies with `pnpm install --frozen-lockfile`. Run `pnpm dev` for the frontend, `pnpm test` for frontend checks and `pnpm build` for TypeScript and production bundling. Native filesystem and window features require the Tauri desktop application.

Run `build.bat` on Windows for the complete PHP, HTTP, Rust and frontend checks and both release packages. Check STATUS.md before changing a feature: it records verified behavior and known limitations.

Tests should catch a concrete failure. For canvas changes, also verify the interaction fixture at `/tests/browser/interactions.html` while Vite is running. Include a browser check that confirms real source changes when the interaction edits a page.

## Project rules

Keep core editing free of required cloud or AI services. Generated authentication must use manager-runtime, with secrets outside the public web root. Keep admin and member login separate. Preserve ordinary project files and align the help and WEBBIT_AI.md with behavior.

Vinny and Ravitz artwork retain their proprietary rights. Do not relabel them as MIT or put application branding into exported user sites without permission.
