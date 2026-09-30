# Windows installer appearance

Tauri keeps its standard NSIS installation, upgrade, WebView2, Program Files and uninstall logic. appearance.nsh changes only Modern UI text/font/image presentation. tauri.conf.json explicitly assigns the regenerated ICO to installer and uninstaller.

Sidebar 164:400 and header 150:57 compositions are rendered at 3x resolution as opaque 24-bit BMPs. NSIS uses AspectFitHeight, preserving proportions at different display scales. The logo comes from icons/icon.png, rendered from assets/webbit-icon.svg and the original proprietary HARE SVG. No transparency key or missing alpha channel can remove its fills.

scripts/generate-installer-art.ps1 regenerates the panels and LICENSES.txt during every build. The notice page shows existing MIT and artwork terms plus pointers to the full third-party inventory. It uses Next with no agreement checkbox. Complete license texts remain installed and in the portable archive. Open Webbit and desktop-shortcut options are unchecked initially. No custom installation actions are added.

For artwork source changes, regenerate native icons with pnpm tauri icon assets/webbit-icon.svg before building. Inspect both artwork panels and compiled wizard at target DPI. Clean-machine installation acceptance remains a separate check.

Welcome text is limited to the installation action and Next. Technical and licensing details belong on their relevant pages and in Help.
