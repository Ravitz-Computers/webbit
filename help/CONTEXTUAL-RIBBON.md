# Contextual ribbon

Select an element in the preview to open its tab. Image, table and menu selections expose their specialized controls; all elements share appearance, background, content, behavior, effects, layers, attributes and HTML controls. Select a covered or hidden element from the element selector. For nested rich text, select its individual children or edit its HTML.

Fields apply when you leave them or press Enter; Code applies with its explicit button. Undo restores source changes. Drag a tab outside the ribbon to float it; drag its header onto the ribbon to dock it. Float/Dock buttons provide a keyboard alternative. Ctrl+F1 hides or shows the ribbon.

Effects have Normal, Hover, Keyboard focus, Pressed and Disabled states. Presets use Hover when Normal is selected. Styles export as ordinary CSS and respect reduced motion. A disabled visual state does not disable a link: actual HTML behavior belongs under Behavior. Scripts are isolated in the embedded editor; use Preview in Browser to exercise them.

Restaurant menus support dish names, prices, descriptions, images, categories, order and column layouts. Navigation lists support nesting/outdenting. Imported custom menus may require selecting their children or editing Code. Tables support unmerged row/column editing; merged cells need explicit HTML changes. Image controls apply to img; select the img inside a picture wrapper. Layers use CSS positioning and z-index within ancestor stacking contexts. Check all responsive sizes after free placement.

## Canvas selection and direct manipulation — September 24

Click visible page content to select it. Shift-click toggles additional elements, excluding nested parent/child double selections. Drag a selected object to move the selection into another container, including header-to-footer movement. Keep the pointer near the top or bottom edge to scroll during a move. Drag any of the eight handles to resize. Ctrl-drag rotates; the Canvas menu also offers Rotate. Rotation uses the CSS rotate property and retains existing transform declarations.

Delete removes the selected objects; the on-canvas Delete selected button does the same. Undo/redo uses the existing source history. Double-click plain text to edit its contents; Delete then edits text normally. Selection outlines and handles stay out of exported HTML. Stable data-wb-canvas-id metadata preserves the selection after geometry edits.

These gestures apply to rendered content elements rather than a predefined widget whitelist. HTML/head/body and metadata/scripts are document infrastructure, not movable objects. Table internals and SVG subparts must obey their enclosing markup structure: select their table/SVG container for cross-container moves; simple fields/code remain available for internals. Free placement writes absolute pixel geometry and needs review at each responsive size. Nontrivial transformed containers and merged/nested structures require further acceptance coverage.

Browser verification: Shift-selected two buttons, moved both from header to footer, retained selection, deleted both with Delete and restored with Undo. Resize changed a button from 120x50 to 192x90 in source. Rotate mode wrote rotate:50deg. Double-click paragraph editing worked and Delete did not remove its element. Ctrl activation and edge-scroll use the same gesture controller but were not separately exercised by held-key/long-drag browser automation.

## Usability update - September 24

Click directly on a visible text run to edit it, including text nested inside buttons, links and other elements. Neighboring markup is preserved. Click/drag padding or backgrounds to select/move, or choose Drag to move to move from any point. Double-click text editing remains available. Shift-click and Ctrl-drag retain group-selection and rotation behavior.

Moving groups snap within 6 CSS pixels to page and visible element edges/centers. Pink lines label both the target and the moving edge/center. Settings > Preferences now has Usability, Fonts and Window tabs. Snapping and top/left rulers default on, can be disabled independently, and persist on this computer. Rulers are outside the editable page and measure CSS pixels. Neither rulers nor guides are exported.

Right-click content for Bring forward, Send backward, Bring to front and Send to back. These commands normalize sibling z-index values and preserve selection. They remain subject to ancestor CSS stacking contexts; they do not move content between containers.

Settings > Preferences > Fonts (also Import fonts in Typography) imports local WOFF, WOFF2, TTF or OTF files up to 20 MB, identifies the actual file format and generates ordinary @font-face CSS. Choose the family in the ribbon. Font files, a manifest and CSS stay under assets/fonts, and HTML pages receive stylesheet links with relative paths. New pages inherit the font stylesheet. Import additional weights/styles separately and use fonts licensed for web embedding. Changes support Undo; no remote font service is required.

The compact ribbon uses smaller spacing/controls, a bounded scrollable panel and collapsed secondary style groups. The template gallery starts with Blank Site and usage categories, including Restaurants, Technology, Creative, Community and others, with search and an All templates view. Blank Site creates one empty HTML page plus basic project files.

Browser checks covered nested button text editing with live source preservation, padding drag and page-center alignment, template search, preferences toggles, font-file import and applying its family through the ribbon. Generated layer source and selection are covered by regression tests. Rotated/transformed layout edge cases and clean-machine installer acceptance still need broader testing.

## Clipboard, positioning and selection spacing - September 24

- Ctrl+C copies selected elements; Ctrl+V pastes a new group with a 24-pixel offset. Repeated keyboard pastes increase the offset. Native text editing retains normal text clipboard behavior. The element payload lives in Webbit memory; Copy also provides HTML to the system clipboard where supported. Keyboard paste checks that clipboard text still matches the copied elements instead of pasting stale elements after unrelated text was copied.
- Right-click Copy/Paste uses the Webbit element clipboard. Right-click empty page space to paste at that location. Copies receive new HTML IDs and internal label/ARIA/hash references, new selection identifiers, and separate Webbit state-effect settings. Page-relative src/href/poster/action and inline background URLs are adjusted between pages. Referenced asset files are not automatically copied across projects; destination CSS still determines class/ID-based styling, and scripts with hard-coded IDs require review.
- Center horizontally on page is directly in the right-click menu. It centers the selected group's visible bounding box to the page viewport width, preserving vertical positions and relative spacing. Ancestor transforms can affect CSS translation; check complex transformed containers.
- Position is an expandable submenu containing Bring to front, Bring forward, Send backward and Send to back. It supports keyboard navigation and obeys existing stacking contexts.
- Empty body/main canvas space and Escape clear selections, including the persisted selection state. A 6-pixel gap surrounds selection outlines and resize handles; actual element dimensions are unchanged.
- Split view starts with Visual on the left and Code on the right. Swap remains available.

Browser verification: selected two buttons, copied with Ctrl+C and pasted with Ctrl+V, centered both while retaining spacing, cleared selection on empty space and confirmed it stayed cleared after viewport changes, used Position > Bring to front, copied/pasted from the context menu, and undid the paste. Text editing and Visual-left split were checked. Six new clipboard regression tests cover ID/reference remapping, group geometry, nested selection deduplication, page-relative image URLs, independent hover effects and invalid shell destinations.


## September 29: saved groups and anchored resize

Shift-click multiple objects and use right-click **Group selected**. Click any member (including nested content) to select and move the whole group. **Ungroup selected** restores independent selection. Group metadata is saved in ordinary HTML, undoable, and copied groups receive independent identifiers. Double-click group text to edit it. Groups do not add wrapper elements; resize handles adjust individual member sizes rather than proportionally scaling a bounding group.

Left/top resize handles now change the actual preview element live and preserve the opposite edge, including centered auto-margin boxes. Escape restores the original style. Padding/border minimum size is respected. Repeated left-edge inward/outward drags and group/ungroup were browser-checked. Complex rotated/transformed ancestor layouts still need manual review.

Shift+arrow nudges selected objects and saved groups by 5 CSS pixels. Shift+Ctrl+arrow nudges by 1 pixel. Unmodified arrow keys do not move elements. These movements update real CSS, preserve the HTML hierarchy and support Undo. Text editing and menu keyboard navigation retain their normal arrow-key behavior.


## Alt selection box and Ctrl-click links (September 30, 2026)

Hold Alt and drag anywhere on the editable page to select objects touched by the rectangle, in any direction. Partial intersection and edge contact count; full enclosure is not required. Shift+Alt-drag adds to the current selection. Saved groups select together. Document shells and editor overlays are excluded; partially covered containers defer to touched child content, while fully enclosed containers select as one object. This prevents moving a parent and its children twice. Selection uses visible axis-aligned bounding boxes, including rotated elements; it does not test individual image pixels. Edge dragging scrolls the page. Escape, pointer cancellation or losing focus cancels the box and restores the previous selection. Selection alone never edits HTML. Works while placing a gallery item as well as in selection/move/resize/rotate tools; Reading is not editable.

Ctrl-click a link to open a relative/root-relative page in the project, including fragments and common extensionless/directory routes. Local PHP opens its source; Webbit does not execute it in the editable preview. Missing local pages produce a status message. Ctrl-drag still rotates; link navigation only occurs after a click without a drag. External HTTP/HTTPS destinations show a warning and URL, with Open in browser and Cancel. They are never loaded into the editable frame. Unsupported schemes and URLs with credentials are rejected by both link resolution and the native browser-opening command. Imported sites normally retain relative links; downloaded pages rewrite known destinations to local files.
