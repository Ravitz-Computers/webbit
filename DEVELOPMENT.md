# Webbit Beta 1

Webbit is a free, local website editor by Ravitz Computers, built as a fun side project with help from AI. It uses Tauri, React and TypeScript. Core editing and generated-manager authentication require no cloud account, subscription or AI service. Read CODEX.md for the complete product specification and STATUS.md for verified scope and remaining work.

## Use and build on Windows x64

Run **build.bat** from the extracted source folder. The first run downloads and installs the build prerequisites: Microsoft Visual Studio C++ Build Tools and Windows SDK, a pinned portable Node.js, pnpm, Rust, and PHP for security tests. It also obtains Microsoft's signed WebView2 Fixed Version runtime for the portable package. Windows may request elevation for Microsoft Build Tools. If a reboot is required, restart Windows and run build.bat again.

Developer tools are cached under `%LOCALAPPDATA%\Webbit\BuildTools`; Visual Studio uses Microsoft's normal installation location. Downloads come from the official vendors. Pinned archive checksums and Microsoft signatures are checked where available. Internet access and several GB of disk space are needed for the first build. No cloud or AI service is required to use Webbit afterward.

The build uses real frozen pnpm/Cargo lockfiles, runs tests, regenerates dependency notices, then creates a timestamped `dist-release` folder containing:

- Webbit-Beta-1-Setup.exe — NSIS installer that checks for WebView2 and downloads it only when missing (internet then required).
- Webbit-Beta-1-Portable.zip — executable and Fixed Version WebView2 runtime, help, licenses and build manifest.
- SHA256SUMS.json — package checksums.

Extract the entire portable ZIP before launching Webbit.exe. Keep its runtime folder beside the executable. Neither package includes Node, Rust, PHP, the compiler or other developer tools. The included browser runtime makes the portable ZIP larger. WEBBIT_WEBVIEW2_DIR can override automatic discovery with a complete extracted Microsoft x64 Fixed Version runtime. WEBBIT_NO_PAUSE=1 disables the batch file's failure pause for automation.

## Editing and projects

Open an ordinary website folder or start from a template. Edit plain text in the rendered preview or HTML/CSS/JS/PHP and other supported files in the source editor. Select elements to change attributes, inline CSS, order or remove them. Split panes can be resized and swapped; undo/redo tracks edits. Save detects external changes and keeps per-file backups. Native file dialogs require the desktop application.

The preview intentionally blocks scripts, embedded frames, network requests and PHP execution. Test executable site behavior on an appropriate server. Guard provides actionable source findings and limited safe fixes; deployment checks are separate guidance rather than a live-host certification.

## Build Admin

Choose the fields that should be editable and export the website plus its fixed PHP manager. Follow the generated README-MANAGER.md. The host needs PHP 8.2+ (64-bit), sodium, pdo_sqlite and HTTPS; GD enables safe image uploads, and OpenSSL supports optional SMTP. Only public/ may be the document root. Keep private/ outside it.

Local CLI setup issues an expiring token. Setup uses a local QR code, password and confirmed TOTP, then displays hashed-at-rest recovery codes once. The manager supports selected text, image references/alt text and search descriptions, backups, conflict detection, image uploads, password changes, authenticator replacement and recovery-code rotation. Generic SMTP/Resend is optional for security messages and password reset; reset still requires TOTP. No external login service is required. Repeating collections and schema migration are not implemented.

## Development and licensing

After bootstrap, use pnpm install --frozen-lockfile, pnpm test, pnpm build and pnpm tauri dev. scripts/bootstrap.ps1 prepares a PowerShell session; scripts/build-release.ps1 performs release packaging. pnpm dev serves the browser-only UI at localhost:1420.

Webbit source is MIT. Vinny and Ravitz artwork remain proprietary and are excluded from that license. See PROPRIETARY-ASSETS.md, THIRD-PARTY-NOTICES.md and licenses/. Website assets need their own permissions. See SECURITY.md for controls and limitations. Support: support@ravitzcomputers.com.

## Import files or whole sites

Import accepts multiple files, folders and ZIP archives. Review relative paths and conflicts, then merge into the current project or import a whole site as a new unsaved copy. Folder imports preserve their internal layout; ZIP imports can strip a single enclosing folder. Source folders/archives are unchanged. Existing conflicts default to skip; explicit replacement is undoable before saving and preserves the existing filename casing. Open folder instead edits an existing site in place.

Supported editable UTF-8 source includes HTML/PHP, JavaScript/modules, CSS/preprocessors, JSON/configuration, CSV, SVG and common framework files. Images (including JPEG), fonts, PDFs, media and other binary files are preserved byte-for-byte. Unsupported text encodings are preserved as binary rather than converted silently. Limits are 50 MB per file, 200 MB per project and 5,000 files. Symlinks, .env files, dependency folders and editor metadata are skipped with a report. ZIP traversal, duplicate paths and file/folder conflicts are rejected. Public exports exclude private/ storage, database dumps and common key files.

Select an imported file and choose Insert file into page to create the appropriate image, script, stylesheet, font definition, video/audio control or download link. Scripts are stored and exported but never run in the editing preview. Native file dialogs require the desktop app.

## Background behavior

Window settings provide Minimize to taskbar and an optional Keep running when closed preference. The open project remains in memory; unsaved content is not automatically saved. Exit Webbit quits and prompts for unsaved changes. A single-instance plugin makes a second launch restore the running window, including when minimized. No automatic Windows startup is enabled.

Use scripts/package-source.ps1 to create a dated source ZIP and checksum, excluding developer dependencies, build output, fixed runtime staging and environment files.

### Ribbon, blocks, effects and browser preview

The ribbon is optional (Show/Hide ribbon, View menu, or Ctrl+F1), with a remembered local preference. Block mode adds an outline, text-field inspector and content/layout/interactive templates. Tools > Special Effects applies local effects to all current HTML pages, a page or a compatible block. Tools > Import table data previews CSV/TSV/JSON and publishes only chosen columns, or saves a private snapshot. SQLite/SQL browsing and live database connections are not yet implemented.

Preview in Browser opens an unsaved static snapshot in your default browser on a loopback-only server. JavaScript runs normally; PHP does not execute, and private/server files are excluded. Reopen it after edits; File > Stop browser preview stops the server. See offline Help for details and limits.

### Windows installation location

The NSIS installer uses per-machine installation, defaulting to `C:\Program Files\Webbit` on 64-bit Windows. Windows requests administrator approval during installation. Webbit itself runs with ordinary user permissions; projects belong in user-selected writable folders, and preferences remain in the user profile. The portable ZIP still runs from its extracted folder. If upgrading from an older per-user installation, uninstall that older copy first to avoid duplicate installations; keep website projects outside the application folder.

## September 22 update: canvas, galleries and access

The welcome screen starts with New, Open and Download URL. Sixteen original starter templates cover businesses, restaurants, products, portfolios, events and other layouts. The file list defaults to All, with type filters and independent sorting. Views are Desktop, Tablet, Phone and Reading. The optional ribbon includes formatting and separate Admin Access / Member Access controls. The Element Gallery includes 19 components; choose one and draw its rectangle. Canvas tools move and resize elements, including movement between blocks. Check responsive layouts after free placement: it currently uses pixel offsets.

Special Effects has 22 entries grouped by purpose, with site/page/block scope. A site effect applies to existing HTML pages; new pages do not yet inherit it. Existing modified enhancement-runtime files are preserved and may require manual migration when upgrading effects.

Live Google Reviews is optional: it generates a fixed PHP connector and setup instructions. Configure Google Places API (New), billing, a restricted server key and Place ID on the host. Credentials never belong in browser code. A live provider request has not been tested with a customer key. Google decides the returned selection of reviews. Reference: https://developers.google.com/maps/documentation/places/web-service/policies

Member Access generates a separate invitation-only login, accounts and cookie storage. Select protected HTML pages from Ribbon > Access > Member Access. Export moves their content into private storage and leaves redirects to authenticated PHP routes; Build Admin cannot publish these pages. Set the HTTPS host document root to public/, then run `php members-setup.php USERNAME` to create a one-use invitation. All members can view all selected pages. Run `php members-setup.php USERNAME disable` to revoke access. No member groups, member management UI or self-service member password reset yet. Shared assets remain public.

Both authentication systems encrypt TOTP secrets automatically using libsodium authenticated encryption, random 256-bit keys and fresh nonces. Passwords use Argon2id with a bcrypt fallback; recovery codes are keyed hashes. Keys and databases stay outside public/. Keep them together in an encrypted backup: neither key loss nor whole-server compromise is solved by encrypting the database secret. This does not encrypt ordinary page files or assets. Cryptographic primitive reference: https://www.php.net/manual/en/function.sodium-crypto-secretbox.php

The source tests cover tampered ciphertext, nonce freshness, recovery codes, invitation enrollment, protected-page access and session separation. They are regression checks, not an independent security audit. Native installer acceptance on a clean Windows machine and live deployment validation remain required.

## September 23: optional full storage protection

Access > Encryption keeps **Sensitive information only** as the default. Choose **All files** for password-encrypted project snapshots/backups and deployment packages. The `.wbe` format uses AES-256-GCM with PBKDF2-SHA256 (600,000 iterations), random salt and nonce. Save creates a new versioned file; File > Open encrypted project unlocks it in memory. Normal Save/Save As and Save-and-close use encrypted snapshots in this mode. Existing plaintext copies are not deleted or converted. Lost passphrases cannot be recovered.

For deployed storage, full mode exports encrypted delivery packages and includes a Node-based restore tool under help/. A hosting provider or server owner must provision encrypted disks/volumes covering the deployed site, databases, logs, temporary storage and backups before restoring. **Webbit does not enable or verify remote disk encryption.** The restore acknowledgement flag is an operator declaration, not an encryption detector. Read help/ENCRYPTED-STORAGE.md. This requirement covers server storage without inventing a custom PHP filesystem or requiring paid cloud services. Node is needed for the one-time restore only; it is not a website runtime dependency.

Full-device encryption is necessary to cover OS swap/crash dumps and previous plaintext work. Served public pages remain visible to visitors. Package authentication, wrong-passphrase rejection, tampering, unique salts/nonces, path validation and independent restore round-trips have automated coverage.

## Contextual ribbon and proof project

Selecting an element opens its contextual tab. Drag tabs out into floating panels and back onto the ribbon to dock. Images, tables and restaurant/navigation menus have specialized controls; shared controls cover appearance, backgrounds, behavior, effects, layers, attributes and HTML. Read [the ribbon guide](help/CONTEXTUAL-RIBBON.md) for supported operations and boundaries. The latest verification runs 190 checks across frontend, native, and PHP/HTTP suites. Native packages compile; clean-machine installation acceptance remains outstanding.

### September 24 canvas update
Canvas selection now supports drag movement across containers, eight resize handles, Ctrl+drag rotation (also available as a toolbar mode), Shift-click group selection, group movement, Delete and undo. Double-click plain text to edit it. Changes are saved as real HTML/CSS. See help/CONTEXTUAL-RIBBON.md for supported boundaries and browser verification. All 195 checks passed; production frontend, NSIS installer and portable builds completed. Clean-machine installation acceptance remains outstanding.


## Usability and smaller installer update
Blank Site is genuinely empty and is directly accessible beside searchable usage categories. Direct text clicking, snapping, rulers, tabbed preferences, local font import, compact ribbon controls and right-click layer commands are implemented. See help/CONTEXTUAL-RIBBON.md. The NSIS installer checks for WebView2 and downloads its bootstrapper only when missing. The portable ZIP remains self-contained. Internet is needed on a target PC only when the shared runtime must be installed. Clean-machine installation testing remains outstanding.

## Selection and clipboard update
Select elements or Shift-select a group, then use Ctrl+C / Ctrl+V or right-click Copy elements / Paste elements. The right-click menu now includes Center horizontally on page and a Position submenu for layer order. Empty canvas clicks clear selection, selection frames have 6px of extra room, and split view starts with Visual on the left. See help/CONTEXTUAL-RIBBON.md for details and clipboard limits. All 208 automated checks passed for this update.


### September 29 editor update

Right-click Group/Ungroup saves logical groups. Left/top resizing anchors the opposite edge. Shift+arrow moves selections 5px; Shift+Ctrl+arrow moves 1px; plain arrows do not move elements. Preferences > Appearance offers Light, Dark or Follow system, plus 75–150% UI scaling. All website views have bottom-right 25–300% Magnify (fixed layout) and Browser zoom (simulated reflow). SVG paints and proportions are preserved, and native icons are regenerated from the original detailed HARE vector. The canonical generated website-agent guide is help/PROJECT-AI.md; Webbit development guidance is WEBBIT_AI.md and CODEX.md.
