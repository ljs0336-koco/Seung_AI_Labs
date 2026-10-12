# Credits and Attribution

## 1. Reference Project
This project references and adapts core concepts from:
- **Title**: [Web RL Playground](https://github.com/awjuliani/web-rl-playground)
- **Author**: Arthur Juliani (@awjuliani)
- **License**: MIT License (included in `LICENSE`)
- **Repository**: https://github.com/awjuliani/web-rl-playground
- **Live Demo**: https://awjuliani.github.io/web-rl-playground/

## 2. Adaptation and Modifications
Modified and expanded for the **RoboDog RL Playground (멍멍 RL Playground)** educational prototype:
1. **Domain Context**:
   - Reimagined from generic Grid World to a physical AI Robodog ("로보독") navigation and policy learning context for Team 06 (Physical AI & Maker).
2. **Dual-Agent Comparative Architecture**:
   - Implemented side-by-side synchronized comparison (`Q-Learning vs SARSA`) running on an identical map and seeded PRNG.
3. **Cliff Walking / Puddle Hazard Benchmark**:
   - Added `comparison_01` (웅덩이 산책) benchmark map where Q-Learning's off-policy ledge path contrast with SARSA's on-policy risk-averse detour is vividly observable.
4. **2D Character Animation**:
   - Integrated custom Robodog character sprites with a "콩콩" (hopping) 2D bounce motion, direction rotation, and comic contextual feedback speech bubbles.
5. **Reward Hacking Exploration Lab**:
   - Configurable live rewards and interactive tile palette (Start 🏠, Goal 🍖, Obstacle 🚧, Puddle 💧, Battery 🔋) to explore reward hacking phenomena.
6. **Design System & Accessibility**:
   - Rebuilt with QuietCraft (`quiet_craft/DESIGN.md`) zero-drop-shadow flat border aesthetics, Pretendard typography, and `prefers-reduced-motion` compliance.
