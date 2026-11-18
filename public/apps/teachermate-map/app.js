import {
  BLOCKED_ROSTER_DEMO_CSV,
  CHAT_SAMPLE_QUESTIONS,
  DEMO_TODAY,
  DUTIES,
  INITIAL_HANDOVER_CARDS,
  INITIAL_TASKS,
  INITIAL_UPLOAD_HISTORY,
  MONTH_EVENTS,
  MONTHS,
  SCHOOL_INFO,
  UPLOAD_CALENDAR_PRESET,
  UPLOAD_NOTICE_PRESETS,
} from './data/demoData.js';

function cloneInitialTasks() {
  return INITIAL_TASKS.map((task) => ({
    ...task,
    checklist: task.checklist.map((item) => ({ ...item })),
    submission: task.submission
      ? {
          ...task.submission,
          targetDutyIds: [...task.submission.targetDutyIds],
          submittedDutyIds: [...task.submission.submittedDutyIds],
        }
      : null,
  }));
}

function cloneHandoverCards() {
  return INITIAL_HANDOVER_CARDS.map((card) => ({
    ...card,
    timeline: card.timeline.map((t) => ({ ...t })),
    tips: [...card.tips],
    qaList: card.qaList.map((q) => ({ ...q })),
  }));
}

function buildInitialUploadState() {
  const first = UPLOAD_NOTICE_PRESETS[0];
  return {
    mode: 'notice', // 'notice' | 'calendar'
    selectedPresetId: first.id,
    docTitle: first.docTitle,
    rawText: first.rawText,
    candidates: first.drafts.map((d, idx) => ({ id: `cand-${idx + 1}`, ...d })),
    calendarRows: UPLOAD_CALENDAR_PRESET.map((r) => ({ ...r })),
    blockedMessage: '',
    lastAddedSummary: null, // { count, month, title, taskId }
  };
}

function resolveInitialReplyTarget() {
  try {
    const param = new URLSearchParams(window.location.search).get('reply');
    if (!param) return null;
    const found = INITIAL_HANDOVER_CARDS.find((c) => c.id === param || c.dutyId === param);
    return found ? found.id : INITIAL_HANDOVER_CARDS[0].id;
  } catch {
    return null;
  }
}

const initialReplyId = resolveInitialReplyTarget();

function buildInitialChatMessages() {
  return [
    {
      id: 'chat-welcome',
      role: 'bot',
      badge: '안내',
      badgeTone: 'is-neutral',
      text: '학교 업무 지도·공문 근거·인수인계 노트에서 관련 내용을 찾아 답해 드립니다. 위 예시 질문을 누르거나 궁금한 업무를 입력해 보세요. (개인정보·휴대전화 번호 등은 전송 전 차단됩니다.)',
      sources: [],
      escalationDutyId: '',
      questionText: '',
    },
  ];
}

const state = {
  activeTab: initialReplyId ? 'reply' : 'map', // 'map' | 'upload' | 'handover' | 'chat' | 'settings' | 'reply'
  mapView: 'list', // 'list' | 'calendar'
  tasks: cloneInitialTasks(),
  uploadHistory: INITIAL_UPLOAD_HISTORY.map((h) => ({ ...h })),
  upload: buildInitialUploadState(),
  handoverCards: cloneHandoverCards(),
  selectedHandoverId: initialReplyId || INITIAL_HANDOVER_CARDS[0].id,
  handoverDutyFilter: 'all',
  handoverSearch: '',
  replyCardId: initialReplyId || INITIAL_HANDOVER_CARDS[0].id,
  replySavedBanner: false,
  chatMessages: buildInitialChatMessages(),
  chatInputValue: '',
  chatSelectedEscalationDutyId: 'd-kyomu',
  selectedMonth: SCHOOL_INFO.defaultMonth,
  selectedDutyId: null,
  myOnly: false,
  myDutyIds: new Set(),
  selectedCategory: 'all',
  searchQuery: '',
  eventsOpen: false,
  overdueExpanded: false,
  mobileCollectionsExpanded: false,
  rolePopoverOpen: false,
  drawer: null, // { taskId, fromCollectionPanel }
  icsMyOnly: false,
  demoMode: false,
};

let savedScrollY = 0;
let lastDrawerTrigger = null; // { taskId, fromSource }
let toastTimer = null;

const dutyMap = new Map(DUTIES.map((d) => [d.id, d]));

const CHECK_SVG = `<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"></polyline></svg>`;

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[ch]));
}

function getDutyName(dutyId) {
  return dutyMap.get(dutyId)?.name ?? '공통 업무';
}

function getCategoryLabel(category) {
  return { collect: '수합', draft: '기안', task: '상시' }[category] || '상시';
}

function diffDays(dateStr, baseStr = DEMO_TODAY) {
  const [y1, m1, d1] = dateStr.split('-').map(Number);
  const [y2, m2, d2] = baseStr.split('-').map(Number);
  const t1 = Date.UTC(y1, m1 - 1, d1);
  const t2 = Date.UTC(y2, m2 - 1, d2);
  return Math.round((t1 - t2) / 86400000);
}

function formatDday(dateStr) {
  if (!dateStr) return { text: '기한 없음', tone: '' };
  const diff = diffDays(dateStr);
  if (diff === 0) return { text: 'D-Day', tone: 'is-soon' };
  if (diff > 0) return { text: `D-${diff}`, tone: diff <= 7 ? 'is-soon' : '' };
  return { text: `D+${Math.abs(diff)}`, tone: 'is-over' };
}

function formatDateCompact(dateStr) {
  return dateStr ? dateStr.slice(5) : '';
}

function getWeekLabelFromDate(dateStr) {
  if (!dateStr) return '기타 일정';
  const [, mm, dd] = dateStr.split('-').map(Number);
  const weekNum = Math.min(5, Math.ceil(dd / 7));
  return `${mm}월 ${weekNum}주차`;
}

function isTaskOverdue(task) {
  return Boolean(task && !task.done && task.dueDate && diffDays(task.dueDate) < 0);
}

function findVisibleTaskTrigger(taskId, fromSource) {
  const candidates = document.querySelectorAll('[data-open-task]');
  for (const el of candidates) {
    if (el.dataset.openTask !== taskId) continue;
    if (fromSource && el.dataset.openSource !== fromSource) continue;
    if (el.getClientRects().length > 0) return el;
  }
  return null;
}

function showToast(message) {
  const toastEl = document.getElementById('toast');
  if (!toastEl) return;
  toastEl.textContent = message;
  toastEl.hidden = false;
  if (toastTimer) window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => {
    toastEl.hidden = true;
  }, 2600);
}

async function copyText(text, successMsg) {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
    } else {
      const area = document.createElement('textarea');
      area.value = text;
      area.style.position = 'fixed';
      area.style.opacity = '0';
      document.body.appendChild(area);
      area.select();
      document.execCommand('copy');
      area.remove();
    }
    showToast(successMsg);
  } catch {
    showToast('복사 권한이 제한되어 화면 문구를 직접 선택해 주세요.');
  }
}

function downloadFile(filename, content, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/* -----------------------------
 * Navigation & Shared Helpers
 * ----------------------------- */
function switchTab(tabKey, { preserveScroll = false } = {}) {
  state.activeTab = tabKey;
  state.rolePopoverOpen = false;
  if (tabKey !== 'reply') {
    state.replySavedBanner = false;
    try {
      if (new URLSearchParams(window.location.search).has('reply')) {
        window.history.replaceState(null, '', window.location.pathname);
      }
    } catch {
      // ignore history errors in restricted frames
    }
  }
  if (!preserveScroll) window.scrollTo(0, 0);
  renderAll();
}

function renderTopAndSubnav() {
  const views = ['map', 'upload', 'handover', 'chat', 'settings', 'reply'];
  views.forEach((key) => {
    const el = document.getElementById(`view-${key}`);
    if (el) el.hidden = state.activeTab !== key;
  });

  document.querySelectorAll('.nav-tab[data-go-tab]').forEach((btn) => {
    const active = btn.dataset.goTab === state.activeTab;
    btn.classList.toggle('is-active', active);
    if (active) btn.setAttribute('aria-current', 'page');
    else btn.removeAttribute('aria-current');
  });

  const draftCount = state.tasks.filter((t) => t.status === 'draft' && !t.done).length;
  const draftBadge = document.getElementById('nav-draft-badge');
  if (draftBadge) {
    draftBadge.hidden = draftCount === 0;
    draftBadge.textContent = String(draftCount);
  }

  const handoverBadge = document.getElementById('nav-handover-badge');
  if (handoverBadge) {
    handoverBadge.textContent = String(state.handoverCards.length);
  }

  const settingsBtn = document.getElementById('topbar-settings-btn');
  if (settingsBtn) {
    settingsBtn.classList.toggle('topbar-btn-accent', state.activeTab === 'settings');
  }

  document.querySelectorAll('.switcher-btn[data-map-view]').forEach((btn) => {
    const active = btn.dataset.mapView === state.mapView;
    btn.classList.toggle('is-active', active);
    btn.setAttribute('aria-pressed', String(active));
  });
}

/* -----------------------------
 * 1. 업무 지도 View
 * ----------------------------- */
function getFilteredTasks() {
  const query = state.searchQuery.trim().toLowerCase();
  return state.tasks.filter((task) => {
    if (task.month !== state.selectedMonth) return false;
    if (state.selectedDutyId && task.dutyId !== state.selectedDutyId) return false;
    if (state.myOnly && !state.myDutyIds.has(task.dutyId)) return false;
    if (state.selectedCategory !== 'all' && task.category !== state.selectedCategory) return false;
    if (query) {
      const hay = `${task.title} ${task.note} ${getDutyName(task.dutyId)} ${task.sourceTitle}`.toLowerCase();
      if (!hay.includes(query)) return false;
    }
    return true;
  });
}

function getActiveFilterLabel() {
  if (state.selectedDutyId) return getDutyName(state.selectedDutyId);
  if (state.myOnly) return '내 담당';
  return '';
}

function getCollectionTasks() {
  return state.tasks.filter((task) => Boolean(task.submission));
}

function renderMonthStrip() {
  const container = document.getElementById('month-strip');
  const currentMonthObj = MONTHS.find((m) => m.num === state.selectedMonth);
  const currentLabel = currentMonthObj ? currentMonthObj.label : `${state.selectedMonth}월`;
  const baseYear = Number(SCHOOL_INFO.schoolYear.slice(0, 4)) || 2026;
  const displayYear = state.selectedMonth <= 2 ? baseYear + 1 : baseYear;

  const desktopTabs = MONTHS.map((m) => {
    const isSelected = m.num === state.selectedMonth;
    const isCurrent = m.num === SCHOOL_INFO.defaultMonth;
    const hasOpen = state.tasks.some((t) => {
      if (t.month !== m.num || t.done) return false;
      if (state.selectedDutyId) return t.dutyId === state.selectedDutyId;
      if (state.myOnly) return state.myDutyIds.has(t.dutyId);
      return true;
    });
    const classes = ['month-btn'];
    if (isSelected) classes.push('is-selected');
    if (isCurrent) classes.push('is-current');
    return `
      <button type="button" class="${classes.join(' ')}" data-month="${m.num}" aria-pressed="${isSelected}">
        <span>${escapeHtml(m.label)}</span>
        ${hasOpen ? '<span class="month-dot" aria-hidden="true"></span>' : ''}
      </button>
    `;
  }).join('');

  container.innerHTML = `
    <div class="month-tabs-desktop">${desktopTabs}</div>
    <div class="month-stepper-mobile">
      <button type="button" class="month-step-btn" data-month-step="-1" aria-label="이전 달">◀</button>
      <span class="month-step-current">${displayYear}년 ${escapeHtml(currentLabel)}</span>
      <button type="button" class="month-step-btn" data-month-step="1" aria-label="다음 달">▶</button>
    </div>
  `;
}

function renderRolePopover() {
  const trigger = document.getElementById('role-picker-btn');
  const valueEl = document.getElementById('role-picker-value');
  const clearBtn = document.getElementById('clear-role-btn');
  const myBtn = document.getElementById('my-duties-btn');
  const myCountEl = document.getElementById('my-duties-count');
  const popover = document.getElementById('role-popover');
  const body = document.getElementById('role-popover-body');

  valueEl.textContent = state.selectedDutyId ? getDutyName(state.selectedDutyId) : '전체 업무';
  trigger.classList.toggle('has-role', Boolean(state.selectedDutyId));
  trigger.setAttribute('aria-expanded', String(state.rolePopoverOpen));
  clearBtn.hidden = !state.selectedDutyId;

  myBtn.classList.toggle('is-active', state.myOnly);
  myBtn.setAttribute('aria-pressed', String(state.myOnly));
  myCountEl.textContent = String(state.myDutyIds.size);

  document.querySelectorAll('.cat-btn').forEach((btn) => {
    const active = btn.dataset.cat === state.selectedCategory;
    btn.classList.toggle('is-active', active);
    btn.setAttribute('aria-pressed', String(active));
  });

  popover.hidden = !state.rolePopoverOpen;
  if (!state.rolePopoverOpen) return;

  const groups = [
    { key: 'homeroom', title: '학년 담임' },
    { key: 'admin', title: '교무·행정 담당' },
  ];

  body.innerHTML = `
    <div>
      <div class="role-grid">
        <div class="role-option-wrap ${state.selectedDutyId === null ? 'is-selected' : ''}">
          <button type="button" class="role-option-btn" data-select-duty="">전체 업무</button>
        </div>
      </div>
    </div>
    ${groups.map((grp) => {
      const items = DUTIES.filter((d) => d.group === grp.key);
      return `
        <div>
          <h3 class="role-group-title">${escapeHtml(grp.title)}</h3>
          <div class="role-grid">
            ${items.map((d) => {
              const selected = state.selectedDutyId === d.id;
              const starred = state.myDutyIds.has(d.id);
              return `
                <div class="role-option-wrap ${selected ? 'is-selected' : ''}">
                  <button type="button" class="role-option-btn" data-select-duty="${escapeHtml(d.id)}">${escapeHtml(d.name)}</button>
                  <button
                    type="button"
                    class="role-star-btn ${starred ? 'is-starred' : ''}"
                    data-star-duty="${escapeHtml(d.id)}"
                    aria-label="${escapeHtml(d.name)} 내 담당 지정"
                    aria-pressed="${starred}"
                    title="${starred ? '내 담당 해제' : '내 담당 지정'}"
                  >${starred ? '★' : '☆'}</button>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      `;
    }).join('')}
  `;
}

function renderActiveFilterSummary(filteredCount) {
  const el = document.getElementById('active-filter-summary');
  const activeBits = [];
  if (state.selectedDutyId) activeBits.push(`담당 <strong>${escapeHtml(getDutyName(state.selectedDutyId))}</strong>`);
  if (state.myOnly) activeBits.push('<strong>내 담당</strong>');
  if (state.selectedCategory !== 'all') {
    activeBits.push(`구분 <strong>${escapeHtml(getCategoryLabel(state.selectedCategory))}</strong>`);
  }
  if (state.searchQuery.trim()) activeBits.push(`검색 "${escapeHtml(state.searchQuery.trim())}"`);

  if (activeBits.length === 0) {
    el.hidden = true;
    el.innerHTML = '';
    return;
  }

  el.hidden = false;
  el.innerHTML = `
    <span>적용 조건: ${activeBits.join(' · ')} (${filteredCount}건)</span>
    <button type="button" class="btn btn-text btn-sm" id="summary-reset-btn">전체 보기</button>
  `;
}

function renderEventsSection() {
  const monthEvents = MONTH_EVENTS.filter((e) => e.month === state.selectedMonth);
  const toggleBtn = document.getElementById('toggle-events-btn');
  const countEl = document.getElementById('events-count');
  const stripEl = document.getElementById('events-drawer-strip');

  countEl.textContent = String(monthEvents.length);
  toggleBtn.hidden = monthEvents.length === 0;
  toggleBtn.setAttribute('aria-expanded', String(state.eventsOpen));

  if (!state.eventsOpen || monthEvents.length === 0) {
    stripEl.hidden = true;
    stripEl.innerHTML = '';
    return;
  }

  stripEl.hidden = false;
  stripEl.innerHTML = `
    <ul class="events-grid">
      ${monthEvents.map((ev) => `
        <li class="event-item">
          <span class="event-date">${escapeHtml(formatDateCompact(ev.date))}</span>
          <span>${escapeHtml(ev.title)}</span>
        </li>
      `).join('')}
    </ul>
  `;
}

function renderCheckboxHtml(task) {
  return `
    <button
      type="button"
      class="check-btn ${task.done ? 'is-checked' : ''}"
      data-toggle-task-done="${escapeHtml(task.id)}"
      aria-pressed="${task.done}"
      aria-label="${escapeHtml(task.title)} 완료 표시"
    >${task.done ? CHECK_SVG : ''}</button>
  `;
}

function renderCategoryBadgeHtml(task) {
  const dotCls = task.category === 'draft' ? 'is-draft-cat' : task.category;
  return `
    <span class="cat-badge is-${escapeHtml(task.category)}">
      <span class="cat-dot ${dotCls}" aria-hidden="true"></span>
      <span>${escapeHtml(task.typeLabel)}</span>
    </span>
  `;
}

function renderStatusBadgeHtml(task) {
  if (task.done) return '<span class="status-badge is-done">완료</span>';
  if (task.status === 'draft') return '<span class="status-badge is-ai">AI 초안</span>';
  return '<span class="status-badge is-confirmed">✓ 확정</span>';
}

function renderTaskProgressCell(task) {
  const sub = task.submission;
  if (sub) {
    const submittedCount = sub.submittedDutyIds.length;
    const totalCount = sub.targetDutyIds.length;
    const pct = Math.round((submittedCount / totalCount) * 100);
    const missingCount = totalCount - submittedCount;
    const subOverdue = isTaskOverdue(task) && missingCount > 0;
    return `
      <div class="sub-progress-cell">
        <span class="sub-progress-text ${subOverdue ? 'is-overdue' : ''}">${submittedCount}/${totalCount} 제출</span>
        <div class="progress-mini" aria-hidden="true">
          <div class="progress-fill ${subOverdue ? 'is-overdue' : ''}" style="width:${pct}%"></div>
        </div>
      </div>
    `;
  }
  const totalChecks = task.checklist.length;
  if (totalChecks > 0) {
    const doneChecks = task.checklist.filter((c) => c.done).length;
    return `<span class="progress-muted">점검 ${doneChecks}/${totalChecks}</span>`;
  }
  return '<span class="progress-muted">-</span>';
}

function renderCalendarView(tasks, monthEvents) {
  const baseYear = Number(SCHOOL_INFO.schoolYear.slice(0, 4)) || 2026;
  const year = state.selectedMonth <= 2 ? baseYear + 1 : baseYear;
  const monthIdx = state.selectedMonth - 1;
  const firstDow = new Date(Date.UTC(year, monthIdx, 1)).getUTCDay();
  const daysInMonth = new Date(Date.UTC(year, monthIdx + 1, 0)).getUTCDate();
  const totalCells = Math.ceil((firstDow + daysInMonth) / 7) * 7;

  const eventsByDay = new Map();
  for (const ev of monthEvents) {
    const dayNum = Number(ev.date.slice(8, 10));
    if (!eventsByDay.has(dayNum)) eventsByDay.set(dayNum, []);
    eventsByDay.get(dayNum).push(ev);
  }

  const tasksByDay = new Map();
  for (const t of tasks) {
    if (!t.dueDate) continue;
    const dayNum = Number(t.dueDate.slice(8, 10));
    if (!tasksByDay.has(dayNum)) tasksByDay.set(dayNum, []);
    tasksByDay.get(dayNum).push(t);
  }

  const cells = [];
  for (let i = 0; i < totalCells; i++) {
    const day = i - firstDow + 1;
    const dow = i % 7;
    const dayCls = dow === 0 ? 'is-sun' : (dow === 6 ? 'is-sat' : '');

    if (day < 1 || day > daysInMonth) {
      cells.push(`<div class="gcal-cell is-empty ${dayCls}"></div>`);
      continue;
    }

    const iso = `${year}-${String(state.selectedMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const isToday = iso === DEMO_TODAY;
    const dayEvents = eventsByDay.get(day) || [];
    const dayTasks = tasksByDay.get(day) || [];

    cells.push(`
      <div class="gcal-cell ${dayCls} ${isToday ? 'is-today' : ''}">
        <div class="gcal-day-head">
          <span class="gcal-day-num">${day}</span>
          ${isToday ? '<span class="gcal-today-tag">오늘</span>' : ''}
        </div>
        <div class="gcal-items">
          ${dayEvents.map((ev) => `
            <div class="gcal-event-pill" title="학사 행사: ${escapeHtml(ev.title)}">${escapeHtml(ev.title)}</div>
          `).join('')}
          ${dayTasks.map((t) => {
            const draftCls = t.status === 'draft' && !t.done ? 'is-ai' : '';
            const doneCls = t.done ? 'is-done' : '';
            return `
              <button
                type="button"
                class="gcal-task-chip cat-${escapeHtml(t.category)} ${draftCls} ${doneCls}"
                data-open-task="${escapeHtml(t.id)}"
                data-open-source="calendar"
                title="${escapeHtml(t.title)} (${escapeHtml(getDutyName(t.dutyId))})"
              >
                <span class="cat-dot ${t.category === 'draft' ? 'is-draft-cat' : t.category}" aria-hidden="true"></span>
                <span class="gcal-chip-label">${t.done ? '✓ ' : ''}${escapeHtml(t.title)}</span>
              </button>
            `;
          }).join('')}
        </div>
      </div>
    `);
  }

  return `
    <div class="gcal-wrap">
      <div class="gcal-legend">
        <span class="gcal-legend-item"><span class="cat-dot is-event"></span>학사 일정</span>
        <span class="gcal-legend-item"><span class="cat-dot is-collect"></span>수합</span>
        <span class="gcal-legend-item"><span class="cat-dot is-draft-cat"></span>기안</span>
        <span class="gcal-legend-item"><span class="cat-dot is-task"></span>상시</span>
        <span class="status-badge is-ai">AI 초안</span>
      </div>
      <div class="gcal-weekdays" aria-hidden="true">
        <div class="gcal-weekday is-sun">일</div>
        <div class="gcal-weekday">월</div>
        <div class="gcal-weekday">화</div>
        <div class="gcal-weekday">수</div>
        <div class="gcal-weekday">목</div>
        <div class="gcal-weekday">금</div>
        <div class="gcal-weekday is-sat">토</div>
      </div>
      <div class="gcal-grid">${cells.join('')}</div>
    </div>
  `;
}

function renderTaskLedger() {
  const titleEl = document.getElementById('ledger-title');
  const summaryEl = document.getElementById('ledger-summary');
  const ledgerEl = document.getElementById('task-ledger');

  const monthObj = MONTHS.find((m) => m.num === state.selectedMonth);
  const monthLabel = monthObj ? monthObj.label : `${state.selectedMonth}월`;
  const scopeLabel = state.selectedDutyId
    ? getDutyName(state.selectedDutyId)
    : (state.myOnly ? '내 담당' : '전체');

  const tasks = getFilteredTasks();
  const monthEvents = MONTH_EVENTS.filter((e) => e.month === state.selectedMonth);
  const openCount = tasks.filter((t) => !t.done).length;
  const draftCount = tasks.filter((t) => t.status === 'draft' && !t.done).length;

  titleEl.textContent = `${monthLabel} ${scopeLabel} 업무`;
  summaryEl.textContent = draftCount > 0
    ? `전체 ${tasks.length}건 · 잔여 ${openCount}건 · AI 초안 ${draftCount}건`
    : `전체 ${tasks.length}건 · 잔여 ${openCount}건`;

  renderActiveFilterSummary(tasks.length);
  renderEventsSection();

  if (state.myOnly && state.myDutyIds.size === 0) {
    ledgerEl.innerHTML = `
      <div class="empty-card">
        <h3>지정된 내 담당 업무가 없습니다</h3>
        <p>담당 메뉴에서 맡으신 학년이나 부서를 별표(☆)로 지정하면 해당 업무만 모아볼 수 있습니다.</p>
        <button type="button" class="btn btn-primary btn-sm" id="empty-pick-role-btn">담당 업무 선택</button>
      </div>
    `;
    return;
  }

  if (state.mapView === 'calendar') {
    ledgerEl.innerHTML = renderCalendarView(tasks, monthEvents);
    return;
  }

  if (tasks.length === 0) {
    ledgerEl.innerHTML = `
      <div class="empty-card">
        <h3>해당 조건의 업무가 없습니다</h3>
        <p>${escapeHtml(monthLabel)}에는 선택한 조건에 해당하는 등록 업무가 없습니다.</p>
        <button type="button" class="btn btn-outline btn-sm" id="empty-reset-btn">전체 업무 보기</button>
      </div>
    `;
    return;
  }

  const weekMap = new Map();
  for (const task of tasks) {
    if (!weekMap.has(task.weekLabel)) weekMap.set(task.weekLabel, []);
    weekMap.get(task.weekLabel).push(task);
  }
  const weekEntries = Array.from(weekMap.entries());

  const desktopRows = weekEntries.map(([weekLabel, items]) => `
    <tr class="week-row">
      <th colspan="7" scope="colgroup">${escapeHtml(weekLabel)}</th>
    </tr>
    ${items.map((task) => {
      const overdue = isTaskOverdue(task);
      const dday = formatDday(task.dueDate);
      const ddayBadge = task.done
        ? ''
        : `<span class="dday-badge ${overdue ? 'is-over' : dday.tone}">${escapeHtml(dday.text)}</span>`;

      return `
        <tr class="task-tr ${overdue ? 'is-overdue' : ''} ${task.done ? 'is-done' : ''}">
          <td>${renderCheckboxHtml(task)}</td>
          <td class="cell-num">
            <span class="date-main">${escapeHtml(formatDateCompact(task.dueDate))}</span>
            ${ddayBadge}
          </td>
          <td>
            <button
              type="button"
              class="task-title-btn"
              data-open-task="${escapeHtml(task.id)}"
              data-open-source="ledger"
            >${escapeHtml(task.title)}</button>
          </td>
          <td>${escapeHtml(getDutyName(task.dutyId))}</td>
          <td>${renderCategoryBadgeHtml(task)}</td>
          <td>${renderStatusBadgeHtml(task)}</td>
          <td>${renderTaskProgressCell(task)}</td>
        </tr>
      `;
    }).join('')}
  `).join('');

  const mobileGroups = weekEntries.map(([weekLabel, items]) => `
    <div class="mobile-week-heading">${escapeHtml(weekLabel)}</div>
    <ul class="mobile-task-list">
      ${items.map((task) => {
        const overdue = isTaskOverdue(task);
        const dday = formatDday(task.dueDate);
        const sub = task.submission;
        const progressInline = sub
          ? `<span class="${overdue && sub.targetDutyIds.length > sub.submittedDutyIds.length ? 'dday-badge is-over' : 'progress-muted'}">${sub.submittedDutyIds.length}/${sub.targetDutyIds.length} 제출</span>`
          : (task.checklist.length > 0
            ? `<span class="progress-muted">점검 ${task.checklist.filter((c) => c.done).length}/${task.checklist.length}</span>`
            : '');

        return `
          <li class="mobile-task-row ${overdue ? 'is-overdue' : ''} ${task.done ? 'is-done' : ''}">
            ${renderCheckboxHtml(task)}
            <div class="mobile-task-body">
              <button
                type="button"
                class="task-title-btn"
                data-open-task="${escapeHtml(task.id)}"
                data-open-source="ledger"
              >${escapeHtml(task.title)}</button>
              <div class="mobile-task-meta">
                <span>${escapeHtml(formatDateCompact(task.dueDate))}${task.done ? '' : ` (${escapeHtml(dday.text)})`}</span>
                <span>${escapeHtml(getDutyName(task.dutyId))}</span>
                ${renderCategoryBadgeHtml(task)}
                ${renderStatusBadgeHtml(task)}
                ${progressInline}
              </div>
            </div>
          </li>
        `;
      }).join('')}
    </ul>
  `).join('');

  ledgerEl.innerHTML = `
    <div class="ledger-table-wrap">
      <table class="ledger-table">
        <colgroup>
          <col class="col-check">
          <col class="col-date">
          <col>
          <col class="col-owner">
          <col class="col-type">
          <col class="col-status">
          <col class="col-progress">
        </colgroup>
        <thead>
          <tr>
            <th scope="col">완료</th>
            <th scope="col">마감일</th>
            <th scope="col">업무명</th>
            <th scope="col">담당</th>
            <th scope="col">구분</th>
            <th scope="col">상태</th>
            <th scope="col">진행</th>
          </tr>
        </thead>
        <tbody>${desktopRows}</tbody>
      </table>
    </div>
    <div class="mobile-ledger-wrap">${mobileGroups}</div>
  `;
}

function renderCollectionItemsMarkup(collections) {
  return collections.map((task) => {
    const sub = task.submission;
    const submittedCount = sub.submittedDutyIds.length;
    const totalCount = sub.targetDutyIds.length;
    const pct = Math.round((submittedCount / totalCount) * 100);
    const missingNames = sub.targetDutyIds
      .filter((id) => !sub.submittedDutyIds.includes(id))
      .map((id) => getDutyName(id).replace(' 담임', ''));
    const dday = formatDday(task.dueDate);
    const overdue = isTaskOverdue(task);
    const subOverdue = overdue && missingNames.length > 0;

    return `
      <li>
        <button
          type="button"
          class="collection-item-btn"
          data-open-task="${escapeHtml(task.id)}"
          data-open-source="collection-panel"
        >
          <span class="collection-item-top">
            <span class="collection-ratio ${subOverdue ? 'is-overdue' : ''}">${submittedCount}/${totalCount} 제출</span>
            <span class="collection-owner">${escapeHtml(dday.text)} · ${escapeHtml(getDutyName(task.dutyId))}</span>
          </span>
          <span class="progress-mini" aria-hidden="true">
            <span class="progress-fill ${subOverdue ? 'is-overdue' : ''}" style="width:${pct}%"></span>
          </span>
          <span class="collection-item-title">${escapeHtml(task.title)}</span>
          <span class="collection-item-meta">${missingNames.length === 0 ? '전체 대상 제출 완료' : `미제출: ${escapeHtml(missingNames.join(', '))}`}</span>
        </button>
      </li>
    `;
  }).join('');
}

function renderRightRailAndMobileCollections() {
  const collections = getCollectionTasks();

  const desktopList = document.getElementById('desktop-collections-list');
  desktopList.innerHTML = renderCollectionItemsMarkup(collections);

  const mobileBox = document.getElementById('mobile-collections-box');
  const activeRoleSub = state.selectedDutyId
    ? `${escapeHtml(getDutyName(state.selectedDutyId))} 필터 유지`
    : '전체 기준';

  mobileBox.innerHTML = `
    <button type="button" class="mobile-collections-toggle" id="mobile-collections-toggle" aria-expanded="${state.mobileCollectionsExpanded}">
      <span>
        <span class="mobile-collections-title">수합 현황 · ${collections.length}건 진행 중</span>
        <span class="mobile-collections-sub">${activeRoleSub}</span>
      </span>
      <span class="mobile-collections-action">${state.mobileCollectionsExpanded ? '접기 ▲' : '펼치기 ▼'}</span>
    </button>
    ${state.mobileCollectionsExpanded ? `<ul class="collection-list mobile-collections-list">${renderCollectionItemsMarkup(collections)}</ul>` : ''}
  `;

  const confirmedOpen = state.tasks
    .filter((t) => t.status === 'confirmed' && !t.done && t.dueDate)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));

  const soonItems = confirmedOpen.filter((t) => {
    const d = diffDays(t.dueDate);
    return d >= 0 && d <= 2;
  });
  const weekItems = confirmedOpen.filter((t) => {
    const d = diffDays(t.dueDate);
    return d >= 3 && d <= 7;
  });
  const overdueItems = confirmedOpen.filter((t) => diffDays(t.dueDate) < 0);

  const upcomingEl = document.getElementById('upcoming-list');
  const parts = [];

  if (soonItems.length > 0) {
    parts.push(`
      <div>
        <h3 class="upcoming-group-title">오늘 · 내일</h3>
        <ul class="upcoming-list">
          ${soonItems.map((t) => {
            const dday = formatDday(t.dueDate);
            return `
              <li>
                <button type="button" class="upcoming-btn" data-open-task="${escapeHtml(t.id)}" data-open-source="upcoming">
                  <span class="upcoming-dday">${escapeHtml(dday.text)}</span>
                  <span>${escapeHtml(t.title)}</span>
                </button>
              </li>
            `;
          }).join('')}
        </ul>
      </div>
    `);
  }

  if (weekItems.length > 0) {
    parts.push(`
      <div>
        <h3 class="upcoming-group-title">이번 주 (D-7)</h3>
        <ul class="upcoming-list">
          ${weekItems.map((t) => {
            const dday = formatDday(t.dueDate);
            return `
              <li>
                <button type="button" class="upcoming-btn" data-open-task="${escapeHtml(t.id)}" data-open-source="upcoming">
                  <span class="upcoming-dday">${escapeHtml(dday.text)}</span>
                  <span>${escapeHtml(t.title)}</span>
                </button>
              </li>
            `;
          }).join('')}
        </ul>
      </div>
    `);
  }

  if (overdueItems.length > 0) {
    parts.push(`
      <div>
        <button type="button" class="overdue-toggle" id="overdue-toggle-btn" aria-expanded="${state.overdueExpanded}">
          지난 미완료 ${overdueItems.length}건 · ${state.overdueExpanded ? '접기' : '보기'}
        </button>
        ${state.overdueExpanded ? `
          <ul class="upcoming-list overdue-list-spaced">
            ${overdueItems.map((t) => {
              const dday = formatDday(t.dueDate);
              return `
                <li>
                  <button type="button" class="upcoming-btn" data-open-task="${escapeHtml(t.id)}" data-open-source="upcoming">
                    <span class="upcoming-dday is-over">${escapeHtml(dday.text)}</span>
                    <span>${escapeHtml(t.title)}</span>
                  </button>
                </li>
              `;
            }).join('')}
          </ul>
        ` : ''}
      </div>
    `);
  }

  upcomingEl.innerHTML = parts.join('') || '<p class="drawer-caption">다가오는 마감 일정 없음</p>';
  document.getElementById('ics-my-only').checked = state.icsMyOnly;
}

/* -----------------------------
 * 2. 자료 올리기 View
 * ----------------------------- */
function inferDutyFromText(text) {
  const m = text.match(/([1-6])학년/);
  if (m) return `h${m[1]}`;
  if (/난방|안전|감염|보건|위생/.test(text)) return /보건|감염/.test(text) ? 'd-health' : 'd-safety';
  if (/독서|학예|돌봄|체험|도서/.test(text)) return 'd-creative';
  if (/태블릿|방송|무선|정보|전자칠판/.test(text)) return 'd-media';
  if (/교육과정|공개수업|평가|설문|연구/.test(text)) return 'd-research';
  return 'd-kyomu';
}

function inferCategoryFromText(text) {
  if (/수합|제출|수요조사|취합|응답/.test(text)) return 'collect';
  if (/기안|품의|결재|정산/.test(text)) return 'draft';
  return 'task';
}

function extractCandidatesFromText(rawText, docTitle) {
  const lines = rawText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const candidates = [];
  const baseYear = 2026;

  for (const line of lines) {
    let dueDate = '';
    const fullDateMatch = line.match(/(202[67])[.-](\d{1,2})[.-](\d{1,2})/);
    const krDateMatch = line.match(/(\d{1,2})\s*월\s*(\d{1,2})\s*일/);
    if (fullDateMatch) {
      dueDate = `${fullDateMatch[1]}-${String(fullDateMatch[2]).padStart(2, '0')}-${String(fullDateMatch[3]).padStart(2, '0')}`;
    } else if (krDateMatch) {
      const m = Number(krDateMatch[1]);
      const d = Number(krDateMatch[2]);
      const y = m <= 2 ? baseYear + 1 : baseYear;
      dueDate = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    }

    if (!dueDate && !/(제출|마감|기안|확인|게시|반납|완료)/.test(line)) continue;
    if (line.startsWith('[') && !dueDate) continue;

    const cleanTitle = line
      .replace(/^[-*•\d.]+\s*/, '')
      .replace(/\s+/g, ' ')
      .slice(0, 48);
    if (cleanTitle.length < 6) continue;

    const dutyId = inferDutyFromText(line);
    const category = inferCategoryFromText(line);
    candidates.push({
      id: `cand-ext-${candidates.length + 1}`,
      title: cleanTitle,
      dueDate: dueDate || '2026-11-28',
      dutyId,
      category,
      highlightQuote: line,
      checklistText: '원문 확인, 관련 양식 점검, 결과 공유',
      folderPath: `교내공유폴더 > 2026 > ${getDutyName(dutyId).replace(/\s/g, '')}`,
    });
    if (candidates.length >= 3) break;
  }

  if (candidates.length === 0) {
    candidates.push({
      id: 'cand-fallback-1',
      title: (docTitle || '올린 문서 확인 업무').slice(0, 42),
      dueDate: '2026-11-28',
      dutyId: inferDutyFromText(rawText),
      category: inferCategoryFromText(rawText),
      highlightQuote: lines[0] || '문서 본문 전체에서 일정을 확인하세요.',
      checklistText: '본문 세부 확인, 담당자 공유',
      folderPath: '교내공유폴더 > 2026 > 신규반영',
    });
  }
  return candidates;
}

function renderUploadView() {
  const root = document.getElementById('view-upload');
  if (!root || state.activeTab !== 'upload') return;

  const up = state.upload;
  const rawLines = up.rawText.split(/\r?\n/);
  const hitQuotes = up.candidates.map((c) => c.highlightQuote).filter(Boolean);

  root.innerHTML = `
    <div class="page-header">
      <div class="page-header-copy">
        <h1 class="page-title">자료 올리기</h1>
        <p class="page-desc">공문·회의자료 본문과 학사일정표를 한 화면에서 올리고, 왼쪽 원문과 오른쪽 추출 초안을 나란히 검수합니다.</p>
      </div>
      <div class="page-header-actions">
        <button type="button" class="btn btn-outline btn-sm" data-go-tab="map">← 업무 지도 보기</button>
      </div>
    </div>

    <div class="rule-notice-banner">
      <strong>시연용 규칙 추출 · 브라우저 내 처리:</strong> 이 공개 시연은 외부 AI 서버를 호출하지 않고 날짜·키워드 규칙으로 후보를 뽑습니다. 실제 서비스에서는 AI 추출 초안이 이 위치에 표시되며, 올린 자료와 파일은 브라우저 밖으로 전송되지 않습니다.
    </div>

    ${up.blockedMessage ? `
      <div id="upload-blocked-banner" class="blocked-banner" role="alert">
        <strong>개인정보·명단 포함 자료 차단됨 (외부 전송·추출 중단)</strong>
        <span>${escapeHtml(up.blockedMessage)}</span>
      </div>
    ` : ''}

    ${up.lastAddedSummary ? `
      <div class="added-banner" role="status">
        <span>${escapeHtml(up.lastAddedSummary.label)}</span>
        <button type="button" class="btn btn-primary btn-sm" id="jump-to-added-task" data-month-jump="${up.lastAddedSummary.month}" data-task-jump="${escapeHtml(up.lastAddedSummary.taskId || '')}">
          업무 지도(${up.lastAddedSummary.month}월)에서 바로 보기 →
        </button>
      </div>
    ` : ''}

    <div class="mode-tabs" role="tablist" aria-label="자료 입력 방식">
      <button type="button" class="mode-tab-btn ${up.mode === 'notice' ? 'is-active' : ''}" data-upload-mode="notice" role="tab" aria-selected="${up.mode === 'notice'}">1. 공문·회의자료 본문 추출</button>
      <button type="button" class="mode-tab-btn ${up.mode === 'calendar' ? 'is-active' : ''}" data-upload-mode="calendar" role="tab" aria-selected="${up.mode === 'calendar'}">2. 연간 학사일정표 일괄 등록</button>
    </div>

    ${up.mode === 'notice' ? `
      <div class="panel-card upload-input-row">
        <div class="preset-bar">
          <span class="hint-inline">예시 공문 불러오기:</span>
          ${UPLOAD_NOTICE_PRESETS.map((p) => `
            <button type="button" class="preset-chip ${up.selectedPresetId === p.id ? 'is-active' : ''}" data-load-preset="${escapeHtml(p.id)}">${escapeHtml(p.label)}</button>
          `).join('')}
          <button type="button" class="preset-chip" id="load-blocked-roster-btn">차단 시험 · 학생 명단 CSV</button>
        </div>

        <div class="field-group">
          <label for="upload-doc-title">문서 제목</label>
          <input id="upload-doc-title" class="field-input" type="text" value="${escapeHtml(up.docTitle)}" placeholder="예: 예시공문-1120 방과후 수요조사">
        </div>

        <div class="field-group">
          <label for="upload-raw-text">공문·회의 안내문 본문</label>
          <textarea id="upload-raw-text" class="field-textarea" placeholder="공문이나 직원회의 안내문 본문을 붙여 넣거나 위 예시를 불러오세요.">${escapeHtml(up.rawText)}</textarea>
        </div>

        <div class="upload-actions-bar">
          <label class="file-upload-label">
            <input type="file" id="upload-text-file" accept=".txt,.md,.csv">
            <span>텍스트·CSV 파일 불러오기 (.txt / .csv)</span>
          </label>
          <button type="button" class="btn btn-primary btn-sm" id="run-extract-btn">본문에서 업무 초안 추출하기</button>
        </div>
      </div>

      <div class="upload-split" id="upload-review-panel">
        <section class="panel-card">
          <div class="section-head rail-head">
            <h2 class="section-title">원문 근거 대조</h2>
            <span class="meta-chip">노란 음영: 추출 줄</span>
          </div>
          <div class="source-highlight-box">
            ${rawLines.map((line) => {
              const trimmed = line.trim();
              if (!trimmed) return '<div style="height:4px;"></div>';
              const isHit = hitQuotes.some((q) => q && (trimmed.includes(q.slice(0, 14)) || q.includes(trimmed.slice(0, 14))));
              return `<div class="source-line ${isHit ? 'is-hit' : ''}">${escapeHtml(trimmed)}</div>`;
            }).join('')}
          </div>
        </section>

        <section class="panel-card">
          <div class="section-head rail-head">
            <h2 class="section-title">추출된 업무 초안 검수 (${up.candidates.length}건)</h2>
            <span class="status-badge is-ai">시연용 규칙 추출</span>
          </div>

          ${up.candidates.length === 0 ? `
            <div class="empty-card">
              <h3>추출된 업무 후보가 없습니다</h3>
              <p>${up.blockedMessage ? '개인정보·명단 파일이 감지되어 추출을 중단했습니다.' : '본문에서 추출하기 버튼을 누르거나 예시 공문을 선택하세요.'}</p>
            </div>
          ` : up.candidates.map((cand, idx) => `
            <div class="draft-candidate-card" data-cand-id="${escapeHtml(cand.id)}">
              <div class="draft-candidate-head">
                <strong>추출 항목 #${idx + 1}</strong>
                ${renderCategoryBadgeHtml({ category: cand.category, typeLabel: getCategoryLabel(cand.category) })}
              </div>
              <div class="field-group">
                <label>업무명 (편집 가능)</label>
                <input type="text" class="field-input" data-cand-field="title" data-cand-idx="${idx}" value="${escapeHtml(cand.title)}">
              </div>
              <div class="form-grid">
                <div class="field-group">
                  <label>마감일</label>
                  <input type="date" class="field-input" data-cand-field="dueDate" data-cand-idx="${idx}" value="${escapeHtml(cand.dueDate)}">
                </div>
                <div class="field-group">
                  <label>담당</label>
                  <select class="field-select" data-cand-field="dutyId" data-cand-idx="${idx}">
                    ${DUTIES.map((d) => `<option value="${escapeHtml(d.id)}" ${d.id === cand.dutyId ? 'selected' : ''}>${escapeHtml(d.name)}</option>`).join('')}
                  </select>
                </div>
              </div>
              <div class="form-grid">
                <div class="field-group">
                  <label>업무 구분</label>
                  <select class="field-select" data-cand-field="category" data-cand-idx="${idx}">
                    <option value="collect" ${cand.category === 'collect' ? 'selected' : ''}>수합</option>
                    <option value="draft" ${cand.category === 'draft' ? 'selected' : ''}>기안</option>
                    <option value="task" ${cand.category === 'task' ? 'selected' : ''}>상시</option>
                  </select>
                </div>
                <div class="field-group">
                  <label>공유폴더 경로</label>
                  <input type="text" class="field-input" data-cand-field="folderPath" data-cand-idx="${idx}" value="${escapeHtml(cand.folderPath)}">
                </div>
              </div>
              <div class="drawer-actions-row">
                <button type="button" class="btn btn-outline btn-sm" data-commit-cand="${idx}" data-commit-status="draft">AI 초안으로 추가</button>
                <button type="button" class="btn btn-primary btn-sm" data-commit-cand="${idx}" data-commit-status="confirmed">검수 완료 · 확정 반영</button>
              </div>
            </div>
          `).join('')}
        </section>
      </div>
    ` : `
      <section class="panel-card" style="margin-bottom:16px;">
        <div class="section-head rail-head">
          <h2 class="section-title">학사일정표 추출 미리보기 (${up.calendarRows.filter((r) => r.selected).length}건 선택)</h2>
          <button type="button" class="btn btn-primary btn-sm" id="commit-calendar-rows-btn">선택 항목 AI 초안으로 일괄 반영</button>
        </div>
        <div class="simple-table-wrap">
          <table class="simple-table">
            <thead>
              <tr>
                <th>선택</th>
                <th>일정일</th>
                <th>업무·행사명</th>
                <th>담당</th>
                <th>구분</th>
              </tr>
            </thead>
            <tbody>
              ${up.calendarRows.map((row, idx) => `
                <tr>
                  <td><input type="checkbox" data-cal-row-toggle="${idx}" ${row.selected ? 'checked' : ''} aria-label="${escapeHtml(row.title)} 선택"></td>
                  <td class="cell-num">${escapeHtml(row.dueDate)}</td>
                  <td>${escapeHtml(row.title)}</td>
                  <td>${escapeHtml(getDutyName(row.dutyId))}</td>
                  <td>${renderCategoryBadgeHtml({ category: row.category, typeLabel: getCategoryLabel(row.category) })}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </section>
    `}

    <section class="panel-card">
      <div class="section-head rail-head">
        <h2 class="section-title">반영된 학사·공문 자료 이력 (${state.uploadHistory.length}건)</h2>
        <span class="meta-chip">원문 자체 미저장 · 일정/요약 반영</span>
      </div>
      <div class="simple-table-wrap">
        <table class="simple-table">
          <thead>
            <tr>
              <th>반영일</th>
              <th>자료 구분</th>
              <th>문서명</th>
              <th>추출 건수</th>
              <th>처리 상태</th>
            </tr>
          </thead>
          <tbody>
            ${state.uploadHistory.map((h) => `
              <tr>
                <td class="cell-num">${escapeHtml(h.reflectedAt)}</td>
                <td>${escapeHtml(h.docType)}</td>
                <td>${escapeHtml(h.docTitle)}</td>
                <td class="cell-num">${h.extractedCount}건</td>
                <td><span class="status-badge is-confirmed">${escapeHtml(h.status)}</span></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </section>
  `;
}

/* -----------------------------
 * 3. 인수인계 View
 * ----------------------------- */
function getFilteredHandoverCards() {
  const q = state.handoverSearch.trim().toLowerCase();
  return state.handoverCards.filter((card) => {
    if (state.handoverDutyFilter !== 'all' && card.dutyId !== state.handoverDutyFilter) return false;
    if (q) {
      const hay = `${card.title} ${card.summary} ${getDutyName(card.dutyId)} ${card.tips.join(' ')}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

function renderHandoverView() {
  const root = document.getElementById('view-handover');
  if (!root || state.activeTab !== 'handover') return;

  const cards = getFilteredHandoverCards();
  let selected = cards.find((c) => c.id === state.selectedHandoverId) || cards[0] || null;
  if (selected) state.selectedHandoverId = selected.id;

  const linkedTasks = selected
    ? state.tasks.filter((t) => t.dutyId === selected.dutyId)
    : [];

  root.innerHTML = `
    <div class="page-header">
      <div class="page-header-copy">
        <h1 class="page-title">인수인계 노트</h1>
        <p class="page-desc">학년·업무분장별 연간 운영 흐름과 전임자 실무 요령·Q&A를 모아 봅니다.</p>
      </div>
      <div class="page-header-actions">
        ${selected ? '<button type="button" class="btn btn-outline btn-sm" id="handover-download-txt">선택 노트 내려받기 (.txt)</button>' : ''}
      </div>
    </div>

    <div class="filter-toolbar">
      <div class="filter-row">
        <select id="handover-duty-filter" class="field-select handover-duty-select" aria-label="인수인계 부서 필터">
          <option value="all" ${state.handoverDutyFilter === 'all' ? 'selected' : ''}>전체 담당 (${state.handoverCards.length})</option>
          ${state.handoverCards.map((c) => `
            <option value="${escapeHtml(c.dutyId)}" ${state.handoverDutyFilter === c.dutyId ? 'selected' : ''}>${escapeHtml(getDutyName(c.dutyId))}</option>
          `).join('')}
        </select>

        <div class="search-wrap">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <input id="handover-search-input" type="search" value="${escapeHtml(state.handoverSearch)}" placeholder="업무 요령·시기 키워드 검색" aria-label="인수인계 검색">
        </div>
      </div>
    </div>

    <div class="handover-layout">
      <div class="handover-list" role="list">
        ${cards.length === 0 ? '<div class="empty-card"><p>조건에 맞는 인수인계 노트가 없습니다.</p></div>' : cards.map((card) => `
          <button
            type="button"
            class="handover-card-btn ${selected && selected.id === card.id ? 'is-selected' : ''}"
            data-select-handover="${escapeHtml(card.id)}"
          >
            <span class="handover-card-top">
              <span class="meta-chip">${escapeHtml(getDutyName(card.dutyId))}</span>
              <span class="handover-card-sub">Q&A ${card.qaList.length}건 · ${escapeHtml(card.updatedAt)}</span>
            </span>
            <span class="handover-card-title">${escapeHtml(card.title)}</span>
            <span class="handover-card-sub">${escapeHtml(card.ownerLabel)}</span>
          </button>
        `).join('')}
      </div>

      <div class="handover-detail-stack">
        ${selected ? `
          <section class="panel-card">
            <div class="section-head rail-head">
              <div>
                <span class="meta-chip">${escapeHtml(getDutyName(selected.dutyId))}</span>
                <h2 class="drawer-title" style="margin-top:6px;">${escapeHtml(selected.title)}</h2>
              </div>
              <button type="button" class="btn btn-outline btn-sm" id="handover-jump-map" data-filter-duty-map="${escapeHtml(selected.dutyId)}">업무 지도에서 보기 →</button>
            </div>
            <p class="drawer-section-note">${escapeHtml(selected.summary)}</p>
            <div class="path-box" style="margin-top:12px;">
              <span class="path-code">${escapeHtml(selected.folderPath)}</span>
              <button type="button" class="btn btn-outline btn-sm" id="handover-copy-path">폴더 경로 복사</button>
            </div>
          </section>

          <section class="panel-card">
            <div class="section-head rail-head">
              <h3 class="section-title">연간 주요 시기</h3>
              <span class="hint-inline">${escapeHtml(selected.sourceTitle)}</span>
            </div>
            <ul class="timeline-list">
              ${selected.timeline.map((item) => `
                <li class="timeline-item">
                  <span class="timeline-month">${escapeHtml(item.monthLabel)}</span>
                  <span>${escapeHtml(item.text)}</span>
                </li>
              `).join('')}
            </ul>
          </section>

          <section class="panel-card">
            <div class="section-head rail-head">
              <h3 class="section-title">전임자 실무 요령</h3>
              <span class="hint-inline">핵심 체크 포인트</span>
            </div>
            <ul class="tips-list">
              ${selected.tips.map((tip) => `<li>${escapeHtml(tip)}</li>`).join('')}
            </ul>
          </section>

          <section class="panel-card">
            <div class="section-head rail-head">
              <h3 class="section-title">연결된 올해 업무 (${linkedTasks.length}건)</h3>
              <span class="hint-inline">누르면 상세 서랍이 열립니다</span>
            </div>
            <ul class="upcoming-list">
              ${linkedTasks.map((t) => `
                <li>
                  <button type="button" class="upcoming-btn" data-open-task="${escapeHtml(t.id)}" data-open-source="handover">
                    <span class="upcoming-dday">${escapeHtml(formatDateCompact(t.dueDate))}</span>
                    <span>${escapeHtml(t.title)}</span>
                  </button>
                </li>
              `).join('')}
            </ul>
          </section>

          <section class="panel-card">
            <div class="section-head rail-head">
              <h3 class="section-title">전임자 연결 및 Q&A</h3>
              <span class="meta-chip">${selected.qaList.length}건 기록</span>
            </div>
            <div class="drawer-actions-row" style="margin-bottom:10px;">
              <button type="button" class="btn btn-primary btn-sm" id="handover-copy-messenger">교내 메신저 질문 문구 복사</button>
              <button type="button" class="btn btn-outline btn-sm" id="handover-copy-magiclink">전보 전임자용 1회용 답변 링크 복사</button>
              <button type="button" class="btn btn-outline btn-sm" id="handover-open-reply-view">1회용 답변 화면 열기 →</button>
            </div>
            <p class="drawer-caption" style="margin-bottom:10px;">복사한 <code>?reply=...</code> 링크로 접속하면 로그인 없이 해당 질문 1건에 바로 회신할 수 있습니다.</p>

            <div style="display:grid;gap:8px;">
              ${selected.qaList.map((qa) => `
                <div class="qa-item">
                  <div class="qa-q">Q. ${escapeHtml(qa.question)} <span class="hint-inline">(${escapeHtml(qa.createdAt)})</span></div>
                  ${qa.answer
                    ? `<div class="qa-a">A. ${escapeHtml(qa.answer)}</div>`
                    : `<div class="hint-inline">전임자 회신 대기 중 ${state.demoMode ? '<button type="button" class="btn btn-outline btn-sm" data-fill-predecessor-reply="' + escapeHtml(qa.id) + '" style="margin-left:8px;">[시연] 전임자 예시 답변 채우기</button>' : ''}</div>`}
                </div>
              `).join('') || '<p class="hint-inline">등록된 질문이 아직 없습니다. 아래에서 첫 질문을 남겨 보세요.</p>'}
            </div>

            <form class="qa-form" id="handover-qa-form">
              <input id="handover-qa-input" class="field-input" type="text" maxlength="200" placeholder="전임자에게 물어볼 사항을 입력하세요 (예: 작년 평가 양식 위치)">
              <button type="submit" class="btn btn-outline btn-sm">질문 등록</button>
            </form>
          </section>
        ` : ''}
      </div>
    </div>
  `;
}

/* -----------------------------
 * 4. 업무 질문 (AI 근거 + 가드레일) View
 * ----------------------------- */
function detectPiiInQuery(text) {
  const phoneRe = /\b01[016789][-\s]?\d{3,4}[-\s]?\d{4}\b/;
  const rrnRe = /\b\d{6}[-\s]?[1-8]\d{6}\b/;
  const emailRe = /[A-Za-z0-9._%+-]+\u0040[A-Za-z0-9.-]+\.[A-Za-z]{2,}/;
  if (phoneRe.test(text) || rrnRe.test(text) || emailRe.test(text)) {
    return '휴대전화 번호, 주민등록번호, 이메일 등 개인정보 패턴이 감지되어 전송을 차단했습니다.';
  }
  return '';
}

function detectUploadBlockReason(text) {
  const pii = detectPiiInQuery(text);
  if (pii) return pii;

  const lines = String(text || '').split(/\r?\n/).slice(0, 8);
  for (const line of lines) {
    const hasNameCol = /(이름|성명|학생명|학생이름)/.test(line);
    const hasSensitiveCol = /(학번|반번호|연락처|전화|휴대전화|주민|생년월일|보호자|주소|집주소)/.test(line);
    if (hasNameCol && hasSensitiveCol) {
      return '학생·교원 개인정보 명단 열([이름 · 학번/연락처/주민/주소])이 감지되어 추출 및 저장을 차단했습니다.';
    }
  }
  return '';
}

function inferEscalationDutyFromQuery(question) {
  // Explicitly resolve domain keywords before homeroom numbers so "2학기" never mis-routes to 2학년 담임.
  if (/학예|독서|도서|돌봄|체험/.test(question)) return 'd-creative';
  if (/난방|안전|시설|콘센트|멀티탭/.test(question)) return 'd-safety';
  if (/보건|감염|위생|독감/.test(question)) return 'd-health';
  if (/공개수업|교육과정|설문|평가/.test(question)) return 'd-research';
  if (/태블릿|충전|방송|전자칠판/.test(question)) return 'd-media';
  if (/상담|월간|학사|기안|시업|졸업|성과상여금/.test(question)) return 'd-kyomu';
  const gradeMatch = question.match(/([1-6])\s*학년/);
  if (gradeMatch) return `h${gradeMatch[1]}`;
  return 'd-kyomu';
}

const GENERIC_QUERY_WORDS = new Set([
  '언제', '언제야', '언제인가요', '언제까지', '어디', '어디야', '어디서', '누구', '무엇', '무슨', '어떤', '어떻게', '어느', '몇', '왜',
  '마감', '마감일', '기한', '제출', '제출일', '일정', '일정표', '날짜', '시기',
  '기준', '기준표', '평가', '계획', '안내', '안내문', '운영', '작성', '준비', '준비할', '진행',
  '확인', '점검', '정리', '수합', '기안', '품의', '정산', '결재', '시행', '공지',
  '공문', '자료', '문서', '파일', '서식', '양식', '명단', '목록', '결과', '내용', '원문',
  '폴더', '공유폴더', '경로', '위치', '저장',
  '교원', '교사', '선생님', '교직원', '직원', '학생', '학부모', '학급', '학년', '담임', '담당', '담당자', '부서',
  '전임', '전임자', '후임', '후임자', '팁', '요령', '노트', '인수인계', '질문', '문의',
  '학교', '교내', '우리', '전체', '올해', '작년', '올해는', '차년도', '이번',
  '학기', '1학기', '2학기', '2026', '2026년', '2026학년도', '2027',
  '아직', '미제출', '미완료', '구입', '구매', '신청', '시간', '알려', '알려줘', '알려주세요', '보여줘', '찾아줘',
  '있어', '있나요', '없어', '가요', '하나요', '되나요', '할까', '해요', '관련', '대해',
]);

function stripKoreanParticle(raw) {
  let w = raw.toLowerCase();
  if (GENERIC_QUERY_WORDS.has(w)) return '';
  const suffixRe = /(인가요|하나요|되나요|해주세요|주세요|알려줘|언제야|어디야|까지|부터|에서|으로|과는|와는|이랑|하고|은|는|이|가|을|를|의|에|로|과|와|도|만)$/;
  const stripped = w.replace(suffixRe, '');
  if (stripped.length >= 2) w = stripped;
  return w;
}

function extractSubjectTokens(question) {
  const rawWords = String(question || '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .map(stripKoreanParticle)
    .filter((w) => w.length >= 2);

  const unique = [];
  for (const w of rawWords) {
    if (GENERIC_QUERY_WORDS.has(w)) continue;
    if (!unique.includes(w)) unique.push(w);
  }
  return unique;
}

function isExplicitGradeToken(tok) {
  return /^[1-6]학년$/.test(tok);
}

function answerChatQuestion(question) {
  const subjectTokens = extractSubjectTokens(question);
  const nonGradeSubjects = subjectTokens.filter((t) => !isExplicitGradeToken(t));
  const targetDutyHint = inferEscalationDutyFromQuery(question);

  if (subjectTokens.length === 0) {
    return {
      id: `chat-bot-${Date.now()}`,
      role: 'bot',
      badge: '확인 필요 · 연관 근거 없음',
      badgeTone: 'is-ai',
      text: `질문에서 구체적인 업무 주제어를 찾지 못했습니다. 임의로 일정을 추측하지 않으니 오른쪽 [전임자·담당 연결]에서 부서를 선택해 문의하시거나 업무명·키워드를 구체적으로 입력해 주세요.`,
      sources: [],
      escalationDutyId: targetDutyHint,
      questionText: question,
    };
  }

  const scoredTasks = state.tasks.map((t) => {
    const hay = `${t.title} ${t.note} ${t.sourceTitle} ${t.sourceExcerpt} ${t.folderPath} ${getDutyName(t.dutyId)}`.toLowerCase();
    let matchedCount = 0;
    let nonGradeMatched = 0;
    let score = 0;
    const matchedTokens = [];
    for (const tok of subjectTokens) {
      if (hay.includes(tok)) {
        matchedCount += 1;
        matchedTokens.push(tok);
        if (!isExplicitGradeToken(tok)) nonGradeMatched += 1;
        score += tok.length >= 3 ? 3 : 2;
      }
    }
    if (matchedCount > 0 && t.dutyId === targetDutyHint) score += 1;
    return { task: t, score, matchedCount, nonGradeMatched, matchedTokens };
  }).sort((a, b) => b.score - a.score || b.matchedCount - a.matchedCount);

  const scoredCards = state.handoverCards.map((c) => {
    const hay = `${c.title} ${c.summary} ${c.tips.join(' ')} ${c.timeline.map((x) => x.text).join(' ')} ${getDutyName(c.dutyId)}`.toLowerCase();
    let matchedCount = 0;
    let score = 0;
    for (const tok of subjectTokens) {
      if (hay.includes(tok)) {
        matchedCount += 1;
        score += 2;
      }
    }
    if (matchedCount > 0 && c.dutyId === targetDutyHint) score += 1;
    return { card: c, score, matchedCount };
  }).sort((a, b) => b.score - a.score);

  const topTask = scoredTasks[0];
  const topCard = scoredCards[0];

  const hasValidDomainHit = Boolean(
    topTask &&
    topTask.matchedCount > 0 &&
    (nonGradeSubjects.length === 0 || topTask.nonGradeMatched > 0)
  );

  if (!hasValidDomainHit) {
    return {
      id: `chat-bot-${Date.now()}`,
      role: 'bot',
      badge: '확인 필요 · 연관 근거 없음',
      badgeTone: 'is-ai',
      text: `올려진 업무 지도·공문 근거·인수인계 노트에서 "${subjectTokens.join(', ')}" 관련 문서를 찾지 못했습니다. 근거가 없는 일정·기준·비밀번호는 추측해 안내하지 않으며, 오른쪽 [전임자·담당 연결]에서 해당 부서에 바로 문의하실 수 있습니다.`,
      sources: [],
      escalationDutyId: targetDutyHint,
      questionText: question,
    };
  }

  const coverageDenominator = nonGradeSubjects.length > 0 ? nonGradeSubjects.length : subjectTokens.length;
  const coverageRatio = (nonGradeSubjects.length > 0 ? topTask.nonGradeMatched : topTask.matchedCount) / coverageDenominator;
  const isPartialMatch = coverageRatio < 0.7;

  const matchedTask = topTask.task;
  const lines = [];
  if (isPartialMatch) {
    lines.push(`[관련 있을 수 있는 자료 · 확인 필요] 질문의 일부 단어(${topTask.matchedTokens.join(', ')})와 일치하는 문서가 있으나 전체 주제와 일치하는지는 확인이 필요합니다.`);
  } else {
    lines.push(`[${matchedTask.sourceTitle}] 근거 기준 안내입니다.`);
  }
  lines.push(`• 주관 담당: ${getDutyName(matchedTask.dutyId)} · 마감일: ${matchedTask.dueDate}`);
  lines.push(`• 핵심 내용: ${matchedTask.sourceExcerpt}`);
  if (matchedTask.submission) {
    const missing = matchedTask.submission.targetDutyIds
      .filter((id) => !matchedTask.submission.submittedDutyIds.includes(id))
      .map((id) => getDutyName(id));
    lines.push(missing.length > 0
      ? `• 현재 수합 현황: ${matchedTask.submission.submittedDutyIds.length}/${matchedTask.submission.targetDutyIds.length} 제출 (미제출: ${missing.join(', ')})`
      : '• 현재 수합 현황: 전체 대상 제출 완료');
  }
  lines.push(`• 자료 폴더 위치: ${matchedTask.folderPath}`);

  if (topCard && topCard.matchedCount > 0 && topCard.card.tips.length > 0) {
    lines.push(`• 전임자 실무 요령(${getDutyName(topCard.card.dutyId)}): ${topCard.card.tips[0]}`);
  }

  const sources = [
    { type: 'task', id: matchedTask.id, label: `업무 상세: ${matchedTask.title}` },
  ];
  if (topCard && topCard.matchedCount > 0) {
    sources.push({ type: 'handover', id: topCard.card.id, label: `인수인계: ${getDutyName(topCard.card.dutyId)}` });
  }

  return {
    id: `chat-bot-${Date.now()}`,
    role: 'bot',
    badge: isPartialMatch ? '관련 있을 수 있는 자료 · 확인 필요' : '✓ 문서 근거 확인',
    badgeTone: isPartialMatch ? 'is-ai' : 'is-confirmed',
    text: lines.join('\n'),
    sources,
    escalationDutyId: matchedTask.dutyId,
    questionText: question,
  };
}

function sendChatQuestion(rawQuestion) {
  const question = rawQuestion.trim();
  if (!question) return;
  if (question.length > 300) {
    showToast('질문은 최대 300자까지 입력할 수 있습니다.');
    return;
  }
  const piiError = detectPiiInQuery(question);
  if (piiError) {
    showToast(piiError);
    return;
  }

  state.chatMessages.push({
    id: `chat-user-${Date.now()}`,
    role: 'user',
    text: question,
  });
  const botReply = answerChatQuestion(question);
  state.chatMessages.push(botReply);
  if (botReply.escalationDutyId) {
    state.chatSelectedEscalationDutyId = botReply.escalationDutyId;
  }
  state.chatInputValue = '';
  renderChatView();
  const thread = document.getElementById('chat-thread');
  if (thread) thread.scrollTop = thread.scrollHeight;
}

function renderChatView() {
  const root = document.getElementById('view-chat');
  if (!root || state.activeTab !== 'chat') return;

  const escalationDutyName = getDutyName(state.chatSelectedEscalationDutyId);
  const lastUserMsg = [...state.chatMessages].reverse().find((m) => m.role === 'user');
  const lastQ = lastUserMsg ? lastUserMsg.text : '업무 진행 절차 확인 요청';
  const escalationMsg = `안녕하세요, ${escalationDutyName} 전임/담당 선생님. TeacherMate 자료에서 근거가 확인되지 않아 여쭤봅니다. [${lastQ}] 관련하여 작년도 기준이나 자료 위치 안내 부탁드립니다.`;

  root.innerHTML = `
    <div class="page-header">
      <div class="page-header-copy">
        <h1 class="page-title">업무 질문</h1>
        <p class="page-desc">올린 공문과 인수인계 노트를 근거로 답하고, 근거가 부족할 때는 추측 대신 담당자·전임자에게 연결합니다.</p>
      </div>
      <div class="page-header-actions">
        <button type="button" class="btn btn-outline btn-sm" id="chat-clear-btn">대화 초기화</button>
      </div>
    </div>

    <div class="chat-layout">
      <section class="panel-card chat-box">
        <div class="chat-samples">
          ${CHAT_SAMPLE_QUESTIONS.map((q) => `
            <button type="button" class="preset-chip" data-chat-sample="${escapeHtml(q)}">${escapeHtml(q)}</button>
          `).join('')}
        </div>

        <div id="chat-thread" class="chat-thread">
          ${state.chatMessages.map((msg) => {
            if (msg.role === 'user') {
              return `<div class="chat-msg is-user">${escapeHtml(msg.text)}</div>`;
            }
            const badgeCls = msg.badgeTone === 'is-confirmed'
              ? 'status-badge is-confirmed'
              : (msg.badgeTone === 'is-ai' ? 'status-badge is-ai' : 'meta-chip');
            return `
              <div class="chat-msg is-bot">
                <div><span class="${badgeCls}">${escapeHtml(msg.badge)}</span></div>
                <div style="white-space:pre-line;">${escapeHtml(msg.text)}</div>
                ${msg.sources && msg.sources.length > 0 ? `
                  <div class="chat-sources">
                    ${msg.sources.map((src) => src.type === 'task'
                      ? `<button type="button" class="chat-source-btn" data-open-task="${escapeHtml(src.id)}" data-open-source="chat">${escapeHtml(src.label)}</button>`
                      : `<button type="button" class="chat-source-btn" data-jump-handover="${escapeHtml(src.id)}">${escapeHtml(src.label)}</button>`
                    ).join('')}
                  </div>
                ` : ''}
              </div>
            `;
          }).join('')}
        </div>

        <form class="chat-input-area" id="chat-form">
          <div class="chat-input-row">
            <input
              id="chat-input"
              class="field-input"
              type="text"
              maxlength="300"
              value="${escapeHtml(state.chatInputValue)}"
              placeholder="업무 마감일, 수합 미제출 학년, 공유폴더 위치 등을 물어보세요 (최대 300자)"
              aria-label="업무 질문 입력"
            >
            <button type="submit" class="btn btn-primary btn-sm" id="chat-send-btn">질문 보내기</button>
          </div>
          <div class="chat-input-meta">
            <span>휴대전화 번호·주민번호·이메일 등 개인정보 입력 시 자동 차단</span>
            <span id="chat-char-count">${state.chatInputValue.length} / 300자</span>
          </div>
        </form>
      </section>

      <aside class="panel-card" id="chat-escalation-box">
        <div class="section-head rail-head">
          <h2 class="section-title">전임자·담당 연결</h2>
          <span class="meta-chip">추측 금지 원칙</span>
        </div>
        <p class="drawer-section-note" style="margin-bottom:10px;">자료 근거가 없을 때는 담당 부서를 고른 뒤 메신저 문구를 복사하거나 인수인계 Q&A에 바로 남기세요.</p>
        <div class="field-group" style="margin-bottom:10px;">
          <label for="chat-escalation-duty">추천 연결 부서 (자동 키워드 분류)</label>
          <select id="chat-escalation-duty" class="field-select">
            ${DUTIES.map((d) => `<option value="${escapeHtml(d.id)}" ${d.id === state.chatSelectedEscalationDutyId ? 'selected' : ''}>${escapeHtml(d.name)}</option>`).join('')}
          </select>
        </div>
        <div class="source-highlight-box" style="margin-bottom:10px;">
          ${escapeHtml(escalationMsg)}
        </div>
        <div style="display:grid;gap:8px;">
          <button type="button" class="btn btn-primary btn-sm btn-full" id="chat-copy-escalation" data-copy-msg="${escapeHtml(escalationMsg)}">문의 메신저 문구 복사</button>
          <button type="button" class="btn btn-outline btn-sm btn-full" id="chat-go-handover-qa">해당 부서 인수인계 Q&A로 이동 →</button>
        </div>
      </aside>
    </div>
  `;
}

/* -----------------------------
 * 5. 설정 View
 * ----------------------------- */
function renderSettingsView() {
  const root = document.getElementById('view-settings');
  if (!root || state.activeTab !== 'settings') return;

  const totalTasks = state.tasks.length;
  const confirmedCount = state.tasks.filter((t) => t.status === 'confirmed').length;
  const draftCount = state.tasks.filter((t) => t.status === 'draft' && !t.done).length;
  const doneCount = state.tasks.filter((t) => t.done).length;
  const collectCount = state.tasks.filter((t) => Boolean(t.submission)).length;

  root.innerHTML = `
    <div class="page-header">
      <div class="page-header-copy">
        <h1 class="page-title">환경설정 및 시연 관리</h1>
        <p class="page-desc">내 담당 학년·부서 기본 필터, 실시간 업무 현황, 발표용 시연 보조 도구와 공개 데이터 보호를 관리합니다.</p>
      </div>
      <div class="page-header-actions">
        <button type="button" class="btn btn-outline btn-sm" data-go-tab="map">← 업무 지도로 돌아가기</button>
      </div>
    </div>

    <div class="settings-grid">
      <section class="panel-card">
        <div class="section-head rail-head">
          <h2 class="section-title">내 담당 학년·부서 설정</h2>
          <span class="meta-chip">${state.myDutyIds.size}개 선택</span>
        </div>
        <p class="drawer-section-note" style="margin-bottom:10px;">올해 맡으신 담당을 체크해 두면 업무 지도에서 [내 담당] 버튼 한 번으로 모아보고 .ics 일정도 내 담당만 내보낼 수 있습니다.</p>
        <div class="duty-check-grid">
          ${DUTIES.map((d) => `
            <label class="duty-check-item">
              <input type="checkbox" data-settings-duty="${escapeHtml(d.id)}" ${state.myDutyIds.has(d.id) ? 'checked' : ''}>
              <span>${escapeHtml(d.name)}</span>
            </label>
          `).join('')}
        </div>
      </section>

      <section class="panel-card">
        <div class="section-head rail-head">
          <h2 class="section-title">학교 업무 운영 현황 (실시간 집계)</h2>
          <span class="meta-chip">현재 메모리 상태 기준</span>
        </div>
        <div class="stat-grid">
          <div class="stat-card">
            <span class="stat-label">등록 업무</span>
            <span class="stat-value">${totalTasks}건</span>
          </div>
          <div class="stat-card">
            <span class="stat-label">확정 일정</span>
            <span class="stat-value">${confirmedCount}건</span>
          </div>
          <div class="stat-card">
            <span class="stat-label">완료 처리</span>
            <span class="stat-value">${doneCount}건</span>
          </div>
          <div class="stat-card">
            <span class="stat-label">AI 초안 대기</span>
            <span class="stat-value">${draftCount}건</span>
          </div>
          <div class="stat-card">
            <span class="stat-label">수합 관리</span>
            <span class="stat-value">${collectCount}건</span>
          </div>
          <div class="stat-card">
            <span class="stat-label">인수인계 노트</span>
            <span class="stat-value">${state.handoverCards.length}건</span>
          </div>
        </div>
      </section>

      <section class="panel-card">
        <div class="section-head rail-head">
          <h2 class="section-title">발표용 시연 보조 도구</h2>
          <span class="status-badge ${state.demoMode ? 'is-confirmed' : 'is-done'}">${state.demoMode ? '표시 중' : '일반 교사 화면'}</span>
        </div>
        <label class="toggle-row" style="cursor:pointer;">
          <div>
            <strong>발표용 시연 보조 버튼 켜기</strong>
            <div class="hint-inline">끄면 일반 교사용 화면만 보이며, 켜면 서랍의 미제출 토글과 인수인계 예시 답변 버튼이 열립니다.</div>
          </div>
          <input type="checkbox" id="settings-demo-mode" ${state.demoMode ? 'checked' : ''}>
        </label>
      </section>

      <section class="panel-card">
        <div class="section-head rail-head">
          <h2 class="section-title">백업 및 공개 시연 보호 잠금</h2>
          <span class="meta-chip">시연 데이터 보호됨</span>
        </div>
        <div class="lock-box" style="margin-bottom:12px;">
          <div style="font-size:13px;font-weight:700;color:var(--st-over-ink);">파괴적 작업 보호</div>
          <div style="font-size:12px;color:var(--ink-secondary);">공개 시연 중 다수가 접속하더라도 학교 공용 데이터가 지워지지 않도록 일괄 삭제 기능을 잠급니다.</div>
          <div>
            <button type="button" class="btn btn-outline btn-sm" disabled title="공개 시연 보호로 비활성화됨">전체 데이터 일괄 삭제 (시연 계정 잠금됨)</button>
          </div>
        </div>
        <div class="drawer-actions-row">
          <button type="button" class="btn btn-outline btn-sm" id="settings-download-json">현재 시연 데이터 JSON 백업</button>
          <button type="button" class="btn btn-outline btn-sm" id="settings-reset-all">처음 시연 상태로 되돌리기</button>
        </div>
      </section>
    </div>
  `;
}

/* -----------------------------
 * Detail Drawer
 * ----------------------------- */
function renderDrawer() {
  const backdrop = document.getElementById('drawer-backdrop');
  const drawerEl = document.getElementById('detail-drawer');
  const contentEl = document.getElementById('drawer-content');

  if (!state.drawer) {
    backdrop.hidden = true;
    drawerEl.hidden = true;
    contentEl.innerHTML = '';
    return;
  }

  const task = state.tasks.find((t) => t.id === state.drawer.taskId);
  if (!task) {
    state.drawer = null;
    backdrop.hidden = true;
    drawerEl.hidden = true;
    return;
  }

  const activeFilterLabel = getActiveFilterLabel();
  const isOutsideActiveFilter =
    (state.selectedDutyId && task.dutyId !== state.selectedDutyId) ||
    (state.myOnly && !state.myDutyIds.has(task.dutyId));

  const dday = formatDday(task.dueDate);
  const overdue = isTaskOverdue(task);
  const ownerName = getDutyName(task.dutyId);
  const sub = task.submission;
  const subPct = sub ? Math.round((sub.submittedDutyIds.length / sub.targetDutyIds.length) * 100) : 0;
  const subOverdue = Boolean(sub && overdue && sub.targetDutyIds.length > sub.submittedDutyIds.length);
  const matchedHandover = state.handoverCards.find((c) => c.dutyId === task.dutyId);

  backdrop.hidden = false;
  drawerEl.hidden = false;

  contentEl.innerHTML = `
    <div class="drawer-head">
      <div class="drawer-head-tags">
        ${renderCategoryBadgeHtml(task)}
        ${renderStatusBadgeHtml(task)}
        <span class="dday-badge ${overdue ? 'is-over' : dday.tone}">${escapeHtml(dday.text)}</span>
      </div>
      <button type="button" class="btn btn-outline btn-sm" id="drawer-close-top">닫기</button>
    </div>

    ${(state.drawer.fromCollectionPanel || isOutsideActiveFilter) && activeFilterLabel ? `
      <div class="drawer-context-banner" role="status">
        <span>현재 <strong>'${escapeHtml(activeFilterLabel)}'</strong> 필터가 유지되어 있습니다. 창을 닫으면 보던 ${escapeHtml(activeFilterLabel)} 목록으로 돌아갑니다.</span>
        <button type="button" class="drawer-link-btn" id="drawer-clear-filter-jump">필터 해제 후 전체 목록에서 위치 보기</button>
      </div>
    ` : ''}

    <div class="drawer-body">
      <h2 id="drawer-title" class="drawer-title">${escapeHtml(task.title)}</h2>

      <div class="drawer-meta-bar">
        <dl class="drawer-meta-grid">
          <div>
            <dt>주관 담당</dt>
            <dd>${escapeHtml(ownerName)}</dd>
          </div>
          <div>
            <dt>마감일</dt>
            <dd>${escapeHtml(task.dueDate)} (${escapeHtml(dday.text)})</dd>
          </div>
        </dl>
        <button type="button" class="btn btn-outline btn-sm" data-toggle-task-done="${escapeHtml(task.id)}">
          ${task.done ? '미완료로 변경' : '✓ 완료 처리'}
        </button>
      </div>

      ${task.status === 'draft' ? `
        <section class="drawer-draft-notice">
          <h3 class="drawer-section-title">AI 초안 검토 대기</h3>
          <p class="drawer-section-note">공문·학사안내에서 추출한 초안입니다. 아래 원문 근거와 마감일이 맞는지 확인한 뒤 확정해 주세요.</p>
          <div>
            <button type="button" class="btn btn-primary btn-sm" id="drawer-confirm-draft">내용 확인 후 확정</button>
          </div>
        </section>
      ` : ''}

      ${sub ? `
        <section class="drawer-section">
          <div class="drawer-section-head">
            <h3 class="drawer-section-title">제출 수합 현황</h3>
            <span class="sub-progress-text ${subOverdue ? 'is-overdue' : ''}">${sub.submittedDutyIds.length}/${sub.targetDutyIds.length} 제출</span>
          </div>
          <div class="progress-track" aria-hidden="true">
            <div class="progress-fill ${subOverdue ? 'is-overdue' : ''}" style="width:${subPct}%"></div>
          </div>
          <div class="grade-tags">
            ${sub.targetDutyIds.map((id) => {
              const submitted = sub.submittedDutyIds.includes(id);
              const isMine = state.selectedDutyId === id || state.myDutyIds.has(id);
              const shortName = getDutyName(id).replace(' 담임', '');
              const cls = submitted ? 'is-submitted' : 'is-missing';
              if (state.demoMode) {
                return `<button type="button" class="grade-tag ${cls} ${isMine ? 'is-mine' : ''}" data-demo-toggle-sub="${escapeHtml(task.id)}:${escapeHtml(id)}" title="시연 보조: 클릭해 제출 상태 전환">${escapeHtml(shortName)} ${submitted ? '제출' : '미제출'}</button>`;
              }
              return `<span class="grade-tag ${cls} ${isMine ? 'is-mine' : ''}">${escapeHtml(shortName)} ${submitted ? '제출' : '미제출'}</span>`;
            }).join('')}
          </div>
          <div class="drawer-actions-row">
            <button type="button" class="btn btn-primary btn-sm" id="drawer-copy-messenger">교내 메신저 안내 문구 복사</button>
            <button type="button" class="btn btn-outline btn-sm" id="drawer-nudge-inapp">${sub.nudged ? '앱 알림 기록됨' : '앱 내 알림 표시'}</button>
          </div>
          <p class="drawer-caption">${state.demoMode ? '발표 시연 도구 켜짐: 학년 라벨을 눌러 제출/미제출을 전환할 수 있습니다.' : '앱 내 알림은 접속 시 화면에 표시되며, 즉시 전달은 메신저 문구 복사를 권장합니다.'}</p>
        </section>
      ` : ''}

      <section class="drawer-section">
        <h3 class="drawer-section-title">업무 안내 및 원문 근거</h3>
        <p class="drawer-section-note">${escapeHtml(task.note)}</p>
        <blockquote class="source-quote">
          <div class="source-quote-title">${escapeHtml(task.sourceTitle)}</div>
          <div>${escapeHtml(task.sourceExcerpt)}</div>
        </blockquote>
      </section>

      ${task.checklist.length > 0 ? `
        <section class="drawer-section">
          <h3 class="drawer-section-title">세부 점검 사항</h3>
          <ul class="drawer-checklist">
            ${task.checklist.map((item) => `
              <li>
                <label>
                  <input type="checkbox" data-toggle-check-item="${escapeHtml(item.id)}" ${item.done ? 'checked' : ''}>
                  <span>${escapeHtml(item.text)}</span>
                </label>
              </li>
            `).join('')}
          </ul>
        </section>
      ` : ''}

      <section class="drawer-section">
        <h3 class="drawer-section-title">교내 공유폴더 위치 및 연계 메뉴</h3>
        <div class="path-box">
          <span class="path-code">${escapeHtml(task.folderPath)}</span>
          <button type="button" class="btn btn-outline btn-sm" id="drawer-copy-path">경로 복사</button>
        </div>
        <div class="drawer-actions-row">
          ${matchedHandover ? `<button type="button" class="btn btn-outline btn-sm" data-drawer-go-handover="${escapeHtml(matchedHandover.id)}">연결된 인수인계 노트 →</button>` : ''}
          <button type="button" class="btn btn-outline btn-sm" data-drawer-ask-chat="${escapeHtml(task.title)}">이 업무 질문하기 →</button>
        </div>
      </section>
    </div>

    <div class="drawer-foot">
      <button type="button" class="btn btn-outline btn-sm" id="drawer-close-foot">
        ${activeFilterLabel ? `닫고 ${escapeHtml(activeFilterLabel)} 목록으로 돌아가기` : '목록으로 돌아가기'}
      </button>
    </div>
  `;
}

/* -----------------------------
 * 6. 외부 전보 전임자용 1회용 답변 화면 (?reply=)
 * ----------------------------- */
function renderReplyView() {
  const root = document.getElementById('view-reply');
  if (!root || state.activeTab !== 'reply') return;

  const card = state.handoverCards.find((c) => c.id === state.replyCardId) || state.handoverCards[0];
  const pendingQa = card.qaList.find((q) => !q.answer);
  const latestQa = card.qaList[card.qaList.length - 1];
  const promptQuestion = pendingQa
    ? pendingQa.question
    : (latestQa ? latestQa.question : card.messengerQuestionTemplate);

  root.innerHTML = `
    <div class="reply-card-wrap">
      <div class="page-header" style="margin-bottom:0;">
        <div class="page-header-copy">
          <span class="meta-chip">외부 전보 교원용 1회용 답변 화면 (무로그인 시연)</span>
          <h1 class="page-title" style="margin-top:6px;">전임자 질문 답변하기</h1>
          <p class="page-desc">${escapeHtml(SCHOOL_INFO.name)} · ${escapeHtml(getDutyName(card.dutyId))} 인수인계 확인 요청</p>
        </div>
        <button type="button" class="btn btn-outline btn-sm" id="reply-go-handover">인수인계 노트로 이동 →</button>
      </div>

      ${state.replySavedBanner ? `
        <div class="added-banner" role="status">
          <span>답변을 등록해 ${escapeHtml(getDutyName(card.dutyId))} 인수인계 Q&A에 반영했습니다. (시연)</span>
          <button type="button" class="btn btn-primary btn-sm" id="reply-view-saved-btn">저장된 인수인계 Q&A 보기 →</button>
        </div>
      ` : ''}

      <section class="panel-card">
        <div class="section-head rail-head">
          <h2 class="section-title">${escapeHtml(card.title)}</h2>
          <span class="meta-chip">${escapeHtml(getDutyName(card.dutyId))}</span>
        </div>

        <div class="source-quote" style="margin-bottom:14px;">
          <div class="source-quote-title">현임 교사의 확인 요청 질문</div>
          <div>${escapeHtml(promptQuestion)}</div>
        </div>

        <form id="reply-form" style="display:grid;gap:10px;">
          <div class="field-group">
            <label for="reply-answer-text">전임자 답변 입력 (학교 밖에서도 로그인 없이 회신)</label>
            <textarea
              id="reply-answer-text"
              class="field-textarea"
              maxlength="400"
              placeholder="작년도 진행 경험, 서식 폴더 위치, 유의사항 등을 간단히 적어 주세요. (개인정보·연락처 입력 차단)"
            ></textarea>
          </div>
          <div class="drawer-actions-row">
            <button type="submit" class="btn btn-primary btn-sm">답변 등록하고 인수인계에 반영</button>
            <button type="button" class="btn btn-outline btn-sm" id="reply-back-map">일반 업무 지도로 이동</button>
          </div>
        </form>
      </section>
    </div>
  `;
}

function renderAll() {
  renderTopAndSubnav();
  if (state.activeTab === 'map') {
    renderMonthStrip();
    renderRolePopover();
    renderTaskLedger();
    renderRightRailAndMobileCollections();
  } else if (state.activeTab === 'upload') {
    renderUploadView();
  } else if (state.activeTab === 'handover') {
    renderHandoverView();
  } else if (state.activeTab === 'chat') {
    renderChatView();
  } else if (state.activeTab === 'settings') {
    renderSettingsView();
  } else if (state.activeTab === 'reply') {
    renderReplyView();
  }
  renderDrawer();
}

function openTaskDrawer(taskId, fromSource) {
  savedScrollY = window.scrollY;
  lastDrawerTrigger = {
    taskId,
    fromSource: fromSource || 'ledger',
  };
  state.rolePopoverOpen = false;
  state.drawer = {
    taskId,
    fromCollectionPanel: fromSource === 'collection-panel',
  };
  renderAll();
  const closeBtn = document.getElementById('drawer-close-top');
  if (closeBtn) closeBtn.focus({ preventScroll: true });
}

function closeTaskDrawer() {
  if (!state.drawer) return;
  const trigger = lastDrawerTrigger;
  state.drawer = null;
  renderAll();
  window.scrollTo(0, savedScrollY);
  const restored = trigger
    ? findVisibleTaskTrigger(trigger.taskId, trigger.fromSource)
    : null;
  if (restored && typeof restored.focus === 'function') {
    restored.focus({ preventScroll: true });
  } else {
    document.getElementById('role-picker-btn')?.focus({ preventScroll: true });
  }
  window.scrollTo(0, savedScrollY);
}

/* -----------------------------
 * ICS Calendar Export
 * ----------------------------- */
function formatIcsDate(dateStr) {
  return dateStr.replace(/-/g, '');
}

function nextDayIso(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const next = new Date(Date.UTC(y, m - 1, d + 1));
  return next.toISOString().slice(0, 10);
}

function buildIcsContent(tasks) {
  const stamp = `${DEMO_TODAY.replace(/-/g, '')}T090000Z`;
  const calPrefix = SCHOOL_INFO.shortName || '예시초';
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Yeshicho-Demo//TeacherMate-Map//KO',
    'CALSCALE:GREGORIAN',
    `X-WR-CALNAME:${calPrefix} 업무 일정(가상)`,
  ];

  for (const t of tasks) {
    lines.push(
      'BEGIN:VEVENT',
      `UID:${t.id}-yeshicho-demo`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${formatIcsDate(t.dueDate)}`,
      `DTEND;VALUE=DATE:${formatIcsDate(nextDayIso(t.dueDate))}`,
      `SUMMARY:${t.title}`,
      `DESCRIPTION:${getDutyName(t.dutyId)} | ${t.folderPath}`,
      'BEGIN:VALARM',
      'ACTION:DISPLAY',
      'DESCRIPTION:D-7 업무 확인 알림',
      'TRIGGER:-P6DT15H',
      'END:VALARM',
      'BEGIN:VALARM',
      'ACTION:DISPLAY',
      'DESCRIPTION:D-1 업무 확인 알림',
      'TRIGGER:-PT15H',
      'END:VALARM',
      'END:VEVENT'
    );
  }

  lines.push('END:VCALENDAR');
  return `${lines.join('\r\n')}\r\n`;
}

function downloadIcs() {
  const targets = state.tasks.filter((t) => {
    if (t.status !== 'confirmed' || !t.dueDate) return false;
    if (state.icsMyOnly && state.myDutyIds.size > 0) return state.myDutyIds.has(t.dutyId);
    return true;
  });

  if (targets.length === 0) {
    showToast('내보낼 확정 일정이 없습니다. 내 담당을 먼저 지정하거나 체크를 해제해 주세요.');
    return;
  }

  const content = buildIcsContent(targets);
  downloadFile('yeshicho-demo-schedule.ics', content, 'text/calendar;charset=utf-8');
  showToast(`확정 일정 ${targets.length}건을 .ics 파일로 내보냈습니다.`);
}

function resetDemoState() {
  state.tasks = cloneInitialTasks();
  state.uploadHistory = INITIAL_UPLOAD_HISTORY.map((h) => ({ ...h }));
  state.upload = buildInitialUploadState();
  state.handoverCards = cloneHandoverCards();
  state.selectedHandoverId = INITIAL_HANDOVER_CARDS[0].id;
  state.handoverDutyFilter = 'all';
  state.handoverSearch = '';
  state.chatMessages = buildInitialChatMessages();
  state.chatInputValue = '';
  state.selectedMonth = SCHOOL_INFO.defaultMonth;
  state.selectedDutyId = null;
  state.myOnly = false;
  state.myDutyIds = new Set();
  state.selectedCategory = 'all';
  state.searchQuery = '';
  state.eventsOpen = false;
  state.overdueExpanded = false;
  state.mobileCollectionsExpanded = false;
  state.rolePopoverOpen = false;
  state.drawer = null;
  state.icsMyOnly = false;
  state.demoMode = false;
  lastDrawerTrigger = null;
  const searchEl = document.getElementById('search-input');
  if (searchEl) searchEl.value = '';
  renderAll();
  showToast('초기 시연 상태로 되돌렸습니다.');
}

/* -----------------------------
 * Global Event Delegation
 * ----------------------------- */
document.addEventListener('click', (event) => {
  const target = event.target;

  // Navigation tabs & links
  const goTabBtn = target.closest('[data-go-tab]');
  if (goTabBtn) {
    switchTab(goTabBtn.dataset.goTab);
    return;
  }

  // View switcher (list / calendar)
  const mapViewBtn = target.closest('[data-map-view]');
  if (mapViewBtn) {
    state.mapView = mapViewBtn.dataset.mapView;
    renderAll();
    return;
  }

  // Month navigation
  const monthBtn = target.closest('[data-month]');
  if (monthBtn) {
    state.selectedMonth = Number(monthBtn.dataset.month);
    state.rolePopoverOpen = false;
    renderAll();
    return;
  }

  const monthStepBtn = target.closest('[data-month-step]');
  if (monthStepBtn) {
    const delta = Number(monthStepBtn.dataset.monthStep);
    const idx = MONTHS.findIndex((m) => m.num === state.selectedMonth);
    const nextIdx = (idx + delta + MONTHS.length) % MONTHS.length;
    state.selectedMonth = MONTHS[nextIdx].num;
    state.rolePopoverOpen = false;
    renderAll();
    return;
  }

  // Duty picker
  if (target.closest('#role-picker-btn')) {
    state.rolePopoverOpen = !state.rolePopoverOpen;
    renderRolePopover();
    return;
  }

  if (target.closest('#empty-pick-role-btn')) {
    state.rolePopoverOpen = true;
    renderRolePopover();
    return;
  }

  const selectDutyBtn = target.closest('[data-select-duty]');
  if (selectDutyBtn) {
    const val = selectDutyBtn.dataset.selectDuty;
    state.selectedDutyId = val || null;
    if (state.selectedDutyId) state.myOnly = false;
    state.rolePopoverOpen = false;
    renderAll();
    return;
  }

  const starBtn = target.closest('[data-star-duty]');
  if (starBtn) {
    const dutyId = starBtn.dataset.starDuty;
    if (state.myDutyIds.has(dutyId)) state.myDutyIds.delete(dutyId);
    else state.myDutyIds.add(dutyId);
    renderRolePopover();
    if (state.myOnly) renderTaskLedger();
    return;
  }

  if (target.closest('#clear-role-btn')) {
    state.selectedDutyId = null;
    renderAll();
    return;
  }

  if (target.closest('#my-duties-btn')) {
    state.myOnly = !state.myOnly;
    if (state.myOnly) state.selectedDutyId = null;
    state.rolePopoverOpen = false;
    renderAll();
    return;
  }

  const catBtn = target.closest('[data-cat]');
  if (catBtn) {
    state.selectedCategory = catBtn.dataset.cat;
    renderAll();
    return;
  }

  if (target.closest('#reset-demo-btn') || target.closest('#settings-reset-all')) {
    resetDemoState();
    return;
  }

  if (target.closest('#summary-reset-btn') || target.closest('#empty-reset-btn')) {
    state.selectedDutyId = null;
    state.myOnly = false;
    state.selectedCategory = 'all';
    state.searchQuery = '';
    const searchEl = document.getElementById('search-input');
    if (searchEl) searchEl.value = '';
    renderAll();
    return;
  }

  if (target.closest('#toggle-events-btn')) {
    state.eventsOpen = !state.eventsOpen;
    renderEventsSection();
    return;
  }

  if (target.closest('#mobile-collections-toggle') && !target.closest('[data-open-task]')) {
    state.mobileCollectionsExpanded = !state.mobileCollectionsExpanded;
    renderRightRailAndMobileCollections();
    return;
  }

  if (target.closest('#overdue-toggle-btn')) {
    state.overdueExpanded = !state.overdueExpanded;
    renderRightRailAndMobileCollections();
    return;
  }

  if (target.closest('#export-ics-btn')) {
    downloadIcs();
    return;
  }

  // Task completion checkbox toggle
  const toggleDoneBtn = target.closest('[data-toggle-task-done]');
  if (toggleDoneBtn) {
    const task = state.tasks.find((t) => t.id === toggleDoneBtn.dataset.toggleTaskDone);
    if (task) {
      task.done = !task.done;
      renderAll();
    }
    return;
  }

  // Open Detail Drawer
  const openBtn = target.closest('[data-open-task]');
  if (openBtn) {
    openTaskDrawer(openBtn.dataset.openTask, openBtn.dataset.openSource);
    return;
  }

  // Drawer interactions
  if (target.id === 'drawer-close-top' || target.id === 'drawer-close-foot' || target.id === 'drawer-backdrop') {
    closeTaskDrawer();
    return;
  }

  if (target.id === 'drawer-clear-filter-jump' && state.drawer) {
    const openedId = state.drawer.taskId;
    const task = state.tasks.find((t) => t.id === openedId);
    state.selectedDutyId = null;
    state.myOnly = false;
    state.selectedCategory = 'all';
    state.searchQuery = '';
    if (task) state.selectedMonth = task.month;
    const searchEl = document.getElementById('search-input');
    if (searchEl) searchEl.value = '';
    state.drawer.fromCollectionPanel = false;
    renderAll();
    showToast('전체 목록 기준으로 전환했습니다.');
    return;
  }

  if (target.id === 'drawer-confirm-draft' && state.drawer) {
    const task = state.tasks.find((t) => t.id === state.drawer.taskId);
    if (task) {
      task.status = 'confirmed';
      renderAll();
      showToast('AI 초안을 확인하고 확정했습니다.');
    }
    return;
  }

  if (target.id === 'drawer-copy-messenger' && state.drawer) {
    const task = state.tasks.find((t) => t.id === state.drawer.taskId);
    if (task && task.submission) {
      copyText(task.submission.messengerTemplate, '교내 메신저 안내 문구를 복사했습니다.');
    }
    return;
  }

  if (target.id === 'drawer-nudge-inapp' && state.drawer) {
    const task = state.tasks.find((t) => t.id === state.drawer.taskId);
    if (task && task.submission) {
      task.submission.nudged = true;
      renderDrawer();
      showToast('미제출 학년 화면에 앱 내 알림을 표시했습니다. (시연)');
    }
    return;
  }

  if (target.id === 'drawer-copy-path' && state.drawer) {
    const task = state.tasks.find((t) => t.id === state.drawer.taskId);
    if (task) copyText(task.folderPath, '교내 공유폴더 경로를 복사했습니다.');
    return;
  }

  const demoSubBtn = target.closest('[data-demo-toggle-sub]');
  if (demoSubBtn && state.demoMode) {
    const [taskId, dutyId] = demoSubBtn.dataset.demoToggleSub.split(':');
    const task = state.tasks.find((t) => t.id === taskId);
    if (task && task.submission) {
      const arr = task.submission.submittedDutyIds;
      const idx = arr.indexOf(dutyId);
      if (idx >= 0) arr.splice(idx, 1);
      else arr.push(dutyId);
      renderAll();
    }
    return;
  }

  const goHandoverFromDrawer = target.closest('[data-drawer-go-handover]');
  if (goHandoverFromDrawer) {
    state.drawer = null;
    state.selectedHandoverId = goHandoverFromDrawer.dataset.drawerGoHandover;
    switchTab('handover');
    return;
  }

  const askChatFromDrawer = target.closest('[data-drawer-ask-chat]');
  if (askChatFromDrawer) {
    const qTitle = askChatFromDrawer.dataset.drawerAskChat;
    state.drawer = null;
    switchTab('chat');
    sendChatQuestion(`${qTitle} 관련 원문 근거와 공유폴더 위치 알려줘`);
    return;
  }

  // Upload view interactions
  const uploadModeBtn = target.closest('[data-upload-mode]');
  if (uploadModeBtn) {
    state.upload.mode = uploadModeBtn.dataset.uploadMode;
    renderUploadView();
    return;
  }

  const presetBtn = target.closest('[data-load-preset]');
  if (presetBtn) {
    const preset = UPLOAD_NOTICE_PRESETS.find((p) => p.id === presetBtn.dataset.loadPreset);
    if (preset) {
      state.upload.selectedPresetId = preset.id;
      state.upload.docTitle = preset.docTitle;
      state.upload.rawText = preset.rawText;
      state.upload.blockedMessage = '';
      state.upload.candidates = preset.drafts.map((d, idx) => ({ id: `cand-${Date.now()}-${idx}`, ...d }));
      state.upload.lastAddedSummary = null;
      renderUploadView();
    }
    return;
  }

  if (target.closest('#load-blocked-roster-btn')) {
    state.upload.selectedPresetId = '';
    state.upload.docTitle = '차단 시험 · 학생 명단 CSV 예시';
    state.upload.rawText = BLOCKED_ROSTER_DEMO_CSV;
    state.upload.blockedMessage = detectUploadBlockReason(BLOCKED_ROSTER_DEMO_CSV);
    state.upload.candidates = [];
    state.upload.lastAddedSummary = null;
    renderUploadView();
    showToast('개인정보·명단 파일이 감지되어 추출을 차단했습니다.');
    return;
  }

  if (target.closest('#run-extract-btn')) {
    const raw = state.upload.rawText;
    const blockReason = detectUploadBlockReason(raw);
    if (blockReason) {
      state.upload.blockedMessage = blockReason;
      state.upload.candidates = [];
      renderUploadView();
      showToast('개인정보·명단 포함 자료는 추출할 수 없습니다.');
      return;
    }
    state.upload.blockedMessage = '';
    state.upload.candidates = extractCandidatesFromText(raw, state.upload.docTitle);
    state.upload.selectedPresetId = '';
    renderUploadView();
    showToast(`규칙 추출로 업무 후보 ${state.upload.candidates.length}건을 불러왔습니다.`);
    return;
  }

  const commitCandBtn = target.closest('[data-commit-cand]');
  if (commitCandBtn) {
    const blockReason = detectUploadBlockReason(state.upload.rawText);
    if (blockReason) {
      state.upload.blockedMessage = blockReason;
      renderUploadView();
      showToast('차단된 자료는 업무 지도에 반영할 수 없습니다.');
      return;
    }
    const idx = Number(commitCandBtn.dataset.commitCand);
    const status = commitCandBtn.dataset.commitStatus || 'draft';
    const cand = state.upload.candidates[idx];
    if (cand) {
      if (detectUploadBlockReason(`${cand.title}\n${cand.folderPath}`)) {
        state.upload.blockedMessage = '입력란에 개인정보 패턴이 포함되어 반영을 차단했습니다.';
        renderUploadView();
        return;
      }
      const month = Number(cand.dueDate.slice(5, 7)) || SCHOOL_INFO.defaultMonth;
      const newTaskId = `t-up-${Date.now()}-${idx}`;
      const checklistItems = String(cand.checklistText || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
        .map((txt, cIdx) => ({ id: `${newTaskId}-c${cIdx}`, text: txt, done: false }));

      const newTask = {
        id: newTaskId,
        month,
        weekLabel: getWeekLabelFromDate(cand.dueDate),
        dueDate: cand.dueDate,
        dutyId: cand.dutyId,
        category: cand.category,
        typeLabel: getCategoryLabel(cand.category),
        status,
        done: false,
        title: cand.title.trim() || '신규 추출 업무',
        note: '자료 올리기 화면에서 원문 대조 후 추가된 업무입니다.',
        folderPath: cand.folderPath,
        sourceTitle: state.upload.docTitle || '사용자 업로드 문서(예시)',
        sourceExcerpt: cand.highlightQuote,
        checklist: checklistItems,
        submission: cand.category === 'collect'
          ? {
              targetDutyIds: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'],
              submittedDutyIds: [],
              nudged: false,
              messengerTemplate: `안녕하세요, ${SCHOOL_INFO.shortName} ${getDutyName(cand.dutyId)}입니다. [${cand.title}] 제출 마감(${formatDateCompact(cand.dueDate)}) 안내드립니다.`,
            }
          : null,
      };
      state.tasks.push(newTask);
      state.uploadHistory.unshift({
        id: `uh-${Date.now()}`,
        reflectedAt: DEMO_TODAY,
        docType: '공문 본문',
        docTitle: state.upload.docTitle || '직접 입력 문서',
        extractedCount: 1,
        status: status === 'confirmed' ? '확정 1건' : 'AI 초안 1건',
      });
      state.upload.lastAddedSummary = {
        label: `"${newTask.title}" 항목을 ${month}월 업무 지도에 ${status === 'confirmed' ? '확정 반영' : 'AI 초안으로 추가'}했습니다.`,
        month,
        taskId: newTaskId,
      };
      renderAll();
      showToast('업무 지도에 반영했습니다.');
    }
    return;
  }

  if (target.closest('#commit-calendar-rows-btn')) {
    const picked = state.upload.calendarRows.filter((r) => r.selected);
    if (picked.length === 0) {
      showToast('반영할 일정을 하나 이상 선택해 주세요.');
      return;
    }
    let firstMonth = SCHOOL_INFO.defaultMonth;
    let firstId = '';
    picked.forEach((row, idx) => {
      const month = Number(row.dueDate.slice(5, 7)) || 12;
      if (idx === 0) firstMonth = month;
      const newTaskId = `t-cal-${Date.now()}-${idx}`;
      if (idx === 0) firstId = newTaskId;
      state.tasks.push({
        id: newTaskId,
        month,
        weekLabel: getWeekLabelFromDate(row.dueDate),
        dueDate: row.dueDate,
        dutyId: row.dutyId,
        category: row.category,
        typeLabel: getCategoryLabel(row.category),
        status: 'draft',
        done: false,
        title: row.title,
        note: '학사일정표 일괄 등록으로 추가된 AI 초안입니다.',
        folderPath: `교내공유폴더 > 2026 > ${getDutyName(row.dutyId).replace(/\s/g, '')}`,
        sourceTitle: '2026학년도 12월 학사일정표(예시)',
        sourceExcerpt: `${row.dueDate} ${row.title} (${getDutyName(row.dutyId)})`,
        checklist: [],
        submission: null,
      });
    });
    state.uploadHistory.unshift({
      id: `uh-cal-${Date.now()}`,
      reflectedAt: DEMO_TODAY,
      docType: '학사일정표',
      docTitle: '연간 학사일정표 추가 추출본',
      extractedCount: picked.length,
      status: `AI 초안 ${picked.length}건`,
    });
    state.upload.lastAddedSummary = {
      label: `학사일정표에서 ${picked.length}건을 ${firstMonth}월 업무 지도에 AI 초안으로 반영했습니다.`,
      month: firstMonth,
      taskId: firstId,
    };
    renderAll();
    showToast(`일정 ${picked.length}건을 업무 지도에 추가했습니다.`);
    return;
  }

  const jumpMapBtn = target.closest('#jump-to-added-task');
  if (jumpMapBtn) {
    const m = Number(jumpMapBtn.dataset.monthJump) || SCHOOL_INFO.defaultMonth;
    const tid = jumpMapBtn.dataset.taskJump;
    state.selectedMonth = m;
    state.selectedDutyId = null;
    state.myOnly = false;
    state.selectedCategory = 'all';
    switchTab('map');
    if (tid) openTaskDrawer(tid, 'ledger');
    return;
  }

  // Handover view interactions
  const selHoBtn = target.closest('[data-select-handover]');
  if (selHoBtn) {
    state.selectedHandoverId = selHoBtn.dataset.selectHandover;
    renderHandoverView();
    return;
  }

  const jumpMapFromHo = target.closest('[data-filter-duty-map]');
  if (jumpMapFromHo) {
    state.selectedDutyId = jumpMapFromHo.dataset.filterDutyMap;
    state.myOnly = false;
    switchTab('map');
    return;
  }

  if (target.closest('#handover-copy-path')) {
    const card = state.handoverCards.find((c) => c.id === state.selectedHandoverId);
    if (card) copyText(card.folderPath, '공유폴더 경로를 복사했습니다.');
    return;
  }

  if (target.closest('#handover-copy-messenger')) {
    const card = state.handoverCards.find((c) => c.id === state.selectedHandoverId);
    if (card) copyText(card.messengerQuestionTemplate, '교내 메신저 질문 문구를 복사했습니다.');
    return;
  }

  if (target.closest('#handover-copy-magiclink')) {
    const card = state.handoverCards.find((c) => c.id === state.selectedHandoverId);
    if (card) {
      const base = `${window.location.origin}${window.location.pathname}`;
      const demoUrl = `${base}?reply=${encodeURIComponent(card.id)}`;
      copyText(demoUrl, '전보 교원용 1회용 답변 링크를 복사했습니다.');
    }
    return;
  }

  if (target.closest('#handover-open-reply-view')) {
    const card = state.handoverCards.find((c) => c.id === state.selectedHandoverId);
    if (card) {
      state.replyCardId = card.id;
      state.replySavedBanner = false;
      try {
        window.history.replaceState(null, '', `${window.location.pathname}?reply=${encodeURIComponent(card.id)}`);
      } catch {
        // ignore history error
      }
      switchTab('reply');
    }
    return;
  }

  if (target.closest('#reply-go-handover') || target.closest('#reply-view-saved-btn')) {
    state.selectedHandoverId = state.replyCardId;
    switchTab('handover');
    return;
  }

  if (target.closest('#reply-back-map')) {
    switchTab('map');
    return;
  }

  if (target.closest('#handover-download-txt')) {
    const card = state.handoverCards.find((c) => c.id === state.selectedHandoverId);
    if (card) {
      const text = [
        `[TeacherMate 인수인계 노트] ${card.title}`,
        `담당: ${getDutyName(card.dutyId)} | 작성: ${card.ownerLabel} | 기준일: ${card.updatedAt}`,
        `폴더 위치: ${card.folderPath}`,
        '',
        '[연간 주요 시기]',
        ...card.timeline.map((t) => `- ${t.monthLabel}: ${t.text}`),
        '',
        '[전임자 실무 요령]',
        ...card.tips.map((tip) => `- ${tip}`),
      ].join('\n');
      downloadFile(`handover-${card.dutyId}.txt`, text, 'text/plain;charset=utf-8');
      showToast('인수인계 노트를 텍스트(.txt)로 내려받았습니다.');
    }
    return;
  }

  const fillPredBtn = target.closest('[data-fill-predecessor-reply]');
  if (fillPredBtn) {
    const qaId = fillPredBtn.dataset.fillPredecessorReply;
    const card = state.handoverCards.find((c) => c.id === state.selectedHandoverId);
    const qa = card?.qaList.find((q) => q.id === qaId);
    if (qa) {
      qa.answer = '작년 기준 서식은 해당 부서 교내 공유폴더 상단 `_표준서식` 하위 폴더에 저장되어 있습니다.';
      renderHandoverView();
      showToast('시연용 전임자 답변을 채웠습니다.');
    }
    return;
  }

  // Chat view interactions
  const chatSampleBtn = target.closest('[data-chat-sample]');
  if (chatSampleBtn) {
    sendChatQuestion(chatSampleBtn.dataset.chatSample);
    return;
  }

  const jumpHoFromChat = target.closest('[data-jump-handover]');
  if (jumpHoFromChat) {
    state.selectedHandoverId = jumpHoFromChat.dataset.jumpHandover;
    switchTab('handover');
    return;
  }

  if (target.closest('#chat-clear-btn')) {
    state.chatMessages = buildInitialChatMessages();
    state.chatInputValue = '';
    renderChatView();
    showToast('질문 대화를 초기화했습니다.');
    return;
  }

  const copyEscBtn = target.closest('#chat-copy-escalation');
  if (copyEscBtn) {
    copyText(copyEscBtn.dataset.copyMsg || '', '문의 메신저 문구를 복사했습니다.');
    return;
  }

  if (target.closest('#chat-go-handover-qa')) {
    const card = state.handoverCards.find((c) => c.dutyId === state.chatSelectedEscalationDutyId);
    if (card) state.selectedHandoverId = card.id;
    switchTab('handover');
    return;
  }

  // Settings view interactions
  if (target.closest('#settings-download-json')) {
    const backup = {
      exportedAt: DEMO_TODAY,
      school: SCHOOL_INFO.name,
      tasks: state.tasks,
      handoverCards: state.handoverCards,
      uploadHistory: state.uploadHistory,
    };
    downloadFile('yeshicho-teachermate-backup.json', JSON.stringify(backup, null, 2), 'application/json;charset=utf-8');
    showToast('시연 데이터 백업(JSON)을 내려받았습니다.');
    return;
  }

  if (state.rolePopoverOpen && !target.closest('.role-picker-anchor')) {
    state.rolePopoverOpen = false;
    renderRolePopover();
  }
});

document.addEventListener('change', (event) => {
  const target = event.target;

  if (target.matches('[data-toggle-check-item]') && state.drawer) {
    const task = state.tasks.find((t) => t.id === state.drawer.taskId);
    const item = task?.checklist.find((c) => c.id === target.dataset.toggleCheckItem);
    if (item) {
      item.done = target.checked;
      renderAll();
    }
    return;
  }

  if (target.id === 'ics-my-only') {
    state.icsMyOnly = target.checked;
    return;
  }

  if (target.matches('[data-cand-field]')) {
    const idx = Number(target.dataset.candIdx);
    const field = target.dataset.candField;
    const cand = state.upload.candidates[idx];
    if (cand && field) {
      cand[field] = target.value;
      if (field === 'category' || field === 'dueDate') renderUploadView();
    }
    return;
  }

  if (target.matches('[data-cal-row-toggle]')) {
    const idx = Number(target.dataset.calRowToggle);
    if (state.upload.calendarRows[idx]) {
      state.upload.calendarRows[idx].selected = target.checked;
      renderUploadView();
    }
    return;
  }

  if (target.id === 'upload-text-file' && target.files && target.files[0]) {
    const file = target.files[0];
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result || '').slice(0, 12000);
      state.upload.docTitle = file.name.replace(/\.[^.]+$/, '');
      state.upload.rawText = text;
      state.upload.selectedPresetId = '';
      state.upload.lastAddedSummary = null;
      const blockReason = detectUploadBlockReason(text);
      if (blockReason) {
        state.upload.blockedMessage = blockReason;
        state.upload.candidates = [];
        renderUploadView();
        showToast(`${file.name}: 개인정보·명단 파일이 감지되어 차단했습니다.`);
        return;
      }
      state.upload.blockedMessage = '';
      state.upload.candidates = extractCandidatesFromText(text, state.upload.docTitle);
      renderUploadView();
      showToast(`${file.name} 내용을 불러와 규칙 기반으로 후보를 추출했습니다.`);
    };
    reader.readAsText(file, 'utf-8');
    return;
  }

  if (target.id === 'handover-duty-filter') {
    state.handoverDutyFilter = target.value;
    renderHandoverView();
    return;
  }

  if (target.id === 'chat-escalation-duty') {
    state.chatSelectedEscalationDutyId = target.value;
    renderChatView();
    return;
  }

  if (target.matches('[data-settings-duty]')) {
    const dutyId = target.dataset.settingsDuty;
    if (target.checked) state.myDutyIds.add(dutyId);
    else state.myDutyIds.delete(dutyId);
    renderSettingsView();
    return;
  }

  if (target.id === 'settings-demo-mode') {
    state.demoMode = target.checked;
    renderSettingsView();
    showToast(state.demoMode ? '발표용 시연 보조 도구를 켰습니다.' : '일반 교사 화면 모드로 전환했습니다.');
  }
});

document.addEventListener('input', (event) => {
  const target = event.target;
  if (target.id === 'search-input') {
    state.searchQuery = target.value;
    renderTaskLedger();
    return;
  }
  if (target.id === 'upload-doc-title') {
    state.upload.docTitle = target.value;
    return;
  }
  if (target.id === 'upload-raw-text') {
    state.upload.rawText = target.value;
    return;
  }
  if (target.id === 'handover-search-input') {
    state.handoverSearch = target.value;
    renderHandoverView();
    const el = document.getElementById('handover-search-input');
    if (el) {
      el.focus();
      el.setSelectionRange(el.value.length, el.value.length);
    }
    return;
  }
  if (target.id === 'chat-input') {
    state.chatInputValue = target.value;
    const countEl = document.getElementById('chat-char-count');
    if (countEl) countEl.textContent = `${state.chatInputValue.length} / 300자`;
  }
});

document.addEventListener('submit', (event) => {
  const form = event.target;
  if (form.id === 'handover-qa-form') {
    event.preventDefault();
    const input = document.getElementById('handover-qa-input');
    const q = input ? input.value.trim() : '';
    if (!q) return;
    if (detectPiiInQuery(q)) {
      showToast('개인정보 패턴이 포함되어 질문을 등록할 수 없습니다.');
      return;
    }
    const card = state.handoverCards.find((c) => c.id === state.selectedHandoverId);
    if (card) {
      card.qaList.push({
        id: `qa-${Date.now()}`,
        author: '현임 담당 교사',
        question: q,
        answer: state.demoMode ? '공유폴더 내 최신 기준 문서를 참고하시거나 메신저로 바로 연락 주세요.' : '',
        createdAt: DEMO_TODAY,
        byPredecessor: state.demoMode,
      });
      renderHandoverView();
      showToast('전임자에게 질문을 남겼습니다.');
    }
    return;
  }

  if (form.id === 'chat-form') {
    event.preventDefault();
    const input = document.getElementById('chat-input');
    sendChatQuestion(input ? input.value : state.chatInputValue);
    return;
  }

  if (form.id === 'reply-form') {
    event.preventDefault();
    const area = document.getElementById('reply-answer-text');
    const ans = area ? area.value.trim() : '';
    if (!ans) {
      showToast('답변 내용을 입력해 주세요.');
      return;
    }
    if (detectPiiInQuery(ans)) {
      showToast('개인정보 패턴이 포함되어 답변을 저장할 수 없습니다.');
      return;
    }
    const card = state.handoverCards.find((c) => c.id === state.replyCardId) || state.handoverCards[0];
    const pendingQa = card.qaList.find((q) => !q.answer);
    if (pendingQa) {
      pendingQa.answer = ans;
      pendingQa.byPredecessor = true;
    } else {
      card.qaList.push({
        id: `qa-reply-${Date.now()}`,
        author: '전보 전임자 (1회용 링크 회신)',
        question: card.messengerQuestionTemplate,
        answer: ans,
        createdAt: DEMO_TODAY,
        byPredecessor: true,
      });
    }
    state.replySavedBanner = true;
    renderReplyView();
    showToast('1회용 답변이 인수인계 Q&A에 저장되었습니다.');
  }
});

document.addEventListener('keydown', (event) => {
  if (event.key !== 'Escape') return;
  if (state.drawer) {
    closeTaskDrawer();
    return;
  }
  if (state.rolePopoverOpen) {
    state.rolePopoverOpen = false;
    renderRolePopover();
  }
});

renderAll();
