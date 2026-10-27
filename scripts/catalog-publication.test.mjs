import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const root=new URL('../',import.meta.url);
const catalog=JSON.parse(await fs.readFile(new URL('public/content/catalog.json',root),'utf8'));

test('Malang opens in the playground with its existing address instead of becoming another portal planet',()=>{
  const malang=catalog.items.find(x=>x.id==='malang');
  assert.equal(malang.title,'말랑런');assert.equal(malang.status,'live');
  assert.equal(malang.section,'playground');assert.equal(malang.placement,'base');
  assert.equal(malang.href,'./hub/apps/malang_run/index.html');
  assert.ok(catalog.items.find(x=>x.id==='playground').children.some(x=>x.href===malang.href));
});
test('unwanted archive entries and their published HTML are removed',async()=>{
  for(const id of ['commute-locked','question-locked'])assert.equal(catalog.items.some(x=>x.id===id),false);
  for(const name of ['통학_데이터_탐구_v2.html','질문전후비교_v3.html'])await assert.rejects(fs.access(new URL('public/hub/apps/'+name,root)),{code:'ENOENT'});
});
test('lecture shortcuts represent lectures and keep RL inside the high-school lecture resources',()=>{
  const children=catalog.items.find(x=>x.id==='hub').children;
  assert.ok(children.some(x=>x.href==='./hub/index.html#snu'));
  assert.equal(children.some(x=>x.href.includes('robotdog_rl')),false);
});
