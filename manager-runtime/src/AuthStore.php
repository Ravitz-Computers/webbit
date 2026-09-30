<?php
declare(strict_types=1);
namespace Webbit\Manager;
require_once __DIR__ . '/Totp.php';

/** Fixed authentication service; only Controller exposes its protected HTTP workflow. */
final class AuthStore
{
    private \PDO $db;
    private string $key;

    public static function privateDirectory(string $directory, string $documentRoot): string
    {
        $private = realpath($directory); $public = realpath($documentRoot);
        if ($private === false || $public === false || !is_dir($private) || !is_dir($public)) {
            throw new \RuntimeException('Existing private and public directories are required');
        }
        $normalize = static fn(string $p): string => rtrim(str_replace('\\', '/', $p), '/') . '/';
        $a = $normalize($private); $b = $normalize($public);
        if (PHP_OS_FAMILY === 'Windows') { $a = strtolower($a); $b = strtolower($b); }
        if (str_starts_with($a, $b)) { throw new \RuntimeException('Authentication storage must be outside the document root'); }
        if (PHP_OS_FAMILY !== 'Windows' && (fileperms($private) & 0077) !== 0) {
            throw new \RuntimeException('Private directory must have mode 0700');
        }
        return $private;
    }

    public function __construct(string $directory, string $documentRoot)
    {
        if (PHP_VERSION_ID < 80200 || PHP_INT_SIZE < 8 || !extension_loaded('sodium') || !extension_loaded('pdo_sqlite')) {
            throw new \RuntimeException('PHP 8.2+ (64-bit), sodium and pdo_sqlite are required');
        }
        $directory = self::privateDirectory($directory, $documentRoot);
        foreach (['auth.sqlite', 'auth.sqlite-journal', 'auth.sqlite-wal', 'auth.sqlite-shm', 'key.bin'] as $file) {
            if (is_link($directory . DIRECTORY_SEPARATOR . $file)) { throw new \RuntimeException('Authentication files cannot be symbolic links'); }
        }
        $keyFile = $directory . DIRECTORY_SEPARATOR . 'key.bin';
        if (!file_exists($keyFile)) {
            // An existing database must never silently receive a replacement encryption key.
            if (file_exists($directory . DIRECTORY_SEPARATOR . 'auth.sqlite')) { throw new \RuntimeException('Authentication key is missing'); }
            $handle = @fopen($keyFile, 'x+b');
            if ($handle === false) { throw new \RuntimeException('Cannot create authentication key'); }
            try {
                chmod($keyFile, 0600);
                if (fwrite($handle, random_bytes(SODIUM_CRYPTO_SECRETBOX_KEYBYTES)) !== SODIUM_CRYPTO_SECRETBOX_KEYBYTES || !fflush($handle)) {
                    throw new \RuntimeException('Cannot write authentication key');
                }
            } finally { fclose($handle); }
        }
        $this->key = file_get_contents($keyFile);
        if (strlen($this->key) !== SODIUM_CRYPTO_SECRETBOX_KEYBYTES) { throw new \RuntimeException('Invalid authentication key'); }
        $database = $directory . DIRECTORY_SEPARATOR . 'auth.sqlite';
        $this->db = new \PDO('sqlite:' . $database, null, null, [\PDO::ATTR_ERRMODE => \PDO::ERRMODE_EXCEPTION]);
        chmod($database, 0600);
        $this->db->exec('PRAGMA busy_timeout=5000');
        $this->db->exec('CREATE TABLE IF NOT EXISTS account (id INTEGER PRIMARY KEY CHECK(id=1), username TEXT NOT NULL, password TEXT NOT NULL, secret TEXT NOT NULL, last_step INTEGER NOT NULL, recovery TEXT NOT NULL)');
        $this->db->exec('CREATE TABLE IF NOT EXISTS throttle (bucket TEXT PRIMARY KEY, failures INTEGER NOT NULL, until_at INTEGER NOT NULL)');
        $this->db->exec('CREATE TABLE IF NOT EXISTS password_reset (id INTEGER PRIMARY KEY CHECK(id=1), token TEXT NOT NULL, expires INTEGER NOT NULL, attempts INTEGER NOT NULL, requested INTEGER NOT NULL)');
        $this->transaction(function (): void {
            $columns = $this->db->query('PRAGMA table_info(account)')->fetchAll(\PDO::FETCH_ASSOC);
            if (!in_array('epoch', array_column($columns, 'name'), true)) { $this->db->exec('ALTER TABLE account ADD COLUMN epoch INTEGER NOT NULL DEFAULT 0'); }
        });
    }

    private function transaction(callable $action): mixed
    {
        $this->db->exec('BEGIN IMMEDIATE');
        try { $result = $action(); $this->db->exec('COMMIT'); return $result; }
        catch (\Throwable $error) { $this->db->exec('ROLLBACK'); throw $error; }
    }

    public function initialized(): bool { return (bool) $this->db->query('SELECT COUNT(*) FROM account')->fetchColumn(); }
    public function epoch(): int { return (int) $this->db->query('SELECT epoch FROM account WHERE id=1')->fetchColumn(); }
    public function encryptEnrollment(#[\SensitiveParameter] string $secret): string { return $this->seal($secret); }
    public function decryptEnrollment(#[\SensitiveParameter] string $value): string { return $this->unseal($value); }

    private function seal(string $secret): string
    {
        $nonce = random_bytes(SODIUM_CRYPTO_SECRETBOX_NONCEBYTES);
        return base64_encode($nonce . sodium_crypto_secretbox($secret, $nonce, $this->key));
    }

    private function unseal(string $value): string
    {
        $bytes = base64_decode($value, true);
        if ($bytes === false || strlen($bytes) < SODIUM_CRYPTO_SECRETBOX_NONCEBYTES + SODIUM_CRYPTO_SECRETBOX_MACBYTES) {
            throw new \RuntimeException('Invalid authentication data');
        }
        $secret = sodium_crypto_secretbox_open(substr($bytes, SODIUM_CRYPTO_SECRETBOX_NONCEBYTES), substr($bytes, 0, SODIUM_CRYPTO_SECRETBOX_NONCEBYTES), $this->key);
        if ($secret === false) { throw new \RuntimeException('Cannot decrypt authentication data'); }
        return $secret;
    }

    private function recoveryHash(string $code): string
    {
        return hash_hmac('sha256', 'webbit-recovery-v1:' . strtoupper(str_replace('-', '', $code)), $this->key);
    }

    /** Called only by the future local bootstrap flow after TOTP confirmation. Returns codes once. */
    public function initialize(string $username, #[\SensitiveParameter] string $password, #[\SensitiveParameter] string $secret, string $confirmation, int $now): array
    {
        if (!preg_match('/^[A-Za-z0-9_.-]{3,64}$/D', $username) || strlen($password) < 12 || strlen($password) > 72 || str_contains($password, "\0")) {
            throw new \InvalidArgumentException('Use a 3–64 character username and a 12–72 byte password');
        }
        $step = Totp::matchStep($secret, $confirmation, $now, -1);
        if ($step === null) { throw new \InvalidArgumentException('Confirm the authenticator before creating the account'); }
        return $this->transaction(function () use ($username, $password, $secret, $step): array {
            if ($this->db->query('SELECT COUNT(*) FROM account')->fetchColumn()) { throw new \RuntimeException('Already initialized'); }
            $codes = []; $hashes = [];
            for ($i = 0; $i < 10; $i++) {
                $code = implode('-', str_split(strtoupper(bin2hex(random_bytes(16))), 8));
                $codes[] = $code; $hashes[] = $this->recoveryHash($code);
            }
            $algorithm = defined('PASSWORD_ARGON2ID') ? PASSWORD_ARGON2ID : PASSWORD_BCRYPT;
            $options = $algorithm === PASSWORD_BCRYPT ? ['cost' => 12] : ['memory_cost' => 65536, 'time_cost' => 3, 'threads' => 1];
            $stmt = $this->db->prepare('INSERT INTO account (id,username,password,secret,last_step,recovery) VALUES (1, ?, ?, ?, ?, ?)');
            $stmt->execute([$username, password_hash($password, $algorithm, $options), $this->seal($secret), $step, json_encode($hashes, JSON_THROW_ON_ERROR)]);
            return $codes;
        });
    }

    /** Caller supplies server time and REMOTE_ADDR, never forwarded headers or request parameters. */
    public function authenticate(string $username, #[\SensitiveParameter] string $password, #[\SensitiveParameter] string $factor, string $remoteAddress, int $now): bool
    {
        if ($now < 0 || strlen($username) > 64 || strlen($password) > 72 || strlen($factor) > 64 || strlen($remoteAddress) > 64) { return false; }
        return $this->transaction(function () use ($username, $password, $factor, $remoteAddress, $now): bool {
            $buckets = ['account', hash_hmac('sha256', $remoteAddress, $this->key)];
            $this->db->prepare('DELETE FROM throttle WHERE until_at <= ?')->execute([$now]);
            foreach ($buckets as $bucket) {
                $query = $this->db->prepare('SELECT failures FROM throttle WHERE bucket=?'); $query->execute([$bucket]);
                if ((int) $query->fetchColumn() >= 5) { return false; }
            }
            $user = $this->db->query('SELECT * FROM account WHERE id=1')->fetch(\PDO::FETCH_ASSOC);
            $valid = false;
            if ($user && password_verify($password, $user['password']) && hash_equals($user['username'], $username)) {
                $step = Totp::matchStep($this->unseal($user['secret']), $factor, $now, (int) $user['last_step']);
                if ($step !== null) {
                    $this->db->prepare('UPDATE account SET last_step=? WHERE id=1')->execute([$step]); $valid = true;
                } elseif (preg_match('/^[A-Fa-f0-9]{8}(?:-?[A-Fa-f0-9]{8}){3}$/D', $factor)) {
                    $hashes = json_decode($user['recovery'], true, 512, JSON_THROW_ON_ERROR);
                    $candidate = $this->recoveryHash($factor);
                    foreach ($hashes as $index => $hash) {
                        if (hash_equals($hash, $candidate)) {
                            unset($hashes[$index]);
                            $this->db->prepare('UPDATE account SET recovery=? WHERE id=1')->execute([json_encode(array_values($hashes), JSON_THROW_ON_ERROR)]);
                            $valid = true; break;
                        }
                    }
                }
            }
            if ($valid) {
                $this->db->exec('DELETE FROM throttle');
            } else {
                foreach ($buckets as $bucket) {
                    $this->db->prepare('INSERT INTO throttle VALUES (?,1,?) ON CONFLICT(bucket) DO UPDATE SET failures=failures+1')->execute([$bucket, $now + 900]);
                }
            }
            return $valid;
        });
    }

    private static function passwordHash(#[\SensitiveParameter] string $password): string
    {
        if (strlen($password) < 12 || strlen($password) > 72 || str_contains($password, "\0")) { throw new \InvalidArgumentException('Use a 12–72 byte password'); }
        $algorithm = defined('PASSWORD_ARGON2ID') ? PASSWORD_ARGON2ID : PASSWORD_BCRYPT;
        return password_hash($password, $algorithm, $algorithm === PASSWORD_BCRYPT ? ['cost' => 12] : ['memory_cost' => 65536, 'time_cost' => 3, 'threads' => 1]);
    }

    private function verifyOwner(#[\SensitiveParameter] string $password, #[\SensitiveParameter] string $factor, string $remote, int $now): void
    {
        $username = $this->db->query('SELECT username FROM account WHERE id=1')->fetchColumn();
        if (!$username || !$this->authenticate($username, $password, $factor, $remote, $now)) { throw new \RuntimeException('Account confirmation failed. Use a fresh authenticator or recovery code.'); }
    }

    public function changePassword(#[\SensitiveParameter] string $password, #[\SensitiveParameter] string $factor, #[\SensitiveParameter] string $next, string $remote, int $now): void
    {
        $hash = self::passwordHash($next);
        $this->verifyOwner($password, $factor, $remote, $now);
        $this->transaction(function () use ($hash): void {
            $this->db->prepare('UPDATE account SET password=?,epoch=epoch+1 WHERE id=1')->execute([$hash]);
            $this->db->exec('UPDATE password_reset SET token="",expires=0');
        });
    }

    public function rotateRecovery(#[\SensitiveParameter] string $password, #[\SensitiveParameter] string $factor, string $remote, int $now): array
    {
        $this->verifyOwner($password, $factor, $remote, $now);
        return $this->transaction(function (): array {
            $codes = []; $hashes = [];
            for ($i = 0; $i < 10; $i++) { $code = implode('-', str_split(strtoupper(bin2hex(random_bytes(16))), 8)); $codes[] = $code; $hashes[] = $this->recoveryHash($code); }
            $this->db->prepare('UPDATE account SET recovery=?,epoch=epoch+1 WHERE id=1')->execute([json_encode($hashes, JSON_THROW_ON_ERROR)]);
            return $codes;
        });
    }

    public function replaceAuthenticator(#[\SensitiveParameter] string $password, #[\SensitiveParameter] string $factor, #[\SensitiveParameter] string $secret, string $confirmation, string $remote, int $now): array
    {
        $step = Totp::matchStep($secret, $confirmation, $now, -1);
        if ($step === null) { throw new \InvalidArgumentException('Confirm the new authenticator code.'); }
        $this->verifyOwner($password, $factor, $remote, $now);
        return $this->transaction(function () use ($secret, $step): array {
            $codes = []; $hashes = [];
            for ($i = 0; $i < 10; $i++) { $code = implode('-', str_split(strtoupper(bin2hex(random_bytes(16))), 8)); $codes[] = $code; $hashes[] = $this->recoveryHash($code); }
            $this->db->prepare('UPDATE account SET secret=?,last_step=?,recovery=?,epoch=epoch+1 WHERE id=1')->execute([$this->seal($secret), $step, json_encode($hashes, JSON_THROW_ON_ERROR)]);
            $this->db->exec('UPDATE password_reset SET token="",expires=0');
            return $codes;
        });
    }

    /** Only call when optional SMTP is enabled. The caller emails the returned code to the configured owner. */
    public function requestPasswordReset(string $username, int $now): ?string
    {
        return $this->transaction(function () use ($username, $now): ?string {
            $owner = $this->db->query('SELECT username FROM account WHERE id=1')->fetchColumn();
            if (!$owner || !hash_equals($owner, $username)) { return null; }
            $previous = $this->db->query('SELECT requested FROM password_reset WHERE id=1')->fetchColumn();
            if ($previous !== false && (int) $previous + 300 > $now) { return null; }
            $code = bin2hex(random_bytes(32));
            $this->db->prepare('INSERT INTO password_reset VALUES(1,?,?,0,?) ON CONFLICT(id) DO UPDATE SET token=excluded.token,expires=excluded.expires,attempts=0,requested=excluded.requested')->execute([hash('sha256', $code), $now + 900, $now]);
            return $code;
        });
    }

    /** Email code does not replace MFA. TOTP confirmation and replay checks remain mandatory. */
    public function resetPassword(#[\SensitiveParameter] string $token, #[\SensitiveParameter] string $next, #[\SensitiveParameter] string $factor, int $now): bool
    {
        if (!preg_match('/^[a-f0-9]{64}$/D', $token)) { return false; }
        if (strlen($next) < 12 || strlen($next) > 72 || str_contains($next, "\0")) { throw new \InvalidArgumentException('Use a 12–72 byte password'); }
        return $this->transaction(function () use ($token, $next, $factor, $now): bool {
            $reset = $this->db->query('SELECT * FROM password_reset WHERE id=1')->fetch(\PDO::FETCH_ASSOC);
            if (!$reset || $reset['expires'] <= $now || $reset['attempts'] >= 5 || !hash_equals($reset['token'], hash('sha256', $token))) { return false; }
            $user = $this->db->query('SELECT * FROM account WHERE id=1')->fetch(\PDO::FETCH_ASSOC);
            $step = Totp::matchStep($this->unseal($user['secret']), $factor, $now, (int) $user['last_step']);
            if ($step === null) { $this->db->exec('UPDATE password_reset SET attempts=attempts+1 WHERE id=1'); return false; }
            $hash = self::passwordHash($next);
            $this->db->prepare('UPDATE account SET password=?,last_step=?,epoch=epoch+1 WHERE id=1')->execute([$hash, $step]);
            $this->db->exec('UPDATE password_reset SET token="",expires=0');
            return true;
        });
    }
}
