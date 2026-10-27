import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL, fileURLToPath} from 'node:url';
import {BASE_PATH, MATERIALS_PATH} from '../src/app/materialsRoute.js';

const site='https://ljs0336-koco.github.io/Seung_AI_Labs/';
const ownerRoutes=new Set([BASE_PATH,MATERIALS_PATH,'/admin']);
const normalize=value=>value.replace(/\/+$/,'');

export function isOwnerDestination(value) {
  try {
    const url=new URL(value.replaceAll('&amp;','&'),site);
    if(url.origin!==new URL(site).origin)return false;
    const route=decodeURIComponent(url.hash.slice(1)).split(/[?#]/)[0];
    const pathname=decodeURIComponent(url.pathname);
    return ownerRoutes.has(normalize(route)) || ownerRoutes.has(normalize(pathname)) || /\/privacy-guidelines\.html\/?$/.test(pathname);
  } catch {return false;}
}

export function ownerLinks(source) {
  const found=[];
  for(const tag of source.matchAll(/<(?:a|Link|NavLink)\b[^>]*>/g)) {
    const attribute=tag[0].match(/\b(?:href|to)\s*=\s*(?:["']([^"']*)["']|\{\s*["'`]([^"'`]*)["'`]\s*\})/);
    if(attribute&&isOwnerDestination(attribute[1]??attribute[2]))found.push(attribute[1]??attribute[2]);
    if(/\b(?:href|to)\s*=\s*\{\s*(?:BASE_PATH|MATERIALS_PATH)\s*\}/.test(tag[0]))found.push('owner route constant');
  }
  return found;
}

async function walk(folder) {
  const files=[];
  for(const entry of await fs.readdir(folder,{withFileTypes:true})) {
    const file=path.join(folder,entry.name);
    if(entry.isDirectory())files.push(...await walk(file));else files.push(file);
  }
  return files;
}

export async function checkPublicNavigation(root) {
  const files=[...await walk(path.join(root,'public')),...await walk(path.join(root,'src'))];
  const violations=[];let checked=0;
  for(const file of files) {
    const relative=path.relative(root,file).replaceAll('\\','/');
    // This old bookmark is a redirect, not an entrance linked from public pages.
    if(relative==='public/privacy-guidelines.html'||relative==='src/app/BasePage.jsx')continue;
    if(!/\.html?$/.test(file)&&(!/\.jsx$/.test(file)||/\.test\.jsx$/.test(file)))continue;
    checked++;
    for(const destination of ownerLinks(await fs.readFile(file,'utf8')))violations.push({file:relative,destination});
  }
  if(violations.length)throw new Error(`공개 화면에 기지 진입 링크가 남았습니다:\n${violations.map(x=>`${x.file}: ${x.destination}`).join('\n')}`);
  return checked;
}

if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href) {
  const checked=await checkPublicNavigation(path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'));
  console.log(`[navigation] ${checked} public pages/components checked; no base entrance links.`);
}
