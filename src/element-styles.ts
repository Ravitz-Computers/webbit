import {sourceElement} from './preview';
import {sourceNodes} from './blocks';
import {setElementAttribute} from './inspector';
export const elementStates=['normal','hover','focus','active','disabled'] as const;
export type ElementState=typeof elementStates[number];
type Rules=Partial<Record<ElementState,Record<string,string>>>;
type Config=Record<string,Rules>;
const keyPattern=/^wb-[a-f0-9]{24}$/;
function configuration(source:string):Config{const node=sourceNodes(source).find(n=>n.tagName==='script'&&n.attrs.some(a=>a.name==='data-wb-element-config'));if(!node)return {};try{const value=JSON.parse(node.childNodes.map(n=>'value'in n?n.value:'').join(''));if(!value||typeof value!=='object'||Array.isArray(value))throw new Error();return value;}catch{throw new Error('Element effect settings are invalid. Repair data-wb-element-config in Source.');}}
function styleKey(source:string,id:number){return sourceElement(source,id)?.attrs.find(a=>a.name==='data-wb-style')?.value??'';}
export function elementRules(source:string,id:number,state:ElementState):Record<string,string>{return configuration(source)[styleKey(source,id)]?.[state]??{};}
function declarations(values:Record<string,string>){return Object.entries(values).map(([name,value])=>{if(!/^(?:--)?[a-z][a-z0-9-]*$/i.test(name)||typeof value!=='string'||/[{};<>\u0000-\u001f]/.test(value))throw new Error('Use one CSS value per property.');return `${name}:${value}`;}).join(';');}
export function updateElementRules(source:string,id:number,state:ElementState,values:Record<string,string>):string{
 const config=configuration(source);let key=styleKey(source,id);const old=config[key]??{};
 if(!keyPattern.test(key)||sourceNodes(source).filter(n=>n.attrs.some(a=>a.name==='data-wb-style'&&a.value===key)).length>1){key='wb-'+Array.from(crypto.getRandomValues(new Uint8Array(12)),b=>b.toString(16).padStart(2,'0')).join('');source=setElementAttribute(source,id,'data-wb-style',key);}
 const next={...old[state],...values};for(const [name,value] of Object.entries(next))if(!value)delete next[name];declarations(next);config[key]={...old,[state]:next};
 let css='/* Webbit element states: edit with the contextual ribbon. */\n';const suffix:Record<ElementState,string>={normal:'',hover:':hover',focus:':focus-visible',active:':active',disabled:':is(:disabled,[aria-disabled="true"])'};
 for(const [token,rules] of Object.entries(config)){if(!keyPattern.test(token))throw new Error('Invalid element style identifier');for(const stage of elementStates){if(!rules[stage])continue; const text=declarations(rules[stage]!).split(';').filter(Boolean).map(d=>stage==='normal'?d:`${d.replace(/\s*!important\s*$/i,'')} !important`).join(';');
 const actual=`[data-wb-style="${token}"]${suffix[stage]}{${text}}`;css+=stage==='hover'?`@media(hover:hover){${actual}}\n`:actual+'\n';}}
 css+='@media(prefers-reduced-motion:reduce){[data-wb-style]{transition:none!important;animation:none!important;transform:none!important;scroll-behavior:auto!important}}';
 const patches:{start:number;end:number;text:string}[]=[];const nodes=sourceNodes(source);
 const cssNode=nodes.find(n=>n.tagName==='style'&&n.attrs.some(a=>a.name==='data-wb-element-styles')),jsonNode=nodes.find(n=>n.tagName==='script'&&n.attrs.some(a=>a.name==='data-wb-element-config'));
 const style=`<style data-wb-element-styles>${css}</style>`,json=`<script type="application/json" data-wb-element-config>${JSON.stringify(config).replace(/</g,'\\u003c')}</script>`;
 let append='';for(const [node,text] of [[cssNode,style],[jsonNode,json]] as const){const loc=node?.sourceCodeLocation;if(loc)patches.push({start:loc.startOffset,end:loc.endOffset,text});else append+='\n'+text;}
 if(append){const end=nodes.find(n=>n.tagName==='body')?.sourceCodeLocation?.endTag?.startOffset;if(end===undefined)throw new Error('This page needs a closing body tag.');patches.push({start:end,end,text:append+'\n'});}
 for(const patch of patches.sort((a,b)=>b.start-a.start))source=source.slice(0,patch.start)+patch.text+source.slice(patch.end);return source;
}
export const elementPresets:{name:string;values:Record<string,string>}[]=[
 {name:'Color swap',values:{'background-color':'#6d4aff',color:'#ffffff'}},
 {name:'Gentle lift',values:{transform:'translateY(-4px)','box-shadow':'0 12px 24px #00000033'}},
 {name:'Soft glow',values:{'box-shadow':'0 0 24px #8b5cf699'}},
 {name:'Grow',values:{transform:'scale(1.06)'}},
 {name:'Playful tilt',values:{transform:'rotate(-3deg) scale(1.03)'}},
 {name:'Outline halo',values:{outline:'3px solid #9d85ff','outline-offset':'5px'}},
 {name:'Sunset gradient',values:{'background-image':'linear-gradient(115deg,#ff835c,#c044cc)',color:'#ffffff'}},
 {name:'Underline accent',values:{'text-decoration':'underline','text-underline-offset':'6px'}},
 {name:'Press inward',values:{transform:'translateY(2px) scale(.98)','box-shadow':'inset 0 2px 8px #00000044'}},
 {name:'Soft disabled',values:{opacity:'.45',filter:'grayscale(1)',cursor:'not-allowed'}}
];
export function contextualLabel(tag:string,attrs:{name:string;value:string}[]=[]){if(['nav','ul','ol','menu'].includes(tag)||attrs.some(a=>a.name==='data-wb-block'&&/menu|navigation/i.test(a.value)))return 'Menu';if(tag==='a'&&attrs.some(a=>(a.name==='class'&&/\b(?:btn|button)\b/.test(a.value))||(a.name==='role'&&a.value==='button')))return 'Button';return ({a:'Link',img:'Image',input:'Input',textarea:'Text area',select:'Select',video:'Video',audio:'Audio',form:'Form',button:'Button',body:'Page',html:'Document',svg:'SVG',iframe:'Embed'} as Record<string,string>)[tag]??tag.charAt(0).toUpperCase()+tag.slice(1);}
export function replaceElementMarkup(source:string,id:number,markup:string){const loc=sourceElement(source,id)?.sourceCodeLocation;if(!loc)throw new Error('Select a source element.');return source.slice(0,loc.startOffset)+markup+source.slice(loc.endOffset);}
