import {parse,type DefaultTreeAdapterMap} from 'parse5';
import {setElementAttribute} from './inspector';
import {sourceElement} from './preview';
type Node=DefaultTreeAdapterMap['node'];
type Element=DefaultTreeAdapterMap['element'];
export const escapeHtml=(s:string)=>s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
export function sourceNodes(source:string):Element[]{const result:Element[]=[];const walk=(n:Node)=>{if('tagName'in n)result.push(n);if('childNodes'in n)n.childNodes.forEach(walk);};walk(parse(source,{sourceCodeLocationInfo:true}));return result;}
const attr=(n:Element,key:string)=>n.attrs.find(a=>a.name===key)?.value;
export function blocks(source:string){const nodes=sourceNodes(source);return nodes.flatMap((node,id)=>{
  const parent=node.parentNode;
  const explicit=attr(node,'data-wb-block')??attr(node,'data-sec')??attr(node,'data-edit');
  if(!node.sourceCodeLocation?.endTag||['html','head','body','script','style'].includes(node.tagName))return [];
  if(explicit===undefined&&!(parent&&'tagName'in parent&&parent.tagName==='main'))return [];
  let depth=0,p=node.parentNode;while(p){if('tagName'in p&&(attr(p,'data-wb-block')!==undefined||attr(p,'data-sec')!==undefined))depth++;p='parentNode'in p?p.parentNode:null;}
  return [{id,depth,label:explicit||attr(node,'id')||`${node.tagName} ${id}`,tag:node.tagName,start:node.sourceCodeLocation.startOffset,end:node.sourceCodeLocation.endOffset}];
});}
export function blockFields(source:string,id:number){const selected=sourceElement(source,id)?.sourceCodeLocation;if(!selected)return [];return sourceNodes(source).flatMap((node,index)=>{
 const loc=node.sourceCodeLocation;if(!loc||loc.startOffset<selected.startOffset||loc.endOffset>selected.endOffset)return [];
 if(['h1','h2','h3','h4','p','span','a','button','summary','figcaption','li','td','th'].includes(node.tagName)&&node.childNodes.length&&node.childNodes.every(n=>n.nodeName==='#text'))return [{id:index,label:node.tagName,value:node.childNodes.map(n=>'value'in n?n.value:'').join(''),kind:'text'}];
 if(node.tagName==='img')return [{id:index,label:'Image description',value:attr(node,'alt')??'',kind:'alt'}];return [];
});}
export function insertMarkup(source:string,markup:string,parentId?:number){
 const parent=parentId===undefined?sourceNodes(source).find(n=>n.tagName==='main')??sourceNodes(source).find(n=>n.tagName==='body'):sourceElement(source,parentId);
 const at=parent?.sourceCodeLocation?.endTag?.startOffset;if(at===undefined)throw new Error('Choose an HTML page with a closing body or main tag.');
 return source.slice(0,at)+`\n${markup}\n`+source.slice(at);
}
export function duplicateBlock(source:string,id:number){const loc=sourceElement(source,id)?.sourceCodeLocation;if(!loc)throw new Error('Select a block.');let copy=source.slice(loc.startOffset,loc.endOffset);const suffix=`-copy-${Math.random().toString(36).slice(2,9)}`;
 const nodes=sourceNodes(copy),ids=new Map(nodes.flatMap(n=>attr(n,'id')?[[attr(n,'id')!,attr(n,'id')!+suffix] as const]:[]));
 const edits:{start:number;end:number;text:string}[]=[];
 nodes.forEach(n=>n.attrs.forEach(a=>{const loc=n.sourceCodeLocation?.attrs?.[a.name];if(!loc)return;let value=a.value;
 if(a.name==='id')value=ids.get(value)??value;
 if(['aria-controls','aria-labelledby','aria-describedby','for','headers'].includes(a.name))value=value.split(' ').map(v=>ids.get(v)??v).join(' ');
 if(a.name==='href'&&value.startsWith('#')&&ids.has(value.slice(1)))value='#'+ids.get(value.slice(1));
 if(value!==a.value)edits.push({start:loc.startOffset,end:loc.endOffset,text:`${a.name}="${escapeHtml(value)}"`});}));
 edits.sort((a,b)=>b.start-a.start).forEach(e=>{copy=copy.slice(0,e.start)+e.text+copy.slice(e.end);});return source.slice(0,loc.endOffset)+'\n'+copy+source.slice(loc.endOffset);
}
export const blockTypes=[['section','Layout','Section'],['text','Content','Text'],['hero','Content','Hero'],['columns','Layout','Two columns'],['accordion','Interactive','Accordion'],['tabs','Interactive','Tabs'],['slider','Interactive','Slide gallery'],['filter','Data','Filterable list']] as const;
export function blockMarkup(kind:string,title:string,items:string){const heading=escapeHtml(title||'Your heading');const rows=items.split('\n').map(s=>s.trim()).filter(Boolean).slice(0,30);if(!rows.length)rows.push('First item','Second item','Third item');const uid='wb-'+Math.random().toString(36).slice(2,10);const start=`<section data-wb-block="${heading}"`;
 if(kind==='section')return `${start}><h2>${heading}</h2></section>`;
 if(kind==='hero')return `${start} class="hero"><h1>${heading}</h1><p>${escapeHtml(rows[0])}</p><a href="#contact">Get in touch</a></section>`;
 if(kind==='columns')return `${start} style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,220px),1fr));gap:1rem">${rows.slice(0,2).map(t=>`<article data-wb-block="Column"><h2>${escapeHtml(t)}</h2><p>Edit this column.</p></article>`).join('')}</section>`;
 if(kind==='accordion')return `${start} data-wb-component="accordion"><h2>${heading}</h2>${rows.map(t=>`<details><summary>${escapeHtml(t)}</summary><p>Edit this answer.</p></details>`).join('')}</section>`;
 if(kind==='tabs')return `${start} data-wb-component="tabs"><h2>${heading}</h2><div role="tablist" aria-label="${heading}">${rows.map((t,i)=>`<button type="button" role="tab" data-wb-tab id="${uid}-tab-${i}" aria-controls="${uid}-panel-${i}">${escapeHtml(t)}</button>`).join('')}</div>${rows.map((t,i)=>`<div role="tabpanel" data-wb-panel id="${uid}-panel-${i}" aria-labelledby="${uid}-tab-${i}"><p>${escapeHtml(t)}: edit this content.</p></div>`).join('')}</section>`;
 if(kind==='slider')return `${start} data-wb-component="slider" aria-label="${heading}"><h2>${heading}</h2>${rows.map(t=>`<figure data-wb-panel><figcaption>${escapeHtml(t)}</figcaption><p>Add an image using the source editor or file insertion.</p></figure>`).join('')}<button type="button" data-wb-prev aria-label="Previous slide">Previous</button> <span data-wb-status aria-live="polite"></span> <button type="button" data-wb-next aria-label="Next slide">Next</button></section>`;
 if(kind==='filter')return `${start} data-wb-component="filter"><h2>${heading}</h2><label>Search <input type="search" placeholder="Filter items"></label><p data-wb-status aria-live="polite"></p><ul>${rows.map(t=>`<li data-wb-row>${escapeHtml(t)}</li>`).join('')}</ul></section>`;
 return `${start}><h2>${heading}</h2>${rows.map(t=>`<p>${escapeHtml(t)}</p>`).join('')}</section>`;
}
export const renameBlock=(source:string,id:number,name:string)=>setElementAttribute(source,id,'data-wb-block',name);
