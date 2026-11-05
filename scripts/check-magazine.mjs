import fs from 'node:fs/promises';
import {Script} from 'node:vm';
import assert from 'node:assert/strict';
for(const [issue,slides] of [['vol02',8],['vol03',10]]){
 const name=`public/deck/${issue}/index.html`;
 const html=await fs.readFile(new URL(`../${name}`,import.meta.url),'utf8');
 assert.equal((html.match(/property="og:title"/g)||[]).length,1,`${issue} must have exactly one Open Graph title.`);
 assert.equal((html.match(/<section class="slide[ "]/g)||[]).length,slides,`${issue} must keep ${slides} slides.`);
 assert.ok(html.includes('href="../../#/"'),`${issue} return link must resolve to the portal.`);
 let count=0;
 for(const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)){
  if(/\bsrc\s*=/.test(match[1]))continue;
  new Script(match[2],{filename:name});count++;
 }
 assert.ok(count>0,`${issue} navigation script is missing.`);
 console.log(`[magazine] ${issue}: ${slides} slides, portal return link and ${count} inline script checked.`);
}
