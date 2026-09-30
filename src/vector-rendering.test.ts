import {describe,it,expect} from 'vitest';
import {projectFromFiles} from './project';
import {previewDocument} from './preview';
import {sourceNodes} from './blocks';
import {setElementAttribute,removeElementAttribute} from './inspector';
describe('SVG rendering and editing',()=>{
 it('keeps fragment paint, clip and mask references in embedded and linked CSS',()=>{
  const p=projectFromFiles({'index.html':'<link rel="stylesheet" href="art.css"><svg viewBox="0 0 200 100"><defs><linearGradient id="paint"><stop stop-color="red"/></linearGradient></defs><style>.shape{fill:url(#paint);clip-path:url(#cut)}</style><rect class="shape" style="mask:url(#mask)" width="200" height="100"/></svg>','art.css':'.shape{filter:url(#shadow)}'});
  const out=previewDocument(p,'index.html');for(const id of ['paint','cut','mask','shadow'])expect(out).toContain('#'+id);expect(out).not.toContain('url("")');expect(out).toContain('viewBox="0 0 200 100"');
 });
 it('resolves embedded SVG image assets while keeping local symbol references',()=>{
  const p=projectFromFiles({'index.html':'<svg xmlns:xlink="http://www.w3.org/1999/xlink"><image href="pic.png"/><image xlink:href="pic.png"/><use href="#shape"/></svg>'});p.assets['pic.png']='data:image/png;base64,AAAA';const out=previewDocument(p,'index.html');expect(out.match(/data:image\/png;base64,AAAA/g)).toHaveLength(2);expect(out).toContain('href="#shape"');
 });
 it('replaces SVG camel-case attributes instead of creating duplicates',()=>{
  const source='<svg viewBox="0 0 100 200" preserveAspectRatio="none"></svg>';const id=sourceNodes(source).findIndex(n=>n.tagName==='svg');const next=setElementAttribute(source,id,'viewBox','0 0 200 100');expect(next.match(/viewBox=/g)).toHaveLength(1);expect(next).toContain('viewBox="0 0 200 100"');expect(removeElementAttribute(next,id,'preserveAspectRatio')).not.toContain('preserveAspectRatio');
 });
});
