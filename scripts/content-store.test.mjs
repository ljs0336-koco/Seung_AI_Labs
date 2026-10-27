import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {validateCatalog,safeRelative,importFiles,loadDraft,saveDraft,materialize,writeJson} from './content-store.mjs';
const fixture={schemaVersion:1,revision:1,items:[{id:'sample',kind:'link',title:'수업 자료',description:'자료 설명',href:'https://example.org/resource',section:'personal',placement:'base',status:'live'}]};
async function workspace(fn){const root=await fs.mkdtemp(path.join(os.tmpdir(),'seung-store-test-'));try{await writeJson(path.join(root,'public/content/catalog.json'),fixture);await fn(root);}finally{if(!path.resolve(root).startsWith(path.resolve(os.tmpdir())+path.sep+'seung-store-test-'))throw new Error('unexpected temp path');await fs.rm(root,{recursive:true,force:true});}}
test('rejects traversal, hidden folders, active URL schemes and duplicate IDs',()=>{
 for(const unsafe of ['../secret','a/../../bad','.env','node_modules/a.js','a\\..\\b','C:/outside'])assert.throws(()=>safeRelative(unsafe));
 assert.throws(()=>validateCatalog({...fixture,items:[{...fixture.items[0],href:'javascript:alert(1)'}]}));
 assert.throws(()=>validateCatalog({...fixture,items:[fixture.items[0],fixture.items[0]]}));
});
test('public projection keeps only defined fields',()=>{
 const result=validateCatalog({...fixture,secretPath:'local-only',items:[{...fixture.items[0],privateNote:'local-only'}]});
 assert.equal(result.secretPath,undefined);assert.equal(result.items[0].privateNote,undefined);
});

test('magazine edition and previous-issue links survive saving and materialization',()=>workspace(async root=>{
 const draft=await loadDraft(root);Object.assign(draft.items[0],{edition:'VOL.02',children:[{title:'Vol.01',href:'./deck/index.html'}]});
 const saved=await saveDraft(root,draft);await materialize(root,saved);
 const result=await loadDraft(root);assert.equal(result.items[0].edition,'VOL.02');assert.equal(result.items[0].children[0].href,'./deck/index.html');
}));
test('locked item cannot be advertised on portal',()=>assert.throws(()=>validateCatalog({...fixture,items:[{...fixture.items[0],status:'locked',placement:'both'}]})));
test('saved visibility survives loading another instance',()=>workspace(async root=>{
 const draft=await loadDraft(root);draft.items[0].placement='both';const saved=await saveDraft(root,draft);assert.equal(saved.revision,2);assert.equal((await loadDraft(root)).items[0].placement,'both');
}));
test('new HTML bundle preserves relative assets and source draft until materialization',()=>workspace(async root=>{
 const result=await importFiles(root,{title:'수업 보드',files:[{path:'board/index.html',data:Buffer.from('<img src="assets/chart.svg">').toString('base64')},{path:'board/assets/chart.svg',data:Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>').toString('base64')}],entry:'board/index.html'});
 assert.equal(result.item.kind,'document');assert.equal(result.item.placement,'base');
 await assert.rejects(fs.access(path.join(root,'public/materials',result.item.id)));
 await materialize(root,result.draft);
 assert.match(await fs.readFile(path.join(root,'public/materials',result.item.id,'board/index.html'),'utf8'),/assets\/chart.svg/);
 const page=await fs.readFile(path.join(root,'public/share/materials',result.item.id,'index.html'),'utf8');assert.match(page,/자료 열기/);assert.match(page,/https:\/\/ljs0336-koco/);
}));
test('invalid entry cannot mutate stored catalog',()=>workspace(async root=>{
 await assert.rejects(importFiles(root,{title:'잘못된 묶음',files:[{path:'index.html',data:'PGgxPjwvaDE+'}],entry:'missing.html'}));assert.equal((await loadDraft(root)).items.length,1);
}));
test('stale tabs cannot overwrite a newly saved record',()=>workspace(async root=>{
 const first=await loadDraft(root);const stale=await loadDraft(root);first.items[0].description='새 설명';await saveDraft(root,first);
 await assert.rejects(saveDraft(root,stale),error=>error.status===409);
 assert.equal((await loadDraft(root)).items[0].description,'새 설명');
}));
test('special file names and portal placement are registered atomically',()=>workspace(async root=>{
 const result=await importFiles(root,{title:'특수 이름',placement:'both',expectedRevision:1,files:[{path:'수업#1%.txt',data:Buffer.from('확인용 가상 자료').toString('base64')}]});
 assert.equal(result.item.placement,'both');assert.match(result.item.targetHref,/%23/);assert.match(result.item.targetHref,/%25/);
 await materialize(root,result.draft);assert.equal(await fs.readFile(path.join(root,'public/materials',result.item.id,'수업#1%.txt'),'utf8'),'확인용 가상 자료');
}));
test('hiding a listed material preserves its shared href',()=>workspace(async root=>{
 const draft=await loadDraft(root);draft.items[0].placement='both';await materialize(root,draft);draft.items[0].placement='base';await saveDraft(root,draft);await materialize(root,await loadDraft(root));const result=JSON.parse(await fs.readFile(path.join(root,'public/content/catalog.json'),'utf8'));assert.equal(result.items[0].href,fixture.items[0].href);assert.equal(result.items[0].placement,'base');
}));
test('replacing a document preserves its permanent address and item count',()=>workspace(async root=>{
 const first=await importFiles(root,{title:'자료',files:[{path:'a.txt',data:'QQ=='}]});
 const next=await importFiles(root,{existingId:first.item.id,expectedRevision:first.draft.revision,title:'자료 수정본',files:[{path:'b.txt',data:'Qg=='}]});
 assert.equal(next.item.id,first.item.id);assert.equal(next.item.href,first.item.href);assert.equal(next.draft.items.length,2);assert.match(next.item.targetHref,/b.txt$/);
}));
