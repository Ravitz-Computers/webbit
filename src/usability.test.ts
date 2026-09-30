import {describe,it,expect} from 'vitest';
import {snapMovement} from './snapping';
import {createProject} from './project';
import {sourceNodes} from './blocks';
import {replaceDirectText,previewDocument} from './preview';
import {registerFont,projectFonts} from './fonts';
import {editCanvasSelection} from './canvas-edit';
describe('canvas alignment and content preservation',()=>{
 it('snaps a group center to page center within six pixels',()=>{const result=snapMovement({x:30,y:50,width:200,height:100},267,0,[{box:{x:0,y:0,width:800,height:900},label:'Page'}]);expect(result.dx).toBe(270);expect(result.guides).toContainEqual({axis:'x',value:400,label:'Page center → center'});});
 it('snaps edges to another element and leaves distant motion untouched',()=>{const target=[{box:{x:450,y:300,width:90,height:60},label:'button'}];expect(snapMovement({x:0,y:0,width:100,height:40},346,257,target)).toMatchObject({dx:350,dy:260});expect(snapMovement({x:0,y:0,width:100,height:40},10,10,target)).toMatchObject({dx:10,dy:10,guides:[]});});
 it('replaces only directly clicked text, preserving icons, nested markup and entities',()=>{const source='<button>Buy <strong>now</strong> &amp; save<img src="icon.svg"></button>';const id=sourceNodes(source).findIndex(n=>n.tagName==='button');expect(replaceDirectText(source,id,1,' <later>')).toBe('<button>Buy <strong>now</strong> &lt;later&gt;<img src="icon.svg"></button>');});
 it('keeps only the original layer selection when sibling z-indexes change',()=>{const source='<button>A</button><button>B</button>';const ids=sourceNodes(source).flatMap((n,i)=>n.tagName==='button'?[i]:[]);const result=editCanvasSelection(source,{kind:'style',selectionIds:[ids[0]],items:ids.map((id,i)=>({id,css:'position:relative;z-index:'+i}))});expect(result.tokens).toHaveLength(1);expect(result.source.match(/z-index:/g)).toHaveLength(2);});
});
describe('blank sites and imported fonts',()=>{
 it('starts with an empty body and one page',()=>{const p=createProject('blank');expect(p.files['index.html']).toMatch(/<body>\s*<\/body>/);expect(Object.keys(p.files).filter(p=>p.endsWith('.html'))).toEqual(['index.html']);});
 it('links local fonts on root and nested pages and inlines them in preview',()=>{const p=createProject('blank');p.files['pages/about.html']=p.files['index.html'];const next=registerFont(p,{family:'Test Font',path:'assets/fonts/test.woff2',weight:'400',style:'normal'},'data:font/woff2;base64,d09GMg==');expect(next.files['pages/about.html']).toContain('../assets/fonts/webbit-fonts.css');expect(projectFonts(next)).toHaveLength(1);expect(previewDocument(next,'pages/about.html')).toContain('data:font/woff2;base64,d09GMg==');expect(registerFont(next,projectFonts(next)[0],next.assets['assets/fonts/test.woff2']).files['index.html'].match(/webbit-fonts.css/g)).toHaveLength(1);});
 it('rejects font names and paths that could inject CSS or escape the project',()=>{const p=createProject('blank');expect(()=>registerFont(p,{family:'bad";}',path:'assets/fonts/x.woff2',weight:'400',style:'normal'},'data:font/woff2;base64,d09GMg==')).toThrow();expect(()=>registerFont(p,{family:'Good',path:'../x.woff2',weight:'400',style:'normal'},'data:font/woff2;base64,d09GMg==')).toThrow();});
});
