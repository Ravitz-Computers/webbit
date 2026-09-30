# Webbit

**A free website editor for Windows.** Build pages visually, work with their source, and keep your website in ordinary files. Built by [Ravitz Computers](https://ravitzcomputers.com).

Webbit started as a fun side project with help from AI. Core editing is free: no subscription, account or required cloud or AI service. Optional services such as live Google Reviews may have their own costs.

> **Beta 1.** The editor and Windows packages build and pass automated checks. [STATUS.md](STATUS.md) records what has been checked and what remains unfinished. Clean-PC installation and independent review of the generated manager still need testing.

---

## Install

Download **Webbit-Beta-1-Setup.exe** from the [releases page](https://github.com/Ravitz-Computers/webbit/releases) and run it.

The installer uses `C:\Program Files\Webbit` and requests administrator approval once. It checks for Microsoft WebView2 and downloads the runtime only if it is missing.

Prefer a portable copy? Extract **Webbit-Beta-1-Portable.zip** and run `Webbit.exe`. Keep its bundled WebView2 folder beside it. That runtime accounts for most of the portable download size.

**Requirements:** Windows 10 or 11, 64-bit. Internet access is needed during installation if WebView2 is missing.

---

## What it does

**Visual editing with real source.** Split the view between the page and its HTML, CSS or JavaScript. Edit text, move and resize elements, layer or group them, and use the optional contextual ribbon. Changes write to the project files.

**Select several things at once.** Shift-click elements or hold Alt and drag a selection box. Anything the box touches is selected; Shift+Alt adds to the selection. Ctrl-drag rotates. Ctrl-click follows a project page, or asks before opening an external website in your browser.

**Start blank or bring your site.** Choose a starter by category, open a folder, import files or a ZIP, or download public pages from a URL. Images, fonts and other binary assets are preserved. Website download does not recover a server's private code or database.

**Blocks, elements and effects.** Add sections and gallery elements, adjust their appearance, and apply compatible effects to a site, page, block or element. Check free-positioned designs at different viewport sizes: placement can use pixel offsets.

**See different screens.** Desktop, tablet, phone and reading views, with magnification or browser-style reflow. Preview in Browser runs a static snapshot with JavaScript; it does not execute PHP.

**A manager for your site.** Build Admin exports a tailored PHP manager using Webbit's fixed security runtime: password, required TOTP and hashed recovery codes. Generic SMTP, including a Resend preset, is optional. Member login is a separate feature. Deployment needs a PHP host and the documented private/public folder arrangement.

**Checks with explanations.** Security & Compatibility Guard flags source problems, offers limited safe fixes and separates source findings from deployment advice. A clean scan is not a security certification.

---

## How it works

Webbit uses Tauri, React and TypeScript. Projects remain ordinary HTML, CSS, JavaScript, PHP and asset files. The editing preview keeps imported scripts inert; the browser preview and exported website can run them.

Core editing and generated-manager authentication work without Webbit servers, Cloudflare, Resend or an AI provider. AI agents can work with the documented project and asset model in [WEBBIT_AI.md](WEBBIT_AI.md).

Database table import currently handles CSV, TSV and JSON. Live database connections and SQLite/SQL browsing are not implemented. WordPress files can be edited as source; automatic theme generation remains planned. See [DEVELOPMENT.md](DEVELOPMENT.md) and [STATUS.md](STATUS.md) for details.

---

## Building the installer

On Windows, double-click **build.bat**, or run it from Command Prompt. It installs or caches the required build prerequisites, verifies pinned downloads where available, installs locked dependencies, runs the checks, and creates the installer and portable ZIP under `dist-release/`.

The first build needs internet access and several GB of disk space. Microsoft Build Tools may request elevation or a reboot. Build tools are not included in the installed application.

For frontend development with Node and pnpm installed:

```cmd
pnpm install --frozen-lockfile
pnpm dev
pnpm test
pnpm build
```

The full Windows build also runs PHP security and HTTP checks, Rust tests, dependency licence checks and native packaging. [CONTRIBUTING.md](CONTRIBUTING.md) explains how to contribute.

---

## Project layout

```text
build.bat             Windows build entry point
scripts/              Prerequisite setup, packaging and verification
src/                  React editor, canvas, ribbon, galleries and Guard
src-tauri/            Native window, filesystem, import and browser commands
manager-runtime/      Fixed PHP authentication and content manager
public/hare/          Vinny artwork used in the application
assets/               Asset provenance and application icon source
help/                 Offline help and project instructions
licenses/             Third-party licence texts
STATUS.md             Verified scope, limitations and remaining work
WEBBIT_AI.md          Instructions for agents working on Webbit
CODEX.md              Product requirements
```

---

## Reporting a problem

Open an [issue](https://github.com/Ravitz-Computers/webbit/issues) with the steps, expected result, actual result and Webbit build. A small example site helps; remove private data and credentials before sharing it.

Security reports go to **support@ravitzcomputers.com**. See [SECURITY.md](SECURITY.md).

---

## Licence

Webbit's own source is **MIT** — see [LICENSE](LICENSE). It is intended to be a free tool.

Third-party licence texts are included with the application and shown in About. See [THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md).

Vinny the Bunny, Ravitz Computers logos and the medallion belong to Ravitz Computers and are **not** covered by the MIT licence. Those assets are not automatically licensed for use in exported websites. See [PROPRIETARY-ASSETS.md](PROPRIETARY-ASSETS.md).
