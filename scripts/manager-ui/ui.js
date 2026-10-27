const $=id=>document.getElementById(id);
let state,tab='resources',edited=null,selectedFiles=[],dirty=false;
const sections={today:'오늘',library:'서고',code:'C.O.D.E',lecture:'특강',showcase:'쇼케이스',personal:'개인',archive:'보관함'};
const notice=text=>{$('notice').textContent=text;};
async function api(route,method='GET',data){const response=await fetch(`/__manage/api/${route}`,{method,headers:method==='GET'?{}:{'Content-Type':'application/json','X-Content-Token':state?.token||''},body:data?JSON.stringify(data):undefined});const value=await response.json();if(!response.ok)throw new Error(value.error||'작업을 마치지 못했습니다.');return value;}
async function refresh(){state=await api('state');dirty=false;render();}
function el(tag,text,cls){const node=document.createElement(tag);if(text)node.textContent=text;if(cls)node.className=cls;return node;}
function action(text,fn){const node=el('button',text);node.type='button';node.addEventListener('click',()=>Promise.resolve(fn()).catch(e=>notice(e.message)));return node;}
function canonical(href){return new URL(href,state.draft.siteUrl).href;}
async function copy(text){try{await navigator.clipboard.writeText(text);notice('공유 주소를 복사했습니다.');}catch{$('copy-text').value=text;$('copy-description').textContent='아래 내용을 선택해서 복사하세요.';$('copy-dialog').showModal();$('copy-text').select();}}
async function save(){if(!dirty)return;const result=await api('state','POST',state.draft);state.draft=result.draft;dirty=false;notice('변경을 PC에 저장했습니다. 웹에는 아직 반영하지 않았습니다.');render();}
function render(){
 $('resources').setAttribute('aria-pressed',String(tab==='resources'));$('news').setAttribute('aria-pressed',String(tab==='news'));
 $('saved').textContent=dirty?`저장할 변경이 있습니다 · ${state.draft.revision}판`:`저장된 변경 · ${state.draft.revision}판`;
 $('deployed').textContent=state.deployed?`웹 반영 확인 · ${state.deployed.revision}판 (${new Date(state.deployed.at).toLocaleString('ko-KR')})`:'웹 반영을 아직 확인하지 않았습니다.';
 const query=$('search').value.trim().toLowerCase();const list=$('list');list.replaceChildren();
 const items=(tab==='news'?state.news.items:state.draft.items).filter(x=>`${x.title} ${x.description||x.summary||''}`.toLowerCase().includes(query));
 for(const item of items){
  const row=el('article',null,'row');const text=el('div',null,'text');text.append(el('h3',item.title),el('p',item.description||item.summary||''));row.append(text);
  const meta=el('div');meta.append(el('span',tab==='news'?(item.date||'뉴스'):sections[item.section],'badge'));row.append(meta);
  if(tab==='resources'){
   const label=el('label',null,'switch');const check=document.createElement('input');check.type='checkbox';check.checked=['both','portal'].includes(item.placement);check.disabled=['locked','orphan'].includes(item.status);check.addEventListener('change',()=>{item.placement=check.checked?'both':item.section==='archive'?'archive':'base';dirty=true;render();notice('변경 저장을 눌러 주세요.');});label.append(check,document.createTextNode('포털에 표시'));row.append(label);
  }else row.append(el('span',item.source||''));
  const actions=el('div',null,'actions');
  if(tab==='resources'){
   actions.append(action('편집',()=>openEditor(item)));
   const live=/^https?:/.test(item.href)||!item.id.startsWith('m-')||(state.deployed?.items||[]).some(x=>x.id===item.id&&x.href===item.href);
   const copyButton=action(live?'링크 복사':'웹 반영 후 주소 복사',()=>copy(canonical(item.href)));copyButton.disabled=!live;actions.append(copyButton);
   if(!dirty&&state.prepared?.revision===state.draft.revision){const link=el('a','미리보기');link.href=new URL(item.href,state.previewUrl).href;link.target='_blank';link.rel='noopener';actions.append(link);}else actions.append(el('span','미리보기 만들기 필요','badge'));
  }else{
   const href=`./share/news/${item.id}/`;
   const live=(state.deployed?.newsIds||[]).includes(item.id);const copyButton=action(live?'링크 복사':'웹 반영 후 주소 복사',()=>copy(canonical(href)));copyButton.disabled=!live;actions.append(copyButton,action('요약 복사',()=>copy(`${item.title}\n\n${item.summary||''}\n\n${item.source||''} · ${item.date||''}\n원문: ${item.url}${live?'\n요약: '+canonical(href):''}`)));
   const link=el('a','한 건 보기 ↗');link.href=new URL(`share/news/${item.id}/`,state.previewUrl).href;link.target='_blank';link.rel='noopener';actions.append(link);
  }
  row.append(actions);list.append(row);
 }
 if(!items.length)list.append(el('p','찾은 자료가 없습니다.','empty'));
 renderJob(state.job);
}
function openEditor(item){edited=item||null;selectedFiles=[];$('form').reset();$('editor-title').textContent=item?'자료 편집':'자료 추가';$('title').value=item?.title||'';$('description').value=item?.description||'';$('section').value=item?.section||'personal';$('href').value=item?.href||'';$('href').readOnly=item?.kind==='document';$('portal').checked=['both','portal'].includes(item?.placement);$('import-tools').hidden=!!item&&item.kind!=='document';$('entry-wrap').hidden=true;$('file-count').textContent=item?.kind==='document'?'새 파일을 선택하면 기존 공유 주소를 유지하며 교체합니다.':'한 번에 40MB까지';$('form-error').textContent='';$('editor').showModal();$('title').focus();}
function selectFiles(files){selectedFiles=[...files];const size=selectedFiles.reduce((sum,f)=>sum+f.size,0);$('file-count').textContent=`${selectedFiles.length}개 · ${(size/1024/1024).toFixed(1)}MB`;$('entry-wrap').hidden=!selectedFiles.length;$('entry').replaceChildren();for(const file of selectedFiles){const option=el('option',file.webkitRelativePath||file.name);option.value=file.webkitRelativePath||file.name;$('entry').append(option);}const index=selectedFiles.find(f=>/(^|\/)index\.html?$/i.test(f.webkitRelativePath||f.name));if(index)$('entry').value=index.webkitRelativePath||index.name;$('href').value='';}
function base64(file){return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result).split(',')[1]);reader.onerror=()=>reject(new Error('파일을 읽을 수 없습니다.'));reader.readAsDataURL(file);});}
$('form').addEventListener('submit',async event=>{
 event.preventDefault();const button=event.submitter;button.disabled=true;$('form-error').textContent='';
 try{
  const values={title:$('title').value.trim(),description:$('description').value,section:$('section').value};
  if(selectedFiles.length){
   await save();
   if(selectedFiles.reduce((sum,f)=>sum+f.size,0)>40*1024*1024)throw new Error('한 번에 40MB까지 등록할 수 있습니다.');
   const files=[];for(const file of selectedFiles)files.push({path:file.webkitRelativePath||file.name,data:await base64(file)});
   const result=await api('import','POST',{...values,files,entry:$('entry').value,expectedRevision:state.draft.revision,existingId:edited?.kind==='document'?edited.id:undefined,placement:$('portal').checked?'both':values.section==='archive'?'archive':'base'});state.draft=result.draft;selectedFiles=[];edited=result.item;
  }else{
   const item={...(edited||{id:'m-'+crypto.randomUUID().replaceAll('-','').slice(0,16),kind:'link',status:'live'}),...values,href:$('href').value.trim(),placement:$('portal').checked?'both':values.section==='archive'?'archive':'base'};
   if(edited)state.draft.items=state.draft.items.map(x=>x.id===edited.id?item:x);else state.draft.items.push(item);
   dirty=true;
   await save();
  }
  $('editor').close();render();notice('자료를 저장했습니다. 미리보기를 만든 뒤 받는 사람 화면을 확인하세요.');
 }catch(error){$('form-error').textContent=error.message;await refresh();}finally{button.disabled=false;}
});
function renderJob(job){if(!job||job.state==='idle')return;$('progress').hidden=false;$('stage').textContent=job.stage;$('logs').textContent=job.logs?.join('\n')||'';for(const id of ['save','prepare','publish','add'])$(id).disabled=job.state==='running';}
async function launch(actionName){await save();state.job=await api(actionName,'POST');renderJob(state.job);const poll=async()=>{state.job=await api('job');renderJob(state.job);if(state.job.state==='running')setTimeout(()=>poll().catch(e=>notice(e.message)),1000);else{await refresh();notice(state.job.state==='complete'?(actionName==='publish'?'웹 반영을 확인했습니다.':'미리보기가 준비됐습니다. 자료의 미리보기를 열어 확인하세요.'):'작업 내용을 확인해 주세요. 저장된 변경은 남아 있습니다.');}};setTimeout(()=>poll().catch(e=>notice(e.message)),800);}
$('resources').onclick=()=>{tab='resources';render();};$('news').onclick=()=>{tab='news';render();};$('search').oninput=render;$('add').onclick=()=>openEditor();$('close').onclick=()=>$('editor').close();$('copy-close').onclick=()=>$('copy-dialog').close();$('files').onchange=e=>selectFiles(e.target.files);$('folder').onchange=e=>selectFiles(e.target.files);
$('save').onclick=()=>save().catch(e=>notice(e.message));$('prepare').onclick=()=>launch('prepare').catch(e=>notice(e.message));$('publish').onclick=()=>launch('publish').catch(e=>notice(e.message));
refresh().catch(e=>notice(e.message));
