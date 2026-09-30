import {describe,it,expect} from 'vitest';
import {copyElements,pasteElements} from './element-clipboard';
import {sourceNodes} from './blocks';
import {updateElementRules,elementRules} from './element-styles';
const id=(source:string,value:string)=>sourceNodes(source).findIndex(n=>n.attrs.some(a=>a.name==='id'&&a.value===value));
const rect={x:40,y:60,width:100,height:50};
describe('element clipboard',()=>{
 it('pastes a group with spacing retained, fresh IDs, references remapped and originals intact',()=>{
  const source='<html><head></head><body><label id="label" for="field">Name</label><input id="field" aria-labelledby="label"></body></html>';
  const clip=copyElements(source,'index.html',[{id:id(source,'label'),rect},{id:id(source,'field'),rect:{...rect,x:180}}]);
  const result=pasteElements(source,'index.html',clip);const nodes=sourceNodes(result.source),labels=nodes.filter(n=>n.tagName==='label'),inputs=nodes.filter(n=>n.tagName==='input');
  expect(labels).toHaveLength(2);expect(inputs).toHaveLength(2);expect(result.tokens).toHaveLength(2);
  expect(labels[1].attrs.find(a=>a.name==='for')?.value).toBe(inputs[1].attrs.find(a=>a.name==='id')?.value);
  expect(inputs[1].attrs.find(a=>a.name==='aria-labelledby')?.value).toBe(labels[1].attrs.find(a=>a.name==='id')?.value);
  expect(result.source).toContain('left:64px');expect(result.source).toContain('left:204px');expect(result.source).toContain('<label id="label" for="field">Name</label>');
 });
 it('copies a selected parent once even when a descendant is also included',()=>{const source='<body><section id="parent"><button id="child">Go</button></section></body>';expect(copyElements(source,'index.html',[{id:id(source,'parent'),rect},{id:id(source,'child'),rect}]).items).toHaveLength(1);});
 it('places the group at a context-menu point and accounts for a positioned body',()=>{const source='<body><button id="a">A</button></body>';const clip=copyElements(source,'index.html',[{id:id(source,'a'),rect}]);const result=pasteElements(source,'index.html',clip,{x:300,y:400},24,{x:10,y:20});expect(result.source).toContain('left:290px;top:380px');});
 it('rebases project image paths when pasting into a nested page',()=>{const source='<body><img id="pic" src="images/photo.jpg"></body>';const clip=copyElements(source,'index.html',[{id:id(source,'pic'),rect}]);expect(pasteElements('<body></body>','pages/about.html',clip).source).toContain('src="../images/photo.jpg"');});
 it('copies hover effects without linking the copies editing state to the original',()=>{let source='<body><button id="a">A</button></body>';source=updateElementRules(source,id(source,'a'),'hover',{color:'red'});const clip=copyElements(source,'index.html',[{id:id(source,'a'),rect}]);const result=pasteElements(source,'index.html',clip);const nodes=sourceNodes(result.source),copyId=nodes.findIndex(n=>n.attrs.some(a=>a.name==='data-wb-canvas-id'&&result.tokens.includes(a.value)));expect(elementRules(result.source,copyId,'hover')).toEqual({color:'red'});expect(nodes[copyId].attrs.find(a=>a.name==='data-wb-style')?.value).not.toBe(nodes[id(result.source,'a')].attrs.find(a=>a.name==='data-wb-style')?.value);});
 it('rejects document-shell copying and destinations without a body',()=>{expect(()=>copyElements('<html><body></body></html>','index.html',[{id:0,rect}])).toThrow();expect(()=>pasteElements('', 'index.html',{page:'index.html',items:[{markup:'<p>Test</p>',rect}],effects:{}})).toThrow();});
});
