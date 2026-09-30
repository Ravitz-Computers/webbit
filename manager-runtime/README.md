# Fixed Webbit Website Manager runtime v1 — Beta 1

Build Admin exports this standardized PHP runtime with a site-specific field schema. Authentication is not AI-generated. PHP 8.2+ 64-bit, sodium, pdo_sqlite and HTTPS are mandatory. GD supports image uploads; OpenSSL supports optional SMTP. The desktop itself does not need PHP on target PCs.

## Deployment

Set the document root to the generated public/ directory. Keep private/ and setup.php outside the web root. Run php setup.php locally to obtain an expiring setup token, then use the generated manager URL. Confirm enrollment with an authenticator code. Save the recovery codes when displayed; they cannot be retrieved later. Restrict private/ to mode 0700 on POSIX, or equivalent server-account/administrator ACLs on Windows. PHP needs write access to managed HTML pages, private/ and uploaded-image storage. Configure upload_max_filesize >= 5M and post_max_size >= 6M.

Back up the website and private/ together, including key.bin. Losing the encryption key loses access to encrypted authenticator seeds. An interrupted publish leaves publish-pending.json and its backup; restore that recorded backup before removing the journal and resuming. Structural site edits require regeneration from the current source. There is no automatic collection or schema migration.

## Controls

- Password hashes use Argon2id where available or bcrypt cost 12; passwords are 12–72 bytes.
- RFC 6238 SHA-1 TOTP, six digits, 30-second step, one-step clock drift and persisted replay prevention; enrollment requires confirmation.
- Ten random 128-bit recovery codes, displayed once, stored as keyed hashes. A recovery code always requires the password. SQLite transactions prevent concurrent reuse.
- Seeds use sodium secretbox encryption and a separate private random key. Account/IP throttling limits failed authentication to five attempts in 15 minutes.
- HTTPS-only strict host cookies, HttpOnly, SameSite Strict, session rotation, 15-minute idle and eight-hour absolute limits, POST CSRF validation and restrictive response headers. Forwarded headers do not automatically establish HTTPS.
- Password changes, authenticator replacement and recovery rotation require current credentials and revoke other sessions.
- Optional SMTP uses vendored PHPMailer, verified TLS and server-only credentials. Resend is a configuration preset. Email password reset expires, is single-use and still requires TOTP. SMTP failure does not prevent ordinary login.
- Selected fields are encoded into fixed source templates. Unchanged source spelling is retained; revision/hash conflicts reject stale forms and external edits. Publishing makes backups and a recovery journal.
- PNG/JPEG/WebP uploads are limited to 5 MB/16 megapixels, decoded and re-encoded with GD, and assigned random filenames. SVG and executable uploads are rejected.

## Verification and limits

Run tests/security.php (58 assertions), tests/content.php (10), tests/uploads.php (7), and ../scripts/test-manager-http.mjs (23 HTTP checks). Tests cover RFC vectors, replay and concurrent consumption, session/CSRF enforcement, account changes, TOTP-protected email reset primitives, escaping, conflicts and image re-encoding. HTTP tests use a localhost-only test router that simulates TLS; exported code has no such bypass.

Actual SMTP delivery, independent adversarial audit, deployed TLS/proxy configuration, clean-host deployment and backup recovery remain acceptance work. Account-wide throttling can temporarily lock out the owner during an attack. There is no persistent security audit log or automatic disaster-recovery CLI. These tests do not certify production security. Libraries retain their licenses under vendor/.
