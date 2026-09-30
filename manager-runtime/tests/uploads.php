<?php
declare(strict_types=1);
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
require_once __DIR__ . '/../src/Uploads.php';
use Webbit\Manager\Uploads;
$root = sys_get_temp_dir() . '/webbit-uploads-' . bin2hex(random_bytes(8)); mkdir($root, 0700);
$checks = 0;
function check(bool $value): void { global $checks; $checks++; if (!$value) { throw new RuntimeException('Upload check failed'); } }
function rejects(callable $call): void { try { $call(); } catch (Throwable) { check(true); return; } check(false); }
try {
    rejects(fn() => Uploads::store('<?php echo "not an image";', $root));
    rejects(fn() => Uploads::store('<svg onload="alert(1)"></svg>', $root));
    rejects(fn() => Uploads::store(str_repeat('x', 5 * 1024 * 1024 + 1), $root));
    rejects(fn() => Uploads::fromRequest(['error' => UPLOAD_ERR_OK, 'tmp_name' => __FILE__], $root));
    $image = imagecreatetruecolor(2, 2); ob_start(); imagepng($image); $png = ob_get_clean();
    $uploaded = Uploads::store($png . '<?php echo "polyglot-marker";?>', $root);
    check((bool) preg_match('~^/assets/uploads/[a-f0-9]{32}\.png$~D', $uploaded));
    check(!str_contains(file_get_contents($root . $uploaded), 'polyglot-marker'));
    check(getimagesize($root . $uploaded)[2] === IMAGETYPE_PNG);
    unlink($root . $uploaded); rmdir($root . '/assets/uploads'); rmdir($root . '/assets');
    echo "Passed $checks upload checks\n";
} finally { rmdir($root); }
