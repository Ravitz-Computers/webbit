# Webbit Beta 1 — master implementation specification

Source of decisions: the user's Rabbit Website Builder Names conversation, shared at https://chatgpt.com/share/6aa97d00-259c-83ea-9ba3-f2a25c03366e, and the supplied Webbit-Beta-1-Source.zip. Created September 15, 2026. This document records requirements; STATUS.md records what has actually been implemented and verified.

## Product and independence

Webbit by Ravitz Computers is a lightweight Windows 10/11 x64 desktop website builder using Tauri, React, TypeScript, and CodeMirror. A beginner can choose a starter, add content, edit visually, save, preview, and export. Advanced and Developer workflows expose increasingly detailed controls and ordinary source files. Core functionality costs $0, works offline, needs no account, paid API, licensing server, telemetry, or mandatory AI/cloud service. Website output and the generated manager must continue working without Webbit, Ravitz servers, Google, Cloudflare, Resend, or an AI provider.

## Project model and AI access

The source of truth is ordinary HTML/CSS/JS/PHP and other project files in a local folder. webbit.json and .webbit metadata are optional editor hints, not a proprietary storage dependency. Preserve the ZIP's ExampleSite project and support it directly. Assets are files with paths, descriptions/alt text, provenance, and license metadata. Include WEBBIT_AI.md explaining pages, shared components, assets, security, and exports. External agents may create images, SVG, styles, scripts, pages, favicons, robots.txt, sitemap, structured data, and hosting configuration. Webbit detects external changes, offers review/reload, avoids overwriting concurrent changes, and provides backups/rollback. AI capabilities are supplied by the user's tools; Webbit buys no API access.

## Editor

Rendered page and source are synchronized editable views of the same document. Use the real rendered DOM and preserve unrelated markup, comments, scripts, style, and server code when editing a field. Support multiple pages, templates, blocks, image insertion, element/source selection, property editing, undo/redo, a resizable divider, swapped panes, and code-only/preview-only layouts. Support beginner, advanced, and developer workflows. Source access extends to PHP, SQL, Python, Java, and configuration files without bundling their compilers/interpreters into the core app. Clearly identify which server languages cannot execute in local preview.

## Security & Compatibility Guard

Architectural subsystem from Beta 1, with source findings distinct from checks requiring a deployed host. Profiles: Modern Web, Maximum Compatibility, Google/search, Cloudflare Strict/Maximum, browser/mobile, accessibility, PHP, WordPress, and professional/custom. Check actionable source conditions: malformed/obsolete HTML, metadata, canonical/robots/sitemap, Open Graph and structured data, link and asset references, responsive viewport, semantic accessibility, image alt, mixed content, CSP/SRI, external dependencies, unsafe JavaScript, credential exposure, PHP/database risks, and manager security. Findings include file, location, severity, explanation, help, and Go to Problem. Safe fixes must be narrowly scoped, reversible, and followed by a rescan. Never invent alt text or silently change HTTP URLs without knowing the target supports HTTPS.

TLS versions, certificates, origin HTTPS, Full (strict), DNS, WAF, Access policies, redirects, server permissions and deployment headers require deployment evidence. Never claim universal security or Cloudflare/Google compliance from source alone. Cloudflare is optional; static Cloudflare Pages cannot run an ordinary PHP manager. Keep warning overrides distinct from critical manager publication blockers.

## Export and runtime packaging

Export normal HTML/CSS/JS/assets, PHP projects, WordPress theme structures, and custom files with relevant checks. Preserve portable, provider-independent output. A build.bat release pipeline must lock dependencies, test, validate licenses, build, and produce Webbit-Beta-1-Setup.exe (NSIS) and Webbit-Beta-1-Portable.zip. Package only dependencies needed at runtime. Target PCs need no Node, pnpm/npm, Cargo, Rust, Python, compiler, or source checkout. Installer installs per-machine into Program Files, checks for an installed WebView2 runtime and downloads it online only when missing; a self-contained portable ZIP must include and actually use a fixed WebView2 runtime. Produce a dated build manifest with versions, architecture, runtime inventory, and notices. Native build and clean-machine smoke tests are required before claiming a working Windows release.

## Build Admin / Website Manager

Analyze the specific site, propose managed fields/collections/global settings (headings, descriptions, prices, hours, contact details, images, announcements, posts and SEO), preview edits on a temporary copy, then generate the tailored manager. Managed fields have stable IDs; do not let the manager blindly rewrite arbitrary source. Public files remain ordinary and portable. Start with a standard PHP hosting target; WordPress integrates with its own data model, and static-only targets explain their backend requirement. Do not default the manager to an advertised /admin path or treat obscurity as authentication.

Use one fixed, versioned, tested Webbit security runtime. AI chooses the content schema, never invents/replaces auth. Required core: username/password, mandatory TOTP with local QR enrollment, hashed one-use recovery codes, secure server sessions, session regeneration and expiry, HTTPS-only Secure/HttpOnly/SameSite cookies, CSRF, output encoding, throttling, safe uploads, path confinement, backups and security headers. Setup must be locked down. Password hashes, TOTP seeds, session material and SMTP/API credentials stay server-side outside public files. Resend keys and similar secrets in public source are critical Guard findings. No unauthenticated public manager option.

Optional generic SMTP with a Resend preset may add password recovery and security notifications (new login, password change, failed-login warning); no SMTP is required to log in/recover with core credentials. Email recovery must not silently bypass mandatory MFA. Cloudflare Access may sit in front as an additional layer but is never required. Validate the fixed security runtime and generated deployment before manager export; no production-readiness claim without evidence.

## Branding, help, licensing

Use HARE's dark PC-focused panels, spacing, typography and restrained RGB accents, with genuine Vinny/Ravitz artwork from the authorized HARE source. Use mascot states where helpful (welcome, setup, help, investigation, errors, success, About, installer), without crowding the editor. Preserve asset provenance and individual license terms. Webbit code is MIT; Vinny, Ravitz logos/medallion, trademarks, and artwork are proprietary and explicitly excluded. Generate third-party notices from dependencies actually shipped, including transitive/native components and fonts.

Offline help covers starting, pages, text/images/layout/responsiveness, code, PHP/SQL/Python, forms/databases, WordPress, accessibility/security/HTTPS, export/deployment, AI/project structure, troubleshooting and licensing. About shows Webbit, Ravitz Computers, Beta 1, creation date September 15, 2026, support@ravitzcomputers.com, MIT, proprietary exceptions, and the actual third-party inventory.

## Full storage encryption

The sensitive-only profile remains the default. Full mode protects every loaded project file and asset in encrypted project/backup/delivery packages. Deployed storage protection requires host-provided volume encryption for all site state and backups. Do not represent that prerequisite as automatically configured or remotely verified. See help/ENCRYPTED-STORAGE.md.


## Current interaction requirements (September 29, 2026)

Use the canonical help/PROJECT-AI.md contract for generated website-agent instructions. Include saved Group/Ungroup context-menu actions, anchored left/top resize, Shift+arrow 5px and Shift+Ctrl+arrow 1px nudges with no plain-arrow movement. Preferences include Light/Dark/System and UI scaling. Every website view includes bottom-right zoom: Magnify preserves page layout; Browser zoom simulates responsive reflow. Preview and app preferences never modify deployment source. See STATUS.md for current verification and limitations.
