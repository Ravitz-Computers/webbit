import {describe,it,expect} from 'vitest';
import {createProject,projectFromFiles} from './project';
import {analyzeSite,managerSchema} from './manager';
import {generateManager} from './manager-export';
describe('manager generation',()=>{
  it('keeps executable security code fixed and secrets outside the public tree',async()=>{
    const site=createProject();const generated=await generateManager(site,new Set(analyzeSite(site).map(f=>f.id)));
    expect(generated.files['private/runtime/src/AuthStore.php']).toContain('BEGIN IMMEDIATE');
    expect(generated.files[`public/${generated.route}/index.php`]).toContain('/private/runtime/src/Controller.php');
    expect(generated.files['private/schema.json']).toContain(site.name);
    expect(generated.files['public/webbit.json']).toBeUndefined();
    expect(generated.files[`public/${generated.route}/qrcode.js`]).toContain('QR Code Generator');
    expect(Object.keys(generated.files).some(p=>p.endsWith('key.bin')||p.endsWith('auth.sqlite'))).toBe(false);
  });
  it('avoids field-ID collisions between similarly named pages',()=>{
    const site=projectFromFiles({'a-b.html':'<h1>One</h1>','a_b.html':'<h1>Two</h1>'});
    expect(new Set(analyzeSite(site).map(f=>f.id)).size).toBe(2);
  });
  it('retains source around managed fields without parsing scripts as editable markup',async()=>{
    const source='<h1> A &amp; B </h1><!--keep--><script>const x="<h1>not markup</h1>"</script>';
    const site=projectFromFiles({'index.html':source});const fields=analyzeSite(site);
    const schema=await managerSchema(site,new Set(fields.map(f=>f.id)));
    expect(fields).toHaveLength(1);
    expect(schema.pages[0].segments.map(s=>typeof s==='string'?s:s.original).join('')).toBe(source);
    expect(schema.pages[0].hash).toHaveLength(64);
  });
});
