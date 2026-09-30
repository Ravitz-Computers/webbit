# WEBBIT_AI.md — Webbit source and project contract

Read CODEX.md, STATUS.md and SECURITY.md before changing Webbit itself. CODEX.md records the product requirements; STATUS.md distinguishes tested implementation from planned work.

For a website edited by Webbit:

- Ordinary files are the source of truth. webbit.json is an optional name/entry hint, not a container for the entire site.
- Inspect the entry page and linked styles/scripts before editing. Preserve unrelated markup, comments, scripts and license notices. Prefer small reversible changes.
- Put generated or supplied images under assets/images with safe relative paths. Keep descriptions, purpose, provenance and licensing in assets/manifest.json. Update the page's relative reference and meaningful alt text. Never substitute a remote placeholder for an included image.
- AI image/file creation is optional and performed by the user's chosen tool. Webbit requires no AI account or paid service. External edits are detected when a saved native project is open; review/reload rather than overwriting conflicts.
- Never write SMTP passwords, API keys, TOTP seeds, recovery codes or session secrets into browser-accessible files. Do not include .env, SQL dumps or editor metadata in deployment output.
- Keep HTML semantic, CSS responsive and JavaScript dependency-light. Guard checks source heuristically; verify server configuration and deployed behavior separately.
- Build Admin exports selected-field managers using the fixed PHP runtime. Do not invent authentication code, weaken its controls or place private/ under the server document root. Managers use the versioned Webbit security runtime: password + mandatory TOTP + hashed recovery codes, no external login dependency, optional generic SMTP/Resend.
- Vinny/Ravitz artwork is proprietary. Webbit's MIT source license does not license that artwork for unrelated websites.

Asset manifest example:

```json
{"version":1,"assets":[{"path":"assets/images/hero.webp","description":"Workshop exterior","purpose":"Homepage hero","source":"Owner supplied photo","license":"Owner permission for this website"}]}
```


## Current editor implementation (September 29, 2026)

The canonical website-agent instructions are help/PROJECT-AI.md. src/project.ts imports this file directly when generating WEBBIT_AI.md in new sites; update that contract when changing the project format. Existing user project guides are not silently overwritten. Read help/CONTEXTUAL-RIBBON.md for source-backed selection, saved groups, clipboard, states and placement. Read STATUS.md for limitations; do not describe all arbitrary HTML layouts as fully supported.

Appearance preferences are local application state: Light/Dark/System and 75–150% UI scale. Website preview has independent 25–300% Magnify and Browser zoom/reflow controls in all device/reading views. These settings never change exported site files. Magnify preserves layout viewport dimensions; reflow changes iframe viewport dimensions and visual scale to simulate browser zoom. Keep CSS-pixel coordinates and preview rulers coherent at all scales. Test responsive breakpoints and pointer interactions, not just CSS string output.

Preserve SVG fragment paint references and case-sensitive viewBox/preserveAspectRatio behavior. Branding uses original proprietary HARE SVGs with provenance. Regenerate native icons from assets/webbit-icon.svg; never upscale the small badge bitmap or stretch a non-square source. Keep source assets and compiled installers/portable packages synchronized.

Shift+arrow nudges selections 5 CSS pixels; Shift+Ctrl+arrow nudges 1 pixel. Plain arrows must not move elements. Text editing and menu navigation retain ordinary keyboard behavior. Saved data-wb-group groups select/move together without inserting wrappers; copied groups receive fresh identities. Resize is per member, not proportional group scaling. Regression checks cover source preservation, resize edge anchoring, grouping, SVG references, appearance validation and preview zoom geometry.

Windows installer: Program Files, per-machine NSIS, detect installed WebView2 and download only when missing. Portable ZIP bundles and uses its own fixed runtime. build.bat bootstraps prerequisites and runs the locked build/test/license pipeline. Do not claim clean-Windows install acceptance or production security certification without separate evidence.

Installer presentation is configured in installer/appearance.nsh and tauri.conf.json. scripts/generate-installer-art.ps1 regenerates opaque proportional BMP panels and LICENSES.txt from the existing license files during builds. Preserve standard Tauri installation/upgrade logic. See installer/README.md. License notices are informational; do not introduce new artwork permissions or click-through terms.



## Preview and menus correction (September 30, 2026)

Interface scaling defaults to 85%; saved user choices remain respected. Reset appearance uses 85%. Website zoom remains independent at 100%. Preview measurements round fractional available space down and reserve scrollbar space, preventing split-view resize oscillation when opening sites or resizing application controls. Context menus stay mounted independently of selection redraws, use CSS hover states, and follow interface scale. Right-click either ruler and choose Hide rulers; Settings > Usability > Show top and left rulers restores them. This preference persists locally and never changes site files. Ruler coordinates use CSS pixels before preview magnification.


## Alt selection box and Ctrl-click links (September 30, 2026)

Hold Alt and drag anywhere on the editable page to select objects touched by the rectangle, in any direction. Partial intersection and edge contact count; full enclosure is not required. Shift+Alt-drag adds to the current selection. Saved groups select together. Document shells and editor overlays are excluded; partially covered containers defer to touched child content, while fully enclosed containers select as one object. This prevents moving a parent and its children twice. Selection uses visible axis-aligned bounding boxes, including rotated elements; it does not test individual image pixels. Edge dragging scrolls the page. Escape, pointer cancellation or losing focus cancels the box and restores the previous selection. Selection alone never edits HTML. Works while placing a gallery item as well as in selection/move/resize/rotate tools; Reading is not editable.

Ctrl-click a link to open a relative/root-relative page in the project, including fragments and common extensionless/directory routes. Local PHP opens its source; Webbit does not execute it in the editable preview. Missing local pages produce a status message. Ctrl-drag still rotates; link navigation only occurs after a click without a drag. External HTTP/HTTPS destinations show a warning and URL, with Open in browser and Cancel. They are never loaded into the editable frame. Unsupported schemes and URLs with credentials are rejected by both link resolution and the native browser-opening command. Imported sites normally retain relative links; downloaded pages rewrite known destinations to local files.
