<?php
declare(strict_types=1);
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
require_once __DIR__ . '/../src/AuthStore.php';
$input = json_decode(stream_get_contents(STDIN), true, 512, JSON_THROW_ON_ERROR);
$store = new Webbit\Manager\AuthStore($input['private'], $input['public']);
echo $store->authenticate('owner', 'Testing a long passphrase!', $input['factor'], '127.0.0.1', $input['now']) ? 'yes' : 'no';
