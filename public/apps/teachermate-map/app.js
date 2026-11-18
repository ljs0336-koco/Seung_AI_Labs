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
  mobileCollectionsExpanded: true,
  rolePopoverOpen: false,
  drawer: null, // { taskId, fromCollectionPanel }
  scopeModalKey: null,
  icsMyOnly: false,
};

let savedScrollY = 0;
let lastTriggerEl = null;
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
    showToast('복사 권한이 제한되어 화면의 문구를 직접 선택해 주세요.');
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
  if (state.myOnly) return '내 담당만';
  return '';
}

function getCollectionTasks() {
  return state.tasks.filter((task) => Boolean(task.submission));
}

function renderMonthStrip() {
  const container = document.getElementById('month-strip');
  const html = MONTHS.map((m) => {
    const monthTasks = state.tasks.filter((t) => {
      if (t.month !== m.num) return false;
      if (state.selectedDutyId) return t.dutyId === state.selectedDutyId;
      if (state.myOnly) return state.myDutyIds.has(t.dutyId);
      return true;
    });
    const openCount = monthTasks.filter((t) => !t.done).length;
    const isSelected = m.num === state.selectedMonth;
    const isCurrent = m.num === SCHOOL_INFO.defaultMonth;
    const classes = ['month-btn'];
    if (isSelected) classes.push('is-selected');
    if (isCurrent) classes.push('is-current');
    return `
      <button type="button" class="${classes.join(' ')}" data-month="${m.num}" aria-pressed="${isSelected}">
        <span>${escapeHtml(m.label)}</span>
        <span class="month-count">${openCount}건</span>
      </button>
    `;
  }).join('');
  container.innerHTML = html;
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

  document.querySelectorAll('.cat-pill').forEach((btn) => {
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
          <button type="button" class="role-option-btn" data-select-duty="">전체 업무 보기</button>
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
                    title="${starred ? '내 담당 해제' : '내 담당으로 지정'}"
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
  if (state.selectedDutyId) activeBits.push(`담당: <strong>${escapeHtml(getDutyName(state.selectedDutyId))}</strong>`);
  if (state.myOnly) activeBits.push('<strong>내 담당만</strong>');
  if (state.selectedCategory !== 'all') {
    const labelMap = { draft: '기안', collect: '수합', task: '상시' };
    activeBits.push(`분류: <strong>${labelMap[state.selectedCategory]}</strong>`);
  }
  if (state.searchQuery.trim()) activeBits.push(`검색: "${escapeHtml(state.searchQuery.trim())}"`);

  if (activeBits.length === 0) {
    el.hidden = true;
    el.innerHTML = '';
    return;
  }

  el.hidden = false;
  el.innerHTML = `
    <span>적용된 조건: ${activeBits.join(' · ')} (${filteredCount}건)</span>
    <button type="button" class="btn btn-text btn-xs" id="summary-reset-btn">전체 보기</button>
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
        <li class="event-chip">
          <span class="event-date">${escapeHtml(formatDateCompact(ev.date))}</span>
          <span>${escapeHtml(ev.title)}</span>
        </li>
      `).join('')}
    </ul>
  `;
}

function renderTaskLedger() {
  const titleEl = document.getElementById('ledger-title');
  const subtitleEl = document.getElementById('ledger-subtitle');
  const ledgerEl = document.getElementById('task-ledger');

  const monthObj = MONTHS.find((m) => m.num === state.selectedMonth);
  const monthLabel = monthObj ? monthObj.label : `${state.selectedMonth}월`;
  const scopeLabel = state.selectedDutyId
    ? getDutyName(state.selectedDutyId)
    : (state.myOnly ? '내 담당' : '전체');

  const tasks = getFilteredTasks();
  const openCount = tasks.filter((t) => !t.done).length;
  const draftCount = tasks.filter((t) => t.status === 'draft').length;

  titleEl.textContent = `${monthLabel} ${scopeLabel} 업무 (${tasks.length}건)`;
  subtitleEl.textContent = draftCount > 0
    ? `남은 할 일 ${openCount}건 · 확인을 기다리는 AI 초안 ${draftCount}건`
    : `남은 할 일 ${openCount}건 · 확정된 업무 중심으로 표시합니다.`;

  renderActiveFilterSummary(tasks.length);
  renderEventsSection();

  if (state.myOnly && state.myDutyIds.size === 0) {
    ledgerEl.innerHTML = `
      <div class="empty-card">
        <h2>아직 내 담당 업무가 지정되지 않았습니다</h2>
        <p>담당 메뉴에서 올해 맡으신 학년이나 부서를 별표(☆)로 지정하면 한눈에 모아볼 수 있습니다.</p>
        <button type="button" class="btn btn-primary btn-sm" id="empty-pick-role-btn">내 학년·업무 고르기</button>
      </div>
    `;
    return;
  }

  if (tasks.length === 0) {
    ledgerEl.innerHTML = `
      <div class="empty-card">
        <h2>조건에 맞는 업무가 없습니다</h2>
        <p>${escapeHtml(monthLabel)}에는 선택한 조건의 등록된 업무가 없습니다. 월을 바꾸거나 필터를 해제해 보세요.</p>
        <button type="button" class="btn btn-subtle btn-sm" id="empty-reset-btn">전체 업무 보기</button>
      </div>
    `;
    return;
  }

  const weekMap = new Map();
  for (const task of tasks) {
    if (!weekMap.has(task.weekLabel)) weekMap.set(task.weekLabel, []);
    weekMap.get(task.weekLabel).push(task);
  }

  ledgerEl.innerHTML = Array.from(weekMap.entries()).map(([weekLabel, items]) => `
    <section class="week-group">
      <h2 class="week-heading">${escapeHtml(weekLabel)}</h2>
      <ul class="ledger-list">
        ${items.map((task) => {
          const dday = formatDday(task.dueDate);
          const doneChecks = task.checklist.filter((c) => c.done).length;
          const totalChecks = task.checklist.length;
          const sub = task.submission;
          const missingCount = sub ? sub.targetDutyIds.length - sub.submittedDutyIds.length : 0;
          const statusBadge = task.status === 'draft'
            ? '<span class="status-pill is-draft">AI 초안</span>'
            : '<span class="status-pill is-confirmed">확정됨</span>';

          return `
            <li class="task-row ${task.done ? 'is-done' : ''}">
              <input
                type="checkbox"
                class="task-check"
                data-toggle-done="${escapeHtml(task.id)}"
                ${task.done ? 'checked' : ''}
                aria-label="${escapeHtml(task.title)} 완료 표시"
              >
              <div class="task-main">
                <div class="task-top-line">
                  <button
                    type="button"
                    class="task-title-btn"
                    data-open-task="${escapeHtml(task.id)}"
                    data-open-source="ledger"
                  >${escapeHtml(task.title)}</button>
                  <div class="task-right-meta">
                    ${statusBadge}
                    <span class="dday-text ${dday.tone}">${escapeHtml(dday.text)}</span>
                  </div>
                </div>
                <div class="task-sub-line">
                  <span class="type-tag">${escapeHtml(task.typeLabel)}</span>
                  <span class="owner-tag">${escapeHtml(getDutyName(task.dutyId))}</span>
                  <span>마감 ${escapeHtml(formatDateCompact(task.dueDate))}</span>
                  ${totalChecks > 0 ? `<span>체크 ${doneChecks}/${totalChecks}</span>` : ''}
                  ${sub ? `<span class="sub-progress-inline ${missingCount === 0 ? 'is-complete' : ''}">수합 ${sub.submittedDutyIds.length}/${sub.targetDutyIds.length} 완료</span>` : ''}
                </div>
              </div>
            </li>
          `;
        }).join('')}
      </ul>
    </section>
  `).join('');
}

function renderCollectionItemsMarkup(collections) {
  return collections.map((task) => {
    const sub = task.submission;
    const missingNames = sub.targetDutyIds
      .filter((id) => !sub.submittedDutyIds.includes(id))
      .map((id) => getDutyName(id).replace(' 담임', ''));
    const dday = formatDday(task.dueDate);
    const isComplete = missingNames.length === 0;
    return `
      <li>
        <button
          type="button"
          class="collection-item-btn"
          data-open-task="${escapeHtml(task.id)}"
          data-open-source="collection-panel"
        >
          <span class="collection-item-top">
            <span class="status-pill ${isComplete ? 'is-confirmed' : 'is-urgent'}">${sub.submittedDutyIds.length}/${sub.targetDutyIds.length} 완료</span>
            <span class="dday-text ${dday.tone}">${escapeHtml(dday.text)} · ${escapeHtml(getDutyName(task.dutyId))}</span>
          </span>
          <span class="collection-item-title">${escapeHtml(task.title)}</span>
          <span class="collection-item-meta">${isComplete ? '모든 대상 제출 완료' : `미제출: ${escapeHtml(missingNames.join(', '))}`}</span>
        </button>
      </li>
    `;
  }).join('');
}

function renderRightRailAndMobileCollections() {
  const collections = getCollectionTasks();

  // Desktop right rail collections
  const desktopList = document.getElementById('desktop-collections-list');
  desktopList.innerHTML = renderCollectionItemsMarkup(collections);

  // Mobile quick-access collections strip (above ledger on <960px)
  const mobileBox = document.getElementById('mobile-collections-box');
  const activeRoleNote = state.selectedDutyId
    ? `(${escapeHtml(getDutyName(state.selectedDutyId))} 필터 유지됨)`
    : '(누르면 상세가 열립니다)';

  mobileBox.innerHTML = `
    <div class="mobile-collections-head">
      <button type="button" class="mobile-collections-toggle" id="mobile-collections-toggle" aria-expanded="${state.mobileCollectionsExpanded}">
        <div>
          <strong class="rail-title">학교 전체 수합 현황 (${collections.length}건)</strong>
          <div class="rail-note">전체 기준 ${activeRoleNote}</div>
        </div>
        <span class="scope-tag">${state.mobileCollectionsExpanded ? '접기' : '펼치기'}</span>
      </button>
    </div>
    ${state.mobileCollectionsExpanded ? `<ul class="collection-list mobile-collections-list">${renderCollectionItemsMarkup(collections)}</ul>` : ''}
  `;

  // Upcoming deadlines
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
        <h3 class="upcoming-group-title">오늘 · 내일 마감</h3>
        <ul class="upcoming-list">
          ${soonItems.map((t) => {
            const dday = formatDday(t.dueDate);
            return `
              <li>
                <button type="button" class="upcoming-btn" data-open-task="${escapeHtml(t.id)}" data-open-source="upcoming">
                  <span class="dday-text ${dday.tone}">${escapeHtml(dday.text)}</span>
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
        <h3 class="upcoming-group-title">이번 주 안 (D-7)</h3>
        <ul class="upcoming-list">
          ${weekItems.map((t) => {
            const dday = formatDday(t.dueDate);
            return `
              <li>
                <button type="button" class="upcoming-btn" data-open-task="${escapeHtml(t.id)}" data-open-source="upcoming">
                  <span class="dday-text ${dday.tone}">${escapeHtml(dday.text)}</span>
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
          지난 미완료 ${overdueItems.length}건 ${state.overdueExpanded ? '접기' : '펼쳐보기'}
        </button>
        ${state.overdueExpanded ? `
          <ul class="upcoming-list" style="margin-top:6px;">
            ${overdueItems.map((t) => {
              const dday = formatDday(t.dueDate);
              return `
                <li>
                  <button type="button" class="upcoming-btn" data-open-task="${escapeHtml(t.id)}" data-open-source="upcoming">
                    <span class="dday-text ${dday.tone}">${escapeHtml(dday.text)}</span>
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

  upcomingEl.innerHTML = parts.join('') || '<p class="rail-note">다가오는 마감 업무가 없습니다.</p>';
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
  const ownerName = getDutyName(task.dutyId);
  const sub = task.submission;
  const subPct = sub ? Math.round((sub.submittedDutyIds.length / sub.targetDutyIds.length) * 100) : 0;

  backdrop.hidden = false;
  drawerEl.hidden = false;

  contentEl.innerHTML = `
    <div class="drawer-head">
      <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
        <span class="type-tag">${escapeHtml(task.typeLabel)}</span>
        <span class="status-pill ${task.status === 'draft' ? 'is-draft' : 'is-confirmed'}">${task.status === 'draft' ? 'AI 초안' : '확정됨'}</span>
        <span class="dday-text ${dday.tone}">${escapeHtml(dday.text)}</span>
      </div>
      <button type="button" class="btn btn-ghost btn-xs" id="drawer-close-top" style="color:var(--ink-secondary);border-color:var(--line-strong);">닫기</button>
    </div>

    ${(state.drawer.fromCollectionPanel || isOutsideActiveFilter) && activeFilterLabel ? `
      <div class="drawer-context-banner" role="status">
        <span>현재 <strong>'${escapeHtml(activeFilterLabel)}'</strong> 필터가 유지되어 있습니다. 창을 닫으면 보던 ${escapeHtml(activeFilterLabel)} 목록으로 돌아갑니다.</span>
        <div>
          <button type="button" class="btn btn-text btn-xs" id="drawer-clear-filter-jump" style="padding:0;color:var(--brand);text-decoration:underline;">필터를 풀고 전체 목록에서 위치 보기</button>
        </div>
      </div>
    ` : ''}

    <div class="drawer-body">
      <h2 id="drawer-title" class="drawer-title">${escapeHtml(task.title)}</h2>

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

      ${task.status === 'draft' ? `
        <section class="drawer-section" style="background:var(--draft-bg);border-color:var(--draft-line);">
          <h3 class="drawer-section-title" style="color:var(--draft-ink);">AI 초안 검토 대기</h3>
          <p style="margin:0;font-size:0.83rem;color:var(--draft-ink);">학사안내 문서에서 추출한 초안입니다. 아래 원문 근거와 날짜가 맞는지 확인한 뒤 확정해 주세요.</p>
          <div>
            <button type="button" class="btn btn-primary btn-sm" id="drawer-confirm-draft">내용 확인 후 확정하기</button>
          </div>
        </section>
      ` : ''}

      ${sub ? `
        <section class="drawer-section">
          <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;">
            <h3 class="drawer-section-title">제출 수합 현황</h3>
            <span style="font-size:0.82rem;font-weight:700;font-variant-numeric:tabular-nums;">${sub.submittedDutyIds.length} / ${sub.targetDutyIds.length} 완료</span>
          </div>
          <div class="progress-track" aria-hidden="true">
            <div class="progress-fill" style="width:${subPct}%"></div>
          </div>
          <div class="grade-chips">
            ${sub.targetDutyIds.map((id) => {
              const submitted = sub.submittedDutyIds.includes(id);
              const isMine = state.selectedDutyId === id || state.myDutyIds.has(id);
              const shortName = getDutyName(id).replace(' 담임', '');
              return `<span class="grade-chip ${submitted ? 'is-submitted' : 'is-missing'} ${isMine ? 'is-mine' : ''}">${escapeHtml(shortName)} ${submitted ? '제출' : '미제출'}</span>`;
            }).join('')}
          </div>
          <div class="drawer-actions-row">
            <button type="button" class="btn btn-primary btn-sm" id="drawer-copy-messenger">교내 메신저 안내 문구 복사</button>
            <button type="button" class="btn btn-outline btn-sm" id="drawer-nudge-inapp">${sub.nudged ? '앱 화면 알림 표시됨' : '앱 화면 알림 남기기'}</button>
          </div>
          <p style="margin:0;font-size:0.75rem;color:var(--ink-muted);">앱 화면 알림은 수신자가 앱에 접속했을 때 보이며, 즉시 전달은 메신저 문구 복사로 보내는 방식이 확실합니다.</p>
        </section>
      ` : ''}

      <section class="drawer-section">
        <h3 class="drawer-section-title">업무 안내 및 원문 근거</h3>
        <p style="margin:0;font-size:0.85rem;color:var(--ink-secondary);">${escapeHtml(task.note)}</p>
        <blockquote class="source-quote">
          <div style="font-weight:700;margin-bottom:3px;">${escapeHtml(task.sourceTitle)}</div>
          <div>${escapeHtml(task.sourceExcerpt)}</div>
        </blockquote>
      </section>

      ${task.checklist.length > 0 ? `
        <section class="drawer-section">
          <h3 class="drawer-section-title">세부 체크리스트</h3>
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
        <h3 class="drawer-section-title">교내 자료 폴더 위치</h3>
        <div class="path-box">
          <span class="path-code">${escapeHtml(task.folderPath)}</span>
          <button type="button" class="btn btn-subtle btn-xs" id="drawer-copy-path">경로 복사</button>
        </div>
      </section>
    </div>

    <div class="drawer-foot">
      <button type="button" class="btn btn-primary btn-sm" id="drawer-close-foot">
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

function openTaskDrawer(taskId, fromSource, triggerEl) {
  savedScrollY = window.scrollY;
  lastTriggerEl = triggerEl || document.activeElement;
  state.rolePopoverOpen = false;
  state.drawer = {
    taskId,
    fromCollectionPanel: fromSource === 'collection-panel',
  };
  renderAll();
  const closeBtn = document.getElementById('drawer-close-top');
  if (closeBtn) closeBtn.focus();
}

function closeTaskDrawer() {
  if (!state.drawer) return;
  state.drawer = null;
  renderAll();
  window.scrollTo(0, savedScrollY);
  if (lastTriggerEl && typeof lastTriggerEl.focus === 'function' && document.contains(lastTriggerEl)) {
    lastTriggerEl.focus();
  }
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
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Saesol-Demo//TeacherMate-Map//KO',
    'CALSCALE:GREGORIAN',
    'X-WR-CALNAME:새솔초 업무 일정 예시',
  ];

  for (const t of tasks) {
    lines.push(
      'BEGIN:VEVENT',
      `UID:${t.id}-saesol-demo`,
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
  a.download = 'saesol-demo-schedule.ics';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  showToast(`확정 일정 ${targets.length}건을 캘린더 파일(.ics)로 내려받았습니다.`);
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
  state.rolePopoverOpen = false;
  state.drawer = null;
  state.scopeModalKey = null;
  state.icsMyOnly = false;
  document.getElementById('search-input').value = '';
  renderAll();
  showToast('처음 시연 상태로 되돌렸습니다.');
}

// Event Delegation
document.addEventListener('click', (event) => {
  const target = event.target;

  // Scope modal buttons
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

  // Month selection
  const monthBtn = target.closest('[data-month]');
  if (monthBtn) {
    state.selectedMonth = Number(monthBtn.dataset.month);
    state.rolePopoverOpen = false;
    renderAll();
    return;
  }

  // Role picker toggle
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

  // Select duty inside popover
  const selectDutyBtn = target.closest('[data-select-duty]');
  if (selectDutyBtn) {
    const val = selectDutyBtn.dataset.selectDuty;
    state.selectedDutyId = val || null;
    if (state.selectedDutyId) state.myOnly = false;
    state.rolePopoverOpen = false;
    renderAll();
    return;
  }

  // Star duty inside popover
  const starBtn = target.closest('[data-star-duty]');
  if (starBtn) {
    const dutyId = starBtn.dataset.starDuty;
    if (state.myDutyIds.has(dutyId)) state.myDutyIds.delete(dutyId);
    else state.myDutyIds.add(dutyId);
    renderRolePopover();
    if (state.myOnly) renderTaskLedger();
    return;
  }

  // Clear role filter
  if (target.closest('#clear-role-btn')) {
    state.selectedDutyId = null;
    renderAll();
    return;
  }

  // My duties toggle
  if (target.closest('#my-duties-btn')) {
    state.myOnly = !state.myOnly;
    if (state.myOnly) state.selectedDutyId = null;
    state.rolePopoverOpen = false;
    renderAll();
    return;
  }

  // Category filter
  const catBtn = target.closest('[data-cat]');
  if (catBtn) {
    state.selectedCategory = catBtn.dataset.cat;
    renderAll();
    return;
  }

  // Reset buttons
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

  // Events strip toggle
  if (target.closest('#toggle-events-btn')) {
    state.eventsOpen = !state.eventsOpen;
    renderEventsSection();
    return;
  }

  // Mobile collections toggle
  if (target.closest('#mobile-collections-toggle') && !target.closest('[data-open-task]')) {
    state.mobileCollectionsExpanded = !state.mobileCollectionsExpanded;
    renderRightRailAndMobileCollections();
    return;
  }

  // Overdue toggle
  if (target.closest('#overdue-toggle-btn')) {
    state.overdueExpanded = !state.overdueExpanded;
    renderRightRailAndMobileCollections();
    return;
  }

  // Export ICS
  if (target.closest('#export-ics-btn')) {
    downloadIcs();
    return;
  }

  // Open task drawer
  const openBtn = target.closest('[data-open-task]');
  if (openBtn) {
    openTaskDrawer(openBtn.dataset.openTask, openBtn.dataset.openSource, openBtn);
    return;
  }

  // Drawer actions
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

  // Close role popover when clicking outside
  if (state.rolePopoverOpen && !target.closest('.role-picker-anchor')) {
    state.rolePopoverOpen = false;
    renderRolePopover();
  }
});

document.addEventListener('change', (event) => {
  const target = event.target;

  if (target.matches('[data-toggle-done]')) {
    const task = state.tasks.find((t) => t.id === target.dataset.toggleDone);
    if (task) {
      task.done = target.checked;
      renderAll();
    }
    return;
  }

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
