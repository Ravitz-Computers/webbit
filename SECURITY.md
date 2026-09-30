# Beta 1 security architecture

The editor uses an inert sandboxed preview. Guard flags possible credentials and source defects, offers limited safe fixes and blocks critical findings in the normal export UI. It is heuristic: a clean scan is not a security certification. The native export command does not independently rerun the source Guard. Deployment TLS, headers, DNS and Cloudflare configuration must be checked separately.

Build Admin exports the fixed versioned PHP runtime in manager-runtime/, never arbitrary AI authentication. Core controls include password hashing, required TOTP, hashed one-use recovery codes, encrypted seeds outside the web root, transactional replay prevention, login throttling, secure rotating sessions, expiry, CSRF, output encoding, image re-encoding and HTTPS response controls. Local setup requires an expiring CLI-issued token and confirmed TOTP enrollment.

The generated package's public/ directory is the only permitted document root. private/ contains keys, SQLite state, SMTP configuration, backups and templates and must stay outside it with restricted filesystem permissions. Secrets never belong in HTML, JavaScript or asset manifests. Back up keys with the private database. See manager-runtime/README.md and the generated deployment guide.

Generic SMTP with a Resend preset optionally enables notifications and expiring password-reset codes. Email reset also requires TOTP; email and Cloudflare Access cannot replace core authentication. Account changes revoke other sessions. No Webbit/Ravitz server is contacted for login.

Release builds run PHP unit and HTTP integration checks plus frontend/native tests. Real SMTP delivery, TLS/proxy deployment, independent security review, clean-machine tests and disaster recovery remain to be validated. Desktop saves have per-file backups rather than a whole-project transaction; manager publishes use a journal and fail closed after an interrupted publish. Do not remove a pending journal without restoring its recorded backup.
