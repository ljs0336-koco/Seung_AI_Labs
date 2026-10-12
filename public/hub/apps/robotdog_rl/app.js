/**
 * app.js - RoboDog RL Playground Main Application Controller
 * 
 * Supports Q-Learning vs SARSA side-by-side comparison,
 * 2D Robodog 콩콩 animation, live reward curve chart, and mission labs.
 * MIT License.
 */

// Global State
const STATE = {
  mode: 'compare',        // 'q_learning' | 'sarsa' | 'compare'
  missionId: 'mission_2', // default comparison_01 benchmark
  speed: 'normal',        // 'slow' (400ms) | 'normal' (200ms) | 'fast' (60ms)
  isRunning: false,
  isPaused: false,
  episodesPlanned: 10,
  currentSeed: 42,
  
  // Environments & Algorithms
  qEnv: null,
  qAlgo: null,
  sEnv: null,
  sAlgo: null,

  // History & Statistics
  history: {
    qLearning: { rewards: [], avgRewards: [], successes: 0, collisions: 0, hazards: 0, stepsList: [] },
    sarsa: { rewards: [], avgRewards: [], successes: 0, collisions: 0, hazards: 0, stepsList: [] }
  },

  // Active Tool for Map Editor
  activeTool: null, // 'obstacle' | 'hazard' | 'battery' | 'empty' | 'start' | 'goal'
  showPolicyArrows: true,
  explorationMode: false, // Beginner vs Exploration

  // Selected cell for Q-inspector
  inspectedCell: null
};

// Comic messages
const COMIC_QUOTES = {
  idle: [
    "멍멍! 간식 냄새를 찾고 있어요.",
    "어디로 먼저 가볼까?",
    "로보독 준비 완료!"
  ],
  move: [
    "콩콩! 냄새를 따라가는 중...",
    "한 걸음 더! 🐾",
    "지름길을 찾아보자!"
  ],
  collision: [
    "쿵! 벽이다 멍? 이쪽은 막혔어요 🚧",
    "아야! 벽에 부딪혔어요.",
    "충돌 벌점 -3점! 다른 길로 가야겠어요."
  ],
  hazard: [
    "앗 차가워! 물에 빠졌어요 💧",
    "미끌~ 웅덩이는 너무 위험해요!",
    "위험 벌점 -10점! 여긴 피해야 해!"
  ],
  battery: [
    "지잉~ 배터리 충전 완료! 🔋",
    "에너지가 찼어요! 보너스 +2점!"
  ],
  goal: [
    "와아! 맛있는 간식 겟! 🍖 꼬리 살랑~",
    "목표 도착! 최고의 보상 +10점!",
    "간식 냄새가 맞았어요!"
  ],
  timeout: [
    "헥헥... 걸음 수가 너무 많아요!",
    "시간 초과! 다음엔 더 서둘러야겠어요."
  ],
  sarsa_safe: [
    "웅덩이는 위험하니까 안전하게 우회할게요!",
    "SARSA: 돌아가더라도 안전이 최고!"
  ],
  q_bold: [
    "Q-Learning: 가장 짧은 지름길로 직진!",
    "위험해도 제일 빠른 길을 알아요!"
  ]
};

// -------------------------------------------------------------
// INITIALIZATION
// -------------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
  initEnvironments();
  setupUIEventListeners();
  renderAll();
  drawChart();
});

function initEnvironments() {
  const mission = PRESET_MISSIONS[STATE.missionId];

  // Q-Learning Env & Algo
  STATE.qEnv = new GridWorldEnvironment({ missionId: STATE.missionId });
  STATE.qAlgo = new QLearningAlgorithm(STATE.qEnv.rows, STATE.qEnv.cols, {
    learningRate: 0.1,
    discountFactor: 0.9,
    explorationRate: 0.25,
    seed: STATE.currentSeed
  });

  // SARSA Env & Algo (identical seed & map)
  STATE.sEnv = STATE.qEnv.clone();
  STATE.sAlgo = new SarsaAlgorithm(STATE.sEnv.rows, STATE.sEnv.cols, {
    learningRate: 0.1,
    discountFactor: 0.9,
    explorationRate: 0.25,
    seed: STATE.currentSeed
  });

  // Reset history
  STATE.history = {
    qLearning: { rewards: [], avgRewards: [], successes: 0, collisions: 0, hazards: 0, stepsList: [] },
    sarsa: { rewards: [], avgRewards: [], successes: 0, collisions: 0, hazards: 0, stepsList: [] }
  };
}

// -------------------------------------------------------------
// UI RENDERING
// -------------------------------------------------------------
function renderAll() {
  updateModeView();
  renderMissionBanner();
  renderBoard('qlearn', STATE.qEnv, STATE.qAlgo);
  renderBoard('sarsa', STATE.sEnv, STATE.sAlgo);
  updateStatsDisplay();
  drawChart();
}

function updateModeView() {
  const workspace = document.getElementById('workspace-grid');
  const sarsaCard = document.getElementById('arena-card-sarsa');
  const qlearnCard = document.getElementById('arena-card-qlearn');

  // Toggle button active classes
  document.querySelectorAll('.btn-mode').forEach(b => b.classList.remove('active'));
  document.getElementById(`btn-mode-${STATE.mode}`)?.classList.add('active');

  if (STATE.mode === 'compare') {
    workspace.className = 'workspace-grid dual-view';
    sarsaCard.style.display = 'flex';
    qlearnCard.style.display = 'flex';
  } else if (STATE.mode === 'q_learning') {
    workspace.className = 'workspace-grid';
    qlearnCard.style.display = 'flex';
    sarsaCard.style.display = 'none';
  } else if (STATE.mode === 'sarsa') {
    workspace.className = 'workspace-grid';
    sarsaCard.style.display = 'flex';
    qlearnCard.style.display = 'none';
  }
}

function renderMissionBanner() {
  const m = PRESET_MISSIONS[STATE.missionId];
  document.querySelectorAll('.btn-mission').forEach(b => b.classList.remove('active'));
  document.getElementById(`btn-mission-${STATE.missionId}`)?.classList.add('active');

  const titleEl = document.getElementById('mission-title');
  const descEl = document.getElementById('mission-desc');
  const qEl = document.getElementById('mission-question');

  if (titleEl) titleEl.textContent = m.name;
  if (descEl) descEl.textContent = m.desc;
  if (qEl) qEl.textContent = `💡 탐구 질문: ${m.question}`;
}

// Render individual grid board (for Q-Learning or SARSA)
function renderBoard(targetKey, env, algo) {
  const boardEl = document.getElementById(`grid-board-${targetKey}`);
  if (!boardEl) return;

  const rows = env.rows;
  const cols = env.cols;

  boardEl.style.gridTemplateRows = `repeat(${rows}, 1fr)`;
  boardEl.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
  boardEl.innerHTML = '';

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const tile = env.getTile(r, c);
      const stateKey = `${r},${c}`;
      const cell = document.createElement('div');
      cell.className = `grid-cell cell-${tile}`;
      cell.dataset.r = r;
      cell.dataset.c = c;
      cell.dataset.target = targetKey;

      // Icon for special cells
      if (TILE_ICONS[tile]) {
        const iconSpan = document.createElement('span');
        iconSpan.className = 'cell-icon';
        iconSpan.textContent = TILE_ICONS[tile];
        cell.appendChild(iconSpan);
      }

      // Policy Arrow Overlay (if enabled & not obstacle)
      if (STATE.showPolicyArrows && tile !== 'obstacle' && tile !== 'goal') {
        const bestAction = algo.getPolicyDirection(stateKey);
        if (bestAction) {
          const arrow = document.createElement('span');
          arrow.className = `policy-arrow dir-${bestAction}`;
          arrow.innerHTML = '↑';
          // Opacity based on max Q value
          const val = algo.getValue(stateKey);
          arrow.style.opacity = Math.max(0.35, Math.min(1.0, (val + 10) / 20));
          cell.appendChild(arrow);
        }
      }

      // Inspection click handler
      cell.addEventListener('click', (e) => {
        if (STATE.activeTool) {
          handleTilePaint(r, c, STATE.activeTool);
        } else {
          inspectCell(r, c, algo, targetKey);
        }
      });

      boardEl.appendChild(cell);
    }
  }

  // Position Robodog Agent
  positionAgent(targetKey, env.agentPos, env.lastAction);
}

function positionAgent(targetKey, pos, action = 'right', spriteState = 'idle') {
  const agentEl = document.getElementById(`robodog-${targetKey}`);
  const boardEl = document.getElementById(`grid-board-${targetKey}`);
  if (!agentEl || !boardEl) return;

  const cell = boardEl.querySelector(`.grid-cell[data-r="${pos.r}"][data-c="${pos.c}"]`);
  if (!cell) return;

  const cellWidth = cell.offsetWidth;
  const cellHeight = cell.offsetHeight;
  const left = cell.offsetLeft + (cellWidth - agentEl.offsetWidth) / 2;
  const top = cell.offsetTop + (cellHeight - agentEl.offsetHeight) / 2;

  agentEl.style.left = `${left}px`;
  agentEl.style.top = `${top}px`;

  // Orientation
  agentEl.className = `robodog-agent facing-${action}`;

  // Image sprite selection based on event
  const imgEl = agentEl.querySelector('.robodog-img');
  if (imgEl) {
    if (spriteState === 'jump' || spriteState === 'move') {
      imgEl.src = 'assets/robodog_jump.png';
      agentEl.classList.add('hopping');
      setTimeout(() => agentEl.classList.remove('hopping'), 280);
    } else if (spriteState === 'collision') {
      imgEl.src = 'assets/robodog_crash.png';
    } else if (spriteState === 'hazard') {
      imgEl.src = 'assets/robodog_hazard.png';
    } else if (spriteState === 'goal') {
      imgEl.src = 'assets/robodog_snack.png';
    } else {
      imgEl.src = 'assets/robodog_idle.png';
    }
  }
}

// Show comic speech bubble
function showComicBubble(targetKey, text, duration = 2000) {
  const bubble = document.getElementById(`bubble-${targetKey}`);
  if (!bubble) return;
  bubble.textContent = text;
  bubble.classList.add('show');
  clearTimeout(bubble._timer);
  bubble._timer = setTimeout(() => {
    bubble.classList.remove('show');
  }, duration);
}

// -------------------------------------------------------------
// REINFORCEMENT LEARNING EXECUTION LOOPS
// -------------------------------------------------------------

// 1 Episode Step-by-Step with Animation
async function runVisualEpisode() {
  if (STATE.isRunning) return;
  STATE.isRunning = true;
  updateControlsState(true);

  // Reset environments to start
  const qState = STATE.qEnv.reset();
  const sState = STATE.sEnv.reset();
  renderBoard('qlearn', STATE.qEnv, STATE.qAlgo);
  renderBoard('sarsa', STATE.sEnv, STATE.sAlgo);

  let qDone = false;
  let sDone = false;
  let qCurrS = qState;
  let sCurrS = sState;

  // Initial actions
  let qAction = STATE.qAlgo.chooseAction(qCurrS);
  let sAction = STATE.sAlgo.chooseAction(sCurrS);

  const delayMs = { slow: 450, normal: 220, fast: 70 }[STATE.speed] || 220;

  showComicBubble('qlearn', '콩콩! 간식을 찾아 출발! 🏠');
  showComicBubble('sarsa', '조심조심 냄새를 따라가요! 🏠');

  while ((!qDone || !sDone) && STATE.isRunning) {
    await sleep(delayMs);

    // 1. Step Q-Learning
    if (!qDone) {
      const qRes = STATE.qEnv.step(qAction);
      qDone = qRes.done;
      STATE.qAlgo.learningStep(qCurrS, qAction, qRes.reward, qRes.nextState, qDone);
      positionAgent('qlearn', qRes.agentPos, qAction, qRes.event);

      // Comic commentary
      if (qRes.event === 'collision') showComicBubble('qlearn', '쿵! 벽이다 멍? 🚧');
      else if (qRes.event === 'hazard') showComicBubble('qlearn', '앗 차가워! 물웅덩이 💧');
      else if (qRes.event === 'goal') showComicBubble('qlearn', '간식 겟! 맛있다 멍! 🍖');

      if (!qDone) {
        qAction = STATE.qAlgo.chooseAction(qRes.nextState);
        qCurrS = qRes.nextState;
      }
    }

    // 2. Step SARSA
    if (!sDone) {
      const sRes = STATE.sEnv.step(sAction);
      sDone = sRes.done;
      const sNextAction = sDone ? null : STATE.sAlgo.chooseAction(sRes.nextState);
      STATE.sAlgo.learningStep(sCurrS, sAction, sRes.reward, sRes.nextState, sDone, { nextAction: sNextAction });
      positionAgent('sarsa', sRes.agentPos, sAction, sRes.event);

      // Comic commentary
      if (sRes.event === 'collision') showComicBubble('sarsa', '벽에 콩! 조심해야지 🚧');
      else if (sRes.event === 'hazard') showComicBubble('sarsa', '물웅덩이에 풍덩! 💧');
      else if (sRes.event === 'goal') showComicBubble('sarsa', '안전하게 간식 도착! 🍖');

      if (!sDone) {
        sAction = sNextAction;
        sCurrS = sRes.nextState;
      }
    }

    updateStatsDisplay();
  }

  // Record stats
  recordEpisodeEnd('qLearning', STATE.qEnv);
  recordEpisodeEnd('sarsa', STATE.sEnv);

  renderBoard('qlearn', STATE.qEnv, STATE.qAlgo);
  renderBoard('sarsa', STATE.sEnv, STATE.sAlgo);
  updateStatsDisplay();
  drawChart();

  STATE.isRunning = false;
  updateControlsState(false);
}

// Multi-Episode Fast Training (e.g. 10 or 30 episodes)
async function trainEpisodes(numEpisodes = 10) {
  if (STATE.isRunning) return;
  STATE.isRunning = true;
  updateControlsState(true);

  for (let ep = 0; ep < numEpisodes && STATE.isRunning; ep++) {
    // Q-Learning fast simulation
    let qS = STATE.qEnv.reset();
    let qDone = false;
    let qA = STATE.qAlgo.chooseAction(qS);
    while (!qDone) {
      const r = STATE.qEnv.step(qA);
      qDone = r.done;
      STATE.qAlgo.learningStep(qS, qA, r.reward, r.nextState, qDone);
      if (!qDone) {
        qA = STATE.qAlgo.chooseAction(r.nextState);
        qS = r.nextState;
      }
    }
    recordEpisodeEnd('qLearning', STATE.qEnv);

    // SARSA fast simulation
    let sS = STATE.sEnv.reset();
    let sDone = false;
    let sA = STATE.sAlgo.chooseAction(sS);
    while (!sDone) {
      const r = STATE.sEnv.step(sA);
      sDone = r.done;
      const nextA = sDone ? null : STATE.sAlgo.chooseAction(r.nextState);
      STATE.sAlgo.learningStep(sS, sA, r.reward, r.nextState, sDone, { nextAction: nextA });
      sA = nextA;
      sS = r.nextState;
    }
    recordEpisodeEnd('sarsa', STATE.sEnv);

    // Update UI occasionally for responsive smoothness
    if (ep % 2 === 0 || ep === numEpisodes - 1) {
      updateStatsDisplay();
      drawChart();
      await sleep(10);
    }
  }

  renderBoard('qlearn', STATE.qEnv, STATE.qAlgo);
  renderBoard('sarsa', STATE.sEnv, STATE.sAlgo);
  updateStatsDisplay();
  drawChart();

  showComicBubble('qlearn', '10회 학습 완료! 정책 화살표를 확인하세요.');
  showComicBubble('sarsa', '10회 학습 완료! 정책 화살표를 확인하세요.');

  STATE.isRunning = false;
  updateControlsState(false);
}

function recordEpisodeEnd(key, env) {
  const h = STATE.history[key];
  const r = env.totalReward;
  h.rewards.push(r);
  h.stepsList.push(env.steps);
  if (env.agentPos.r === env.goalPos.r && env.agentPos.c === env.goalPos.c) {
    h.successes++;
  }
  h.collisions += env.collisions;
  h.hazards += env.hazardsHit;

  // Running 5-episode average
  const windowSize = 5;
  const slice = h.rewards.slice(-windowSize);
  const avg = slice.reduce((a, b) => a + b, 0) / slice.length;
  h.avgRewards.push(avg);
}

function resetTraining() {
  STATE.isRunning = false;
  initEnvironments();
  renderAll();
  showComicBubble('qlearn', '학습이 초기화되었습니다.');
  showComicBubble('sarsa', '학습이 초기화되었습니다.');
}

// -------------------------------------------------------------
// METRICS & STATS
// -------------------------------------------------------------
function updateStatsDisplay() {
  const qH = STATE.history.qLearning;
  const sH = STATE.history.sarsa;

  const setStats = (prefix, h, env) => {
    const epCount = h.rewards.length;
    const lastR = h.rewards[epCount - 1] ?? env.totalReward;
    const succRate = epCount > 0 ? Math.round((h.successes / epCount) * 100) : 0;

    const elEp = document.getElementById(`${prefix}-episodes`);
    const elR = document.getElementById(`${prefix}-reward`);
    const elSteps = document.getElementById(`${prefix}-steps`);
    const elSucc = document.getElementById(`${prefix}-success`);

    if (elEp) elEp.textContent = `${epCount}회`;
    if (elR) elR.textContent = lastR.toFixed(1);
    if (elSteps) elSteps.textContent = env.steps;
    if (elSucc) elSucc.textContent = `${succRate}%`;
  };

  setStats('q', qH, STATE.qEnv);
  setStats('s', sH, STATE.sEnv);
}

// -------------------------------------------------------------
// REWARD CURVE CANVAS CHART
// -------------------------------------------------------------
function drawChart() {
  const canvas = document.getElementById('reward-chart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();

  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  ctx.scale(dpr, dpr);

  const w = rect.width;
  const h = rect.height;
  ctx.clearRect(0, 0, w, h);

  const qRewards = STATE.history.qLearning.rewards;
  const sRewards = STATE.history.sarsa.rewards;
  const maxEpisodes = Math.max(qRewards.length, sRewards.length, 10);

  // Background and Grid lines
  ctx.strokeStyle = '#e5e2df';
  ctx.lineWidth = 1;

  for (let i = 0; i <= 4; i++) {
    const y = 20 + (i * (h - 40)) / 4;
    ctx.beginPath();
    ctx.moveTo(30, y);
    ctx.lineTo(w - 10, y);
    ctx.stroke();
  }

  if (qRewards.length === 0 && sRewards.length === 0) {
    ctx.fillStyle = '#747870';
    ctx.font = '11px JetBrains Mono';
    ctx.fillText('학습을 실행하면 에피소드별 보상 곡선이 그려집니다.', 40, h / 2);
    return;
  }

  // Find min & max reward
  const allR = [...qRewards, ...sRewards];
  const minR = Math.min(-15, ...allR);
  const maxR = Math.max(15, ...allR);

  const getX = (idx) => 35 + (idx / Math.max(1, maxEpisodes - 1)) * (w - 50);
  const getY = (val) => h - 20 - ((val - minR) / (maxR - minR)) * (h - 40);

  // Draw Q-Learning curve (Sage Green #52634c)
  if (qRewards.length > 0) {
    ctx.beginPath();
    ctx.strokeStyle = '#52634c';
    ctx.lineWidth = 2;
    qRewards.forEach((r, idx) => {
      const x = getX(idx);
      const y = getY(r);
      if (idx === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
  }

  // Draw SARSA curve (Terracotta Orange #99462a)
  if (sRewards.length > 0 && STATE.mode !== 'q_learning') {
    ctx.beginPath();
    ctx.strokeStyle = '#99462a';
    ctx.lineWidth = 2;
    sRewards.forEach((r, idx) => {
      const x = getX(idx);
      const y = getY(r);
      if (idx === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
  }
}

// -------------------------------------------------------------
// EVENT HANDLERS & CONTROLS
// -------------------------------------------------------------
function setupUIEventListeners() {
  // Mode selection
  document.getElementById('btn-mode-q_learning')?.addEventListener('click', () => {
    STATE.mode = 'q_learning';
    updateModeView();
  });
  document.getElementById('btn-mode-sarsa')?.addEventListener('click', () => {
    STATE.mode = 'sarsa';
    updateModeView();
  });
  document.getElementById('btn-mode-compare')?.addEventListener('click', () => {
    STATE.mode = 'compare';
    updateModeView();
  });

  // Mission selection
  document.getElementById('btn-mission-mission_1')?.addEventListener('click', () => switchMission('mission_1'));
  document.getElementById('btn-mission-mission_2')?.addEventListener('click', () => switchMission('mission_2'));
  document.getElementById('btn-mission-mission_3')?.addEventListener('click', () => switchMission('mission_3'));

  // Execution buttons
  document.getElementById('btn-run-visual')?.addEventListener('click', () => runVisualEpisode());
  document.getElementById('btn-train-10')?.addEventListener('click', () => trainEpisodes(10));
  document.getElementById('btn-stop')?.addEventListener('click', () => {
    STATE.isRunning = false;
    updateControlsState(false);
  });
  document.getElementById('btn-reset')?.addEventListener('click', () => resetTraining());

  // Speed buttons
  ['slow', 'normal', 'fast'].forEach(spd => {
    document.getElementById(`btn-spd-${spd}`)?.addEventListener('click', () => {
      STATE.speed = spd;
      document.querySelectorAll('.btn-spd').forEach(b => b.classList.remove('active'));
      document.getElementById(`btn-spd-${spd}`)?.classList.add('active');
    });
  });

  // Policy toggle
  document.getElementById('toggle-policy')?.addEventListener('change', (e) => {
    STATE.showPolicyArrows = e.target.checked;
    renderBoard('qlearn', STATE.qEnv, STATE.qAlgo);
    renderBoard('sarsa', STATE.sEnv, STATE.sAlgo);
  });

  // Palette tool selection
  document.querySelectorAll('.btn-palette-tool').forEach(btn => {
    btn.addEventListener('click', () => {
      const tool = btn.dataset.tool;
      if (STATE.activeTool === tool) {
        STATE.activeTool = null;
        btn.classList.remove('active');
      } else {
        document.querySelectorAll('.btn-palette-tool').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        STATE.activeTool = tool;
      }
    });
  });

  // Reward slider bindings
  setupRewardSliders();

  // Export JSON summary
  document.getElementById('btn-export-json')?.addEventListener('click', exportResultsJSON);
}

function switchMission(missionId) {
  STATE.missionId = missionId;
  STATE.isRunning = false;
  initEnvironments();
  renderAll();
}

function setupRewardSliders() {
  const rewards = [
    { id: 'rew-goal', key: 'goal', display: 'val-goal' },
    { id: 'rew-hazard', key: 'hazard', display: 'val-hazard' },
    { id: 'rew-step', key: 'step', display: 'val-step' },
    { id: 'rew-obstacle', key: 'obstacle', display: 'val-obstacle' },
    { id: 'rew-battery', key: 'battery', display: 'val-battery' }
  ];

  rewards.forEach(r => {
    const input = document.getElementById(r.id);
    const disp = document.getElementById(r.display);
    if (!input || !disp) return;

    input.value = STATE.qEnv.rewards[r.key];
    disp.textContent = Number(input.value).toFixed(1);

    input.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      disp.textContent = val.toFixed(1);
      STATE.qEnv.rewards[r.key] = val;
      STATE.sEnv.rewards[r.key] = val;
    });
  });
}

function handleTilePaint(r, c, tool) {
  STATE.qEnv.setTile(r, c, tool);
  STATE.sEnv.setTile(r, c, tool);
  renderBoard('qlearn', STATE.qEnv, STATE.qAlgo);
  renderBoard('sarsa', STATE.sEnv, STATE.sAlgo);
}

function inspectCell(r, c, algo, targetKey) {
  const stateKey = `${r},${c}`;
  const qObj = algo.getAllQ(stateKey);
  const best = algo.getBestActions(stateKey);

  const inspectBox = document.getElementById('inspect-box');
  if (!inspectBox) return;

  inspectBox.innerHTML = `
    <div style="font-size:0.75rem; font-weight:700; color:var(--primary); margin-bottom:4px;">
      [${targetKey.toUpperCase()}] 셀 (${r}, ${c}) Q-Value
    </div>
    <div style="display:grid; grid-template-columns: repeat(4, 1fr); gap:6px; font-family:var(--font-mono); font-size:0.75rem;">
      <div style="${best.includes('up') ? 'font-weight:700; color:var(--primary);' : ''}">↑: ${qObj.up.toFixed(2)}</div>
      <div style="${best.includes('right') ? 'font-weight:700; color:var(--primary);' : ''}">→: ${qObj.right.toFixed(2)}</div>
      <div style="${best.includes('down') ? 'font-weight:700; color:var(--primary);' : ''}">↓: ${qObj.down.toFixed(2)}</div>
      <div style="${best.includes('left') ? 'font-weight:700; color:var(--primary);' : ''}">←: ${qObj.left.toFixed(2)}</div>
    </div>
  `;
}

function updateControlsState(running) {
  const btnRun = document.getElementById('btn-run-visual');
  const btnTrain = document.getElementById('btn-train-10');
  const btnStop = document.getElementById('btn-stop');
  if (btnRun) btnRun.disabled = running;
  if (btnTrain) btnTrain.disabled = running;
  if (btnStop) btnStop.disabled = !running;
}

function exportResultsJSON() {
  const qH = STATE.history.qLearning;
  const sH = STATE.history.sarsa;

  const data = {
    app: "RoboDog RL Playground (멍멍 RL Playground)",
    mission: STATE.missionId,
    timestamp: new Date().toISOString(),
    config: {
      seed: STATE.currentSeed,
      rewards: STATE.qEnv.rewards,
      learningRate: 0.1,
      discountFactor: 0.9,
      explorationRate: 0.25
    },
    results: {
      qLearning: {
        episodes: qH.rewards.length,
        finalReward: qH.rewards[qH.rewards.length - 1] ?? 0,
        successCount: qH.successes,
        collisionCount: qH.collisions,
        hazardCount: qH.hazards
      },
      sarsa: {
        episodes: sH.rewards.length,
        finalReward: sH.rewards[sH.rewards.length - 1] ?? 0,
        successCount: sH.successes,
        collisionCount: sH.collisions,
        hazardCount: sH.hazards
      }
    }
  };

  const jsonStr = JSON.stringify(data, null, 2);
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(jsonStr).catch(() => {});
  }
  const promptBox = document.getElementById('inspect-box');
  if (promptBox) {
    promptBox.innerHTML = `<strong>📋 실행 결과 JSON 복사 완료:</strong> 에피소드 Q(${qH.rewards.length}회) / SARSA(${sH.rewards.length}회)`;
  }
  return jsonStr;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
