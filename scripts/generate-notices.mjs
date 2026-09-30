import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const metadata=process.argv[2];
if(!metadata)throw new Error('Pass cargo metadata --locked JSON as the first argument.');
const out=path.join(root,'licenses','dependencies');fs.mkdirSync(out,{recursive:true});
const entries=[],missing=[],seen=new Set();
function record(kind,name,version,license,dir,licenseFile){
  const id=`${kind}-${name.replace(/[^a-zA-Z0-9.-]/g,'_')}-${version}`;
  const files=fs.readdirSync(dir).filter(n=>/^(licen[sc]e|copying|copyright|notice)([._-]|$)/i.test(n)&&fs.statSync(path.join(dir,n)).isFile());
  if(licenseFile&&fs.existsSync(path.resolve(dir,licenseFile))&&!files.includes(licenseFile))files.push(licenseFile);
  let texts=files.map(n=>`--- ${n} ---\n${fs.readFileSync(path.resolve(dir,n),'utf8')}`).join('\n\n');
  const supplement=path.join(root,'licenses','upstream',`${id}.txt`);
  if(!texts&&fs.existsSync(supplement))texts=fs.readFileSync(supplement,'utf8');
  if(!texts){missing.push(`${name}@${version}`);texts='License text was not present in the installed package. Review upstream before distribution.';}
  fs.writeFileSync(path.join(out,`${id}.txt`),`${name} ${version}\nDeclared license: ${license??'unspecified'}\n\n${texts}\n`);
  entries.push({kind,name,version,license:license??'unspecified',file:`licenses/dependencies/${id}.txt`});
}
function npm(name,from){
  const require=createRequire(path.join(from,'package.json'));
  let dir;
  for(const base of require.resolve.paths(name)??[]){const candidate=path.join(base,name);if(fs.existsSync(path.join(candidate,'package.json'))){dir=fs.realpathSync(candidate);break;}}
  if(!dir)throw new Error(`Cannot resolve ${name} from ${from}`);
  const pkg=JSON.parse(fs.readFileSync(path.join(dir,'package.json'),'utf8')),key=`npm:${pkg.name}@${pkg.version}`;
  if(seen.has(key))return;seen.add(key);record('npm',pkg.name,pkg.version,pkg.license,dir);
  for(const dep of Object.keys(pkg.dependencies??{}))npm(dep,dir);
  for(const dep of Object.keys(pkg.peerDependencies??{}))if(!pkg.peerDependenciesMeta?.[dep]?.optional)npm(dep,dir);
}
const pkg=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));
for(const dep of Object.keys(pkg.dependencies))npm(dep,root);
const cargo=JSON.parse(fs.readFileSync(metadata,'utf8').replace(/^\uFEFF/,''));
for(const p of cargo.packages){if(p.source)record('cargo',p.name,p.version,p.license,path.dirname(p.manifest_path),p.license_file);}
record('vendor','PHPMailer','7.1.1','LGPL-2.1-only',path.join(root,'manager-runtime/vendor/phpmailer'));
record('vendor','qrcode-generator','2.0.4','MIT',path.join(root,'manager-runtime/vendor'),'qrcode-LICENSE.txt');
entries.sort((a,b)=>`${a.kind}:${a.name}:${a.version}`.localeCompare(`${b.kind}:${b.name}:${b.version}`));
fs.writeFileSync(path.join(root,'THIRD-PARTY-NOTICES.md'),`# Third-party notices\n\nGenerated from installed frontend production dependencies and the locked Windows Cargo dependency graph. Cargo entries include build dependencies; this inventory does not assert that every listed crate is linked into the executable. Full installed license and notice texts are in licenses/dependencies. Regenerate after any dependency change.\n\nWebbit source uses the MIT license. Ravitz/Vinny artwork is separately proprietary: see PROPRIETARY-ASSETS.md. Microsoft WebView2 has its own distribution terms and must be supplied with its notices when packaging a fixed runtime.\n\n${entries.map(p=>`- ${p.kind}: ${p.name} ${p.version} — ${p.license} ([text](${p.file}))`).join('\n')}\n\n## License texts requiring review\n\n${missing.length?missing.map(n=>`- ${n}`).join('\n'):'None missing from this installed dependency inventory.'}\n`);
fs.writeFileSync(path.join(out,'inventory.json'),JSON.stringify(entries,null,2)+'\n');
console.log(`Collected ${entries.length} dependencies; ${missing.length} need license-text review.`);
if(missing.length)console.log(missing.join('\n'));
