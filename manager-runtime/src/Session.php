<?php
declare(strict_types=1);
namespace Webbit\Manager;
require_once __DIR__ . '/AuthStore.php';

final class Session
{
    public static function start(string $privateDirectory, string $documentRoot, bool $member = false): void
    {
        // Do not trust X-Forwarded-Proto. TLS termination needs explicit server configuration.
        if (!in_array($_SERVER['HTTPS'] ?? '', ['on', '1'], true)) { throw new \RuntimeException('Manager requires HTTPS'); }
        if (session_status() !== PHP_SESSION_NONE) { throw new \RuntimeException('Unexpected existing session'); }
        $private = AuthStore::privateDirectory($privateDirectory, $documentRoot);
        $sessions = $private . DIRECTORY_SEPARATOR . 'sessions';
        if (is_link($sessions)) { throw new \RuntimeException('Session directory cannot be a link'); }
        if (!is_dir($sessions) && !mkdir($sessions, 0700)) { throw new \RuntimeException('Cannot create session storage'); }
        AuthStore::privateDirectory($sessions, $documentRoot);
        session_save_path($sessions);
        session_name($member ? '__Host-webbit-member' : '__Host-webbit');
        foreach (['session.use_strict_mode' => '1', 'session.use_only_cookies' => '1', 'session.use_trans_sid' => '0', 'session.gc_maxlifetime' => '28800'] as $name => $value) {
            ini_set($name, $value);
            if ((string) ini_get($name) !== $value) { throw new \RuntimeException('Host prevents required session configuration'); }
        }
        if (!session_set_cookie_params(['lifetime' => 0, 'path' => '/', 'secure' => true, 'httponly' => true, 'samesite' => 'Strict'])) {
            throw new \RuntimeException('Cannot configure secure cookies');
        }
        if (!session_start()) { throw new \RuntimeException('Cannot start secure session'); }
        header("Content-Security-Policy: default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self' data:; form-action 'self'; frame-ancestors 'none'; base-uri 'none'");
        header('X-Content-Type-Options: nosniff');
        header('X-Frame-Options: DENY');
        header('Referrer-Policy: no-referrer');
        header('Cache-Control: no-store');
        if (!isset($_SESSION['csrf'])) { $_SESSION['csrf'] = bin2hex(random_bytes(32)); }
    }

    /** Call only after AuthStore::authenticate returns true. */
    public static function login(int $now, int $epoch = 0): void
    {
        if (session_status() !== PHP_SESSION_ACTIVE || $now < 0) { throw new \RuntimeException('No active session'); }
        if (!session_regenerate_id(true)) { throw new \RuntimeException('Cannot rotate session'); }
        $_SESSION = ['authenticated' => true, 'created' => $now, 'seen' => $now, 'epoch' => $epoch, 'csrf' => bin2hex(random_bytes(32))];
    }

    public static function authenticated(int $now, ?int $epoch = null): bool
    {
        if (session_status() !== PHP_SESSION_ACTIVE || ($_SESSION['authenticated'] ?? false) !== true) { return false; }
        $created = $_SESSION['created'] ?? null; $seen = $_SESSION['seen'] ?? null;
        if (!is_int($created) || !is_int($seen) || $now < $seen || $now - $seen >= 900 || $now - $created >= 28800 || ($epoch !== null && ($_SESSION['epoch'] ?? -1) !== $epoch)) {
            self::logout(); return false;
        }
        $_SESSION['seen'] = $now;
        return true;
    }

    public static function requireCsrf(string $token): void
    {
        if (session_status() !== PHP_SESSION_ACTIVE || ($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST' || strlen($token) !== 64 || !isset($_SESSION['csrf']) || !hash_equals($_SESSION['csrf'], $token)) {
            throw new \RuntimeException('Invalid request token');
        }
    }

    public static function logout(): void
    {
        $_SESSION = [];
        if (session_status() === PHP_SESSION_ACTIVE) {
            setcookie(session_name(), '', ['expires' => 1, 'path' => '/', 'secure' => true, 'httponly' => true, 'samesite' => 'Strict']);
            session_destroy();
        }
    }
}
