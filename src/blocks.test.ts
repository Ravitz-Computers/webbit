import {describe,it,expect} from 'vitest';
import {blocks,blockMarkup,insertMarkup,duplicateBlock} from './blocks';
import {applyEffects,withEnhancements} from './effects';
import {parseData,dataMarkup} from './data';
import {createProject,publicFiles} from './project';
import {previewDocument} from './preview';
describe('blocks, effects and data',()=>{
 it('recognizes imported Ravitz section and block markers without rewriting',()=>{const source='<main><section data-sec="hero"><div data-edit="hero.0"><h1>Hello</h1></div></section></main>';expect(blocks(source).map(b=>b.label)).toEqual(['hero','hero.0']);});
 it('inserts inside main while preserving following scripts',()=>{const source='<html><head></head><body><main><!--keep--></main><script>custom()</script></body></html>';expect(insertMarkup(source,'<p>Hello</p>')).toContain('<!--keep-->\n<p>Hello</p>\n</main><script>custom()</script>');});
 it('duplicates tabs with independent IDs and references',()=>{const source='<main>'+blockMarkup('tabs','Tabs','One\nTwo')+'</main>';const copy=duplicateBlock(source,blocks(source)[0].id);const ids=[...copy.matchAll(/ id="([^"]+)"/g)].map(m=>m[1]);expect(new Set(ids).size).toBe(ids.length);expect(copy).toMatch(/aria-controls="wb-[^"]+-copy-[^"]+"/);});
 it('applies site and page effects independently and excludes block effects on pages',()=>{const p=createProject();p.files=applyEffects(p,'index.html','site',['glow'],null);p.files=applyEffects(p,'index.html','page',['dots'],null);expect(p.files['about.html']).toContain('data-wb-site-fx="glow"');expect(p.files['index.html']).toContain('data-wb-fx="dots"');expect(()=>applyEffects(p,'index.html','page',['lift'],null)).toThrow();});
 it('installs runtime once and never overwrites unrelated code',()=>{const p=createProject();const files=withEnhancements(withEnhancements(p.files,'index.html'),'index.html');expect(files['index.html'].match(/data-wb-runtime="js"/g)).toHaveLength(1);expect(()=>withEnhancements({...p.files,'assets/webbit/enhancements.js':'custom'},'index.html')).toThrow();expect(previewDocument({...p,files},'index.html')).not.toContain('<script');});
 it('parses quoted multiline CSV and escaped quotes',()=>{const t=parseData('a.csv','Name,Note\r\nAda,"One, two\n""three"""');expect(t.rows).toEqual([['Ada','One, two\n"three"']]);expect(()=>parseData('a.csv','a,b\n1')).toThrow();});
 it('publishes only chosen columns with HTML escaping',()=>{const t=parseData('rows.json','[{"name":"<script>alert(1)</script>","secret":"private-value"}]');const html=dataMarkup(t,[0],10);expect(html).not.toContain('private-value');expect(html).toContain('&lt;script&gt;');expect(()=>parseData('a.json','{}')).toThrow();});
 it('keeps private data outside website exports',()=>{const p=createProject();p.files['private/data/test.json']='sensitive';expect(publicFiles(p)['private/data/test.json']).toBeUndefined();});
});
