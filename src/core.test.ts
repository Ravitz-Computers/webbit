import {describe,it,expect} from 'vitest';
import {createProject,projectFromFiles,publicFiles,safeRelativePath} from './project';
import {previewDocument,replaceElementText,sourceElement} from './preview';
import {inspectProject,applySafeFix} from './guard';
import {analyzeSite} from './manager';

describe('ordinary project files',()=>{
  it('opens the original Beta 1 metadata layout without converting source',()=>{
    const files={'webbit.json':'{"format":1,"name":"Original","entry":"index.html"}','index.html':'<h1>Hello</h1>','script.js':'console.log(1)'};
    const project=projectFromFiles(files);expect(project.entry).toBe('index.html');expect(project.files).toEqual(files);
  });
  it('keeps editor metadata and database/source-only files out of website export',()=>{
    const p=createProject();p.files['webbit.manager.json']='{}';p.files['backup.sql']='private';p.files['.env']='SECRET=x';
    const out=publicFiles(p);expect(out['webbit.json']).toBeUndefined();expect(out['webbit.manager.json']).toBeUndefined();expect(out['backup.sql']).toBeUndefined();expect(out['.env']).toBeUndefined();expect(out['script.js']).toBe(p.files['script.js']);
  });
  it('rejects traversal, alternate streams and Windows device names',()=>{
    for(const path of ['../secret','/absolute','C:/file','a\\b','image.png:stream','CON.txt','x/.. /file','a/../b'])expect(safeRelativePath(path),path).toBe(false);
    expect(safeRelativePath('assets/images/hero.webp')).toBe(true);
  });
});
describe('visual source preservation',()=>{
  it('resolves nested stylesheet images once relative to the stylesheet',()=>{
    const p=projectFromFiles({'pages/index.html':'<link rel="stylesheet" href="../css/site.css"><h1>Hello</h1>','css/site.css':'body{background:url(../assets/bg.png)}'});
    p.assets['assets/bg.png']='data:image/png;base64,aGVsbG8=';
    expect(previewDocument(p,'pages/index.html')).toContain('url("data:image/png;base64,aGVsbG8=")');
  });
  const source='<!doctype html>\n<html lang="en"><head><style>.x { color: red }</style></head><body><!--keep--><h1 class="x">Original</h1><script>const keep = "<h1>not markup</h1>";</script>\n</body></html>';
  const findH1=()=>{for(let i=0;i<30;i++)if(sourceElement(source,i)?.tagName==='h1')return i;throw new Error('missing');};
  it('changes only the selected text while preserving comments, style and scripts exactly',()=>{
    expect(replaceElementText(source,findH1(),'New <title> & text')).toBe(source.replace('>Original<','>New &lt;title&gt; &amp; text<'));
  });
  it('keeps original source immutable while making the preview inert',()=>{
    const p=projectFromFiles({'index.html':source});const out=previewDocument(p,'index.html');expect(p.files['index.html']).toBe(source);expect(out).not.toContain('<script');expect(out).toContain("default-src 'none'");expect(out).toContain('contenteditable="plaintext-only"');
  });
  it('refuses whole-element rewrites that would destroy nested formatting',()=>{
    const nested=source.replace('Original','Hello <em>world</em>');expect(()=>replaceElementText(nested,findH1(),'replacement')).toThrow();
  });
});
describe('Guard',()=>{
  it('detects public secrets without echoing them into findings',()=>{
    const p=createProject();p.files['script.js']="const smtp_password='secret-value-for-test';";const findings=inspectProject(p);expect(findings.some(f=>f.id==='exposed-secret'&&f.level==='critical')).toBe(true);expect(JSON.stringify(findings)).not.toContain('secret-value-for-test');
  });
  it('uses HTML attributes for mixed content rather than matching namespace URLs',()=>{
    const p=projectFromFiles({'index.html':'<html lang="en"><body><svg xmlns="http://www.w3.org/2000/svg"></svg><img src="http://example.com/a.png" alt=""></body></html>'});expect(inspectProject(p).filter(f=>f.id==='mixed-content')).toHaveLength(1);
  });
  it('makes a safe viewport fix idempotent',()=>{const first=applySafeFix('<html><head></head><body></body></html>','viewport');expect(applySafeFix(first,'viewport')).toBe(first);expect(first).toContain('width=device-width');});
  it('identifies broken local references with their source location',()=>{const p=projectFromFiles({'index.html':'<html lang="en">\n<body><img src="missing.png" alt="Photo"></body></html>'});const finding=inspectProject(p).find(f=>f.id==='missing-file');expect(finding?.line).toBe(2);expect(finding?.path).toBe('index.html');});
});
describe('manager analysis',()=>{it('derives fields from the selected site and creates no credentials',()=>{const fields=analyzeSite(createProject('business'));expect(fields.some(f=>f.value==='Computer repair')).toBe(true);expect(fields.every(f=>f.id&&f.page)).toBe(true);expect(JSON.stringify(fields)).not.toContain('password');});});
