/* =====================================================================
   ✏️ EDIT — STUDY-BUDDY 콘텐츠 (성향 검사 · 단원 데이터 · 소크라테스 질문 · 퀴즈)
   새 단원을 추가하거나 문제를 바꿀 때는 아래 형식을 그대로 복사해 사용하세요.
   ===================================================================== */
window.CONTENT = {
  APP_TITLE: "STUDY-BUDDY",

  /* 4가지 버디 학습 성향 */
  PERSONALITIES: {
    curious: {
      id: "curious",
      name: "호기심형 버디",
      color: "#2A9D8F",
      tag: "질문 폭격기 🔍",
      desc: "‘왜 그럴까?’를 끊임없이 물어보며 원리를 파고드는 버디입니다.",
      greeting: "선생님! 오늘 배운 재미있는 개념이 뭐예요? 얼른 알려주세요!",
      correct_msg: "와! 대박! 그런 깊은 뜻이 있었군요! 완전 이해됐어요! ✨",
      confused_msg: "선생님! 혹시... 그 부분이 조금 헷갈려요. 한 번만 더 짚어주세요!"
    },
    meticulous: {
      id: "meticulous",
      name: "꼼꼼형 버디",
      color: "#4C5FD5",
      tag: "원칙과 정의 📐",
      desc: "수학적 정의와 예외 조건을 꼼꼼히 확인하는 논리적인 버디입니다.",
      greeting: "선생님, 오늘 학습 목표의 핵심 조건과 정의부터 차근차근 정리해 볼까요?",
      correct_msg: "논리적으로 완벽해요! 정의와 조건이 딱 맞아떨어졌어요. 🎯",
      confused_msg: "잠시만요 선생님! 혹시 특정 조건이나 예외가 빠진 건 아닐까요?"
    },
    cheer: {
      id: "cheer",
      name: "응원형 버디",
      color: "#E76F51",
      tag: "긍정 에너지 💖",
      desc: "칭찬과 격려로 학습자의 기운을 북돋워 주는 따뜻한 버디입니다.",
      greeting: "선생님 오셨군요! 오늘 하루도 함께 파이팅해서 멋지게 공부해 봐요!",
      correct_msg: "선생님 설명 진짜 최고예요! 귀에 쏙쏙 박혔어요! 최고최고! 🌟",
      confused_msg: "선생님, 조금만 더 쉽게 힌트를 주시면 저도 금방 따라잡을 수 있어요!"
    },
    challenger: {
      id: "challenger",
      name: "도전형 버디",
      color: "#E9A23B",
      tag: "반례 탐험가 ⚡",
      desc: "심화 응용과 반례를 던져 개념을 단단하게 다져 주는 승부사 버디입니다.",
      greeting: "선생님, 오늘 개념은 제가 질문 몇 개로 직접 시험해 봐도 되죠?",
      correct_msg: "인정합니다! 빈틈없는 완벽한 반박이었어요. 한 방 먹었네요! 🏆",
      confused_msg: "흐음, 과연 그게 모든 상황에서 항상 성립할까요? 반례가 있을 텐데요!"
    }
  },

  LEVEL_TITLES: [
    "새싹 버디",
    "호기심 버디",
    "개념 잡은 버디",
    "원리 탐구 버디",
    "메타인지 마스터",
    "명예 조교 버디",
    "전설의 학습 버디"
  ],

  /* 처음 성향 검사 6문항 */
  ONBOARDING_QUIZ: [
    {
      q: "친구에게 어려운 수학 개념을 설명해 줄 때 나는?",
      options: [
        { text: "“왜 그렇게 되는지 원리를 상상해 봐!”라고 말한다.", type: "curious" },
        { text: "공식의 정의와 문제 푸는 단계를 차례대로 적어준다.", type: "meticulous" },
        { text: "“너도 할 수 있어! 이것만 알면 쉬워!”라고 격려한다.", type: "cheer" },
        { text: "“여기서 함정에 빠지기 쉬운 포인트가 뭔지 맞춰봐!”라고 한다.", type: "challenger" }
      ]
    },
    {
      q: "내가 생각하는 가장 좋은 공부 방식은?",
      options: [
        { text: "궁금한 게 생기면 끝까지 질문하고 찾아보기", type: "curious" },
        { text: "오답노트를 깔끔하게 정리하고 조건 확인하기", type: "meticulous" },
        { text: "포기하지 않고 꾸준히 즐겁게 목표 채우기", type: "cheer" },
        { text: "고난도 심화 문제와 킬러 문항에 도전하기", type: "challenger" }
      ]
    },
    {
      q: "설명을 듣고 이해가 잘 안 될 때 내 반응은?",
      options: [
        { text: "“근데 만약에 이런 상황이면 어떻게 돼요?”", type: "curious" },
        { text: "“정확한 용어의 뜻이 뭔지 다시 짚어주세요.”", type: "meticulous" },
        { text: "“선생님, 아주 쉬운 예시 하나만 들어주실 수 있나요?”", type: "cheer" },
        { text: "“이 조건이 아니면 성립 안 하는 거 아닌가요?”", type: "challenger" }
      ]
    },
    {
      q: "버디가 나에게 어떤 역할을 해 주면 제일 좋을까?",
      options: [
        { text: "엉뚱하지만 기발한 호기심 질문을 던져주는 메이트", type: "curious" },
        { text: "틀린 부분을 꼼꼼하게 지적해 주는 엄격한 감사관", type: "meticulous" },
        { text: "힘들 때마다 따뜻하게 칭찬해 주는 든든한 내 편", type: "cheer" },
        { text: "서로 퀴즈 대결하며 승부욕을 불태우는 라이벌", type: "challenger" }
      ]
    },
    {
      q: "선생님이 수업 중 ‘질문 있나요?’라고 물으실 때 나는?",
      options: [
        { text: "‘저 현상은 일상생활 어디에 쓰일까?’ 궁금증이 솟는다.", type: "curious" },
        { text: "필기 내용 중 빠진 공식이나 단서가 없는지 점검한다.", type: "meticulous" },
        { text: "주변 친구들이 잘 이해했는지 눈치를 살핀다.", type: "cheer" },
        { text: "선생님이 당황할 만한 날카로운 질문을 고민한다.", type: "challenger" }
      ]
    },
    {
      q: "시험이 끝난 직후 나의 행동은?",
      options: [
        { text: "시험지에 나온 재미있던 지문이나 소재를 검색해 본다.", type: "curious" },
        { text: "빨간 펜으로 틀린 이유와 해설을 정밀하게 분석한다.", type: "meticulous" },
        { text: "친구들과 고생했다고 서로 다독이고 맛있는 걸 먹는다.", type: "cheer" },
        { text: "내가 푼 어려운 문제를 친구가 맞혔는지 점수를 확인한다.", type: "challenger" }
      ]
    }
  ],

  /* 5대 정규 교과 단원 (개념 키워드 · 소크라테스 발문 · 퀴즈) */
  UNITS: [
    {
      id: "math_linear",
      subject: "수학",
      icon: "📐",
      title: "일차함수의 기울기와 그래프",
      summary: "y = ax + b 꼴로 나타내어지는 함수와 직선 그래프의 성질",
      required_concepts: ["기울기", "절편", "직선", "a가 0"],
      concepts: [
        { term: "기울기", keywords: ["기울기", "a", "x의 증가량", "y의 증가량", "경사", "비율"] },
        { term: "y절편", keywords: ["y절편", "b", "y축과 만나는", "y축 교점"] },
        { term: "직선 그래프", keywords: ["직선", "직선형태", "직선 모양"] },
        { term: "조건(a≠0)", keywords: ["a!=0", "a가 0이 아니", "0이 아니", "a가 0이면 상수"] }
      ],
      socratic: {
        missing_a: {
          q: "선생님! 그러면 a가 0이어도 일차함수라고 부를 수 있을까요? a가 0이면 그래프는 어떻게 되나요?",
          expected: ["상수함수", "평행", "0이 아니", "아니다", "직선"]
        },
        missing_slope: {
          q: "선생님! x가 1 증가할 때 y가 증가하는 비율을 수학에서는 뭐라고 부르나요? a의 크기가 바뀌면 직선은 어떻게 변하죠?",
          expected: ["기울기", "가파르", "기울어", "경사"]
        },
        missing_intercept: {
          q: "선생님! 식에서 + b는 그래프가 y축과 만나는 위치와 어떤 관련이 있나요?",
          expected: ["y절편", "y축", "만나는 점", "교점"]
        }
      },
      quizzes: [
        {
          q: "일차함수 y = 2x - 4에 대한 설명으로 올바른 것은?",
          options: ["기울기는 -4이다", "y절편은 2이다", "x가 1 증가할 때 y는 2 증가한다", "원점을 반드시 지난다"],
          answer: 2,
          explain: "y = ax + b에서 기울기는 a(2)이고, y절편은 b(-4)입니다. 기울기가 2이므로 x가 1 증가할 때 y는 2 증가합니다."
        },
        {
          q: "다음 중 일차함수가 아닌 것은?",
          options: ["y = 3x", "y = -x + 5", "y = 7", "y = 0.5x - 1"],
          answer: 2,
          explain: "y = 7은 a=0이므로 일차함수가 아니라 상수함수입니다. 일차함수는 반드시 a ≠ 0이어야 합니다."
        }
      ]
    },
    {
      id: "sci_photosyn",
      subject: "과학",
      icon: "🌿",
      title: "식물의 광합성과 에너지",
      summary: "빛에너지를 이용해 물과 이산화탄소로 유기물을 만드는 과정",
      required_concepts: ["빛에너지", "물", "이산화탄소", "포도당", "산소"],
      concepts: [
        { term: "빛에너지", keywords: ["빛", "태양광", "빛에너지", "에너지원"] },
        { term: "재료(물·CO2)", keywords: ["물", "이산화탄소", "원료", "재료"] },
        { term: "생성물(포도당·산소)", keywords: ["포도당", "산소", "녹말", "유기물"] },
        { term: "장소(엽록체)", keywords: ["엽록체", "엽록소", "잎"] }
      ],
      socratic: {
        missing_energy: {
          q: "선생님! 빛은 물질 재료일까요, 아니면 화학 반응을 일으키는 에너지원일까요?",
          expected: ["에너지", "에너지원", "빛에너지"]
        },
        missing_products: {
          q: "선생님! 광합성이 끝나고 나면 식물이 스스로 먹고 살기 위해 만드는 가장 핵심적인 영양소는 무엇인가요?",
          expected: ["포도당", "녹말", "유기물", "산소"]
        },
        missing_materials: {
          q: "선생님! 뿌리와 기공을 통해 식물이 광합성을 하려고 흡수하는 두 가지 재료는 무엇인가요?",
          expected: ["물", "이산화탄소", "CO2"]
        }
      },
      quizzes: [
        {
          q: "광합성이 일어나는 식물 세포의 소기관은 어디일까요?",
          options: ["미토콘드리아", "엽록체", "세포핵", "리보솜"],
          answer: 1,
          explain: "광합성은 엽록소라는 녹색 색소가 들어 있는 엽록체에서 일어납니다."
        },
        {
          q: "광합성의 결과로 생성되어 공기 중으로 방출되는 기체는?",
          options: ["이산화탄소", "질소", "산소", "수소"],
          answer: 2,
          explain: "광합성 결과 주 영양소인 포도당과 함께 부산물로 산소가 생성되어 기공을 통해 배출됩니다."
        }
      ]
    },
    {
      id: "kor_metaphor",
      subject: "국어",
      icon: "📖",
      title: "비유의 원리와 표현",
      summary: "원관념과 보조관념의 유사성을 바탕으로 대상을 빗대어 나타내기",
      required_concepts: ["원관념", "보조관념", "직유법", "은유법"],
      concepts: [
        { term: "원관념", keywords: ["원관념", "원래", "표현하려는", "본래"] },
        { term: "보조관념", keywords: ["보조관념", "빗댄", "빌려온", "비유하는"] },
        { term: "직유법", keywords: ["직유", "처럼", "같이", "듯", "양"] },
        { term: "은유법", keywords: ["은유", "a는 b다", "는", "은"] }
      ],
      socratic: {
        missing_relation: {
          q: "선생님! 비유가 성립하려면 원래 표현하려는 대상과 빗대는 대상 사이에 반드시 무엇이 존재해야 하나요?",
          expected: ["유사성", "공통점", "비슷", "연결"]
        },
        missing_types: {
          q: "선생님! ‘내 마음은 호수요’와 ‘사과 같은 내 얼굴’은 비유의 방식에서 어떤 결정적인 차이가 있나요?",
          expected: ["은유", "직유", "처럼", "a는 b"]
        },
        missing_concepts: {
          q: "선생님! 비유에서 원래 말하고자 하는 대상과, 이를 꾸며주기 위해 빌려온 대상을 각각 무엇이라고 부르나요?",
          expected: ["원관념", "보조관념"]
        }
      },
      quizzes: [
        {
          q: "다음 중 ‘은유법’이 쓰인 문장은 어느 것일까요?",
          options: ["달콤한 사탕 같은 목소리", "인생은 미완성 교향곡이다", "번개처럼 빠른 소년", "호수같이 맑은 눈망울"],
          answer: 1,
          explain: "‘인생(A)은 교향곡(B)이다’ 형태로 연결어 없이 원관념과 보조관념을 동일시한 은유법입니다."
        },
        {
          q: "비유에서 ‘표현하고자 하는 원래의 생각이나 대상’을 가리키는 말은?",
          options: ["보조관념", "원관념", "상징", "역설"],
          answer: 1,
          explain: "원래 나타내려는 대상은 ‘원관념’, 빗대기 위해 끌어온 대상은 ‘보조관념’이라고 합니다."
        }
      ]
    },
    {
      id: "soc_opp_cost",
      subject: "사회",
      icon: "⚖️",
      title: "합리적 선택과 기회비용",
      summary: "선택으로 인해 포기해야 하는 여러 가치 중 가장 큰 가치",
      required_concepts: ["명시적 비용", "암묵적 비용", "포기한 가치", "합리적 선택"],
      concepts: [
        { term: "기회비용", keywords: ["기회비용", "포기한", "대가", "포기"] },
        { term: "명시적 비용", keywords: ["명시적", "실제 낸 돈", "직접 지출", "회계적"] },
        { term: "암묵적 비용", keywords: ["암묵적", "포기한 소득", "시간 가치", "보이지 않는"] },
        { term: "순편익", keywords: ["편익", "순편익", "비용보다 큰", "합리적"] }
      ],
      socratic: {
        missing_implicit: {
          q: "선생님! 영화를 볼 때 티켓값 15,000원 외에 그 2시간 동안 알바를 해서 벌 수 있었던 돈도 기회비용에 들어갈까요?",
          expected: ["암묵적", "포함", "들어간다", "비용이다", "시간"]
        },
        missing_highest: {
          q: "선생님! A를 고르면서 포기한 선택지가 B(5만 원 가치)와 C(3만 원 가치) 둘 다 있다면, 기회비용은 8만 원인가요?",
          expected: ["가장 큰", "최대", "5만원", "둘 중 하나", "합산하지 않"]
        },
        missing_rational: {
          q: "선생님! 경제학에서 ‘합리적인 선택’을 했다고 평가하려면 편익과 기회비용의 관계가 어떠해야 하나요?",
          expected: ["편익이 더", "크다", "순편익이 양수", "비용보다"]
        }
      },
      quizzes: [
        {
          q: "기회비용을 계산할 때 올바른 공식은?",
          options: ["명시적 비용만 계산", "암묵적 비용만 계산", "명시적 비용 + 암묵적 비용", "편익 - 명시적 비용"],
          answer: 2,
          explain: "진정한 기회비용은 실제로 지출한 명시적 비용에, 선택으로 인해 포기한 가치인 암묵적 비용을 합산해야 합니다."
        },
        {
          q: "포기한 대안이 여러 개일 때 기회비용의 크기는 어떻게 결정될까요?",
          options: ["포기한 모든 대안의 가치를 다 더한다", "포기한 대안 중 가장 가치가 큰 것 하나", "포기한 대안들의 평균값", "가장 가치가 적은 것"],
          answer: 1,
          explain: "포기한 가치 중 가장 큰 가치(차선책) 단 하나만이 기회비용이 됩니다."
        }
      ]
    },
    {
      id: "eng_pres_perf",
      subject: "영어",
      icon: "⏳",
      title: "현재완료 시제 (Present Perfect)",
      summary: "과거에 일어난 일이 현재까지 영향을 미치거나 연결되어 있음을 표현",
      required_concepts: ["have/has p.p.", "과거와 현재 연결", "완료·경험·계속·결과"],
      concepts: [
        { term: "형태(have p.p.)", keywords: ["have", "has", "p.p.", "과거분사"] },
        { term: "시간 연결", keywords: ["과거와 현재", "현재까지", "연결", "지속", "영향"] },
        { term: "4가지 용법", keywords: ["완료", "경험", "계속", "결과", "just", "ever", "for", "since"] }
      ],
      socratic: {
        missing_difference: {
          q: "선생님! ‘I lost my key.’(단순과거)와 ‘I have lost my key.’(현재완료)는 지금 열쇠를 가지고 있는지 여부에서 어떤 차이가 있나요?",
          expected: ["지금", "현재", "없다", "알 수 없다", "영향"]
        },
        missing_form: {
          q: "선생님! 현재완료 시제를 만들 때 주어 뒤에 어떤 조동사와 동사 형태를 써야 하나요?",
          expected: ["have", "has", "p.p", "과거분사"]
        },
        missing_usage: {
          q: "선생님! ‘for 3 years’나 ‘since last year’처럼 과거부터 지금까지 쭉 해오고 있는 상태는 현재완료의 4가지 용법 중 어디에 해당하나요?",
          expected: ["계속", "계속적"]
        }
      },
      quizzes: [
        {
          q: "‘I have visited Paris twice.’에서 쓰인 현재완료의 용법은?",
          options: ["완료 (Completion)", "경험 (Experience)", "계속 (Continuance)", "결과 (Result)"],
          answer: 1,
          explain: "‘twice(두 번)’처럼 과거의 방문 경험을 나타내므로 경험 용법입니다."
        },
        {
          q: "다음 중 명백한 과거 시점 부사(yesterday, ago 등)와 함께 쓸 수 없는 시제는?",
          options: ["단순 과거 시제", "과거 진행 시제", "현재완료 시제", "과거완료 시제"],
          answer: 2,
          explain: "현재완료 시제는 현재와 연결되어 있으므로, 어제(yesterday), 3일 전(ago) 같은 특정한 과거 시점 부사와는 함께 쓸 수 없습니다."
        }
      ]
    }
  ],

  /* 꾸미기 아이템 */
  WARDROBE: [
    { id: "mortarboard", name: "학사모", slot: "head", unlockLv: 2, desc: "Lv2 달성 시 지급되는 지혜의 학사모" },
    { id: "scarf", name: "포근 목도리", slot: "neck", unlockLv: 3, desc: "Lv3 달성 시 지급되는 포근한 빨간 목도리" },
    { id: "glasses", name: "스마트 안경", slot: "face", unlockLv: 4, desc: "Lv4 달성 시 지급되는 지적인 안경" },
    { id: "headphone", name: "사이버 헤드폰", slot: "head", unlockLv: 5, desc: "Lv5 달성 시 지급되는 미래형 헤드폰" }
  ],

  /* 시즌 리그 가상 참가자 닉네임 */
  LEAGUE_MOCK: [
    { rank: 1, name: "옥종열공러", xp: 520, level: 4, type: "challenger" },
    { rank: 2, name: "하동수학왕", xp: 480, level: 4, type: "meticulous" },
    { rank: 3, name: "지리산꿈나무", xp: 410, level: 3, type: "curious" },
    { rank: 4, name: "내가선생님", xp: 350, level: 3, type: "cheer" },
    { rank: 5, name: "메타인지천재", xp: 290, level: 2, type: "meticulous" }
  ],

  /* API 모드 전환 대비 지시문 (AI_MODE="api"일 때 쓰임) */
  AI_PROMPTS: {
    system_eval: "너는 학생이 가르치는 AI 학습 버디다. 학생의 교과 개념 설명을 분석하여 누락된 핵심 개념을 짚고 소크라테스식 유도 질문 1문장을 생성하라.",
    system_answer: "학생의 답변이 질문의 핵심 의도에 부합하는지 평가하여 이해 완료(understood) 또는 재시도 힌트(confused)를 판정하라."
  }
};
