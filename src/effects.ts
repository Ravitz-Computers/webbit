import type {SiteProject} from './project';
import {sourceNodes} from './blocks';
import {setElementAttribute} from './inspector';
import runtime from './enhancements.js?raw';
import baseCss from './enhancements.css?raw';
export const effects=[
 {id:'stripes',name:'Diagonal stripes',category:'Background',block:true,css:'background-image:repeating-linear-gradient(135deg,#8881 0 12px,transparent 12px 24px)'},
 {id:'checker',name:'Soft checkerboard',category:'Background',block:true,css:'background-image:conic-gradient(#8882 25%,transparent 0 50%,#8882 0 75%,transparent 0);background-size:36px 36px'},
 {id:'sunrise',name:'Sunrise wash',category:'Background',block:true,css:'background-image:linear-gradient(140deg,#ffb86533,#f46b9633,#735cdd22)'},
 {id:'ocean',name:'Ocean wash',category:'Background',block:true,css:'background-image:linear-gradient(140deg,#22c5b733,#498de533,#8148dd22)'},
 {id:'vignette',name:'Inset vignette',category:'Decoration',block:true,onlyBlock:true,css:'box-shadow:inset 0 0 80px #0003'},
 {id:'glass',name:'Frosted panel',category:'Decoration',block:true,onlyBlock:true,css:'background-color:#ffffff99;backdrop-filter:blur(10px);border:1px solid #ffffff66;border-radius:16px'},
 {id:'halo',name:'Violet halo',category:'Decoration',block:true,onlyBlock:true,css:'box-shadow:0 0 36px #8b5cf650;border-radius:12px'},
 {id:'underline',name:'Accent underline',category:'Typography',block:true,onlyBlock:true,css:'text-decoration:underline;text-decoration-color:#8b5cf6;text-decoration-thickness:3px;text-underline-offset:7px'},
 {id:'emboss',name:'Embossed text',category:'Typography',block:true,onlyBlock:true,css:'text-shadow:0 1px #ffffff88,0 -1px #00000044'},
 {id:'tracking',name:'Spaced lettering',category:'Typography',block:true,onlyBlock:true,css:'letter-spacing:.12em'},
 {id:'hover-outline',name:'Hover outline',category:'Interaction',block:true,onlyBlock:true,css:'transition:outline-color .2s;outline:2px solid transparent;outline-offset:4px',hover:'outline-color:#8b5cf6'},
 {id:'hover-warm',name:'Warm hover tint',category:'Interaction',block:true,onlyBlock:true,css:'transition:background-color .2s',hover:'background-color:#fbbf2422'},

 {id:'glow',name:'Soft cursor glow',category:'Pointer',block:true,css:''},
 {id:'spotlight',name:'Pointer spotlight',category:'Pointer',block:true,css:''},
 {id:'aurora',name:'Ambient gradient',category:'Background',block:true,css:'background-image:linear-gradient(120deg,#8b5cf622,#14b8a633,#f59e0b22);background-size:200% 200%;animation:wb-aurora 10s ease-in-out infinite alternate'},
 {id:'dots',name:'Dot texture',category:'Background',block:true,css:'background-image:radial-gradient(#8885 1px,transparent 1px);background-size:18px 18px'},
 {id:'grid',name:'Fine grid',category:'Background',block:true,css:'background-image:linear-gradient(#8882 1px,transparent 1px),linear-gradient(90deg,#8882 1px,transparent 1px);background-size:28px 28px'},
 {id:'reveal',name:'Scroll reveal',category:'Entrance',block:true,onlyBlock:true,css:''},
 {id:'lift',name:'Hover lift',category:'Interaction',block:true,onlyBlock:true,css:'transition:translate .2s,box-shadow .2s',hover:'translate:0 -4px;box-shadow:0 14px 32px #0002'},
 {id:'border',name:'Accent border',category:'Decoration',block:true,onlyBlock:true,css:'border:1px solid #8b5cf699;border-radius:12px'},
 {id:'shadow',name:'Soft depth',category:'Decoration',block:true,onlyBlock:true,css:'box-shadow:0 12px 38px #0002;border-radius:12px'},
 {id:'chromatic',name:'Chromatic text',category:'Typography',block:true,onlyBlock:true,css:'text-shadow:2px 0 #ff3b6b80,-2px 0 #38bdf880'}
];
const selector=(id:string)=>`:is([data-wb-fx~="${id}"],[data-wb-site-fx~="${id}"])`;
export const enhancementCss=baseCss.replace('/* WB_EFFECT_RULES */',effects.map(e=>`${selector(e.id)}{${e.css}}${'hover'in e?`@media(hover:hover) and (prefers-reduced-motion:no-preference){${selector(e.id)}:hover{${e.hover}}}`:''}`).join('\n'));
export const enhancementJs=runtime.replace('export function mountWebbit','function mountWebbit')+'\nmountWebbit(document);\n';
export function withEnhancements(files:Record<string,string>,page:string){
 const next={...files};let source=next[page];if(source===undefined)throw new Error('Select an HTML page.');
 // Refuse to overwrite an unrelated file at our reserved runtime path.
 for(const [path,value] of [['assets/webbit/enhancements.css',enhancementCss],['assets/webbit/enhancements.js',enhancementJs]]){if(next[path]!==undefined&&next[path]!==value)throw new Error(`Runtime path already exists: ${path}. Rename it before inserting Webbit enhancements.`);next[path]=value;}
 const prefix='../'.repeat(page.split('/').length-1)+'assets/webbit/';
 if(!source.includes('data-wb-runtime="css"')){if(!/<\/head\s*>/i.test(source))throw new Error('Page needs a closing head tag.');source=source.replace(/<\/head\s*>/i,`<link data-wb-runtime="css" rel="stylesheet" href="${prefix}enhancements.css">\n</head>`);}
 if(!source.includes('data-wb-runtime="js"')){if(!/<\/body\s*>/i.test(source))throw new Error('Page needs a closing body tag.');source=source.replace(/<\/body\s*>/i,`<script data-wb-runtime="js" src="${prefix}enhancements.js" defer></script>\n</body>`);}
 next[page]=source;return next;
}
export function effectValues(source:string,id:number,site=false){return sourceNodes(source)[id]?.attrs.find(a=>a.name===(site?'data-wb-site-fx':'data-wb-fx'))?.value.split(' ').filter(Boolean)??[];}
export function applyEffects(project:SiteProject,page:string,scope:'site'|'page'|'block',ids:string[],blockId:number|null){
 const valid=effects.filter(e=>scope==='block'||!('onlyBlock'in e)).map(e=>e.id);if(ids.some(id=>!valid.includes(id)))throw new Error('Effect incompatible with this scope.');
 let files={...project.files};const pages=scope==='site'?Object.keys(files).filter(p=>/\.html?$/i.test(p)):[page];
 for(const path of pages){if(!/\.html?$/i.test(path))throw new Error('Effects require an HTML page.');const nodes=sourceNodes(files[path]);const id=scope==='block'?blockId:nodes.findIndex(n=>n.tagName==='body');if(id===null||id<0)throw new Error('Select a compatible block.');files[path]=setElementAttribute(files[path],id,scope==='site'?'data-wb-site-fx':'data-wb-fx',ids.join(' '));files=withEnhancements(files,path);}
 return files;
}
