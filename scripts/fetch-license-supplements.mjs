// Explicit maintenance tool; release builds use the checked-in supplements offline.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const cargo=JSON.parse(fs.readFileSync(process.argv[2],'utf8').replace(/^\uFEFF/,''));
const inventory=JSON.parse(fs.readFileSync(path.join(root,'licenses/dependencies/inventory.json'),'utf8'));
const out=path.join(root,'licenses/upstream');fs.mkdirSync(out,{recursive:true});
for(const item of inventory){
  if(!fs.readFileSync(path.join(root,item.file),'utf8').includes('License text was not present'))continue;
  let repo,ref;
  if(item.kind==='cargo'){
    const pkg=cargo.packages.find(p=>p.name===item.name&&p.version===item.version);
    repo=pkg.repository.replace(/\/$/,'').replace(/\.git$/,'');
    const vcs=JSON.parse(fs.readFileSync(path.join(path.dirname(pkg.manifest_path),'.cargo_vcs_info.json'),'utf8'));ref=vcs.git.sha1;
  }else{repo='https://github.com/uiwjs/react-codemirror';ref=`v${item.version}`;}
  if(!repo.startsWith('https://github.com/'))throw new Error(`Unsupported origin ${repo}`);
  const parts=[];
  for(const name of ['LICENSE','LICENSE-MIT','LICENSE-APACHE','LICENSE-BSD','LICENSE.md','COPYING','LICENSE_MIT','LICENSE_APACHE-2.0']){
    const url=`https://raw.githubusercontent.com/${repo.slice('https://github.com/'.length)}/${ref}/${name}`;
    const response=await fetch(url);
    if(response.status===404)continue;
    if(!response.ok)throw new Error(`${response.status}: ${url}`);
    parts.push(`Source: ${url}\n\n${await response.text()}`);
  }
  if(!parts.length){console.log(`No license found: ${item.name}`);continue;}
  fs.writeFileSync(path.join(out,path.basename(item.file)),parts.join('\n\n'));
  console.log(`Retrieved upstream license: ${item.name}@${item.version}`);
}
