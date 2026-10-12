/* =====================================================================
   ✏️ EDIT — STUDY-BUDDY 순수 SVG 캐릭터 렌더러
   글자 없이 순수 벡터 도형으로 표정 6종과 꾸미기 아이템을 그립니다.
   ===================================================================== */
(function () {
  "use strict";

  const TYPE_COLORS = {
    curious: { body: "#2A9D8F", cheek: "#F4A261", belly: "#E0FAF5" },
    meticulous: { body: "#4C5FD5", cheek: "#A5B4FC", belly: "#EEF2FF" },
    cheer: { body: "#E76F51", cheek: "#F87171", belly: "#FFF1EE" },
    challenger: { body: "#E9A23B", cheek: "#FDE047", belly: "#FFFBEB" }
  };

  /**
   * 버디 SVG 생성 함수
   * @param {string} mood - listening | confused | understood | happy | surprised | sleepy
   * @param {string} type - curious | meticulous | cheer | challenger
   * @param {Object} equipped - { head: "mortarboard"|"headphone", neck: "scarf", face: "glasses" }
   * @returns {string} SVG 문자열
   */
  window.renderBuddy = function (mood, type, equipped) {
    mood = mood || "listening";
    type = type || "curious";
    equipped = equipped || {};

    const colors = TYPE_COLORS[type] || TYPE_COLORS.curious;

    // 표정별 눈, 입, 효과 SVG 파트
    let eyesSvg = "";
    let mouthSvg = "";
    let effectSvg = "";

    switch (mood) {
      case "confused":
        // 갸우뚱한 눈과 머리 위 물음표
        eyesSvg = `
          <circle cx="78" cy="95" r="5" fill="#1E293B"/>
          <circle cx="122" cy="92" r="8" fill="#1E293B"/>
        `;
        mouthSvg = `<path d="M 94 116 Q 100 112 106 116" stroke="#1E293B" stroke-width="2.5" fill="none" stroke-linecap="round"/>`;
        effectSvg = `
          <g transform="translate(140, 42) rotate(12)">
            <circle cx="10" cy="10" r="14" fill="#F59E0B"/>
            <text x="10" y="16" font-size="16" font-weight="900" fill="#FFFFFF" text-anchor="middle">?</text>
          </g>
        `;
        break;

      case "understood":
        // 뿌듯하게 이해한 반달 눈
        eyesSvg = `
          <path d="M 72 95 Q 78 88 84 95" stroke="#1E293B" stroke-width="3.5" stroke-linecap="round" fill="none"/>
          <path d="M 116 95 Q 122 88 128 95" stroke="#1E293B" stroke-width="3.5" stroke-linecap="round" fill="none"/>
        `;
        mouthSvg = `<path d="M 92 114 Q 100 124 108 114" stroke="#1E293B" stroke-width="2.5" fill="#EF4444" stroke-linecap="round"/>`;
        effectSvg = `
          <g transform="translate(142, 50)">
            <polygon points="10,0 13,7 20,8 15,13 16,20 10,16 4,20 5,13 0,8 7,7" fill="#FBBF24"/>
          </g>
        `;
        break;

      case "happy":
        // 활짝 웃는 눈과 미소
        eyesSvg = `
          <path d="M 70 96 Q 78 86 86 96" stroke="#1E293B" stroke-width="4" stroke-linecap="round" fill="none"/>
          <path d="M 114 96 Q 122 86 130 96" stroke="#1E293B" stroke-width="4" stroke-linecap="round" fill="none"/>
        `;
        mouthSvg = `
          <path d="M 88 112 Q 100 128 112 112 Z" fill="#EF4444" stroke="#1E293B" stroke-width="2"/>
        `;
        effectSvg = `
          <circle cx="45" cy="65" r="4" fill="#FBBF24" opacity="0.8"/>
          <circle cx="155" cy="65" r="4" fill="#FBBF24" opacity="0.8"/>
          <circle cx="100" cy="35" r="5" fill="#FBBF24" opacity="0.9"/>
        `;
        break;

      case "surprised":
        // 동그랗게 놀란 눈과 입
        eyesSvg = `
          <circle cx="76" cy="94" r="8" fill="#FFFFFF" stroke="#1E293B" stroke-width="2.5"/>
          <circle cx="76" cy="94" r="4" fill="#1E293B"/>
          <circle cx="124" cy="94" r="8" fill="#FFFFFF" stroke="#1E293B" stroke-width="2.5"/>
          <circle cx="124" cy="94" r="4" fill="#1E293B"/>
        `;
        mouthSvg = `<ellipse cx="100" cy="116" rx="6" ry="8" fill="#1E293B"/>`;
        break;

      case "sleepy":
        // 복습이 필요한 졸린 눈
        eyesSvg = `
          <line x1="72" y1="96" x2="86" y2="96" stroke="#1E293B" stroke-width="3" stroke-linecap="round"/>
          <line x1="114" y1="96" x2="128" y2="96" stroke="#1E293B" stroke-width="3" stroke-linecap="round"/>
        `;
        mouthSvg = `<ellipse cx="100" cy="115" rx="5" ry="3" fill="#1E293B"/>`;
        effectSvg = `
          <text x="145" y="65" font-size="14" font-weight="800" fill="#94A3B8">Z</text>
          <text x="155" y="52" font-size="11" font-weight="800" fill="#94A3B8">z</text>
        `;
        break;

      case "listening":
      default:
        // 귀 기울여 듣는 맑고 똘망똘망한 눈
        eyesSvg = `
          <circle cx="78" cy="95" r="7" fill="#1E293B"/>
          <circle cx="76" cy="93" r="2.5" fill="#FFFFFF"/>
          <circle cx="122" cy="95" r="7" fill="#1E293B"/>
          <circle cx="120" cy="93" r="2.5" fill="#FFFFFF"/>
        `;
        mouthSvg = `<path d="M 95 116 Q 100 120 105 116" stroke="#1E293B" stroke-width="2" fill="none" stroke-linecap="round"/>`;
        break;
    }

    // 꾸미기 아이템 SVG
    let accSvg = "";

    // 안경 (glasses)
    if (equipped.face === "glasses") {
      accSvg += `
        <circle cx="78" cy="95" r="14" fill="none" stroke="#334155" stroke-width="2.5"/>
        <circle cx="122" cy="95" r="14" fill="none" stroke="#334155" stroke-width="2.5"/>
        <line x1="92" y1="95" x2="108" y2="95" stroke="#334155" stroke-width="2.5"/>
      `;
    }

    // 목도리 (scarf)
    if (equipped.neck === "scarf") {
      accSvg += `
        <path d="M 60 142 Q 100 152 140 142 Q 146 156 138 162 Q 100 166 62 162 Z" fill="#EF4444"/>
        <rect x="110" y="152" width="18" height="28" rx="4" fill="#DC2626"/>
      `;
    }

    // 머리 아이템: 학사모 vs 헤드폰
    if (equipped.head === "mortarboard") {
      accSvg += `
        <polygon points="100,32 150,48 100,64 50,48" fill="#1E293B"/>
        <rect x="78" y="58" width="44" height="14" rx="3" fill="#0F172A"/>
        <line x1="100" y1="48" x2="142" y2="62" stroke="#F59E0B" stroke-width="2"/>
        <circle cx="142" cy="64" r="3" fill="#F59E0B"/>
      `;
    } else if (equipped.head === "headphone") {
      accSvg += `
        <path d="M 46 95 C 46 50 154 50 154 95" fill="none" stroke="#0284C7" stroke-width="6" stroke-linecap="round"/>
        <rect x="38" y="85" width="14" height="26" rx="6" fill="#0369A1"/>
        <rect x="148" y="85" width="14" height="26" rx="6" fill="#0369A1"/>
      `;
    }

    return `
      <svg viewBox="0 0 200 200" width="100%" height="100%" class="buddy-svg">
        <!-- 그림자 -->
        <ellipse cx="100" cy="180" rx="55" ry="12" fill="#000000" opacity="0.08"/>

        <!-- 몸체 (둥근 에그 쉐이프) -->
        <ellipse cx="100" cy="115" rx="66" ry="62" fill="${colors.body}"/>

        <!-- 배 부분 옅은 패치 -->
        <ellipse cx="100" cy="130" rx="46" ry="42" fill="${colors.belly}"/>

        <!-- 쫑긋한 귀 -->
        <path d="M 60 68 Q 45 40 68 52 Z" fill="${colors.body}"/>
        <path d="M 140 68 Q 155 40 132 52 Z" fill="${colors.body}"/>
        <path d="M 62 64 Q 52 46 66 54 Z" fill="${colors.belly}"/>
        <path d="M 138 64 Q 148 46 134 54 Z" fill="${colors.belly}"/>

        <!-- 발 -->
        <ellipse cx="78" cy="172" rx="14" ry="9" fill="${colors.body}"/>
        <ellipse cx="122" cy="172" rx="14" ry="9" fill="${colors.body}"/>

        <!-- 볼터치 -->
        <ellipse cx="58" cy="106" rx="8" ry="5" fill="${colors.cheek}" opacity="0.75"/>
        <ellipse cx="142" cy="106" rx="8" ry="5" fill="${colors.cheek}" opacity="0.75"/>

        <!-- 눈과 입 -->
        ${eyesSvg}
        ${mouthSvg}

        <!-- 악세사리 -->
        ${accSvg}

        <!-- 감정 효과 -->
        ${effectSvg}
      </svg>
    `;
  };
})();
