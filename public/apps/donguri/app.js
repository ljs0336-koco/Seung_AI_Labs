/* =====================================================================
   🔒 ENGINE — 돈구리 v0.3 앱 엔진
   예산 계산 · 하루 정산 · 저장 · 보상 · 화면 그리기를 담당합니다.
   읽고 이해하는 것은 좋지만, 고치기 전에 운영사에 요청하세요. (매뉴얼 11장 규칙 03)
   문구 · 숫자 · 디자인은 data/content.js · data/config.js · style.css 에서 바꿉니다.
   ===================================================================== */
(function () {
  "use strict";

  const CONFIG = window.CONFIG;
  const CONTENT = window.CONTENT;
  const R = CONFIG.REWARD;
  const $ = (sel) => document.querySelector(sel);

  /* ---------- 날짜 도우미 — 날짜는 모두 "2026-10-13" 같은 글자로 다룹니다 ---------- */
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
  /** 받침에 따라 을/를 · 이/가 고르기 (마지막 한글 글자 기준) */
  const josa = (word, withJong, noJong) => {
    const s = String(word);
    let c = 0;
    for (let i = s.length - 1; i >= 0; i--) { const k = s.charCodeAt(i); if (k >= 0xac00 && k <= 0xd7a3) { c = k; break; } }
    return s + (c && (c - 0xac00) % 28 !== 0 ? withJong : noJong);
  };
  const catLabel = (id) => (CONTENT.CATEGORIES.find((c) => c.id === id) || { label: "기타" }).label;
  const reduced = () => window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

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
    trash: '<path d="M5 7h14M10 11v6M14 11v6M6.5 7l.9 12.2a1 1 0 0 0 1 .8h7.2a1 1 0 0 0 1-.8L17.5 7M9.5 7V4.5h5V7"/>',
    edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/>',
    sliders: '<path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/>',
    alert: '<circle cx="12" cy="12" r="9"/><path d="M12 7.5v5.5M12 16.5h.01"/>',
    down: '<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>',
    up: '<path d="M12 15V4M7 9l5-5 5 5M5 20h14"/>',
    chevron: '<path d="M9 6l6 6-6 6"/>'
  };
  const icon = (name) => `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true">${ICON[name]}</svg>`;

  /* =====================================================================
     저장 — 내 기록과 데모 기록은 다른 이름으로 따로 저장합니다
     ===================================================================== */
  const KEY_REAL = CONFIG.STORAGE_KEY;
  const KEY_DEMO = CONFIG.STORAGE_KEY + "_demo";
  const KEY_MODE = CONFIG.STORAGE_KEY + "_mode";
  let state = null;
  let mode = "real";
  const ui = {
    tab: "home", flashMood: null, onboard: 0, draft: null, quizPos: 0, retry: null,
    resetArmed: false, importArmed: false, saveWarned: false,
    sheetCat: null, sheetDay: "today", sheetDate: null, editId: null, fromPlanned: null,
    change: null, fx: null, sim: null
  };

  function readKey(k) {
    try { const raw = localStorage.getItem(k); return raw ? JSON.parse(raw) : null; } catch (e) { return null; }
  }
  function save() {
    if (!state) return;
    try { localStorage.setItem(mode === "demo" ? KEY_DEMO : KEY_REAL, JSON.stringify(state)); }
    catch (e) {
      if (!ui.saveWarned) { ui.saveWarned = true; toast("이 브라우저에서는 기록이 저장되지 않아요. 설정 → 기록 내보내기로 파일을 받아 두세요."); }
    }
  }
  function setMode(m) { mode = m; try { localStorage.setItem(KEY_MODE, m); } catch (e) { /* 무시 */ } }

  function blankState() {
    return {
      v: 3, createdAt: today(), settledTo: addDays(today(), -1),
      profile: null, expenses: [], planned: [], deposits: [],
      acorns: 0, earned: 0,
      dayLog: {},     // 정산 결과 { status: kept | over | nospend | unrecorded, limit, spent, reward, paid }
      days: {},       // 사용자가 마감한 날 { "2026-10-13": "closed" } — 지출이 없으면 '무지출'로 정산
      quiz: {}, owned: [], equipped: {},
      ledger: {}      // 한 번만 주는 보상 { "save:2026-10-01": 50, "goal:...": 1 }
    };
  }

  /** 예전 기록(v0.2)을 v0.3 형식으로 옮기고 빠진 칸을 채웁니다 — 이미 받은 도토리는 그대로 */
  function normalize(s) {
    const old = s.v !== 3;
    const b = blankState();
    Object.keys(b).forEach((k) => { if ((s[k] === undefined || s[k] === null) && !(old && k === "settledTo")) s[k] = b[k]; });
    if (old) {
      s.settledTo = s.lastClosed || b.settledTo;
      Object.keys(s.dayLog).forEach((d) => {
        const x = s.dayLog[d];
        if (x.status) return;
        const status = x.spent > 0 ? (x.kept ? "kept" : "over") : "nospend";
        const reward = status === "kept" ? R.KEEP_LIMIT : status === "nospend" ? R.KEEP_LIMIT + R.NO_SPEND : 0;
        s.dayLog[d] = { status, limit: x.limit, spent: x.spent, reward, paid: reward, legacy: true };
      });
      if (s.profile) (s.deposits || []).forEach((dp) => { s.ledger["save:" + cycleOf(dp.date, s.profile.payday).start] = R.SAVE_DONE; });
      delete s.lastClosed;
      delete s.streak;
      s.v = 3;
    }
    s.deposits.forEach((d) => { if (!d.id) d.id = uid(); });
    return s;
  }

  function loadReal() {
    let s = readKey(KEY_REAL);
    if (!s || !s.profile) {
      for (const k of CONFIG.OLD_STORAGE_KEYS || []) { const o = readKey(k); if (o && o.profile) { s = o; break; } }
    }
    return s && s.profile ? normalize(s) : null;
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
     보상 · 하루 정산
     - 지출을 기록한 날: 한도 안이면 보상, 넘으면 남은 날에 나눔
     - 지출 없이 '안 썼어요'로 마감한 날: 무지출 보상
     - 지출도 확인도 없는 날: 미기록 (보상 없음 · 연속 기록 끊김) — 나중에 기록하거나 확인하면 다시 정산
     - 다시 정산해도 이미 받은 도토리를 두 번 주지 않습니다 (더 받을 몫이 생기면 차액만)
     ===================================================================== */
  let pendingLevelUp = null;
  const GOOD = (st) => st === "kept" || st === "nospend";

  function earn(n) {
    const before = levelOf(state.earned).level;
    state.acorns += n;
    state.earned += n;
    const after = levelOf(state.earned);
    if (after.level > before) pendingLevelUp = after;
  }

  function streakAt(day) {
    let n = 0;
    let d = day;
    while (state.dayLog[d] && GOOD(state.dayLog[d].status)) { n += 1; d = addDays(d, -1); }
    return n;
  }
  const currentStreak = () => streakAt(state.dayLog[today()] ? today() : addDays(today(), -1));

  /** from 날짜부터 정산할 수 있는 마지막 날(어제, 오늘을 마감했다면 오늘)까지 정산 */
  function settle(from) {
    const t = today();
    const last = state.days[t] ? t : addDays(t, -1);
    let d = from || addDays(state.settledTo, 1);
    if (d < state.createdAt) d = state.createdAt;
    const res = { days: 0, kept: 0, nospend: 0, over: 0, unrecorded: 0, acorns: 0 };
    while (d <= last) {
      const b = budgetFor(d);
      let status;
      if (b.spentToday > 0) status = b.spentToday <= b.limit ? "kept" : "over";
      else status = state.days[d] ? "nospend" : "unrecorded";
      const streak = GOOD(status) ? streakAt(addDays(d, -1)) + 1 : 0;
      let reward = 0;
      if (GOOD(status)) {
        reward += R.KEEP_LIMIT;
        if (status === "nospend") reward += R.NO_SPEND;
        if (streak % R.STREAK_EVERY === 0) reward += R.STREAK_BONUS;
      }
      const old = state.dayLog[d];
      const paid = old ? old.paid || 0 : 0;
      if (reward > paid) { earn(reward - paid); res.acorns += reward - paid; }
      state.dayLog[d] = { status, limit: b.limit, spent: b.spentToday, reward, paid: Math.max(paid, reward) };
      res.days += 1;
      res[status] += 1;
      d = addDays(d, 1);
    }
    if (last > state.settledTo) state.settledTo = last;
    return res;
  }
  /** 이미 정산한 날의 기록을 바꾸면 그날부터 다시 정산합니다 */
  function resettle(day) {
    if (day <= state.settledTo) return settle(day);
    return null;
  }
  /** 지난 예정 지출은 그 용돈 기간의 지난 날 한도에 들어가 있었으므로, 바꾸면 기간 첫날부터 다시 정산합니다 */
  const plannedFrom = (x) => (x.date < today() ? cycleOf(x.date, state.profile.payday).start : null);

  function unrecordedDays() {
    const b = budgetFor(today());
    return Object.keys(state.dayLog).filter((d) => d >= b.start && d < today() && state.dayLog[d].status === "unrecorded").sort();
  }
  const pastPlanned = () => state.planned.filter((x) => x.date < today()).sort((a, z) => (a.date < z.date ? -1 : 1));

  /* =====================================================================
     데모 AI 코치 — 규칙 기반 (CONFIG.AI_MODE = "demo")
     ===================================================================== */
  function topCategory(days) {
    const t = today();
    const recent = state.expenses.filter((x) => x.date > addDays(t, -days) && x.date <= t);
    if (!recent.length) return null;
    const byCat = {};
    recent.forEach((x) => { byCat[x.cat] = byCat[x.cat] || { count: 0, amount: 0 }; byCat[x.cat].count += 1; byCat[x.cat].amount += x.amount; });
    const [cat, v] = Object.entries(byCat).sort((a, z) => z[1].amount - a[1].amount)[0];
    return { cat, ...v };
  }

  function coachLines(b) {
    const C = CONTENT.COACH;
    const lines = [];
    const un = unrecordedDays();
    if (un.length) lines.push(fill(C.unrecorded, { days: un.length }));
    const top = topCategory(7);
    if (!top) lines.push(C.noData);
    else {
      const gain = floorTo(top.amount / top.count / Math.max(1, b.daysLeft), 10);
      lines.push(fill(C.topCategory, { category: `‘${catLabel(top.cat)}’`, count: top.count, amount: won(top.amount), gain: won(gain) }));
    }
    if (b.limit < CONFIG.LOW_LIMIT_WARN) {
      const alt = simBudget({ months: 1, target: state.profile.goal.target, drop: [] });
      lines.push(fill(C.lowLimit, { limit: won(b.limit), alt: won(alt.limit) }));
    } else if (currentStreak() >= 2) {
      const n = currentStreak();
      lines.push(fill(C.streak, { days: n, next: R.STREAK_EVERY - (n % R.STREAK_EVERY) }));
    } else {
      const gs = goalStatus();
      if (gs.pct >= 50) lines.push(fill(C.goalClose, { goal: state.profile.goal.title, remain: won(gs.remain), date: shortDay(state.profile.goal.deadline) }));
    }
    return lines.slice(0, 2);
  }

  /* ---------- 계획 바꿔 보기 — 지금 계획과 바꾼 계획을 같은 계산으로 비교 ---------- */
  function simProfile(sim) {
    const p = state.profile;
    return {
      ...p,
      goal: { ...p.goal, deadline: addMonths(p.goal.deadline, sim.months), target: sim.target },
      fixed: p.fixed.filter((_, i) => !sim.drop.includes(i))
    };
  }
  function simBudget(sim) { return budgetFor(today(), { ...state, profile: simProfile(sim) }); }

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
    const y = addDays(t, -1);
    if (state.dayLog[y] && state.dayLog[y].status === "unrecorded") return fill(M.unrecorded, { day: "어제" });
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
        <div class="sub">${esc(CONFIG.APP_NAME)} ${esc(CONFIG.VERSION)}${mode === "demo" ? ` · <button class="demo-badge" data-act="settings">데모 기록</button>` : ""}</div>
      </div>
      <div class="right">
        <span class="chip-acorn num" title="도토리">${window.drawAcornIcon()}${state.acorns.toLocaleString("ko-KR")}</span>
        <button class="icon-btn" data-act="settings" aria-label="설정">${icon("gear")}</button>
      </div>`;
  }

  function expRow(x, withDate) {
    const label = catLabel(x.cat);
    return `<button class="exp" data-act="edit-expense" data-id="${x.id}" aria-label="${esc(x.title)} ${won(x.amount)} 고치기">
      <span class="cat-dot" aria-hidden="true">${esc(label.slice(0, 1))}</span>
      <span class="exp-txt"><span class="t">${esc(x.title)}</span><span class="s">${withDate ? dayLabel(x.date) + " · " : ""}${esc(label)}</span></span>
      <span class="a num">−${won(x.amount)}</span>
      <span class="go" aria-hidden="true">${icon("edit")}</span>
    </button>`;
  }

  function jarSVG(pct) {
    const h = Math.round(56 * pct / 100);
    return `<svg class="jar" viewBox="0 0 64 80" aria-hidden="true">
      <defs><clipPath id="jarclip"><path d="M14 22 Q8 26 8 36 V66 Q8 74 16 74 H48 Q56 74 56 66 V36 Q56 26 50 22 Z"/></clipPath></defs>
      <rect x="18" y="8" width="28" height="10" rx="3" fill="#C9A47E"/>
      <path d="M14 22 Q8 26 8 36 V66 Q8 74 16 74 H48 Q56 74 56 66 V36 Q56 26 50 22 Z" fill="#FFFFFF" fill-opacity=".7" stroke="#B89878" stroke-width="2.5"/>
      <g clip-path="url(#jarclip)"><rect class="jar-fill" x="0" y="${74 - h}" width="64" height="${h + 2}" fill="#C98B4E" opacity=".85"/>
        <path d="M8 ${74 - h} q6 -3 12 0 t12 0 t12 0 t12 0 t12 0" fill="none" stroke="#E2B98A" stroke-width="2" opacity="${h > 2 ? 1 : 0}"/></g>
      <rect x="14" y="17" width="36" height="6" rx="3" fill="#B89878"/>
    </svg>`;
  }

  function renderHome() {
    const t = today();
    const b = budgetFor(t);
    const lv = levelOf(state.earned);
    const gs = goalStatus();
    const g = state.profile.goal;
    const p = state.profile;
    const over = b.spentToday > b.limit;
    const usedPct = b.limit > 0 ? Math.min(100, Math.round((b.spentToday / b.limit) * 100)) : 100;
    const tomorrow = budgetFor(addDays(t, 1));
    const streak = currentStreak();
    const y = addDays(t, -1);
    const yLog = state.dayLog[y];
    const late = pastPlanned();

    let note = "";
    if (b.pool <= 0) note = `<div class="note">이번 용돈 기간 예산을 모두 썼어요. 꼭 필요한 지출만 기록하고, ‘계획 바꿔 보기’로 목표일 조정을 비교해 보세요.</div>`;
    else if (over) note = `<div class="note">오늘 ${won(b.spentToday - b.limit)} 더 썼어요. 넘친 만큼 남은 ${b.daysLeft - 1}일에 나눠서, 내일부터 하루 <b>${won(tomorrow.limit)}</b>으로 맞췄어요.</div>`;

    // 오늘 마감 상태
    const tLog = state.days[t] ? state.dayLog[t] : null;
    const close = tLog
      ? `<div class="day-closed"><span>${icon("check")}오늘 마감 · ${statusText(tLog.status)}</span>${tLog.paid ? `<span class="num">도토리 +${tLog.paid}</span>` : ""}</div>`
      : b.spentToday === 0
        ? `<button class="btn-ghost wide" data-act="close-day">오늘 안 썼어요 · 하루 마감 <span class="muted">+${R.KEEP_LIMIT + R.NO_SPEND}</span></button>`
        : `<button class="btn-ghost wide" data-act="close-day">오늘 기록 마감 ${over ? "" : `<span class="muted">+${R.KEEP_LIMIT}</span>`}</button>`;

    const why = `<details class="why">
        <summary>${icon("chevron")}왜 이 금액일까?</summary>
        <div class="calc num">
          <div><span>한 달 용돈</span><b>${won(p.allowance)}</b></div>
          <div><span>− 고정지출</span><b>${won(b.fixed)}</b></div>
          <div><span>− 이번 달 저축</span><b>${won(b.savingPlan)}</b></div>
          <div><span>− 남은 예정 지출</span><b>${won(b.planned)}</b></div>
          <div><span>− 이번 기간 어제까지 쓴 돈</span><b>${won(b.spentBefore)}</b></div>
          <div class="sum"><span>= 남은 돈 ÷ 남은 ${b.daysLeft}일</span><b>${won(Math.max(0, b.pool))} ÷ ${b.daysLeft}</b></div>
          <div class="sum"><span>오늘 하루 한도</span><b>${won(b.limit)}</b></div>
        </div>
        <p class="small muted">${CONFIG.LIMIT_ROUND}원 단위로 내려서 계산해요. 오늘 쓴 돈은 내일 아침부터 ‘어제까지 쓴 돈’에 들어가요.</p>
      </details>`;

    const ch = ui.change;
    const changeLine = ch ? `<div class="change">${icon("check")}<span>방금 ${ch.edit ? "고친" : "기록한"} <b>${esc(ch.title)} ${won(ch.amount)}</b>${ch.date === t ? ` → 오늘 남은 돈 ${won(Math.max(0, ch.before))} → <b>${won(Math.max(0, b.left))}</b>` : ` → ${shortDay(ch.date)} 기록에 반영, 오늘 한도 ${won(b.limit)}`}</span></div>` : "";

    const remainSaving = Math.max(0, b.savingPlan - b.savedThisCycle);
    const savingAction = gs.remain === 0
      ? `<span class="done-mark">${icon("check")}목표 금액 달성</span>`
      : b.savingPlan === 0
        ? `<span class="small muted">목표일이 지났어요 · 계획 바꿔 보기</span>`
        : remainSaving === 0
          ? `<span class="saving-done"><span class="done-mark">${icon("check")}이번 달 저축 완료</span><button class="link" data-act="save-goal" id="save-btn">더 저축했어요</button></span>`
          : `<button class="btn-ghost" data-act="save-goal" id="save-btn">저축했어요</button>`;

    const nextPlanned = b.plannedList.slice().sort((a, z) => (a.date < z.date ? -1 : 1))[0];
    const recent = state.expenses.slice().sort((a, z) => (a.date < z.date ? 1 : -1)).slice(0, 3);
    const lvTitle = esc(lv.title);

    $("#screen").innerHTML = `<div class="stack">
      <section class="hero-char" aria-label="돈구리">
        <div class="char ${ui.fx === "cheer" ? "bounce" : ""}" id="char">${character(moodFor(b))}</div>
        <div>
          <div class="bubble">${esc(speechFor(b))}</div>
          <div class="char-meta"><span><b>Lv.${lv.level}</b> ${lvTitle}</span>${streak ? `<span class="streak">${icon("flame")}${streak}일 연속</span>` : ""}</div>
        </div>
      </section>

      ${yLog && yLog.status === "unrecorded" ? `<section class="card check-card" aria-label="어제 기록 확인">
        <div class="card-title">${icon("alert")}어제(${shortDay(y)}) 기록이 없어요</div>
        <p class="small muted">안 쓴 날이면 확인해 주세요. 썼다면 기록하면 그날 기준으로 다시 정산해요.</p>
        <div class="row-btns"><button class="btn-ghost" data-act="confirm-nospend" data-day="${y}">어제 안 썼어요</button><button class="btn-ghost" data-act="add-expense" data-day="${y}">어제 지출 기록</button></div>
      </section>` : ""}

      ${late.length ? `<section class="card check-card" aria-label="지난 예정 지출 확인">
        <div class="card-title">${icon("calendar")}지난 예정 지출, 실제로 썼나요?</div>
        ${late.slice(0, 2).map((x) => `<div class="late-row"><span><b>${esc(x.title)}</b> <span class="small muted">${shortDay(x.date)} · ${won(x.amount)}</span></span>
          <span class="row-btns"><button class="btn-chip" data-act="planned-spent" data-id="${x.id}">썼어요</button><button class="btn-chip" data-act="planned-move" data-id="${x.id}">날짜 변경</button><button class="btn-chip" data-act="planned-cancel" data-id="${x.id}">안 썼어요</button></span></div>`).join("")}
      </section>` : ""}

      <section class="card today ${over || b.pool <= 0 ? "over" : ""}" aria-label="오늘 쓸 수 있는 돈">
        <div class="label"><span>오늘 쓸 수 있는 돈</span><span class="muted">다음 용돈 ${shortDay(b.next)}</span></div>
        <div class="big num" id="big-num">${over ? "−" + (b.spentToday - b.limit).toLocaleString("ko-KR") : Math.max(0, b.left).toLocaleString("ko-KR")}<small>원</small></div>
        <div class="bar" role="progressbar" aria-valuenow="${usedPct}" aria-valuemin="0" aria-valuemax="100"><span style="width:${usedPct}%"></span></div>
        <div class="row num"><span>하루 한도 ${won(b.limit)}</span><span>오늘 쓴 돈 ${won(b.spentToday)}</span></div>
        ${why}
        ${changeLine}
        ${note}
        <button class="btn-primary" data-act="add-expense">${icon("plus")}지출 기록</button>
        ${close}
      </section>

      <section class="card goal" aria-label="목표">
        <div class="card-head"><div class="card-title">${icon("target")}목표</div><span class="small muted num">D-${Math.max(0, gs.dday)}</span></div>
        <div class="goal-body">
          <div class="jar-wrap" id="jar">${jarSVG(gs.pct)}</div>
          <div class="goal-info">
            <div class="goal-top"><h3>${esc(g.title)}</h3><span class="pct num">${gs.pct}%</span></div>
            <div class="bar"><span style="width:${gs.pct}%"></span></div>
            <div class="small muted num goal-nums"><span>${won(gs.saved)} 모음</span><span>목표 ${won(g.target)}</span></div>
          </div>
        </div>
        <div class="saving">
          <div><span class="muted">이번 달 저축 계획</span><br><b class="num">${won(b.savingPlan)}</b> <span class="muted small">${b.savedThisCycle ? `${won(b.savedThisCycle)} 저축함` : `${b.cyclesLeft}번에 나눠 모으기`}</span></div>
          ${savingAction}
        </div>
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

      <section class="card coach" aria-label="돈구리 코치">
        <div class="card-head"><div class="card-title">${icon("spark")}돈구리 코치</div><span class="tag demo">${CONFIG.AI_MODE === "demo" ? "데모 AI" : "AI"}</span></div>
        <ul>${coachLines(b).map((l) => `<li>${esc(l)}</li>`).join("")}</ul>
        <button class="btn-line sim-btn" data-act="open-sim">${icon("sliders")}계획 바꿔 보기 — 목표일·고정지출을 바꾸면?</button>
      </section>

      <section class="card">
        <div class="card-head"><div class="card-title">최근 지출</div><button class="link" data-act="tab" data-tab="history">전체 보기</button></div>
        ${recent.length ? `<div class="exp-list">${recent.map((x) => expRow(x, true)).join("")}</div>` : `<div class="empty">아직 기록이 없어요.<br>첫 지출을 기록해 보세요.</div>`}
      </section>
    </div>`;
  }

  function statusText(s) { return { kept: "한도 안", over: "한도 넘음", nospend: "무지출", unrecorded: "미기록" }[s] || ""; }

  function renderHistory() {
    const t = today();
    const b = budgetFor(t);
    const upcoming = state.planned.filter((x) => x.date >= t).sort((a, z) => (a.date < z.date ? -1 : 1));
    const late = pastPlanned();
    const deposits = state.deposits.filter((x) => x.date >= b.start).sort((a, z) => (a.date < z.date ? 1 : -1));
    const days = [];
    const from = b.start > state.createdAt ? b.start : state.createdAt;
    for (let d = t; d >= from; d = addDays(d, -1)) days.push(d);

    const plannedRow = (x, isLate) => `<div class="pl-row ${isLate ? "late" : ""}">
        <span class="cat-dot" aria-hidden="true">${shortDay(x.date).split(".")[1]}</span>
        <span class="exp-txt"><span class="t">${esc(x.title)}</span><span class="s">${dayLabel(x.date)}${isLate ? " · 지난 예정" : ""}</span></span>
        <span class="a num">${won(x.amount)}</span>
        <span class="row-btns pl-acts"><button class="btn-chip" data-act="planned-spent" data-id="${x.id}">썼어요</button><button class="btn-chip" data-act="planned-move" data-id="${x.id}">날짜 변경</button><button class="btn-chip" data-act="planned-cancel" data-id="${x.id}">${isLate ? "안 썼어요" : "취소"}</button></span>
      </div>`;

    const blocks = days.map((d) => {
      const items = state.expenses.filter((x) => x.date === d);
      const isToday = d === t;
      const log = state.dayLog[d];
      const lim = isToday ? b.limit : log ? log.limit : budgetFor(d).limit;
      const spent = sum(items);
      const st = log ? log.status : isToday ? null : "unrecorded";
      const badge = st ? `<span class="day-badge ${st}">${statusText(st)}</span>` : "";
      const head = `<div class="day-head"><span><b>${dayLabel(d)}</b>${isToday ? ' <span class="muted">오늘</span>' : ""}</span>
          <span class="num small muted">${won(spent)} / ${won(lim)} ${badge}</span></div>`;
      if (st === "unrecorded") {
        return `${head}<div class="receipt unrec"><p class="small muted">기록이 없는 날이에요.</p>
          <div class="row-btns"><button class="btn-chip" data-act="confirm-nospend" data-day="${d}">이날 안 썼어요</button><button class="btn-chip" data-act="add-expense" data-day="${d}">+ 지출 기록</button></div></div>`;
      }
      if (!items.length) return `${head}${isToday ? `<div class="empty" style="padding:8px">오늘은 아직 기록이 없어요.</div>` : ""}`;
      return `${head}<div class="receipt"><div class="exp-list">${items.map((x) => expRow(x, false)).join("")}</div></div>`;
    }).join("");

    $("#screen").innerHTML = `<div class="stack">
      <section class="card">
        <div class="card-head"><div class="card-title">${icon("calendar")}예정 지출</div><button class="link" data-act="add-planned">+ 추가</button></div>
        ${late.length || upcoming.length
          ? `<div class="exp-list">${late.map((x) => plannedRow(x, true)).join("")}${upcoming.map((x) => plannedRow(x, false)).join("")}</div>`
          : `<p class="small muted">생일 선물, 수학여행처럼 미리 알고 있는 지출을 넣어 두면 하루 한도에서 미리 빼 둡니다.</p>`}
        ${late.length || upcoming.length ? `<p class="small muted" style="margin-top:8px">‘썼어요’를 누르면 지출 기록으로 옮겨요. 예정 금액은 빠지고 실제 금액만 계산해서 두 번 빼지 않아요.</p>` : ""}
      </section>
      ${deposits.length ? `<section class="card">
        <div class="card-head"><div class="card-title">${icon("target")}이번 기간 저축 기록</div><span class="small muted num">합계 ${won(sum(deposits))}</span></div>
        <div class="exp-list">${deposits.map((x) => `<div class="pl-row"><span class="cat-dot">${window.drawAcornIcon()}</span><span class="exp-txt"><span class="t">저축</span><span class="s">${dayLabel(x.date)}</span></span><span class="a num">${won(x.amount)}</span><button class="del" data-act="del-deposit" data-id="${x.id}" aria-label="저축 기록 지우기">${icon("trash")}</button></div>`).join("")}</div>
      </section>` : ""}
      <section>
        <div class="card-head" style="margin:6px 2px 0"><div class="card-title">이번 용돈 기간 지출</div><span class="small muted num">합계 ${won(b.spentBefore + b.spentToday)}</span></div>
        ${blocks}
        <p class="small muted" style="padding:10px 2px 0">지난 기록을 고치면 그날부터 다시 정산해요. 이미 받은 도토리는 두 번 주지 않아요.</p>
      </section>
    </div>`;
  }

  /* ---------- 경제 퀴즈 ---------- */
  function quizOfDay(day) {
    const n = Math.min(CONFIG.QUIZ_PER_DAY, CONTENT.QUIZZES.length);
    const idx = CONTENT.QUIZZES.map((_, i) => i).sort((a, z) => hash(day + "#" + a) - hash(day + "#" + z));
    return idx.slice(0, n);
  }
  function mineVars() {
    const b = budgetFor(today());
    const top = topCategory(7);
    return { fixed: won(b.fixed), saving: won(b.savingPlan), limit: won(b.limit), topCat: top ? `‘${catLabel(top.cat)}’` : "‘기록한 곳’", topAmount: top ? won(top.amount) : "0원", goal: state.profile.goal.title };
  }

  function renderQuiz() {
    const t = today();
    const set = quizOfDay(t);
    const log = state.quiz[t] || { answers: {}, retry: {} };
    log.retry = log.retry || {};
    const steps = set.map((qi, i) => {
      const a = log.answers[qi];
      const cls = a === undefined ? (i === ui.quizPos ? "on" : "") : (a === CONTENT.QUIZZES[qi].answer ? "ok" : "no");
      return `<span class="${cls}"></span>`;
    }).join("");
    const allDone = set.every((qi) => log.answers[qi] !== undefined);
    if (ui.quizPos >= set.length) ui.quizPos = set.length - 1;
    const V = mineVars();
    const mine = (Q) => (Q.mine ? `<div class="mine"><b>내 기록과 연결</b><p>${esc(fill(Q.mine, V))}</p></div>` : "");

    let body;
    if (ui.retry !== null) {
      const qi = ui.retry;
      const Q = CONTENT.QUIZZES[qi];
      const chosen = log.retry[qi];
      const answered = chosen !== undefined;
      body = `<div class="small muted">다시 풀기 · 도토리 없이 이해만 확인해요</div>
        <div class="quiz-q">${esc(Q.q)}</div>
        ${Q.options.map((o, i) => {
          let cls = "";
          if (answered && i === Q.answer) cls = "correct";
          else if (answered && i === chosen) cls = "wrong";
          return `<button class="opt ${cls}" data-act="retry-answer" data-q="${qi}" data-i="${i}" ${answered ? "disabled" : ""}><span class="n">${i + 1}</span><span>${esc(o)}</span></button>`;
        }).join("")}
        ${answered ? `<div class="explain">${chosen === Q.answer ? "<b>이해 확인!</b> " : "<b>한 번 더 볼까요?</b> "}${esc(Q.explain)}</div>${mine(Q)}
          ${chosen === Q.answer ? "" : `<button class="btn-line full" data-act="retry-again" data-q="${qi}">다시 골라 보기</button>`}
          <button class="btn-primary" data-act="retry-done">결과로 돌아가기</button>` : ""}`;
    } else if (allDone && ui.quizPos === -1) {
      const correct = set.filter((qi) => log.answers[qi] === CONTENT.QUIZZES[qi].answer).length;
      body = `<div class="celebrate"><div class="char">${character(correct === set.length ? "proud" : "happy")}</div>
        <h2>${correct} / ${set.length} 정답</h2>
        <p class="small muted" style="margin-top:6px">도토리 +${correct * R.QUIZ_CORRECT} · 내일 새 퀴즈가 열려요</p></div>
        ${set.map((qi) => {
          const Q = CONTENT.QUIZZES[qi];
          const ok = log.answers[qi] === Q.answer;
          const fixed = !ok && log.retry[qi] === Q.answer;
          return `<div class="explain"><b>Q.</b> ${esc(Q.q)}<br>${esc(Q.explain)}
            ${ok ? "" : fixed ? `<div class="re-ok">${icon("check")}다시 풀어 이해 확인</div>` : `<button class="btn-line full" data-act="quiz-retry" data-q="${qi}">다시 풀어 보기</button>`}</div>`;
        }).join("")}`;
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
        ${answered ? `<div class="explain">${chosen === Q.answer ? "<b>정답!</b> " : "<b>아쉬워요.</b> "}${esc(Q.explain)}</div>${mine(Q)}
          <button class="btn-primary" data-act="quiz-next">${ui.quizPos < set.length - 1 ? "다음 문제" : "결과 보기"}</button>` : ""}`;
    }
    $("#screen").innerHTML = `<div class="stack"><section class="card">
      <div class="card-head"><div class="card-title">${icon("quiz")}오늘의 경제 퀴즈</div><div class="quiz-steps" aria-hidden="true">${steps}</div></div>
      ${body}</section>
      <p class="small muted" style="padding:0 4px">하루 ${set.length}문제 · 정답마다 도토리 +${R.QUIZ_CORRECT} · 틀린 문제는 다시 풀어 이해를 확인해요</p></div>`;
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
    const late = state ? pastPlanned().length + unrecordedDays().length : 0;
    $("#tabbar").innerHTML = tabs.map(([id, label, ic]) =>
      `<button class="tab ${ui.tab === id ? "on" : ""}" data-act="tab" data-tab="${id}" ${ui.tab === id ? 'aria-current="page"' : ""}>${icon(ic)}${label}${id === "history" && late ? `<i class="dot" aria-label="확인할 기록 있음"></i>` : ""}</button>`).join("");
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

  /* =====================================================================
     바텀 시트
     ===================================================================== */
  function openSheet(html) {
    const wrap = $("#sheet");
    wrap.innerHTML = `<div class="sheet" role="dialog" aria-modal="true"><div class="grab"></div>${html}</div>`;
    wrap.hidden = false;
    const first = wrap.querySelector("input:not([type=date]):not([type=file]), .btn-primary");
    if (first) setTimeout(() => first.focus(), 60);
  }
  function closeSheet() { $("#sheet").hidden = true; $("#sheet").innerHTML = ""; }

  /** 자주 쓰는 지출 — 기록에서 자주 나온 (이름 · 카테고리 · 금액), 없으면 content.js 기본값 */
  function quickList() {
    const count = {};
    state.expenses.forEach((x) => { const k = `${x.title}|${x.cat}|${x.amount}`; count[k] = (count[k] || 0) + 1; });
    const mine = Object.entries(count).filter(([, n]) => n >= 2).sort((a, z) => z[1] - a[1]).map(([k]) => { const [title, cat, amount] = k.split("|"); return { title, cat, amount: Number(amount) }; });
    const out = mine.slice(0, CONFIG.QUICK_COUNT);
    (CONTENT.QUICK_EXPENSES || []).forEach((q) => { if (out.length < CONFIG.QUICK_COUNT && !out.some((x) => x.title === q.title)) out.push(q); });
    return out;
  }

  /** 지출 기록 · 고치기 · 예정 지출을 실제 지출로 옮기기 */
  function sheetExpense(opts) {
    opts = opts || {};
    const t = today();
    const x = opts.editId ? state.expenses.find((e) => e.id === opts.editId) : null;
    const pl = opts.fromPlanned ? state.planned.find((e) => e.id === opts.fromPlanned) : null;
    ui.editId = x ? x.id : null;
    ui.fromPlanned = pl ? pl.id : null;
    ui.sheetCat = x ? x.cat : pl ? "etc" : ui.sheetCat || CONTENT.CATEGORIES[0].id;
    const date = x ? x.date : pl ? (pl.date < t ? pl.date : t) : opts.day || t;
    ui.sheetDate = date;
    ui.sheetDay = date === t ? "today" : date === addDays(t, -1) ? "yesterday" : "other";
    const b = budgetFor(t);
    const minDate = state.createdAt < addDays(t, -40) ? addDays(t, -40) : state.createdAt;
    const amount = x ? x.amount : pl ? pl.amount : 0;
    const title = x ? x.title : pl ? pl.title : "";
    openSheet(`<h2>${x ? "지출 고치기" : pl ? "예정 지출을 실제 지출로" : "지출 기록"}</h2>
      <p class="desc">${x ? "고치면 그날부터 하루 한도와 정산을 다시 계산해요." : pl ? "실제로 쓴 금액으로 바꿔 적어도 돼요. 예정 지출은 목록에서 빠지고, 두 번 빼지 않아요." : `오늘 남은 돈 ${won(Math.max(0, b.left))} · 기록하면 하루 한도가 바로 다시 계산돼요.`}</p>
      ${!x && !pl ? `<div class="field"><span>자주 쓰는 지출</span><div class="chips">${quickList().map((q, i) => `<button class="chip quick" data-act="quick-fill" data-i="${i}">${esc(q.title)} <span class="num">${q.amount.toLocaleString("ko-KR")}</span></button>`).join("")}</div></div>` : ""}
      <label class="field"><span>금액</span><input class="input amount num" id="ex-amount" inputmode="numeric" placeholder="0원" autocomplete="off" value="${amount ? amount.toLocaleString("ko-KR") : ""}"></label>
      <label class="field"><span>어디에 썼나요</span><input class="input" id="ex-title" placeholder="예: 편의점 음료" maxlength="30" value="${esc(title)}"></label>
      <div class="field"><span>카테고리</span><div class="chips" id="ex-cats">${CONTENT.CATEGORIES.map((c) => `<button class="chip ${c.id === ui.sheetCat ? "on" : ""}" data-act="pick-cat" data-id="${c.id}">${esc(c.label)}</button>`).join("")}</div></div>
      <div class="field"><span>날짜</span><div class="chips" id="ex-days">
        <button class="chip ${ui.sheetDay === "today" ? "on" : ""}" data-act="pick-day" data-id="today">오늘</button>
        <button class="chip ${ui.sheetDay === "yesterday" ? "on" : ""}" data-act="pick-day" data-id="yesterday">어제</button>
        <button class="chip ${ui.sheetDay === "other" ? "on" : ""}" data-act="pick-day" data-id="other">다른 날</button>
        <input class="input date-in" type="date" id="ex-date" min="${minDate}" max="${t}" value="${date}" ${ui.sheetDay === "other" ? "" : "hidden"} aria-label="날짜 고르기">
      </div></div>
      <button class="btn-primary" data-act="save-expense">${x ? "고친 내용 저장" : "기록하기"}</button>
      ${x ? `<button class="btn-line full danger" data-act="del-expense" data-id="${x.id}">${icon("trash")}이 기록 지우기</button>` : ""}`);
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

  function sheetPlannedMove(id) {
    const x = state.planned.find((e) => e.id === id);
    if (!x) return;
    openSheet(`<h2>날짜 바꾸기</h2>
      <p class="desc">${esc(x.title)} ${won(x.amount)} · 지금 ${dayLabel(x.date)}</p>
      <label class="field"><span>새 날짜</span><input class="input" type="date" id="mv-date" min="${today()}" value="${x.date < today() ? addDays(today(), 1) : x.date}"></label>
      <button class="btn-primary" data-act="save-move" data-id="${x.id}">바꾸기</button>`);
  }

  function sheetDeposit() {
    const b = budgetFor(today());
    const remain = Math.max(0, b.savingPlan - b.savedThisCycle);
    openSheet(`<h2>저축 기록</h2>
      <p class="desc">실제로 저축통(통장)에 옮긴 금액을 적어 주세요. 이번 달 계획 ${won(b.savingPlan)}${b.savedThisCycle ? ` 중 ${won(b.savedThisCycle)} 저축함` : ""}.</p>
      <div class="chips" style="margin-bottom:12px">
        ${remain ? `<button class="chip" data-act="deposit-fill" data-v="${remain}">남은 계획 ${won(remain)}</button>` : ""}
        ${remain >= 2000 ? `<button class="chip" data-act="deposit-fill" data-v="${ceilTo(remain / 2, 100)}">절반 ${won(ceilTo(remain / 2, 100))}</button>` : ""}
      </div>
      <label class="field"><span>저축한 금액</span><input class="input amount num" id="dp-amount" inputmode="numeric" value="${remain ? remain.toLocaleString("ko-KR") : ""}" placeholder="0원"></label>
      <button class="btn-primary" data-act="save-deposit">저축 기록하기</button>
      <p class="hint" style="margin-top:12px">계획만큼 모으면 도토리 +${R.SAVE_DONE} (용돈 기간마다 한 번)</p>`);
  }

  function sheetSim() {
    const p = state.profile;
    ui.sim = ui.sim || { months: 0, target: p.goal.target, drop: [] };
    const S = ui.sim;
    const now = budgetFor(today());
    const alt = simBudget(S);
    const np = simProfile(S);
    const months = [-1, 0, 1, 2];
    const row = (label, a, z) => `<tr><th>${label}</th><td>${a}</td><td class="${a !== z ? "chg" : ""}">${z}</td></tr>`;
    openSheet(`<h2>계획 바꿔 보기</h2>
      <p class="desc">바꾸기 전에 지금 계획과 비교해 봐요. ‘이 계획으로 바꾸기’를 눌러야 실제로 바뀌어요.</p>
      <div class="field"><span>목표일</span><div class="chips">${months.map((m) => {
        const dl = addMonths(p.goal.deadline, m);
        const ok = dl > today();
        return `<button class="chip ${S.months === m ? "on" : ""}" data-act="sim-months" data-m="${m}" ${ok ? "" : "disabled"}>${m === 0 ? "그대로" : m < 0 ? "한 달 당기기" : `${m}달 늦추기`}</button>`;
      }).join("")}</div></div>
      <label class="field"><span>목표 금액</span><input class="input num" id="sim-target" inputmode="numeric" value="${S.target.toLocaleString("ko-KR")}"></label>
      ${p.fixed.length ? `<div class="field"><span>고정지출 줄여 보기</span><div class="chips">${p.fixed.map((f, i) => `<button class="chip ${S.drop.includes(i) ? "on" : ""}" data-act="sim-fixed" data-i="${i}">${S.drop.includes(i) ? "빼고 " : ""}${esc(f.title)} ${won(f.amount)}</button>`).join("")}</div></div>` : ""}
      <table class="sim num">
        <thead><tr><th></th><th>지금</th><th>바꾸면</th></tr></thead>
        <tbody>
          ${row("목표일", shortDay(p.goal.deadline), shortDay(np.goal.deadline))}
          ${row("목표 금액", won(p.goal.target), won(np.goal.target))}
          ${row("고정지출", won(now.fixed), won(alt.fixed))}
          ${row("이번 달 저축", won(now.savingPlan), won(alt.savingPlan))}
          ${row("오늘 하루 한도", won(now.limit), won(alt.limit))}
        </tbody>
      </table>
      <p class="hint" style="margin-top:10px">목표일을 늦추면 매달 저축이 줄고 하루 한도가 늘어요. 대신 목표를 받는 날이 늦어져요. 무엇이 나에게 맞는지 골라 보세요.</p>
      <button class="btn-primary" data-act="sim-apply" ${S.months === 0 && S.target === p.goal.target && !S.drop.length ? "disabled" : ""}>이 계획으로 바꾸기</button>
      <button class="btn-line full" data-act="close-sheet">그대로 두기</button>`);
  }

  function sheetSettings() {
    const p = state.profile;
    ui.draft = { fixed: p.fixed.map((f) => ({ ...f })) };
    ui.resetArmed = false;
    ui.importArmed = false;
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

      <div class="set-group">
        <b>기록 지키기</b>
        <p class="small muted">기록은 이 기기의 브라우저에만 있어요. 기기를 바꾸거나 정리하기 전에 파일로 받아 두세요.</p>
        <div class="row2"><button class="btn-line" data-act="export">${icon("down")}기록 내보내기</button><button class="btn-line" data-act="import" id="import-btn">${icon("up")}기록 가져오기</button></div>
        <input type="file" id="import-file" accept=".json,application/json" hidden>
      </div>
      <div class="set-group">
        ${mode === "demo"
          ? `<b>지금은 데모 기록이에요</b><p class="small muted">내 기록과 따로 저장돼요.</p><div class="row2"><button class="btn-line" data-act="demo-restart">데모 처음부터</button><button class="btn-line" data-act="demo-exit">데모 끝내기</button></div>`
          : `<button class="btn-line full" data-act="load-demo">데모로 둘러보기 (내 기록은 그대로)</button>`}
        <button class="btn-line full danger" data-act="reset" id="reset-btn">${mode === "demo" ? "데모 기록 초기화" : "모두 초기화"}</button>
      </div>
      <p class="hint" style="margin-top:12px">${esc(CONFIG.APP_NAME)} ${esc(CONFIG.VERSION)} · AI 코치는 ${CONFIG.AI_MODE === "demo" ? "규칙 기반 데모 모드" : "AI 모드"}입니다.</p>`);
  }

  function sheetLevelUp(lv) {
    openSheet(`<div class="celebrate"><div class="char bounce">${character("proud")}</div>
      <h2>Lv.${lv.level} ${esc(lv.title)}</h2>
      <p class="small muted" style="margin:6px 0 4px">${esc(fill(CONTENT.MESSAGES.levelup, { title: lv.title }))}</p></div>
      <button class="btn-primary" data-act="close-sheet">좋아요</button>`);
  }
  function sheetGoalDone() {
    openSheet(`<div class="celebrate goal-done"><div class="char cheer-jump">${character("proud")}</div>
      <h2>${esc(state.profile.goal.title)} 목표 달성!</h2>
      <p class="small muted" style="margin:6px 0 4px">${esc(fill(CONTENT.MESSAGES.goalDone, { goal: state.profile.goal.title }))}</p></div>
      <button class="btn-primary" data-act="close-sheet">좋아요</button>
      <button class="btn-line full" data-act="settings">새 목표 정하기</button>`);
  }

  /* ---------- 토스트 ---------- */
  let toastTimer = null;
  function toast(msg) {
    const el = $("#toast");
    el.textContent = msg;
    el.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove("show"), 3000);
  }

  function flash(mood) {
    ui.flashMood = mood;
    setTimeout(() => { ui.flashMood = null; if (ui.tab === "home" && $("#sheet").hidden) render(); }, 2600);
  }

  /* ---------- 그린 뒤 한 번만: 남은 돈 숫자 변화 · 도토리가 저축통으로 ---------- */
  function afterRender() {
    const ch = ui.change;
    if (ui.tab === "home" && ch && !ch.animated) {
      ch.animated = true;
      const el = $("#big-num");
      if (el && !reduced() && ch.date === today()) {
        const b = budgetFor(today());
        const to = b.spentToday > b.limit ? -(b.spentToday - b.limit) : Math.max(0, b.left);
        const from = ch.before;
        const t0 = performance.now();
        const step = (now) => {
          const k = Math.min(1, (now - t0) / 600);
          const v = Math.round(from + (to - from) * (1 - Math.pow(1 - k, 3)));
          if (!el.isConnected) return;
          el.innerHTML = `${v < 0 ? "−" + Math.abs(v).toLocaleString("ko-KR") : v.toLocaleString("ko-KR")}<small>원</small>`;
          if (k < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      }
    }
    if (ui.fx === "deposit") {
      const src = document.querySelector(".saving");
      const jar = $("#jar");
      if (src && jar && !reduced()) {
        const app = $("#app").getBoundingClientRect();
        const a = src.getBoundingClientRect();
        const z = jar.getBoundingClientRect();
        const fly = document.createElement("div");
        fly.className = "acorn-fly";
        fly.innerHTML = window.drawAcornIcon();
        fly.style.left = `${a.right - app.left - 60}px`;
        fly.style.top = `${a.top - app.top + 8}px`;
        $("#app").appendChild(fly);
        const dx = z.left + z.width / 2 - (a.right - 60) - 10;
        const dy = z.top + 18 - (a.top + 8);
        fly.animate([
          { transform: "translate(0,0) scale(1)", opacity: 1 },
          { transform: `translate(${dx / 2}px, ${dy - 40}px) scale(1.2)`, opacity: 1, offset: 0.5 },
          { transform: `translate(${dx}px, ${dy}px) scale(.6)`, opacity: 0.2 }
        ], { duration: 700, easing: "ease-in-out" }).onfinish = () => { fly.remove(); jar.classList.add("gulp"); };
      }
    }
    if (ui.fx !== "goal") ui.fx = null;
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
    afterRender();
    if ($("#sheet").hidden) {
      if (ui.fx === "goal") { ui.fx = null; sheetGoalDone(); }
      else if (pendingLevelUp) { const lv = pendingLevelUp; pendingLevelUp = null; sheetLevelUp(lv); }
    }
  }

  /* =====================================================================
     데모 데이터 — 내 기록과 따로 저장됩니다
     ===================================================================== */
  function buildDemo() {
    const D = CONTENT.DEMO;
    const t = today();
    const payday = Math.min(28, fromYmd(addDays(t, -D.cycleStartedDaysAgo)).getDate());
    const cyc = cycleOf(t, payday);
    const st = blankState();
    st.createdAt = cyc.start;
    st.settledTo = addDays(cyc.start, -1);
    st.profile = {
      goal: { title: D.goal.title, target: D.goal.target, initialSaved: D.goal.saved, deadline: addDays(addMonths(cyc.start, D.goal.months), -1) },
      allowance: D.allowance, payday, fixed: D.fixed.map((f) => ({ ...f }))
    };
    st.expenses = D.expenses.map((x) => ({ id: uid(), date: addDays(t, -x.daysAgo), title: x.title, cat: x.cat, amount: x.amount }));
    st.planned = D.planned.map((x) => ({ id: uid(), date: addDays(t, x.inDays), title: x.title, amount: x.amount }));
    (D.noSpendDaysAgo || []).forEach((n) => { st.days[addDays(t, -n)] = "closed"; });
    st.acorns = D.acorns;
    st.earned = D.acorns;
    st.owned = D.owned.slice();
    st.equipped = { ...D.equipped };
    return st;
  }

  function startWith(st, announce) {
    state = st;
    pendingLevelUp = null;
    const r = settle();
    pendingLevelUp = null;
    save();
    ui.tab = "home";
    ui.change = null;
    closeSheet();
    render();
    if (announce && r.days) toast(`지난 ${r.days}일 정산 · 한도 안 ${r.kept + r.nospend}일 · 미기록 ${r.unrecorded}일 · 도토리 +${r.acorns}`);
  }
  function enterDemo(fresh) {
    setMode("demo");
    const s = fresh ? null : readKey(KEY_DEMO);
    if (s && s.profile) { state = normalize(s); settle(); save(); ui.tab = "home"; closeSheet(); render(); }
    else startWith(buildDemo(), true);
    setTimeout(() => toast("데모 기록으로 둘러봐요. 내 기록은 따로 그대로 있어요."), 50);
  }
  function exitDemo() {
    setMode("real");
    state = loadReal();
    if (state) { settle(); save(); }
    ui.tab = "home"; ui.onboard = 0; ui.change = null;
    closeSheet();
    render();
    toast(state ? "내 기록으로 돌아왔어요." : "데모를 끝냈어요. 처음부터 설정해 볼까요?");
  }

  /** 날짜 칩 · 날짜 칸에서 고른 날짜 */
  function sheetPickedDate() {
    const t = today();
    if (ui.sheetDay === "today") return t;
    if (ui.sheetDay === "yesterday") return addDays(t, -1);
    const v = $("#ex-date") ? $("#ex-date").value : "";
    return v && v <= t ? v : t;
  }

  /* =====================================================================
     버튼 동작
     ===================================================================== */
  const actions = {
    tab(el) { ui.tab = el.dataset.tab; ui.change = null; ui.retry = null; if (ui.tab === "quiz") ui.quizPos = firstOpenQuiz(); render(); $("#screen").scrollTop = 0; },
    settings() { sheetSettings(); },
    "close-sheet"() { closeSheet(); render(); },
    "add-expense"(el) { sheetExpense({ day: el && el.dataset.day }); },
    "edit-expense"(el) { sheetExpense({ editId: el.dataset.id }); },
    "add-planned"() { sheetPlanned(); },
    "pick-cat"(el) { ui.sheetCat = el.dataset.id; document.querySelectorAll("#ex-cats .chip").forEach((c) => c.classList.toggle("on", c === el)); },
    "pick-day"(el) {
      ui.sheetDay = el.dataset.id;
      document.querySelectorAll("#ex-days .chip").forEach((c) => c.classList.toggle("on", c === el));
      $("#ex-date").hidden = ui.sheetDay !== "other";
      if (ui.sheetDay === "other") $("#ex-date").focus();
    },
    "quick-fill"(el) {
      const q = quickList()[Number(el.dataset.i)];
      if (!q) return;
      $("#ex-amount").value = q.amount.toLocaleString("ko-KR");
      $("#ex-title").value = q.title;
      ui.sheetCat = q.cat;
      document.querySelectorAll("#ex-cats .chip").forEach((c) => c.classList.toggle("on", c.dataset.id === q.cat));
    },

    "save-expense"() {
      const amount = parseWon($("#ex-amount").value);
      const title = $("#ex-title").value.trim() || catLabel(ui.sheetCat);
      if (amount <= 0) { toast("금액을 입력해 주세요."); $("#ex-amount").focus(); return; }
      const t = today();
      const date = sheetPickedDate();
      const before = budgetFor(t);
      const beforeLeft = before.spentToday > before.limit ? -(before.spentToday - before.limit) : Math.max(0, before.left);
      let from = date;
      if (ui.editId) {
        const x = state.expenses.find((e) => e.id === ui.editId);
        if (!x) return;
        from = x.date < date ? x.date : date;
        Object.assign(x, { amount, title, cat: ui.sheetCat, date });
      } else {
        state.expenses.push({ id: uid(), date, title, cat: ui.sheetCat, amount });
      }
      let moved = false;
      if (ui.fromPlanned) {
        const pl = state.planned.find((e) => e.id === ui.fromPlanned);
        const pf = pl && plannedFrom(pl);
        if (pf && pf < from) from = pf;
        state.planned = state.planned.filter((e) => e.id !== ui.fromPlanned);
        moved = true;
      }
      const r = resettle(from);
      save();
      closeSheet();
      ui.tab = "home";
      ui.change = { title, amount, date, before: beforeLeft, edit: !!ui.editId };
      const after = budgetFor(addDays(t, 1));
      if (moved) toast(`${josa(title, "을", "를")} 실제 지출로 옮겼어요. 예정 금액은 빼고 두 번 계산하지 않아요.`);
      else if (date < t) toast(`${dayLabel(date)} 기록에 반영하고 그날부터 다시 정산했어요.${r && r.acorns ? ` 도토리 +${r.acorns}` : ""}`);
      else if (!ui.editId && before.limit > 0 && amount >= before.limit * CONFIG.BIG_EXPENSE_RATIO) {
        toast(fill(CONTENT.MESSAGES.bigExpense, { days: Math.max(1, before.daysLeft - 1), before: won(before.limit), after: won(after.limit) }));
      } else toast(`${title} ${won(amount)} ${ui.editId ? "고쳤어요" : "기록했어요"}.`);
      ui.editId = null;
      ui.fromPlanned = null;
      render();
      $("#screen").scrollTop = 0;
      const chEl = $("#char");
      if (chEl && !reduced()) chEl.classList.add("bounce");
    },

    "del-expense"(el) {
      const x = state.expenses.find((e) => e.id === el.dataset.id);
      if (!x) return;
      state.expenses = state.expenses.filter((e) => e.id !== x.id);
      resettle(x.date);
      save();
      closeSheet();
      ui.change = null;
      render();
      toast(`${x.title} 기록을 지웠어요.`);
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
    "planned-spent"(el) { sheetExpense({ fromPlanned: el.dataset.id }); },
    "planned-move"(el) { sheetPlannedMove(el.dataset.id); },
    "save-move"(el) {
      const x = state.planned.find((e) => e.id === el.dataset.id);
      const date = $("#mv-date").value;
      if (!x || !date || date < today()) { toast("오늘 이후 날짜를 골라 주세요."); return; }
      const pf = plannedFrom(x);
      x.date = date;
      if (pf) resettle(pf);
      save();
      closeSheet();
      render();
      toast(`${josa(x.title, "을", "를")} ${shortDay(date)} 예정으로 옮겼어요.`);
    },
    "planned-cancel"(el) {
      const x = state.planned.find((e) => e.id === el.dataset.id);
      if (!x) return;
      const pf = plannedFrom(x);
      state.planned = state.planned.filter((e) => e.id !== x.id);
      const r = pf ? resettle(pf) : null;
      save();
      render();
      toast(`${josa(x.title, "을", "를")} 예정에서 뺐어요. 하루 한도를 다시 계산했어요.${r && r.acorns ? ` 도토리 +${r.acorns}` : ""}`);
    },

    "close-day"() {
      const t = today();
      state.days[t] = "closed";
      const r = settle(t);
      save();
      const log = state.dayLog[t];
      const M = CONTENT.MESSAGES;
      flash(log.status === "over" ? "cheer" : "proud");
      ui.fx = log.status === "over" ? null : "cheer";
      render();
      toast(fill(log.status === "kept" ? M.closeKept : log.status === "nospend" ? M.closeNospend : M.closeOver, { acorns: r.acorns || log.paid }));
    },
    "confirm-nospend"(el) {
      const d = el.dataset.day;
      if (!d || d >= today()) return;
      state.days[d] = "closed";
      const r = settle(d);
      save();
      render();
      toast(`${josa(dayLabel(d), "을", "를")} 무지출로 확인하고 다시 정산했어요.${r.acorns ? ` 도토리 +${r.acorns}` : ""}`);
    },

    "save-goal"() { sheetDeposit(); },
    "deposit-fill"(el) { $("#dp-amount").value = Number(el.dataset.v).toLocaleString("ko-KR"); },
    "save-deposit"() {
      const amount = parseWon($("#dp-amount").value);
      if (amount <= 0) { toast("저축한 금액을 입력해 주세요."); return; }
      const before = goalStatus();
      state.deposits.push({ id: uid(), date: today(), amount });
      const b = budgetFor(today());
      let got = 0;
      if (b.savingPlan > 0 && b.savedThisCycle >= b.savingPlan && !state.ledger["save:" + b.start]) {
        state.ledger["save:" + b.start] = R.SAVE_DONE;
        earn(R.SAVE_DONE);
        got = R.SAVE_DONE;
      }
      const gs = goalStatus();
      const goalKey = `goal:${state.profile.goal.title}:${state.profile.goal.target}`;
      const reached = before.remain > 0 && gs.remain === 0 && !state.ledger[goalKey];
      if (reached) state.ledger[goalKey] = 1;
      save();
      closeSheet();
      ui.tab = "home";
      ui.change = null;
      ui.fx = reached ? "goal" : "deposit";
      flash("proud");
      render();
      if (!reached) {
        const remain = Math.max(0, b.savingPlan - b.savedThisCycle);
        toast(remain ? fill(CONTENT.MESSAGES.savedPart, { amount: won(amount), remain: won(remain) }) : `${fill(CONTENT.MESSAGES.saved, { goal: state.profile.goal.title })}${got ? ` 도토리 +${got}` : ""}`);
      }
    },
    "del-deposit"(el) {
      state.deposits = state.deposits.filter((x) => x.id !== el.dataset.id);
      save();
      render();
      toast("저축 기록을 지웠어요. 받은 도토리는 그대로예요.");
    },

    "open-sim"() { ui.sim = null; sheetSim(); },
    "sim-months"(el) { ui.sim.target = parseWon($("#sim-target").value) || ui.sim.target; ui.sim.months = Number(el.dataset.m); sheetSim(); },
    "sim-fixed"(el) {
      ui.sim.target = parseWon($("#sim-target").value) || ui.sim.target;
      const i = Number(el.dataset.i);
      ui.sim.drop = ui.sim.drop.includes(i) ? ui.sim.drop.filter((x) => x !== i) : ui.sim.drop.concat(i);
      sheetSim();
    },
    "sim-apply"() {
      const S = ui.sim;
      S.target = parseWon($("#sim-target").value) || S.target;
      const np = simProfile(S);
      if (np.goal.deadline <= today()) { toast("목표일은 오늘 이후여야 해요."); return; }
      state.profile = np;
      save();
      closeSheet();
      ui.change = null;
      render();
      toast(`새 계획으로 바꿨어요. 오늘 하루 한도 ${won(budgetFor(today()).limit)}.`);
    },

    answer(el) {
      const t = today();
      const qi = Number(el.dataset.q);
      const i = Number(el.dataset.i);
      state.quiz[t] = state.quiz[t] || { answers: {}, retry: {} };
      if (state.quiz[t].answers[qi] !== undefined) return;
      state.quiz[t].answers[qi] = i;
      if (i === CONTENT.QUIZZES[qi].answer) { earn(R.QUIZ_CORRECT); toast(`정답! 도토리 +${R.QUIZ_CORRECT}`); }
      save();
      render();
    },
    "quiz-next"() {
      const set = quizOfDay(today());
      ui.quizPos = ui.quizPos < set.length - 1 ? ui.quizPos + 1 : -1;
      render();
    },
    "quiz-retry"(el) { ui.retry = Number(el.dataset.q); render(); $("#screen").scrollTop = 0; },
    "retry-answer"(el) {
      const t = today();
      state.quiz[t].retry = state.quiz[t].retry || {};
      state.quiz[t].retry[Number(el.dataset.q)] = Number(el.dataset.i);
      save();
      render();
    },
    "retry-again"(el) { delete state.quiz[today()].retry[Number(el.dataset.q)]; save(); render(); },
    "retry-done"() { ui.retry = null; ui.quizPos = -1; render(); },

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

    export() {
      try {
        const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `donguri_${mode === "demo" ? "demo_" : ""}${today()}.json`;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
        toast("기록 파일을 내려받았어요. 잘 보관해 두세요.");
      } catch (e) { toast("이 브라우저에서는 내보내기가 안 돼요."); }
    },
    import(el) {
      if (!ui.importArmed) {
        ui.importArmed = true;
        el.textContent = "지금 기록이 바뀌어요 · 한 번 더";
        setTimeout(() => { ui.importArmed = false; if (el.isConnected) el.innerHTML = `${icon("up")}기록 가져오기`; }, 3000);
        return;
      }
      $("#import-file").click();
    },

    "load-demo"() { enterDemo(false); },
    "demo-restart"() { enterDemo(true); },
    "demo-exit"() { exitDemo(); },

    reset(el) {
      if (!ui.resetArmed) {
        ui.resetArmed = true;
        el.textContent = "한 번 더 누르면 초기화";
        setTimeout(() => { ui.resetArmed = false; if (el.isConnected) el.textContent = mode === "demo" ? "데모 기록 초기화" : "모두 초기화"; }, 3000);
        return;
      }
      if (mode === "demo") { enterDemo(true); return; }
      try { localStorage.removeItem(KEY_REAL); (CONFIG.OLD_STORAGE_KEYS || []).forEach((k) => localStorage.removeItem(k)); } catch (e) { /* 무시 */ }
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
      setMode("real");
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
  /* 기록 가져오기 — 파일을 읽어 형식을 확인한 뒤 바꿉니다 */
  document.addEventListener("change", (e) => {
    if (e.target.id === "sim-target" && ui.sim) { ui.sim.target = parseWon(e.target.value) || ui.sim.target; sheetSim(); return; }
    if (e.target.id !== "import-file" || !e.target.files || !e.target.files[0]) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const obj = JSON.parse(reader.result);
        if (!obj || !obj.profile || !obj.profile.goal || !Array.isArray(obj.expenses)) throw new Error("형식");
        state = normalize(obj);
        settle();
        save();
        closeSheet();
        ui.tab = "home";
        ui.change = null;
        render();
        toast("기록을 가져왔어요.");
      } catch (err) { toast("돈구리 기록 파일이 아니에요. 내보낸 .json 파일을 골라 주세요."); }
    };
    reader.readAsText(e.target.files[0]);
  });

  document.addEventListener("click", (e) => {
    const el = e.target.closest("[data-act]");
    if (el && actions[el.dataset.act] && !el.disabled) { e.preventDefault(); actions[el.dataset.act](el); return; }
    if (e.target.id === "sheet") { closeSheet(); render(); }
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !$("#sheet").hidden) { closeSheet(); render(); }
    if (e.key === "Enter" && !$("#sheet").hidden && e.target.matches("input")) {
      const btn = $("#sheet .btn-primary");
      if (btn && !btn.disabled) btn.click();
    }
  });

  /* =====================================================================
     시작 — 지난 날들을 정산합니다
     ===================================================================== */
  try { mode = localStorage.getItem(KEY_MODE) === "demo" ? "demo" : "real"; } catch (e) { mode = "real"; }
  if (mode === "demo") {
    const s = readKey(KEY_DEMO);
    state = s && s.profile ? normalize(s) : null;
    if (!state) { mode = "real"; state = loadReal(); }
  } else state = loadReal();
  if (state && state.profile) {
    const r = settle();
    save();
    render();
    if (r.days) toast(`지난 ${r.days}일 정산 · 한도 안 ${r.kept + r.nospend}일${r.unrecorded ? ` · 미기록 ${r.unrecorded}일` : ""} · 도토리 +${r.acorns}`);
  } else {
    render();
  }
})();
