/* =====================================================================
   🔒 ENGINE — 돈구리 v0.2 앱 엔진
   예산 계산 · 저장 · 보상 · 화면 그리기를 담당합니다.
   읽고 이해하는 것은 좋지만, 고치기 전에 운영사에 요청하세요. (매뉴얼 11장 규칙 03)
   문구 · 숫자 · 디자인은 data/content.js · data/config.js · style.css 에서 바꿉니다.
   ===================================================================== */
(function () {
  "use strict";

  const CONFIG = window.CONFIG;
  const CONTENT = window.CONTENT;
  const $ = (sel) => document.querySelector(sel);

  /* ---------- 날짜 도우미 — 날짜는 모두 "2026-10-12" 같은 글자로 다룹니다 ---------- */
  const pad = (n) => String(n).padStart(2, "0");
  const toYmd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const fromYmd = (s) => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
  const addDays = (s, n) => { const d = fromYmd(s); d.setDate(d.getDate() + n); return toYmd(d); };
  const addMonths = (s, n) => { const d = fromYmd(s); return toYmd(new Date(d.getFullYear(), d.getMonth() + n, d.getDate())); };
  const daysBetween = (a, b) => Math.round((fromYmd(b) - fromYmd(a)) / 86400000);
  const today = () => toYmd(new Date());
  const WD = ["일", "월", "화", "수", "목", "금", "토"];
  const shortDay = (s) => { const d = fromYmd(s); return `${d.getMonth() + 1}.${d.getDate()}`; };
  const dayLabel = (s) => { const d = fromYmd(s); return `${d.getMonth() + 1}.${d.getDate()} (${WD[d.getDay()]})`; };

  /* ---------- 숫자 · 글자 도우미 ---------- */
  const won = (n) => `${Math.round(n).toLocaleString("ko-KR")}원`;
  const floorTo = (n, unit) => Math.floor(n / unit) * unit;
  const ceilTo = (n, unit) => Math.ceil(n / unit) * unit;
  const sum = (arr) => arr.reduce((a, x) => a + x.amount, 0);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const fill = (tpl, vars) => tpl.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m));
  const hash = (s) => { let h = 2166136261; for (const ch of s) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
  const pick = (arr, seed) => arr[hash(seed) % arr.length];
  const uid = () => Math.random().toString(36).slice(2, 9);
  const parseWon = (v) => Number(String(v).replace(/[^0-9]/g, "")) || 0;
  /** 받침에 따라 을/를 · 이/가 고르기 */
  const josa = (word, withJong, noJong) => { const c = String(word).charCodeAt(String(word).length - 1); const jong = c >= 0xac00 && c <= 0xd7a3 && (c - 0xac00) % 28 !== 0; return word + (jong ? withJong : noJong); };
  const catLabel = (id) => (CONTENT.CATEGORIES.find((c) => c.id === id) || { label: "기타" }).label;

  /* ---------- 아이콘 ---------- */
  const ICON = {
    home: '<path d="M4 11l8-7 8 7v9a1 1 0 0 1-1 1h-5v-6h-4v6H5a1 1 0 0 1-1-1z"/>',
    list: '<path d="M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01"/>',
    quiz: '<circle cx="12" cy="12" r="9"/><path d="M9.6 9.4a2.5 2.5 0 1 1 3.4 2.3c-.6.3-1 .8-1 1.5v.6"/><path d="M12 17h.01"/>',
    shop: '<path d="M5 8h14l-1.2 12H6.2z"/><path d="M9 8V6.5a3 3 0 0 1 6 0V8"/>',
    gear: '<path d="M10.3 4.3c.4-1.8 2.9-1.8 3.4 0a1.7 1.7 0 0 0 2.6 1.1c1.5-.9 3.3.8 2.4 2.4a1.7 1.7 0 0 0 1 2.5c1.8.4 1.8 3 0 3.4a1.7 1.7 0 0 0-1 2.6c.9 1.5-.9 3.3-2.4 2.4a1.7 1.7 0 0 0-2.6 1c-.4 1.8-3 1.8-3.4 0a1.7 1.7 0 0 0-2.5-1c-1.6.9-3.3-.9-2.4-2.4a1.7 1.7 0 0 0-1.1-2.6c-1.8-.4-1.8-3 0-3.4a1.7 1.7 0 0 0 1.1-2.5c-.9-1.6.8-3.3 2.4-2.4a1.7 1.7 0 0 0 2.5-1.1z"/><circle cx="12" cy="12" r="3"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    x: '<path d="M6 6l12 12M18 6L6 18"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    flame: '<path d="M12 3c.8 3 4.5 5 4.5 9.5a4.5 4.5 0 0 1-9 0c0-2.2 1-3.4 2.2-4.5.1 1.8.9 3 2.1 3.3-.5-3 .1-5.6.2-8.3z"/>',
    calendar: '<rect x="4" y="5" width="16" height="15" rx="2.5"/><path d="M8 3v4M16 3v4M4 10h16"/>',
    target: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r=".6"/>',
    spark: '<path d="M12 3.5l1.9 5.1 5.1 1.9-5.1 1.9L12 17.5l-1.9-5.1L5 10.5l5.1-1.9z"/><path d="M18.5 16v4M16.5 18h4"/>',
    trash: '<path d="M5 7h14M10 11v6M14 11v6M6.5 7l.9 12.2a1 1 0 0 0 1 .8h7.2a1 1 0 0 0 1-.8L17.5 7M9.5 7V4.5h5V7"/>'
  };
  const icon = (name) => `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true">${ICON[name]}</svg>`;

  /* =====================================================================
     저장
     ===================================================================== */
  let state = null;
  const ui = { tab: "home", flashMood: null, onboard: 0, draft: null, quizPos: 0, resetArmed: false };

  function load() {
    try {
      const raw = localStorage.getItem(CONFIG.STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }
  function save() {
    try { localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(state)); } catch (e) { /* 저장 불가 환경: 화면만 동작 */ }
  }
  function blankState() {
    return {
      v: 2, createdAt: today(), lastClosed: addDays(today(), -1),
      profile: null, expenses: [], planned: [], deposits: [],
      acorns: 0, earned: 0, streak: 0, dayLog: {}, quiz: {},
      owned: [], equipped: {}
    };
  }

  /* =====================================================================
     예산 계산 — 돈구리의 핵심
     오늘 쓸 수 있는 돈 = (한 달 용돈 − 고정지출 − 이번 달 저축 − 앞으로의 예정 지출 − 어제까지 쓴 돈) ÷ 남은 날
     ===================================================================== */

  /** 그 날짜가 속한 용돈 기간 (용돈 받는 날 ~ 다음 받는 날 하루 전) */
  function cycleOf(day, payday) {
    const d = fromYmd(day);
    let start = new Date(d.getFullYear(), d.getMonth(), payday);
    if (d.getDate() < payday) start = new Date(d.getFullYear(), d.getMonth() - 1, payday);
    const next = new Date(start.getFullYear(), start.getMonth() + 1, payday);
    return { start: toYmd(start), end: addDays(toYmd(next), -1), next: toYmd(next) };
  }

  /** 이번 기간부터 목표일까지 용돈을 몇 번 받는지 (최소 1번) */
  function cyclesUntil(cycleStart, deadline, payday) {
    let n = 0;
    let s = cycleStart;
    while (s <= deadline && n < 120) { n += 1; s = cycleOf(s, payday).next; }
    return Math.max(1, n);
  }

  /** 하루치 예산 계산. day 를 바꾸면 그날 아침 기준으로 다시 계산됩니다 */
  function budgetFor(day, st) {
    st = st || state;
    const p = st.profile;
    const cyc = cycleOf(day, p.payday);
    const savedBefore = sum(st.deposits.filter((x) => x.date < cyc.start));
    const savedThisCycle = sum(st.deposits.filter((x) => x.date >= cyc.start && x.date <= cyc.end));
    const remainingAtStart = Math.max(0, p.goal.target - p.goal.initialSaved - savedBefore);
    const cyclesLeft = cyclesUntil(cyc.start, p.goal.deadline, p.payday);
    const savingPlan = p.goal.deadline < cyc.start ? 0 : ceilTo(remainingAtStart / cyclesLeft, CONFIG.SAVING_ROUND);
    const fixed = sum(p.fixed);
    const plannedList = st.planned.filter((x) => x.date >= day && x.date <= cyc.end);
    const planned = sum(plannedList);
    const inCycle = st.expenses.filter((x) => x.date >= cyc.start && x.date <= cyc.end);
    const spentBefore = sum(inCycle.filter((x) => x.date < day));
    const spentToday = sum(inCycle.filter((x) => x.date === day));
    const pool = p.allowance - fixed - savingPlan - planned - spentBefore;
    const daysLeft = daysBetween(day, cyc.end) + 1;
    const limit = pool > 0 ? floorTo(pool / daysLeft, CONFIG.LIMIT_ROUND) : 0;
    return {
      ...cyc, cyclesLeft, savingPlan, savedThisCycle, fixed, planned, plannedList,
      spentBefore, spentToday, pool, daysLeft, limit,
      left: limit - spentToday, periodLeft: pool - spentToday
    };
  }

  function goalStatus() {
    const g = state.profile.goal;
    const saved = g.initialSaved + sum(state.deposits);
    return { saved, pct: Math.min(100, Math.round((saved / g.target) * 100)), remain: Math.max(0, g.target - saved), dday: daysBetween(today(), g.deadline) };
  }

  function levelOf(earned) {
    let lv = 0;
    CONFIG.LEVELS.forEach((th, i) => { if (earned >= th) lv = i; });
    return { level: lv + 1, title: CONTENT.LEVEL_TITLES[lv] || CONTENT.LEVEL_TITLES[CONTENT.LEVEL_TITLES.length - 1], next: CONFIG.LEVELS[lv + 1] };
  }

  /* =====================================================================
     보상 — 도토리 · 연속 기록 · 레벨
     ===================================================================== */
  let pendingLevelUp = null;

  function earn(n) {
    const before = levelOf(state.earned).level;
    state.acorns += n;
    state.earned += n;
    const after = levelOf(state.earned);
    if (after.level > before) pendingLevelUp = after;
  }

  /** 앱을 열 때, 지난 날들을 마감하고 보상을 줍니다 */
  function closePastDays() {
    const t = today();
    let d = addDays(state.lastClosed, 1);
    if (d < state.createdAt) d = state.createdAt;
    const result = { days: 0, kept: 0, acorns: 0 };
    while (d < t) {
      const b = budgetFor(d);
      const kept = b.spentToday === 0 || b.spentToday <= b.limit;
      let gain = 0;
      if (kept) {
        gain += CONFIG.REWARD.KEEP_LIMIT;
        if (b.spentToday === 0) gain += CONFIG.REWARD.NO_SPEND;
        state.streak += 1;
        if (state.streak % CONFIG.REWARD.STREAK_EVERY === 0) gain += CONFIG.REWARD.STREAK_BONUS;
        result.kept += 1;
      } else {
        state.streak = 0;
      }
      if (gain) earn(gain);
      state.dayLog[d] = { limit: b.limit, spent: b.spentToday, kept };
      result.days += 1;
      result.acorns += gain;
      state.lastClosed = d;
      d = addDays(d, 1);
    }
    return result;
  }

  /* =====================================================================
     데모 AI 코치 — 규칙 기반 (CONFIG.AI_MODE = "demo")
     ===================================================================== */
  function coachLines(b) {
    const C = CONTENT.COACH;
    const lines = [];
    const t = today();
    const recent = state.expenses.filter((x) => x.date > addDays(t, -7) && x.date <= t);
    if (!recent.length) {
      lines.push(C.noData);
    } else {
      const byCat = {};
      recent.forEach((x) => {
        byCat[x.cat] = byCat[x.cat] || { count: 0, amount: 0 };
        byCat[x.cat].count += 1;
        byCat[x.cat].amount += x.amount;
      });
      const [cat, v] = Object.entries(byCat).sort((a, z) => z[1].amount - a[1].amount)[0];
      const gain = floorTo(v.amount / v.count / Math.max(1, b.daysLeft), 10);
      lines.push(fill(C.topCategory, { category: `‘${catLabel(cat)}’`, count: v.count, amount: won(v.amount), gain: won(gain) }));
    }
    if (b.limit < CONFIG.LOW_LIMIT_WARN) {
      const g = state.profile.goal;
      const alt = budgetFor(t, { ...state, profile: { ...state.profile, goal: { ...g, deadline: addMonths(g.deadline, 1) } } });
      lines.push(fill(C.lowLimit, { limit: won(b.limit), alt: won(alt.limit) }));
    } else if (state.streak >= 2) {
      const next = CONFIG.REWARD.STREAK_EVERY - (state.streak % CONFIG.REWARD.STREAK_EVERY);
      lines.push(fill(C.streak, { days: state.streak, next }));
    } else {
      const gs = goalStatus();
      if (gs.pct >= 50) lines.push(fill(C.goalClose, { goal: state.profile.goal.title, remain: won(gs.remain), date: shortDay(state.profile.goal.deadline) }));
    }
    return lines.slice(0, 2);
  }

  /* =====================================================================
     화면 그리기
     ===================================================================== */
  function character(mood) {
    const imgs = CONFIG.CHARACTER_IMAGES;
    if (imgs && imgs[mood]) return `<img src="${esc(imgs[mood])}" alt="${esc(CONTENT.CHARACTER_NAME)}">`;
    return window.drawDonguri(mood, state ? state.equipped : {});
  }

  function moodFor(b) {
    if (ui.flashMood) return ui.flashMood;
    if (b.pool <= 0) return "cheer";
    if (b.spentToday > b.limit) return "cheer";
    if (b.spentToday === 0) return "happy";
    return "idle";
  }

  function speechFor(b) {
    const t = today();
    const M = CONTENT.MESSAGES;
    const tomorrow = budgetFor(addDays(t, 1));
    const vars = { left: won(Math.max(0, b.left)), limit: won(b.limit), tomorrow: won(tomorrow.limit), goal: state.profile.goal.title };
    let key = "idle";
    if (b.pool <= 0) key = "tight";
    else if (b.spentToday > b.limit) key = "over";
    else if (b.spentToday === 0) key = "nospend";
    return fill(pick(M[key], t + key + b.spentToday), vars);
  }

  function renderTopbar() {
    const d = new Date();
    $("#topbar").innerHTML = `
      <div>
        <div class="date">${d.getMonth() + 1}월 ${d.getDate()}일 ${WD[d.getDay()]}요일</div>
        <div class="sub">${esc(CONFIG.APP_NAME)} ${esc(CONFIG.VERSION)}</div>
      </div>
      <div class="right">
        <span class="chip-acorn num" title="도토리">${window.drawAcornIcon()}${state.acorns.toLocaleString("ko-KR")}</span>
        <button class="icon-btn" data-act="settings" aria-label="설정">${icon("gear")}</button>
      </div>`;
  }

  function expRow(x, withDate) {
    const label = catLabel(x.cat);
    return `<div class="exp">
      <div class="cat-dot" aria-hidden="true">${esc(label.slice(0, 1))}</div>
      <div><div class="t">${esc(x.title)}</div><div class="s">${withDate ? dayLabel(x.date) + " · " : ""}${esc(label)}</div></div>
      <div class="a num">−${won(x.amount)}</div>
      <button class="del" data-act="del-expense" data-id="${x.id}" aria-label="${esc(x.title)} 삭제">${icon("trash")}</button>
    </div>`;
  }

  function renderHome() {
    const t = today();
    const b = budgetFor(t);
    const lv = levelOf(state.earned);
    const gs = goalStatus();
    const g = state.profile.goal;
    const over = b.spentToday > b.limit;
    const usedPct = b.limit > 0 ? Math.min(100, Math.round((b.spentToday / b.limit) * 100)) : 100;
    const tomorrow = budgetFor(addDays(t, 1));

    let note = "";
    if (b.pool <= 0) note = `<div class="note">이번 용돈 기간 예산을 모두 썼어요. 꼭 필요한 지출만 기록하고, 설정에서 목표일 조정을 고려해 보세요.</div>`;
    else if (over) note = `<div class="note">오늘 ${won(b.spentToday - b.limit)} 넘었어요. 넘친 만큼 남은 ${b.daysLeft - 1}일에 나눠서, 내일부터 하루 <b>${won(tomorrow.limit)}</b>으로 맞췄어요.</div>`;
    else if (b.spentToday === 0) note = `<div class="note good">아직 0원! 이대로 하루를 마치면 도토리 <b>+${CONFIG.REWARD.KEEP_LIMIT + CONFIG.REWARD.NO_SPEND}</b></div>`;

    const remainSaving = Math.max(0, b.savingPlan - b.savedThisCycle);
    const savingAction = gs.remain === 0
      ? `<span class="done-mark">${icon("check")}목표 금액 달성</span>`
      : b.savingPlan === 0
        ? `<span class="small muted">목표일이 지났어요 · 설정에서 새 날짜를 정해 주세요</span>`
        : remainSaving === 0
        ? `<span class="done-mark">${icon("check")}이번 달 저축 완료</span>`
        : `<button class="btn-ghost" data-act="save-goal">저축했어요</button>`;

    const nextPlanned = b.plannedList.slice().sort((a, z) => (a.date < z.date ? -1 : 1))[0];
    const recent = state.expenses.slice().sort((a, z) => (a.date < z.date ? 1 : -1)).slice(0, 3);

    $("#screen").innerHTML = `<div class="stack">
      <section class="hero-char" aria-label="돈구리">
        <div class="char" id="char">${character(moodFor(b))}</div>
        <div>
          <div class="bubble">${esc(speechFor(b))}</div>
          <div class="char-meta"><span><b>Lv.${lv.level}</b> ${esc(lv.title)}</span>${state.streak ? `<span class="streak">${icon("flame")}${state.streak}일 연속</span>` : ""}</div>
        </div>
      </section>

      <section class="card today ${over || b.pool <= 0 ? "over" : ""}" aria-label="오늘 쓸 수 있는 돈">
        <div class="label"><span>오늘 쓸 수 있는 돈</span><span class="muted">다음 용돈 ${shortDay(b.next)}</span></div>
        <div class="big num">${over ? "−" + (b.spentToday - b.limit).toLocaleString("ko-KR") : Math.max(0, b.left).toLocaleString("ko-KR")}<small>원</small></div>
        <div class="bar" role="progressbar" aria-valuenow="${usedPct}" aria-valuemin="0" aria-valuemax="100"><span style="width:${usedPct}%"></span></div>
        <div class="row num"><span>하루 한도 ${won(b.limit)}</span><span>오늘 쓴 돈 ${won(b.spentToday)}</span></div>
        ${note}
        <button class="btn-primary" data-act="add-expense">${icon("plus")}지출 기록</button>
      </section>

      <section class="card">
        <div class="card-head"><div class="card-title">${icon("calendar")}이번 용돈 기간</div><span class="small muted num">${shortDay(b.start)} – ${shortDay(b.end)}</span></div>
        <div class="kv num">
          <div><span>남은 돈</span><b>${won(Math.max(0, b.periodLeft))}</b></div>
          <div><span>예정 지출</span><b>${won(b.planned)}</b></div>
          <div><span>남은 날</span><b>${b.daysLeft}일</b></div>
        </div>
        ${nextPlanned ? `<p class="small muted" style="margin-top:10px">다가오는 예정 지출 · ${shortDay(nextPlanned.date)} ${esc(nextPlanned.title)} ${won(nextPlanned.amount)}</p>` : ""}
      </section>

      <section class="card goal" aria-label="목표">
        <div class="card-head"><div class="card-title">${icon("target")}목표</div><span class="small muted num">D-${Math.max(0, gs.dday)}</span></div>
        <div class="goal-top"><h3>${esc(g.title)}</h3><span class="pct num">${gs.pct}%</span></div>
        <div class="bar"><span style="width:${gs.pct}%"></span></div>
        <div class="row small muted num" style="display:flex;justify-content:space-between"><span>${won(gs.saved)} 모음</span><span>목표 ${won(g.target)}</span></div>
        <div class="saving">
          <div><span class="muted">이번 달 저축</span><br><b class="num">${won(b.savingPlan)}</b> <span class="muted small">${b.cyclesLeft}번에 나눠 모으기</span></div>
          ${savingAction}
        </div>
      </section>

      <section class="card coach" aria-label="돈구리 코치">
        <div class="card-head"><div class="card-title">${icon("spark")}돈구리 코치</div><span class="tag demo">${CONFIG.AI_MODE === "demo" ? "데모 AI" : "AI"}</span></div>
        <ul>${coachLines(b).map((l) => `<li>${esc(l)}</li>`).join("")}</ul>
      </section>

      <section class="card">
        <div class="card-head"><div class="card-title">최근 지출</div><button class="link" data-act="tab" data-tab="history">전체 보기</button></div>
        ${recent.length ? `<div class="exp-list">${recent.map((x) => expRow(x, true)).join("")}</div>` : `<div class="empty">아직 기록이 없어요.<br>첫 지출을 기록해 보세요.</div>`}
      </section>
    </div>`;
  }

  function renderHistory() {
    const t = today();
    const b = budgetFor(t);
    const upcoming = state.planned.filter((x) => x.date >= t).sort((a, z) => (a.date < z.date ? -1 : 1));
    const days = [];
    const from = b.start > state.createdAt ? b.start : state.createdAt;
    for (let d = t; d >= from; d = addDays(d, -1)) days.push(d);
    const blocks = days.map((d) => {
      const items = state.expenses.filter((x) => x.date === d);
      const isToday = d === t;
      const log = isToday ? null : state.dayLog[d];
      const lim = isToday ? b.limit : (log ? log.limit : budgetFor(d).limit);
      const spent = sum(items);
      const kept = spent <= lim;
      if (!items.length && !isToday) {
        return `<div class="day-head"><span><b>${dayLabel(d)}</b> <span class="muted">무지출</span></span><span class="day-badge ok">지킴</span></div>`;
      }
      return `<div class="day-head"><span><b>${dayLabel(d)}</b>${isToday ? ' <span class="muted">오늘</span>' : ""}</span>
          <span class="num small muted">${won(spent)} / ${won(lim)} ${isToday ? "" : `<span class="day-badge ${kept ? "ok" : "over"}">${kept ? "지킴" : "초과"}</span>`}</span></div>
        ${items.length ? `<div class="card" style="padding:4px 14px"><div class="exp-list">${items.map((x) => expRow(x, false)).join("")}</div></div>` : `<div class="empty" style="padding:8px">오늘은 아직 기록이 없어요.</div>`}`;
    }).join("");

    $("#screen").innerHTML = `<div class="stack">
      <section class="card">
        <div class="card-head"><div class="card-title">${icon("calendar")}예정 지출</div><button class="link" data-act="add-planned">+ 추가</button></div>
        ${upcoming.length ? `<div class="exp-list">${upcoming.map((x) => `<div class="exp">
            <div class="cat-dot" aria-hidden="true">${shortDay(x.date).split(".")[1]}</div>
            <div><div class="t">${esc(x.title)}</div><div class="s">${dayLabel(x.date)}</div></div>
            <div class="a num">${won(x.amount)}</div>
            <button class="del" data-act="del-planned" data-id="${x.id}" aria-label="${esc(x.title)} 삭제">${icon("trash")}</button>
          </div>`).join("")}</div>` : `<p class="small muted">생일 선물, 수학여행처럼 미리 알고 있는 지출을 넣어 두면 하루 한도에서 미리 빼 둡니다.</p>`}
      </section>
      <section>
        <div class="card-head" style="margin:6px 2px 0"><div class="card-title">이번 용돈 기간 지출</div><span class="small muted num">합계 ${won(b.spentBefore + b.spentToday)}</span></div>
        ${blocks}
      </section>
    </div>`;
  }

  function quizOfDay(day) {
    const n = Math.min(CONFIG.QUIZ_PER_DAY, CONTENT.QUIZZES.length);
    const idx = CONTENT.QUIZZES.map((_, i) => i).sort((a, z) => hash(day + "#" + a) - hash(day + "#" + z));
    return idx.slice(0, n);
  }

  function renderQuiz() {
    const t = today();
    const set = quizOfDay(t);
    const log = state.quiz[t] || { answers: {} };
    const steps = set.map((qi, i) => {
      const a = log.answers[qi];
      const cls = a === undefined ? (i === ui.quizPos ? "on" : "") : (a === CONTENT.QUIZZES[qi].answer ? "ok" : "no");
      return `<span class="${cls}"></span>`;
    }).join("");
    const allDone = set.every((qi) => log.answers[qi] !== undefined);
    if (ui.quizPos >= set.length) ui.quizPos = set.length - 1;

    let body;
    if (allDone && ui.quizPos === -1) {
      const correct = set.filter((qi) => log.answers[qi] === CONTENT.QUIZZES[qi].answer).length;
      body = `<div class="celebrate"><div class="char">${character(correct === set.length ? "proud" : "happy")}</div>
        <h2>${correct} / ${set.length} 정답</h2>
        <p class="small muted" style="margin-top:6px">도토리 +${correct * CONFIG.REWARD.QUIZ_CORRECT} · 내일 새 퀴즈가 열려요</p></div>
        ${set.map((qi) => `<div class="explain"><b>Q.</b> ${esc(CONTENT.QUIZZES[qi].q)}<br>${esc(CONTENT.QUIZZES[qi].explain)}</div>`).join("")}`;
    } else {
      const qi = set[Math.max(0, ui.quizPos)];
      const Q = CONTENT.QUIZZES[qi];
      const chosen = log.answers[qi];
      const answered = chosen !== undefined;
      body = `<div class="small muted">${Math.max(0, ui.quizPos) + 1}번째 문제</div>
        <div class="quiz-q">${esc(Q.q)}</div>
        ${Q.options.map((o, i) => {
          let cls = "";
          if (answered && i === Q.answer) cls = "correct";
          else if (answered && i === chosen) cls = "wrong";
          return `<button class="opt ${cls}" data-act="answer" data-q="${qi}" data-i="${i}" ${answered ? "disabled" : ""}><span class="n">${i + 1}</span><span>${esc(o)}</span></button>`;
        }).join("")}
        ${answered ? `<div class="explain">${chosen === Q.answer ? "<b>정답!</b> " : "<b>아쉬워요.</b> "}${esc(Q.explain)}</div>
          <button class="btn-primary" data-act="quiz-next">${ui.quizPos < set.length - 1 ? "다음 문제" : "결과 보기"}</button>` : ""}`;
    }
    $("#screen").innerHTML = `<div class="stack"><section class="card">
      <div class="card-head"><div class="card-title">${icon("quiz")}오늘의 경제 퀴즈</div><div class="quiz-steps" aria-hidden="true">${steps}</div></div>
      ${body}</section>
      <p class="small muted" style="padding:0 4px">하루 ${set.length}문제 · 정답마다 도토리 +${CONFIG.REWARD.QUIZ_CORRECT}</p></div>`;
  }

  function renderShop() {
    const lv = levelOf(state.earned);
    const toNext = lv.next ? `다음 레벨까지 ${lv.next - state.earned}개` : "최고 레벨";
    $("#screen").innerHTML = `<div class="stack">
      <section class="card shop-preview">
        <div class="char">${character("happy")}</div>
        <div style="font-weight:800;margin-top:4px">Lv.${lv.level} ${esc(lv.title)}</div>
        <div class="small muted num">지금까지 모은 도토리 ${state.earned.toLocaleString("ko-KR")}개 · ${toNext}</div>
      </section>
      <div class="shop-grid">
        ${CONTENT.SHOP.map((it) => {
          const owned = state.owned.includes(it.id);
          const on = state.equipped[it.slot] === it.id;
          const preview = window.drawDonguri("idle", { [it.slot]: it.id });
          return `<div class="item ${on ? "on" : ""}">
            <div class="thumb">${preview}</div>
            <div class="name">${esc(it.name)}</div>
            ${owned
              ? `<button class="wear" data-act="wear" data-id="${it.id}">${on ? "착용 중 · 벗기" : "착용하기"}</button>`
              : `<span class="price num">${window.drawAcornIcon()}${it.price}</span>
                 <button class="buy" data-act="buy" data-id="${it.id}" ${state.acorns < it.price ? "disabled" : ""}>${state.acorns < it.price ? "도토리 부족" : "사기"}</button>`}
          </div>`;
        }).join("")}
      </div>
    </div>`;
  }

  function renderTabbar() {
    const tabs = [["home", "홈", "home"], ["history", "내역", "list"], ["quiz", "퀴즈", "quiz"], ["shop", "상점", "shop"]];
    $("#tabbar").innerHTML = tabs.map(([id, label, ic]) =>
      `<button class="tab ${ui.tab === id ? "on" : ""}" data-act="tab" data-tab="${id}" ${ui.tab === id ? 'aria-current="page"' : ""}>${icon(ic)}${label}</button>`).join("");
  }

  /* ---------- 처음 설정 ---------- */
  function renderOnboarding() {
    $("#topbar").innerHTML = "";
    $("#tabbar").innerHTML = "";
    $("#tabbar").style.display = "none";
    $("#topbar").style.display = "none";
    const D = ui.draft;
    const steps = `<div class="steps">${[1, 2, 3].map((i) => `<span class="${ui.onboard >= i ? "on" : ""}"></span>`).join("")}</div>`;
    let html;
    if (ui.onboard === 0) {
      html = `<div class="char">${window.drawDonguri("happy", {})}</div>
        <h1>참으라고 하지 않아요.<br>오늘 써도 되는 만큼을 알려줘요.</h1>
        <p class="lead">목표와 용돈을 알려 주면 ${esc(CONTENT.CHARACTER_NAME)}가 거꾸로 계산해서 매일 쓸 수 있는 돈을 정해 줘요.</p>
        <div class="actions">
          <button class="btn-primary" data-act="ob-next">처음부터 설정하기</button>
          <button class="btn-secondary" data-act="load-demo">데모로 둘러보기</button>
        </div>`;
    } else if (ui.onboard === 1) {
      html = `${steps}<h1>무엇을 위해 모을까요?</h1><p class="lead" style="margin-bottom:18px">목표가 분명할수록 하루 한도가 정확해져요.</p>
        <label class="field"><span>목표 이름</span><input class="input" id="ob-title" value="${esc(D.title)}" placeholder="예: 무선 이어폰"></label>
        <div class="row2">
          <label class="field"><span>목표 금액</span><input class="input num" id="ob-target" inputmode="numeric" value="${D.target ? D.target.toLocaleString("ko-KR") : ""}" placeholder="180,000"></label>
          <label class="field"><span>이미 모은 돈</span><input class="input num" id="ob-saved" inputmode="numeric" value="${D.saved ? D.saved.toLocaleString("ko-KR") : ""}" placeholder="0"></label>
        </div>
        <label class="field"><span>언제까지</span><input class="input" type="date" id="ob-deadline" value="${D.deadline}" min="${addDays(today(), 7)}"></label>
        <div class="actions"><button class="btn-primary" data-act="ob-next">다음</button></div>`;
    } else if (ui.onboard === 2) {
      html = `${steps}<h1>용돈은 어떻게 받나요?</h1><p class="lead" style="margin-bottom:18px">한 달에 받는 돈과 받는 날을 알려 주세요.</p>
        <label class="field"><span>한 달 용돈</span><input class="input num" id="ob-allowance" inputmode="numeric" value="${D.allowance ? D.allowance.toLocaleString("ko-KR") : ""}" placeholder="180,000"></label>
        <label class="field"><span>받는 날 (매달)</span><input class="input num" id="ob-payday" inputmode="numeric" value="${D.payday}" placeholder="1 ~ 28"></label>
        <p class="hint">29 ~ 31일에 받는다면 28일로 적어 주세요.</p>
        <div class="actions"><button class="btn-primary" data-act="ob-next">다음</button><button class="btn-secondary" data-act="ob-back">이전</button></div>`;
    } else {
      html = `${steps}<h1>매달 꼭 나가는 돈</h1><p class="lead" style="margin-bottom:18px">교통비, 구독료처럼 매달 빠지는 돈이에요. 없으면 비워 두세요.</p>
        <div id="fixed-rows">${fixedRows(D.fixed)}</div>
        <button class="btn-line" data-act="fixed-add">+ 항목 추가</button>
        <div class="actions"><button class="btn-primary" data-act="ob-finish">시작하기</button><button class="btn-secondary" data-act="ob-back">이전</button></div>`;
    }
    $("#screen").innerHTML = `<div class="onboard">${html}</div>`;
  }

  function fixedRows(list) {
    return list.map((f, i) => `<div class="fixed-row">
      <input class="input" data-fixed-title="${i}" value="${esc(f.title)}" placeholder="항목" aria-label="고정지출 항목">
      <input class="input num" data-fixed-amount="${i}" inputmode="numeric" value="${f.amount ? f.amount.toLocaleString("ko-KR") : ""}" placeholder="금액" aria-label="고정지출 금액">
      <button class="del" data-act="fixed-del" data-i="${i}" aria-label="삭제">${icon("x")}</button>
    </div>`).join("");
  }
  function readFixedRows() {
    const out = [];
    document.querySelectorAll("[data-fixed-title]").forEach((el) => {
      const i = el.dataset.fixedTitle;
      const amount = parseWon(document.querySelector(`[data-fixed-amount="${i}"]`).value);
      out.push({ title: el.value.trim(), amount });
    });
    return out;
  }

  /* ---------- 바텀 시트 ---------- */
  function openSheet(html) {
    const wrap = $("#sheet");
    wrap.innerHTML = `<div class="sheet" role="dialog" aria-modal="true"><div class="grab"></div>${html}</div>`;
    wrap.hidden = false;
    const first = wrap.querySelector("input, button.chip, .btn-primary");
    if (first) setTimeout(() => first.focus(), 60);
  }
  function closeSheet() { $("#sheet").hidden = true; $("#sheet").innerHTML = ""; }

  function sheetExpense() {
    ui.sheetCat = ui.sheetCat || CONTENT.CATEGORIES[0].id;
    ui.sheetDay = "today";
    const b = budgetFor(today());
    openSheet(`<h2>지출 기록</h2>
      <p class="desc">오늘 남은 돈 ${won(Math.max(0, b.left))} · 기록하면 하루 한도가 바로 다시 계산돼요.</p>
      <label class="field"><span>금액</span><input class="input amount num" id="ex-amount" inputmode="numeric" placeholder="0원" autocomplete="off"></label>
      <label class="field"><span>어디에 썼나요</span><input class="input" id="ex-title" placeholder="예: 편의점 음료" maxlength="30"></label>
      <div class="field"><span>카테고리</span><div class="chips" id="ex-cats">${CONTENT.CATEGORIES.map((c) => `<button class="chip ${c.id === ui.sheetCat ? "on" : ""}" data-act="pick-cat" data-id="${c.id}">${esc(c.label)}</button>`).join("")}</div></div>
      <div class="field"><span>날짜</span><div class="chips" id="ex-days"><button class="chip on" data-act="pick-day" data-id="today">오늘</button><button class="chip" data-act="pick-day" data-id="yesterday">어제</button></div></div>
      <button class="btn-primary" data-act="save-expense">기록하기</button>`);
  }

  function sheetPlanned() {
    openSheet(`<h2>예정 지출 추가</h2>
      <p class="desc">미리 알고 있는 지출을 넣어 두면 그날까지 하루 한도에서 조금씩 미리 빼 둬요.</p>
      <label class="field"><span>무엇</span><input class="input" id="pl-title" placeholder="예: 친구 생일 선물" maxlength="30"></label>
      <div class="row2">
        <label class="field"><span>금액</span><input class="input num" id="pl-amount" inputmode="numeric" placeholder="12,000"></label>
        <label class="field"><span>날짜</span><input class="input" type="date" id="pl-date" min="${today()}" value="${addDays(today(), 3)}"></label>
      </div>
      <button class="btn-primary" data-act="save-planned">추가하기</button>`);
  }

  function sheetSettings() {
    const p = state.profile;
    ui.draft = { fixed: p.fixed.map((f) => ({ ...f })) };
    ui.resetArmed = false;
    openSheet(`<h2>설정</h2><p class="desc">바꾸면 오늘부터 하루 한도가 다시 계산돼요.</p>
      <label class="field"><span>목표 이름</span><input class="input" id="st-title" value="${esc(p.goal.title)}"></label>
      <div class="row2">
        <label class="field"><span>목표 금액</span><input class="input num" id="st-target" inputmode="numeric" value="${p.goal.target.toLocaleString("ko-KR")}"></label>
        <label class="field"><span>처음에 모아 둔 돈</span><input class="input num" id="st-saved" inputmode="numeric" value="${p.goal.initialSaved.toLocaleString("ko-KR")}"></label>
      </div>
      <label class="field"><span>목표일</span><input class="input" type="date" id="st-deadline" value="${p.goal.deadline}"></label>
      <div class="row2">
        <label class="field"><span>한 달 용돈</span><input class="input num" id="st-allowance" inputmode="numeric" value="${p.allowance.toLocaleString("ko-KR")}"></label>
        <label class="field"><span>받는 날</span><input class="input num" id="st-payday" inputmode="numeric" value="${p.payday}"></label>
      </div>
      <div class="field"><span>고정지출</span><div id="fixed-rows">${fixedRows(ui.draft.fixed)}</div><button class="btn-line" data-act="fixed-add">+ 항목 추가</button></div>
      <button class="btn-primary" data-act="save-settings">저장</button>
      <div style="display:flex;gap:8px;margin-top:18px">
        <button class="btn-line" data-act="load-demo" style="flex:1">데모 데이터 불러오기</button>
        <button class="btn-line danger" data-act="reset" id="reset-btn" style="flex:1">모두 초기화</button>
      </div>
      <p class="hint" style="margin-top:12px">${esc(CONFIG.APP_NAME)} ${esc(CONFIG.VERSION)} · 기록은 이 기기의 브라우저에만 저장돼요. AI 코치는 ${CONFIG.AI_MODE === "demo" ? "규칙 기반 데모 모드" : "AI 모드"}입니다.</p>`);
  }

  function sheetLevelUp(lv) {
    openSheet(`<div class="celebrate"><div class="char bounce">${character("proud")}</div>
      <h2>Lv.${lv.level} ${esc(lv.title)}</h2>
      <p class="small muted" style="margin:6px 0 4px">${esc(fill(CONTENT.MESSAGES.levelup, { title: lv.title }))}</p></div>
      <button class="btn-primary" data-act="close-sheet">좋아요</button>`);
  }

  /* ---------- 토스트 ---------- */
  let toastTimer = null;
  function toast(msg) {
    const el = $("#toast");
    el.textContent = msg;
    el.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove("show"), 2800);
  }

  function flash(mood) {
    ui.flashMood = mood;
    setTimeout(() => { ui.flashMood = null; if (ui.tab === "home" && $("#sheet").hidden) render(); }, 2600);
  }

  /* ---------- 전체 다시 그리기 ---------- */
  function render() {
    if (!state || !state.profile) { renderOnboarding(); return; }
    $("#topbar").style.display = "";
    $("#tabbar").style.display = "";
    renderTopbar();
    renderTabbar();
    if (ui.tab === "home") renderHome();
    else if (ui.tab === "history") renderHistory();
    else if (ui.tab === "quiz") renderQuiz();
    else renderShop();
    if (pendingLevelUp && $("#sheet").hidden) { const lv = pendingLevelUp; pendingLevelUp = null; sheetLevelUp(lv); }
  }

  /* =====================================================================
     데모 데이터
     ===================================================================== */
  function buildDemo() {
    const D = CONTENT.DEMO;
    const t = today();
    const payday = Math.min(28, fromYmd(addDays(t, -D.cycleStartedDaysAgo)).getDate());
    const cyc = cycleOf(t, payday);
    const st = blankState();
    st.createdAt = cyc.start;
    st.lastClosed = addDays(cyc.start, -1);
    st.profile = {
      goal: { title: D.goal.title, target: D.goal.target, initialSaved: D.goal.saved, deadline: addDays(addMonths(cyc.start, D.goal.months), -1) },
      allowance: D.allowance, payday, fixed: D.fixed.map((f) => ({ ...f }))
    };
    st.expenses = D.expenses.map((x) => ({ id: uid(), date: addDays(t, -x.daysAgo), title: x.title, cat: x.cat, amount: x.amount }));
    st.planned = D.planned.map((x) => ({ id: uid(), date: addDays(t, x.inDays), title: x.title, amount: x.amount }));
    st.acorns = D.acorns;
    st.earned = D.acorns;
    st.owned = D.owned.slice();
    st.equipped = { ...D.equipped };
    return st;
  }

  function startWith(st, announce) {
    state = st;
    pendingLevelUp = null;
    const r = closePastDays();
    pendingLevelUp = null;
    save();
    ui.tab = "home";
    closeSheet();
    render();
    if (announce && r.days) toast(`지난 ${r.days}일 중 ${r.kept}일 한도를 지켰어요 · 도토리 +${r.acorns}`);
  }

  /* =====================================================================
     버튼 동작
     ===================================================================== */
  const actions = {
    tab(el) { ui.tab = el.dataset.tab; if (ui.tab === "quiz") ui.quizPos = firstOpenQuiz(); render(); $("#screen").scrollTop = 0; },
    settings() { sheetSettings(); },
    "close-sheet"() { closeSheet(); render(); },
    "add-expense"() { sheetExpense(); },
    "add-planned"() { sheetPlanned(); },
    "pick-cat"(el) { ui.sheetCat = el.dataset.id; document.querySelectorAll("#ex-cats .chip").forEach((c) => c.classList.toggle("on", c === el)); },
    "pick-day"(el) { ui.sheetDay = el.dataset.id; document.querySelectorAll("#ex-days .chip").forEach((c) => c.classList.toggle("on", c === el)); },

    "save-expense"() {
      const amount = parseWon($("#ex-amount").value);
      const title = $("#ex-title").value.trim() || catLabel(ui.sheetCat);
      if (amount <= 0) { toast("금액을 입력해 주세요."); $("#ex-amount").focus(); return; }
      const t = today();
      const date = ui.sheetDay === "yesterday" ? addDays(t, -1) : t;
      const before = budgetFor(t);
      state.expenses.push({ id: uid(), date, title, cat: ui.sheetCat, amount });
      save();
      closeSheet();
      ui.tab = "home";
      const after = budgetFor(addDays(t, 1));
      if (date === t && before.limit > 0 && amount >= before.limit * CONFIG.BIG_EXPENSE_RATIO) {
        toast(fill(CONTENT.MESSAGES.bigExpense, { days: Math.max(1, before.daysLeft - 1), before: won(before.limit), after: won(after.limit) }));
      } else {
        toast(`${title} ${won(amount)} 기록했어요.`);
      }
      render();
      const ch = $("#char");
      if (ch) ch.classList.add("bounce");
    },

    "del-expense"(el) {
      const x = state.expenses.find((e) => e.id === el.dataset.id);
      state.expenses = state.expenses.filter((e) => e.id !== el.dataset.id);
      save();
      render();
      if (x) toast(`${x.title} 기록을 지웠어요.`);
    },

    "save-planned"() {
      const title = $("#pl-title").value.trim();
      const amount = parseWon($("#pl-amount").value);
      const date = $("#pl-date").value;
      if (!title || amount <= 0 || !date) { toast("무엇·금액·날짜를 모두 입력해 주세요."); return; }
      if (date < today()) { toast("오늘 이후 날짜를 골라 주세요."); return; }
      state.planned.push({ id: uid(), date, title, amount });
      save();
      closeSheet();
      render();
      toast(`${shortDay(date)} ${josa(title, "을", "를")} 미리 빼 두었어요.`);
    },

    "del-planned"(el) { state.planned = state.planned.filter((e) => e.id !== el.dataset.id); save(); render(); },

    "save-goal"() {
      const b = budgetFor(today());
      const amount = Math.max(0, b.savingPlan - b.savedThisCycle);
      if (!amount) return;
      state.deposits.push({ date: today(), amount });
      earn(CONFIG.REWARD.SAVE_DONE);
      save();
      flash("proud");
      render();
      const gs = goalStatus();
      toast(gs.remain === 0 ? `${state.profile.goal.title} 목표 금액을 모두 모았어요!` : `${fill(CONTENT.MESSAGES.saved, { goal: state.profile.goal.title })} 도토리 +${CONFIG.REWARD.SAVE_DONE}`);
    },

    answer(el) {
      const t = today();
      const qi = Number(el.dataset.q);
      const i = Number(el.dataset.i);
      state.quiz[t] = state.quiz[t] || { answers: {} };
      if (state.quiz[t].answers[qi] !== undefined) return;
      state.quiz[t].answers[qi] = i;
      if (i === CONTENT.QUIZZES[qi].answer) { earn(CONFIG.REWARD.QUIZ_CORRECT); toast(`정답! 도토리 +${CONFIG.REWARD.QUIZ_CORRECT}`); }
      save();
      render();
    },
    "quiz-next"() {
      const set = quizOfDay(today());
      ui.quizPos = ui.quizPos < set.length - 1 ? ui.quizPos + 1 : -1;
      render();
    },

    buy(el) {
      const it = CONTENT.SHOP.find((s) => s.id === el.dataset.id);
      if (!it || state.acorns < it.price || state.owned.includes(it.id)) return;
      state.acorns -= it.price;
      state.owned.push(it.id);
      state.equipped[it.slot] = it.id;
      save();
      render();
      toast(`${josa(it.name, "을", "를")} 샀어요.`);
    },
    wear(el) {
      const it = CONTENT.SHOP.find((s) => s.id === el.dataset.id);
      if (!it) return;
      if (state.equipped[it.slot] === it.id) delete state.equipped[it.slot];
      else state.equipped[it.slot] = it.id;
      save();
      render();
    },

    "fixed-add"() {
      const list = readFixedRows();
      list.push({ title: "", amount: 0 });
      $("#fixed-rows").innerHTML = fixedRows(list);
    },
    "fixed-del"(el) {
      const list = readFixedRows();
      list.splice(Number(el.dataset.i), 1);
      $("#fixed-rows").innerHTML = fixedRows(list);
    },

    "save-settings"() {
      const target = parseWon($("#st-target").value);
      const allowance = parseWon($("#st-allowance").value);
      const payday = Number($("#st-payday").value);
      const deadline = $("#st-deadline").value;
      if (target <= 0 || allowance <= 0) { toast("목표 금액과 용돈을 입력해 주세요."); return; }
      if (!(payday >= 1 && payday <= 28)) { toast("받는 날은 1 ~ 28 사이로 적어 주세요."); return; }
      if (!deadline || deadline <= today()) { toast("목표일은 오늘 이후로 정해 주세요."); return; }
      const p = state.profile;
      p.goal.title = $("#st-title").value.trim() || p.goal.title;
      p.goal.target = target;
      p.goal.initialSaved = parseWon($("#st-saved").value);
      p.goal.deadline = deadline;
      p.allowance = allowance;
      p.payday = payday;
      p.fixed = readFixedRows().filter((f) => f.title && f.amount > 0);
      save();
      closeSheet();
      render();
      toast("저장했어요. 하루 한도를 다시 계산했어요.");
    },

    "load-demo"() { startWith(buildDemo(), true); },

    reset(el) {
      if (!ui.resetArmed) {
        ui.resetArmed = true;
        el.textContent = "한 번 더 누르면 초기화";
        setTimeout(() => { ui.resetArmed = false; if (el.isConnected) el.textContent = "모두 초기화"; }, 3000);
        return;
      }
      try { localStorage.removeItem(CONFIG.STORAGE_KEY); } catch (e) { /* 무시 */ }
      state = null;
      ui.onboard = 0;
      ui.draft = null;
      closeSheet();
      render();
    },

    /* 처음 설정 단계 */
    "ob-next"() {
      if (ui.onboard === 0) {
        ui.draft = { title: "", target: 0, saved: 0, deadline: addMonths(today(), 3), allowance: 0, payday: 1, fixed: CONTENT.FIXED_DEFAULTS.map((f) => ({ ...f })) };
      } else if (ui.onboard === 1) {
        const D = ui.draft;
        D.title = $("#ob-title").value.trim();
        D.target = parseWon($("#ob-target").value);
        D.saved = parseWon($("#ob-saved").value);
        D.deadline = $("#ob-deadline").value;
        if (!D.title || D.target <= 0) { toast("목표 이름과 금액을 입력해 주세요."); return; }
        if (!D.deadline || D.deadline <= today()) { toast("목표일은 오늘 이후로 정해 주세요."); return; }
      } else if (ui.onboard === 2) {
        const D = ui.draft;
        D.allowance = parseWon($("#ob-allowance").value);
        D.payday = Number($("#ob-payday").value);
        if (D.allowance <= 0) { toast("한 달 용돈을 입력해 주세요."); return; }
        if (!(D.payday >= 1 && D.payday <= 28)) { toast("받는 날은 1 ~ 28 사이로 적어 주세요."); return; }
      }
      ui.onboard += 1;
      render();
    },
    "ob-back"() {
      if (ui.onboard === 3) ui.draft.fixed = readFixedRows();
      ui.onboard = Math.max(0, ui.onboard - 1);
      render();
    },
    "ob-finish"() {
      const D = ui.draft;
      const st = blankState();
      st.profile = {
        goal: { title: D.title, target: D.target, initialSaved: D.saved, deadline: D.deadline },
        allowance: D.allowance, payday: D.payday,
        fixed: readFixedRows().filter((f) => f.title && f.amount > 0)
      };
      startWith(st, false);
      toast(`준비 끝! 오늘은 ${won(budgetFor(today()).limit)}까지 써도 괜찮아요.`);
    }
  };

  function firstOpenQuiz() {
    const t = today();
    const set = quizOfDay(t);
    const log = state.quiz[t] || { answers: {} };
    const i = set.findIndex((qi) => log.answers[qi] === undefined);
    return i === -1 ? -1 : i;
  }

  /* 금액 칸: 입력하는 대로 1,000 단위 쉼표 */
  document.addEventListener("input", (e) => {
    const el = e.target;
    if (el.matches && el.matches("input[inputmode=numeric]") && !el.id.endsWith("payday")) {
      const n = parseWon(el.value);
      el.value = n ? n.toLocaleString("ko-KR") : "";
    }
  });

  document.addEventListener("click", (e) => {
    const el = e.target.closest("[data-act]");
    if (el && actions[el.dataset.act]) { e.preventDefault(); actions[el.dataset.act](el); return; }
    if (e.target.id === "sheet") { closeSheet(); render(); }
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !$("#sheet").hidden) { closeSheet(); render(); }
    if (e.key === "Enter" && !$("#sheet").hidden && e.target.matches("input")) {
      const btn = $("#sheet .btn-primary");
      if (btn) btn.click();
    }
  });

  /* =====================================================================
     시작
     ===================================================================== */
  state = load();
  if (state && state.profile) {
    const r = closePastDays();
    save();
    render();
    if (r.days) toast(`지난 ${r.days}일 정산 · ${r.kept}일 한도 지킴 · 도토리 +${r.acorns}`);
  } else {
    render();
  }
})();
