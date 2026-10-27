import {spawn} from 'node:child_process';
import {access} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const address='http://127.0.0.1:8788/__manage/';
async function ready(){try{return (await fetch(address+'api/state',{signal:AbortSignal.timeout(1500)})).ok;}catch{return false;}}
function run(command,args){return new Promise((resolve,reject)=>{const p=spawn(command,args,{cwd:root,windowsHide:true,stdio:'inherit'});p.on('error',reject);p.on('exit',code=>code===0?resolve():reject(new Error('미리보기를 만들지 못했습니다.')));});}
try{
 if(!await ready()){
  try{await access(path.join(root,'dist/index.html'));}catch{await run(process.execPath,[process.env.npm_execpath||'C:/Program Files/nodejs/node_modules/npm/bin/npm-cli.js','run','build']);}
  const processHandle=spawn(process.execPath,[path.join(root,'scripts/content-manager.mjs')],{cwd:root,detached:true,windowsHide:true,stdio:'ignore'});processHandle.unref();
  let opened=false;for(let attempt=0;attempt<30;attempt++){await new Promise(resolve=>setTimeout(resolve,400));if(await ready()){opened=true;break;}}
  if(!opened)throw new Error('관리 화면을 열지 못했습니다. 잠시 후 다시 실행해 주세요.');
 }
 spawn('cmd.exe',['/c','start','',address],{windowsHide:true,stdio:'ignore'}).unref();
}catch(error){console.error(error.message);process.exitCode=1;}
