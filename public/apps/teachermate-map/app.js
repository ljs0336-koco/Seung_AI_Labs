import {
  DEMO_TODAY,
  DUTIES,
  INITIAL_TASKS,
  MONTH_EVENTS,
  MONTHS,
  SCHOOL_INFO,
  SCOPE_GUIDE_COPY,
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

const state = {
  tasks: cloneInitialTasks(),
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
  scopeModalKey: null,
  icsMyOnly: false,
};

let savedScrollY = 0;
let lastDrawerTrigger = null; // { taskId, fromSource }
let toastTimer = null;

const dutyMap = new Map(DUTIES.map((d) => [d.id, d]));

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

function getFilteredTasks() {
  const query = state.searchQuery.trim().toLowerCase();
  return state.tasks.filter((task) => {
    if (task.month !== state.selectedMonth) return false;
    if (state.selectedDutyId && task.dutyId !== state.selectedDutyId) return false;
    if (state.myOnly && !state.myDutyIds.has(task.dutyId)) return false;
    if (state.selectedCategory !== 'all' && task.category !== state.selectedCategory) return false;
    if (query) {
      const hay = `${task.title} ${task.note} ${getDutyName(task.dutyId)}`.toLowerCase();
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
    const classes = ['month-btn'];
    if (isSelected) classes.push('is-selected');
    if (isCurrent) classes.push('is-current');
    return `<button type="button" class="${classes.join(' ')}" data-month="${m.num}" aria-pressed="${isSelected}">${escapeHtml(m.label)}</button>`;
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
    const labelMap = { draft: '기안', collect: '수합', task: '상시' };
    activeBits.push(`구분 <strong>${labelMap[state.selectedCategory]}</strong>`);
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

function renderTaskStatusTag(task) {
  if (task.done) return '<span class="tag-done">완료</span>';
  if (task.status === 'draft') return '<span class="tag-draft">AI 초안</span>';
  return '<span class="text-confirmed">확정</span>';
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
  const openCount = tasks.filter((t) => !t.done).length;
  const draftCount = tasks.filter((t) => t.status === 'draft').length;

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
        <button type="button" class="btn btn-outline btn-sm" id="empty-pick-role-btn">담당 업무 선택</button>
      </div>
    `;
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
      <th colspan="6" scope="colgroup">${escapeHtml(weekLabel)}</th>
    </tr>
    ${items.map((task) => {
    const overdue = isTaskOverdue(task);
    const dday = formatDday(task.dueDate);
    const ddayClass = overdue ? 'text-overdue' : (dday.tone === 'is-soon' ? 'text-soon' : '');
    const dateMarkup = task.done
      ? `<span class="date-main">${escapeHtml(formatDateCompact(task.dueDate))}</span>`
      : `<span class="date-main">${escapeHtml(formatDateCompact(task.dueDate))}</span><span class="dday-inline ${ddayClass}">(${escapeHtml(dday.text)})</span>`;

    return `
        <tr class="task-tr ${overdue ? 'is-overdue' : ''} ${task.done ? 'is-done' : ''}">
          <td class="cell-num">${dateMarkup}</td>
          <td>
            <button
              type="button"
              class="task-title-btn"
              data-open-task="${escapeHtml(task.id)}"
              data-open-source="ledger"
            >${escapeHtml(task.title)}</button>
          </td>
          <td>${escapeHtml(getDutyName(task.dutyId))}</td>
          <td><span class="type-label">${escapeHtml(task.typeLabel)}</span></td>
          <td>${renderTaskStatusTag(task)}</td>
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
    const ddayClass = overdue ? 'text-overdue' : (dday.tone === 'is-soon' ? 'text-soon' : '');
    const sub = task.submission;
    const progressInline = sub
      ? `<span class="${overdue && sub.targetDutyIds.length > sub.submittedDutyIds.length ? 'text-overdue' : ''}">${sub.submittedDutyIds.length}/${sub.targetDutyIds.length} 제출</span>`
      : (task.checklist.length > 0
        ? `<span>점검 ${task.checklist.filter((c) => c.done).length}/${task.checklist.length}</span>`
        : '');

    return `
          <li class="mobile-task-row ${overdue ? 'is-overdue' : ''} ${task.done ? 'is-done' : ''}">
            <button
              type="button"
              class="task-title-btn"
              data-open-task="${escapeHtml(task.id)}"
              data-open-source="ledger"
            >${escapeHtml(task.title)}</button>
            <div class="mobile-task-meta">
              <span class="${ddayClass}">${escapeHtml(formatDateCompact(task.dueDate))}${task.done ? '' : ` (${escapeHtml(dday.text)})`}</span>
              <span>${escapeHtml(getDutyName(task.dutyId))}</span>
              <span>${escapeHtml(task.typeLabel)}</span>
              ${renderTaskStatusTag(task)}
              ${progressInline}
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
          <col class="col-date">
          <col>
          <col class="col-owner">
          <col class="col-type">
          <col class="col-status">
          <col class="col-progress">
        </colgroup>
        <thead>
          <tr>
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
            <span class="collection-owner ${overdue ? 'text-overdue' : ''}">${escapeHtml(dday.text)} · ${escapeHtml(getDutyName(task.dutyId))}</span>
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
                  <span class="upcoming-dday text-soon">${escapeHtml(dday.text)}</span>
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
                  <span class="upcoming-dday text-soon">${escapeHtml(dday.text)}</span>
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
                    <span class="upcoming-dday text-overdue">${escapeHtml(dday.text)}</span>
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

  const hasDraftPrimary = task.status === 'draft' && !task.done;
  const hasSubPrimary = !hasDraftPrimary && Boolean(sub);
  const footBtnClass = (!hasDraftPrimary && !hasSubPrimary) ? 'btn btn-primary btn-sm' : 'btn btn-outline btn-sm';

  backdrop.hidden = false;
  drawerEl.hidden = false;

  contentEl.innerHTML = `
    <div class="drawer-head">
      <div class="drawer-head-tags">
        <span class="type-label">${escapeHtml(task.typeLabel)}</span>
        ${renderTaskStatusTag(task)}
        <span class="meta-label ${overdue ? 'text-overdue' : ''}">${escapeHtml(dday.text)}</span>
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
            <dd class="${overdue ? 'text-overdue' : ''}">${escapeHtml(task.dueDate)} (${escapeHtml(dday.text)})</dd>
          </div>
        </dl>
        <button type="button" class="btn btn-outline btn-sm" data-toggle-task-done="${escapeHtml(task.id)}">
          ${task.done ? '미완료로 변경' : '완료 처리'}
        </button>
      </div>

      ${task.status === 'draft' ? `
        <section class="drawer-draft-notice">
          <h3 class="drawer-section-title">AI 초안 검토 대기</h3>
          <p class="drawer-section-note">학사안내 문서에서 추출한 초안입니다. 아래 원문 근거와 마감일을 확인한 뒤 확정해 주세요.</p>
          <div>
            <button type="button" class="${hasDraftPrimary ? 'btn btn-primary btn-sm' : 'btn btn-outline btn-sm'}" id="drawer-confirm-draft">내용 확인 후 확정</button>
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
    const cls = submitted
      ? 'is-submitted'
      : `is-missing${overdue ? ' is-overdue' : ''}`;
    return `<span class="grade-tag ${cls} ${isMine ? 'is-mine' : ''}">${escapeHtml(shortName)} ${submitted ? '제출' : '미제출'}</span>`;
  }).join('')}
          </div>
          <div class="drawer-actions-row">
            <button type="button" class="${hasSubPrimary ? 'btn btn-primary btn-sm' : 'btn btn-outline btn-sm'}" id="drawer-copy-messenger">교내 메신저 안내 문구 복사</button>
            <button type="button" class="btn btn-outline btn-sm" id="drawer-nudge-inapp">${sub.nudged ? '앱 알림 기록됨' : '앱 내 알림 표시'}</button>
          </div>
          <p class="drawer-caption">앱 내 알림은 접속 시 화면에 표시되며, 즉시 전달은 메신저 문구 복사를 권장합니다.</p>
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
        <h3 class="drawer-section-title">교내 공유폴더 위치</h3>
        <div class="path-box">
          <span class="path-code">${escapeHtml(task.folderPath)}</span>
          <button type="button" class="btn btn-outline btn-sm" id="drawer-copy-path">경로 복사</button>
        </div>
      </section>
    </div>

    <div class="drawer-foot">
      <button type="button" class="${footBtnClass}" id="drawer-close-foot">
        ${activeFilterLabel ? `닫고 ${escapeHtml(activeFilterLabel)} 목록으로 돌아가기` : '목록으로 돌아가기'}
      </button>
    </div>
  `;
}

function renderScopeModal() {
  const backdrop = document.getElementById('scope-modal-backdrop');
  const titleEl = document.getElementById('scope-modal-title');
  const bodyEl = document.getElementById('scope-modal-body');

  if (!state.scopeModalKey || !SCOPE_GUIDE_COPY[state.scopeModalKey]) {
    backdrop.hidden = true;
    return;
  }

  const info = SCOPE_GUIDE_COPY[state.scopeModalKey];
  titleEl.textContent = info.title;
  bodyEl.innerHTML = info.paragraphs.map((p) => `<p>${escapeHtml(p)}</p>`).join('');
  backdrop.hidden = false;
}

function renderAll() {
  renderMonthStrip();
  renderRolePopover();
  renderTaskLedger();
  renderRightRailAndMobileCollections();
  renderDrawer();
  renderScopeModal();
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
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'yeshicho-demo-schedule.ics';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  showToast(`확정 일정 ${targets.length}건을 .ics 파일로 내보냈습니다.`);
}

function resetDemoState() {
  state.tasks = cloneInitialTasks();
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
  state.scopeModalKey = null;
  state.icsMyOnly = false;
  lastDrawerTrigger = null;
  document.getElementById('search-input').value = '';
  renderAll();
  showToast('초기 시연 상태로 되돌렸습니다.');
}

// Event Delegation
document.addEventListener('click', (event) => {
  const target = event.target;

  const scopeTrigger = target.closest('[data-scope-trigger]');
  if (scopeTrigger) {
    state.scopeModalKey = scopeTrigger.dataset.scopeTrigger;
    state.rolePopoverOpen = false;
    renderScopeModal();
    return;
  }

  if (target.id === 'scope-modal-close' || target.id === 'scope-modal-return' || target.id === 'scope-modal-backdrop') {
    state.scopeModalKey = null;
    renderScopeModal();
    return;
  }

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

  if (target.closest('#reset-demo-btn')) {
    resetDemoState();
    return;
  }

  if (target.closest('#summary-reset-btn') || target.closest('#empty-reset-btn')) {
    state.selectedDutyId = null;
    state.myOnly = false;
    state.selectedCategory = 'all';
    state.searchQuery = '';
    document.getElementById('search-input').value = '';
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

  const toggleDoneBtn = target.closest('[data-toggle-task-done]');
  if (toggleDoneBtn) {
    const task = state.tasks.find((t) => t.id === toggleDoneBtn.dataset.toggleTaskDone);
    if (task) {
      task.done = !task.done;
      renderAll();
    }
    return;
  }

  const openBtn = target.closest('[data-open-task]');
  if (openBtn) {
    openTaskDrawer(openBtn.dataset.openTask, openBtn.dataset.openSource);
    return;
  }

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
    document.getElementById('search-input').value = '';
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
    if (task) {
      copyText(task.folderPath, '교내 공유폴더 경로를 복사했습니다.');
    }
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
  }
});

document.getElementById('search-input').addEventListener('input', (event) => {
  state.searchQuery = event.target.value;
  renderTaskLedger();
});

document.addEventListener('keydown', (event) => {
  if (event.key !== 'Escape') return;
  if (state.scopeModalKey) {
    state.scopeModalKey = null;
    renderScopeModal();
    return;
  }
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
