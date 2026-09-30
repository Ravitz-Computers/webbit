# Webbit website project — AI editing contract

Updated September 29, 2026. This folder contains ordinary website files. Read webbit.json for the entry page and inspect linked CSS/JS before editing. Metadata is not required to run an exported site. Preserve unrelated markup, comments, scripts, accessibility, links and license notices. Work from source files, not a serialized editor-preview DOM.

## Assets and graphics

Put images in assets/images/, fonts in assets/fonts/, and record paths, descriptions, provenance and licensing in assets/manifest.json. Use safe relative paths and meaningful alt text. Include real files rather than remote placeholders. External AI tools may generate files using their own capabilities; Webbit requires no AI service.

Preserve SVG viewBox, preserveAspectRatio, defs, gradients, clipping, masks, filters and href/xlink:href references. CSS url(#id) is a local paint/filter reference, not a file download. Keep these IDs unique when duplicating artwork and update references together. Do not erase fills, flatten vectors unnecessarily, or stretch artwork to force it into a rectangle. Prefer object-fit:contain for uncropped images. Webbit uses proprietary HARE/Vinny/Ravitz artwork for its own branding; it is not automatically licensed for your website.

## Editable elements, blocks, groups and effects

HTML/CSS are the source of truth. Visual edits must produce equivalent saved HTML/CSS. Elements may be nested, positioned, layered or grouped; preserve responsive behavior and review phone/tablet layouts after free placement. data-wb-block identifies editor block content. data-wb-canvas-id preserves selection across source edits. Elements sharing data-wb-group form a logical group without requiring a wrapper; give copied groups independent IDs. Grouping preserves HTML hierarchy, while moving can reparent content and uses ordinary CSS positioning. Group resize currently adjusts individual members rather than proportional group scaling.

Keep data-wb-fx, data-wb-site-fx and element-state configuration with their supporting styles/runtime files; inspect existing configuration before modifying it. Normal, Hover, Focus, Pressed and Disabled states are real CSS. Preserve reduced-motion and keyboard-focus behavior. Restaurant menu items, table rows/cells, image metadata, buttons, form actions and other content remain ordinary editable markup.

Do not save data-webbit-node, data-webbit-canvas-selected, data-webbit-overlay, ruler nodes, temporary contenteditable wrappers or preview CSP into source: these are editor-only. Preserve source-backed data-wb-* metadata unless deliberately removing that feature.

## Editor preferences versus website behavior

Light/Dark/System theme and 75–150% UI scale affect Webbit only, not the site's colors or CSS. Desktop, Tablet (768 CSS px), Phone (390 CSS px) and Reading are view modes. The bottom-right preview zoom offers Magnify (unchanged layout viewport) and Browser zoom (simulated responsive reflow). Reading is an editorial aid. These settings must never be baked into exported source. Browser zoom simulation does not reproduce every browser/OS text rendering or device-pixel-ratio behavior; verify the published site in target browsers.

Selection: Shift-click selects multiple objects; right-click Group/Ungroup saves or removes grouping. Shift+arrow nudges by 5 CSS px, Shift+Ctrl+arrow by 1 px; plain arrows do not move objects. Ctrl+drag rotates, resize handles resize, Delete removes selected content, and copy/paste regenerates copied identities. All these edits should retain undo support.

## Security, backend and deployment

Never put credentials in public files. Build Admin must use Webbit's fixed, tested PHP security runtime: username/password, mandatory TOTP and hashed one-use recovery codes; optional generic SMTP with Resend preset. Secrets and private/ stay outside the document root. Do not invent or replace authentication. Website-member login and website-manager login are separate systems. Cloudflare, AI, Webbit, Google and Resend services are never core login dependencies. Live Google Reviews is an optional integration requiring server-side API configuration and its provider's billing.

Sensitive-only encryption is the default. All-files encryption protects saved packages/backups; full deployed-storage encryption must be provisioned by the host owner. Database imports are data/source inputs, not automatic live database deployment. PHP and other server code require an appropriate runtime; the sandboxed editor preview is not a deployment test.

Run Guard and inspect changes before export. Guard is heuristic and cannot certify deployed DNS, certificates, TLS, Cloudflare policies or server configuration. Do not export secrets, private backend storage, SQL backups, database files or editor-only metadata. Review deployment output and the required hosting runtime separately.

Webbit detects external file changes. Do not overwrite unsaved/concurrent edits: let the user review/reload. Review source changes and test responsive layout, keyboard accessibility and real hosted behavior before publication.


## Preview and menus correction (September 30, 2026)

Interface scaling defaults to 85%; saved user choices remain respected. Reset appearance uses 85%. Website zoom remains independent at 100%. Preview measurements round fractional available space down and reserve scrollbar space, preventing split-view resize oscillation when opening sites or resizing application controls. Context menus stay mounted independently of selection redraws, use CSS hover states, and follow interface scale. Right-click either ruler and choose Hide rulers; Settings > Usability > Show top and left rulers restores them. This preference persists locally and never changes site files. Ruler coordinates use CSS pixels before preview magnification.


## Alt selection box and Ctrl-click links (September 30, 2026)

Hold Alt and drag anywhere on the editable page to select objects touched by the rectangle, in any direction. Partial intersection and edge contact count; full enclosure is not required. Shift+Alt-drag adds to the current selection. Saved groups select together. Document shells and editor overlays are excluded; partially covered containers defer to touched child content, while fully enclosed containers select as one object. This prevents moving a parent and its children twice. Selection uses visible axis-aligned bounding boxes, including rotated elements; it does not test individual image pixels. Edge dragging scrolls the page. Escape, pointer cancellation or losing focus cancels the box and restores the previous selection. Selection alone never edits HTML. Works while placing a gallery item as well as in selection/move/resize/rotate tools; Reading is not editable.

Ctrl-click a link to open a relative/root-relative page in the project, including fragments and common extensionless/directory routes. Local PHP opens its source; Webbit does not execute it in the editable preview. Missing local pages produce a status message. Ctrl-drag still rotates; link navigation only occurs after a click without a drag. External HTTP/HTTPS destinations show a warning and URL, with Open in browser and Cancel. They are never loaded into the editable frame. Unsupported schemes and URLs with credentials are rejected by both link resolution and the native browser-opening command. Imported sites normally retain relative links; downloaded pages rewrite known destinations to local files.
