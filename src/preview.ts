import { parse, serialize, type DefaultTreeAdapterMap } from 'parse5';
import { resolveLocalPath, type SiteProject } from './project';
type Node = DefaultTreeAdapterMap['node'];
type Element = DefaultTreeAdapterMap['element'];
const textTags = new Set(['h1','h2','h3','h4','h5','h6','p','a','span','strong','em','b','i','li','button','label','figcaption','small','td','th','summary']);
function elements(node:Node):Element[] {
  const found:Element[]=[];
  const visit=(n:Node)=>{if('tagName' in n)found.push(n); if('childNodes' in n)n.childNodes.forEach(visit);};visit(node);return found;
}
function isEditable(node:Element):boolean {return textTags.has(node.tagName)&&node.childNodes.length>0&&node.childNodes.every(c=>c.nodeName==='#text')&&!!node.sourceCodeLocation?.startTag&&!!node.sourceCodeLocation?.endTag;}
function attr(node:Element,name:string):string|undefined{return node.attrs.find(a=>a.name===name)?.value;}
function setAttr(node:Element,name:string,value:string){node.attrs=node.attrs.filter(a=>a.name!==name);node.attrs.push({name,value});}
function escapeText(value:string):string{return value.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}

export function sourceElement(source:string,id:number):Element|null{return elements(parse(source,{sourceCodeLocationInfo:true}))[id]??null;}
export function replaceElementText(source:string,id:number,value:string):string {
  const node=sourceElement(source,id); if(!node||!isEditable(node))throw new Error('This element requires source editing.');
  const loc=node.sourceCodeLocation!;
  return source.slice(0,loc.startTag!.endOffset)+escapeText(value)+source.slice(loc.endTag!.startOffset);
}
export function replaceDirectText(source:string,id:number,index:number,value:string):string {
  const node=sourceElement(source,id);
  if(!node||['script','style','textarea','title'].includes(node.tagName))throw new Error('Select visible page text.');
  const text=node.childNodes.filter(n=>n.nodeName==='#text')[index];
  const loc=text?.sourceCodeLocation;
  if(!loc)throw new Error('Text no longer matches the source.');
  return source.slice(0,loc.startOffset)+escapeText(value)+source.slice(loc.endOffset);
}
export function sourceOffset(source:string,id:number):number{return sourceElement(source,id)?.sourceCodeLocation?.startOffset??0;}
export function previewDocument(project:SiteProject,page:string):string {
  const doc=parse(project.files[page]??'',{sourceCodeLocationInfo:true});
  const nodes=elements(doc);
  const head=nodes.find(n=>n.tagName==='head')!;
  const asset=(ref:string,base=page)=>{if(/^#[^\s"'<>]*$/.test(ref))return ref;if(/^data:(?:image\/(?:png|jpeg|gif|webp|avif|bmp|x-icon|svg\+xml)|font\/(?:woff2?|ttf|otf)|application\/(?:font-woff|x-font-ttf)|audio\/(?:mpeg|ogg|wav)|video\/(?:mp4|webm))(?:;[^,]*)?,/i.test(ref))return ref;const p=resolveLocalPath(base,ref);if(!p)return undefined;return /\.svg$/i.test(p)&&project.files[p]!==undefined?`data:image/svg+xml;charset=utf-8,${encodeURIComponent(project.files[p])}`:project.assets[p];};
  const css=(text:string,base=page)=>text.replace(/url\(\s*(['"]?)(.*?)\1\s*\)/gi,(_m,_q,url)=>`url("${asset(url,base)??''}")`);
  nodes.forEach((node,id)=>{
    if(['script','iframe','object','embed','base'].includes(node.tagName)||(node.tagName==='meta'&&attr(node,'http-equiv'))) {
      if(node.parentNode&&'childNodes'in node.parentNode)node.parentNode.childNodes=node.parentNode.childNodes.filter(c=>c!==node);return;
    }
    node.attrs=node.attrs.filter(a=>!a.name.startsWith('on')&&!['srcdoc','contenteditable','autofocus','srcset','ping'].includes(a.name)&&!a.name.startsWith('data-webbit-'));
    setAttr(node,'data-webbit-node',String(id));
    if(isEditable(node)){setAttr(node,'contenteditable','plaintext-only');setAttr(node,'spellcheck','true');}
    if(node.tagName==='link'){
      const path=resolveLocalPath(page,attr(node,'href')??'');
      if(attr(node,'rel')==='stylesheet'&&path&&project.files[path]!==undefined){node.tagName='style';node.nodeName='style';node.attrs=[];node.childNodes=[{nodeName:'#text',value:css(project.files[path],path),parentNode:node}];return;}
      else if(node.parentNode&&'childNodes'in node.parentNode)node.parentNode.childNodes=node.parentNode.childNodes.filter(c=>c!==node);
    }
    if(node.tagName==='style')for(const child of node.childNodes)if('value'in child)child.value=css(child.value);
    for(const name of ['src','poster']){const value=attr(node,name);if(value)setAttr(node,name,asset(value)??'');}
    if(attr(node,'style'))setAttr(node,'style',css(attr(node,'style')!));
    if(['image','use'].includes(node.tagName)&&node.namespaceURI==='http://www.w3.org/2000/svg'){for(const a of node.attrs)if(a.name==='href')a.value=asset(a.value)??'';}
    if(node.tagName==='form')setAttr(node,'action','');
  });
  const security=parse(`<head><meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data:; media-src data:; font-src data:; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'"><style>[contenteditable]:hover{outline:1px dashed #269887;outline-offset:4px}[contenteditable]:focus{outline:2px solid #269887;outline-offset:4px}body{overflow-wrap:anywhere}</style></head>`);
  const additions=elements(security).find(n=>n.tagName==='head')!.childNodes;
  additions.forEach(n=>{n.parentNode=head});head.childNodes.unshift(...additions);
  return serialize(doc);
}

