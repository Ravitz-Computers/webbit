import {sourceElement} from './preview';
const editableAttributes=new Set(['id','class','title','alt','href','src','style','data-wb-block','data-wb-fx','data-wb-site-fx']);
const escapeAttribute=(value:string)=>value.replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
export function setElementAttribute(source:string,id:number,name:string,value:string):string {
  if(!/^[a-zA-Z_:][a-zA-Z0-9_.:-]*$/.test(name)||/^on/i.test(name)||name.toLowerCase()==='srcdoc')throw new Error('Use the ribbon code editor for event handlers or embedded HTML.');
  if(['href','src','action','formaction','poster','xlink:href','data'].includes(name)&&(/^[\s\u0000-\u001f]*[^/]*:/i.test(value)&&!/^https?:\/\//i.test(value)&&!(name==='href'&&/^(mailto|tel):/i.test(value))))throw new Error('Use a local path or an HTTP, HTTPS, mail or telephone link.');
  if(/[\u0000-\u001f]/.test(value))throw new Error('Control characters are not allowed.');
  const node=sourceElement(source,id),location=node?.sourceCodeLocation;
  if(!location?.startTag)throw new Error('Select a source element first.');
  const replacement=`${name}="${escapeAttribute(value)}"`;
  const existing=location.attrs?.[name.toLowerCase()];
  if(existing)return source.slice(0,existing.startOffset)+replacement+source.slice(existing.endOffset);
  let offset=location.startTag.endOffset-1;
  if(source[offset-1]==='/')offset--;
  return source.slice(0,offset)+` ${replacement}`+source.slice(offset);
}
export function removeElement(source:string,id:number):string {
  const node=sourceElement(source,id),location=node?.sourceCodeLocation;
  if(!location||!node||['html','head','body'].includes(node.tagName))throw new Error('Select a content element to remove.');
  return source.slice(0,location.startOffset)+source.slice(location.endOffset);
}
export function moveElement(source:string,id:number,direction:'up'|'down'):string {
  const node=sourceElement(source,id),location=node?.sourceCodeLocation;
  if(!node||!location||['html','head','body'].includes(node.tagName)||!node.parentNode||!('childNodes'in node.parentNode))throw new Error('Select a content element to move.');
  const siblings=node.parentNode.childNodes.filter(n=>'tagName'in n&&n.sourceCodeLocation);
  const index=siblings.indexOf(node),other=siblings[index+(direction==='up'?-1:1)];
  if(!other?.sourceCodeLocation)return source;
  const a=direction==='up'?other.sourceCodeLocation:location,b=direction==='up'?location:other.sourceCodeLocation;
  return source.slice(0,a.startOffset)+source.slice(b.startOffset,b.endOffset)+source.slice(a.endOffset,b.startOffset)+source.slice(a.startOffset,a.endOffset)+source.slice(b.endOffset);
}


export function removeElementAttribute(source:string,id:number,name:string):string {const loc=sourceElement(source,id)?.sourceCodeLocation?.attrs?.[name.toLowerCase()];if(!loc)return source;return source.slice(0,loc.startOffset)+source.slice(loc.endOffset);}
