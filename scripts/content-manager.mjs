import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';
import { spawn } from 'node:child_process';
import { loadDraft,saveDraft,importFiles,readJson,writeJson,siteUrl } from './content-store.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const port=Number(process.env.SEUNG_MANAGER_PORT||8788);
const previewPort=Number(process.env.SEUNG_PREVIEW_PORT||8789);
const token=crypto.randomBytes(24).toString('hex');
const gitArgs=['-c',`safe.directory=${root.replaceAll('\\','/')}`,'-C',root];
const allowed = file => /^(public\/(content\/|share\/|materials\/))/.test(file);
let job={state:'idle',stage:'',logs:[]};
let mutationBusy=false;
async function mutate(fn){if(mutationBusy){const error=new Error('다른 저장을 마친 뒤 다시 실행해 주세요.');error.status=409;throw error;}mutationBusy=true;try{return await fn();}finally{mutationBusy=false;}}
function log(message){job.logs.push(String(message).slice(0,1000));job.logs=job.logs.slice(-35);}
function run(command,args){return new Promise((resolve,reject)=>{
  const child=spawn(command,args,{cwd:root,windowsHide:true,env:{...process.env,NODE_OPTIONS:`${process.env.NODE_OPTIONS||''} --preserve-symlinks --preserve-symlinks-main`,PATH:`${path.dirname(process.execPath)};C:\\Program Files\\nodejs;${process.env.PATH||''}`},shell:false});
  let output='';child.stdout.on('data',d=>{output+=d;});child.stderr.on('data',d=>{output+=d;});
  child.on('error',reject);child.on('close',code=>code===0?resolve(output):reject(new Error(output.slice(-2500)||`작업 종료 코드 ${code}`)));
});}
async function npm(args){const cli=process.env.npm_execpath||'C:/Program Files/nodejs/node_modules/npm/bin/npm-cli.js';return run(process.execPath,[cli,...args]);}
async function prepare(){
  job.stage='공유 페이지 만들기';log(job.stage);
  await run(process.execPath,['scripts/build-content.mjs']);
  job.stage='게시 검사와 미리보기 만들기';log(job.stage);
  await npm(['run','build:app']);
  const draft=await loadDraft(root);
  await writeJson(path.join(root,'.local-manager/prepared.json'),{revision:draft.revision,at:new Date().toISOString()});
  return draft;
}
async function changedFiles(){
  const raw=await run('git',[...gitArgs,'status','--porcelain','-z','--untracked-files=all']);
  const parts=raw.split('\0').filter(Boolean), files=[];
  for(let i=0;i<parts.length;i++){
    const status=parts[i].slice(0,2);files.push(parts[i].slice(3));
    if(/[RC]/.test(status)&&parts[i+1])files.push(parts[++i]);
  }
  return [...new Set(files)];
}
async function publish(){
  const branch=(await run('git',[...gitArgs,'branch','--show-current'])).trim();
  if(branch!=='main')throw new Error('게시 기준 브랜치가 main이 아닙니다. 구현 변경을 통합한 뒤 다시 시도해 주세요.');
  await run('git',[...gitArgs,'fetch','origin','main']);
  const remoteBefore=(await run('git',[...gitArgs,'rev-parse','origin/main'])).trim();
  const currentHead=(await run('git',[...gitArgs,'rev-parse','HEAD'])).trim();
  const pending=await readJson(path.join(root,'.local-manager/pending-push.json'),null);
  if(currentHead!==remoteBefore && !(pending?.sha===currentHead && pending?.remoteBefore===remoteBefore)) throw new Error('아직 게시하지 않은 다른 커밋이 있습니다. 함께 전송하지 않도록 먼저 통합해 주세요.');
  const initial=await changedFiles();
  if(initial.some(f=>!allowed(f)))throw new Error('자료 외의 코드 변경이 있습니다. 다른 작업을 함께 게시하지 않도록 먼저 통합해 주세요.');
  const draft=await prepare();
  const files=await changedFiles();
  if(files.some(f=>!allowed(f)))throw new Error('다른 작업의 변경이 발견되어 게시를 멈췄습니다. 저장한 자료는 남아 있습니다.');
  if(files.length){
    job.stage='확인한 자료 전송';log(job.stage);
    await run('git',[...gitArgs,'add','--',...files]);
    const staged=(await run('git',[...gitArgs,'diff','--cached','--name-only','-z'])).split('\0').filter(Boolean);
    if(staged.some(f=>!allowed(f)))throw new Error('게시 대상 외의 변경이 준비되어 있어 전송을 멈췄습니다.');
    await run(process.execPath,['scripts/check-public-privacy.mjs','--staged']);
    const automationEmail=['codex','users.noreply.github.com'].join('@');
    await run('git',[...gitArgs,'-c','user.name=Seung AI Labs Content Manager','-c',`user.email=${automationEmail}`,'commit','-m',`content: publish catalog revision ${draft.revision}`]);
  }
  const sha=(await run('git',[...gitArgs,'rev-parse','HEAD'])).trim();
  await writeJson(path.join(root,'.local-manager/pending-push.json'),{sha,remoteBefore});
  await run('git',[...gitArgs,'push','origin','main']);
  job.stage='웹 반영 확인 중';log(job.stage);
  const expected=JSON.stringify(draft);
  for(let attempt=0;attempt<90;attempt++){
    try{
      const res=await fetch(`${siteUrl}content/catalog.json?check=${sha}-${attempt}`,{cache:'no-store',signal:AbortSignal.timeout(10000)});
      const actual=await res.json();
      if(res.ok&&JSON.stringify(actual)===expected){
        const releaseResponse=await fetch(`${siteUrl}content/release.json?check=${sha}-${attempt}`,{cache:'no-store',signal:AbortSignal.timeout(10000)});
        const release=await releaseResponse.json();
        if(!releaseResponse.ok||release.revision!==draft.revision)continue;
        await writeJson(path.join(root,'.local-manager/deployed.json'),{...release,at:new Date().toISOString(),sha});
        job.stage='웹 반영 완료';log(job.stage);return;
      }
    }catch{/* 다음 확인에서 재시도 */}
    await new Promise(r=>setTimeout(r,5000));
  }
  throw new Error('GitHub 전송은 끝났으나 웹 반영 확인이 아직 끝나지 않았습니다. 저장 상태를 유지했습니다. 잠시 후 다시 확인해 주세요.');
}
async function startJob(action){
  if(job.state==='running'||mutationBusy)throw new Error('앞선 작업이 끝난 뒤 다시 눌러 주세요.');
  job={state:'running',stage:'준비 중',logs:[]};
  const work=action==='publish'?publish:prepare;
  work().then(()=>{job.state='complete';if(action!=='publish')job.stage='미리보기 준비 완료';}).catch(e=>{job.state='failed';job.stage='작업을 마치지 못했습니다';log(e.message);});
}
function json(res,status,data){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(data));}
async function body(req){let result=Buffer.alloc(0);for await(const chunk of req){result=Buffer.concat([result,chunk]);if(result.length>57*1024*1024)throw new Error('파일이 너무 큽니다. 한 번에 40MB까지 등록해 주세요.');}return JSON.parse(result.toString()||'{}');}
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.pdf':'application/pdf','.woff2':'font/woff2','.bib':'text/plain; charset=utf-8','.ris':'text/plain; charset=utf-8'};
async function file(res,base,urlPath){
  const relative=decodeURIComponent(urlPath).replace(/^\/+/, '');
  const target=path.resolve(base,relative);
  if(!target.startsWith(path.resolve(base)+path.sep)&&target!==path.resolve(base)){res.writeHead(404);res.end();return;}
  let actual=target;
  try{if((await fs.stat(actual)).isDirectory())actual=path.join(actual,'index.html');const data=await fs.readFile(actual);res.writeHead(200,{'Content-Type':mime[path.extname(actual)]||'application/octet-stream','Cache-Control':'no-store'});res.end(data);}catch{res.writeHead(404);res.end('자료를 찾을 수 없습니다.');}
}
const server=http.createServer(async(req,res)=>{
  try{
    if(![`127.0.0.1:${port}`,`localhost:${port}`].includes(req.headers.host)){res.writeHead(403);res.end();return;}
    const url=new URL(req.url,`http://127.0.0.1:${port}`);
    if(url.pathname.startsWith('/__manage/api/')){
      const origin=req.headers.origin;
      if(origin&&![`http://127.0.0.1:${port}`,`http://localhost:${port}`].includes(origin)){json(res,403,{error:'이 관리 화면에서 다시 실행해 주세요.'});return;}
      if(req.method!=='GET'&&req.headers['x-content-token']!==token){json(res,403,{error:'화면을 새로고침한 뒤 다시 실행해 주세요.'});return;}
      if(url.pathname.endsWith('/state')&&req.method==='GET'){
        json(res,200,{token,previewUrl:`http://127.0.0.1:${previewPort}/`,draft:await loadDraft(root),news:await readJson(path.join(root,'public/content/news.json'),{items:[]}),prepared:await readJson(path.join(root,'.local-manager/prepared.json'),null),deployed:await readJson(path.join(root,'.local-manager/deployed.json'),null),job});return;
      }
      if(url.pathname.endsWith('/job')&&req.method==='GET'){json(res,200,job);return;}
      if(url.pathname.endsWith('/state')&&req.method==='POST'){if(job.state==='running')throw new Error('현재 반영 중입니다. 완료 후 저장해 주세요.');json(res,200,{draft:await mutate(async()=>saveDraft(root,await body(req)))});return;}
      if(url.pathname.endsWith('/import')&&req.method==='POST'){if(job.state==='running')throw new Error('현재 반영 중입니다. 완료 후 등록해 주세요.');json(res,200,await mutate(async()=>importFiles(root,await body(req))));return;}
      if(['/__manage/api/prepare','/__manage/api/publish'].includes(url.pathname)&&req.method==='POST'){await startJob(url.pathname.endsWith('/publish')?'publish':'prepare');json(res,202,job);return;}
      json(res,404,{error:'요청을 찾을 수 없습니다.'});return;
    }
    if(url.pathname.startsWith('/__manage/')){await file(res,path.join(root,'scripts/manager-ui'),url.pathname.slice('/__manage/'.length)||'index.html');return;}
    res.writeHead(302,{Location:`http://127.0.0.1:${previewPort}${url.pathname}${url.search}`});res.end();
  }catch(e){json(res,e.status||400,{error:e.message});}
});
server.listen(port,'127.0.0.1',()=>console.log(`기지 관리: http://127.0.0.1:${port}/__manage/`));
http.createServer(async(req,res)=>{
  if(![`127.0.0.1:${previewPort}`,`localhost:${previewPort}`].includes(req.headers.host)){res.writeHead(403);res.end();return;}
  const url=new URL(req.url,`http://127.0.0.1:${previewPort}`);
  if(url.pathname.startsWith('/__manage/')){res.writeHead(404);res.end();return;}
  await file(res,path.join(root,'dist'),url.pathname==='/'?'/index.html':url.pathname);
}).listen(previewPort,'127.0.0.1',()=>console.log(`포털 미리보기: http://127.0.0.1:${previewPort}/`));
