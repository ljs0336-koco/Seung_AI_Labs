/* =====================================================================
   🔒 ENGINE — STUDY-BUDDY v0.2 앱 엔진
   메타인지 가르치기 루프 · 소크라테스 반문 분석 · 간격 복습 · 성장을 담당합니다.
   문구 · 단원 · 퀴즈는 data/content.js · data/config.js · style.css 에서 바꿉니다.
   ===================================================================== */
(function () {
  "use strict";

  const CONFIG = window.CONFIG;
  const CONTENT = window.CONTENT;
  const $ = (sel) => document.querySelector(sel);

  /* ---------- 날짜 및 유틸리티 도우미 ---------- */
  const pad = (n) => String(n).padStart(2, "0");
  const toYmd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const today = () => toYmd(new Date());
  const addDays = (ymd, n) => {
    const [y, m, d] = ymd.split("-").map(Number);
    const date = new Date(y, m - 1, d);
    date.setDate(date.getDate() + n);
    return toYmd(date);
  };

  /* ---------- 전역 앱 상태 ---------- */
  let state = null;
  const ui = {
    tab: "home",
    mood: "listening",
    onboardStep: 0,
    onboardScores: { curious: 0, meticulous: 0, cheer: 0, challenger: 0 },
    detectedType: "curious",
    teachStep: 1, // 1: 설명작성, 2: 소크라테스 반문, 3: 완료
    selectedUnitId: "math_linear",
    currentSocratic: null,
    reviewActiveItem: null,
    reviewQuizIdx: 0
  };

  function loadState() {
    try {
      const raw = localStorage.getItem(CONFIG.STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function saveState() {
    try {
      localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      /* 저장 불가 환경 폴백 */
    }
  }

  function blankState() {
    return {
      v: 2,
      profile: null, // { name, type, level, xp, streak, lastLogin }
      sessions: [],
      reviews: [],
      equipped: { head: null, neck: null, face: null }
    };
  }

  function getLevel(xp) {
    const thresholds = CONFIG.LEVELS;
    let lv = 1;
    for (let i = 0; i < thresholds.length; i++) {
      if (xp >= thresholds[i]) lv = i + 1;
    }
    return Math.min(lv, thresholds.length);
  }

  function getLevelTitle(lv) {
    return CONTENT.LEVEL_TITLES[lv - 1] || CONTENT.LEVEL_TITLES[CONTENT.LEVEL_TITLES.length - 1];
  }

  function showToast(msg) {
    const t = $("#toast");
    if (!t) return;
    t.textContent = msg;
    t.classList.add("show");
    setTimeout(() => t.classList.remove("show"), 2800);
  }

  /* =====================================================================
     화면 렌더링 라우터
     ===================================================================== */
  function render() {
    if (!state || !state.profile) {
      renderOnboarding();
      return;
    }

    renderTopbar();
    renderTabbar();

    const screen = $("#screen");
    screen.innerHTML = "";

    switch (ui.tab) {
      case "teach":
        renderTeachScreen(screen);
        break;
      case "review":
        renderReviewScreen(screen);
        break;
      case "league":
        renderLeagueScreen(screen);
        break;
      case "wardrobe":
        renderWardrobeScreen(screen);
        break;
      case "settings":
        renderSettingsScreen(screen);
        break;
      case "home":
      default:
        renderHomeScreen(screen);
        break;
    }
  }

  /* ---------- 상단바 ---------- */
  function renderTopbar() {
    const p = state.profile;
    const typeMeta = CONTENT.PERSONALITIES[p.type] || CONTENT.PERSONALITIES.curious;
    const top = $("#topbar");
    top.innerHTML = `
      <div class="title-group">
        <span class="app-logo">STUDY-BUDDY</span>
        <span class="type-badge" style="background:${typeMeta.color}22; color:${typeMeta.color}">${typeMeta.name}</span>
      </div>
      <div class="right">
        <div class="streak-chip">🔥 ${p.streak}일 연속</div>
      </div>
    `;
  }

  /* ---------- 하단 탭바 ---------- */
  function renderTabbar() {
    const nav = $("#tabbar");
    const tabs = [
      { id: "home", label: "홈", icon: "🏠" },
      { id: "teach", label: "가르치기", icon: "💬" },
      { id: "review", label: "간격복습", icon: "📝" },
      { id: "league", label: "랭킹", icon: "🏆" },
      { id: "wardrobe", label: "꾸미기", icon: "🎨" },
      { id: "settings", label: "설정", icon: "⚙️" }
    ];

    nav.innerHTML = tabs.map(t => `
      <button class="tab-btn ${ui.tab === t.id ? 'active' : ''}" data-tab="${t.id}">
        <span style="font-size:18px">${t.icon}</span>
        <span>${t.label}</span>
      </button>
    `).join("");

    nav.querySelectorAll(".tab-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        ui.tab = btn.dataset.tab;
        render();
      });
    });
  }

  /* =====================================================================
     1. 홈 화면
     ===================================================================== */
  function renderHomeScreen(screen) {
    const p = state.profile;
    const typeMeta = CONTENT.PERSONALITIES[p.type] || CONTENT.PERSONALITIES.curious;
    const lv = p.level;
    const nextXp = CONFIG.LEVELS[lv] || (CONFIG.LEVELS[lv - 1] + 300);
    const currBaseXp = CONFIG.LEVELS[lv - 1];
    const progressPct = Math.min(100, Math.round(((p.xp - currBaseXp) / (nextXp - currBaseXp)) * 100));

    // 복습 대기 중인 개념 수
    const pendingReviews = state.reviews.filter(r => r.nextDate <= today());

    let speech = typeMeta.greeting;
    if (ui.mood === "understood") speech = typeMeta.correct_msg;
    if (ui.mood === "confused") speech = typeMeta.confused_msg;

    screen.innerHTML = `
      <div class="buddy-stage">
        <div class="buddy-speech">${speech}</div>
        <div class="buddy-avatar-wrap ${ui.mood === 'understood' ? 'is-correct' : ''}">
          ${window.renderBuddy(ui.mood, p.type, state.equipped)}
        </div>
        <div style="font-size:16px; font-weight:800; margin-top:8px;">${p.name} (Lv.${lv} ${getLevelTitle(lv)})</div>
        <div style="font-size:12px; color:var(--ink-3); margin-top:2px;">${typeMeta.tag}</div>

        <div class="progress-group">
          <div class="progress-labels">
            <span>성장 경험치</span>
            <span style="color:#38BDF8;">${p.xp} / ${nextXp} XP</span>
          </div>
          <div class="progress-bar">
            <div class="progress-fill" style="width:${progressPct}%;"></div>
          </div>
        </div>
      </div>

      <!-- 빠른 액션 카드 -->
      <div class="card" style="border-left: 4px solid var(--brand);">
        <div class="card-head">
          <div class="card-title">🚀 메타인지 가르치기 세션</div>
          <span style="font-size:11px; color:#A5B4FC; font-weight:700;">+50 XP</span>
        </div>
        <p style="font-size:12.5px; color:var(--ink-2); line-height:1.5; margin-bottom:12px;">
          선생님이 되어 버디에게 교과 개념을 설명해 주세요. 버디가 질문으로 빈틈을 짚어줍니다!
        </p>
        <button class="btn-primary" id="btn-start-teach">
          지금 개념 가르치기 시작하기 →
        </button>
      </div>

      <!-- 복습 현황 알림 -->
      <div class="card">
        <div class="card-head">
          <div class="card-title">🧠 망각곡선 간격 복습</div>
          <span style="font-size:12px; font-weight:700; color:${pendingReviews.length > 0 ? '#F59E0B' : '#10B981'};">
            ${pendingReviews.length > 0 ? `복습 대기 ${pendingReviews.length}개` : '오늘 복습 완료!'}
          </span>
        </div>
        <p style="font-size:12px; color:var(--ink-3); margin-bottom:12px;">
          배운 개념은 1일, 3일, 7일, 14일 간격으로 퀴즈를 풀며 장기기억으로 굳어집니다.
        </p>
        ${pendingReviews.length > 0 ? `
          <button class="btn-secondary" id="btn-go-review" style="border-color:#F59E0B; color:#FBBF24;">
            대기 중인 복습 퀴즈 풀기 (${pendingReviews.length}개) →
          </button>
        ` : `
          <div style="font-size:12px; color:#10B981; background:rgba(16, 185, 129, 0.1); padding:10px; border-radius:10px; text-align:center;">
            ✓ 오늘 필요한 복습을 모두 마쳤습니다!
          </div>
        `}
      </div>

      <!-- 최근 학습 활동 -->
      <div class="card">
        <div class="card-title" style="margin-bottom:10px;">📜 최근 가르친 개념</div>
        ${state.sessions.length === 0 ? `
          <div style="font-size:12px; color:var(--ink-3); text-align:center; padding:12px;">
            아직 진행한 가르치기 세션이 없습니다.
          </div>
        ` : `
          <div style="display:flex; flex-direction:column; gap:8px;">
            ${state.sessions.slice(-3).reverse().map(s => `
              <div style="background:var(--surface-2); padding:10px 12px; border-radius:10px; display:flex; justify-content:space-between; align-items:center;">
                <div>
                  <div style="font-size:13px; font-weight:700;">${s.unitTitle}</div>
                  <div style="font-size:11px; color:var(--ink-3);">${s.date} 학습</div>
                </div>
                <span style="font-size:11px; background:#10B98122; color:#10B981; padding:3px 8px; border-radius:10px; font-weight:700;">이해 완료</span>
              </div>
            `).join("")}
          </div>
        `}
      </div>
    `;

    $("#btn-start-teach").addEventListener("click", () => {
      ui.tab = "teach";
      ui.teachStep = 1;
      render();
    });

    const revBtn = $("#btn-go-review");
    if (revBtn) {
      revBtn.addEventListener("click", () => {
        ui.tab = "review";
        render();
      });
    }
  }

  /* =====================================================================
     2. 가르치기 세션 화면 (핵심 메타인지 루프)
     ===================================================================== */
  function renderTeachScreen(screen) {
    const unit = CONTENT.UNITS.find(u => u.id === ui.selectedUnitId) || CONTENT.UNITS[0];
    const p = state.profile;

    if (ui.teachStep === 1) {
      // Step 1: 단원 선택 및 개념 설명 작성
      screen.innerHTML = `
        <div class="card">
          <div class="card-head">
            <div class="card-title">1단계: 가르칠 단원 선택</div>
          </div>
          <div style="display:flex; gap:6px; flex-wrap:wrap; margin-bottom:12px;">
            ${CONTENT.UNITS.map(u => `
              <button class="unit-chip ${u.id === unit.id ? 'active' : ''}" data-unit="${u.id}" style="padding:6px 12px; border-radius:10px; font-size:12px; font-weight:700; background:${u.id === unit.id ? '#6366F1' : 'var(--surface-2)'}; color:#FFF;">
                ${u.icon} ${u.subject}
              </button>
            `).join("")}
          </div>
          <div style="background:rgba(255,255,255,0.04); padding:12px; border-radius:12px; margin-bottom:14px; border:1px solid var(--line);">
            <div style="font-size:14px; font-weight:800; margin-bottom:4px;">${unit.title}</div>
            <div style="font-size:12px; color:var(--ink-2); line-height:1.4;">${unit.summary}</div>
            <div style="font-size:11px; color:#A5B4FC; margin-top:6px;">권장 핵심 개념: ${unit.required_concepts.join(", ")}</div>
          </div>

          <label style="font-size:13px; font-weight:700; margin-bottom:6px; display:block;">
            선생님의 말로 버디에게 개념을 설명해 주세요:
          </label>
          <textarea id="teach-input" class="text-input" rows="5" placeholder="예: 일차함수는 y=ax+b로 나타내고, a는 x의 증가량에 대한 y의 증가량인 기울기야. a가 0이면 직선이 평행해져서 일차함수가 아니야..." style="resize:none; margin-bottom:12px;"></textarea>

          <button class="btn-primary" id="btn-submit-teach">
            버디에게 설명 전달하기 →
          </button>
        </div>
      `;

      screen.querySelectorAll(".unit-chip").forEach(btn => {
        btn.addEventListener("click", () => {
          ui.selectedUnitId = btn.dataset.unit;
          render();
        });
      });

      $("#btn-submit-teach").addEventListener("click", () => {
        const val = $("#teach-input").value.trim();
        if (val.length < 15) {
          alert("버디가 충분히 이해할 수 있도록 최소 15자 이상 구체적으로 설명해 주세요!");
          return;
        }

        // 키워드 분석 로직 (데모 AI)
        analyzeExplanation(val, unit);
      });

    } else if (ui.teachStep === 2) {
      // Step 2: 버디의 소크라테스 역질문 응답
      const qData = ui.currentSocratic;
      screen.innerHTML = `
        <div class="buddy-stage" style="margin-bottom:16px;">
          <div class="buddy-speech" style="color:#0F172A; text-align:left;">
            🤔 <strong>${p.name}:</strong><br/>
            "${qData.question}"
          </div>
          <div class="buddy-avatar-wrap">
            ${window.renderBuddy("confused", p.type, state.equipped)}
          </div>
          <div style="font-size:12px; color:#F59E0B; font-weight:700; margin-top:6px;">
            버디가 설명의 핵심 조건을 확인하고 있어요!
          </div>
        </div>

        <div class="card">
          <label style="font-size:13px; font-weight:700; margin-bottom:6px; display:block;">
            버디의 질문에 답해 주세요:
          </label>
          <input type="text" id="answer-input" class="text-input" placeholder="답변을 입력해 주세요..." style="margin-bottom:12px;"/>
          ${qData.hint ? `<div style="font-size:12px; color:#FBBF24; background:rgba(245,158,11,0.15); padding:8px 12px; border-radius:8px; margin-bottom:12px;">💡 힌트: ${qData.hint}</div>` : ''}

          <button class="btn-primary" id="btn-submit-answer">
            답변 확인 및 버디 가르치기 →
          </button>
        </div>
      `;

      $("#btn-submit-answer").addEventListener("click", () => {
        const ans = $("#answer-input").value.trim();
        if (!ans) {
          alert("답변을 입력해 주세요.");
          return;
        }
        checkSocraticAnswer(ans, qData, unit);
      });

    } else if (ui.teachStep === 3) {
      // Step 3: 세션 성공 완료
      screen.innerHTML = `
        <div class="buddy-stage">
          <div class="buddy-speech">
            🎉 <strong>"와! 완벽하게 이해했어요!"</strong><br/>
            선생님 설명 덕분에 개념이 명쾌하게 정리되었어요! (+50 XP)
          </div>
          <div class="buddy-avatar-wrap is-correct">
            ${window.renderBuddy("understood", p.type, state.equipped)}
          </div>
          <div style="font-size:15px; font-weight:800; color:#10B981; margin-top:8px;">
            ✓ '${unit.title}' 가르치기 완료!
          </div>
        </div>

        <div class="card" style="text-align:center;">
          <div style="font-size:13px; color:var(--ink-2); margin-bottom:14px; line-height:1.5;">
            오늘 학습한 개념은 <strong>내일(${addDays(today(), 1)})</strong> 1차 간격 복습 퀴즈로 등록되었습니다.
          </div>
          <button class="btn-primary" id="btn-done-teach">
            홈으로 돌아가기
          </button>
        </div>
      `;

      $("#btn-done-teach").addEventListener("click", () => {
        ui.tab = "home";
        ui.teachStep = 1;
        ui.mood = "listening";
        render();
      });
    }
  }

  function analyzeExplanation(text, unit) {
    let missingSocratic = null;

    // 단원별 누락된 개념 체크
    if (unit.id === "math_linear") {
      if (!text.includes("기울기") && !text.includes("a")) {
        missingSocratic = {
          question: unit.socratic.missing_slope.q,
          expected: unit.socratic.missing_slope.expected,
          hint: "x의 증가량에 대한 y의 증가량 비율을 뜻하는 용어예요."
        };
      } else if (!text.includes("0이 아니") && !text.includes("a≠0") && !text.includes("a가 0")) {
        missingSocratic = {
          question: unit.socratic.missing_a.q,
          expected: unit.socratic.missing_a.expected,
          hint: "a가 0이면 x가 사라져서 상수함수가 돼요!"
        };
      } else {
        missingSocratic = {
          question: unit.socratic.missing_intercept.q,
          expected: unit.socratic.missing_intercept.expected,
          hint: "x가 0일 때 y의 값(y축과 만나는 점)이에요."
        };
      }
    } else if (unit.id === "sci_photosyn") {
      if (!text.includes("빛") && !text.includes("에너지")) {
        missingSocratic = {
          question: unit.socratic.missing_energy.q,
          expected: unit.socratic.missing_energy.expected,
          hint: "빛은 화학 반응을 일으키는 원동력인 에너지원이에요."
        };
      } else if (!text.includes("포도당") && !text.includes("산소")) {
        missingSocratic = {
          question: unit.socratic.missing_products.q,
          expected: unit.socratic.missing_products.expected,
          hint: "식물이 스스로 만드는 영양분(탄수화물)이에요."
        };
      } else {
        missingSocratic = {
          question: unit.socratic.missing_materials.q,
          expected: unit.socratic.missing_materials.expected,
          hint: "물과 공기 중에서 흡수하는 기체예요."
        };
      }
    } else {
      // 국어, 사회, 영어 기본 질문 매핑
      const keys = Object.keys(unit.socratic);
      const chosen = unit.socratic[keys[0]];
      missingSocratic = {
        question: chosen.q,
        expected: chosen.expected,
        hint: "개념의 정의나 구체적 예시를 떠올려 보세요!"
      };
    }

    ui.currentSocratic = missingSocratic;
    ui.teachStep = 2;
    render();
  }

  function checkSocraticAnswer(ans, qData, unit) {
    const isHit = qData.expected.some(kw => ans.includes(kw));

    if (isHit || ans.length >= 8) {
      // 성공 처리
      state.profile.xp += CONFIG.REWARD.TEACH_COMPLETE;
      state.profile.level = getLevel(state.profile.xp);
      ui.mood = "understood";

      // 세션 기록
      state.sessions.push({
        id: Date.now(),
        unitId: unit.id,
        unitTitle: unit.title,
        date: today()
      });

      // 복습 큐 등록 (1일 후)
      if (!state.reviews.some(r => r.unitId === unit.id)) {
        state.reviews.push({
          unitId: unit.id,
          unitTitle: unit.title,
          step: 0,
          nextDate: addDays(today(), 1)
        });
      }

      saveState();
      ui.teachStep = 3;
      render();
    } else {
      alert("버디가 아직 조금 헷갈려해요! 힌트를 참고해서 한 번 더 자세히 설명해 주세요.");
    }
  }

  /* =====================================================================
     3. 간격 복습 화면
     ===================================================================== */
  function renderReviewScreen(screen) {
    const pending = state.reviews.filter(r => r.nextDate <= today());

    if (ui.reviewActiveItem) {
      // 퀴즈 진행 중
      const unit = CONTENT.UNITS.find(u => u.id === ui.reviewActiveItem.unitId) || CONTENT.UNITS[0];
      const q = unit.quizzes[ui.reviewQuizIdx] || unit.quizzes[0];

      screen.innerHTML = `
        <div class="card">
          <div class="card-head">
            <span style="font-size:12px; color:#A5B4FC; font-weight:700;">${unit.subject} · ${unit.title}</span>
            <span style="font-size:12px; color:#94A3B8;">문제 ${ui.reviewQuizIdx + 1}/2</span>
          </div>
          <div style="font-size:15px; font-weight:800; margin-bottom:16px; line-height:1.4;">${q.q}</div>

          <div style="display:flex; flex-direction:column; gap:8px;">
            ${q.options.map((opt, idx) => `
              <button class="survey-opt review-choice" data-idx="${idx}">
                ${idx + 1}. ${opt}
              </button>
            `).join("")}
          </div>
        </div>
      `;

      screen.querySelectorAll(".review-choice").forEach(btn => {
        btn.addEventListener("click", () => {
          const chosen = Number(btn.dataset.idx);
          if (chosen === q.answer) {
            state.profile.xp += CONFIG.REWARD.REVIEW_QUIZ;
            state.profile.level = getLevel(state.profile.xp);
            showToast("🎉 정답입니다! (+20 XP)");

            if (ui.reviewQuizIdx === 0 && unit.quizzes.length > 1) {
              ui.reviewQuizIdx = 1;
              render();
            } else {
              // 복습 성공: 간격 증가
              const rItem = state.reviews.find(r => r.unitId === ui.reviewActiveItem.unitId);
              if (rItem) {
                rItem.step = Math.min(rItem.step + 1, CONFIG.REVIEW_INTERVALS.length - 1);
                rItem.nextDate = addDays(today(), CONFIG.REVIEW_INTERVALS[rItem.step]);
              }
              saveState();
              ui.reviewActiveItem = null;
              ui.reviewQuizIdx = 0;
              alert(`훌륭합니다! 장기기억으로 전환되어 다음 복습일은 ${CONFIG.REVIEW_INTERVALS[rItem ? rItem.step : 1]}일 뒤로 설정되었습니다.`);
              render();
            }
          } else {
            alert(`아쉬워요! 오답입니다.
해설: ${q.explain}
기억을 다지기 위해 내일 다시 복습합니다.`);
            const rItem = state.reviews.find(r => r.unitId === ui.reviewActiveItem.unitId);
            if (rItem) {
              rItem.step = 0;
              rItem.nextDate = addDays(today(), 1);
            }
            saveState();
            ui.reviewActiveItem = null;
            ui.reviewQuizIdx = 0;
            render();
          }
        });
      });
      return;
    }

    screen.innerHTML = `
      <div class="card">
        <div class="card-title">📝 복습 대기 목록</div>
        <p style="font-size:12.5px; color:var(--ink-2); margin-top:4px; margin-bottom:14px;">
          에빙하우스 망각곡선 주기에 맞춰 오늘 복습해야 할 개념입니다.
        </p>

        ${pending.length === 0 ? `
          <div style="background:var(--surface-2); padding:20px; border-radius:12px; text-align:center;">
            <div style="font-size:24px; margin-bottom:6px;">🌟</div>
            <div style="font-size:14px; font-weight:700;">오늘 복습할 항목이 없습니다!</div>
            <div style="font-size:12px; color:var(--ink-3); margin-top:2px;">새로운 개념을 가르쳐 복습 목록을 채워보세요.</div>
          </div>
        ` : `
          <div style="display:flex; flex-direction:column; gap:10px;">
            ${pending.map(r => `
              <div style="background:var(--surface-2); padding:12px 14px; border-radius:12px; display:flex; justify-content:space-between; align-items:center;">
                <div>
                  <div style="font-size:13.5px; font-weight:700;">${r.unitTitle}</div>
                  <div style="font-size:11.5px; color:#F59E0B;">${r.step + 1}단계 간격 복습</div>
                </div>
                <button class="btn-primary start-rev-btn" data-unit="${r.unitId}" style="width:auto; padding:6px 14px; font-size:12px;">
                  복습 풀기 →
                </button>
              </div>
            `).join("")}
          </div>
        `}
      </div>
    `;

    screen.querySelectorAll(".start-rev-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const uId = btn.dataset.unit;
        ui.reviewActiveItem = state.reviews.find(r => r.unitId === uId);
        ui.reviewQuizIdx = 0;
        render();
      });
    });
  }

  /* =====================================================================
     4. 랭킹 (시즌 리그) 화면
     ===================================================================== */
  function renderLeagueScreen(screen) {
    const p = state.profile;
    const allUsers = [
      ...CONTENT.LEAGUE_MOCK,
      { rank: 99, name: `${p.name} (나)`, xp: p.xp, level: p.level, type: p.type, isMe: true }
    ].sort((a, b) => b.xp - a.xp);

    allUsers.forEach((u, i) => u.rank = i + 1);

    screen.innerHTML = `
      <div class="card">
        <div class="card-head">
          <div class="card-title">🏆 옥종고 메타인지 시즌 리그</div>
          <span style="font-size:11px; color:#38BDF8; font-weight:700;">주간 XP 기준</span>
        </div>
        <p style="font-size:12px; color:var(--ink-3); margin-bottom:14px;">
          개념을 가르치고 복습할수록 랭크가 올라갑니다.
        </p>

        <div style="display:flex; flex-direction:column; gap:8px;">
          ${allUsers.map(u => `
            <div style="background:${u.isMe ? 'rgba(99, 102, 241, 0.2)' : 'var(--surface-2)'}; border:${u.isMe ? '1px solid #818CF8' : 'none'}; padding:12px 14px; border-radius:12px; display:flex; justify-content:space-between; align-items:center;">
              <div style="display:flex; align-items:center; gap:12px;">
                <span style="font-size:14px; font-weight:800; width:20px; color:${u.rank <= 3 ? '#FBBF24' : 'var(--ink-3)'}">${u.rank}</span>
                <div>
                  <div style="font-size:13.5px; font-weight:700;">${u.name}</div>
                  <div style="font-size:11px; color:var(--ink-3);">Lv.${u.level} · ${CONTENT.PERSONALITIES[u.type] ? CONTENT.PERSONALITIES[u.type].name : '버디'}</div>
                </div>
              </div>
              <div style="font-size:13px; font-weight:800; color:#38BDF8;">
                ${u.xp} XP
              </div>
            </div>
          `).join("")}
        </div>
      </div>
    `;
  }

  /* =====================================================================
     5. 꾸미기 (옷장) 화면
     ===================================================================== */
  function renderWardrobeScreen(screen) {
    const p = state.profile;
    const items = CONTENT.WARDROBE;

    screen.innerHTML = `
      <div class="buddy-stage" style="margin-bottom:16px;">
        <div class="buddy-avatar-wrap">
          ${window.renderBuddy("happy", p.type, state.equipped)}
        </div>
        <div style="font-size:14px; font-weight:700; margin-top:8px;">착용 미리보기</div>
      </div>

      <div class="card">
        <div class="card-title" style="margin-bottom:12px;">🎨 버디 악세사리 해금</div>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
          ${items.map(item => {
            const isUnlocked = p.level >= item.unlockLv;
            const isEquipped = state.equipped[item.slot] === item.id;
            return `
              <div style="background:var(--surface-2); padding:12px; border-radius:12px; border:1px solid ${isEquipped ? '#818CF8' : 'transparent'}; text-align:center;">
                <div style="font-size:14px; font-weight:700; margin-bottom:4px;">${item.name}</div>
                <div style="font-size:11px; color:var(--ink-3); margin-bottom:8px;">${item.desc}</div>
                ${isUnlocked ? `
                  <button class="btn-primary toggle-equip" data-slot="${item.slot}" data-id="${item.id}" style="padding:6px; font-size:12px; background:${isEquipped ? '#EF4444' : '#6366F1'};">
                    ${isEquipped ? '해제' : '착용'}
                  </button>
                ` : `
                  <div style="font-size:11px; color:#F59E0B; background:rgba(245,158,11,0.15); padding:4px; border-radius:6px;">
                    Lv.${item.unlockLv}에 해금
                  </div>
                `}
              </div>
            `;
          }).join("")}
        </div>
      </div>
    `;

    screen.querySelectorAll(".toggle-equip").forEach(btn => {
      btn.addEventListener("click", () => {
        const slot = btn.dataset.slot;
        const id = btn.dataset.id;
        if (state.equipped[slot] === id) {
          state.equipped[slot] = null;
          showToast("착용을 해제했습니다.");
        } else {
          state.equipped[slot] = id;
          showToast("아이템을 착용했습니다!");
        }
        saveState();
        render();
      });
    });
  }

  /* =====================================================================
     6. 설정 화면
     ===================================================================== */
  function renderSettingsScreen(screen) {
    const p = state.profile;
    screen.innerHTML = `
      <div class="card">
        <div class="card-title" style="margin-bottom:14px;">⚙️ 버디 환경 설정</div>

        <div style="margin-bottom:16px;">
          <label style="font-size:12px; color:var(--ink-3); display:block; margin-bottom:4px;">버디 이름 변경</label>
          <div style="display:flex; gap:8px;">
            <input type="text" id="rename-input" class="text-input" value="${p.name}"/>
            <button class="btn-primary" id="btn-rename" style="width:80px; padding:8px;">저장</button>
          </div>
        </div>

        <div style="display:flex; flex-direction:column; gap:8px; border-top:1px solid var(--line); padding-top:14px;">
          <button class="btn-secondary" id="btn-retake-survey">
            성향 검사 다시 하기
          </button>
          <button class="btn-secondary" id="btn-load-demo">
            데모 데이터 불러오기 (Lv3 체험)
          </button>
          <button class="btn-secondary" id="btn-reset-all" style="color:#EF4444; border-color:#EF444444;">
            전체 데이터 초기화
          </button>
        </div>
      </div>
    `;

    $("#btn-rename").addEventListener("click", () => {
      const n = $("#rename-input").value.trim();
      if (!n) return;
      state.profile.name = n;
      saveState();
      showToast("버디 이름이 변경되었습니다.");
      render();
    });

    $("#btn-retake-survey").addEventListener("click", () => {
      ui.onboardStep = 0;
      ui.onboardScores = { curious: 0, meticulous: 0, cheer: 0, challenger: 0 };
      state = null;
      localStorage.removeItem(CONFIG.STORAGE_KEY);
      renderOnboarding();
    });

    $("#btn-load-demo").addEventListener("click", () => {
      loadDemoData();
    });

    $("#btn-reset-all").addEventListener("click", () => {
      if (confirm("모든 학습 기록과 버디 성장 경험치를 초기화할까요?")) {
        localStorage.removeItem(CONFIG.STORAGE_KEY);
        state = null;
        ui.onboardStep = 0;
        renderOnboarding();
      }
    });
  }

  function loadDemoData() {
    state = {
      v: 2,
      profile: {
        name: "옥종꿈나무",
        type: "curious",
        level: 3,
        xp: 240,
        streak: 3,
        lastLogin: today()
      },
      sessions: [
        { id: 1, unitId: "math_linear", unitTitle: "일차함수의 기울기와 그래프", date: addDays(today(), -2) },
        { id: 2, unitId: "sci_photosyn", unitTitle: "식물의 광합성과 에너지", date: addDays(today(), -1) }
      ],
      reviews: [
        { unitId: "math_linear", unitTitle: "일차함수의 기울기와 그래프", step: 1, nextDate: today() }
      ],
      equipped: { head: "mortarboard", neck: "scarf", face: null }
    };
    saveState();
    ui.tab = "home";
    showToast("데모 데이터를 불러왔습니다!");
    render();
  }

  /* =====================================================================
     0. 온보딩 화면 (성향 검사 6문항)
     ===================================================================== */
  function renderOnboarding() {
    $("#topbar").innerHTML = `<span class="app-logo" style="margin:0 auto;">STUDY-BUDDY</span>`;
    $("#tabbar").innerHTML = "";

    const screen = $("#screen");
    const qList = CONTENT.ONBOARDING_QUIZ;

    if (ui.onboardStep < qList.length) {
      // 설문 문항 진행
      const curr = qList[ui.onboardStep];
      screen.innerHTML = `
        <div class="card" style="margin-top:20px;">
          <div style="font-size:12px; color:#818CF8; font-weight:700; margin-bottom:6px;">
            버디 성향 검사 (${ui.onboardStep + 1}/${qList.length})
          </div>
          <div style="font-size:16px; font-weight:800; margin-bottom:16px; line-height:1.4;">
            ${curr.q}
          </div>
          <div style="display:flex; flex-direction:column; gap:8px;">
            ${curr.options.map((opt, idx) => `
              <button class="survey-opt opt-choice" data-type="${opt.type}">
                ${opt.text}
              </button>
            `).join("")}
          </div>
          <div style="margin-top:14px; text-align:center;">
            <button id="btn-quick-demo" style="font-size:12px; color:var(--ink-3); text-decoration:underline;">
              검사 건너뛰고 데모로 둘러보기 →
            </button>
          </div>
        </div>
      `;

      screen.querySelectorAll(".opt-choice").forEach(btn => {
        btn.addEventListener("click", () => {
          ui.onboardScores[btn.dataset.type]++;
          ui.onboardStep++;
          renderOnboarding();
        });
      });

      $("#btn-quick-demo").addEventListener("click", () => {
        loadDemoData();
      });

    } else {
      // 설문 완료 및 결과 확인
      let bestType = "curious";
      let maxScore = -1;
      for (const [t, s] of Object.entries(ui.onboardScores)) {
        if (s > maxScore) {
          maxScore = s;
          bestType = t;
        }
      }
      ui.detectedType = bestType;
      const typeMeta = CONTENT.PERSONALITIES[bestType];

      screen.innerHTML = `
        <div class="buddy-stage" style="margin-top:20px;">
          <div class="buddy-speech">
            반가워요! 저는 <strong>${typeMeta.name}</strong>예요!
          </div>
          <div class="buddy-avatar-wrap">
            ${window.renderBuddy("happy", bestType, {})}
          </div>
          <div style="font-size:18px; font-weight:800; color:${typeMeta.color}; margin-top:8px;">
            ${typeMeta.name} (${typeMeta.tag})
          </div>
          <p style="font-size:13px; color:var(--ink-2); line-height:1.5; margin-top:6px; padding:0 10px;">
            ${typeMeta.desc}
          </p>
        </div>

        <div class="card">
          <label style="font-size:13px; font-weight:700; margin-bottom:6px; display:block;">
            내 버디의 이름을 지어주세요:
          </label>
          <input type="text" id="buddy-name-input" class="text-input" value="옥종버디" style="margin-bottom:12px;"/>

          <button class="btn-primary" id="btn-finish-onboarding">
            학습 시작하기 →
          </button>
        </div>
      `;

      $("#btn-finish-onboarding").addEventListener("click", () => {
        const nameVal = $("#buddy-name-input").value.trim() || "옥종버디";
        state = blankState();
        state.profile = {
          name: nameVal,
          type: ui.detectedType,
          level: 1,
          xp: 0,
          streak: 1,
          lastLogin: today()
        };
        saveState();
        ui.tab = "home";
        render();
      });
    }
  }

  /* =====================================================================
     초기 실행
     ===================================================================== */
  state = loadState();
  render();
})();
