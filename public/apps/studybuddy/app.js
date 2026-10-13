/* =====================================================================
   🔒 ENGINE — STUDY-BUDDY v0.3 앱 엔진
   스테이지(설명 → 반문 → 도전 → 적용) · 판정 · 보상 장부 · 퀘스트 · 간격 복습 · 연출을 담당합니다.
   문구 · 단원 · 퀴즈는 data/content.js, 숫자는 data/config.js, 색과 움직임은 style.css 에서 바꿉니다.
   ===================================================================== */
(function () {
  "use strict";

  const CONFIG = window.CONFIG;
  const CONTENT = window.CONTENT;
  const $ = (sel) => document.querySelector(sel);

  /* ---------- 날짜 도우미 — 날짜는 모두 "2026-10-13" 같은 글자로 다룹니다 ---------- */
  const pad = (n) => String(n).padStart(2, "0");
  const toYmd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const fromYmd = (s) => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
  const today = () => toYmd(new Date());
  const addDays = (s, n) => { const d = fromYmd(s); d.setDate(d.getDate() + n); return toYmd(d); };
  const WD = ["일", "월", "화", "수", "목", "금", "토"];
  const dayLabel = (s) => { const d = fromYmd(s); return `${d.getMonth() + 1}.${d.getDate()} (${WD[d.getDay()]})`; };
  const weekStart = (s) => { const d = fromYmd(s); return addDays(s, -((d.getDay() + 6) % 7)); };

  /* ---------- 글자 도우미 ---------- */
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  /** 받침에 따라 을/를 · 이/가 · 은/는 고르기 — 괄호 등은 건너뛰고 마지막 한글 글자로 판단 */
  const josa = (word, withJong, noJong) => {
    const s = String(word);
    let c = 0;
    for (let i = s.length - 1; i >= 0; i--) { const k = s.charCodeAt(i); if (k >= 0xac00 && k <= 0xd7a3) { c = k; break; } }
    const jong = c && (c - 0xac00) % 28 !== 0;
    return s + (jong ? withJong : noJong);
  };
  const uid = () => Math.random().toString(36).slice(2, 9);
  const hash = (s) => { let h = 2166136261; for (const ch of String(s)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
  const order = (n, seed) => Array.from({ length: n }, (_, i) => i).sort((a, b) => hash(seed + "#" + a) - hash(seed + "#" + b));

  /* ---------- 판정 도우미 — 띄어쓰기·대소문자를 무시하고 비교합니다 ---------- */
  const norm = (s) => String(s || "").toLowerCase().replace(/\s+/g, "").replace(/[−–—]/g, "-");
  const hit = (t, list) => (list || []).some((k) => { const n = norm(k); return n && t.includes(n); });
  const covers = (t, c) => hit(t, c.keywords) && (!c.with || hit(t, c.with));
  const answerOk = (text, c) => { const t = norm(text); if (hit(t, c.reject)) return false; return hit(t, c.expect) && (!c.expectWith || hit(t, c.expectWith)); };

  /* ---------- 아이콘 ---------- */
  const ICON = {
    map: '<path d="M9 4 3.5 6v14L9 18l6 2 5.5-2V4L15 6z"/><path d="M9 4v14M15 6v14"/>',
    cards: '<rect x="4" y="6" width="13" height="14" rx="2"/><path d="M8 3.5h10a2 2 0 0 1 2 2V17"/>',
    buddy: '<circle cx="12" cy="13" r="7.5"/><path d="M7 7.5 6 3.5l4 2.5M17 7.5l1-4-4 2.5"/><circle cx="9.5" cy="12.5" r=".8"/><circle cx="14.5" cy="12.5" r=".8"/>',
    gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2.8v2.4M12 18.8v2.4M4.2 7.5l2 1.2M17.8 15.3l2 1.2M4.2 16.5l2-1.2M17.8 8.7l2-1.2"/><circle cx="12" cy="12" r="6.5"/>',
    flame: '<path d="M12 3c.8 3 4.5 5 4.5 9.5a4.5 4.5 0 0 1-9 0c0-2.2 1-3.4 2.2-4.5.1 1.8.9 3 2.1 3.3-.5-3 .1-5.6.2-8.3z"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    x: '<path d="M6 6l12 12M18 6L6 18"/>',
    lock: '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
    star: '<path d="M12 3.5l2.6 5.3 5.8.8-4.2 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.2-4.1 5.8-.8z"/>',
    arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    redo: '<path d="M4 12a8 8 0 1 0 2.4-5.7"/><path d="M4 4v4.5h4.5"/>',
    bulb: '<path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2V16h5v-.1c0-.8.4-1.5 1-2A6 6 0 0 0 12 3z"/>',
    note: '<path d="M6 3.5h9l3.5 3.5v13.5H6z"/><path d="M9 11h6M9 15h6"/>',
    gift: '<rect x="4" y="9" width="16" height="11" rx="1.5"/><path d="M12 9v11M4 13h16"/><path d="M12 9c-1.5-3-5-3.5-5-1.2S10 9 12 9c2 0 5 .1 5-1.2S13.5 6 12 9z"/>',
    slope: '<path d="M3.5 19.5h17M4.5 18.5 19 5"/><circle cx="9" cy="14" r="1.2"/>',
    leaf: '<path d="M5 19c0-8 5-13 14-14-1 9-6 14-14 14z"/><path d="M5 19c3-4 6-7 9-9"/>',
    book: '<path d="M4 5.5c3-1.3 5.5-1 8 .8 2.5-1.8 5-2.1 8-.8V19c-3-1.3-5.5-1-8 .8-2.5-1.8-5-2.1-8-.8z"/><path d="M12 6.3v13.5"/>',
    scale: '<path d="M12 4v16M7 20h10M5 7h14"/><path d="M5 7l-2.5 6a3 3 0 0 0 5 0zM19 7l-2.5 6a3 3 0 0 0 5 0z"/>',
    clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
    flag: '<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>'
  };
  const icon = (name, cls) => `<svg class="icon ${cls || ""}" viewBox="0 0 24 24" aria-hidden="true">${ICON[name] || ICON.flag}</svg>`;

  /* =====================================================================
     저장 — 내 기록과 데모 기록은 다른 이름으로 따로 저장합니다
     ===================================================================== */
  const KEY_REAL = CONFIG.STORAGE_KEY;
  const KEY_DEMO = CONFIG.STORAGE_KEY + "_demo";
  const KEY_MODE = CONFIG.STORAGE_KEY + "_mode";

  let state = null;
  let mode = "real";
  const ui = {
    tab: "home", act: null, curAct: null, speech: null, tapN: 0,
    onboardStep: 0, onboardScores: null, retake: false, detected: "curious",
    review: null, reviewPos: 0, reviewSummary: null,
    fxHome: null, overlay: false, timers: [], saveWarned: false, resetArmed: false, matching: false
  };

  function readKey(k) {
    try { const raw = localStorage.getItem(k); return raw ? JSON.parse(raw) : null; } catch (e) { return null; }
  }
  function save() {
    if (!state) return;
    try { localStorage.setItem(mode === "demo" ? KEY_DEMO : KEY_REAL, JSON.stringify(state)); }
    catch (e) {
      if (!ui.saveWarned) { ui.saveWarned = true; toast("이 브라우저에서는 기록이 저장되지 않아요. 창을 닫으면 사라질 수 있어요."); }
    }
  }
  function setMode(m) { mode = m; try { localStorage.setItem(KEY_MODE, m); } catch (e) { /* 무시 */ } }

  function blankState() {
    return {
      v: 3,
      profile: null,                 // { name, type, xp, createdAt, shownLevel }
      equipped: { head: null, neck: null, face: null },
      units: {},                     // 단원별 기록: 별 · 완료 · 내가 고친 설명 · 복습 도장
      reviews: [],                   // { unitId, step, nextDate, round, answered: { 문항번호: 고른 보기 } }
      sessions: [],                  // 플레이 기록 { unitId, date, stars, status: understood | needs_review, hints }
      ledger: {},                    // 지급한 보상: { "clear:math_linear": 50, "review:..": 20, "quest:2026-10-13": 40 }
      xpLog: {},                     // 날짜별 받은 XP (이번 주 XP 계산용)
      activeDays: [],                // 실제로 학습한 날짜 (연속 학습 계산)
      quests: {},                    // { "2026-10-13": { teach, check, apply, review } }
      settings: { motion: "full", sound: false },
      run: null                      // 진행 중인 스테이지 (중간에 나가도 이어서)
    };
  }

  function unitById(id) { return CONTENT.UNITS.find((u) => u.id === id); }
  function unitRec(s, id) {
    // played = 한 번이라도 끝까지 플레이 · cleared = 새 예시 적용(별 3)에 성공해서 다음 장소가 열림
    s.units[id] = s.units[id] || {
      stars: { teach: false, check: false, apply: false }, played: false, cleared: false, clean: false, challenge: false,
      explanation: "", notes: [], weak: [], stamps: 0, mastered: false, lastDate: null
    };
    return s.units[id];
  }

  /** 예전 기록(v0.2)을 v0.3 형식으로 옮깁니다 — XP · 꾸미기 · 복습일은 그대로 */
  function migrate(old) {
    const s = blankState();
    const p = old.profile || {};
    s.profile = { name: p.name || "버디", type: p.type || "curious", xp: Number(p.xp) || 0, createdAt: p.lastLogin || today() };
    s.equipped = Object.assign(s.equipped, old.equipped || {});
    (old.sessions || []).forEach((x) => {
      if (!unitById(x.unitId)) return;
      const rec = unitRec(s, x.unitId);
      const ok = x.status !== "needs_review";
      rec.played = true;
      rec.cleared = true;  // v0.2에서 진행한 단원은 지도에서 열린 상태로 이어 갑니다
      rec.lastDate = x.date || null;
      if (ok) {
        rec.stars.teach = true; rec.stars.check = true;
        s.ledger["clear:" + x.unitId] = CONFIG.REWARD.TEACH_COMPLETE;  // v0.2에서 이미 받은 보상
      }
      s.sessions.push({ id: String(x.id || uid()), unitId: x.unitId, date: x.date || today(), stars: ok ? 2 : 0, status: ok ? "understood" : "needs_review", hints: false });
      if (x.date && !s.activeDays.includes(x.date)) s.activeDays.push(x.date);
    });
    (old.reviews || []).forEach((r) => {
      if (unitById(r.unitId) && !s.reviews.some((x) => x.unitId === r.unitId)) {
        s.reviews.push({ unitId: r.unitId, step: r.step || 0, nextDate: r.nextDate || today(), round: 0, answered: {} });
      }
    });
    return s;
  }

  /** 저장된 기록에 빠진 칸을 기본값으로 채웁니다 */
  function normalize(s) {
    const b = blankState();
    Object.keys(b).forEach((k) => { if (s[k] === undefined || s[k] === null) s[k] = b[k]; });
    s.settings = Object.assign(b.settings, s.settings || {});
    s.equipped = Object.assign(b.equipped, s.equipped || {});
    if (s.profile) {
      s.profile.xp = Number(s.profile.xp) || 0;
      if (!s.profile.shownLevel) s.profile.shownLevel = levelOf(s.profile.xp);
    }
    Object.keys(s.units).forEach((id) => {
      const r = unitRec(blankState(), id);
      s.units[id] = Object.assign(r, s.units[id]);
      s.units[id].stars = Object.assign({ teach: false, check: false, apply: false }, s.units[id].stars);
      if (s.units[id].cleared) s.units[id].played = true;
    });
    s.reviews.forEach((r) => { r.round = r.round || 0; r.answered = r.answered || {}; });
    if (s.run && !unitById(s.run.unitId)) s.run = null;
    s.v = 3;
    return s;
  }

  function loadReal() {
    let s = readKey(KEY_REAL);
    if (!s || !s.profile) {
      for (const k of CONFIG.OLD_STORAGE_KEYS || []) {
        const old = readKey(k);
        if (old && old.profile) { s = migrate(old); break; }
      }
    }
    return s && s.profile ? normalize(s) : null;
  }

  /* =====================================================================
     레벨 · 성장
     ===================================================================== */
  function levelOf(xp) { let lv = 1; CONFIG.LEVELS.forEach((t, i) => { if (xp >= t) lv = i + 1; }); return lv; }
  function levelInfo(xp) {
    const lv = levelOf(xp);
    const base = CONFIG.LEVELS[lv - 1];
    const next = CONFIG.LEVELS[lv];
    return {
      lv, base, next,
      title: CONTENT.LEVEL_TITLES[lv - 1] || CONTENT.LEVEL_TITLES[CONTENT.LEVEL_TITLES.length - 1],
      pct: next ? Math.max(0, Math.min(100, Math.round(((xp - base) / (next - base)) * 100))) : 100,
      toNext: next ? next - xp : 0
    };
  }
  function growthOf(lv) { let g = 1; CONTENT.GROWTH.forEach((x, i) => { if (lv >= x.fromLv) g = i + 1; }); return Math.min(3, g); }
  const unlockLv = (id) => (CONFIG.UNLOCKS && CONFIG.UNLOCKS[id]) || 99;
  const itemsUnlockedBetween = (from, to) => CONTENT.WARDROBE.filter((it) => unlockLv(it.id) > from && unlockLv(it.id) <= to);

  /* =====================================================================
     보상 장부 — 같은 성취(key)로는 한 번만, 더 큰 보상이면 차액만 지급합니다
     ===================================================================== */
  function award(key, amount, label, bucket) {
    const paid = state.ledger[key] || 0;
    if (!amount || amount <= paid) return 0;
    const gain = amount - paid;
    state.ledger[key] = amount;
    state.profile.xp += gain;
    const t = today();
    state.xpLog[t] = (state.xpLog[t] || 0) + gain;
    if (bucket) bucket.push({ label, amount: gain });
    return gain;
  }

  /** 오늘 실제로 학습했다고 기록 (연속 학습은 접속이 아니라 학습한 날로 셉니다) */
  function markActive(bucket) {
    const t = today();
    if (state.activeDays.includes(t)) return;
    state.activeDays.push(t);
    if (state.activeDays.length > 120) state.activeDays = state.activeDays.slice(-120);
    const n = streakCount();
    if (n > 0 && n % CONFIG.REWARD.STREAK_DAYS === 0) award("streak:" + t, CONFIG.REWARD.STREAK_BONUS, `${n}일 연속 학습`, bucket);
    ui.streakPop = true;
  }
  function streakCount() {
    const set = new Set(state.activeDays);
    let d = set.has(today()) ? today() : addDays(today(), -1);
    let n = 0;
    while (set.has(d)) { n += 1; d = addDays(d, -1); }
    return n;
  }

  /* ---------- 오늘의 퀘스트 — 복습이 있는 날은 세 번째를 복습으로 대신할 수 있어요 ---------- */
  function questList() {
    const q = state.quests[today()] || {};
    const reviewDay = dueReviews().length > 0 || q.review;
    return [
      { id: "teach", label: CONTENT.QUESTS.teach, done: !!q.teach },
      { id: "check", label: CONTENT.QUESTS.check, done: !!q.check },
      reviewDay
        ? { id: "apply", label: CONTENT.QUESTS.applyOrReview, done: !!(q.apply || q.review) }
        : { id: "apply", label: CONTENT.QUESTS.apply, done: !!q.apply }
    ];
  }
  function touchQuest(kind, bucket) {
    const t = today();
    state.quests[t] = state.quests[t] || { teach: false, check: false, apply: false, review: false };
    state.quests[t][kind] = true;
    const keys = Object.keys(state.quests).sort();
    if (keys.length > 30) keys.slice(0, keys.length - 30).forEach((k) => delete state.quests[k]);
    if (questList().every((x) => x.done)) award("quest:" + t, CONFIG.REWARD.DAILY_QUEST, "오늘의 퀘스트 완료", bucket);
  }

  const dueReviews = () => state.reviews.filter((r) => r.nextDate <= today() && unitById(r.unitId));

  /* =====================================================================
     지도 — 장소 열림 · 지금 도전할 곳
     ===================================================================== */
  function isOpen(i) {
    if (!CONFIG.LOCK_NEXT_STAGE || i === 0) return true;
    const prev = state.units[CONTENT.UNITS[i - 1].id];
    return !!(prev && prev.cleared);
  }
  const starCount = (stars) => ["teach", "check", "apply"].filter((k) => stars && stars[k]).length;
  function currentIndex() {
    if (state.run) return CONTENT.UNITS.findIndex((u) => u.id === state.run.unitId);
    const U = CONTENT.UNITS;
    let i = U.findIndex((u, k) => isOpen(k) && !(state.units[u.id] && state.units[u.id].cleared));
    if (i !== -1) return i;
    i = U.findIndex((u) => starCount(state.units[u.id] && state.units[u.id].stars) < 3);
    return i;
  }

  /* =====================================================================
     움직임 · 소리
     ===================================================================== */
  const reduced = () => (state && state.settings.motion === "reduce") || (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  let audioCtx = null;
  function sfx(kind) {
    if (!state || !state.settings.sound) return;
    try {
      audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
      const notes = kind === "level" ? [523, 659, 784, 1047] : kind === "star" ? [988] : [659, 880];
      notes.forEach((f, i) => {
        const o = audioCtx.createOscillator();
        const g = audioCtx.createGain();
        const t0 = audioCtx.currentTime + i * 0.09;
        o.type = "triangle"; o.frequency.value = f;
        g.gain.setValueAtTime(0.0001, t0);
        g.gain.exponentialRampToValueAtTime(0.12, t0 + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.2);
        o.connect(g).connect(audioCtx.destination);
        o.start(t0); o.stop(t0 + 0.22);
      });
    } catch (e) { /* 소리 없이 진행 */ }
  }
  function later(fn, ms) { const id = setTimeout(fn, ms); ui.timers.push(id); return id; }
  function clearTimers() { ui.timers.forEach(clearTimeout); ui.timers = []; }

  /* =====================================================================
     버디 그리기
     ===================================================================== */
  const persona = () => CONTENT.PERSONALITIES[state.profile.type] || CONTENT.PERSONALITIES.curious;
  function buddyArt(mood, opts) {
    opts = opts || {};
    const imgs = CONFIG.CHARACTER_IMAGES;
    if (imgs && imgs[mood]) return `<img class="buddy-img" src="${esc(imgs[mood])}" alt="${esc(state.profile.name)}">`;
    const equipped = opts.equipped || state.equipped;
    return window.renderBuddy(mood, state.profile.type, equipped, { growth: opts.growth || growthOf(levelOf(state.profile.xp)) });
  }
  /** 화면의 주인공 버디 — 한 번 재생할 움직임(act)은 이 버디에만 붙습니다 */
  function mainBuddy(mood, extra) {
    const act = ui.curAct || "";
    return `<div class="buddy-avatar-wrap ${act} ${extra || ""}" data-act="tap-buddy" role="button" tabindex="0" aria-label="${esc(state.profile.name)} 쓰다듬기">${buddyArt(mood)}</div>`;
  }

  function toast(msg) {
    const el = $("#toast");
    if (!el) return;
    el.textContent = msg;
    el.classList.remove("show");
    void el.offsetWidth;
    el.classList.add("show");
    clearTimeout(toast.t);
    toast.t = setTimeout(() => el.classList.remove("show"), 2800);
  }
  const gainText = (list) => list.map((g) => `${g.label} +${g.amount} XP`).join(" · ");

  /* =====================================================================
     화면 라우터
     ===================================================================== */
  function render() {
    const app = $("#app");
    app.dataset.motion = reduced() ? "reduce" : "full";
    if (!state || !state.profile || ui.retake) { renderOnboarding(); return; }
    ui.curAct = ui.act;
    ui.act = null;
    const inStage = ui.tab === "stage" && !!state.run;
    if (ui.tab === "stage" && !state.run) ui.tab = "home";
    renderTopbar();
    $("#tabbar").hidden = inStage;
    if (inStage) renderStage();
    else {
      renderTabbar();
      if (ui.tab === "review") renderReview();
      else if (ui.tab === "buddy") renderBuddyTab();
      else renderHome();
    }
    afterRender();
    if (!inStage) maybeLevelUp();
  }

  /** 한 번만 재생하는 효과(연속 학습 불꽃 · 지도 노드 열림)는 그린 뒤 지웁니다 */
  function afterRender() {
    ui.streakPop = false;
    ui.fxHome = null;
  }

  function renderTopbar() {
    const n = streakCount();
    $("#topbar").innerHTML = `
      <div class="brand">
        <span class="logo">STUDY-BUDDY</span>
        ${mode === "demo" ? `<button class="demo-badge" data-act="settings" title="데모 기록으로 보는 중">데모</button>` : ""}
      </div>
      <div class="top-right">
        <span class="streak-chip ${ui.streakPop ? "pop" : ""} ${n ? "" : "off"}" title="실제로 학습한 날 기준">${icon("flame")}<b class="num">${n}</b>일</span>
        <button class="icon-btn" data-act="settings" aria-label="설정">${icon("gear")}</button>
      </div>`;
  }

  function renderTabbar() {
    const due = dueReviews().length;
    const tabs = [["home", "모험", "map"], ["review", "복습", "cards"], ["buddy", "버디", "buddy"]];
    $("#tabbar").innerHTML = tabs.map(([id, label, ic]) => `
      <button class="tab ${ui.tab === id ? "on" : ""}" data-act="tab" data-tab="${id}" ${ui.tab === id ? 'aria-current="page"' : ""}>
        ${icon(ic)}<span>${label}</span>${id === "review" && due ? `<i class="badge num">${due}</i>` : ""}
      </button>`).join("");
  }

  /* =====================================================================
     1. 모험 (홈) — 버디의 방 · 대표 미션 · 지도 · 퀘스트 · 다음 보상
     ===================================================================== */
  function roomHero(mood, speech) {
    const li = levelInfo(state.profile.xp);
    const gr = CONTENT.GROWTH[growthOf(li.lv) - 1];
    return `<section class="room joined" aria-label="${esc(state.profile.name)}의 학습 방">
        <div class="room-bg">${window.renderBuddyRoom(growthOf(li.lv))}</div>
        <div class="speech" role="status">${esc(speech)}</div>
        <div class="room-buddy">${mainBuddy(mood, "idle")}</div>
      </section>
      <section class="who">
        <div class="who-top"><b>${esc(state.profile.name)}</b><span class="lv">Lv.${li.lv} ${esc(li.title)}</span>${gr && gr.name !== li.title ? `<span class="muted small">${esc(gr.name)}</span>` : ""}</div>
        <div class="xpbar" role="progressbar" aria-valuenow="${li.pct}" aria-valuemin="0" aria-valuemax="100"><span style="width:${li.pct}%"></span></div>
        <div class="xp-label small"><span class="num">${state.profile.xp} XP</span><span>${li.next ? `다음 성장까지 <b class="num">${li.toNext} XP</b>` : "최고 레벨"}</span></div>
      </section>`;
  }

  function homeSpeech() {
    if (ui.speech) { const s = ui.speech; ui.speech = null; return s; }
    const P = persona();
    if (state.run) return `아까 하던 ${unitById(state.run.unitId).place}, 이어서 해요!`;
    const due = dueReviews();
    if (due.length) return `지난번에 알려 준 걸 다시 해 볼까요? 복습 ${due.length}개가 기다려요.`;
    const back = state.activeDays.length && !state.activeDays.includes(today()) && !state.activeDays.includes(addDays(today(), -1));
    if (back) return "다시 와 줘서 반가워요! 지도에서 이어서 할 곳을 골라 봐요.";
    return P.greeting;
  }

  function mapHTML() {
    const U = CONTENT.UNITS;
    const rowH = 96;
    const H = U.length * rowH;
    const xs = U.map((_, i) => (i % 2 === 0 ? 30 : 70));
    const ys = U.map((_, i) => i * rowH + 34);
    const cur = currentIndex();
    const openUntil = U.reduce((acc, _, i) => (isOpen(i) ? i : acc), 0);
    const pts = U.map((_, i) => `${xs[i]},${ys[i]}`);
    const solid = pts.slice(0, openUntil + 1).join(" ");
    const nodes = U.map((u, i) => {
      const rec = state.units[u.id];
      const open = isOpen(i);
      const cleared = !!(rec && rec.cleared);
      const sc = starCount(rec && rec.stars);
      const cls = [cleared ? "cleared" : "", i === cur ? "current" : "", open ? "open" : "locked", ui.fxHome && ui.fxHome.unlock === u.id ? "just-opened" : ""].join(" ");
      const stars = [0, 1, 2].map((k) => `<i class="${k < sc ? "on" : ""}">${icon("star")}</i>`).join("");
      return `<div class="node ${cls}" style="left:${xs[i]}%;top:${i * rowH}px">
          <button class="node-btn" data-act="${open ? "open-stage" : "locked"}" data-id="${u.id}" aria-label="${esc(u.place)} ${open ? (cleared ? `별 ${sc}개` : "도전 가능") : "잠김"}">
            ${open ? icon(u.glyph) : icon("lock")}
            ${rec && rec.mastered ? `<span class="mastery" title="마스터 배지">${icon("check")}</span>` : ""}
          </button>
          <div class="node-label"><b>${esc(u.place)}</b><span>${esc(u.subject)}</span></div>
          <div class="node-stars" aria-hidden="true">${stars}</div>
        </div>`;
    }).join("");
    const marker = cur >= 0 ? `<div class="map-buddy" style="left:calc(${xs[cur]}% ${xs[cur] < 50 ? "+ 44px" : "- 88px"});top:${cur * rowH - 4}px">${buddyArt("happy")}</div>` : "";
    return `<div class="map" style="height:${H}px">
        <svg class="map-path" viewBox="0 0 100 ${H}" preserveAspectRatio="none" aria-hidden="true">
          <polyline points="${pts.join(" ")}" class="path-locked" vector-effect="non-scaling-stroke"/>
          <polyline points="${solid}" class="path-open" vector-effect="non-scaling-stroke"/>
        </svg>
        ${nodes}${marker}
      </div>`;
  }

  function missionHTML() {
    const cur = currentIndex();
    const due = dueReviews();
    let title, sub, btn, act, id = "";
    if (state.run) {
      const u = unitById(state.run.unitId);
      title = `${u.place} 이어서 하기`;
      sub = `${stepLabel(state.run.step)} 단계부터 이어서 해요.`;
      btn = "이어서 하기"; act = "open-stage"; id = u.id;
    } else if (cur >= 0) {
      const u = CONTENT.UNITS[cur];
      const rec = state.units[u.id];
      const replay = rec && rec.cleared;
      const retry = rec && rec.played && !rec.cleared;
      title = replay ? `${u.place}에서 남은 별 모으기` : retry ? `${u.place} 다시 도전하기` : `${u.place}에 도전하기`;
      sub = retry ? "새 예시 적용(별 3)에 성공하면 다음 장소가 열려요." : u.goal;
      btn = replay || retry ? "다시 도전하기" : "도전하기"; act = "open-stage"; id = u.id;
    } else {
      title = "모든 장소의 별을 모았어요";
      sub = due.length ? "복습으로 기억을 단단하게 만들어요." : "다음 복습일에 다시 만나요. 지도에서 아무 장소나 다시 도전할 수 있어요.";
      btn = due.length ? "복습하러 가기" : "버디 보러 가기"; act = "tab"; id = due.length ? "review" : "buddy";
    }
    return `<section class="card mission">
        <div class="eyebrow">오늘의 미션</div>
        <h2>${esc(title)}</h2>
        <p class="muted">${esc(sub)}</p>
        <button class="btn-game" data-act="${act}" ${act === "tab" ? `data-tab="${id}"` : `data-id="${id}"`}>${btn}${icon("arrow")}</button>
        ${due.length && act !== "tab" ? `<button class="due-row" data-act="tab" data-tab="review">${icon("cards")}<span>복습 ${due.length}개가 기다려요</span>${icon("arrow")}</button>` : ""}
      </section>`;
  }

  function questsHTML() {
    const list = questList();
    const done = list.filter((q) => q.done).length;
    const paid = state.ledger["quest:" + today()];
    return `<section class="card">
        <div class="card-head"><div class="card-title">오늘의 퀘스트</div><span class="small ${paid ? "good" : "muted"}">${paid ? "보상 받음" : `${done}/3 · 모두 하면 +${CONFIG.REWARD.DAILY_QUEST} XP`}</span></div>
        <ul class="quests">${list.map((q) => `<li class="${q.done ? "done" : ""}"><span class="tick">${q.done ? icon("check") : ""}</span>${esc(q.label)}</li>`).join("")}</ul>
      </section>`;
  }

  function nextRewardHTML() {
    const lv = levelOf(state.profile.xp);
    const item = CONTENT.WARDROBE.filter((it) => unlockLv(it.id) > lv).sort((a, b) => unlockLv(a.id) - unlockLv(b.id))[0];
    if (!item) return "";
    const L = unlockLv(item.id);
    const need = CONFIG.LEVELS[L - 1] - state.profile.xp;
    const preview = window.renderBuddy("happy", state.profile.type, Object.assign({}, state.equipped, { [item.slot]: item.id }), { growth: growthOf(L) });
    return `<section class="card next-reward">
        <div class="nr-art">${preview}</div>
        <div><div class="eyebrow">다음 보상</div><b>Lv.${L}이 되면 ${esc(josa(item.name, "이", "가"))} 열려요</b>
        <p class="small muted">앞으로 <span class="num">${Math.max(0, need)}</span> XP · 별 3개 단원 완료는 +${CONFIG.REWARD.TEACH_COMPLETE} XP</p></div>
      </section>`;
  }

  function renderHome() {
    const mood = state.run ? "listening" : dueReviews().length ? "surprised" : "happy";
    $("#screen").innerHTML = `<div class="stack">
      ${roomHero(mood, homeSpeech())}
      ${missionHTML()}
      <section class="card map-card"><div class="card-head"><div class="card-title">학습 지도</div><span class="small muted">${CONFIG.LOCK_NEXT_STAGE ? "앞 장소를 끝내면 다음 장소가 열려요" : "원하는 장소부터 도전해요"}</span></div>${mapHTML()}</section>
      ${questsHTML()}
      ${nextRewardHTML()}
    </div>`;
  }

  /* =====================================================================
     2. 스테이지 — 입장 → 설명 → (빠진 개념 되묻기) → 반문 → 도전 → 적용 → 결과
     ===================================================================== */
  const STEP_GROUP = { intro: 0, write: 1, memo: 1, probe: 1, probeDone: 1, check: 2, challenge: 3, follow: 3, apply: 4 };
  function stepLabel(step) { return { intro: "입장", write: "설명", memo: "설명", probe: "설명", probeDone: "설명", check: "반문", challenge: "도전", follow: "도전", apply: "적용" }[step] || "설명"; }
  const freshQ = () => ({ attempts: 0, wrong: [], fb: null, lastText: "" });

  function startStage(id, fresh) {
    const i = CONTENT.UNITS.findIndex((u) => u.id === id);
    if (i === -1) return;
    if (!isOpen(i)) { toast("앞 장소를 먼저 끝내면 열려요."); return; }
    if (fresh || !state.run || state.run.unitId !== id) {
      if (!fresh && state.run && state.run.unitId !== id) toast(`하던 ${unitById(state.run.unitId).place}는 다음에 처음부터 다시 해요.`);
      const u = CONTENT.UNITS[i];
      const seed = uid();
      const t = u.challenge && u.challenge.targets ? u.challenge.targets[hash(seed) % u.challenge.targets.length] : null;
      state.run = {
        unitId: id, step: "intro", seed, xpStart: state.profile.xp, gains: [],
        covered: [], missing: [], probeIdx: 0, trap: null, explanation: "",
        hints: false, stars: { teach: false, check: false, apply: false },
        notes: [], weak: [], q: freshQ(), target: t, a: 1, b: 0
      };
      ui.act = "is-hop";
    }
    save();
    ui.tab = "stage";
    render();
    $("#screen").scrollTop = 0;
  }

  function stageSteps(unit) {
    const s = [["설명", 1], ["반문", 2]];
    if (unit.challenge) s.push(["도전", 3]);
    s.push(["적용", 4]);
    return s;
  }

  function renderStage() {
    const run = state.run;
    const unit = unitById(run.unitId);
    const g = STEP_GROUP[run.step] || 0;
    const steps = stageSteps(unit).map(([label, k]) => `<li class="${k < g ? "done" : k === g ? "on" : ""}">${label}</li>`).join("");
    const view = stageView(run, unit);
    $("#screen").innerHTML = `<div class="stack stage">
      <div class="stage-head">
        <button class="icon-btn" data-act="stage-exit" aria-label="지도로 돌아가기">${icon("x")}</button>
        <div class="stage-title"><b>${esc(unit.place)}</b><span>${esc(unit.subject)} · ${esc(unit.title)}</span></div>
        ${CONFIG.AI_MODE === "demo" ? `<span class="tag" title="정해 둔 질문과 키워드로 대화하는 데모 버디예요">데모 버디</span>` : ""}
      </div>
      <ol class="stage-steps" aria-label="스테이지 진행">${steps}</ol>
      <section class="buddy-stage">
        <div class="speech" role="status">${view.speech}</div>
        ${mainBuddy(view.mood)}
      </section>
      ${view.body}
    </div>`;
  }

  function stageView(run, unit) {
    const P = persona();
    const q = run.q;
    const terms = unit.concepts.map((c) => c.term);

    if (run.step === "intro") {
      const rec = state.units[unit.id];
      const best = rec ? rec.stars : {};
      const crit = [["teach", "내 말로 개념 설명하기"], ["check", "버디의 반문 해결하기"], ["apply", "새 예시에 적용하기"]];
      return {
        mood: "happy",
        speech: esc(`${unit.place}에 도착했어요! 오늘은 ‘${unit.title}’ 차례예요.`),
        body: `<section class="card">
            <div class="eyebrow">오늘의 목표</div>
            <p class="goal">${esc(unit.goal)}</p>
            <ul class="crit">${crit.map(([k, label], i) => `<li class="${best[k] ? "on" : ""}">${icon("star")}<span>별 ${i + 1} · ${label}</span></li>`).join("")}</ul>
            <button class="btn-game" data-act="stage-next">시작하기${icon("arrow")}</button>
            ${run.covered.length || run.explanation ? `<button class="btn-text" data-act="stage-restart">처음부터 다시</button>` : ""}
          </section>`
      };
    }

    if (run.step === "write") {
      const demoEx = mode === "demo" && CONTENT.DEMO_EXPLANATIONS && CONTENT.DEMO_EXPLANATIONS[unit.id];
      return {
        mood: "listening",
        speech: esc(`선생님, ${josa(unit.title, "을", "를")} 알려 주세요! 아래 개념이 궁금해요.`),
        body: `<section class="card">
            <div class="card-head"><div class="card-title">${icon("note")}버디에게 설명하기</div><span class="small muted">별 1</span></div>
            <div class="chips">${terms.map((t) => `<span class="chip">${esc(t)}</span>`).join("")}</div>
            <textarea id="teach-input" class="textarea" rows="6" maxlength="600" placeholder="${esc(unit.placeholder || "내 말로 설명해 주세요.")}">${esc(run.explanation || "")}</textarea>
            <div class="write-foot small"><span id="teach-err" class="err" role="alert"></span><span class="muted num" id="teach-count">${(run.explanation || "").length}자 / ${CONFIG.MIN_EXPLAIN_LENGTH}자 이상</span></div>
            ${demoEx ? `<button class="btn-text" data-act="demo-fill">예시 설명 넣기 (데모)</button>` : ""}
            <button class="btn-game" data-act="submit-teach">버디에게 설명하기${icon("arrow")}</button>
          </section>`
      };
    }

    if (run.step === "memo") {
      const all = run.missing.length === 0;
      const trap = run.trap ? run.trap : null;
      const speech = trap || (all ? P.correct_msg : `${P.confused_msg} ${josa(run.missing.map((id) => unit.concepts.find((c) => c.id === id).term).join(", "), "은", "는")} 아직 잘 모르겠어요.`);
      return {
        mood: all && !trap ? "understood" : "confused",
        speech: esc(speech),
        body: `<section class="card memo">
            <div class="card-head"><div class="card-title">${icon("note")}버디의 메모</div>${all ? `<span class="star-badge pop">${icon("star")}별 1</span>` : ""}</div>
            <blockquote>${esc(run.explanation.length > 90 ? run.explanation.slice(0, 90) + "…" : run.explanation)}</blockquote>
            <ul class="memo-list">${unit.concepts.map((c, i) => {
              const ok = run.covered.includes(c.id);
              return `<li class="${ok ? "ok" : "miss"}" style="--d:${i * 140}ms"><span class="stamp">${ok ? icon("check") : "?"}</span><b>${esc(c.term)}</b><span class="small muted">${ok ? "설명했어요" : "버디가 물어볼게요"}</span></li>`;
            }).join("")}</ul>
            <button class="btn-game" data-act="stage-next">${all ? "다음: 버디의 반문" : "버디의 질문 듣기"}${icon("arrow")}</button>
          </section>`
      };
    }

    if (run.step === "probe") {
      const c = unit.concepts.find((x) => x.id === run.missing[run.probeIdx]);
      const n = run.missing.length;
      let mood = "confused", speech = `${P.askPrefix} ${c.ask}`, body;
      const head = `<div class="card-head"><div class="card-title">${icon("bulb")}빠진 개념 채우기</div><span class="small muted num">${run.probeIdx + 1}/${n} · ${esc(c.term)}</span></div>`;
      if (q.fb === "good") {
        mood = "understood"; speech = P.correct_msg;
        body = `${head}<div class="fb good">${icon("check")}<div><b>버디가 이해했어요</b><p>${esc(c.explain)}</p></div></div>
          <button class="btn-game" data-act="stage-next">다음${icon("arrow")}</button>`;
      } else if (q.fb === "reveal") {
        mood = "listening"; speech = P.revealLine;
        body = `${head}<div class="fb reveal">${icon("note")}<div><b>정리 카드</b><p>${esc(c.explain)}</p><p class="small muted">이 개념은 복습에서 다시 만나요.</p></div></div>
          <button class="btn-game" data-act="stage-next">다음${icon("arrow")}</button>`;
      } else {
        if (q.attempts > 0) { mood = "happy"; speech = `${P.hintLine} ${c.ask}`; }
        body = `${head}
          ${q.attempts > 0 ? `<div class="fb hint unfold">${icon("bulb")}<div><b>힌트</b><p>${esc(c.hint)}</p><p class="small muted">내 답: ${esc(q.lastText)}</p></div></div>` : ""}
          <input id="probe-input" class="input" placeholder="버디에게 답해 주세요" autocomplete="off" maxlength="200">
          <span id="probe-err" class="err small" role="alert"></span>
          <button class="btn-game" data-act="submit-probe">답해 주기${icon("arrow")}</button>`;
      }
      return { mood, speech: esc(speech), body: `<section class="card">${body}</section>` };
    }

    if (run.step === "probeDone") {
      const ok = run.stars.teach;
      return {
        mood: ok ? "understood" : "listening",
        speech: esc(ok ? `선생님 덕분에 ${josa(terms.join(", "), "을", "를")} 다 정리했어요!` : `정리 카드에 적어 둔 ${josa(run.weak.join(", "), "은", "는")} 복습 때 다시 해요. 반문으로 가 볼까요?`),
        body: `<section class="card memo">
            <div class="card-head"><div class="card-title">${icon("note")}설명 정리</div>${ok ? `<span class="star-badge pop">${icon("star")}별 1</span>` : `<span class="small muted">별 1은 다음 도전에서</span>`}</div>
            <ul class="memo-list">${unit.concepts.map((c, i) => {
              const weak = run.weak.includes(c.term);
              const fixed = run.notes.some((x) => x.term === c.term);
              return `<li class="${weak ? "miss" : "ok"}" style="--d:${i * 120}ms"><span class="stamp">${weak ? "?" : icon("check")}</span><b>${esc(c.term)}</b><span class="small muted">${weak ? "복습에서 다시" : fixed ? "보완했어요" : "설명했어요"}</span></li>`;
            }).join("")}</ul>
            <button class="btn-game" data-act="stage-next">다음: 버디의 반문${icon("arrow")}</button>
          </section>`
      };
    }

    if (run.step === "check" || run.step === "follow" || run.step === "apply") return choiceView(run, unit, run.step);
    if (run.step === "challenge") return challengeView(run, unit);
    return { mood: "listening", speech: "", body: "" };
  }

  function qOf(kind, unit) { return kind === "check" ? unit.check : kind === "apply" ? unit.apply : unit.challenge.follow; }

  function choiceView(run, unit, kind) {
    const P = persona();
    const Q = qOf(kind, unit);
    const q = run.q;
    const ord = order(Q.options.length, run.seed + kind);
    const resolved = !!q.fb;
    let mood = kind === "check" ? "confused" : "happy";
    let speech = kind === "check" ? `${P.askPrefix} ${Q.q}` : kind === "follow" ? `길이 완성됐어요! 그런데 궁금해요. ${Q.q}` : "제가 새 문제를 풀어 봤어요. 확인해 주실래요?";
    if (q.fb === "good") { mood = "understood"; speech = P.correct_msg; }
    else if (q.fb === "reveal") { mood = "listening"; speech = P.revealLine; }
    else if (q.attempts > 0) { mood = "happy"; speech = P.hintLine; }

    const last = q.wrong.length ? Q.options[q.wrong[q.wrong.length - 1]] : null;
    const opts = ord.map((i) => {
      const o = Q.options[i];
      const cls = q.wrong.includes(i) ? "wrong" : resolved && o.correct ? "correct" : "";
      return `<button class="opt ${cls}" data-act="choose" data-i="${i}" ${resolved || q.wrong.includes(i) ? "disabled" : ""}>${esc(o.text)}</button>`;
    }).join("");
    const title = kind === "check" ? `${icon("bulb")}버디의 반문` : kind === "follow" ? `${icon("bulb")}왜 그럴까?` : `${icon("note")}새 예시에 적용`;
    const starTag = kind === "check" ? "별 2" : kind === "apply" ? "별 3" : "도전";
    const apply = kind === "apply" ? `
      <div class="problem"><span class="eyebrow">새 문제</span><b>${esc(Q.problem)}</b></div>
      <div class="solution unfold"><span class="eyebrow">${esc(state.profile.name)}의 풀이</span><p>${esc(Q.buddy)}</p></div>`
      : kind === "follow" ? `${graphSVG(run)}<div class="eq num">${fmtLine(run.target.a, run.target.b)}</div>` : "";
    const feedback = q.fb === "good"
      ? `<div class="fb good">${icon("check")}<div><b>${kind === "apply" ? "버디의 풀이를 바로잡았어요" : "맞아요"}</b><p>${esc(Q.explain)}</p></div></div>`
      : q.fb === "reveal"
        ? `<div class="fb reveal">${icon("note")}<div><b>정리 카드</b>${last && last.why ? `<p class="small muted">${esc(last.why)}</p>` : ""}<p>${esc(Q.explain)}</p></div></div>`
        : q.attempts > 0
          ? `<div class="fb hint unfold">${icon("bulb")}<div>${last && last.why ? `<b>${esc(last.why)}</b>` : "<b>다시 생각해 봐요</b>"}${Q.hint ? `<p>힌트: ${esc(Q.hint)}</p>` : ""}</div></div>`
          : "";
    const next = resolved ? `<button class="btn-game" data-act="stage-next">${kind === "apply" ? "결과 보기" : "다음"}${icon("arrow")}</button>` : "";
    return {
      mood, speech: esc(speech),
      body: `<section class="card">
          <div class="card-head"><div class="card-title">${title}</div><span class="small muted">${starTag}</span></div>
          ${apply}
          <p class="q">${esc(Q.q)}</p>
          <div class="opts">${opts}</div>
          ${feedback}${next}
        </section>`
    };
  }

  /* ---------- 도전: 일차함수 그래프 만들기 (슬라이더) ---------- */
  const fmtNum = (n) => (n < 0 ? "−" : "") + String(Math.abs(n));
  function fmtLine(a, b) {
    let s = "y = ";
    if (a === 0) return s + fmtNum(b);
    s += a === 1 ? "x" : a === -1 ? "−x" : fmtNum(a) + "x";
    if (b > 0) s += " + " + b; else if (b < 0) s += " − " + Math.abs(b);
    return s;
  }
  const GX = (x) => 110 + x * 20;
  const GY = (y) => 110 - y * 20;
  function graphSVG(run) {
    const t = run.target;
    let grid = "";
    for (let k = -5; k <= 5; k++) {
      grid += `<path d="M${GX(k)} 10 V210 M10 ${GY(k)} H210" class="${k === 0 ? "axis" : "grid"}"/>`;
    }
    const line = (a, b, cls, id) => `<line ${id ? `id="${id}"` : ""} class="${cls}" x1="${GX(-6)}" y1="${GY(a * -6 + b)}" x2="${GX(6)}" y2="${GY(a * 6 + b)}"/>`;
    // 길이 완성되면 버디가 직선을 따라 걸어갑니다 (움직임 줄이기에서는 도착 지점에 바로 표시)
    const x0 = Math.max(-4.5, Math.min(4.5, t.a === 0 ? -4.5 : (-4.5 - t.b) / t.a));
    const x1 = Math.max(-4.5, Math.min(4.5, t.a === 0 ? 4.5 : (4.5 - t.b) / t.a));
    const [xa, xb] = x0 < x1 ? [x0, x1] : [x1, x0];
    const walker = run.step === "follow" ? `<g class="walker" ${reduced() ? `transform="translate(${GX(xb)} ${GY(t.a * xb + t.b)})"` : ""}>
        <circle r="9" fill="${persona().color}"/><circle cx="-3" cy="-2" r="1.6" fill="#fff"/><circle cx="3" cy="-2" r="1.6" fill="#fff"/>
        ${reduced() ? "" : `<animateMotion dur="1.8s" fill="freeze" path="M${GX(xa)} ${GY(t.a * xa + t.b)} L${GX(xb)} ${GY(t.a * xb + t.b)}"/>`}
      </g>` : "";
    return `<svg class="graph" viewBox="0 0 220 220" role="img" aria-label="좌표평면 그래프">
        <defs><clipPath id="gclip"><rect x="10" y="10" width="200" height="200" rx="6"/></clipPath></defs>
        <rect x="10" y="10" width="200" height="200" rx="6" class="plane"/>
        <g clip-path="url(#gclip)">
          ${grid}
          ${line(t.a, t.b, "target")}
          ${line(run.a, run.b, "mine", "g-line")}
          <circle id="g-dot" cx="${GX(0)}" cy="${GY(run.b)}" r="4.5" class="dot"/>
          ${walker}
        </g>
      </svg>`;
  }
  function challengeView(run, unit) {
    const ch = unit.challenge;
    const okA = run.a === run.target.a;
    const okB = run.b === run.target.b;
    return {
      mood: "listening",
      speech: esc(ch.intro),
      body: `<section class="card">
          <div class="card-head"><div class="card-title">${icon("slope")}기울기 언덕 길 만들기</div><span class="small muted">도전</span></div>
          ${graphSVG(run)}
          <div class="eq num" id="g-eq">${fmtLine(run.a, run.b)}</div>
          <div class="sliders">
            <label class="sl"><span>a (기울기)</span><input type="range" id="sl-a" min="-3" max="3" step="0.5" value="${run.a}" aria-label="기울기 a"><b class="num" id="sl-a-v">${fmtNum(run.a)}</b></label>
            <label class="sl"><span>b (y절편)</span><input type="range" id="sl-b" min="-4" max="4" step="1" value="${run.b}" aria-label="y절편 b"><b class="num" id="sl-b-v">${fmtNum(run.b)}</b></label>
          </div>
          <div class="sl-status small" id="sl-status" role="status">${slStatus(okA, okB)}</div>
          <p class="small muted">점선이 y축과 만나는 점, 그리고 오른쪽으로 한 칸 갈 때 몇 칸 오르내리는지 보세요.</p>
        </section>`
    };
  }
  function slStatus(okA, okB) {
    return `<span class="${okA ? "ok" : ""}">${okA ? icon("check") : ""}기울기 ${okA ? "맞아요" : "조정 중"}</span><span class="${okB ? "ok" : ""}">${okB ? icon("check") : ""}y절편 ${okB ? "맞아요" : "조정 중"}</span>`;
  }
  function onSlider() {
    const run = state.run;
    if (!run || run.step !== "challenge") return;
    run.a = Number($("#sl-a").value);
    run.b = Number($("#sl-b").value);
    const l = $("#g-line");
    l.setAttribute("y1", GY(run.a * -6 + run.b));
    l.setAttribute("y2", GY(run.a * 6 + run.b));
    $("#g-dot").setAttribute("cy", GY(run.b));
    $("#g-eq").textContent = fmtLine(run.a, run.b);
    $("#sl-a-v").textContent = fmtNum(run.a);
    $("#sl-b-v").textContent = fmtNum(run.b);
    const okA = run.a === run.target.a;
    const okB = run.b === run.target.b;
    $("#sl-status").innerHTML = slStatus(okA, okB);
    if (okA && okB && !ui.matching) {
      ui.matching = true;
      document.querySelectorAll(".sliders input").forEach((x) => { x.disabled = true; });
      later(() => {
        ui.matching = false;
        run.step = "follow";
        run.q = freshQ();
        ui.act = "is-correct";
        sfx("ok");
        save();
        render();
      }, reduced() ? 0 : 450);
    }
  }

  /* ---------- 단계 이동 ---------- */
  function stageNext() {
    const run = state.run;
    const unit = unitById(run.unitId);
    const s = run.step;
    if (s === "intro") run.step = "write";
    else if (s === "memo") { run.step = run.missing.length ? "probe" : "check"; run.probeIdx = 0; ui.act = "is-tilt"; }
    else if (s === "probe") {
      run.probeIdx += 1;
      if (run.probeIdx >= run.missing.length) {
        run.stars.teach = run.weak.length === 0;
        run.step = "probeDone";
        if (run.stars.teach) { ui.act = "is-correct"; sfx("star"); }
      } else ui.act = "is-tilt";
    }
    else if (s === "probeDone") { run.step = "check"; ui.act = "is-tilt"; }
    else if (s === "check") run.step = unit.challenge ? "challenge" : "apply";
    else if (s === "follow") run.step = "apply";
    else if (s === "apply") { finishRun(); return; }
    run.q = freshQ();
    save();
    render();
    $("#screen").scrollTop = 0;
  }

  /* ---------- ① 설명 판정 ---------- */
  function submitTeach() {
    const run = state.run;
    const unit = unitById(run.unitId);
    const el = $("#teach-input");
    const text = el.value.trim();
    const err = $("#teach-err");
    if (text.length < CONFIG.MIN_EXPLAIN_LENGTH) {
      err.textContent = `버디가 이해할 수 있게 ${CONFIG.MIN_EXPLAIN_LENGTH}자 이상 설명해 주세요. (지금 ${text.length}자)`;
      el.focus();
      return;
    }
    const t = norm(text);
    // 단어만 나열한 설명은 문장으로 다시 부탁합니다
    let rest = t;
    unit.concepts.forEach((c) => [].concat(c.keywords || [], c.with || []).forEach((k) => { rest = rest.split(norm(k)).join(""); }));
    rest = rest.replace(/[^가-힣a-z]/g, "");
    if (rest.length < 8) {
      ui.act = "is-tilt";
      run.explanation = text;
      save();
      render();
      $("#teach-err").textContent = "단어만으로는 어떻게 이어지는지 모르겠어요. 문장으로 설명해 주세요!";
      return;
    }
    run.explanation = text;
    run.covered = unit.concepts.filter((c) => covers(t, c)).map((c) => c.id);
    run.missing = unit.concepts.filter((c) => !run.covered.includes(c.id)).map((c) => c.id);
    const trap = (unit.traps || []).find((x) => hit(t, x.keywords));
    run.trap = trap ? trap.say : null;
    run.weak = [];
    run.notes = [];
    run.stars.teach = run.missing.length === 0;
    unitRec(state, unit.id).explanation = text;
    touchQuest("teach", run.gains);
    markActive(run.gains);
    run.step = "memo";
    ui.act = run.stars.teach && !run.trap ? "is-correct" : "is-nod";
    if (run.stars.teach) sfx("star");
    save();
    render();
  }

  /* ---------- ① 빠진 개념 되묻기 판정 ---------- */
  function submitProbe() {
    const run = state.run;
    const unit = unitById(run.unitId);
    const c = unit.concepts.find((x) => x.id === run.missing[run.probeIdx]);
    const el = $("#probe-input");
    const text = el.value.trim();
    if (text.length < 2) { $("#probe-err").textContent = "답을 입력해 주세요."; el.focus(); return; }
    const q = run.q;
    if (answerOk(text, c)) {
      q.fb = "good";
      run.notes.push({ term: c.term, text });
      ui.act = "is-correct";
      sfx("ok");
      markActive(run.gains);
    } else {
      q.attempts += 1;
      q.lastText = text;
      if (q.attempts >= 2) { q.fb = "reveal"; run.weak.push(c.term); ui.act = "is-nod"; }
      else { run.hints = true; ui.act = "is-cheer"; }
    }
    save();
    render();
    const inp = $("#probe-input");
    if (inp) inp.focus();
  }

  /* ---------- ②③④ 보기 고르기 판정 ---------- */
  function choose(i) {
    const run = state.run;
    const unit = unitById(run.unitId);
    const kind = run.step;
    const Q = qOf(kind, unit);
    const q = run.q;
    if (q.fb || q.wrong.includes(i)) return;
    const o = Q.options[i];
    if (o.correct) {
      q.fb = "good";
      if (kind === "check") { run.stars.check = true; touchQuest("check", run.gains); }
      if (kind === "apply") { run.stars.apply = true; touchQuest("apply", run.gains); }
      if (kind === "follow") unitRec(state, unit.id).challenge = true;
      markActive(run.gains);
      ui.act = "is-correct";
      sfx(kind === "follow" ? "ok" : "star");
    } else {
      q.attempts += 1;
      q.wrong.push(i);
      if (q.attempts >= 2) { q.fb = "reveal"; ui.act = "is-nod"; if (kind === "follow") unitRec(state, unit.id).challenge = true; }
      else { if (kind !== "follow") run.hints = true; ui.act = "is-tilt"; }
    }
    save();
    render();
  }

  /* ---------- 스테이지 결과 확정 → 저장 → 연출 ---------- */
  function finishRun() {
    const run = state.run;
    const unit = unitById(run.unitId);
    const rec = unitRec(state, unit.id);
    const lvBefore = levelOf(run.xpStart);
    const bestBefore = Object.assign({}, rec.stars);
    const newStars = [];
    ["teach", "check", "apply"].forEach((k) => { if (run.stars[k] && !rec.stars[k]) { rec.stars[k] = true; newStars.push(k); } });
    const wasCleared = rec.cleared;
    rec.played = true;
    if (rec.stars.apply) rec.cleared = true;   // 새 예시 적용에 성공해야 다음 장소가 열립니다
    const firstClear = !wasCleared && rec.cleared;
    rec.lastDate = today();
    run.notes.forEach((n) => { rec.notes = rec.notes.filter((x) => x.term !== n.term); rec.notes.push(n); });
    rec.weak = run.weak.slice();

    const all3 = run.stars.teach && run.stars.check && run.stars.apply;
    if (all3) {
      award("clear:" + unit.id, run.hints ? CONFIG.REWARD.RETRY_SUCCESS : CONFIG.REWARD.TEACH_COMPLETE, run.hints ? "힌트로 보완해 단원 완료" : "단원 완료", run.gains);
      if (!run.hints) rec.clean = true;
    }

    let r = state.reviews.find((x) => x.unitId === unit.id);
    if (!r) { r = { unitId: unit.id, step: 0, nextDate: addDays(today(), 1), round: 0, answered: {} }; state.reviews.push(r); }
    else if (!all3 && r.nextDate > addDays(today(), 1)) r.nextDate = addDays(today(), 1);

    state.sessions.push({ id: uid(), unitId: unit.id, date: today(), stars: starCount(run.stars), status: all3 ? "understood" : "needs_review", hints: run.hints });
    if (state.sessions.length > 60) state.sessions = state.sessions.slice(-60);

    const idx = CONTENT.UNITS.findIndex((u) => u.id === unit.id);
    const nextUnit = CONTENT.UNITS[idx + 1] && isOpen(idx + 1) ? CONTENT.UNITS[idx + 1] : null;
    const unlocked = firstClear && nextUnit && CONFIG.LOCK_NEXT_STAGE ? nextUnit.id : null;
    const xpAfter = state.profile.xp;
    const lvAfter = levelOf(xpAfter);
    // 스테이지 도중 이미 축하한 레벨(중간에 나갔다 온 경우)은 다시 축하하지 않습니다
    const shownBefore = Math.max(lvBefore, state.profile.shownLevel || 1);
    const res = {
      unit, runStars: Object.assign({}, run.stars), bestBefore, newStars, gains: run.gains.slice(),
      xpBefore: run.xpStart, xpAfter, lvBefore, lvAfter, celebrate: lvAfter > shownBefore,
      items: itemsUnlockedBetween(shownBefore, lvAfter),
      nextUnit, unlocked, cleared: rec.cleared, reviewDate: r.nextDate, all3, hints: run.hints, weak: run.weak.slice()
    };
    state.profile.shownLevel = Math.max(state.profile.shownLevel || 1, lvAfter);
    state.run = null;
    save();
    ui.fxHome = unlocked ? { unlock: unlocked } : null;
    showResult(res);
  }

  /* =====================================================================
     결과 화면 — 버디 반응 → 별 → 경험치 → 레벨업 · 해금 순서로 한 번 재생
     (보상은 이미 저장되어 있어서 건너뛰거나 새로고침해도 그대로입니다)
     ===================================================================== */
  function showResult(res) {
    clearTimers();
    const P = persona();
    const u = res.unit;
    const keys = ["teach", "check", "apply"];
    const labels = ["설명", "반문", "적용"];
    const liB = levelInfo(res.xpBefore);
    const liA = levelInfo(res.xpAfter);
    const gained = res.xpAfter - res.xpBefore;
    const crossed = res.lvAfter > res.lvBefore;   // 게이지가 다음 레벨로 넘어가는지
    const lvUp = res.celebrate;                   // 레벨업 축하를 보여 줄지
    const growthUp = growthOf(res.lvAfter) > growthOf(res.lvBefore);
    const line = res.all3 ? u.learnedLine : `별 ${starCount(res.runStars)}개! 남은 별은 다시 도전해서 모아요.`;
    const title = res.all3 ? `${u.place} 정복` : `${u.place} 탐험 완료`;
    const item = res.items[0];
    const ov = $("#overlay");
    ov.innerHTML = `<div class="result" role="dialog" aria-modal="true" aria-label="${esc(title)}">
        <button class="skip" data-act="fx-skip">건너뛰기</button>
        <div class="res-head"><span class="eyebrow">${esc(u.subject)} · ${esc(u.title)}</span><h2>${esc(title)}</h2></div>
        <div class="res-buddy"><div class="buddy-avatar-wrap is-correct">${buddyArt(res.all3 ? "understood" : "happy")}</div><div class="speech">${esc(line)}</div></div>
        <div class="res-stars">${keys.map((k, i) => {
          const on = res.bestBefore[k] || res.runStars[k];
          const fresh = res.newStars.includes(k);
          return `<div class="star-slot ${on && !fresh ? "on" : ""} ${fresh ? "new" : ""}" data-star="${k}">${icon("star")}<span>${labels[i]}</span></div>`;
        }).join("")}</div>
        <ul class="res-learned">${u.learned.map((l, i) => `<li class="${res.runStars[keys[i]] ? "ok" : ""}">${res.runStars[keys[i]] ? icon("check") : "·"}<span>${esc(res.runStars[keys[i]] ? l : l + " — 다음 도전에서")}</span></li>`).join("")}</ul>
        <div class="res-xp">
          <div class="gains">${res.gains.length ? res.gains.map((g) => `<span class="gain">${esc(g.label)} <b>+${g.amount} XP</b></span>`).join("") : `<span class="gain muted">${res.all3 ? "이미 받은 보상이에요" : "별 3개를 모으면 단원 완료 보상"}</span>`}</div>
          <div class="xp-fly num" aria-hidden="true">+${gained} XP</div>
          <div class="who-top"><span class="lv" id="res-lv">Lv.${liB.lv} ${esc(liB.title)}</span><span class="num small" id="res-xpn">${res.xpBefore} XP</span></div>
          <div class="xpbar"><span id="res-bar" style="width:${liB.pct}%"></span></div>
        </div>
        <div class="levelup" id="res-levelup" hidden>
          <div class="confetti" aria-hidden="true">${Array.from({ length: 22 }, (_, i) => `<i style="--x:${(hash(i + "x") % 100)}%;--r:${hash(i + "r") % 360}deg;--d:${(hash(i + "d") % 500)}ms;--c:${["#6D4AE0", "#2BB5A0", "#F6C343", "#E07A3F"][i % 4]}"></i>`).join("")}</div>
          <span class="eyebrow">레벨 업</span>
          <h3>Lv.${liA.lv} ${esc(liA.title)}</h3>
          ${growthUp ? `<p class="small">${esc(CONTENT.GROWTH[growthOf(res.lvAfter) - 1].name)}로 자랐어요 · ${esc(CONTENT.GROWTH[growthOf(res.lvAfter) - 1].look)}</p>` : ""}
          ${item ? `<div class="unlock"><div class="unlock-art">${window.renderBuddy("happy", state.profile.type, Object.assign({}, state.equipped, { [item.slot]: item.id }), { growth: growthOf(res.lvAfter) })}</div><div><b>${esc(item.name)} 해금!</b><p class="small muted">${esc(item.desc)}</p><button class="btn-line" data-act="wear-now" data-id="${item.id}">바로 착용하기</button></div></div>` : ""}
        </div>
        <p class="res-review small">${icon("cards")}다음 복습 <b>${dayLabel(res.reviewDate)}</b>${res.weak.length ? ` · ${esc(josa(res.weak.join(", "), "을", "를"))} 다시 만나요` : ""}</p>
        ${res.cleared ? "" : `<p class="res-review small">새 예시 적용(별 3)에 성공하면 다음 장소가 열려요.</p>`}
        <div class="res-actions">
          ${res.nextUnit ? `<button class="btn-game" data-act="res-next" data-id="${res.nextUnit.id}">다음 장소로 · ${esc(res.nextUnit.place)}${icon("arrow")}</button>`
            : !res.cleared ? `<button class="btn-game" data-act="res-next" data-id="${u.id}">다시 도전하기${icon("redo")}</button>`
            : `<button class="btn-game" data-act="res-home">지도로 돌아가기${icon("arrow")}</button>`}
          <div class="row2"><button class="btn-line" data-act="res-buddy">버디 꾸미기</button><button class="btn-line" data-act="res-home">오늘 마치기</button></div>
        </div>
      </div>`;
    ov.hidden = false;
    ui.overlay = true;
    ui.res = { res, liA, lvUp, crossed, gained };
    ov.querySelector(".result").scrollTop = 0;

    if (reduced()) { finishFx(); return; }
    ov.classList.add("playing");
    sfx("ok");
    let t = 450;
    res.newStars.forEach((k) => {
      later(() => { const el = ov.querySelector(`[data-star="${k}"]`); if (el) { el.classList.add("on", "pop"); sfx("star"); } }, t);
      t += CONFIG.FX.STAR_GAP;
    });
    if (gained > 0) {
      later(() => {
        ov.querySelector(".xp-fly").classList.add("go");
        const bar = $("#res-bar");
        bar.style.transitionDuration = CONFIG.FX.XP_FILL + "ms";
        bar.style.width = (crossed ? 100 : liA.pct) + "%";
        countUp($("#res-xpn"), res.xpBefore, res.xpAfter, CONFIG.FX.XP_FILL);
      }, t + 150);
      t += 150 + CONFIG.FX.XP_FILL;
    }
    if (crossed) {
      later(() => {
        const bar = $("#res-bar");
        bar.style.transitionDuration = "0ms";
        bar.style.width = "0%";
        $("#res-lv").textContent = `Lv.${liA.lv} ${liA.title}`;
        void bar.offsetWidth;
        bar.style.transitionDuration = "500ms";
        bar.style.width = liA.pct + "%";
        if (lvUp) {
          const lu = $("#res-levelup");
          lu.hidden = false;
          lu.classList.add("show");
          sfx("level");
        }
      }, t + 100);
      t += 100 + (lvUp ? CONFIG.FX.LEVEL_UP : 500);
    }
    later(finishFx, t + 200);
  }
  function countUp(el, from, to, ms) {
    if (!el) return;
    const t0 = performance.now();
    const step = (now) => {
      const k = Math.min(1, (now - t0) / ms);
      el.textContent = `${Math.round(from + (to - from) * k)} XP`;
      if (k < 1 && el.isConnected) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }
  /** 연출을 끝낸 최종 상태 (건너뛰기 · 움직임 줄이기에서도 같은 결과) */
  function finishFx() {
    clearTimers();
    const ov = $("#overlay");
    if (!ui.res) return;
    const { res, liA, lvUp } = ui.res;
    ov.classList.remove("playing");
    ov.classList.add("settled");
    res.newStars.forEach((k) => { const el = ov.querySelector(`[data-star="${k}"]`); if (el) el.classList.add("on"); });
    const bar = $("#res-bar");
    if (bar) { bar.style.transitionDuration = "0ms"; bar.style.width = liA.pct + "%"; }
    const n = $("#res-xpn"); if (n) n.textContent = `${res.xpAfter} XP`;
    const lv = $("#res-lv"); if (lv) lv.textContent = `Lv.${liA.lv} ${liA.title}`;
    const sk = ov.querySelector(".skip"); if (sk) sk.hidden = true;
    if (lvUp) { const lu = $("#res-levelup"); lu.hidden = false; lu.classList.add("show"); }
  }
  function closeOverlay() {
    clearTimers();
    const ov = $("#overlay");
    ov.hidden = true;
    ov.innerHTML = "";
    ov.classList.remove("playing", "settled");
    ui.overlay = false;
    ui.res = null;
  }

  /** 스테이지 밖(복습 등)에서 레벨이 오르면 축하 화면을 한 번 보여 줍니다 */
  function maybeLevelUp() {
    if (ui.overlay || !state || !state.profile) return;
    const lv = levelOf(state.profile.xp);
    const shown = state.profile.shownLevel || 1;
    if (lv <= shown) return;
    state.profile.shownLevel = lv;
    save();
    const li = levelInfo(state.profile.xp);
    const items = itemsUnlockedBetween(shown, lv);
    const item = items[0];
    const ov = $("#overlay");
    ov.innerHTML = `<div class="result" role="dialog" aria-modal="true" aria-label="레벨 업">
        <div class="levelup show">
          <div class="confetti" aria-hidden="true">${Array.from({ length: 22 }, (_, i) => `<i style="--x:${(hash(i + "x") % 100)}%;--r:${hash(i + "r") % 360}deg;--d:${(hash(i + "d") % 500)}ms;--c:${["#6D4AE0", "#2BB5A0", "#F6C343", "#E07A3F"][i % 4]}"></i>`).join("")}</div>
          <div class="res-buddy"><div class="buddy-avatar-wrap is-correct">${buddyArt("understood")}</div></div>
          <span class="eyebrow">레벨 업</span>
          <h3>Lv.${li.lv} ${esc(li.title)}</h3>
          ${growthOf(lv) > growthOf(shown) ? `<p class="small">${esc(CONTENT.GROWTH[growthOf(lv) - 1].name)}로 자랐어요 · ${esc(CONTENT.GROWTH[growthOf(lv) - 1].ability)}</p>` : ""}
          ${item ? `<div class="unlock"><div class="unlock-art">${window.renderBuddy("happy", state.profile.type, Object.assign({}, state.equipped, { [item.slot]: item.id }), { growth: growthOf(lv) })}</div><div><b>${esc(item.name)} 해금!</b><p class="small muted">${esc(item.desc)}</p><button class="btn-line" data-act="wear-now" data-id="${item.id}">바로 착용하기</button></div></div>` : ""}
        </div>
        <div class="res-actions"><button class="btn-game" data-act="res-close">좋아요</button></div>
      </div>`;
    ov.hidden = false;
    ui.overlay = true;
    sfx("level");
  }

  /* =====================================================================
     3. 복습 — 문항마다 바로 저장해서, 중간에 나가도 이어서 풉니다
     ===================================================================== */
  function renderReview() {
    if (ui.review) { renderReviewRun(); return; }
    const t = today();
    const due = dueReviews();
    const later_ = state.reviews.filter((r) => r.nextDate > t && unitById(r.unitId)).sort((a, b) => (a.nextDate < b.nextDate ? -1 : 1));
    const row = (r, isDue) => {
      const u = unitById(r.unitId);
      const rec = state.units[r.unitId] || {};
      const answered = Object.keys(r.answered || {}).length;
      return `<div class="rv-row">
          <span class="node-mini">${icon(u.glyph)}</span>
          <div><b>${esc(u.place)}</b><span class="small muted">${esc(u.subject)} · ${isDue ? (answered ? `${answered}/${u.quizzes.length} 풀다가 멈춤` : `${r.step + 1}번째 간격 복습`) : `${dayLabel(r.nextDate)} 예정`}${rec.stamps ? ` · 도장 ${rec.stamps}` : ""}${rec.mastered ? " · 마스터" : ""}</span></div>
          ${isDue ? `<button class="btn-small" data-act="review-start" data-id="${r.unitId}">${answered ? "이어서" : "복습"}</button>` : ""}
        </div>`;
    };
    $("#screen").innerHTML = `<div class="stack">
      <section class="card">
        <div class="card-head"><div class="card-title">${icon("cards")}오늘 복습</div><span class="small muted">정답마다 +${CONFIG.REWARD.REVIEW_QUIZ} XP</span></div>
        <p class="small muted lead">배운 개념은 ${CONFIG.REVIEW_INTERVALS.slice(0, 4).join(" → ")}일 간격으로 다시 만나요. 모두 맞히면 다음 간격으로, 헷갈리면 내일 다시.</p>
        ${due.length ? `<div class="rv-list">${due.map((r) => row(r, true)).join("")}</div>` : `<div class="empty">오늘 복습할 개념이 없어요.<br>지도에서 새 장소를 탐험해 보세요.</div>`}
      </section>
      ${later_.length ? `<section class="card"><div class="card-head"><div class="card-title">다가오는 복습</div></div><div class="rv-list">${later_.map((r) => row(r, false)).join("")}</div></section>` : ""}
    </div>`;
  }

  function reviewStart(id) {
    const r = state.reviews.find((x) => x.unitId === id);
    if (!r) return;
    ui.review = id;
    ui.reviewSummary = null;
    const u = unitById(id);
    const first = u.quizzes.findIndex((_, i) => r.answered[i] === undefined);
    if (first === -1) { finishReview(r); return; }
    ui.reviewPos = first;
    ui.act = "is-nod";
    render();
    $("#screen").scrollTop = 0;
  }

  function renderReviewRun() {
    const r = state.reviews.find((x) => x.unitId === ui.review);
    const u = unitById(ui.review);
    if (!r || !u) { ui.review = null; ui.reviewSummary = null; renderReview(); return; }
    const rec = state.units[u.id] || {};
    const P = persona();
    if (ui.reviewSummary) {
      const s = ui.reviewSummary;
      $("#screen").innerHTML = `<div class="stack">
        <section class="buddy-stage"><div class="speech" role="status">${esc(s.all ? `${u.learnedLine} 기억이 더 단단해졌어요!` : "헷갈린 건 내일 다시 해 봐요. 같이 하면 금방 익숙해져요!")}</div>${mainBuddy(s.all ? "understood" : "happy")}</section>
        <section class="card summary">
          <div class="card-head"><div class="card-title">${esc(u.place)} 복습 결과</div><span class="small num">${s.correct}/${s.total} 정답</span></div>
          ${s.all ? `<div class="stamp-big pop">${icon("check")}<span>복습 완료 도장 ${s.stamps}개째</span></div>` : ""}
          ${s.mastered ? `<div class="fb good">${icon("star")}<div><b>마스터 배지 획득</b><p>${esc(u.place)}의 개념을 오래 기억하게 됐어요.</p></div></div>` : ""}
          <p class="small">다음 복습 <b>${dayLabel(s.nextDate)}</b></p>
          ${s.gains.length ? `<p class="small good">${esc(gainText(s.gains))}</p>` : ""}
          <button class="btn-game" data-act="review-done">복습 목록으로${icon("arrow")}</button>
        </section></div>`;
      return;
    }
    const i = ui.reviewPos;
    const Q = u.quizzes[i];
    const chosen = r.answered[i];
    const answered = chosen !== undefined;
    const ok = answered && chosen === Q.answer;
    const intro = i === 0 && !answered
      ? (rec.explanation ? `지난번에 선생님이 ‘${rec.explanation.length > 40 ? rec.explanation.slice(0, 40) + "…" : rec.explanation}’라고 알려 줬죠? 다시 해 봐요!` : "지난번에 배운 걸 다시 해 봐요!")
      : answered ? (ok ? P.correct_msg : P.hintLine) : "다음 문제예요!";
    $("#screen").innerHTML = `<div class="stack">
      <div class="stage-head">
        <button class="icon-btn" data-act="review-exit" aria-label="복습 목록으로">${icon("x")}</button>
        <div class="stage-title"><b>${esc(u.place)} 복습</b><span>${esc(u.subject)} · 문제 ${i + 1}/${u.quizzes.length}</span></div>
      </div>
      <section class="buddy-stage"><div class="speech" role="status">${esc(intro)}</div>${mainBuddy(answered ? (ok ? "understood" : "confused") : "listening")}</section>
      <section class="card">
        <p class="q">${esc(Q.q)}</p>
        <div class="opts">${Q.options.map((o, k) => {
          const cls = answered ? (k === Q.answer ? "correct" : k === chosen ? "wrong" : "") : "";
          return `<button class="opt ${cls}" data-act="review-answer" data-i="${k}" ${answered ? "disabled" : ""}><span class="n num">${k + 1}</span>${esc(o)}</button>`;
        }).join("")}</div>
        ${answered ? `<div class="fb ${ok ? "good" : "hint"} unfold">${ok ? icon("check") : icon("bulb")}<div><b>${ok ? `정답 · +${CONFIG.REWARD.REVIEW_QUIZ} XP` : "아쉬워요"}</b><p>${esc(Q.explain)}</p></div></div>
          <button class="btn-game" data-act="review-next">${i < u.quizzes.length - 1 ? "다음 문제" : "복습 마치기"}${icon("arrow")}</button>` : ""}
      </section></div>`;
  }

  function reviewAnswer(k) {
    const r = state.reviews.find((x) => x.unitId === ui.review);
    const u = unitById(ui.review);
    const i = ui.reviewPos;
    if (!r || r.answered[i] !== undefined) return;
    r.answered[i] = k;
    const bucket = [];
    if (k === u.quizzes[i].answer) {
      award(`review:${u.id}:${r.round}:${i}`, CONFIG.REWARD.REVIEW_QUIZ, "복습 정답", bucket);
      ui.act = "is-correct";
      sfx("ok");
    } else ui.act = "is-tilt";
    markActive(bucket);
    save();
    render();
    const extra = bucket.filter((g) => g.label !== "복습 정답");
    if (extra.length) toast(gainText(extra));
  }

  function reviewNext() {
    const r = state.reviews.find((x) => x.unitId === ui.review);
    const u = unitById(ui.review);
    const next = u.quizzes.findIndex((_, i) => r.answered[i] === undefined);
    if (next === -1) { finishReview(r); return; }
    ui.reviewPos = next;
    render();
  }

  function finishReview(r) {
    const u = unitById(r.unitId);
    const rec = unitRec(state, u.id);
    const total = u.quizzes.length;
    const correct = u.quizzes.filter((q, i) => r.answered[i] === q.answer).length;
    const all = correct === total;
    const gains = [];
    if (all) {
      r.step = Math.min(r.step + 1, CONFIG.REVIEW_INTERVALS.length - 1);
      rec.stamps += 1;
    } else r.step = 0;
    const wasMastered = rec.mastered;
    if (rec.stamps >= CONFIG.MASTERY_REVIEWS) rec.mastered = true;
    r.nextDate = addDays(today(), all ? CONFIG.REVIEW_INTERVALS[r.step] : 1);
    r.round += 1;
    r.answered = {};
    touchQuest("review", gains);
    markActive(gains);
    save();
    ui.reviewSummary = { all, correct, total, stamps: rec.stamps, nextDate: r.nextDate, mastered: rec.mastered && !wasMastered, gains };
    ui.act = all ? "is-correct" : "is-cheer";
    render();
  }

  /* =====================================================================
     4. 버디 — 성장 · 꾸미기 · 개념 도감 · 최근 기록 · 예시 랭킹
     ===================================================================== */
  function renderBuddyTab() {
    const li = levelInfo(state.profile.xp);
    const g = growthOf(li.lv);
    const gr = CONTENT.GROWTH[g - 1];
    const nextGr = CONTENT.GROWTH[g];
    const P = persona();
    const speech = ui.speech || P.greeting;
    ui.speech = null;
    const played = CONTENT.UNITS.filter((u) => state.units[u.id] && state.units[u.id].played);
    const week = weekStart(today());
    const myWeek = Object.entries(state.xpLog).filter(([d]) => d >= week).reduce((a, [, v]) => a + v, 0);
    const league = CONTENT.LEAGUE_MOCK.map((x) => ({ name: x.name, xp: x.weekXp !== undefined ? x.weekXp : x.xp || 0, level: x.level, type: x.type }))
      .concat([{ name: `${state.profile.name} (나)`, xp: myWeek, level: li.lv, type: state.profile.type, me: true }])
      .sort((a, b) => b.xp - a.xp);

    $("#screen").innerHTML = `<div class="stack">
      <section class="room tall"><div class="room-bg">${window.renderBuddyRoom(g)}</div><div class="speech" role="status">${esc(speech)}</div><div class="room-buddy">${mainBuddy("happy", "idle")}</div></section>
      <section class="card">
        <div class="card-head"><div class="card-title">${esc(state.profile.name)} · ${esc(gr.name)}</div><span class="small" style="color:${P.color}">${esc(P.name)}</span></div>
        <p class="small">${esc(gr.ability)}</p>
        <p class="small muted">${nextGr ? `Lv.${nextGr.fromLv}이 되면 ${esc(nextGr.name)} — ${esc(nextGr.look)}` : "가장 높은 성장 단계예요."}</p>
      </section>

      <section class="card">
        <div class="card-head"><div class="card-title">${icon("gift")}꾸미기</div><span class="small muted">레벨이 오르면 열려요</span></div>
        <div class="wardrobe">${CONTENT.WARDROBE.map((it) => {
          const L = unlockLv(it.id);
          const open = li.lv >= L;
          const on = state.equipped[it.slot] === it.id;
          return `<div class="item ${on ? "on" : ""} ${open ? "" : "locked"}">
              <div class="thumb">${window.renderBuddy("listening", state.profile.type, { [it.slot]: it.id }, { growth: g })}</div>
              <b>${esc(it.name)}</b>
              ${open ? `<button class="btn-small ${on ? "ghost" : ""}" data-act="wear" data-id="${it.id}">${on ? "벗기" : "착용"}</button>` : `<span class="small muted">${icon("lock")}Lv.${L}</span>`}
            </div>`;
        }).join("")}</div>
      </section>

      <section class="card">
        <div class="card-head"><div class="card-title">${icon("book")}개념 도감</div><span class="small muted">${played.length}/${CONTENT.UNITS.length}곳</span></div>
        ${played.length ? played.map((u) => {
          const rec = state.units[u.id];
          const r = state.reviews.find((x) => x.unitId === u.id);
          const sc = starCount(rec.stars);
          return `<details class="dex">
              <summary><span class="node-mini">${icon(u.glyph)}</span><b>${esc(u.place)}</b><span class="dex-stars">${[0, 1, 2].map((k) => `<i class="${k < sc ? "on" : ""}">${icon("star")}</i>`).join("")}</span>${rec.mastered ? `<span class="tag mint">마스터</span>` : ""}</summary>
              <dl>
                <dt>함께 배운 내용</dt><dd>${esc(u.concepts.map((c) => c.term).join(" · "))}</dd>
                ${rec.notes.length ? `<dt>내가 고친 설명</dt><dd>${rec.notes.map((n) => `<p><b>${esc(n.term)}</b> — ${esc(n.text)}</p>`).join("")}</dd>` : ""}
                ${rec.weak.length ? `<dt>다시 볼 개념</dt><dd>${esc(rec.weak.join(", "))}</dd>` : ""}
                <dt>복습</dt><dd>${r ? `다음 ${dayLabel(r.nextDate)} · 도장 ${rec.stamps}개` : "—"}</dd>
              </dl>
            </details>`;
        }).join("") : `<div class="empty">아직 함께 배운 개념이 없어요.<br>지도에서 첫 장소에 도전해 보세요.</div>`}
      </section>

      ${state.sessions.length ? `<section class="card">
        <div class="card-head"><div class="card-title">최근 기록</div></div>
        <div class="rv-list">${state.sessions.slice(-5).reverse().map((s) => {
          const u = unitById(s.unitId);
          if (!u) return "";
          return `<div class="rv-row"><span class="node-mini">${icon(u.glyph)}</span><div><b>${esc(u.place)}</b><span class="small muted">${dayLabel(s.date)} · 별 ${s.stars}개${s.hints ? " · 힌트 사용" : ""}</span></div>
            <span class="tag ${s.status === "understood" ? "mint" : "warn"}">${s.status === "understood" ? "이해 완료" : "복습 필요"}</span></div>`;
        }).join("")}</div>
      </section>` : ""}

      <section class="card">
        <div class="card-head"><div class="card-title">예시 랭킹</div><span class="small muted">가상 참가자 · 이번 주 XP</span></div>
        <ol class="rank">${league.map((x, i) => `<li class="${x.me ? "me" : ""}"><span class="rk num">${i + 1}</span><span class="nm">${esc(x.name)}<small>Lv.${x.level}</small></span><b class="num">${x.xp} XP</b></li>`).join("")}</ol>
        <p class="small muted">실제 친구와 겨루는 기능은 아직 없어요. 내 이번 주 XP는 월요일부터 받은 경험치예요.</p>
      </section>
    </div>`;
  }

  function buddyTapLine() {
    const P = persona();
    const learned = state.sessions.slice().reverse().map((s) => unitById(s.unitId)).filter(Boolean);
    const notes = [];
    Object.keys(state.units).forEach((id) => (state.units[id].notes || []).forEach((n) => notes.push(n)));
    ui.tapN += 1;
    const pool = [P.greeting];
    if (learned.length) pool.push(`${learned[0].place}에서 배운 거 기억나요. ${learned[0].learnedLine}`);
    if (notes.length) { const n = notes[ui.tapN % notes.length]; pool.push(`선생님이 ${josa(n.term, "은", "는")} ‘${n.text.length > 30 ? n.text.slice(0, 30) + "…" : n.text}’라고 알려 줬죠!`); }
    if (dueReviews().length) pool.push("복습할 게 있어요. 지난번에 알려 준 걸 다시 해 봐요!");
    return pool[ui.tapN % pool.length];
  }

  /* =====================================================================
     5. 설정 (바텀 시트)
     ===================================================================== */
  function openSheet(html) {
    const wrap = $("#sheet");
    wrap.innerHTML = `<div class="sheet" role="dialog" aria-modal="true"><div class="grab"></div>${html}</div>`;
    wrap.hidden = false;
  }
  function closeSheet() { $("#sheet").hidden = true; $("#sheet").innerHTML = ""; }

  function sheetSettings() {
    const p = state.profile;
    ui.resetArmed = false;
    openSheet(`<h2>설정</h2>
      <label class="field"><span>버디 이름</span><div class="row-in"><input class="input" id="rename" value="${esc(p.name)}" maxlength="12"><button class="btn-small" data-act="rename">저장</button></div></label>
      <div class="toggles">
        <label class="toggle"><input type="checkbox" id="opt-motion" ${state.settings.motion === "reduce" ? "checked" : ""}><span><b>움직임 줄이기</b><small>버디 움직임과 축하 연출을 줄여요. 별·XP·결과는 그대로 보여요.</small></span></label>
        <label class="toggle"><input type="checkbox" id="opt-sound" ${state.settings.sound ? "checked" : ""}><span><b>효과음</b><small>정답·별·레벨업에 짧은 소리 (기본은 꺼짐)</small></span></label>
      </div>
      <button class="btn-line full" data-act="retake">성향 검사 다시 하기 (기록은 그대로)</button>
      ${mode === "demo"
        ? `<div class="demo-box"><b>지금은 데모 기록이에요</b><p class="small muted">내 기록과 따로 저장돼요.</p><div class="row2"><button class="btn-line" data-act="demo-restart">데모 처음부터</button><button class="btn-line" data-act="demo-exit">데모 끝내기</button></div></div>`
        : `<button class="btn-line full" data-act="demo-enter">데모로 둘러보기 (내 기록은 그대로)</button>`}
      <button class="btn-line full danger" data-act="reset" id="reset-btn">${mode === "demo" ? "데모 기록 초기화" : "모든 기록 초기화"}</button>
      <p class="hint">${esc(CONFIG.APP_NAME)} ${esc(CONFIG.VERSION)} · 기록은 이 기기의 브라우저에만 저장돼요. 버디는 ${CONFIG.AI_MODE === "demo" ? "정해 둔 질문과 키워드로 대화하는 데모 버디" : "AI 버디"}예요.</p>`);
  }

  /* =====================================================================
     0. 처음 실행 — 성향 검사 6문항 → 결과 → 이름 짓기
     ===================================================================== */
  function renderOnboarding() {
    $("#topbar").innerHTML = `<div class="brand"><span class="logo">STUDY-BUDDY</span></div>${ui.retake ? `<button class="icon-btn" data-act="retake-cancel" aria-label="닫기">${icon("x")}</button>` : ""}`;
    $("#tabbar").hidden = true;
    const list = CONTENT.ONBOARDING_QUIZ;
    ui.onboardScores = ui.onboardScores || { curious: 0, meticulous: 0, cheer: 0, challenger: 0 };
    const screen = $("#screen");
    if (ui.onboardStep < list.length) {
      const cur = list[ui.onboardStep];
      screen.innerHTML = `<div class="onboard">
        ${ui.onboardStep === 0 && !ui.retake ? `<div class="ob-hero">${window.renderBuddy("happy", "curious", {}, { growth: 1 })}</div><h1>내가 가르치면,<br>버디가 자라요.</h1><p class="lead">개념을 설명하고, 버디의 질문에 답하고, 새 문제에 적용하며 함께 지도를 넓혀 가요. 먼저 버디의 성향을 정해 볼게요.</p>` : ""}
        <div class="ob-steps">${list.map((_, i) => `<span class="${i <= ui.onboardStep ? "on" : ""}"></span>`).join("")}</div>
        <div class="eyebrow">성향 검사 ${ui.onboardStep + 1}/${list.length}</div>
        <h2>${esc(cur.q)}</h2>
        <div class="opts">${cur.options.map((o) => `<button class="opt" data-act="ob-pick" data-type="${o.type}">${esc(o.text)}</button>`).join("")}</div>
        ${ui.retake ? "" : `<button class="btn-text" data-act="demo-enter">검사 건너뛰고 데모로 둘러보기</button>`}
      </div>`;
      return;
    }
    let best = "curious", max = -1;
    Object.entries(ui.onboardScores).forEach(([t, s]) => { if (s > max) { max = s; best = t; } });
    ui.detected = best;
    const T = CONTENT.PERSONALITIES[best];
    screen.innerHTML = `<div class="onboard">
      <div class="ob-hero is-correct">${window.renderBuddy("happy", best, ui.retake && state ? state.equipped : {}, { growth: ui.retake && state ? growthOf(levelOf(state.profile.xp)) : 1 })}</div>
      <div class="eyebrow" style="color:${T.color}">${esc(T.tag)}</div>
      <h1>${esc(T.name)}</h1>
      <p class="lead">${esc(T.desc)}</p>
      ${ui.retake ? `<button class="btn-game" data-act="ob-retake-done">이 성향으로 바꾸기${icon("arrow")}</button>`
        : `<label class="field"><span>버디 이름</span><input class="input" id="ob-name" value="옥종버디" maxlength="12"></label>
           <button class="btn-game" data-act="ob-finish">지도로 출발하기${icon("arrow")}</button>`}
    </div>`;
  }

  /* =====================================================================
     데모 — 실제 기록과 분리된 시연용 기록
     ===================================================================== */
  function buildDemo() {
    const s = blankState();
    const xp = CONFIG.DEMO_START_XP;
    s.profile = { name: "데모 버디", type: "curious", xp, createdAt: addDays(today(), -2), shownLevel: levelOf(xp) };
    s.activeDays = [addDays(today(), -2), addDays(today(), -1)];
    s.xpLog = { [addDays(today(), -2)]: Math.floor(xp / 2), [addDays(today(), -1)]: xp - Math.floor(xp / 2) };
    return s;
  }
  function enterDemo(fresh) {
    setMode("demo");
    const s = fresh ? null : readKey(KEY_DEMO);
    state = s && s.profile ? normalize(s) : buildDemo();
    save();
    resetUi();
    render();
    toast("데모 기록으로 둘러봐요. 내 기록은 따로 그대로 있어요.");
  }
  function exitDemo() {
    setMode("real");
    state = loadReal();
    resetUi();
    render();
    toast(state ? "내 기록으로 돌아왔어요." : "데모를 끝냈어요. 내 버디를 만들어 볼까요?");
  }
  function resetUi() {
    closeSheet();
    closeOverlay();
    ui.tab = "home"; ui.review = null; ui.reviewSummary = null; ui.retake = false;
    ui.onboardStep = 0; ui.onboardScores = null;
  }

  /* =====================================================================
     버튼 동작
     ===================================================================== */
  const actions = {
    tab(el) { ui.tab = el.dataset.tab; if (ui.tab !== "review") { ui.review = null; ui.reviewSummary = null; } render(); $("#screen").scrollTop = 0; },
    settings() { sheetSettings(); },
    "tap-buddy"(el) {
      // 스테이지·복습 중에는 입력을 지우지 않도록 다시 그리지 않고 끄덕이기만 합니다
      if (ui.tab === "stage" || ui.review) {
        const w = el && el.closest ? el.closest(".buddy-avatar-wrap") : null;
        if (w) { w.classList.remove("is-nod", "is-correct", "is-tilt", "is-cheer", "is-pose", "is-hop"); void w.offsetWidth; w.classList.add("is-nod"); }
        return;
      }
      ui.speech = buddyTapLine();
      ui.act = "is-nod";
      render();
    },

    "open-stage"(el) { startStage(el.dataset.id); },
    locked() { toast("앞 장소를 먼저 끝내면 열려요."); },
    "stage-next"() { stageNext(); },
    "stage-restart"() { startStage(state.run.unitId, true); },
    "stage-exit"() { ui.tab = "home"; render(); toast("진행 상황을 저장했어요. 지도에서 이어서 할 수 있어요."); },
    "submit-teach"() { submitTeach(); },
    "submit-probe"() { submitProbe(); },
    "demo-fill"() { const ex = CONTENT.DEMO_EXPLANATIONS[state.run.unitId]; const el = $("#teach-input"); el.value = ex; el.dispatchEvent(new Event("input", { bubbles: true })); },
    choose(el) { choose(Number(el.dataset.i)); },

    "fx-skip"() { finishFx(); },
    "res-next"(el) { closeOverlay(); startStage(el.dataset.id); },
    "res-home"() { closeOverlay(); ui.tab = "home"; render(); $("#screen").scrollTop = 0; },
    "res-buddy"() { closeOverlay(); ui.tab = "buddy"; render(); $("#screen").scrollTop = 0; },
    "res-close"() { closeOverlay(); render(); },
    "wear-now"(el) {
      const it = CONTENT.WARDROBE.find((x) => x.id === el.dataset.id);
      if (!it) return;
      state.equipped[it.slot] = it.id;
      save();
      closeOverlay();
      ui.tab = "buddy";
      ui.act = "is-pose";
      ui.speech = `${it.name} 어때요? 잘 어울려요?`;
      render();
      $("#screen").scrollTop = 0;
    },
    wear(el) {
      const it = CONTENT.WARDROBE.find((x) => x.id === el.dataset.id);
      if (!it || levelOf(state.profile.xp) < unlockLv(it.id)) return;
      if (state.equipped[it.slot] === it.id) state.equipped[it.slot] = null;
      else { state.equipped[it.slot] = it.id; ui.act = "is-pose"; ui.speech = `${it.name} 어때요?`; }
      save();
      render();
    },

    "review-start"(el) { reviewStart(el.dataset.id); },
    "review-answer"(el) { reviewAnswer(Number(el.dataset.i)); },
    "review-next"() { reviewNext(); },
    "review-exit"() { ui.review = null; render(); toast("푼 문제는 저장했어요. 이어서 풀 수 있어요."); },
    "review-done"() { ui.review = null; ui.reviewSummary = null; render(); },

    rename() {
      const n = $("#rename").value.trim();
      if (!n) return;
      state.profile.name = n;
      save();
      closeSheet();
      render();
      toast("버디 이름을 바꿨어요.");
    },
    retake() { closeSheet(); ui.retake = true; ui.onboardStep = 0; ui.onboardScores = null; render(); },
    "retake-cancel"() { ui.retake = false; render(); },
    "demo-enter"() { enterDemo(false); },
    "demo-restart"() { enterDemo(true); },
    "demo-exit"() { exitDemo(); },
    reset(el) {
      if (!ui.resetArmed) {
        ui.resetArmed = true;
        el.textContent = "한 번 더 누르면 초기화돼요";
        setTimeout(() => { ui.resetArmed = false; if (el.isConnected) el.textContent = mode === "demo" ? "데모 기록 초기화" : "모든 기록 초기화"; }, 3000);
        return;
      }
      if (mode === "demo") { enterDemo(true); return; }
      try { localStorage.removeItem(KEY_REAL); (CONFIG.OLD_STORAGE_KEYS || []).forEach((k) => localStorage.removeItem(k)); } catch (e) { /* 무시 */ }
      state = null;
      resetUi();
      render();
    },

    "ob-pick"(el) { ui.onboardScores[el.dataset.type] += 1; ui.onboardStep += 1; render(); $("#screen").scrollTop = 0; },
    "ob-finish"() {
      const name = ($("#ob-name").value || "").trim() || "옥종버디";
      setMode("real");
      state = blankState();
      state.profile = { name, type: ui.detected, xp: 0, createdAt: today(), shownLevel: 1 };
      save();
      resetUi();
      ui.speech = `저는 ${josa(name, "이에요", "예요")}! 첫 장소 ${CONTENT.UNITS[0].place}부터 같이 가요.`;
      render();
    },
    "ob-retake-done"() {
      state.profile.type = ui.detected;
      save();
      ui.retake = false;
      ui.tab = "buddy";
      ui.act = "is-pose";
      ui.speech = CONTENT.PERSONALITIES[ui.detected].greeting;
      render();
      toast(`${CONTENT.PERSONALITIES[ui.detected].name}로 바꿨어요. 기록은 그대로예요.`);
    }
  };

  document.addEventListener("click", (e) => {
    const el = e.target.closest("[data-act]");
    if (el && actions[el.dataset.act] && !el.disabled) { e.preventDefault(); actions[el.dataset.act](el); return; }
    if (e.target.id === "sheet") closeSheet();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !$("#sheet").hidden) closeSheet();
    if (e.key === "Enter" && e.target.id === "probe-input") { e.preventDefault(); submitProbe(); }
    if (e.key === "Enter" && e.target.id === "rename") { e.preventDefault(); actions.rename(); }
    if ((e.key === "Enter" || e.key === " ") && e.target.matches && e.target.matches(".buddy-avatar-wrap")) { e.preventDefault(); actions["tap-buddy"](e.target); }
  });
  document.addEventListener("input", (e) => {
    const id = e.target.id;
    if (id === "sl-a" || id === "sl-b") onSlider();
    if (id === "teach-input") {
      const n = e.target.value.trim().length;
      const c = $("#teach-count");
      if (c) { c.textContent = `${n}자 / ${CONFIG.MIN_EXPLAIN_LENGTH}자 이상`; c.classList.toggle("ok", n >= CONFIG.MIN_EXPLAIN_LENGTH); }
      if (state.run) state.run.explanation = e.target.value;
    }
  });
  document.addEventListener("change", (e) => {
    if (e.target.id === "opt-motion") { state.settings.motion = e.target.checked ? "reduce" : "full"; save(); $("#app").dataset.motion = reduced() ? "reduce" : "full"; }
    if (e.target.id === "opt-sound") { state.settings.sound = e.target.checked; save(); if (state.settings.sound) sfx("ok"); }
    if (e.target.id === "teach-input") save();
  });
  /* 설명을 쓰는 동안에는 버디의 반복 움직임을 멈춥니다 */
  document.addEventListener("focusin", (e) => { if (e.target.matches && e.target.matches("textarea, input[type=text], input:not([type])")) $("#app").classList.add("calm"); });
  document.addEventListener("focusout", () => $("#app").classList.remove("calm"));
  /* 화면이 보이지 않을 때는 움직임을 멈춥니다 */
  document.addEventListener("visibilitychange", () => $("#app").classList.toggle("paused", document.hidden));

  /* =====================================================================
     시작
     ===================================================================== */
  let startMode = "real";
  try { startMode = localStorage.getItem(KEY_MODE) || "real"; } catch (e) { /* 무시 */ }
  if (startMode === "demo") {
    mode = "demo";
    const s = readKey(KEY_DEMO);
    state = s && s.profile ? normalize(s) : buildDemo();
  } else {
    mode = "real";
    state = loadReal();
    if (state) save();
  }
  render();
})();
