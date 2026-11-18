// Edit the existing handover card data. The host owns the school dataset and its backup.
const ticketPrefix = 'teachermate.local-reply.v1:';
const linkHash = '#tm-reply=';
const changed = () => window.dispatchEvent(new Event('tm:changed'));
const refresh = () => window.dispatchEvent(new Event('tm:refresh'));
function textNode(tag, text, cls) {
  const node = document.createElement(tag);
  if (text) node.textContent = text;
  if (cls) node.className = cls;
  return node;
}
function button(text, onClick) {
  const node = textNode('button', text, 'btn btn-outline btn-sm');
  node.type = 'button';
  node.addEventListener('click', onClick);
  return node;
}
function editor(host, labelText, value, max, validate, save) {
  if (host.querySelector('.tm-ho-edit')) return;
  const form = textNode('form', '', 'tm-ho-edit');
  const field = textNode('textarea', '', 'field-input');
  field.rows = 3;
  field.maxLength = max;
  field.required = true;
  field.value = value;
  const label = textNode('label', labelText);
  label.append(field);
  const wrap = textNode('div', '', 'drawer-actions-row');
  const submit = textNode('button', '저장', 'btn btn-primary btn-sm');
  submit.type = 'submit';
  const trigger = document.activeElement;
  wrap.append(submit,button('취소', () => {form.remove();if (trigger?.isConnected) trigger.focus();}));
  form.append(label,wrap);
  form.addEventListener('submit', event => {
    event.preventDefault();
    const val = field.value.trim();
    const error = !val ? '내용을 입력해 주세요.' : validate(val);
    if (error) {
      field.setCustomValidity(error);
      field.reportValidity();
      field.addEventListener('input', () => field.setCustomValidity(''), {once:true});
      return;
    }
    save(val);
  });
  host.append(form);
  field.focus();
}
function storedTicket(token) {
  if (!/^[0-9a-f]{40}$/.test(token)) return null;
  try {
    const value = JSON.parse(localStorage.getItem(ticketPrefix + token));
    return value && value.expires > Date.now() ? value : null;
  } catch { return null; }
}
function matching(cards, token) {
  const ticket = storedTicket(token);
  if (!ticket) return null;
  const card = cards.find(c => c.id === ticket.card);
  const item = card?.qaList.find(q => q.id === ticket.questionId);
  return item && !item.answer && item.question === ticket.question ? item : null;
}
function newTicket(card, qa) {
  // Unrelated tickets expire; reissuing a link for this question invalidates its previous URL.
  for (const key of Object.keys(localStorage)) {
    if (!key.startsWith(ticketPrefix)) continue;
    const previous = storedTicket(key.slice(ticketPrefix.length));
    if (!previous || (previous.card === card.id && previous.questionId === qa.id)) localStorage.removeItem(key);
  }
  const bytes = new Uint8Array(20);
  crypto.getRandomValues(bytes);
  const token = Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');
  localStorage.setItem(ticketPrefix+token,JSON.stringify({card:card.id, questionId:qa.id, question:qa.question, expires:Date.now()+86400000}));
  const url = new URL(location.href);
  url.hash = linkHash.slice(1) + token;
  return url.href;
}
export function attachHandoverEditors(root, card, api) {
  if (!root || !card) return;
  const summary = root.querySelector('.handover-detail-stack .drawer-section-note');
  if (!summary || summary.parentElement.querySelector('.tm-ho-tools')) return;
  const tools = textNode('div','','tm-ho-tools');
  tools.append(button('메모 수정', () => editor(tools,'인수인계 메모',card.summary || '',3000,api.check,val => {
    card.summary=val; changed(); api.render(); api.notify('인수인계 메모를 저장했습니다.');
  })));
  summary.after(tools);
  const rows = root.querySelectorAll('.qa-item');
  for (let i=0; i<rows.length; i++) {
    const row=rows[i], qa=card.qaList[i];
    if (!qa) continue;
    const actions=textNode('div','','tm-ho-tools');
    const write = (key,label,max) => editor(row,label,qa[key]||'',max,api.check,val => {
      if (key==='question' && qa.question!==val && qa.answer) {
        if (!window.confirm('질문을 고치면 기존 답변은 그대로 남습니다. 질문을 바꿀까요?')) return;
      }
      qa[key]=val;
      if (key==='answer') qa.byPredecessor=false;
      changed(); api.render(); api.notify(label+'을 저장했습니다.');
    });
    actions.append(button('질문 수정',()=>write('question','질문',200)),button(qa.answer?'답변 수정':'답변 작성',()=>write('answer','답변',1500)));
    if (!qa.answer) actions.append(button('이 브라우저용 회신 링크 만들기',async () => {
      let url;
      try { url=newTicket(card,qa); } catch { api.notify('이 브라우저에서 링크를 저장할 수 없습니다. 답변 작성 버튼을 이용해 주세요.');return; }
      row.querySelector('.tm-ho-link')?.remove();
      const wrap=textNode('div','','tm-ho-link');
      const link=textNode('a','질문 한 건 열기');
      link.href=url;link.target='_blank';link.rel='noopener';
      const address=textNode('input','','field-input');address.type='text';address.readOnly=true;address.value=url;address.setAttribute('aria-label','이 브라우저에서 열 회신 주소');
      wrap.append(link,button('회신 주소 복사',async ()=>{
        try { await navigator.clipboard.writeText(url);api.notify('이 브라우저용 주소를 복사했습니다.'); }
        catch {address.focus();address.select();api.notify('선택한 주소를 복사해 주세요.');}
      }),address);
      row.append(wrap);
      link.focus();
    }));
    row.append(actions);
  }
}
export function openLocalReply(api) {
  function enter() {
    if (!location.hash.startsWith(linkHash)) return;
    const token = location.hash.slice(linkHash.length);
    const shell = document.querySelector('.app-shell');
    if (shell) shell.hidden=true;
    document.getElementById('tm-local-reply')?.remove();
    const page=textNode('main','','tm-local-reply panel-card');
    page.id='tm-local-reply';
    const heading=textNode('h1','인수인계 질문에 답변');heading.tabIndex=-1;
    const desc=textNode('p','이 기기의 같은 브라우저에서만 답변할 수 있습니다. 답변은 이곳의 인수인계 노트에 기록됩니다.');
    const status=textNode('p',''); status.setAttribute('role','status');
    const home=textNode('a','업무 화면으로 돌아가기');const homeUrl=new URL(location.href);homeUrl.hash='';home.href=homeUrl.href;
    home.addEventListener('click',e=>{e.preventDefault();history.replaceState(null,'',home.href); location.reload();});
    page.append(heading,desc,status);document.body.prepend(page);heading.focus();
    refresh();
    const qa=matching(api.cards(),token);
    if (!qa) {
      status.textContent='사용할 수 없는 링크입니다. 이미 답변했거나, 링크가 만료됐거나, 이 브라우저에 해당 질문이 없습니다.';
      page.append(home);return;
    }
    const question=textNode('p','질문 · '+qa.question,'tm-ho-question');
    const form=textNode('form','','tm-ho-edit');
    const label=textNode('label','남길 답변');const answer=textNode('textarea','','field-input');answer.required=true;answer.maxLength=1500;answer.rows=4;label.append(answer);
    const submit=textNode('button','답변 한 번 등록','btn btn-primary btn-sm');submit.type='submit';
    form.append(label,submit);page.append(question,form,home);
    form.addEventListener('submit',async event=>{
      event.preventDefault();
      const val=answer.value.trim();
      const error=!val?'답변을 입력해 주세요.':api.check(val);
      if (error) {answer.setCustomValidity(error);answer.reportValidity();answer.addEventListener('input',()=>answer.setCustomValidity(''),{once:true});return;}
      submit.disabled=true;
      const commit=()=>{
        refresh();
        const current=matching(api.cards(),token);
        if (!current) {form.remove(); status.textContent='이 링크는 이미 사용됐거나 질문이 변경됐습니다.';return;}
        // Consume the ticket and save the response in the same lock shared by tabs.
        localStorage.removeItem(ticketPrefix+token);
        current.answer=val;current.byPredecessor=false;
        changed();form.remove();status.textContent='답변을 기록했습니다. 이 링크의 사용이 끝났습니다.';
      };
      try {
        if (!navigator.locks) {status.textContent='이 브라우저에서는 링크 등록을 지원하지 않습니다. 인수인계 화면에서 직접 답변을 작성해 주세요.';return;}
        await navigator.locks.request('teachermate.local-reply:'+token,commit);
      } catch {status.textContent='브라우저 저장 공간을 확인한 뒤 다시 시도해 주세요.';}
      finally {submit.disabled=false;}
    });
  }
  enter();
  window.addEventListener('hashchange',()=>{
    if (location.hash.startsWith(linkHash)) enter();
    else if (document.getElementById('tm-local-reply')) location.reload();
  });
}
