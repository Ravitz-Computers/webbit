import {describe,it,expect} from 'vitest';
import {sourceElement} from './preview';
import {setElementAttribute,removeElement,moveElement} from './inspector';
const source='<!doctype html><html><head></head><body><main><p title="old">One</p><!--keep--><p>Two</p><img src="photo.png"></main><script>unchanged()</script></body></html>';
const id=(tag:string)=>{for(let i=0;i<20;i++)if(sourceElement(source,i)?.tagName===tag)return i;throw new Error('missing element');};
describe('element inspector',()=>{
  it('replaces only the selected attribute',()=>expect(setElementAttribute(source,id('p'),'title','" & <')).toBe(source.replace('title="old"','title="&quot; &amp; &lt;"')));
  it('inserts alt text without changing the rest of an image or page',()=>expect(setElementAttribute(source,id('img'),'alt','A workshop')).toBe(source.replace('src="photo.png">','src="photo.png" alt="A workshop">')));
  it('rejects script-bearing properties and links',()=>{expect(()=>setElementAttribute(source,id('p'),'onclick','alert(1)')).toThrow();expect(()=>setElementAttribute(source,id('p'),'href','javascript:alert(1)')).toThrow();});
  it('moves siblings while retaining intervening comments and scripts',()=>expect(moveElement(source,id('p'),'down')).toBe(source.replace('<p title="old">One</p><!--keep--><p>Two</p>','<p>Two</p><!--keep--><p title="old">One</p>')));
  it('deletes only the selected element',()=>expect(removeElement(source,id('p'))).toBe(source.replace('<p title="old">One</p>','')));
});
