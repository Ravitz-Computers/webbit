import {describe,it,expect} from 'vitest';
import {sealPackage,openPackage,storageMode,type VaultPayload} from './encryption';
import {createProject,publicFiles} from './project';
import {mkdtempSync,readFileSync,writeFileSync,existsSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,basename} from 'node:path';
import {spawnSync} from 'node:child_process';
const password='Test-only long random passphrase!';
const payload:VaultPayload={kind:'project',files:{'private/private-name.txt':'Hidden content','index.html':'<h1>Hello</h1>'},assets:{'images/test.png':'data:image/png;base64,AQID'}};
describe('encrypted storage',()=>{
 it('defaults to sensitive only and keeps preferences out of public output',()=>{const p=createProject();expect(storageMode(p)).toBe('sensitive');p.files['webbit.security.json']='{"storage":"full"}';expect(storageMode(p)).toBe('full');expect(publicFiles(p)['webbit.security.json']).toBeUndefined();p.files['webbit.security.json']='invalid';expect(storageMode(p)).toBe('full');});
 it('round-trips all files and assets without revealing names or content',async()=>{const raw=await sealPackage(payload,password);expect(raw).not.toContain('private-name');expect(raw).not.toContain('Hidden content');expect(await openPackage(raw,password)).toEqual(payload);});
 it('uses new salt, nonce and ciphertext for each snapshot',async()=>{const a=JSON.parse(await sealPackage(payload,password)),b=JSON.parse(await sealPackage(payload,password));expect(a.salt).not.toBe(b.salt);expect(a.iv).not.toBe(b.iv);expect(a.data).not.toBe(b.data);});
 it('rejects wrong passwords and tampering',async()=>{const raw=await sealPackage(payload,password);await expect(openPackage(raw,password+'wrong')).rejects.toThrow('Cannot unlock');const changed=JSON.parse(raw);const bytes=Buffer.from(changed.data,'base64');bytes[3]^=1;changed.data=bytes.toString('base64');await expect(openPackage(JSON.stringify(changed),password)).rejects.toThrow('Cannot unlock');});
 it('rejects attacker-controlled KDF work factors before derivation',async()=>{const raw=JSON.parse(await sealPackage(payload,password));raw.iterations=999999999;await expect(openPackage(JSON.stringify(raw),password)).rejects.toThrow('Cannot unlock');});
 it('rejects short passphrases and path collisions',async()=>{await expect(sealPackage(payload,'short')).rejects.toThrow('passphrase');await expect(sealPackage({...payload,files:{'a':'x','a/b':'y'}},password)).rejects.toThrow('collision');await expect(sealPackage({...payload,files:{'../escape':'x'}},password)).rejects.toThrow('Unsafe');});
 it('restores authenticated bytes with the independent hosting tool; never overwrites',async()=>{const root=mkdtempSync(join(tmpdir(),'webbit-vault-test-'));try{const archive=join(root,'test.wbe'),out=join(root,'restored');writeFileSync(archive,await sealPackage({...payload,kind:'deployment'},password));const run=(pass:string,dest=out)=>spawnSync(process.execPath,['help/restore-encrypted.mjs',archive,dest,'--encrypted-storage-ready'],{input:pass+'\n',encoding:'utf8'});expect(run('incorrect password').status).not.toBe(0);expect(existsSync(out)).toBe(false);const good=run(password);expect(good.status,good.stderr).toBe(0);expect(readFileSync(join(out,'private/private-name.txt'),'utf8')).toBe('Hidden content');expect([...readFileSync(join(out,'images/test.png'))]).toEqual([1,2,3]);expect(run(password).status).not.toBe(0);}finally{if(!basename(root).startsWith('webbit-vault-test-'))throw new Error('Unsafe cleanup');rmSync(root,{recursive:true,force:true});}});
});
