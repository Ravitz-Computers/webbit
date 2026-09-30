## WinGet submission

The package identifier is `RC.Webbit`. The manifest version is `0.1.0`, matching the installer's Add/Remove Programs entry; the release is labelled Beta 1.

Validate from the project root:

```cmd
winget validate --manifest winget/manifests/r/RC/Webbit/0.1.0
```

The manifest points to the public, versioned GitHub installer and its SHA-256 hash. NSIS uses `/S` for silent installation and `/P` for installation with progress. Installation is machine-wide and requires elevation. WebView2 is checked by the installer and downloaded only if absent.

Submission to microsoft/winget-pkgs is subject to its validation and review. This folder is not a WinGet source: `winget install --id RC.Webbit --exact` works only after the manifest has been merged and indexed. The portable ZIP is a separate release download.

For a new release, create a new version folder, update all three manifests, match the actual installed version, verify the anonymously downloadable installer hash, run validation and submit a new pull request. Do not replace the binary at an existing versioned URL.

Submission: https://github.com/microsoft/winget-pkgs/pull/444416 (pending Microsoft validation/review).
