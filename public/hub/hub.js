(() => {
  'use strict';
  const TABS = [{ id: 'overview', title: '개요' }, { id: 'content', title: '강의 내용' }, { id: 'materials', title: '자료' }];
  const SHORT_NAMES = { jeju: '제주대 · 예비교원', hs: '고교 · 로보독', snu: '서울대 · AI융합교육' };
  const PAGE_SIZE = 3;
  const home = document.getElementById('view-home');
  const detail = document.getElementById('view-lecture');
  let pendingFocus = null;
  let previousLecture = null;

  function esc(value) {
    return String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  }

  function clamp(value, maximum) {
    const number = Number.parseInt(value, 10);
    return Number.isFinite(number) ? Math.max(0, Math.min(number, Math.max(0, maximum))) : 0;
  }

  function readRoute() {
    const [id, tabName, selection, page] = location.hash.slice(1).split('/');
    const lecture = LECTURES.find(item => item.id === id);
    const tab = TABS.some(item => item.id === tabName) ? tabName : 'overview';
    return { lecture, tab, selection, page };
  }

  function setRoute(hash, focusId) {
    pendingFocus = focusId;
    if (location.hash === hash) route();
    else location.hash = hash;
  }

  function renderHome() {
    home.innerHTML = `<div class="home-intro"><h2>배움의 현장에서</h2><p>강의를 고르고, 개요 · 진행 내용 · 자료를 나누어 살펴보세요.</p></div>
      <p class="lecture-count">공개 강의 / ${LECTURES.length.toString().padStart(2, '0')}</p>
      <div class="lecture-grid">${LECTURES.map((lecture, index) => `<a class="lecture-card" href="#${esc(lecture.id)}">
        <div class="card-top"><span class="card-index">${(index + 1).toString().padStart(2, '0')}</span><span class="badge">${esc(lecture.badge)}</span><span class="status">${esc(lecture.status)}</span></div>
        <h3>${esc(lecture.title)}</h3><p class="card-bottom">${esc(lecture.facts[0]?.value)}<br>${esc(lecture.facts[2]?.value)}</p>
        <span class="card-open">강의 살펴보기 <span aria-hidden="true">↗</span></span></a>`).join('')}</div>`;
  }

  function renderOverview(lecture) {
    return `<div class="overview-grid"><div><p class="lead">${esc(lecture.lead)}</p><aside class="key-statement"><p class="small-label">${esc(lecture.keyLabel)}</p><p>${esc(lecture.key)}</p></aside></div>
      <dl class="facts">${lecture.facts.map(fact => `<div><dt>${esc(fact.label)}</dt><dd>${esc(fact.value)}</dd></div>`).join('')}</dl></div>
      <p class="notice">${esc(lecture.notice)}</p>`;
  }

  function renderPager({ label, index, count, href, prefix }) {
    return `<div class="pager"><span>${esc(label)}</span><button type="button" id="${prefix}-previous" data-route="${esc(href(Math.max(0, index - 1)))}" data-focus="${prefix}-previous" ${index === 0 ? 'disabled' : ''}>← 이전</button>
      <button type="button" id="${prefix}-next" data-route="${esc(href(Math.min(count - 1, index + 1)))}" data-focus="${prefix}-next" ${index >= count - 1 ? 'disabled' : ''}>다음 →</button></div>`;
  }

  function renderContent(lecture, selection) {
    const index = clamp(selection, lecture.flow.length - 1);
    const step = lecture.flow[index];
    const goals = lecture.list.length ? `<details><summary>${esc(lecture.listTitle)}</summary><ol class="text-list">${lecture.list.map(item => `<li>${esc(item)}</li>`).join('')}</ol></details>` : '';
    const checks = lecture.checks.length ? `<details><summary>${esc(lecture.checkTitle)}</summary><ul class="text-list check-list">${lecture.checks.map(item => `<li><strong>${esc(item.k)}</strong>${esc(item.v)}</li>`).join('')}</ul>${lecture.closing ? `<p class="text-list closing">${esc(lecture.closing)}</p>` : ''}</details>` : '';
    if (!step) return `<p class="empty-note">진행 내용은 강의 안내 후 공개합니다.</p>${goals}${checks}`;
    return `<p class="section-label">${esc(lecture.flowTitle)} · 항목을 고르거나 이전·다음으로 넘겨 보세요.</p><div class="flow-layout"><nav class="step-list" aria-label="강의 진행 순서">${lecture.flow.map((item, stepIndex) => `<button type="button" class="step-button" id="step-${stepIndex}" data-route="#${esc(lecture.id)}/content/${stepIndex}" data-focus="step-${stepIndex}" ${stepIndex === index ? 'aria-current="step"' : ''}><span class="step-number">${esc(item.time)}</span><span class="step-title">${esc(item.title)}</span></button>`).join('')}</nav>
      <article class="step-detail" aria-labelledby="step-heading"><p class="step-position">${index + 1} / ${lecture.flow.length} &nbsp;·&nbsp; ${esc(step.time)}</p><h3 id="step-heading">${esc(step.title)}</h3><p class="step-description">${esc(step.text)}</p>${step.out ? `<p class="step-output"><span>활동 결과물</span>${esc(step.out)}</p>` : ''}
      ${renderPager({ label: `${index + 1} / ${lecture.flow.length}`, index, count: lecture.flow.length, href: next => `#${lecture.id}/content/${next}`, prefix: 'step' })}</article></div>
      <div class="content-notes">${goals}${checks}</div>`;
  }

  function renderMaterials(lecture, selection, pageValue) {
    const apps = lecture.apps.length ? `<section class="app-list" aria-label="수업 도구와 확장 체험">${lecture.apps.map(app => `<article class="app-card"><p class="small-label">${esc(app.tag)}</p><h3>${esc(app.title)}</h3><p>${esc(app.desc)}</p><div class="app-open"><span>${esc(app.note)}</span><a href="${esc(app.url)}" target="_blank" rel="noopener noreferrer">체험 열기 ↗<span class="sr-only"> (새 창)</span></a></div></article>`).join('')}</section>` : '';
    const groupIndex = clamp(selection, lecture.refs.length - 1);
    const group = lecture.refs[groupIndex];
    if (!group) return apps || `<p class="empty-note">${esc(lecture.materialsNote || '공개 자료는 강의 안내 후 이곳에 연결합니다.')}</p>`;
    const pageCount = Math.ceil(group.items.length / PAGE_SIZE);
    const page = clamp(pageValue, pageCount - 1);
    const start = page * PAGE_SIZE;
    return `${apps}<p class="section-label">참고 자료 · 주제를 고르면 원문 링크를 볼 수 있습니다.</p><div class="materials-layout"><div class="group-buttons" role="group" aria-label="참고 자료 주제">${lecture.refs.map((item, index) => `<button type="button" class="group-button" id="group-${index}" aria-pressed="${index === groupIndex}" data-route="#${esc(lecture.id)}/materials/${index}/0" data-focus="group-${index}">${esc(item.group)} <span>(${item.items.length})</span></button>`).join('')}</div>
      <section aria-label="${esc(group.group)}"><ul class="reference-list">${group.items.slice(start, start + PAGE_SIZE).map(ref => `<li><a class="reference-link" href="${esc(ref.url)}" target="_blank" rel="noopener noreferrer"><h4>${esc(ref.title)}<span aria-hidden="true">↗</span><span class="sr-only"> (새 창)</span></h4><p class="reference-source">${esc(ref.source)}</p><p class="reference-desc">${esc(ref.line)}</p></a></li>`).join('')}</ul>
      ${pageCount > 1 ? renderPager({ label: `${start + 1}–${Math.min(start + PAGE_SIZE, group.items.length)} / ${group.items.length}개`, index: page, count: pageCount, href: next => `#${lecture.id}/materials/${groupIndex}/${next}`, prefix: 'refs' }) : ''}</section></div>`;
  }

  function renderLecture(state) {
    const { lecture, tab, selection, page } = state;
    const panel = tab === 'content' ? renderContent(lecture, selection) : tab === 'materials' ? renderMaterials(lecture, selection, page) : renderOverview(lecture);
    detail.innerHTML = `<nav class="lecture-nav" aria-label="강의 선택"><a class="back-link" href="#home">← 강의 목록</a><div class="lecture-switcher">${LECTURES.map(item => `<a class="switch-lecture" href="#${esc(item.id)}" ${item.id === lecture.id ? 'aria-current="page"' : ''}>${esc(SHORT_NAMES[item.id] || item.badge)}</a>`).join('')}</div></nav>
      <div class="lecture-heading"><div class="lecture-meta"><span class="badge">${esc(lecture.badge)}</span><span class="status">${esc(lecture.status)}</span></div><h2>${esc(lecture.title)}</h2></div>
      <div class="tabs" role="tablist" aria-label="강의 정보">${TABS.map(item => `<button type="button" class="tab" role="tab" id="tab-${item.id}" aria-controls="panel-${item.id}" aria-selected="${tab === item.id}" tabindex="${tab === item.id ? '0' : '-1'}" data-route="#${esc(lecture.id)}/${item.id}" data-focus="tab-${item.id}">${item.title}</button>`).join('')}</div>
      ${TABS.map(item => `<section class="tabpanel" role="tabpanel" id="panel-${item.id}" aria-labelledby="tab-${item.id}" ${tab === item.id ? 'tabindex="0"' : 'hidden'}>${tab === item.id ? panel : ''}</section>`).join('')}`;
  }

  function route() {
    const state = readRoute();
    home.hidden = !!state.lecture;
    detail.hidden = !state.lecture;
    if (state.lecture) {
      renderLecture(state);
      document.title = `${state.lecture.title} · AI 교육 특강 허브`;
    } else {
      document.title = 'AI 교육 특강 허브';
    }
    if (pendingFocus) {
      const target = document.getElementById(pendingFocus);
      // At the last page, the former "next" button is disabled. Keep focus nearby.
      const fallback = target?.disabled ? target.parentElement.querySelector('button:not(:disabled)') : target;
      fallback?.focus({ preventScroll: true });
      if (target?.classList.contains('step-button') || target?.classList.contains('group-button')) target.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    } else if (previousLecture !== state.lecture?.id) {
      window.scrollTo(0, 0);
    }
    pendingFocus = null;
    previousLecture = state.lecture?.id;
  }

  document.querySelector('.skip-link').addEventListener('click', event => {
    event.preventDefault();
    const main = document.getElementById('main');
    main.focus({ preventScroll: true });
    main.scrollIntoView({ block: 'start' });
  });
  detail.addEventListener('click', event => {
    const button = event.target.closest('button[data-route]');
    if (button && !button.disabled) setRoute(button.dataset.route, button.dataset.focus);
  });
  detail.addEventListener('keydown', event => {
    if (event.target.getAttribute('role') !== 'tab') return;
    const index = TABS.findIndex(item => `tab-${item.id}` === event.target.id);
    let next;
    if (event.key === 'ArrowRight') next = (index + 1) % TABS.length;
    if (event.key === 'ArrowLeft') next = (index + TABS.length - 1) % TABS.length;
    if (event.key === 'Home') next = 0;
    if (event.key === 'End') next = TABS.length - 1;
    if (next === undefined) return;
    event.preventDefault();
    const { lecture } = readRoute();
    setRoute(`#${lecture.id}/${TABS[next].id}`, `tab-${TABS[next].id}`);
  });
  renderHome();
  window.addEventListener('hashchange', route);
  route();
})();
