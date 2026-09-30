import {describe,it,expect} from 'vitest';
import {projectFromFiles} from './project';
import {mergeImport,planImport,importedSite,elementMarkup} from './imports';
describe('broad imports',()=>{
  const batch={files:{'scripts/site.js':'const imported=true;'},assets:{'images/photo.jpeg':'data:image/jpeg;base64,AQID'},skipped:[]};
  it('preserves paths, scripts and exact binary data through a merge',()=>{
    const result=mergeImport(projectFromFiles({'index.html':'<h1>Existing</h1>'}),batch,'vendor',false);
    expect(result.files['vendor/scripts/site.js']).toBe(batch.files['scripts/site.js']);
    expect(result.assets['vendor/images/photo.jpeg']).toBe(batch.assets['images/photo.jpeg']);
    expect(result.files['index.html']).toBe('<h1>Existing</h1>');
  });
  it('detects case-insensitive conflicts and skips unless replacement is chosen',()=>{
    const project=projectFromFiles({'Scripts/SITE.js':'original'});
    expect(planImport(project,batch)[1].conflict).toBe('Scripts/SITE.js');
    expect(mergeImport(project,batch,'',false).files['Scripts/SITE.js']).toBe('original');
    const replaced=mergeImport(project,batch,'',true);expect(replaced.files['Scripts/SITE.js']).toContain('imported');expect(replaced.files['scripts/site.js']).toBeUndefined();
  });
  it('rejects traversal and file/folder conflicts',()=>{
    const project=projectFromFiles({'assets':'file'});
    expect(()=>planImport(project,batch,'../escape')).toThrow();expect(()=>planImport(project,batch,'assets')).toThrow();
  });
  it('imports a wrapped site as an unsaved copy and prefers its root index',()=>{
    const site=importedSite({files:{'site/about.html':'About','site/index.html':'Home'},assets:{'site/photo.jpg':'data:image/jpeg;base64,AQID'},skipped:[]},true);
    expect(site.entry).toBe('index.html');expect(site.root).toBeUndefined();expect(site.assets['photo.jpg']).toBeDefined();
  });
  it('inserts relative references with appropriate element types',()=>{
    expect(elementMarkup('images/my photo.jpeg','pages/about.html').markup).toContain('../images/my%20photo.jpeg');
    expect(elementMarkup('scripts/app.mjs','index.html').markup).toContain('type="module"');
    expect(elementMarkup('css/site.css','index.html').head).toBe(true);
    expect(elementMarkup('fonts/Body.woff2','index.html').markup).toContain('font-family:"Imported_Body"');
    expect(elementMarkup('downloads/brochure.pdf','index.html').markup).toContain('<a href=');
  });
});
