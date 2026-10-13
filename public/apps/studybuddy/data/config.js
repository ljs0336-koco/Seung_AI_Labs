/* =====================================================================
   ✏️ EDIT — STUDY-BUDDY 규칙 숫자
   숫자만 바꿔 보고 직접 플레이하며 확인하세요. (매뉴얼 9장 레시피 E)
   ===================================================================== */
window.CONFIG = {
  APP_NAME: "STUDY-BUDDY",
  VERSION: "v0.3",

  /* 🔒 저장 이름 — 저장 구조가 바뀔 때만 운영사가 올립니다.
     예전 이름(OLD_STORAGE_KEYS)의 기록은 처음 열 때 자동으로 옮겨 옵니다. 데모 기록은 '_demo'가 붙은 이름에 따로 저장됩니다. */
  STORAGE_KEY: "studybuddy_v03",
  OLD_STORAGE_KEYS: ["studybuddy_v02"],

  /* AI 코치 방식: "demo" = 미리 정한 질문과 키워드로 판정하는 데모 버디
     실제 AI 연동 방식은 10.31 통합 멘토링에서 운영사와 정합니다. API 키를 여기에 넣지 마세요. */
  AI_MODE: "demo",

  /* 경험치(XP) 보상 — 같은 성취로는 한 번만 받습니다 */
  REWARD: {
    TEACH_COMPLETE: 50,    // 한 단원에서 별 3개(설명·반문·적용)를 힌트 없이 처음 모았을 때
    RETRY_SUCCESS: 30,     // 힌트를 보고 보완해서 별 3개를 처음 모았을 때 (나중에 힌트 없이 성공하면 차액 20 추가)
    REVIEW_QUIZ: 20,       // 예정된 복습 문제 1개 정답 (회차·문항마다 한 번)
    DAILY_QUEST: 40,       // 오늘의 퀘스트 3개를 모두 마쳤을 때 (하루 한 번)
    STREAK_BONUS: 50,      // 연속 학습 보너스
    STREAK_DAYS: 7         // 며칠 연속마다 보너스를 줄지
  },

  /* 레벨 경험치 문턱 — 초반에는 빠르게, 뒤로 갈수록 천천히 (첫 칸은 0) */
  LEVELS: [0, 80, 200, 380, 620, 950, 1400],

  /* 꾸미기 아이템이 열리는 레벨 — 아이템 이름·설명은 content.js 의 WARDROBE */
  UNLOCKS: {
    mortarboard: 2,  // 학사모
    scarf: 3,        // 포근 목도리
    glasses: 4,      // 스마트 안경
    headphone: 5     // 집중 헤드폰
  },

  /* 간격 복습 — 복습을 모두 맞히면 다음 간격으로 넘어갑니다 (일 단위) */
  REVIEW_INTERVALS: [1, 3, 7, 14, 30],
  MASTERY_REVIEWS: 4,      // 복습을 이만큼 모두 맞히면 그 단원 '마스터 배지'

  MIN_EXPLAIN_LENGTH: 20,  // 가르치기 설명 최소 글자 수
  LOCK_NEXT_STAGE: true,   // true = 앞 장소를 끝내야 다음 장소가 열림, false = 처음부터 모두 열림
  DEMO_START_XP: 40,       // 데모 시작 경험치 (첫 단원 완료 50 XP로 Lv.2가 되는 시연용)

  /* 연출 시간 (밀리초) — 휴대폰에서 눌러 보며 조정하세요 */
  FX: {
    STAR_GAP: 320,         // 별이 하나씩 나타나는 간격
    XP_FILL: 700,          // 경험치 게이지가 차오르는 시간
    LEVEL_UP: 1400         // 레벨업 축하 화면
  },

  /* 직접 그린 캐릭터 이미지로 바꾸려면 표정별 파일 경로를 적으세요 (null = 기본 SVG 버디)
     표정: listening(듣기) · confused(갸웃) · understood(이해) · happy(기쁨) · surprised(놀람) · sleepy(복습 필요)
     예: { listening: "assets/buddy_listen.png", happy: "assets/buddy_happy.png" } — 빠진 표정은 기본 그림이 나옵니다 */
  CHARACTER_IMAGES: null
};
