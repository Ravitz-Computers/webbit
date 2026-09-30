import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import net from 'node:net';
import {spawn} from 'node:child_process';
import {createHash,createHmac} from 'node:crypto';
import assert from 'node:assert/strict';
const root=fs.mkdtempSync(path.join(os.tmpdir(),'webbit-members-'));
const repo=process.cwd(),priv=path.join(root,'private'),pub=path.join(root,'public');
for(const dir of [priv,pub,path.join(priv,'accounts'),path.join(priv,'invites'),path.join(priv,'pages')])fs.mkdirSync(dir,{mode:0o700});
fs.writeFileSync(path.join(priv,'config.json'),JSON.stringify({title:'Members',pages:{'page-0':{url:'/secret.php',label:'Secret'}}}));
fs.writeFileSync(path.join(priv,'pages/page-0.html'),'<h1>CONFIDENTIAL CONTENT</h1>');
const token='a'.repeat(64),id=createHash('sha256').update('alice').digest('hex');
fs.writeFileSync(path.join(priv,`invites/${id}.json`),JSON.stringify({hash:createHash('sha256').update(token).digest('hex'),expires:Math.floor(Date.now()/1000)+3600}));
const php=s=>`'${s.replaceAll('\\','\\\\').replaceAll("'","\\'")}'`;
fs.writeFileSync(path.join(root,'router.php'),`<?php $_SERVER['HTTPS']='on'; require ${php(path.join(repo,'manager-runtime/src/Members.php'))}; if($_SERVER['REQUEST_URI']==='/bad-root') $_SERVER['DOCUMENT_ROOT']=${php(root)}; if($_SERVER['REQUEST_URI']==='/secret.php'){Webbit\\Manager\\Members::page(${php(priv)},${php(pub)},'page-0');}else{Webbit\\Manager\\Members::run(${php(priv)},${php(pub)});}`);
const socket=net.createServer();await new Promise(r=>socket.listen(0,'127.0.0.1',r));const port=socket.address().port;await new Promise(r=>socket.close(r));
const child=spawn(process.env.WEBBIT_PHP_BIN||'php',['-S',`127.0.0.1:${port}`,'-t',pub,path.join(root,'router.php')],{stdio:['ignore','ignore','pipe'],windowsHide:true});let log='';child.stderr.on('data',d=>log+=d);
let cookie='',count=0;const check=(v,m)=>{assert.ok(v,m);count++;};
async function request(fields,url='/members/',override){const r=await fetch(`http://127.0.0.1:${port}${url}`,{method:fields?'POST':'GET',headers:{Cookie:override??cookie,...(fields?{'Content-Type':'application/x-www-form-urlencoded'}:{})},body:fields?new URLSearchParams(fields):undefined,redirect:'manual'});const c=r.headers.get('set-cookie');if(c&&override===undefined)cookie=c.split(';')[0];return {r,text:await r.text()};}
const csrf=s=>s.match(/name="csrf" value="([a-f0-9]{64})"/)[1];
function totp(secret){let bits='';for(const c of secret)bits+='ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'.indexOf(c).toString(2).padStart(5,'0');const key=Buffer.from(bits.match(/.{8}/g).map(b=>parseInt(b,2))),counter=Buffer.alloc(8);counter.writeBigUInt64BE(BigInt(Math.floor(Date.now()/30000)));const digest=createHmac('sha1',key).update(counter).digest(),offset=digest[19]&15;return String((digest.readUInt32BE(offset)&0x7fffffff)%1000000).padStart(6,'0');}
try{
 let result;for(let i=0;i<100;i++){try{result=await request();break;}catch{await new Promise(r=>setTimeout(r,50));}}assert.ok(result,log);
 check(cookie.startsWith('__Host-webbit-member='),'Distinct member cookie');
 check(result.r.headers.get('set-cookie').includes('HttpOnly'),'Cookie is HttpOnly');
 check((await request(null,'/secret.php')).r.status===302,'Anonymous page access redirects');
 check((await request(null,'/bad-root')).r.status===503,'Wrong document root fails closed');
 result=await request({action:'invite',csrf:'bad',username:'alice',token});check(!result.text.includes('New password'),'CSRF blocks enrollment');
 result=await request({action:'invite',csrf:csrf(result.text),username:'alice',token});const secret=result.text.match(/<code>([A-Z2-7]+)<\/code>/)?.[1];check(!!secret,'Valid invitation starts TOTP enrollment');
 const password='Example strong password 123!';result=await request({action:'enroll',csrf:csrf(result.text),password,factor:totp(secret)});const codes=result.text.match(/[A-F0-9]{8}(?:-[A-F0-9]{8}){3}/g);check(codes?.length===10,'Ten recovery codes shown once');
 const db=fs.readFileSync(path.join(priv,'accounts',id,'auth.sqlite'));check(!db.includes(Buffer.from(secret)),'Authenticator secret not plaintext in database');check(!db.includes(Buffer.from(password)),'Password not plaintext');check(!db.includes(Buffer.from(codes[0])),'Recovery codes not plaintext');
 result=await request({action:'login',csrf:csrf(result.text),username:'alice',password,factor:codes[0]});check(result.text.includes('Your pages'),'Member can log in');
 check((await request(null,'/secret.php')).text.includes('CONFIDENTIAL CONTENT'),'Authenticated member sees protected page');
 const fakeAdmin=cookie.replace('__Host-webbit-member=','__Host-webbit=');check((await request(null,'/secret.php',fakeAdmin)).r.status===302,'Admin cookie cannot authenticate member route');
 fs.writeFileSync(path.join(priv,'accounts',id,'disabled'),'1');check((await request(null,'/secret.php')).r.status===302,'Disabling member revokes active access');
 console.log(`Passed ${count} member HTTP checks (local TLS simulation).`);
}finally{child.kill();await new Promise(r=>child.exitCode!==null?r():child.once('exit',r));if(!path.basename(root).startsWith('webbit-members-'))throw new Error('Unsafe cleanup');fs.rmSync(root,{recursive:true,force:true});}
