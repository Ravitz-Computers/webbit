import {describe,it,expect} from 'vitest';
import {addMemberExport,accessConfig} from './member-export';
import {createProject,publicFiles} from './project';
import {generateManager} from './manager-export';
import {analyzeSite} from './manager';
describe('member export security boundaries',()=>{
 const project=()=>{const p=createProject();p.files['webbit.access.json']=JSON.stringify({enabled:true,title:'Members',pages:['about.html']});return p;};
 it('keeps configuration private and removes protected HTML from public output',()=>{const p=project(),out=addMemberExport(Object.fromEntries(Object.entries(publicFiles(p)).map(([k,v])=>['public/'+k,v])),p);expect(publicFiles(p)['webbit.access.json']).toBeUndefined();expect(out['private/members/pages/page-0.html']).toBe(p.files['about.html']);expect(out['public/about.html']).not.toContain('People make the difference');expect(out['public/about.php']).toContain('Members::page');expect(out['public/members/index.php']).toContain('Members::run');});
 it('rejects collisions with protected PHP routes',()=>{const p=project();p.files['about.php']='<?php';expect(()=>addMemberExport({},p)).toThrow('already exists');});
 it('does not create login routes when disabled',()=>{const p=project();p.files['webbit.access.json']='{}';expect(addMemberExport({},p)).toEqual({});expect(accessConfig(p).enabled).toBe(false);});
 it('excludes protected fields from the admin publishing schema',async()=>{const p=project();const out=await generateManager(p,new Set(analyzeSite(p).map(f=>f.id)));expect(out.schema.pages.map(p=>p.path)).not.toContain('about.html');expect(out.files['public/about.html']).not.toContain('People make the difference');});
 it('resolves nested routes to the same private storage',()=>{const p=project();p.files['nested/deep/secret.html']='<h1>Private</h1>';p.files['webbit.access.json']=JSON.stringify({enabled:true,pages:['nested/deep/secret.html']});const out=addMemberExport({},p);expect(out['public/nested/deep/secret.php']).toContain('dirname(__DIR__,3)');expect(out['public/nested/deep/secret.php']).toContain('dirname(__DIR__,2)');});
});
