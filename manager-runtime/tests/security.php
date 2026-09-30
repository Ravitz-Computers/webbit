<?php
declare(strict_types=1);
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
require_once __DIR__ . '/../src/Session.php';
use Webbit\Manager\{AuthStore, Session, Totp};

$checks = 0;
function check(bool $condition, string $message): void {
    global $checks; $checks++;
    if (!$condition) { throw new RuntimeException($message); }
}
function rejects(callable $action, string $message): void {
    try { $action(); } catch (Throwable) { check(true, $message); return; }
    check(false, $message);
}
$testRoot = sys_get_temp_dir() . DIRECTORY_SEPARATOR . 'webbit-security-' . bin2hex(random_bytes(8));
mkdir($testRoot, 0700); mkdir($testRoot . '/public', 0700); mkdir($testRoot . '/private', 0700);
try {
    // Numeric interoperability vectors from RFC 6238 Appendix B (SHA-1).
    $secret = Totp::base32('12345678901234567890');
    foreach ([59 => '94287082', 1111111109 => '07081804', 1111111111 => '14050471', 1234567890 => '89005924', 2000000000 => '69279037', 20000000000 => '65353130'] as $time => $expected) {
        check(Totp::code($secret, intdiv($time, 30), 8) === $expected, 'RFC 6238 vector mismatch');
    }
    check(strlen(Totp::secret()) === 32, 'Generated seed length');
    $now = 1800000000;
    check(Totp::matchStep($secret, Totp::code($secret, intdiv($now, 30) - 1), $now, -1) === intdiv($now, 30) - 1, 'Clock drift window');
    check(Totp::matchStep($secret, Totp::code($secret, intdiv($now, 30) - 2), $now, -1) === null, 'Expired code');
    check(Totp::matchStep($secret, '00000x', $now, -1) === null, 'Malformed code');
    rejects(fn() => new AuthStore($testRoot . '/public', $testRoot . '/public'), 'Storage must be outside web root');
    $store = new AuthStore($testRoot . '/private', $testRoot . '/public');
    $password = 'Testing a long passphrase!';
    rejects(fn() => $store->initialize('owner', $password, $secret, 'bad', $now), 'Require TOTP confirmation');
    rejects(fn() => $store->initialize('owner', 'short', $secret, Totp::code($secret, intdiv($now, 30)), $now), 'Reject weak password');
    $codes = $store->initialize('owner', $password, $secret, Totp::code($secret, intdiv($now, 30)), $now);
    check(count(array_unique($codes)) === 10, 'Unique recovery codes');
    rejects(fn() => $store->initialize('owner', $password, $secret, Totp::code($secret, intdiv($now, 30)), $now), 'Setup cannot overwrite account');
    $disk = file_get_contents($testRoot . '/private/auth.sqlite');
    check(!str_contains($disk, $password) && !str_contains($disk, $secret) && !str_contains($disk, $codes[0]), 'No raw credentials in database');
    check(!$store->authenticate('owner', $password, Totp::code($secret, intdiv($now, 30)), '127.0.0.1', $now), 'Enrollment code cannot replay');
    $now += 30;
    check($store->authenticate('owner', $password, Totp::code($secret, intdiv($now, 30)), '127.0.0.1', $now), 'Password plus TOTP login');
    // Separate connection models another request and verifies persisted replay protection.
    $other = new AuthStore($testRoot . '/private', $testRoot . '/public');
    check(!$other->authenticate('owner', $password, Totp::code($secret, intdiv($now, 30)), '127.0.0.2', $now), 'Cross-connection TOTP replay rejected');
    check(!$store->authenticate('owner', 'wrong password', $codes[0], '127.0.0.1', $now), 'Recovery also requires password');
    check($store->authenticate('owner', $password, $codes[0], '127.0.0.1', $now), 'Recovery login');
    check(!$other->authenticate('owner', $password, $codes[0], '127.0.0.2', $now), 'Recovery is single use');
    for ($i = 0; $i < 4; $i++) { check(!$store->authenticate('owner', 'wrong password', $codes[1], '127.0.0.1', $now), 'Invalid password denied'); }
    check(!$store->authenticate('owner', $password, $codes[1], '127.0.0.3', $now), 'Account throttle applies across IP addresses');
    check($store->authenticate('owner', $password, $codes[1], '127.0.0.3', $now + 900), 'Throttle expires without consuming unused code');
    unset($store, $other);
    $workers = [];
    for ($i = 0; $i < 2; $i++) {
        $command = [PHP_BINARY, '-n', '-d', 'extension_dir=' . ini_get('extension_dir'), '-d', 'extension=sodium', '-d', 'extension=pdo_sqlite', __DIR__ . '/login-worker.php'];
        $process = proc_open($command, [0 => ['pipe', 'r'], 1 => ['pipe', 'w'], 2 => ['pipe', 'w']], $pipes);
        if (!is_resource($process)) { throw new RuntimeException('Could not start concurrency test'); }
        fwrite($pipes[0], json_encode(['private' => $testRoot . '/private', 'public' => $testRoot . '/public', 'factor' => $codes[2], 'now' => $now + 901], JSON_THROW_ON_ERROR));
        fclose($pipes[0]); $workers[] = [$process, $pipes];
    }
    $results = [];
    foreach ($workers as [$process, $pipes]) {
        $results[] = stream_get_contents($pipes[1]); $error = stream_get_contents($pipes[2]);
        fclose($pipes[1]); fclose($pipes[2]);
        check(proc_close($process) === 0 && $error === '', 'Concurrent worker completed');
    }
    sort($results); check($results === ['no', 'yes'], 'Exactly one simultaneous recovery attempt succeeds');
    $store = new AuthStore($testRoot . '/private', $testRoot . '/public');
    $store->changePassword($password, $codes[3], 'Changed long passphrase!', '127.0.0.1', $now + 1800);
    check($store->epoch() === 1, 'Password change invalidates previous sessions');
    check(!$store->authenticate('owner', $password, $codes[4], '127.0.0.1', $now + 1800), 'Old password stops working');
    $password = 'Changed long passphrase!';
    check($store->authenticate('owner', $password, $codes[4], '127.0.0.1', $now + 1800), 'New password works');
    $replacement = $store->rotateRecovery($password, $codes[5], '127.0.0.1', $now + 1800);
    check(count($replacement) === 10 && $store->epoch() === 2, 'Recovery rotation invalidates sessions');
    check(!$store->authenticate('owner', $password, $codes[6], '127.0.0.1', $now + 1800), 'Old recovery batch revoked');
    check($store->authenticate('owner', $password, $replacement[0], '127.0.0.1', $now + 1800), 'New recovery batch works');
    check($store->requestPasswordReset('unknown', $now + 1800) === null, 'Unknown user cannot request reset');
    $reset = $store->requestPasswordReset('owner', $now + 1800);
    check(is_string($reset) && strlen($reset) === 64, 'Email reset token created');
    check($store->requestPasswordReset('owner', $now + 1801) === null, 'Email reset requests throttled');
    check(!str_contains(file_get_contents($testRoot . '/private/auth.sqlite'), $reset), 'Reset token is hashed at rest');
    check(!$store->resetPassword($reset, 'Reset long passphrase!', 'wrong', $now + 1801), 'Email reset does not bypass TOTP');
    check($store->resetPassword($reset, 'Reset long passphrase!', Totp::code($secret, intdiv($now + 1801, 30)), $now + 1801), 'Email token plus TOTP resets password');
    check(!$store->resetPassword($reset, 'Another long passphrase!', Totp::code($secret, intdiv($now + 1831, 30)), $now + 1831), 'Email token cannot replay');
    $password = 'Reset long passphrase!';
    $newSecret = Totp::secret();
    $newCodes = $store->replaceAuthenticator($password, $replacement[1], $newSecret, Totp::code($newSecret, intdiv($now + 3000, 30)), '127.0.0.1', $now + 3000);
    check(count($newCodes) === 10 && $store->epoch() === 4, 'Authenticator replacement rotates recovery and sessions');
    check(!$store->authenticate('owner', $password, $replacement[2], '127.0.0.1', $now + 3030), 'Earlier recovery codes revoked on authenticator replacement');
    check($store->authenticate('owner', $password, Totp::code($newSecret, intdiv($now + 3030, 30)), '127.0.0.1', $now + 3030), 'New authenticator works');
    $sealedA = $store->encryptEnrollment('encryption-test-secret');
    $sealedB = $store->encryptEnrollment('encryption-test-secret');
    check($sealedA !== $sealedB, 'Encryption uses a fresh random nonce');
    check($store->decryptEnrollment($sealedA) === 'encryption-test-secret', 'Authenticated encryption round trip');
    $tampered = base64_decode($sealedA); $tampered[strlen($tampered)-1] = chr(ord($tampered[strlen($tampered)-1]) ^ 1);
    rejects(fn() => $store->decryptEnrollment(base64_encode($tampered)), 'Altered ciphertext is rejected');
    rejects(fn() => $store->decryptEnrollment('not-base64!'), 'Malformed encrypted data is rejected');
    unset($store);
    // Changing the key cannot convert encrypted state into an accepted credential.
    file_put_contents($testRoot . '/private/key.bin', random_bytes(32));
    $store = new AuthStore($testRoot . '/private', $testRoot . '/public');
    rejects(fn() => $store->authenticate('owner', $password, '123456', '127.0.0.1', $now + 901), 'Tampered encryption key fails closed');
    unset($store);
    $_SERVER['HTTP_X_FORWARDED_PROTO'] = 'https';
    rejects(fn() => Session::start($testRoot . '/private', $testRoot . '/public'), 'Forwarded TLS header alone cannot bypass HTTPS');
    $_SERVER['HTTPS'] = 'on'; $_SERVER['REQUEST_METHOD'] = 'POST';
    Session::start($testRoot . '/private', $testRoot . '/public');
    $params = session_get_cookie_params();
    check($params['secure'] && $params['httponly'] && $params['samesite'] === 'Strict' && $params['path'] === '/', 'Secure cookie settings');
    $oldId = session_id(); $oldToken = $_SESSION['csrf'];
    check(!Session::authenticated($now), 'Anonymous session denied');
    Session::login($now);
    check(session_id() !== $oldId && $_SESSION['csrf'] !== $oldToken, 'Rotate session ID and CSRF after login');
    check(Session::authenticated($now + 1), 'Authenticated session accepted');
    rejects(fn() => Session::requireCsrf($oldToken), 'Old CSRF token rejected');
    Session::requireCsrf($_SESSION['csrf']); check(true, 'Current CSRF token accepted');
    $_SERVER['REQUEST_METHOD'] = 'GET';
    rejects(fn() => Session::requireCsrf($_SESSION['csrf']), 'Mutations require POST');
    check(!Session::authenticated($now + 901), 'Idle session expiry');
    Session::start($testRoot . '/private', $testRoot . '/public'); Session::login($now);
    $_SESSION['seen'] = $now + 28799;
    check(!Session::authenticated($now + 28800), 'Absolute session expiry despite activity');
    echo "Passed $checks security checks on PHP " . PHP_VERSION . "\n";
} finally {
    if (session_status() === PHP_SESSION_ACTIVE) { session_write_close(); }
    unset($store, $other);
    // Only remove the explicit files/directories created by this run.
    foreach (glob($testRoot . '/private/sessions/sess_*') ?: [] as $file) { unlink($file); }
    if (is_dir($testRoot . '/private/sessions')) { rmdir($testRoot . '/private/sessions'); }
    foreach (['auth.sqlite', 'auth.sqlite-journal', 'auth.sqlite-wal', 'auth.sqlite-shm', 'key.bin'] as $file) {
        if (is_file($testRoot . '/private/' . $file)) { unlink($testRoot . '/private/' . $file); }
    }
    rmdir($testRoot . '/private'); rmdir($testRoot . '/public'); rmdir($testRoot);
}

