import { parse, type DefaultTreeAdapterMap } from 'parse5';
import type { SiteProject } from './project';
export type ManagedField={id:string;page:string;label:string;value:string;kind:'text'|'image'|'metadata';start:number;end:number;attribute?:'src'|'content'|'alt'};
export function analyzeSite(project:SiteProject):ManagedField[]{
  const fields:ManagedField[]=[];
  for(const[page,source]of Object.entries(project.files)){
    if(!/\.html?$/i.test(page))continue;
    let index=0;
    const visit=(node:DefaultTreeAdapterMap['node'])=>{
      if('tagName'in node){
        const value=node.childNodes.map(c=>'value'in c?c.value:'').join('');
        const get=(key:string)=>node.attrs.find(a=>a.name===key)?.value;
        const loc=node.sourceCodeLocation;
        const id=()=>`${encodeURIComponent(page)}.${index++}`;
        if(['h1','h2','h3','p','li','button'].includes(node.tagName)&&value.trim()&&node.childNodes.every(c=>c.nodeName==='#text')&&loc?.startTag&&loc.endTag)fields.push({id:id(),page,label:`${node.tagName.toUpperCase()}: ${value.slice(0,50)}`,value,kind:'text',start:loc.startTag.endOffset,end:loc.endTag.startOffset});
        for(const attribute of ['src','alt','content'] as const){
          const matches=(node.tagName==='img'&&attribute!=='content')||(node.tagName==='meta'&&get('name')==='description'&&attribute==='content');
          const attrLoc=loc?.attrs?.[attribute];
          if(matches&&attrLoc)fields.push({id:id(),page,label:attribute==='content'?'Search description':attribute==='alt'?'Image description':get('alt')||'Image',value:get(attribute)??'',kind:attribute==='src'?'image':'metadata',attribute,start:attrLoc.startOffset,end:attrLoc.endOffset});
        }
      }
      if('childNodes'in node)node.childNodes.forEach(visit);
    };visit(parse(source,{sourceCodeLocationInfo:true}));
  }return fields;
}

export async function managerSchema(project:SiteProject,selected:ReadonlySet<string>){
  const fields=analyzeSite(project).filter(field=>selected.has(field.id));
  if(!fields.length)throw new Error('Select at least one managed field.');
  const pages=[];
  for(const path of [...new Set(fields.map(f=>f.page))]){
    const source=project.files[path],segments:(string|{field:string;initial:string;original:string;attribute?:string})[]=[];
    let offset=0;
    for(const field of fields.filter(f=>f.page===path).sort((a,b)=>a.start-b.start)){
      if(field.start<offset)throw new Error('Managed fields overlap.');
      segments.push(source.slice(offset,field.start),{field:field.id,initial:field.value,original:source.slice(field.start,field.end),...(field.attribute?{attribute:field.attribute}:{})});offset=field.end;
    }
    segments.push(source.slice(offset));
    const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(source))),b=>b.toString(16).padStart(2,'0')).join('');
    pages.push({path,hash,segments});
  }
  return {version:1,securityRuntime:'webbit-php-1',name:project.name,fields,pages};
}
