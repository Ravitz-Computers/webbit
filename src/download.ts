import {sourceNodes} from './blocks';
import {invoke} from '@tauri-apps/api/core';
import {projectFromFiles,safeRelativePath,type SiteProject} from './project';
export type Resource={url:string;mime:string;data:string};
export async function downloadSite(raw:string,progress:(message:string)=>void,fetchResource:(url:string)=>Promise<Resource>=url=>invoke<Resource>('download_resource',{url})):Promise<SiteProject>{
 const initial=new URL(raw);if(initial.protocol!=='https:'||initial.username||initial.password)throw new Error('Use an HTTPS URL without credentials.');
 const queue=[initial.href],results=new Map<string,{path:string;text?:string;resource:Resource}>(),seen=new Set<string>();const pending=new Set(queue),warnings:string[]=[];let total=0;let origin=initial.origin;
 while(queue.length&&seen.size<60){const url=queue.shift()!;if(seen.has(url))continue;seen.add(url);progress(`Downloading ${seen.size} / 60: ${new URL(url).pathname}`);
  try{const resource=await fetchResource(url);if(results.size===0)origin=new URL(resource.url).origin;const bytes=Uint8Array.from(atob(resource.data),c=>c.charCodeAt(0));total+=bytes.length;if(total>30_000_000)throw new Error('Reached 30 MB import limit.');
   if(results.size===0&&resource.mime!=='text/html')throw new Error('The starting URL must return an HTML page.');
   const isHtml=resource.mime==='text/html',isText=isHtml||/css|javascript|json|text\/|xml|svg/.test(resource.mime);const ext=isHtml?'html':resource.mime==='text/css'?'css':/javascript/.test(resource.mime)?'js':new URL(resource.url).pathname.split('.').pop()?.replace(/[^a-z0-9]/gi,'').slice(0,10)||'bin';
   const path=results.size===0?'index.html':`downloaded/resource-${results.size}.${ext}`;const text=isText?new TextDecoder('utf-8',{fatal:true}).decode(bytes):undefined;results.set(url,{path,text,resource});results.set(resource.url,results.get(url)!);
   const refs:string[]=[];
   if(isHtml&&text){for(const node of sourceNodes(text)){for(const a of node.attrs){if(a.name==='src'||a.name==='poster'||(a.name==='href'&&['a','link'].includes(node.tagName)))refs.push(a.value);}}}
   if(resource.mime==='text/css'&&text)for(const match of text.matchAll(/url\(\s*['"]?([^)'"\s]+)['"]?\s*\)/g))refs.push(match[1]);
   for(const ref of refs){if(ref.startsWith('#'))continue;try{const next=new URL(ref,resource.url);next.hash='';if(next.origin!==origin||next.protocol!=='https:'||next.username||next.password||/\.(zip|exe|msi|dmg|iso|pdf|mp4|mp3)$/i.test(next.pathname))continue;if(!pending.has(next.href)&&pending.size<60){pending.add(next.href);queue.push(next.href);}}catch{}}
  }catch(e){if(!results.size)throw e;warnings.push(`${url}: ${String(e)}`);if(total>30_000_000)break;}
 }
 const files:Record<string,string>={},assets:Record<string,string>={};
 for(const {path,text,resource} of new Set(results.values())){if(!safeRelativePath(path))continue;const ref=(value:string)=>{try{const u=new URL(value,resource.url);const hash=u.hash;u.hash='';const target=results.get(u.href);if(!target)return u.href+hash;return (path.includes('/')?'../':'')+target.path+hash;}catch{return value;}};
  if(text!==undefined){let result=text;if(resource.mime==='text/html'){const edits:{start:number;end:number;value:string}[]=[];for(const node of sourceNodes(text)){const loc=node.sourceCodeLocation;if(!loc)continue;if(node.tagName==='base'){edits.push({start:loc.startOffset,end:loc.endOffset,value:''});continue;}for(const a of node.attrs){const range=loc.attrs?.[a.name];if(!range)continue;if(['href','src','poster'].includes(a.name))edits.push({start:range.startOffset,end:range.endOffset,value:a.name+'="'+ref(a.value).replace(/&/g,'&amp;').replace(/"/g,'&quot;')+'"'});else if(['integrity','srcset'].includes(a.name))edits.push({start:range.startOffset,end:range.endOffset,value:''});}}for(const edit of edits.sort((a,b)=>b.start-a.start))result=result.slice(0,edit.start)+edit.value+result.slice(edit.end);}else if(resource.mime==='text/css')result=text.replace(/url\(\s*(['"]?)([^)'"\s]+)\1\s*\)/g,(_m,_q,v)=>`url("${ref(v)}")`);files[path]=result;}else assets[path]=`data:${resource.mime};base64,${resource.data}`;
 }
 files['private/download-report.txt']=`Downloaded public static content from ${initial.href}\nLimit: 60 resources, 30 MB, 5 MB each. Server code, databases, authenticated pages and dynamically loaded resources are not copied. External links may remain online. UTF-8 text required.\n${warnings.join('\n')}`;
 return projectFromFiles(files,assets);
}

