import {projectFromFiles,safeRelativePath,type SiteProject} from './project';

export type ImportBatch={root?:string;files:Record<string,string>;assets:Record<string,string>;skipped:string[]};
export function importPaths(batch:ImportBatch):string[]{return [...new Set([...Object.keys(batch.files),...Object.keys(batch.assets)])].sort();}
export function planImport(project:SiteProject,batch:ImportBatch,prefix=''){
  prefix=prefix.trim().replace(/\/$/,'');
  if(prefix&&!safeRelativePath(prefix))throw new Error('Use a relative destination folder, such as assets or scripts.');
  const existing=new Map([...Object.keys(project.files),...Object.keys(project.assets)].map(p=>[p.toLowerCase(),p]));
  const seen=new Set<string>();
  return importPaths(batch).map(path=>{
    const destination=prefix?`${prefix}/${path}`:path;
    if(!safeRelativePath(destination)||seen.has(destination.toLowerCase()))throw new Error(`Unsafe or duplicate import path: ${destination}`);
    seen.add(destination.toLowerCase());
    const conflict=existing.get(destination.toLowerCase());
    const hierarchy=[...existing.keys()].find(p=>p!==destination.toLowerCase()&&(p.startsWith(destination.toLowerCase()+'/')||destination.toLowerCase().startsWith(p+'/')));
    if(hierarchy)throw new Error(`A file and folder conflict at ${destination}. Choose another destination folder.`);
    return {path,destination,conflict};
  });
}
export function mergeImport(project:SiteProject,batch:ImportBatch,prefix:string,replace:boolean):SiteProject{
  const files={...project.files},assets={...project.assets};
  for(const item of planImport(project,batch,prefix)){
    if(item.conflict&&!replace)continue;
    if(item.conflict){delete files[item.conflict];delete assets[item.conflict];}
    const destination=item.conflict??item.destination;
    if(batch.files[item.path]!==undefined)files[destination]=batch.files[item.path];
    if(batch.assets[item.path]!==undefined)assets[destination]=batch.assets[item.path];
  }
  return {...project,files,assets};
}
export function importedSite(batch:ImportBatch,stripRoot:boolean):SiteProject{
  let files=batch.files,assets=batch.assets;
  const paths=importPaths(batch),root=paths[0]?.split('/')[0];
  if(stripRoot&&root&&paths.every(p=>p.startsWith(root+'/'))){
    files=Object.fromEntries(Object.entries(files).map(([p,v])=>[p.slice(root.length+1),v]));
    assets=Object.fromEntries(Object.entries(assets).map(([p,v])=>[p.slice(root.length+1),v]));
  }
  const site=projectFromFiles(files,assets);
  const index=Object.keys(files).find(p=>/^index\.(?:html?|php)$/i.test(p));
  if(index&&!files['webbit.json'])site.entry=index;
  return site;
}
export function elementMarkup(path:string,page:string):{markup:string;head:boolean}{
  const pageParts=page.split('/');pageParts.pop();
  const parts=path.split('/');while(pageParts.length&&parts[0]===pageParts[0]){pageParts.shift();parts.shift();}
  const url=[...pageParts.map(()=>'..'),...parts.map(encodeURIComponent)].join('/');
  const label=path.split('/').pop()!.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;');
  if(/\.(png|jpe?g|gif|webp|svg|avif|bmp|ico)$/i.test(path))return {markup:`<figure><img src="${url}" alt="Describe this image" style="max-width:100%;height:auto"></figure>`,head:false};
  if(/\.css$/i.test(path))return {markup:`<link rel="stylesheet" href="${url}">`,head:true};
  if(/\.(?:woff2?|ttf|otf)$/i.test(path)){
    const family='Imported_'+path.split('/').pop()!.replace(/\.[^.]+$/,'').replace(/[^a-z0-9_]/gi,'_');
    return {markup:`<style>@font-face{font-family:"${family}";src:url("${url}");font-display:swap}</style>`,head:true};
  }
  if(/\.(?:js|mjs)$/i.test(path))return {markup:`<script src="${url}"${/\.mjs$/i.test(path)?' type="module"':' defer'}></script>`,head:false};
  if(/\.(?:mp4|webm|ogv)$/i.test(path))return {markup:`<video controls src="${url}" style="max-width:100%"></video>`,head:false};
  if(/\.(?:mp3|wav|ogg|m4a|flac)$/i.test(path))return {markup:`<audio controls src="${url}"></audio>`,head:false};
  return {markup:`<a href="${url}">${label}</a>`,head:false};
}
