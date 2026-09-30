<?php
// Webbit optional Google Places connector. API key is server-side only.
declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');
function fail(int $status, string $message): never { http_response_code($status); echo json_encode(['error'=>$message]); exit; }
if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'GET') fail(405, 'GET required.');
$key = getenv('WEBBIT_GOOGLE_PLACES_KEY') ?: '';
$place = getenv('WEBBIT_GOOGLE_PLACE_ID') ?: '';
if ($key === '' || !preg_match('/^[A-Za-z0-9_-]{8,300}$/D', $place)) fail(503, 'Google reviews have not been configured by the site owner.');
if (!extension_loaded('curl')) fail(503, 'The server needs PHP cURL for Google reviews.');
// Global per-endpoint request budget, outside the web root; never stores review data.
$bucket = @fopen(sys_get_temp_dir().'/webbit-reviews-'.hash('sha256', __FILE__).'.lock', 'c+');
if (!$bucket || !flock($bucket, LOCK_EX)) fail(503, 'Review service is temporarily unavailable.');
$state = json_decode(stream_get_contents($bucket), true) ?: ['minute'=>0,'count'=>0];
$minute = intdiv(time(),60);
if (($state['minute'] ?? 0) !== $minute) $state=['minute'=>$minute,'count'=>0];
if (($state['count'] ?? 0) >= 10) { flock($bucket,LOCK_UN); fclose($bucket); fail(429,'Please try again in a minute.'); }
$state['count']++; rewind($bucket); ftruncate($bucket,0); fwrite($bucket,json_encode($state)); fflush($bucket); flock($bucket,LOCK_UN); fclose($bucket);
$curl = curl_init('https://places.googleapis.com/v1/places/'.rawurlencode($place));
$body='';
curl_setopt_array($curl,[CURLOPT_FOLLOWLOCATION=>false,CURLOPT_CONNECTTIMEOUT=>5,CURLOPT_TIMEOUT=>12,CURLOPT_SSL_VERIFYPEER=>true,CURLOPT_SSL_VERIFYHOST=>2,CURLOPT_HTTPHEADER=>['X-Goog-Api-Key: '.$key,'X-Goog-FieldMask: displayName,rating,userRatingCount,reviews,googleMapsUri,attributions'],CURLOPT_WRITEFUNCTION=>static function($curl,string $chunk) use (&$body): int {if(strlen($body)+strlen($chunk)>1000000)return 0;$body.=$chunk;return strlen($chunk);}]);
$ok=curl_exec($curl);$status=curl_getinfo($curl,CURLINFO_HTTP_CODE);curl_close($curl);
if($ok===false||$status!==200)fail(502,'Google reviews could not be loaded. The owner should check the API configuration and quota.');
$data=json_decode($body,true);if(!is_array($data))fail(502,'Review response unavailable.');
// Do not expose upstream errors or credentials. Public Google data is returned only on success.
echo json_encode(['name'=>$data['displayName']['text']??'','rating'=>$data['rating']??null,'count'=>$data['userRatingCount']??null,'url'=>$data['googleMapsUri']??'','attributions'=>$data['attributions']??[],'reviews'=>$data['reviews']??[]],JSON_UNESCAPED_SLASHES|JSON_INVALID_UTF8_SUBSTITUTE);
