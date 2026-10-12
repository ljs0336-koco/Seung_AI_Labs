/**
 * algorithms.js - RoboDog RL Playground Algorithms
 * 
 * Implements Q-Learning (Off-policy TD) and SARSA (On-policy TD)
 * Based on web-rl-playground by Arthur Juliani.
 * Adapted for RoboDog RL Educational Playground.
 * MIT License.
 */

// Seeded PRNG: Mulberry32 for deterministic, synchronized multi-agent comparisons
class SeededRandom {
  constructor(seed = 42) {
    this.seed = seed >>> 0;
  }

  // Returns float in [0, 1)
  next() {
    let t = (this.seed += 0x6D2B79F5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  // Integer in [min, max] inclusive
  nextInt(min, max) {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  choice(arr) {
    if (!arr || arr.length === 0) return null;
    return arr[Math.floor(this.next() * arr.length)];
  }

  setSeed(seed) {
    this.seed = seed >>> 0;
  }
}

// Base Reinforcement Learning Algorithm Class
class Algorithm {
  constructor(gridRows, gridCols, config = {}) {
    this.gridRows = gridRows;
    this.gridCols = gridCols;
    this.config = {
      learningRate: 0.1,      // alpha
      discountFactor: 0.9,    // gamma
      explorationRate: 0.2,   // epsilon
      seed: 42,
      ...config
    };
    this.actions = ['up', 'right', 'down', 'left'];
    this.rng = new SeededRandom(this.config.seed);
    this.qTable = {};
    this.initializeTables();
  }

  initializeTables() {
    this.qTable = {};
    for (let r = 0; r < this.gridRows; r++) {
      for (let c = 0; c < this.gridCols; c++) {
        const stateKey = `${r},${c}`;
        this.qTable[stateKey] = {
          up: 0.0,
          right: 0.0,
          down: 0.0,
          left: 0.0
        };
      }
    }
  }

  ensureState(stateKey) {
    if (!this.qTable[stateKey]) {
      this.qTable[stateKey] = {
        up: 0.0,
        right: 0.0,
        down: 0.0,
        left: 0.0
      };
    }
  }

  getQ(stateKey, action) {
    this.ensureState(stateKey);
    return this.qTable[stateKey][action] ?? 0.0;
  }

  setQ(stateKey, action, val) {
    this.ensureState(stateKey);
    this.qTable[stateKey][action] = val;
  }

  getAllQ(stateKey) {
    this.ensureState(stateKey);
    return { ...this.qTable[stateKey] };
  }

  // Returns array of actions with maximum Q-value
  getBestActions(stateKey) {
    this.ensureState(stateKey);
    const qObj = this.qTable[stateKey];
    let maxVal = -Infinity;
    let best = [];

    for (const a of this.actions) {
      const v = qObj[a];
      if (v > maxVal) {
        maxVal = v;
        best = [a];
      } else if (Math.abs(v - maxVal) < 1e-6) {
        best.push(a);
      }
    }

    return best.length > 0 ? best : [...this.actions];
  }

  // Primary best action for policy display (deterministic tie-breaker)
  getPolicyDirection(stateKey) {
    this.ensureState(stateKey);
    const qObj = this.qTable[stateKey];
    const vals = this.actions.map(a => qObj[a]);
    const allZero = vals.every(v => Math.abs(v) < 1e-6);
    if (allZero) return null; // No learning yet

    const best = this.getBestActions(stateKey);
    return best[0];
  }

  // State value V(s) = max_a Q(s, a)
  getValue(stateKey) {
    this.ensureState(stateKey);
    return Math.max(...Object.values(this.qTable[stateKey]));
  }

  // Epsilon-greedy action choice using seeded PRNG
  chooseAction(stateKey, forceGreedy = false) {
    this.ensureState(stateKey);

    if (!forceGreedy && this.rng.next() < this.config.explorationRate) {
      // Exploration: pick random action
      return this.rng.choice(this.actions);
    } else {
      // Exploitation: pick greedy action
      const best = this.getBestActions(stateKey);
      return this.rng.choice(best);
    }
  }

  // Abstract step
  learningStep(s, a, r, nextS, done, extra = {}) {
    throw new Error('learningStep must be implemented by subclass');
  }

  reset(newSeed = null) {
    if (newSeed !== null) {
      this.config.seed = newSeed;
      this.rng.setSeed(newSeed);
    }
    this.initializeTables();
  }

  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    if (newConfig.seed !== undefined) {
      this.rng.setSeed(newConfig.seed);
    }
  }
}

// -------------------------------------------------------------
// Q-Learning (Off-Policy TD Control)
// Q(s, a) <- Q(s, a) + alpha * [ r + gamma * max_a' Q(s', a') - Q(s, a) ]
// -------------------------------------------------------------
class QLearningAlgorithm extends Algorithm {
  constructor(gridRows, gridCols, config = {}) {
    super(gridRows, gridCols, config);
    this.name = 'Q-Learning';
    this.type = 'off-policy';
  }

  learningStep(s, a, r, nextS, done, extra = {}) {
    this.ensureState(s);
    this.ensureState(nextS);

    const oldQ = this.getQ(s, a);
    let target = r;

    if (!done) {
      const bestNextActions = this.getBestActions(nextS);
      const maxNextQ = this.getQ(nextS, bestNextActions[0]);
      target = r + this.config.discountFactor * maxNextQ;
    }

    const tdError = target - oldQ;
    const newQ = oldQ + this.config.learningRate * tdError;
    this.setQ(s, a, newQ);

    return {
      oldQ,
      newQ,
      tdError,
      target
    };
  }
}

// -------------------------------------------------------------
// SARSA (On-Policy TD Control)
// Q(s, a) <- Q(s, a) + alpha * [ r + gamma * Q(s', a') - Q(s, a) ]
// Where a' is the ACTUAL action chosen in nextS under epsilon-greedy policy!
// -------------------------------------------------------------
class SarsaAlgorithm extends Algorithm {
  constructor(gridRows, gridCols, config = {}) {
    super(gridRows, gridCols, config);
    this.name = 'SARSA';
    this.type = 'on-policy';
  }

  learningStep(s, a, r, nextS, done, extra = {}) {
    this.ensureState(s);
    this.ensureState(nextS);

    const oldQ = this.getQ(s, a);
    let target = r;

    if (!done) {
      // In SARSA, target uses Q(nextS, nextA) where nextA is the on-policy exploratory action
      const nextA = extra.nextAction || this.chooseAction(nextS);
      const nextQ = this.getQ(nextS, nextA);
      target = r + this.config.discountFactor * nextQ;
    }

    const tdError = target - oldQ;
    const newQ = oldQ + this.config.learningRate * tdError;
    this.setQ(s, a, newQ);

    return {
      oldQ,
      newQ,
      tdError,
      target
    };
  }
}

// Export for Node/Tests and Browser Global
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    SeededRandom,
    Algorithm,
    QLearningAlgorithm,
    SarsaAlgorithm
  };
} else {
  window.SeededRandom = SeededRandom;
  window.Algorithm = Algorithm;
  window.QLearningAlgorithm = QLearningAlgorithm;
  window.SarsaAlgorithm = SarsaAlgorithm;
}
