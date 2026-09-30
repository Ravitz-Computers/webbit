# Ravitz admin reference review — September 22, 2026

Status: observed design reference, not implemented Webbit functionality. The user authorized inspection of the signed-in portal to guide the combined product. No page content, uploads, revisions or live settings were changed. Save remained disabled after inspection. No authentication data was copied.

## Observed

- Dashboard: per-page status, page and block counts, edit/open links, recent edits.
- Editor: page selector, new page, files, history, view live and explicit Save.
- Left outline: named sections containing typed blocks. Standard, tight and full-bleed section labels. The UI advertises drag reordering; reordering was not performed on the live site.
- Modes: Page, Split and HTML; Desktop, Tablet and Phone widths. Split displays generated HTML alongside the preview. Direct HTML editing was not demonstrated.
- Block inspector: logo image/alt text/variant/width, multiline heading, size, eyebrow and a chromatic-split switch. Fields are tailored to the selected block.
- Block catalog: headings, logo lockup, text, eyebrow; claims/specs/stats/works lists; notes, flow diagram, buttons, images, hero line, columns, poster, device panel, RGB rail, divider, spacer and light bar; latest-release data block; raw HTML.
- File library: image/PDF uploads, advertised 20 MB limit, currently empty. No upload performed.
- History: saved versions and Restore. UI states restoring produces another version. No restoration performed; persistence/security semantics were not audited.
- Public cursor light: layered gradients follow the pointer with easing. Public code checks reduced motion. This is a behavior reference, not copied implementation.

## Webbit integration requirements

1. Separate editing mode (Blocks / Visual / Source / Split) from user skill level (Beginner / Advanced / Developer).
2. Page outline is a section/block tree with selection synchronized to preview and source. Add, duplicate, reorder, remove and undo operate on ordinary HTML while preserving unrelated source.
3. Typed block inspector for Webbit-created blocks; conservative generic editing for imported markup. Do not force arbitrary imported pages through a lossy template conversion.
4. Categorized block gallery: content, layout, media, interactive and data. Repeating rows/items need real add/remove/reorder controls.
5. Effects gallery: site defaults, page overrides and compatible block effects, with visible inherited state, removal/reset and undo. Include cursor glow/spotlight, ambient backgrounds, scroll reveals, hover treatments, borders and chromatic heading treatment. Respect reduced motion and coarse pointers; effects never hide essential content if JavaScript fails.
6. Dynamic elements and effects use a fixed local Webbit runtime in preview. Imported scripts stay inactive in the editor. Export ordinary local CSS/JS with no Webbit service dependency.
7. Imported CSV/JSON/SQLite/SQL data remains private until explicitly selected for public rendering. Distinguish data snapshots from live database connections. Never execute SQL dumps during inspection.
8. Use the section/block schema to improve the generated website manager, retaining standardized password/TOTP/recovery security, optional SMTP and server-side secrets.
9. Keep File/Edit/View/Tools/Settings/Help menus, keyboard access, clear unsaved state, revision safety and responsive inspector layout.

## Remaining work

Follow-up implementation now includes menus, an optional ribbon, basic block editing, ten scoped effects, CSV/TSV/JSON snapshots and browser preview. Frontend and native tests pass; UI checks cover the ribbon, tabs and block effect application. SQLite/SQL browsing, advanced block schemas, drag reordering and effect inheritance for future pages remain planned. See STATUS.md for release limitations.

