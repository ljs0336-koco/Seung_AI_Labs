import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

export const sections = ['today','library','code','lecture','showcase','playground','personal','archive'];
export const placements = ['base','both','portal','archive'];
export const siteUrl = 'https://ljs0336-koco.github.io/Seung_AI_Labs/';
export const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

export function safeRelative(value) {
  const normalized = String(value).replaceAll('\\','/');
  if (!normalized || normalized.startsWith('/') || normalized.includes('\0') || /^[a-z]+:/i.test(normalized)) throw new Error('올바른 파일 이름을 선택해 주세요.');
  const parts = normalized.split('/');
  if (parts.some(p => !p || p === '.' || p === '..' || p.startsWith('.') || /[:<>"|?*]/.test(p) || /^(node_modules|dist|__pycache__)$/i.test(p))) throw new Error('자료에 포함할 수 없는 경로가 있습니다.');
  return parts.join('/');
}

export function safeHref(value) {
  const href = String(value || '').trim();
  if (/^https?:\/\//i.test(href)) {
    const url = new URL(href);
    if (url.username || url.password) throw new Error('계정 정보가 없는 주소를 입력해 주세요.');
    return href;
  }
  if (href.startsWith('#/')) return href;
  if (href.startsWith('./')) { safeRelative(href.slice(2).split('#')[0].split('?')[0].replace(/\/$/,'')); return href; }
  throw new Error('웹 주소 또는 포털의 자료 주소를 입력해 주세요.');
}

export function validateCatalog(input) {
  if (!input || input.schemaVersion !== 1 || !Array.isArray(input.items) || input.items.length > 2000) throw new Error('자료 목록 형식이 올바르지 않습니다.');
  const seen = new Set();
  const result = {schemaVersion:1, revision:Number(input.revision)||1, publishedAt:input.publishedAt||null, siteUrl, items:[]};
  for (const raw of input.items) {
    if (!/^[a-z0-9][a-z0-9-]{0,79}$/.test(raw.id || '') || seen.has(raw.id)) throw new Error('자료 고유 번호가 없거나 중복되었습니다.');
    seen.add(raw.id);
    if (!String(raw.title || '').trim() || String(raw.title).length > 240) throw new Error('제목을 240자 안으로 입력해 주세요.');
    if (!sections.includes(raw.section) || !placements.includes(raw.placement)) throw new Error('표시 위치를 다시 선택해 주세요.');
    const item = {id:raw.id, kind:['link','router','document','news'].includes(raw.kind)?raw.kind:'link', title:String(raw.title).trim(), description:String(raw.description||'').slice(0,2000), href:safeHref(raw.href), section:raw.section, placement:raw.placement, status:['live','candidate','locked','orphan'].includes(raw.status)?raw.status:'live'};
    if (['locked','orphan'].includes(item.status) && ['both','portal'].includes(item.placement)) throw new Error('아직 열 수 없는 자료는 포털에 올릴 수 없습니다.');
    if (raw.parent) item.parent = String(raw.parent);
    if (raw.children) item.children = raw.children.map(child => typeof child === 'string' ? child : ({title:String(child.title||'열기').slice(0,120),href:safeHref(child.href)}));
    for (const key of ['targetHref','date','source','newsId']) if (raw[key]) item[key] = key==='targetHref'?safeHref(raw[key]):String(raw[key]).slice(0,240);
    result.items.push(item);
  }
  return result;
}

export async function readJson(file, fallback) {
  try { return JSON.parse(await fs.readFile(file,'utf8')); } catch(error) { if(error.code==='ENOENT') return fallback; throw error; }
}
export async function writeJson(file, value) {
  await fs.mkdir(path.dirname(file),{recursive:true});
  const temp = `${file}.${crypto.randomUUID()}.tmp`;
  await fs.writeFile(temp,JSON.stringify(value,null,2)+'\n','utf8');
  try { await fs.rename(temp,file); }
  catch(error) {
    if(!['EPERM','EEXIST'].includes(error.code))throw error;
    // Windows managed folders may allow rewriting but deny replacing a directory entry.
    await fs.writeFile(file,JSON.stringify(value,null,2)+'\n','utf8');
    await fs.unlink(temp);
  }
}

export async function loadDraft(root) {
  const published = await readJson(path.join(root,'public/content/catalog.json'),null);
  return validateCatalog(await readJson(path.join(root,'.local-manager/draft.json'),published));
}
export async function saveDraft(root, input) {
  const previous = await loadDraft(root);
  if(Number(input.revision)!==previous.revision){const error=new Error('다른 화면에서 자료가 바뀌었습니다. 최신 목록을 읽은 뒤 다시 저장해 주세요.');error.status=409;throw error;}
  const draft = validateCatalog(input);
  draft.revision = Math.max(previous.revision, draft.revision)+1;
  await writeJson(path.join(root,'.local-manager/draft.json'),draft);
  return draft;
}

export async function importFiles(root, {title,description='',section='personal',files,entry,expectedRevision,placement='base',existingId}) {
  if (!Array.isArray(files) || !files.length || files.length>1500) throw new Error('공유할 파일을 선택해 주세요.');
  if(existingId&&!/^m-[a-f0-9]{16}$/.test(existingId))throw new Error('업데이트할 자료를 다시 선택해 주세요.');
  const id = existingId || 'm-'+crypto.randomUUID().replaceAll('-','').slice(0,16);
  const records=[]; let total=0;
  for (const file of files) {
    const name=safeRelative(file.path||file.name);
    if (!/\.(html?|pdf|pptx?|hwpx?|docx?|xlsx?|csv|txt|md|png|jpe?g|gif|webp|svg|css|js|mjs|json|woff2?|ttf|mp3|mp4|webm|glb|gltf|bin|obj|mtl)$/i.test(name)) throw new Error(`지원하지 않는 파일 형식입니다: ${path.extname(name)}`);
    const data=Buffer.from(String(file.data||''),'base64'); total+=data.length;
    if(total>40*1024*1024) throw new Error('한 번에 40MB까지 등록할 수 있습니다. 자료를 나누어 등록해 주세요.');
    if(records.some(r=>r.name===name)) throw new Error('같은 이름의 파일이 두 개 있습니다.');
    records.push({name,data});
  }
  const entryName=safeRelative(entry||records.find(r=>/(^|\/)index\.html?$/i.test(r.name))?.name||records[0].name);
  if(!records.some(r=>r.name===entryName)) throw new Error('처음 열 파일을 다시 선택해 주세요.');
  const draft=await loadDraft(root);
  if(existingId&&!draft.items.some(x=>x.id===existingId&&x.kind==='document'))throw new Error('업데이트할 기존 자료를 찾을 수 없습니다.');
  if(expectedRevision!==undefined&&Number(expectedRevision)!==draft.revision){const error=new Error('다른 화면에서 자료가 바뀌었습니다. 최신 목록을 읽은 뒤 다시 등록해 주세요.');error.status=409;throw error;}
  const encodedEntry=entryName.split('/').map(encodeURIComponent).join('/');
  const item={id,kind:'document',title,description,section,placement,status:'live',href:`./share/materials/${id}/`,targetHref:`./materials/${id}/${encodedEntry}`};
  const valid=validateCatalog({...draft,items:existingId?draft.items.map(x=>x.id===id?item:x):[...draft.items,item]});
  const dest=path.join(root,'.local-manager/uploads',id);
  await fs.mkdir(dest,{recursive:true});
  for(const record of records){const target=path.join(dest,record.name);await fs.mkdir(path.dirname(target),{recursive:true});await fs.writeFile(target,record.data);}
  await writeJson(path.join(root,'.local-manager/imports',id+'.json'),{id,entry:entryName,files:records.map(r=>r.name)});
  return {draft:await saveDraft(root,valid),item};
}

export async function materialize(root,draft) {
  draft=validateCatalog(draft);
  const publicRoot=path.join(root,'public');
  for(const item of draft.items.filter(x=>x.kind==='document')){
    const record=await readJson(path.join(root,'.local-manager/imports',item.id+'.json'),null);
    if(record) for(const relative of record.files){
      const name=safeRelative(relative);
      const target=path.join(publicRoot,'materials',item.id,name);
      await fs.mkdir(path.dirname(target),{recursive:true});
      await fs.copyFile(path.join(root,'.local-manager/uploads',item.id,name),target);
    }
    const canonical=new URL(item.href,siteUrl).href;
    const html=`<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(item.title)} · Seung AI Labs</title><link rel="canonical" href="${canonical}"><meta property="og:title" content="${escapeHtml(item.title)}"><meta property="og:description" content="${escapeHtml(item.description)}"><meta property="og:url" content="${canonical}"><meta property="og:image" content="${siteUrl}shared/share-default.png"><link rel="stylesheet" href="../../../shared/content-share.css"></head><body><main style="max-width:760px;margin:48px auto;padding:24px;font-family:system-ui;line-height:1.7"><a href="../../../#/base">← 나만의 기지</a><h1>${escapeHtml(item.title)}</h1><p>${escapeHtml(item.description)}</p><p><a href="../../../${escapeHtml(item.targetHref.slice(2))}">자료 열기 ↗</a></p><label>공유 주소<input style="display:block;width:100%" readonly value="${canonical}" onclick="this.select()"></label></main></body></html>`;
    const page=path.join(publicRoot,'share/materials',item.id,'index.html');await fs.mkdir(path.dirname(page),{recursive:true});await fs.writeFile(page,html,'utf8');
  }
  await writeJson(path.join(publicRoot,'content/catalog.json'),draft);
  return draft;
}
