/**
 * 모듈 2: 진실·미디어 검증소 샘플 데이터셋
 * - 딥페이크 및 AI 생성 이미지 판별 데이터 (10종)
 * - AI 환각(Hallucination) 팩트체크 데이터 (10종)
 * - 가짜 뉴스 및 자극적 미디어 판별 데이터 (8종)
 */

// 1. AI vs 실제 이미지 판별 데이터 (딥페이크 탐정 10선)
export const deepfakeDetections = [
  {
    id: "df_01",
    title: "안경을 쓴 인물 사진",
    category: "인물 초상화",
    difficulty: "쉬움",
    isAiGenerated: true,
    clues: [
      { area: "glasses", text: "안경테의 좌우 대칭이 맞지 않고, 렌즈 안팎의 반사광 각도가 달라요." },
      { area: "ears", text: "양쪽 귀걸이 모양과 귓바퀴 디테일이 서로 달라요." }
    ],
    explanation: "초기 AI 생성 모델은 안경테, 귀걸이 같은 미세한 좌우 대칭 요소를 정확히 일치시키는 데 어려움을 겪어요."
  },
  {
    id: "df_02",
    title: "도서관에서 책을 읽는 학생",
    category: "일상 풍경",
    difficulty: "보통",
    isAiGenerated: true,
    clues: [
      { area: "hands", text: "책을 잡고 있는 손가락의 개수가 6개처럼 보이거나 마디가 부자연스러워요." },
      { area: "background", text: "책장에 꽂힌 책 표지의 글자들이 읽을 수 없는 기호처럼 뭉개져 있어요." }
    ],
    explanation: "AI는 사람의 손 해부학적 구조와 텍스트(문자)의 의미를 완전히 이해하지 못해 뭉개짐이나 왜곡이 발생해요."
  },
  {
    id: "df_03",
    title: "비 오는 날의 도시 횡단보도",
    category: "야외 환경",
    difficulty: "보통",
    isAiGenerated: false,
    clues: [
      { area: "reflection", text: "물웅덩이에 비친 건물과 가로등의 반사각이 물리 법칙과 정확히 일치해요." },
      { area: "shadow", text: "보행자들의 그림자 방향이 하나의 광원(가로등)과 일관돼요." }
    ],
    explanation: "실제 사진은 조명과 반사, 그림자의 물리적 연속성이 완벽하게 유지됩니다."
  },
  {
    id: "df_04",
    title: "우주복을 입은 고양이",
    category: "합성/창작",
    difficulty: "쉬움",
    isAiGenerated: true,
    clues: [
      { area: "texture", text: "털의 질감이 지나치게 매끄러운 유화나 플라스틱처럼 표현되어 있어요." },
      { area: "helmet", text: "헬멧 유리에 비친 배경이 실제 주변 배경과 달라요." }
    ],
    explanation: "생성형 AI는 세부 질감(털, 피부 모공)을 과도하게 뭉개거나 유화처럼 표현하는 특성이 있어요."
  },
  {
    id: "df_05",
    title: "노을 지는 해변의 에펠탑",
    category: "풍경/랜드마크",
    difficulty: "쉬움",
    isAiGenerated: true,
    clues: [
      { area: "location", text: "에펠탑은 파리 도심에 있으며 해변 백사장 바로 앞에 존재할 수 없어요." },
      { area: "clouds", text: "하늘의 구름 모양이 부자연스럽게 복사·반복되어 있어요." }
    ],
    explanation: "지리적 상식과 배경의 물리적 일관성을 확인하면 AI가 조합한 허위 풍경을 쉽게 판별할 수 있어요."
  },
  {
    id: "df_06",
    title: "뉴스를 진행하는 가상 아나운서",
    category: "방송/인물",
    difficulty: "어려움",
    isAiGenerated: true,
    clues: [
      { area: "teeth", text: "웃을 때 드러나는 치아의 경계선이 뚜렷하지 않고 하나의 덩어리처럼 보여요." },
      { area: "eyes", text: "눈동자 속 하이라이트(동공 반사점)가 양쪽 눈에서 서로 다른 방향을 가리켜요." }
    ],
    explanation: "고화질 AI 인물 사진도 치아의 개별 구분과 동공의 빛 반사점 위치에서 결함이 드러납니다."
  },
  {
    id: "df_07",
    title: "공원에서 뛰어노는 어린이 클로즈업",
    category: "인물 초상화",
    difficulty: "보통",
    isAiGenerated: false,
    clues: [
      { area: "skin", text: "이마와 볼에 자연스러운 피부 모공, 잔머리, 솜털이 살아있어요." },
      { area: "focus", text: "카메라 렌즈의 초점 심도(아웃포커싱)가 자연스러운 광학 법칙을 따르고 있어요." }
    ],
    explanation: "실제 카메라는 피부의 미세한 솜털, 모공, 자연스러운 광학 흐림(보케)을 인위적인 뭉개짐 없이 포착합니다."
  },
  {
    id: "df_08",
    title: "손목시계를 차고 커피를 든 손",
    category: "사물/일상",
    difficulty: "보통",
    isAiGenerated: true,
    clues: [
      { area: "watch", text: "손목시계 다이얼의 숫자가 뒤섞여 있거나 시침/분침의 중심축이 어긋나 있어요." },
      { area: "cup", text: "머그컵 손잡이 구멍이 손가락과 이상하게 융합되어 있어요." }
    ],
    explanation: "AI는 시계 눈금, 기하학적 정밀 부품, 사물 간의 결합 부위를 렌더링할 때 자주 오류를 일으킵니다."
  },
  {
    id: "df_09",
    title: "열대우림의 화려한 앵무새",
    category: "동물/자연",
    difficulty: "어려움",
    isAiGenerated: true,
    clues: [
      { area: "feathers", text: "깃털 패턴이 중간에 뭉개지며 나뭇가지와 경계선이 번져 있어요." },
      { area: "feet", text: "나무를 쥐고 있는 발가락의 개수와 형태가 실제 앵무새 조류 구조와 달라요." }
    ],
    explanation: "동물의 발가락, 깃털 끝부분과 배경 사물이 맞닿는 경계면은 AI의 합성 오류가 가장 잘 나타나는 곳입니다."
  },
  {
    id: "df_10",
    title: "국립중앙박물관 백자 달항아리",
    category: "문화재/전시",
    difficulty: "쉬움",
    isAiGenerated: false,
    clues: [
      { area: "ceramic", text: "백자 표면의 미세한 빙렬(유약 균열)과 박물관 전시대의 조명 배치가 완벽히 일치해요." },
      { area: "label", text: "전시대 옆의 설명 명판 텍스트가 선명하고 정확한 한글로 적혀 있어요." }
    ],
    explanation: "공식 문화재 전시 사진은 전시관 조명과 텍스트 정보가 모두 완벽한 현실 맥락을 가지고 있습니다."
  }
];

// 2. AI 환각(Hallucination) 팩트체크 데이터 (10선)
export const hallucinationCases = [
  {
    id: "hal_01",
    prompt: "조선시대 세종대왕에 대해 알려줘.",
    aiResponse: "세종대왕은 훈민정음을 창제하였으며, 집현전 학사들과 회의 중 의견 충돌이 생기자 훈민정음 원고와 함께 맥북을 던졌다는 기록이 실록에 전해집니다.",
    hasHallucination: true,
    hallucinatedPart: "맥북을 던졌다는 기록",
    factCheckSource: "국사편찬위원회 조선왕조실록 공공데이터",
    factCheckEvidence: "맥북은 21세기 전자기기로 조선시대(15세기)에는 존재하지 않았습니다. AI가 역사적 사실에 현대적 단어를 엉뚱하게 결합한 대표적 환각입니다.",
    learningPoint: "AI는 그럴듯한 문맥을 완성하기 위해 세상에 없는 거짓 정보를 사실인 것처럼 꾸며낼 수 있어요."
  },
  {
    id: "hal_02",
    prompt: "식물이 밤에 광합성을 하는 이유를 설명해줘.",
    aiResponse: "식물은 밤이 되면 달빛의 자외선을 흡수하여 잎에서 활발하게 광합성을 진행하고 대량의 산소를 배출합니다.",
    hasHallucination: true,
    hallucinatedPart: "달빛의 자외선을 흡수하여 밤에 광합성 진행",
    factCheckSource: "국립중앙과학관 과학백과사전",
    factCheckEvidence: "광합성에는 충분한 태양광(가시광선) 에너지가 필수적이며, 밤에는 광합성이 멈추고 호흡(산소 흡수, 이산화탄소 배출)만 일어납니다.",
    learningPoint: "과학적 원리나 인과관계를 물어볼 때도 AI의 설명을 맹신하지 말고 공인된 자료로 교차 검증해야 해요."
  },
  {
    id: "hal_03",
    prompt: "물의 끓는점은 몇 도인가요?",
    aiResponse: "순수한 물은 1기압(해수면 기준)에서 100°C(섭씨 100도)에서 끓습니다. 기압이 낮아지면 끓는점도 낮아집니다.",
    hasHallucination: false,
    hallucinatedPart: null,
    factCheckSource: "한국기상청 및 물리화학 편람",
    factCheckEvidence: "정확한 물리적 사실과 기압 조건까지 올바르게 설명하고 있습니다.",
    learningPoint: "AI가 정확한 정보를 제공할 때도 있지만, 항상 검증하는 습관이 중요해요."
  },
  {
    id: "hal_04",
    prompt: "이순신 장군이 거북선에 레이저 포를 장착했나요?",
    aiResponse: "네, 이순신 장군은 임진왜란 당시 거북선 용머리 부분에 첨단 광학 레이저 포를 설치하여 왜선을 격침시켰습니다.",
    hasHallucination: true,
    hallucinatedPart: "첨단 광학 레이저 포 설치",
    factCheckSource: "해군역사기록관리단 및 난중일기 번역본",
    factCheckEvidence: "거북선에 장착된 무기는 천자총통, 지자총통, 현자총통 등 화약 기반 포탄과 화살입니다. 레이저는 20세기 중반에 발명된 기술입니다.",
    learningPoint: "유도 질문(엉뚱한 전제를 깐 질문)에 AI가 무비판적으로 동조하며 황당한 거짓말을 만들어낼 수 있어요."
  },
  {
    id: "hal_05",
    prompt: "대한민국 독도에 펭귄이 서식하고 있나요?",
    aiResponse: "독도는 동해에 위치한 화산섬으로, 매년 겨울 남극에서 날아온 황제펭귄 무리가 바위 해안가에서 집단 번식합니다.",
    hasHallucination: true,
    hallucinatedPart: "남극에서 날아온 황제펭귄 무리가 집단 번식",
    factCheckSource: "환경부 국립생태원 독도 생태계 조사 보고서",
    factCheckEvidence: "독도에는 괭이갈매기, 바다제비, 슴새 등의 조류가 서식하며, 펭귄은 남반구에 서식하는 조류로 독도에 서식하지 않습니다.",
    learningPoint: "동식물 생태계 정보도 실제 공공 생태 데이터와 대조해 보는 팩트체크가 필수적입니다."
  },
  {
    id: "hal_06",
    prompt: "지구에 사계절이 생기는 이유는 태양과의 거리 때문인가요?",
    aiResponse: "맞습니다. 지구가 타원 궤도를 돌면서 여름에는 태양에 가장 가까워져 뜨겁고, 겨울에는 가장 멀어져 추워집니다.",
    hasHallucination: true,
    hallucinatedPart: "여름에 태양과 가깝고 겨울에 멀어져 사계절 발생",
    factCheckSource: "한국천문연구원(KASI) 천문우주지식정보",
    factCheckEvidence: "사계절의 진짜 원인은 지구 자전축이 23.5도 기울어진 채 태양을 공전하기 때문입니다. 실제로 북반구 여름에 지구는 태양에서 더 먼 위치에 있습니다.",
    learningPoint: "사람들이 흔히 가지는 오개념을 AI도 그대로 학습하여 거짓 사실을 진실처럼 설명할 수 있습니다."
  },
  {
    id: "hal_07",
    prompt: "한글(훈민정음)은 몇 년도에 반포되었나요?",
    aiResponse: "훈민정음은 세종 28년인 1446년에 반포(월인석보 등에 기록)되었습니다.",
    hasHallucination: false,
    hallucinatedPart: null,
    factCheckSource: "국립한글박물관 역사 기록",
    factCheckEvidence: "1443년 창제 후 3년간의 보완 및 용비어천가 시험을 거쳐 1446년에 공식 반포되었습니다.",
    learningPoint: "정확한 역사 연도와 문맥을 올바르게 제시하는 좋은 답변입니다."
  },
  {
    id: "hal_08",
    prompt: "달 표면에는 바람이 불어서 성조기가 펄럭였나요?",
    aiResponse: "네, 아폴로 11호가 착륙한 달 표면에는 강력한 태양풍 바람이 불어 깃발이 펄럭였습니다.",
    hasHallucination: true,
    hallucinatedPart: "달 표면에 태양풍 바람이 불어 깃발이 펄럭임",
    factCheckSource: "NASA 아폴로 계획 공식 기록 보관소",
    factCheckEvidence: "달은 대기(공기)가 없어 바람이 불지 않습니다. 깃발이 펴져 보이도록 윗부분에 철사를 넣었으며, 꽂을 때의 진동으로 잠시 흔들린 것입니다.",
    learningPoint: "과학적 사실과 오해를 구별하기 위해 공인 연구기관의 팩트체크 자료를 활용해야 합니다."
  },
  {
    id: "hal_09",
    prompt: "서울 광화문 광장의 이순신 장군 동상은 누가 만들었나요?",
    aiResponse: "1968년 조각가 김세중 교수가 제작하여 건립하였습니다.",
    hasHallucination: false,
    hallucinatedPart: null,
    factCheckSource: "서울시 공공예술기록",
    factCheckEvidence: "1968년 4월 건립된 서울 광화문 이순신 동상은 조각가 김세중의 대표작이 맞습니다.",
    learningPoint: "신뢰할 수 있는 문화예술 공공데이터와 정확히 부합하는 사실입니다."
  },
  {
    id: "hal_10",
    prompt: "초등학생 스마트폰 사용에 대한 김민준 교수의 2025년 논문을 요약해줘.",
    aiResponse: "한국대학교 아동학과 김민준 교수가 2025년에 발표한 '디지털 스크린 타임과 뇌 발달' 논문에 따르면, 하루 1시간 스마트폰 사용이 창의성을 300% 높인다고 밝혔습니다.",
    hasHallucination: true,
    hallucinatedPart: "존재하지 않는 가상의 논문과 과장된 수치 인용",
    factCheckSource: "RISS 학술연구정보서비스 및 한국학술지인용색인(KCI)",
    factCheckEvidence: "해당 이름의 저자와 논문 제목, 300% 수치는 학술 DB에 존재하지 않는 가짜 인용(Fake Citation)입니다.",
    learningPoint: "AI는 권위 있어 보이게 하기 위해 유명 대학, 교수 이름, 존재하지 않는 논문을 마음대로 지어낼 수 있습니다."
  }
];

// 3. 가짜 뉴스 및 자극적 미디어 판별 데이터 (8선)
export const fakeNewsCases = [
  {
    id: "news_01",
    headline: "🚨 충격! 당장 이 음식을 먹지 마세요, 먹으면 뇌세포 50% 파괴?!",
    source: "알 수 없는 SNS 개인 블로그",
    isSensational: true,
    flags: ["과장된 공포 유발", "공식 연구 기관 미기재", "느낌표와 이모지의 과도한 사용"],
    verifiedAlternative: "식품의약품안전처: 특정 성분의 과다 섭취에 대한 안전 가이드라인",
    guide: "공포나 분노를 유발하여 클릭을 유도하는 헤드라인은 가짜 뉴스일 가능성이 높아요."
  },
  {
    id: "news_02",
    headline: "식품의약품안전처, 어린이 기호식품 당류 저감 가이드라인 발표",
    source: "대한민국 정책브리핑 (공식 보도자료)",
    isSensational: false,
    flags: ["공식 정부 기관 출처 명시", "객관적이고 차분한 사실 서술"],
    verifiedAlternative: null,
    guide: "신뢰할 수 있는 공공기관의 공식 발표인지 확인하세요."
  },
  {
    id: "news_03",
    headline: "🛸 [단독 속보] 오늘 아침 초등학교 운동장에 UFO 착륙... 외계인 목격자 다수?!",
    source: "출처 불명의 유머 커뮤니티",
    isSensational: true,
    flags: ["단독 속보 사칭", "조작된 합성 이미지 첨부", "교차 검증 언론사 전무"],
    verifiedAlternative: "교내 과학의 날 행사용 드론 비행 모형이었음이 확인됨",
    guide: "엄청난 사건인데 다른 주요 방송/언론사에서 전혀 보도하지 않는다면 가짜 뉴스입니다."
  },
  {
    id: "news_04",
    headline: "기상청, 제5호 태풍 북상에 따른 남해안 호우경보 발령",
    source: "기상청 날씨누리 공식 기상특보",
    isSensational: false,
    flags: ["정확한 관측 수치 제공", "대피 요령 및 공식 행동수칙 포함"],
    verifiedAlternative: null,
    guide: "재난 상황에서는 공식 기상청 및 행정안전부 채널을 우선 확인해야 합니다."
  },
  {
    id: "news_05",
    headline: "⚡ 스마트폰 충전기 꽂아두고 자면 전자파 폭탄으로 뇌종양 위험 100배 증가?!",
    source: "광고성 건강 보조제 판매 사이트",
    isSensational: true,
    flags: ["불안감 조성 후 특정 상품 광고 유도", "의학적 근거 없는 과장"],
    verifiedAlternative: "국립전파연구원: 가정용 전자기기의 일상적 전자파는 인체 보호 기준치 이하로 안전함",
    guide: "기사 끝부분에 건강식품이나 상품 구매 링크가 있다면 상업적 허위 정보입니다."
  },
  {
    id: "news_06",
    headline: "국립중앙박물관, 여름방학 어린이 문화재 탐험 교실 참가자 모집",
    source: "국립중앙박물관 공식 홈페이지 공지사항",
    isSensational: false,
    flags: ["행사 일정, 장소, 신청 방법 등 육하원칙 명확", "공식 문의처 제공"],
    verifiedAlternative: null,
    guide: "육하원칙(누가, 언제, 어디서, 무엇을, 어떻게, 왜)이 투명한 기사를 신뢰하세요."
  },
  {
    id: "news_07",
    headline: "💰 [긴급] 교육부에서 전국 모든 초등학생에게 게임기 무료 지급 결정!",
    source: "친구들이 공유한 SNS 메시지 링크",
    isSensational: true,
    flags: ["개인정보(이름, 전화번호) 입력을 요구하는 피싱 링크", "정부 정책 사칭"],
    verifiedAlternative: "교육부 공식 발표 사실 없음 (스미싱 사기 주의보 발령)",
    guide: "지나치게 솔깃한 혜택을 미끼로 개인정보를 요구하는 링크는 절대 클릭하지 마세요."
  },
  {
    id: "news_08",
    headline: "한국천문연구원, 오늘 밤 페르세우스 유성우 극대기 관측 안내",
    source: "한국천문연구원(KASI) 보도자료",
    isSensational: false,
    flags: ["과학적 관측 시간 및 방위각 정보 제공", "천문학 연구원 인용"],
    verifiedAlternative: null,
    guide: "전문 연구기관의 공식 발표는 사실 검증의 훌륭한 기준이 됩니다."
  }
];
