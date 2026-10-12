/**
 * environment.js - RoboDog GridWorld Environment
 * 
 * Supports 6x6 grid, custom tile editing, configurable reward functions,
 * preset educational missions, and the Cliff Walking benchmark (comparison_01).
 * MIT License.
 */

const TILE_TYPES = {
  EMPTY: 'empty',       // 빈 길
  START: 'start',       // 로보독 집 🏠
  GOAL: 'goal',         // 맛있는 간식 🍖
  OBSTACLE: 'obstacle', // 장애물 🚧
  HAZARD: 'hazard',     // 위험 웅덩이 💧
  BATTERY: 'battery'    // 충전 보너스 🔋
};

const TILE_ICONS = {
  empty: '',
  start: '🏠',
  goal: '🍖',
  obstacle: '🚧',
  hazard: '💧',
  battery: '🔋'
};

const TILE_LABELS = {
  empty: '빈 길',
  start: '로보독 집',
  goal: '맛있는 간식',
  obstacle: '장애물',
  hazard: '물웅덩이',
  battery: '배터리'
};

// Default Preset Missions
const PRESET_MISSIONS = {
  // Mission 1: 간식 배달 (Snack Delivery)
  mission_1: {
    id: 'mission_1',
    name: '미션 1. 간식 배달',
    subtitle: '장애물을 피해 간식 그릇에 도착하기',
    desc: '상태, 행동, 보상의 기본 원리를 익힙니다. 한 칸 이동 벌점을 바꾸면 경로가 어떻게 바뀔까요?',
    question: '한 칸 이동 벌점(기본 -0.2)을 -2.0으로 높이면 로보독의 경로는 어떻게 변할까요?',
    rows: 6,
    cols: 6,
    start: { r: 0, c: 0 },
    goal: { r: 5, c: 5 },
    grid: [
      ['start', 'empty', 'empty', 'empty', 'empty', 'empty'],
      ['empty', 'obstacle', 'obstacle', 'empty', 'obstacle', 'empty'],
      ['empty', 'empty', 'obstacle', 'empty', 'empty', 'empty'],
      ['empty', 'empty', 'empty', 'obstacle', 'obstacle', 'empty'],
      ['empty', 'obstacle', 'empty', 'empty', 'obstacle', 'empty'],
      ['empty', 'empty', 'empty', 'empty', 'empty', 'goal']
    ]
  },

  // Mission 2: 웅덩이 산책 (Puddle Walk / Cliff Walking Benchmark)
  // Essential for showing Q-Learning (edge/short) vs SARSA (safe detour)!
  mission_2: {
    id: 'mission_2',
    name: '미션 2. 웅덩이 산책 (Q-Learning vs SARSA 비교)',
    subtitle: '위험한 웅덩이를 피해 간식 찾기 (Cliff Walking)',
    desc: '짧지만 웅덩이 바로 옆을 지나는 길과, 조금 멀지만 안전한 우회로가 공존합니다. Q-Learning과 SARSA의 차이를 관찰해보세요!',
    question: '탐색 중 실수로 빠질 위험이 있을 때, 두 알고리즘 중 누가 더 안전한 우회로를 배울까요?',
    rows: 6,
    cols: 6,
    start: { r: 5, c: 0 },
    goal: { r: 5, c: 5 },
    grid: [
      ['empty', 'empty', 'empty', 'empty', 'empty', 'empty'],
      ['empty', 'empty', 'empty', 'empty', 'empty', 'empty'],
      ['empty', 'empty', 'empty', 'empty', 'empty', 'empty'],
      ['empty', 'empty', 'empty', 'empty', 'empty', 'empty'],
      ['empty', 'empty', 'empty', 'empty', 'empty', 'empty'],
      ['start', 'hazard', 'hazard', 'hazard', 'hazard', 'goal']
    ]
  },

  // Mission 3: 보상 함수 함정 (Reward Hacking Lab)
  mission_3: {
    id: 'mission_3',
    name: '미션 3. 보상 함수 함정 (Reward Hacking)',
    subtitle: '배터리 보너스와 충돌 벌점 밸런스 실험',
    desc: '보상값을 잘못 주면 로보독이 목적지에 가지 않고 배터리 주변을 맴돌거나 멈출 수 있습니다.',
    question: '이동 벌점을 0으로 만들고 배터리 보상을 +5로 주면 로보독은 어떤 꼼수(Reward Hacking)를 부릴까요?',
    rows: 6,
    cols: 6,
    start: { r: 0, c: 0 },
    goal: { r: 5, c: 5 },
    grid: [
      ['start', 'empty', 'empty', 'empty', 'empty', 'empty'],
      ['empty', 'battery', 'empty', 'obstacle', 'empty', 'empty'],
      ['empty', 'empty', 'empty', 'empty', 'battery', 'empty'],
      ['obstacle', 'obstacle', 'empty', 'obstacle', 'empty', 'empty'],
      ['empty', 'battery', 'empty', 'empty', 'empty', 'empty'],
      ['empty', 'empty', 'empty', 'obstacle', 'empty', 'goal']
    ]
  }
};

class GridWorldEnvironment {
  constructor(options = {}) {
    this.rows = options.rows || 6;
    this.cols = options.cols || 6;
    this.missionId = options.missionId || 'mission_2';
    
    // Reward settings
    this.rewards = {
      goal: 10.0,
      hazard: -10.0,
      step: -0.2,
      obstacle: -3.0,
      battery: 2.0,
      timeout: -5.0,
      ...(options.rewards || {})
    };

    this.maxSteps = options.maxSteps || 80;
    this.startPos = { r: 0, c: 0 };
    this.goalPos = { r: this.rows - 1, c: this.cols - 1 };
    this.grid = [];
    this.agentPos = { r: 0, c: 0 };
    this.lastAction = 'right';
    this.steps = 0;
    this.totalReward = 0.0;
    this.isDone = false;
    this.collisions = 0;
    this.hazardsHit = 0;
    this.collectedBatteries = new Set();
    this.actionHistory = [];

    // Load preset or blank
    if (options.presetGrid) {
      this.loadGrid(options.presetGrid);
    } else {
      this.loadMission(this.missionId);
    }
  }

  loadMission(missionId) {
    const mission = PRESET_MISSIONS[missionId] || PRESET_MISSIONS.mission_2;
    this.missionId = mission.id;
    this.rows = mission.rows;
    this.cols = mission.cols;
    this.startPos = { ...mission.start };
    this.goalPos = { ...mission.goal };
    this.grid = mission.grid.map(row => [...row]);
    this.reset();
  }

  loadGrid(gridMatrix) {
    this.rows = gridMatrix.length;
    this.cols = gridMatrix[0].length;
    this.grid = gridMatrix.map(row => [...row]);

    // Find start and goal
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        if (this.grid[r][c] === 'start') {
          this.startPos = { r, c };
        } else if (this.grid[r][c] === 'goal') {
          this.goalPos = { r, c };
        }
      }
    }
    this.reset();
  }

  setTile(r, c, tileType) {
    if (r < 0 || r >= this.rows || c < 0 || c >= this.cols) return;

    // Single start/goal constraint
    if (tileType === 'start') {
      for (let row = 0; row < this.rows; row++) {
        for (let col = 0; col < this.cols; col++) {
          if (this.grid[row][col] === 'start') this.grid[row][col] = 'empty';
        }
      }
      this.startPos = { r, c };
    } else if (tileType === 'goal') {
      for (let row = 0; row < this.rows; row++) {
        for (let col = 0; col < this.cols; col++) {
          if (this.grid[row][col] === 'goal') this.grid[row][col] = 'empty';
        }
      }
      this.goalPos = { r, c };
    }

    this.grid[r][c] = tileType;
  }

  getTile(r, c) {
    if (r < 0 || r >= this.rows || c < 0 || c >= this.cols) return 'obstacle';
    return this.grid[r][c];
  }

  getStateKey(pos = null) {
    const p = pos || this.agentPos;
    return `${p.r},${p.c}`;
  }

  reset() {
    this.agentPos = { ...this.startPos };
    this.lastAction = 'right';
    this.steps = 0;
    this.totalReward = 0.0;
    this.isDone = false;
    this.collisions = 0;
    this.hazardsHit = 0;
    this.collectedBatteries.clear();
    this.actionHistory = [];
    return this.getStateKey();
  }

  // Step function
  // action in ['up', 'right', 'down', 'left']
  step(action) {
    if (this.isDone) {
      return {
        nextState: this.getStateKey(),
        reward: 0,
        done: true,
        event: 'already_done',
        agentPos: { ...this.agentPos }
      };
    }

    this.steps++;
    this.lastAction = action;
    this.actionHistory.push(action);

    const delta = {
      up: { r: -1, c: 0 },
      right: { r: 0, c: 1 },
      down: { r: 1, c: 0 },
      left: { r: 0, c: -1 }
    }[action] || { r: 0, c: 0 };

    const targetR = this.agentPos.r + delta.r;
    const targetC = this.agentPos.c + delta.c;

    // 1. Check Boundary & Obstacle Collision
    const isOutOfBounds = targetR < 0 || targetR >= this.rows || targetC < 0 || targetC >= this.cols;
    const isObstacle = !isOutOfBounds && this.grid[targetR][targetC] === 'obstacle';

    if (isOutOfBounds || isObstacle) {
      // Robodog bumps and stays in place
      this.collisions++;
      const reward = this.rewards.obstacle;
      this.totalReward += reward;

      // Check timeout
      let done = false;
      let event = 'collision';
      if (this.steps >= this.maxSteps) {
        done = true;
        this.totalReward += this.rewards.timeout;
        event = 'timeout';
      }
      this.isDone = done;

      return {
        nextState: this.getStateKey(),
        reward,
        done,
        event,
        agentPos: { ...this.agentPos },
        steps: this.steps,
        totalReward: this.totalReward
      };
    }

    // 2. Normal Move to Target Cell
    this.agentPos = { r: targetR, c: targetC };
    const tile = this.grid[targetR][targetC];
    let reward = this.rewards.step;
    let done = false;
    let event = 'move';

    if (tile === 'goal') {
      reward = this.rewards.goal;
      done = true;
      event = 'goal';
    } else if (tile === 'hazard') {
      reward = this.rewards.hazard;
      this.hazardsHit++;
      done = true;
      event = 'hazard';
    } else if (tile === 'battery') {
      const batKey = `${targetR},${targetC}`;
      if (!this.collectedBatteries.has(batKey)) {
        this.collectedBatteries.add(batKey);
        reward = this.rewards.step + this.rewards.battery;
        event = 'battery';
      }
    }

    // Check timeout
    if (!done && this.steps >= this.maxSteps) {
      reward += this.rewards.timeout;
      done = true;
      event = 'timeout';
    }

    this.totalReward += reward;
    this.isDone = done;

    return {
      nextState: this.getStateKey(),
      reward,
      done,
      event,
      agentPos: { ...this.agentPos },
      steps: this.steps,
      totalReward: this.totalReward
    };
  }

  // Clone environment instance with identical state
  clone() {
    const env = new GridWorldEnvironment({
      rows: this.rows,
      cols: this.cols,
      missionId: this.missionId,
      rewards: { ...this.rewards },
      maxSteps: this.maxSteps,
      presetGrid: this.grid.map(row => [...row])
    });
    env.startPos = { ...this.startPos };
    env.goalPos = { ...this.goalPos };
    env.agentPos = { ...this.agentPos };
    env.lastAction = this.lastAction;
    env.steps = this.steps;
    env.totalReward = this.totalReward;
    env.isDone = this.isDone;
    env.collisions = this.collisions;
    env.hazardsHit = this.hazardsHit;
    env.collectedBatteries = new Set(this.collectedBatteries);
    return env;
  }
}

// Export for Node/Tests and Browser Global
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    TILE_TYPES,
    TILE_ICONS,
    TILE_LABELS,
    PRESET_MISSIONS,
    GridWorldEnvironment
  };
} else {
  window.TILE_TYPES = TILE_TYPES;
  window.TILE_ICONS = TILE_ICONS;
  window.TILE_LABELS = TILE_LABELS;
  window.PRESET_MISSIONS = PRESET_MISSIONS;
  window.GridWorldEnvironment = GridWorldEnvironment;
}
