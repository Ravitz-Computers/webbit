<?php
declare(strict_types=1);
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
require_once __DIR__ . '/../src/ContentStore.php';
use Webbit\Manager\ContentStore;
$root = sys_get_temp_dir() . '/webbit-content-' . bin2hex(random_bytes(8));
mkdir($root, 0700); mkdir($root . '/private', 0700); mkdir($root . '/public', 0700);
$checks = 0;
function ok(bool $value, string $message): void { global $checks; $checks++; if (!$value) { throw new RuntimeException($message); } }
function denies(callable $action, string $message): void { try { $action(); } catch (Throwable) { ok(true, $message); return; } ok(false, $message); }
try {
    $before = '<h1> A &amp; B </h1><!--preserve--><script>unchanged()</script>';
    file_put_contents($root . '/public/index.html', $before);
    $schema = ['version' => 1, 'fields' => [['id' => 'title', 'value' => ' A & B ', 'kind' => 'text']], 'pages' => [['path' => 'index.html', 'hash' => hash('sha256', $before), 'segments' => ['<h1>', ['field' => 'title', 'initial' => ' A & B ', 'original' => ' A &amp; B '], '</h1><!--preserve--><script>unchanged()</script>']]]];
    file_put_contents($root . '/private/schema.json', json_encode($schema));
    $store = new ContentStore($root . '/private', $root . '/public');
    ok($store->preview(['title' => ' A & B '])['index.html'] === $before, 'Unchanged field preserves source bytes');
    $malicious = '<script>alert("x")</script>';
    $preview = $store->preview(['title' => $malicious]);
    ok(str_contains($preview['index.html'], '&lt;script&gt;'), 'Managed text cannot insert markup');
    ok(file_get_contents($root . '/public/index.html') === $before, 'Preview does not write public files');
    denies(fn() => $store->publish(['title' => 'New', 'unmanaged' => 'x'], 0), 'Unknown fields denied');
    $state = $store->publish(['title' => 'New'], 0);
    ok($state['revision'] === 1 && str_contains(file_get_contents($root . '/public/index.html'), '<h1>New</h1><!--preserve--><script>unchanged()</script>'), 'Publish only replaces managed text');
    $backups = glob($root . '/private/backup-*/0.html');
    ok(count($backups) === 1 && file_get_contents($backups[0]) === $before, 'Backup retains original page');
    denies(fn() => $store->publish(['title' => 'Stale'], 0), 'Concurrent stale revision denied');
    file_put_contents($root . '/public/index.html', '<p>External change</p>');
    denies(fn() => $store->publish(['title' => 'Overwrite'], 1), 'External source change denied');
    ok(file_get_contents($root . '/public/index.html') === '<p>External change</p>', 'External changes preserved');
    file_put_contents($root . '/private/publish-pending.json', '{}');
    denies(fn() => $store->read(), 'Interrupted publish requires recovery');
    echo "Passed $checks content checks\n";
} finally {
    $absolute = realpath($root);
    $remove = function (string $path) use (&$remove, $absolute): void {
        $resolved = realpath($path);
        if ($resolved === false || !str_starts_with(str_replace('\\', '/', $resolved), str_replace('\\', '/', $absolute) . '/')) { throw new RuntimeException('Test cleanup escaped its directory'); }
        if (is_dir($path) && !is_link($path)) { foreach (scandir($path) as $name) { if ($name !== '.' && $name !== '..') { $remove($path . '/' . $name); } } rmdir($path); }
        else { unlink($path); }
    };
    $remove($root . '/private'); $remove($root . '/public'); rmdir($root);
}
