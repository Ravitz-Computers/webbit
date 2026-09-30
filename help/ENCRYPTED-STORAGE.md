# Encrypting all storage

Sensitive information only is the default. The authentication runtime encrypts TOTP secrets automatically and hashes passwords/recovery codes. It does not encrypt page files or the whole database.

Choose Access > Encryption > All files for password-encrypted `.wbe` project snapshots, backups and deployment packages. AES-256-GCM authenticates contents and filenames; PBKDF2-SHA256 uses 600,000 iterations and a fresh random 128-bit salt. Each package has a fresh random 96-bit nonce. Use a long unique passphrase. There is no password recovery and Webbit does not store the passphrase. The format/version and approximate encrypted size remain visible.

Save creates a new snapshot without overwriting an earlier backup. Open encrypted project unlocks it in editor memory. Existing plaintext folders are not erased or converted. Full-device encryption is still needed to cover swap, crash dumps and previous plaintext copies. Ordinary HTML/CSS/JS/PHP files are preserved inside the package and restored without a proprietary runtime requirement.

## Deployment storage: host provisioning required

An encrypted delivery package is NOT proof that a deployed site is encrypted at rest. Before restoring, provision encrypted hosting storage through your provider or server administrator. Cover the site volume, account databases, logs, temporary storage, swap and backups. Typical platforms provide managed encrypted volumes or OS disk encryption. Keep encryption key backups separate and protected. The web server must be able to decrypt files while running; disk encryption does not defeat a compromised running server or conceal public content from visitors. HTTPS remains necessary.

Webbit cannot enable or remotely verify these host settings. Full mode exports an encrypted delivery package rather than silently emitting a plaintext deployment folder. You must verify host storage separately. No on/off flag inside PHP can encrypt an entire operating-system volume.

Copy the package and `restore-encrypted.mjs` to that host. Node.js 22+ is needed only for this one-time restore tool, not to run the resulting PHP website. Run:

```
node restore-encrypted.mjs site.wbe /encrypted-volume/new-site --encrypted-storage-ready
```

Enter the passphrase at the hidden prompt. The flag is your acknowledgement that storage has been verified; it does not enable encryption. The destination must not exist. The tool authenticates and validates the package before writing, rejects unsafe paths and never overwrites an existing deployment. Errors during writing can leave a partial directory; do not serve it. Follow README-MANAGER.md / README-MEMBERS.md where present. Keep private/ outside the document root and restrict file access to the server account. Configure appropriate read/write permissions for that account.

To update a running site, preserve the existing private account databases, keys, sessions and uploaded files. Do not replace them with empty generated state. Make encrypted backups before deploying. Project packages may also be restored using this tool, but contain editor/private source and must never be used directly as a public document root.
