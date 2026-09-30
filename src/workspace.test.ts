import {describe,it,expect} from 'vitest';
import {fileKind,listFiles} from './file-list';
import {sourceNodes,blocks} from './blocks';
import {placeElement,relocateElement,resizeElement} from './canvas';
import {extraTemplates} from './templates';
import {createProject,publicFiles} from './project';
import {galleryItems,galleryMarkup} from './gallery';
import {googleReviewFiles,googleReviewMarkup} from './google-reviews';
const source='<!doctype html><html><head></head><body><main><section id="a"><p>Keep me</p></section><section id="b"><h2>Other</h2></section></main></body></html>';
const id=(text:string,tag:string)=>sourceNodes(text).findIndex(n=>n.tagName===tag);
describe('workspace update',()=>{
 it('filters by kind and sorts All by kind then name',()=>{const paths=['z.css','a.js','b.html','A.jpg','Main.java','a.css'];expect(listFiles(paths,'CSS','name')).toEqual(['a.css','z.css']);expect(fileKind('Main.java')).toBe('Java');expect(fileKind('a.js')).toBe('JavaScript');expect(listFiles(paths,'All','type')).toHaveLength(6);expect(listFiles(paths,'All','type').slice(0,2)).toEqual(['a.css','z.css']);});
 it('draws into the requested container and preserves unrelated source',()=>{const result=placeElement(source,id(source,'section'),'<p>Drawn</p>',{x:30,y:40,width:200,height:80});expect(result).toContain('left:30px');expect(result).toContain('<p>Keep me</p>');expect(result).toContain('<section id="b"><h2>Other</h2></section>');expect(result.indexOf('Drawn')).toBeLessThan(result.indexOf('id="b"'));});
 it('moves between blocks without duplicating and rejects self nesting',()=>{const nodes=sourceNodes(source),p=id(source,'p'),b=nodes.findIndex(n=>n.attrs.some(a=>a.name==='id'&&a.value==='b'));const result=relocateElement(source,p,b,{x:10,y:20,width:200,height:40});expect(result.match(/Keep me/g)).toHaveLength(1);expect(result.indexOf('Keep me')).toBeGreaterThan(result.indexOf('id="b"'));expect(()=>relocateElement(source,b,b,{x:0,y:0,width:10,height:10})).toThrow();});
 it('resizes source elements without removing their content',()=>{const result=resizeElement(source,id(source,'p'),160,90);expect(result).toContain('width:160px;height:90px');expect(result).toContain('Keep me');});
 it('creates distinct original templates with working local stylesheet and block outline',()=>{const styles=new Set<string>();for(const t of extraTemplates){const p=createProject(t.id);expect(p.files[p.entry]).toContain('<h1>');expect(p.files['styles.css']).toBeTruthy();expect(blocks(p.files[p.entry]).length).toBeGreaterThan(2);expect(p.files[p.entry]).not.toContain('https://');styles.add(p.files['styles.css']);}expect(styles.size).toBe(extraTemplates.length);});
 it('gallery templates have editable source roots',()=>{for(const item of galleryItems.filter(i=>i.id!=='google-reviews'))expect(blocks(galleryMarkup(item.id)).length).toBeGreaterThan(0);});
 it('Google connector keeps configuration private and contains no embedded API credential',()=>{const p=createProject();p.files=googleReviewFiles(p,'ChIJexample123');expect(p.files['webbit-google-reviews.php']).toContain("getenv('WEBBIT_GOOGLE_PLACES_KEY')");expect(publicFiles(p)['private/GOOGLE-REVIEWS-SETUP.md']).toBeUndefined();expect(googleReviewMarkup('pages/about.html')).toContain('../webbit-google-reviews.php');expect(()=>googleReviewFiles(p,'bad')).toThrow();});
});
