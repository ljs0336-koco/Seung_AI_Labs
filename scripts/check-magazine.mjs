import fs from 'node:fs/promises';
import {Script} from 'node:vm';
import assert from 'node:assert/strict';
const file=new URL('../public/deck/vol02/index.html',import.meta.url);
const html=await fs.readFile(file,'utf8');
assert.equal((html.match(/property="og:title"/g)||[]).length,1,'Magazine must have exactly one Open Graph title.');
assert.equal((html.match(/<section class="slide[ "]/g)||[]).length,8,'Magazine must keep eight slides.');
assert.ok(html.includes('href="../../#/"'),'Magazine return link must resolve to the portal.');
let count=0;
for(const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)){
 if(/\bsrc\s*=/.test(match[1]))continue;
 new Script(match[2],{filename:'public/deck/vol02/index.html'});count++;
}
assert.ok(count>0,'Magazine navigation script is missing.');
console.log(`[magazine] 8 slides, portal return link and ${count} inline script checked.`);
