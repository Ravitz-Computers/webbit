# Current verification — September 30, 2026

The latest Windows release passed 239 automated checks: 113 frontend tests, 62 PHP security assertions, 10 content checks, 7 upload checks, 23 manager HTTP checks, 14 member HTTP checks and 10 Rust tests. TypeScript/Vite, NSIS and the fixed-runtime portable builds completed.

The disposable browser interaction fixture passed 12 additional checks of Alt selection, group expansion, partial overlap, additive selection, cancellation, real CSS edits, link callbacks and Ctrl-drag rotation. Browser UI checks confirmed Ctrl-click opens an internal page, an external link shows its URL and warning, Cancel retains the project, and internal navigation remains available after cancellation. External OS browser launching and clean-PC installation still need native acceptance checks.

Webbit is a free tool created as a fun side project with help from AI. The README follows HARE's install/features/build/licensing presentation; development history is preserved in DEVELOPMENT.md. The sections below record earlier verification and feature limitations.

---

# Implementation and verification — September 16, 2026

## Implemented

- Tauri/React/TypeScript desktop editor using ordinary project folders, real lockfiles and HARE/Vinny assets with recorded provenance.
- Synchronized leaf-text/source editing, split/resizable/swapped panes, responsive preview, undo/redo, templates, blocks and element inspector for attributes/style/order/removal.
- Native folder open/save/reload, imported assets, external-change detection, per-file backups, website export, manager package export and unsaved-close handling.
- Guard source findings, locations, explanations and limited safe autofixes; deployment guidance remains visibly separate.
- Site-specific Build Admin field selection and deployable fixed PHP runtime: local setup/QR, password + mandatory TOTP + hashed recovery codes, secure sessions, CSRF, throttling, encrypted private storage, publishing backups/conflicts, safe image uploads and account controls.
- Optional generic SMTP/Resend password reset and notifications. Reset still requires TOTP; no cloud service is mandatory.
- build.bat automatic prerequisite installation/cache, frozen dependency installation, tests, license inventory and separate self-contained NSIS/portable packaging.

- Broad file/folder/ZIP import with conflict review, binary-aware save/export/undo and element insertion.
- Taskbar background preference, explicit Exit with unsaved-change protection, and a single-instance plugin that restores the running window.

## Verification

25 frontend tests; 58 PHP security assertions; 10 PHP content checks; 7 PHP upload checks; 23 HTTP manager checks with localhost-only TLS simulation. Five native tests cover path confinement, folder/ZIP import, exact binary preservation, archive traversal/case collisions and malformed assets. TypeScript/Vite and both native release configurations have compiled successfully; NSIS and portable builds include the import and single-instance additions. A process smoke test confirmed the portable app uses its bundled runtime from a different working directory, a second launch exits leaving one instance, and the executable uses the Windows GUI subsystem (no console window).

Browser checks verified source/preview synchronization, pane swap, selecting elements, inspector class/style edits reflected in source and preview, move/undo, the site-specific manager dialog, import choices, persistent background preference and script insertion without preview execution. The background preference and import controls were checked in the browser. Native window-close and disk dialog workflows still need full native UI acceptance testing.

The release process regenerated 305 dependency entries with no missing license texts, including vendored PHPMailer and the local QR library. Proprietary HARE art remains excluded from the MIT source license.

## Remaining against the complete product specification

- Automatic WordPress theme generation/export targets and broader Guard profiles/deployed-host checks. Existing PHP/WordPress files remain editable source.
- Repeating manager collections, automatic schema migrations, management preview UI, persistent security audit logs and automated disaster recovery. Selected page fields are functional.
- Rich nested formatted-text editing; use source for complex markup.
- Full native filesystem/concurrency acceptance and all-files transactional saves. Current desktop backups are per file.
- Clean Windows installer/portable acceptance, real SMTP delivery and HTTPS-host deployment, independent security review and distribution signing.

The preview suppresses project JavaScript, network requests, frames and server execution. Critical Guard findings block normal UI export; the native command does not independently rerun Guard. Neither source checks nor test counts certify deployed security. This is a working Beta build under continued development, not a claim that every original requirement is finished.

## September 22 editor update

Implemented: File/Edit/View/Tools/Settings/Help menus; optional remembered ribbon with Home/Insert/View/Tools tabs and Ctrl+F1; block outline and text-field editing, insertion/duplication/sibling moves/removal; accordions, tabs, caption slide galleries and filtered lists; ten scoped effects; CSV/TSV/JSON table snapshots with explicit public-column selection; loopback-only browser preview of the unsaved static site.

Validation: 33 frontend tests and eight Rust tests passed; production frontend build passed. Browser UI checks confirmed ribbon expansion/tab switching/keyboard collapse, tabs insertion and switching, and block effect compatibility selection/application. Native default-browser launch still needs manual acceptance in the installed/portable app. SQLite/SQL browsing, live database connectors, effect inheritance for future pages, richer block schemas and drag reordering remain unfinished. The existing broader Beta limitations above still apply.

## September 22 additions

Implemented in source: welcome/close-site workflow, 16 templates, file filters/sort, four preview modes, formatting ribbon, 19 gallery entries, draw/move/resize canvas tools, 22 categorized effects, limited public HTTPS website downloader, optional Google Places reviews connector, separate member access with protected HTML export and automatic TOTP-secret encryption. Member login uses the standardized AuthStore/Session core with independent accounts, keys, sessions and cookie name.

Current limits: absolute placement needs responsive review; imported custom scripts run only in external browser preview, not the editing iframe; dynamic/server website downloading and SQL/SQLite browsing are not implemented. Members use CLI invitations, mandatory MFA and a single shared protected-page permission set. Protected-page content and public media are not encrypted at rest. Google live API behavior has not been verified using an actual key. Security runtime requires independent review before production use.

## September 23 encryption profile

Implemented: sensitive-only default; optional AES-256-GCM encrypted `.wbe` project snapshots, backups and deployment deliveries; native file dialogs; memory-only unlock; save-and-close integration; independent validated restore CLI. Existing plaintext copies are not converted. No passphrase recovery is provided. Deployment disk encryption is a hosting prerequisite and is neither enabled nor verified by Webbit. That portion must be provisioned by the host/server owner; an encrypted delivery file alone does not encrypt a running server.

## September 23 contextual ribbon and Ravitz proof

Selected elements open a contextual ribbon tab. Shared controls cover typography, borders, backgrounds, layout, flex/grid, behavior attributes, CSS properties, HTML, and stacking. Restaurant menu controls edit dishes, descriptions, prices, photos, categories and layouts. Navigation list items support nesting/outdenting; tables support rows, columns and cell text. Merged-table restructuring is deliberately rejected rather than corrupting the table. Complex markup and custom scripted behavior remain editable through Code.

Tabs drag out into floating, resizable panels and drag back to dock, with keyboard-accessible Float/Dock buttons. Ten per-element effect presets write real CSS for normal/hover/focus/pressed/disabled states with reduced-motion handling. Fields apply on blur or Enter. These are source edits, not editor-only overlays.

Browser checks: selected imported Ravitz Projects button automatically opened Button; changing Tooltip updated the rendered element. Drag out/back verified. Ravitz home source with locally embedded fonts/art rendered in Webbit. Public home/HARE/support files were copied using the application download pipeline for a separate local proof, preserving the site's own layout/scripts. This is a public static recreation, not a clone of the private admin/backend. Native import/save/export dialogs were not exercised in this proof. External project downloads/GitHub links remain external.

The proof exposed an inline-asset preview bug: supported data image/font/media URLs now survive the preview sanitizer, while document URLs and executable frames stay blocked. The importer now preserves original source using parser offsets instead of reserializing whole documents. Fragment links are covered by import tests. External fonts still require explicit local import.


Release verification: 65 frontend tests, 62 PHP security assertions, 10 content checks, 7 upload checks, 23 manager HTTP checks, 14 member HTTP checks and 9 Rust tests passed (190 total). Desktop headline geometry matched the live Ravitz page; the local phone view had no horizontal overflow. Full Windows release build and archive verification are recorded separately in the release output.

## September 24 canvas update

Added direct click/Shift-click selection, eight resize handles, group movement across containers, edge-scroll during moves, Ctrl-drag rotation with a Rotate menu alternative, and keyboard/on-canvas deletion. Double-click enables plain-text editing. Operations update source in one undoable change; selections persist using data-wb-canvas-id attributes. Document shells and constrained table/SVG subparts have structural limits described in help/CONTEXTUAL-RIBBON.md. Browser checks covered group relocation, selection persistence, delete/undo, resize, rotation mode and text-edit Delete safety. Five additional source regression tests cover batch operations, nesting normalization and document protection.

September 24 usability verification: 77 frontend checks passed, including seven new content/alignment/font tests. Browser checks confirmed direct nested-button text editing, drag snapping, template search, font import/application, rulers outside the content area, and right-click Bring to front with a single retained selection. Installer configuration now uses downloadBootstrapper; the portable build still uses a fixed runtime. Clean-machine acceptance remains outstanding.

Final usability build: all 202 checks passed (77 frontend, 62 PHP security, 10 content, 7 upload, 23 admin HTTP, 14 member HTTP and 9 Rust). Both optimized native compilations completed. Browser font import/application and right-click stacking checks passed. Installer script inspection confirmed the WebView2 registry check and conditional Microsoft bootstrapper download. The installer is approximately 4.1 MiB. Target-machine installation and missing-runtime recovery still require clean-Windows acceptance testing.

September 24 clipboard update: element Ctrl+C/Ctrl+V and context-menu Copy/Paste, direct Center horizontally on page, Position layer submenu, empty-page deselection, 6px selection-outline spacing and Visual-left split are implemented. Browser checks and six new clipboard tests passed. See help/CONTEXTUAL-RIBBON.md for behavior and limits.


## September 29: saved groups and anchored resize

Shift-click multiple objects and use right-click **Group selected**. Click any member (including nested content) to select and move the whole group. **Ungroup selected** restores independent selection. Group metadata is saved in ordinary HTML, undoable, and copied groups receive independent identifiers. Double-click group text to edit it. Groups do not add wrapper elements; resize handles adjust individual member sizes rather than proportionally scaling a bounding group.

Left/top resize handles now change the actual preview element live and preserve the opposite edge, including centered auto-margin boxes. Escape restores the original style. Padding/border minimum size is respected. Repeated left-edge inward/outward drags and group/ungroup were browser-checked. Complex rotated/transformed ancestor layouts still need manual review.


## Vector rendering and artwork update

Preview preserves local SVG gradient, mask, filter and clipping references in CSS and resolves SVG image href/xlink:href assets. SVG viewBox/preserveAspectRatio editing replaces the original attribute instead of appending a duplicate. Resizing an image using default fill now writes object-fit:contain to avoid stretching; existing cover/contain modes remain. Branding uses original HARE SVG artwork and Windows icons are regenerated from the detailed vector medallion with proportional padding. All original proprietary assets and provenance remain documented.

Keyboard movement: Shift+arrow = 5 CSS pixels; Shift+Ctrl+arrow = 1 pixel. Plain arrows do not move objects.


## Appearance preferences

Preferences > Appearance supports Light, Dark and Follow system, plus interface sizes from 75% to 150% in 5% steps. Preferences persist locally. Scaling changes application controls, spacing and text while retaining preview device widths, canvas coordinates and site CSS pixels. The source editor follows the selected theme. Reset appearance restores Dark at 85%.


## Website view zoom and AI documentation

All preview modes have bottom-right 25–300% zoom controls. Magnify retains the CSS layout viewport; Browser zoom changes viewport dimensions and scales the display, simulating responsive browser zoom. It is not an emulation of every browser/device pixel ratio. Canvas coordinates remain CSS pixels and preview changes never modify source. Generated WEBBIT_AI.md now comes from canonical help/PROJECT-AI.md, covering assets/SVG, groups, effects, preferences, preview, security and deployment. Existing user project guides are preserved.


## September 30 installer refresh

NSIS now uses branded welcome/finish and header panels, explicit installer/uninstaller icons, Segoe UI typography and revised setup wording. Artwork uses opaque vector-derived renders and aspect-preserving image scaling. A Licenses & artwork notice page presents MIT, proprietary artwork and third-party information without a new click-through agreement. Program Files installation and conditional WebView2 download remain Tauri-managed.


## Preview and menus correction (September 30, 2026)

Interface scaling defaults to 85%; saved user choices remain respected. Reset appearance uses 85%. Website zoom remains independent at 100%. Preview measurements round fractional available space down and reserve scrollbar space, preventing split-view resize oscillation when opening sites or resizing application controls. Context menus stay mounted independently of selection redraws, use CSS hover states, and follow interface scale. Right-click either ruler and choose Hide rulers; Settings > Usability > Show top and left rulers restores them. This preference persists locally and never changes site files. Ruler coordinates use CSS pixels before preview magnification.


## Alt selection box and Ctrl-click links (September 30, 2026)

Hold Alt and drag anywhere on the editable page to select objects touched by the rectangle, in any direction. Partial intersection and edge contact count; full enclosure is not required. Shift+Alt-drag adds to the current selection. Saved groups select together. Document shells and editor overlays are excluded; partially covered containers defer to touched child content, while fully enclosed containers select as one object. This prevents moving a parent and its children twice. Selection uses visible axis-aligned bounding boxes, including rotated elements; it does not test individual image pixels. Edge dragging scrolls the page. Escape, pointer cancellation or losing focus cancels the box and restores the previous selection. Selection alone never edits HTML. Works while placing a gallery item as well as in selection/move/resize/rotate tools; Reading is not editable.

Ctrl-click a link to open a relative/root-relative page in the project, including fragments and common extensionless/directory routes. Local PHP opens its source; Webbit does not execute it in the editable preview. Missing local pages produce a status message. Ctrl-drag still rotates; link navigation only occurs after a click without a drag. External HTTP/HTTPS destinations show a warning and URL, with Open in browser and Cancel. They are never loaded into the editable frame. Unsupported schemes and URLs with credentials are rejected by both link resolution and the native browser-opening command. Imported sites normally retain relative links; downloaded pages rewrite known destinations to local files.
