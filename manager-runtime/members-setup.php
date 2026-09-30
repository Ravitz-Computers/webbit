<?php
declare(strict_types=1);
if(PHP_SAPI!=='cli'){http_response_code(404);exit;}
$private=__DIR__.'/private/members';
$name=strtolower($argv[1]??'');if(!preg_match('/^[A-Za-z0-9_.-]{3,64}$/D',$name)){fwrite(STDERR,"Usage: php members-setup.php USERNAME [disable]\n");exit(1);}
foreach([$private,$private.'/accounts',$private.'/invites',$private.'/pages'] as $dir){if(is_link($dir))throw new RuntimeException('Links not allowed');if(!is_dir($dir))mkdir($dir,0700,true);chmod($dir,0700);}
$id=hash('sha256',$name);$account=$private.'/accounts/'.$id;
if(($argv[2]??'')==='disable'){if(!is_dir($account)||is_link($account))throw new RuntimeException('Unknown account');file_put_contents($account.'/disabled','1',LOCK_EX);echo "Member disabled; active sessions will be refused.\n";exit;}
if(is_file($account.'/auth.sqlite'))throw new RuntimeException('Account already has enrollment state. Do not overwrite it.');
$token=bin2hex(random_bytes(32));$file=$private.'/invites/'.$id.'.json';if(is_link($file))throw new RuntimeException('Links not allowed');file_put_contents($file,json_encode(['hash'=>hash('sha256',$token),'expires'=>time()+86400]),LOCK_EX);chmod($file,0600);
echo "Open https://YOUR-DOMAIN/members/ and choose Have an invitation.\nUsername: $name\nOne-use token (expires in 24 hours): $token\nDeliver this token privately to the member.\n";
