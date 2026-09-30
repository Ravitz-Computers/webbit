import {sourceNodes,escapeHtml} from './blocks';
import {setElementAttribute} from './inspector';
import {elementRules,elementStates,updateElementRules,type ElementState} from './element-styles';
import {resolveLocalPath} from './project';
import type {CanvasRect} from './canvas';
export type CopyItem={id:number;rect:CanvasRect};
export type ElementClipboard={page:string;items:{markup:string;rect:CanvasRect}[];effects:Record<string,Partial<Record<ElementState,Record<string,string>>>>};
export function copyElements(source:string,page:string,items:CopyItem[]):ElementClipboard{
 const nodes=sourceNodes(source),ids=new Set(items.map(i=>i.id));
 const roots=items.filter((item,index)=>items.findIndex(i=>i.id===item.id)===index).filter(item=>{
  const node=nodes[item.id],loc=node?.sourceCodeLocation;
  if(!loc||['html','head','body','script','style','meta','link','title','base'].includes(node.tagName))throw Error('Select page elements to copy.');
  return ![...ids].some(id=>id!==item.id&&nodes[id]?.sourceCodeLocation&&nodes[id].sourceCodeLocation!.startOffset<loc.startOffset&&nodes[id].sourceCodeLocation!.endOffset>=loc.endOffset);
 }).sort((a,b)=>nodes[a.id].sourceCodeLocation!.startOffset-nodes[b.id].sourceCodeLocation!.startOffset);
 if(!roots.length)throw Error('Select elements to copy.');
 const effects:ElementClipboard['effects']={};
 for(const root of roots){const range=nodes[root.id].sourceCodeLocation!;nodes.forEach((n,id)=>{const loc=n.sourceCodeLocation,key=n.attrs.find(a=>a.name==='data-wb-style')?.value;if(key&&loc&&loc.startOffset>=range.startOffset&&loc.endOffset<=range.endOffset)effects[key]=Object.fromEntries(elementStates.map(state=>[state,{...elementRules(source,id,state)}]));});}
 return {page,items:roots.map(i=>({markup:source.slice(nodes[i.id].sourceCodeLocation!.startOffset,nodes[i.id].sourceCodeLocation!.endOffset),rect:{...i.rect}})),effects};
}
function rebase(value:string,from:string,to:string){
 if(from===to||!value||value.startsWith('#')||/^(?:[a-z][a-z0-9+.-]*:|\/)/i.test(value))return value;
 const path=resolveLocalPath(from,value);if(!path)return value;
 const url=new URL(value,'https://webbit.invalid/'+from),base=to.split('/');base.pop();const parts=path.split('/');while(base.length&&parts[0]===base[0]){base.shift();parts.shift();}
 return '../'.repeat(base.length)+parts.map(encodeURIComponent).join('/')+url.search+url.hash;
}
export function pasteElements(source:string,page:string,clipboard:ElementClipboard,point?:{x:number;y:number},offset=24,origin={x:0,y:0}):{source:string;tokens:string[]}{
 const body=sourceNodes(source).find(n=>n.tagName==='body'),end=body?.sourceCodeLocation?.endTag?.startOffset;if(end===undefined)throw Error('This page needs a closing body tag before pasting elements.');
 if(!clipboard.items.length)throw Error('Copy an element first.');
 const minX=Math.min(...clipboard.items.map(i=>i.rect.x)),minY=Math.min(...clipboard.items.map(i=>i.rect.y));
 const dx=point?point.x-minX:offset,dy=point?point.y-minY:offset;
 const suffix='-copy-'+crypto.randomUUID().slice(0,8),idMap=new Map<string,string>();
 for(const item of clipboard.items)for(const n of sourceNodes(item.markup)){const id=n.attrs.find(a=>a.name==='id')?.value;if(id)idMap.set(id,id+suffix);}
 const tokens:string[]=[],effectTargets:{token:string;key:string}[]=[];
 const markup=clipboard.items.map(item=>{
  let text=item.markup;const nodes=sourceNodes(text),root=nodes.findIndex(n=>n.sourceCodeLocation?.startOffset===0);
  if(root<0)throw Error('Copy the enclosing table or SVG instead of an isolated structural part.');
  const patches:{start:number;end:number;text:string}[]=[];
  for(const n of nodes)for(const a of n.attrs){const loc=n.sourceCodeLocation?.attrs?.[a.name];if(!loc)continue;let value=a.value;
   if(a.name==='id')value=idMap.get(value)??value;
   if(a.name==='data-wb-group')value=value+suffix;
   if(['for','form','list','headers','aria-controls','aria-labelledby','aria-describedby','aria-owns','aria-activedescendant'].includes(a.name))value=value.split(/\s+/).map(v=>idMap.get(v)??v).join(' ');
   if(['href','xlink:href'].includes(a.name)&&value.startsWith('#'))value='#'+(idMap.get(value.slice(1))??value.slice(1));
   if(['src','href','poster','action'].includes(a.name))value=rebase(value,clipboard.page,page);
   if(a.name==='style')value=value.replace(/url\(\s*(['"]?)(.*?)\1\s*\)/gi,(_m,_q,url)=>`url("${url.startsWith('#')?'#'+(idMap.get(url.slice(1))??url.slice(1)):rebase(url,clipboard.page,page)}")`);
   if(a.name.startsWith('data-webbit-')||a.name==='data-wb-canvas-id')patches.push({start:loc.startOffset,end:loc.endOffset,text:''});
   else if(value!==a.value)patches.push({start:loc.startOffset,end:loc.endOffset,text:`${a.name}="${escapeHtml(value)}"`});
  }
  for(const patch of patches.sort((a,b)=>b.start-a.start))text=text.slice(0,patch.start)+patch.text+text.slice(patch.end);
  const clean=sourceNodes(text);
  for(let id=clean.length-1;id>=0;id--){const n=clean[id];if(!n.sourceCodeLocation?.startTag)continue;const key=n.attrs.find(a=>a.name==='data-wb-style')?.value;if(id!==root&&!key)continue;const token='wb-'+crypto.randomUUID();text=setElementAttribute(text,id,'data-wb-canvas-id',token);if(id===root)tokens.push(token);if(key&&clipboard.effects[key])effectTargets.push({token,key});}
  const r=item.rect;if(Object.values(r).some(v=>!Number.isFinite(v)))throw Error('Invalid clipboard geometry.');
  const old=clean[root].attrs.find(a=>a.name==='style')?.value??'';
  return setElementAttribute(text,root,'style',old+`;position:absolute;inset:auto;translate:none;left:${Math.round(r.x+dx-origin.x)}px;top:${Math.round(r.y+dy-origin.y)}px;width:${Math.max(1,Math.round(r.width))}px;height:${Math.max(1,Math.round(r.height))}px;margin:0;box-sizing:border-box;max-width:none;display:block`);
 }).join('\n');
 source=source.slice(0,end)+'\n'+markup+'\n'+source.slice(end);
 for(const target of effectTargets)for(const state of elementStates){const id=sourceNodes(source).findIndex(n=>n.attrs.some(a=>a.name==='data-wb-canvas-id'&&a.value===target.token));source=updateElementRules(source,id,state,clipboard.effects[target.key][state]??{});}
 return {source,tokens};
}
