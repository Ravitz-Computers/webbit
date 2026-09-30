import {describe,it,expect} from 'vitest';
import {downloadSite,type Resource} from './download';
import {previewDocument} from './preview';
const resource=(url:string,mime:string,text:string):Resource=>({url,mime,data:Buffer.from(text).toString('base64')});
describe('public site import and self-contained preview',()=>{
 it('preserves source formatting and script bodies while mapping page and asset references',async()=>{
  const html='<!doctype html>\n<html><head><base href="https://example.com/"><link rel="stylesheet" href="/s.css"></head><body><!--keep--><a href="/about#team">About</a><img src="/logo.svg" srcset="bad.svg 2x"><script>const raw = "<a href=ignored>";</script><a href="https://outside.example/#x">External</a></body></html>';
  const data:Record<string,Resource>={'https://example.com/':resource('https://example.com/','text/html',html),'https://example.com/s.css':resource('https://example.com/s.css','text/css','body{color:red}'),'https://example.com/about':resource('https://example.com/about','text/html','<html><body>Team</body></html>'),'https://example.com/logo.svg':resource('https://example.com/logo.svg','image/svg+xml','<svg/>')};
  const site=await downloadSite('https://example.com/',()=>{},async u=>{if(!data[u])throw Error(u);return data[u];});
  expect(site.files['index.html']).toContain('<!--keep-->');expect(site.files['index.html']).toContain('<script>const raw = "<a href=ignored>";</script>');expect(site.files['index.html']).toContain('href="downloaded/resource-2.html#team"');expect(site.files['index.html']).toContain('href="https://outside.example/#x"');expect(site.files['index.html']).not.toContain('<base');expect(site.files['index.html']).not.toContain('srcset=');
 });
 it('keeps supported inline image/font data while refusing executable document sources',()=>{
  const source='<html><head><style>@font-face{font-family:test;src:url(data:font/woff2;base64,AAAA)}</style></head><body><img src="data:image/png;base64,AAAA"><img src="data:text/html;base64,AAAA"><iframe src="data:text/html;base64,AAAA"></iframe></body></html>';
  const preview=previewDocument({name:'Inline',entry:'index.html',files:{'index.html':source},assets:{}},'index.html');expect(preview).toContain('data:image/png;base64,AAAA');expect(preview).toContain('data:font/woff2;base64,AAAA');expect(preview).not.toContain('data:text/html');expect(preview).not.toContain('<iframe');
 });
});
