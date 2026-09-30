<?php
declare(strict_types=1);
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
require_once __DIR__ . '/private/runtime/src/AuthStore.php';
use Webbit\Manager\AuthStore;
$private = __DIR__ . '/private'; $public = __DIR__ . '/public';
if (PHP_OS_FAMILY !== 'Windows') { chmod($private, 0700); }
$auth = new AuthStore($private, $public);
if ($auth->initialized()) { fwrite(STDERR, "The manager is already initialized. Setup cannot replace the account.\n"); exit(1); }
$token = bin2hex(random_bytes(32));
$path = $private . '/bootstrap.json';
if (is_link($path)) { throw new RuntimeException('Unsafe bootstrap path'); }
$handle = fopen($path, 'c+b');
if (!$handle || !flock($handle, LOCK_EX)) { throw new RuntimeException('Cannot prepare setup'); }
try {
    chmod($path, 0600); ftruncate($handle, 0);
    $data = json_encode(['hash' => hash('sha256', $token), 'expires' => time() + 3600], JSON_THROW_ON_ERROR);
    if (fwrite($handle, $data) !== strlen($data) || !fflush($handle)) { throw new RuntimeException('Cannot prepare setup'); }
} finally { flock($handle, LOCK_UN); fclose($handle); }
echo "One-time setup token (expires in one hour):\n$token\n\nOpen the manager HTTPS address from README-MANAGER.md and paste this token. Keep public/ as the document root; private/ must never be served.\n";
