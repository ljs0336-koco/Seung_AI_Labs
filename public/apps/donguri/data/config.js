/* =====================================================================
   ✏️ EDIT — 돈구리 규칙 숫자
   숫자만 바꿔 보고 직접 플레이하며 확인하세요. (매뉴얼 9장 레시피 E)
   ===================================================================== */
window.CONFIG = {
  APP_NAME: "돈구리",
  VERSION: "v0.2",

  /* 🔒 저장 이름 — 저장 구조가 바뀔 때만 운영사가 올립니다 (예: donguri_v03) */
  STORAGE_KEY: "donguri_v02",

  /* AI 코치 방식: "demo" = 미리 정한 규칙으로 분석하는 데모 모드
     실제 AI 연동 방식은 10.31 통합 멘토링에서 운영사와 정합니다. API 키를 여기에 넣지 마세요. */
  AI_MODE: "demo",

  /* 도토리 보상 */
  REWARD: {
    KEEP_LIMIT: 30,     // 하루 한도를 지킨 날
    NO_SPEND: 20,       // 하루 지출이 0원인 날 추가 보너스
    QUIZ_CORRECT: 10,   // 경제 퀴즈 1문제 정답
    SAVE_DONE: 50,      // 이번 달 저축을 옮겼다고 기록했을 때
    STREAK_EVERY: 7,    // 며칠 연속마다 보너스를 줄지
    STREAK_BONUS: 70    // 연속 보너스
  },

  QUIZ_PER_DAY: 3,          // 하루에 푸는 경제 퀴즈 수
  BIG_EXPENSE_RATIO: 3,     // 하루 한도의 몇 배 이상이면 '큰 지출'로 안내할지
  LOW_LIMIT_WARN: 1500,     // 하루 한도가 이보다 낮으면 목표일 조정을 제안
  LIMIT_ROUND: 10,          // 하루 한도를 몇 원 단위로 내릴지
  SAVING_ROUND: 100,        // 한 달 저축액을 몇 원 단위로 올릴지

  /* 레벨 문턱 — 지금까지 모은 도토리 합계 기준 (첫 칸은 0) */
  LEVELS: [0, 100, 250, 450, 700, 1000, 1400],

  /* 직접 그린 캐릭터 이미지로 바꾸려면 아래처럼 파일 경로를 적으세요. (null = 기본 그림)
     { idle: "assets/my_idle.png", happy: "assets/my_happy.png", cheer: "assets/my_cheer.png", proud: "assets/my_proud.png" } */
  CHARACTER_IMAGES: null
};
