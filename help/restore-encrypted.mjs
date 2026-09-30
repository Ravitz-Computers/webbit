import fs from 'node:fs';
import path from 'node:path';
import {webcrypto} from 'node:crypto';
import readline from 'node:readline';
import {Writable} from 'node:stream';
// No third-party packages. Run on a host with encrypted storage already provisioned.
const [source,destination,ack]=process.argv.slice(2);
if(!source||!destination||ack!=='--encrypted-storage-ready'){console.error('Usage: node restore-encrypted.mjs PACKAGE.wbe NEW_DIRECTORY --encrypted-storage-ready\nThe flag acknowledges that YOU verified encryption of the destination, databases, logs, temporary storage and backups. This tool cannot verify host encryption.');process.exit(1);}
const MAX=420_000_000;
const sourceMeta=fs.lstatSync(source);if(!sourceMeta.isFile()||sourceMeta.isSymbolicLink()||sourceMeta.size>MAX)throw new Error('Choose a regular encrypted package under 420 MB.');
const raw=JSON.parse(fs.readFileSync(source,'utf8'));
if(raw.format!=='webbit-encrypted'||raw.version!==1||raw.kdf!=='PBKDF2-SHA256'||raw.iterations!==600000||raw.cipher!=='AES-256-GCM')throw new Error('Unsupported package format.');
const decode=(v)=>{if(typeof v!=='string'||!/^[A-Za-z0-9+/]*={0,2}$/.test(v))throw new Error('Invalid package');return Buffer.from(v,'base64');};
const salt=decode(raw.salt),iv=decode(raw.iv),ciphertext=decode(raw.data);if(salt.length!==16||iv.length!==12||ciphertext.length<16)throw new Error('Invalid package');
async function readPassword(){if(!process.stdin.isTTY){let text='';for await(const chunk of process.stdin){text+=chunk;if(text.length>4096)throw new Error('Passphrase input too long');}return text.replace(/\r?\n$/,'');}process.stderr.write('Passphrase (hidden): ');const silent=new Writable({write(_chunk,_encoding,callback){callback();}});const rl=readline.createInterface({input:process.stdin,output:silent,terminal:true});const result=await new Promise(resolve=>rl.question('',resolve));rl.close();process.stderr.write('\n');return result;}
let password=await readPassword();let plain;
try{const input=await webcrypto.subtle.importKey('raw',Buffer.from(password),'PBKDF2',false,['deriveKey']);password='';const key=await webcrypto.subtle.deriveKey({name:'PBKDF2',salt,iterations:600000,hash:'SHA-256'},input,{name:'AES-GCM',length:256},false,['decrypt']);plain=Buffer.from(await webcrypto.subtle.decrypt({name:'AES-GCM',iv,additionalData:Buffer.from('Webbit encrypted package v1')},key,ciphertext));}catch{throw new Error('Cannot unlock: wrong passphrase or damaged package.');}
const payload=JSON.parse(plain.toString('utf8'));plain.fill(0);
if(!['project','deployment'].includes(payload.kind))throw new Error('Invalid package kind');
const safe=p=>typeof p==='string'&&p.length>0&&p.length<=240&&!/[\\:\x00-\x1f<>"|?*]/.test(p)&&!p.startsWith('/')&&p.split('/').every(s=>s&&s!=='.'&&s!=='..'&&!/[. ]$/.test(s)&&!/^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(s));
const entries=[],seen=new Set();let total=0;
for(const [kind,map] of Object.entries({files:payload.files,assets:payload.assets})){if(!map||typeof map!=='object'||Array.isArray(map))throw new Error('Invalid file map');for(const [name,value] of Object.entries(map)){if(!safe(name)||typeof value!=='string'||seen.has(name.toLowerCase()))throw new Error('Unsafe or duplicate file path');seen.add(name.toLowerCase());let bytes;if(kind==='files')bytes=Buffer.from(value);else{const match=value.match(/^data:[^;,]+;base64,([A-Za-z0-9+/]*={0,2})$/);if(!match)throw new Error('Invalid asset');bytes=Buffer.from(match[1],'base64');}total+=bytes.length;if(total>300_000_000)throw new Error('Package exceeds 300 MB');entries.push([name,bytes]);}}
for(const [name] of entries){const parts=name.toLowerCase().split('/');parts.pop();while(parts.length){if(seen.has(parts.join('/')))throw new Error('File/folder collision');parts.pop();}}
const root=path.resolve(destination);if(fs.existsSync(root))throw new Error('Choose a NEW directory. Existing data is never overwritten.');
// Only create output after authenticating and validating the complete package.
fs.mkdirSync(root,{mode:0o700});
for(const [name,data] of entries){const target=path.join(root,...name.split('/'));fs.mkdirSync(path.dirname(target),{recursive:true,mode:0o700});fs.writeFileSync(target,data,{flag:'wx',mode:0o600});data.fill(0);}
console.log(`Restored ${entries.length} files to ${root}. This tool did not enable disk encryption. Apply the included server/document-root setup before serving the site. Retain encrypted packages as backups.`);
