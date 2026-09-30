<?php
declare(strict_types=1);
namespace Webbit\Manager;
require_once __DIR__ . '/Session.php';
require_once __DIR__ . '/ContentStore.php';
require_once __DIR__ . '/Mailer.php';
require_once __DIR__ . '/Uploads.php';

final class Controller
{
    private static function escape(string $value): string { return htmlspecialchars($value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8'); }
    private static function input(string $key): string { $value = $_POST[$key] ?? ''; return is_string($value) ? $value : ''; }
    private static function csrf(): string { return '<input type="hidden" name="csrf" value="' . self::escape($_SESSION['csrf']) . '">'; }

    public static function run(string $private, string $public): void
    {
        ini_set('display_errors', '0');
        try { self::dispatch($private, $public); }
        catch (\Throwable) { http_response_code(503); echo 'The manager is unavailable. Check the private configuration, HTTPS and server permissions.'; error_log('Webbit manager: request failed. Private configuration or recovery may be required.'); }
    }

    private static function dispatch(string $private, string $public): void
    {
        // Validate the server's real configuration before creating any private state.
        $documentRoot = realpath($_SERVER['DOCUMENT_ROOT'] ?? '');
        $expectedRoot = realpath($public);
        if ($documentRoot === false || $expectedRoot === false) { throw new \RuntimeException('Set the server document root to public/'); }
        if (PHP_OS_FAMILY === 'Windows') { $documentRoot = strtolower($documentRoot); $expectedRoot = strtolower($expectedRoot); }
        if ($documentRoot !== $expectedRoot) { throw new \RuntimeException('Set the server document root to public/'); }
        AuthStore::privateDirectory($private, $documentRoot);
        if ((int) ($_SERVER['CONTENT_LENGTH'] ?? 0) > 8 * 1024 * 1024) { http_response_code(413); echo 'Request is too large.'; return; }
        Session::start($private, $public);
        $auth = new AuthStore($private, $public); $content = new ContentStore($private, $public);
        $now = time(); $message = ''; $codes = null;
        $mailConfig = is_file($private . '/mail.php') ? require $private . '/mail.php' : [];
        $action = self::input('action');
        if (($_SERVER['REQUEST_METHOD'] ?? '') === 'POST') {
            try {
                Session::requireCsrf(self::input('csrf'));
                if (!$auth->initialized()) {
                    if ($action === 'authorize-setup') {
                        $file = $private . '/bootstrap.json';
                        $bootstrap = is_file($file) ? json_decode(file_get_contents($file), true, 8, JSON_THROW_ON_ERROR) : [];
                        $token = self::input('token');
                        if (strlen($token) !== 64 || ($bootstrap['expires'] ?? 0) < $now || !isset($bootstrap['hash']) || !hash_equals($bootstrap['hash'], hash('sha256', $token))) { throw new \RuntimeException('Invalid or expired setup token.'); }
                        $_SESSION['setup_until'] = $now + 600;
                        $_SESSION['enrollment'] = $auth->encryptEnrollment(Totp::secret());
                    } elseif ($action === 'initialize') {
                        if (($_SESSION['setup_until'] ?? 0) < $now || !isset($_SESSION['enrollment'])) { throw new \RuntimeException('Authorize setup again.'); }
                        $codes = $auth->initialize(self::input('username'), self::input('password'), $auth->decryptEnrollment($_SESSION['enrollment']), self::input('factor'), $now);
                        unset($_SESSION['setup_until'], $_SESSION['enrollment']);
                        if (is_file($private . '/bootstrap.json')) { unlink($private . '/bootstrap.json'); }
                        $message = 'Account created. Store these recovery codes safely; they will not be shown again. Sign in using your next authenticator code.';
                    }
                } elseif ($action === 'login') {
                    if (!$auth->authenticate(self::input('username'), self::input('password'), self::input('factor'), $_SERVER['REMOTE_ADDR'] ?? '', $now)) { throw new \RuntimeException('Sign-in failed. Check your credentials or wait 15 minutes after repeated failures.'); }
                    Session::login($now, $auth->epoch());
                    Mailer::send($mailConfig, 'Website manager sign-in', 'A successful manager sign-in occurred at ' . gmdate('c', $now) . '.');
                } elseif ($action === 'request-reset') {
                    if (($mailConfig['enabled'] ?? false) === true) {
                        $reset = $auth->requestPasswordReset(self::input('username'), $now);
                        if ($reset !== null) { Mailer::send($mailConfig, 'Website manager password reset', "Enter this one-time code in the manager's password-reset form within 15 minutes. Your authenticator code is also required.\n\n" . $reset . "\n\nIf you did not request this, ignore this message."); }
                    }
                    $message = 'If the account and optional email service are configured, a reset code will be sent. Requests are limited to one every five minutes.';
                } elseif ($action === 'reset-password') {
                    if (($mailConfig['enabled'] ?? false) !== true || !$auth->resetPassword(self::input('reset'), self::input('next_password'), self::input('factor'), $now)) { throw new \RuntimeException('Password reset failed. Check the email code, its expiry and your authenticator.'); }
                    Session::logout();
                    Mailer::send($mailConfig, 'Website manager password changed', 'Your website manager password was reset. Previous sessions have been revoked.');
                    $message = 'Password reset. Sign in with your new password and a fresh authenticator or recovery code.';
                } elseif (Session::authenticated($now, $auth->epoch())) {
                    if ($action === 'logout') { Session::logout(); header('Location: ./', true, 303); return; }
                    if ($action === 'publish') {
                        $values = $_POST['values'] ?? null;
                        if (!is_array($values) || !ctype_digit(self::input('revision'))) { throw new \RuntimeException('Invalid content request.'); }
                        $content->publish($values, (int) self::input('revision')); $message = 'Published. A backup was saved on the server.';
                    }
                    if ($action === 'change-password') {
                        $auth->changePassword(self::input('password'), self::input('factor'), self::input('next_password'), $_SERVER['REMOTE_ADDR'] ?? '', $now);
                        Session::login($now, $auth->epoch());
                        Mailer::send($mailConfig, 'Website manager password changed', 'Your website manager password changed. Other sessions have been revoked.');
                        $message = 'Password changed. Other sessions were signed out.';
                    }
                    if ($action === 'rotate-recovery') {
                        $codes = $auth->rotateRecovery(self::input('password'), self::input('factor'), $_SERVER['REMOTE_ADDR'] ?? '', $now);
                        Session::login($now, $auth->epoch()); $message = 'New recovery codes. Previous codes are revoked. Save these now; they will not be shown again.';
                    }
                    if ($action === 'upload') {
                        $path = Uploads::fromRequest($_FILES['image'] ?? [], $public);
                        $message = 'Image uploaded: ' . $path . ' — paste this path into the appropriate image field, then publish. Update the image description too.';
                    }
                    if ($action === 'begin-totp') {
                        $_SESSION['replacement_seed'] = $auth->encryptEnrollment(Totp::secret());
                        $_SESSION['replacement_until'] = $now + 600;
                    }
                    if ($action === 'replace-totp') {
                        if (!isset($_SESSION['replacement_seed']) || ($_SESSION['replacement_until'] ?? 0) < $now) { throw new \RuntimeException('Start authenticator replacement again.'); }
                        $codes = $auth->replaceAuthenticator(self::input('password'), self::input('factor'), $auth->decryptEnrollment($_SESSION['replacement_seed']), self::input('new_factor'), $_SERVER['REMOTE_ADDR'] ?? '', $now);
                        Session::login($now, $auth->epoch());
                        $message = 'Authenticator replaced. Old recovery codes and other sessions are revoked. Save the new codes below.';
                        Mailer::send($mailConfig, 'Website manager authenticator changed', 'Your authenticator and recovery codes were replaced. Other sessions have been revoked.');
                    }
                } else { throw new \RuntimeException('Sign in again before changing content.'); }
            } catch (\InvalidArgumentException | \RuntimeException $error) { if ($error instanceof \PDOException) { throw $error; } $message = $error->getMessage(); }
        }
        $signedIn = Session::authenticated($now, $auth->epoch());
        if (session_status() !== PHP_SESSION_ACTIVE) { Session::start($private, $public); }
        $schema = $content->schema();
        echo '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Website Manager</title><link rel="stylesheet" href="manager.css"></head><body><main><header><h1>' . self::escape($schema['name'] ?? 'Website Manager') . '</h1><p>Portable website management · Powered by Webbit</p></header>';
        if ($message !== '') { echo '<p class="message" role="status">' . self::escape($message) . '</p>'; }
        if ($codes !== null) { echo '<pre>' . self::escape(implode("\n", $codes)) . '</pre>'; }
        if (!$auth->initialized()) {
            if (($_SESSION['setup_until'] ?? 0) >= $now && isset($_SESSION['enrollment'])) {
                $secret = $auth->decryptEnrollment($_SESSION['enrollment']);
                echo '<h2>Set up your authenticator</h2><p>Scan locally or enter this secret in your authenticator. No external QR service is used.</p><div id="enrollment-qr" data-uri="' . self::escape(Totp::enrollmentUri($secret, 'owner', $schema['name'] ?? 'Webbit')) . '"></div><code>' . self::escape($secret) . '</code><form method="post">' . self::csrf() . '<input type="hidden" name="action" value="initialize"><label>Username<input name="username" minlength="3" maxlength="64" autocomplete="username" required></label><label>Password (12–72 bytes)<input type="password" name="password" minlength="12" maxlength="72" autocomplete="new-password" required></label><label>Authenticator code<input name="factor" inputmode="numeric" pattern="[0-9]{6}" autocomplete="one-time-code" required></label><button>Create account</button></form><script src="qrcode.js"></script><script src="setup.js"></script>';
            } else {
                echo '<h2>Authorize local setup</h2><p>Run php setup.php from the package root on your server, then enter its one-time token. Keep the private directory outside your website document root.</p><form method="post">' . self::csrf() . '<input type="hidden" name="action" value="authorize-setup"><label>Setup token<input type="password" name="token" autocomplete="off" required></label><button>Continue</button></form>';
            }
        } elseif ($signedIn) {
            $state = $content->read();
            echo '<form method="post">' . self::csrf() . '<input type="hidden" name="action" value="publish"><input type="hidden" name="revision" value="' . (int) $state['revision'] . '">';
            foreach ($schema['fields'] as $field) {
                echo '<label>' . self::escape($field['label']) . '<small>' . self::escape($field['page']) . '</small><textarea name="values[' . self::escape($field['id']) . ']" maxlength="10000">' . self::escape($state['values'][$field['id']]) . '</textarea></label>';
            }
            echo '<button>Publish changes</button></form><form method="post">' . self::csrf() . '<input type="hidden" name="action" value="logout"><button>Sign out</button></form>';
            echo '<details><summary>Add an image</summary><p>PNG, JPEG or WebP; at most 5 MB and 16 megapixels. Images are re-encoded and assigned a safe filename. PHP GD is required.</p><form method="post" enctype="multipart/form-data">' . self::csrf() . '<input type="hidden" name="action" value="upload"><label>Image<input type="file" name="image" accept="image/png,image/jpeg,image/webp" required></label><button>Upload image</button></form></details>';
            echo '<details><summary>Account security</summary><p>Use a fresh authenticator code or an unused recovery code to confirm account changes.</p><form method="post">' . self::csrf() . '<label>Current password<input type="password" name="password" autocomplete="current-password" required></label><label>Authenticator or recovery code<input name="factor" autocomplete="one-time-code" required></label><label>New password (for password change)<input type="password" name="next_password" minlength="12" maxlength="72" autocomplete="new-password"></label><button name="action" value="change-password">Change password</button><button name="action" value="rotate-recovery">Replace recovery codes</button></form></details>';
            echo '<form method="post">' . self::csrf() . '<button name="action" value="begin-totp">Replace authenticator</button></form>';
            if (isset($_SESSION['replacement_seed']) && ($_SESSION['replacement_until'] ?? 0) >= $now) {
                $replacement = $auth->decryptEnrollment($_SESSION['replacement_seed']);
                echo '<h2>New authenticator</h2><div id="enrollment-qr" data-uri="' . self::escape(Totp::enrollmentUri($replacement, 'replacement', $schema['name'] ?? 'Webbit')) . '"></div><code>' . self::escape($replacement) . '</code><form method="post">' . self::csrf() . '<input type="hidden" name="action" value="replace-totp"><label>Current password<input type="password" name="password" autocomplete="current-password" required></label><label>Current authenticator or recovery code<input name="factor" autocomplete="one-time-code" required></label><label>New authenticator code<input name="new_factor" inputmode="numeric" pattern="[0-9]{6}" required></label><button>Confirm replacement</button></form><script src="qrcode.js"></script><script src="setup.js"></script>';
            }
        } else {
            echo '<h2>Sign in</h2><form method="post">' . self::csrf() . '<input type="hidden" name="action" value="login"><label>Username<input name="username" maxlength="64" autocomplete="username" required></label><label>Password<input type="password" name="password" maxlength="72" autocomplete="current-password" required></label><label>Authenticator or recovery code<input name="factor" maxlength="64" autocomplete="one-time-code" required></label><button>Sign in</button></form><p>Requires your password and authenticator code, or your password and one unused recovery code.</p>';
            if (($mailConfig['enabled'] ?? false) === true) {
                echo '<details><summary>Forgot your password?</summary><form method="post">' . self::csrf() . '<input type="hidden" name="action" value="request-reset"><label>Username<input name="username" maxlength="64" required></label><button>Email a reset code</button></form><form method="post">' . self::csrf() . '<input type="hidden" name="action" value="reset-password"><label>Email reset code<input name="reset" maxlength="64" autocomplete="off" required></label><label>New password<input type="password" name="next_password" minlength="12" maxlength="72" autocomplete="new-password" required></label><label>Authenticator code<input name="factor" inputmode="numeric" pattern="[0-9]{6}" autocomplete="one-time-code" required></label><button>Reset password</button></form></details>';
            }
        }
        echo '</main></body></html>';
    }
}
