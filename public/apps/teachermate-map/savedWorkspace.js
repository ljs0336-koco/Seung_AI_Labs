const KEY = 'teachermate:sample-workspace:1';
const plain = value => value && typeof value === 'object' && !Array.isArray(value);
const list = (value, check) => Array.isArray(value) && value.length <= 4000 && value.every(check);
const text = value => typeof value === 'string' && value.length <= 65536;
const id = value => typeof value === 'string' && /^[\w.-]{1,160}$/.test(value);
const bool = value => typeof value === 'boolean';
const fields = (obj, keys) => plain(obj) && keys.every(key=>text(obj[key]));
const distinct = (rows, test) => list(rows,test) && new Set(rows.map(row=>row.id)).size===rows.length;

function validDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(value+'T00:00:00Z');
  return Number.isFinite(+date) && date.toISOString().slice(0,10) === value;
}

export function connectWorkspace(state,duties,render,notify) {
  const known = new Set(duties.map(d=>d.id));
  let previous = null;
  let lastData = '';
  let notice = '';
  function snapshot() {
    return {format:'teachermate:school-demo',version:1,tasks:state.tasks,handoverCards:state.handoverCards,
      uploadHistory:state.uploadHistory,chatMessages:state.chatMessages,
      myDutyIds:[...state.myDutyIds],icsMyOnly:state.icsMyOnly};
  }
  function validTask(t) {
    if (!fields(t,['weekLabel','title','note','folderPath','sourceTitle','sourceExcerpt','typeLabel']) || !id(t.id) ||
      !known.has(t.dutyId) || !validDate(t.dueDate) || t.month!==Number(t.dueDate.slice(5,7)) ||
      !['draft','collect','task'].includes(t.category) || !['draft','confirmed'].includes(t.status) || !bool(t.done) ||
      !distinct(t.checklist,c=>plain(c)&&id(c.id)&&text(c.text)&&bool(c.done))) return false;
    const s=t.submission;
    return s===null || (plain(s) && list(s.targetDutyIds,v=>known.has(v)) && s.targetDutyIds.length>0 &&
      list(s.submittedDutyIds,v=>s.targetDutyIds.includes(v)) && bool(s.nudged) && text(s.messengerTemplate));
  }
  function validCard(c) {
    return fields(c,['title','ownerLabel','updatedAt','summary','folderPath','sourceTitle','messengerQuestionTemplate']) &&
      id(c.id) && known.has(c.dutyId) && list(c.tips,text) &&
      list(c.timeline,t=>fields(t,['monthLabel','text'])) &&
      distinct(c.qaList,q=>fields(q,['author','question','answer','createdAt']) && id(q.id) && bool(q.byPredecessor));
  }
  function check(b) {
    if (!plain(b) || b.format!=='teachermate:school-demo' || b.version!==1 ||
      !distinct(b.tasks,validTask) || !distinct(b.handoverCards,validCard) || !b.handoverCards.length ||
      !list(b.uploadHistory,h=>fields(h,['docType','docTitle','status','reflectedAt'])&&id(h.id)&&Number.isSafeInteger(h.extractedCount)&&h.extractedCount>=0) ||
      !list(b.chatMessages,m=>plain(m)&&id(m.id)&&text(m.text)&&(m.role==='user' || (m.role==='bot' &&
        fields(m,['badge','badgeTone','questionText','escalationDutyId']) && list(m.sources,r=>plain(r)&&id(r.id)&&['task','handover'].includes(r.type)&&text(r.label))))) ||
      !list(b.myDutyIds,d=>known.has(d)) || !bool(b.icsMyOnly)) {
      throw new Error('형식이 맞지 않아 복원하지 않았습니다. 이 앱의 설정에서 내려받은 백업 파일을 선택해 주세요.');
    }
    return b;
  }
  function apply(b) {
    for (const k of ['tasks','handoverCards','uploadHistory','chatMessages','icsMyOnly']) state[k]=b[k];
    state.myDutyIds=new Set(b.myDutyIds);
    if (!state.handoverCards.some(c=>c.id===state.selectedHandoverId)) state.selectedHandoverId=state.handoverCards[0].id;
    if (state.drawer && !state.tasks.some(t=>t.id===state.drawer.taskId)) state.drawer=null;
    lastData=JSON.stringify(snapshot());
  }
  function refresh() {
    try {
      const raw=localStorage.getItem(KEY);
      if (raw===previous) return;
      if (raw) apply(check(JSON.parse(raw)));
      previous=raw;
      render();
    } catch { notice='저장된 자료를 읽지 못했습니다. 별도 백업을 이용해 주세요.'; }
  }
  function save() {
    const data=JSON.stringify(snapshot());
    if (data===lastData) return;
    try {
      if (localStorage.getItem(KEY)!==previous) {
        notice='다른 창에서 자료가 바뀌었습니다. 현재 내용을 파일로 백업한 뒤 새로고침해 주세요.';
        notify(notice);return;
      }
      localStorage.setItem(KEY,data);
      lastData=previous=data;notice='';
    } catch {
      notice='브라우저가 저장을 제한합니다. 이 창을 닫기 전에 설정에서 백업을 내려받아 주세요.';
      notify(notice);
    }
  }
  function restore(raw) {
    const checked=check(JSON.parse(raw));
    apply(checked);
    lastData='';save();render();
  }
  try {
    previous=localStorage.getItem(KEY);
    if (previous) apply(check(JSON.parse(previous)));
    else lastData=JSON.stringify(snapshot());
  } catch {notice='브라우저 저장 자료를 읽지 못했습니다. 설정에서 백업을 이용해 주세요.';}
  for (const type of ['click','change','submit']) {
    document.addEventListener(type,()=>queueMicrotask(save));
  }
  window.addEventListener('tm:changed',save);
  window.addEventListener('tm:refresh',refresh);
  window.addEventListener('storage',e=>{if(e.key===KEY) refresh();});
  return {snapshot,check,restore,save,get notice(){return notice;}};
}
