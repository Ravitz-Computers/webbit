import {sourceNodes} from './blocks';
import {setElementAttribute,removeElementAttribute} from './inspector';
import type {CanvasRect} from './canvas';
export type CanvasEdit={kind:'group';ids:number[]}|{kind:'ungroup';ids:number[]}|{kind:'delete';ids:number[]}|{kind:'style';selectionIds?:number[];items:{id:number;css:string}[]}|{kind:'move';parent:number;items:{id:number;rect:CanvasRect}[]};
export function editCanvas(source:string,edit:CanvasEdit):string{
 const nodes=sourceNodes(source);const requested='ids' in edit?edit.ids:edit.items.map(i=>i.id);
 const ids=[...new Set(requested)].filter(id=>{const n=nodes[id],l=n?.sourceCodeLocation;if(!l||['html','head','body','script','style','meta','link','title','base'].includes(n.tagName))throw Error('Select visible page content, not the document shell.');return !requested.some(other=>other!==id&&nodes[other]?.sourceCodeLocation&&nodes[other].sourceCodeLocation!.startOffset<l.startOffset&&nodes[other].sourceCodeLocation!.endOffset>=l.endOffset);});
 if(edit.kind==='group'||edit.kind==='ungroup'){
  if(edit.kind==='group'&&ids.length<2)throw Error('Select two or more elements to group.');
  const token='group-'+crypto.randomUUID();
  for(const id of ids.sort((a,b)=>b-a))source=edit.kind==='group'?setElementAttribute(source,id,'data-wb-group',token):removeElementAttribute(source,id,'data-wb-group');
  return source;
 }
 const ranges=ids.map(id=>({id,...nodes[id].sourceCodeLocation!}));
 if(edit.kind==='style'){for(const r of ranges.sort((a,b)=>b.startOffset-a.startOffset)){const css=edit.items.find(i=>i.id===r.id)!.css;if(/[<>\x00-\x1f]/.test(css))throw Error('Invalid geometry');const old=nodes[r.id].attrs.find(a=>a.name==='style')?.value??'';source=setElementAttribute(source,r.id,'style',old+';'+css);}return source;}
 let insert='',at=0,parentStart=0;
 if(edit.kind==='move'){
  const parent=nodes[edit.parent],loc=parent?.sourceCodeLocation;if(!loc?.endTag||!['body','main','section','article','div','header','footer','aside','nav','figure','form','fieldset','li','td','th'].includes(parent.tagName))throw Error('Drop into a page container.');
  if(ranges.some(r=>loc.startOffset>=r.startOffset&&loc.endOffset<=r.endOffset))throw Error('Cannot move a selection inside itself.');
  at=loc.endTag.startOffset;parentStart=loc.startOffset;
  insert=ranges.sort((a,b)=>a.startOffset-b.startOffset).map(r=>{const rect=edit.items.find(i=>i.id===r.id)!.rect;if(Object.values(rect).some(v=>!Number.isFinite(v)))throw Error('Invalid placement');let markup=source.slice(r.startOffset,r.endOffset);const mid=sourceNodes(markup).findIndex(n=>n.sourceCodeLocation?.startOffset===0);if(mid<0)throw Error('This element needs its enclosing HTML structure. Move its container instead.');const old=nodes[r.id].attrs.find(a=>a.name==='style')?.value??'';return setElementAttribute(markup,mid,'style',old+`;position:absolute;inset:auto;left:${Math.round(rect.x)}px;top:${Math.round(rect.y)}px;width:${Math.max(1,Math.round(rect.width))}px;height:${Math.max(1,Math.round(rect.height))}px;margin:0;translate:none;box-sizing:border-box;max-width:none;display:block`);}).join('\n');
 }
 const beforeAt=ranges.filter(r=>r.endOffset<=at).reduce((n,r)=>n+r.endOffset-r.startOffset,0),beforeParent=ranges.filter(r=>r.endOffset<=parentStart).reduce((n,r)=>n+r.endOffset-r.startOffset,0);
 for(const r of ranges.sort((a,b)=>b.startOffset-a.startOffset))source=source.slice(0,r.startOffset)+source.slice(r.endOffset);
 if(edit.kind==='delete')return source;
 source=source.slice(0,at-beforeAt)+insert+source.slice(at-beforeAt);
 const pid=sourceNodes(source).findIndex(n=>n.sourceCodeLocation?.startOffset===parentStart-beforeParent),parent=sourceNodes(source)[pid];
 const height=Math.ceil(Math.max(...edit.items.map(i=>i.rect.y+i.rect.height))+24);const old=parent.attrs.find(a=>a.name==='style')?.value??'';
 return setElementAttribute(source,pid,'style',old+`;position:relative;min-height:max(${height}px, ${old.match(/min-height\s*:\s*([^;]+)/)?.[1]??'0px'})`);
}

export function editCanvasSelection(source:string,edit:CanvasEdit):{source:string;tokens:string[]}{
 if(edit.kind==='delete')return {source:editCanvas(source,edit),tokens:[]};
 const tokens:string[]=[];
 for(const id of [...new Set((edit.kind==='style'&&edit.selectionIds?edit.selectionIds:'ids' in edit?edit.ids:edit.items.map(i=>i.id)))].sort((a,b)=>b-a)){const node=sourceNodes(source)[id];if(!node)throw Error('Selection changed. Select it again.');const token=node.attrs.find(a=>a.name==='data-wb-canvas-id')?.value??'wb-'+crypto.randomUUID();tokens.push(token);source=setElementAttribute(source,id,'data-wb-canvas-id',token);}
 return {source:editCanvas(source,edit),tokens};
}

