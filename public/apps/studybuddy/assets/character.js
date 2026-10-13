/* =====================================================================
   ✏️ EDIT — STUDY-BUDDY 캐릭터 · 학습 방 그림 (SVG 코드로 그림)
   - 표정(mood): listening · confused · understood · happy · surprised · sleepy
   - 꾸미기(equipped): { head: "mortarboard"|"headphone", neck: "scarf", face: "glasses" }
   - 성장(growth): 1 새싹 · 2 탐구 · 3 연구 — 실루엣은 그대로, 머리 위 새싹·가슴 배지·빛이 자랍니다
   - 움직임은 style.css 가 아래 그룹 이름에 붙입니다 (지우지 마세요)
       .b-all  몸 전체 (숨쉬기 · 점프)     .b-tilt  고개 (끄덕임 · 갸웃)
       .b-eyes 눈 (깜박임)                 .b-fx    표정 효과 (물음표 · 별)
   좌표는 가로세로 200 크기 기준입니다.
   ===================================================================== */
(function () {
  "use strict";

  const TYPE_COLORS = {
    curious: { body: "#2A9D8F", cheek: "#F4A261", belly: "#E0FAF5" },
    meticulous: { body: "#4C5FD5", cheek: "#A5B4FC", belly: "#EEF2FF" },
    cheer: { body: "#E76F51", cheek: "#F8A0A0", belly: "#FFF1EE" },
    challenger: { body: "#E9A23B", cheek: "#F7C948", belly: "#FFFBEB" }
  };
  const INK = "#1E1B3A";

  function star(cx, cy, r, fill) {
    const pts = [];
    for (let i = 0; i < 10; i++) {
      const rad = (Math.PI / 5) * i - Math.PI / 2;
      const rr = i % 2 === 0 ? r : r * 0.45;
      pts.push(`${(cx + rr * Math.cos(rad)).toFixed(1)},${(cy + rr * Math.sin(rad)).toFixed(1)}`);
    }
    return `<polygon points="${pts.join(" ")}" fill="${fill}"/>`;
  }

  function face(mood) {
    let eyes = "", mouth = "", fx = "";
    switch (mood) {
      case "confused":
        eyes = `<circle cx="78" cy="95" r="5" fill="${INK}"/><circle cx="122" cy="93" r="7.5" fill="${INK}"/><circle cx="120" cy="91" r="2.2" fill="#fff"/>`;
        mouth = `<path d="M93 117 Q100 112 107 117" stroke="${INK}" stroke-width="2.5" fill="none" stroke-linecap="round"/>`;
        fx = `<g transform="translate(152 46) rotate(12)"><g class="b-q">
                <circle r="15" fill="#F6C343"/>
                <path d="M-5 -5 Q-5 -11 0.5 -11 Q6 -11 6 -5.5 Q6 -1.5 1 0.5 L1 3.5" stroke="#fff" stroke-width="3.2" fill="none" stroke-linecap="round"/>
                <circle cx="1" cy="8.5" r="2" fill="#fff"/>
              </g></g>`;
        break;
      case "understood":
        eyes = `<path d="M71 96 Q78 88 85 96" stroke="${INK}" stroke-width="3.5" stroke-linecap="round" fill="none"/>
                <path d="M115 96 Q122 88 129 96" stroke="${INK}" stroke-width="3.5" stroke-linecap="round" fill="none"/>`;
        mouth = `<path d="M91 113 Q100 125 109 113 Z" fill="#E5484D" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/>`;
        fx = `<g class="b-star">${star(156, 52, 11, "#F6C343")}${star(40, 62, 6, "#F6C343")}</g>`;
        break;
      case "happy":
        eyes = `<path d="M70 97 Q78 86 86 97" stroke="${INK}" stroke-width="4" stroke-linecap="round" fill="none"/>
                <path d="M114 97 Q122 86 130 97" stroke="${INK}" stroke-width="4" stroke-linecap="round" fill="none"/>`;
        mouth = `<path d="M88 112 Q100 129 112 112 Z" fill="#E5484D" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/>`;
        fx = `<circle cx="44" cy="64" r="4" fill="#F6C343" opacity=".85"/><circle cx="157" cy="62" r="4" fill="#F6C343" opacity=".85"/>`;
        break;
      case "surprised":
        eyes = `<circle cx="77" cy="94" r="8.5" fill="#fff" stroke="${INK}" stroke-width="2.5"/><circle cx="77" cy="94" r="4" fill="${INK}"/>
                <circle cx="123" cy="94" r="8.5" fill="#fff" stroke="${INK}" stroke-width="2.5"/><circle cx="123" cy="94" r="4" fill="${INK}"/>`;
        mouth = `<ellipse cx="100" cy="117" rx="6" ry="8" fill="${INK}"/>`;
        break;
      case "sleepy":
        eyes = `<path d="M71 97 Q78 101 85 97" stroke="${INK}" stroke-width="3" stroke-linecap="round" fill="none"/>
                <path d="M115 97 Q122 101 129 97" stroke="${INK}" stroke-width="3" stroke-linecap="round" fill="none"/>`;
        mouth = `<ellipse cx="100" cy="116" rx="5" ry="3.2" fill="${INK}"/>`;
        fx = `<path d="M146 60 H156 L146 70 H156" stroke="#9A95B8" stroke-width="2.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M160 44 H167 L160 51 H167" stroke="#9A95B8" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
        break;
      case "listening":
      default:
        eyes = `<circle cx="78" cy="95" r="7" fill="${INK}"/><circle cx="76" cy="92.5" r="2.5" fill="#fff"/>
                <circle cx="122" cy="95" r="7" fill="${INK}"/><circle cx="120" cy="92.5" r="2.5" fill="#fff"/>`;
        mouth = `<path d="M94 116 Q100 121 106 116" stroke="${INK}" stroke-width="2.3" fill="none" stroke-linecap="round"/>`;
        break;
    }
    return { eyes, mouth, fx };
  }

  function accessories(equipped) {
    let back = "", front = "";
    if (equipped.face === "glasses") {
      front += `<g fill="none" stroke="#2F2A4F" stroke-width="2.6">
          <circle cx="78" cy="95" r="14"/><circle cx="122" cy="95" r="14"/><path d="M92 94 Q100 89 108 94"/></g>`;
    }
    if (equipped.neck === "scarf") {
      front += `<path d="M58 140 Q100 154 142 140 Q148 154 140 162 Q100 168 60 162 Q52 152 58 140 Z" fill="#E5484D"/>
                <rect x="110" y="152" width="18" height="28" rx="5" fill="#C93B40"/>
                <path d="M64 151 Q100 162 136 151" stroke="#F58C8F" stroke-width="2" fill="none" stroke-dasharray="4 5"/>`;
    }
    if (equipped.head === "mortarboard") {
      front += `<polygon points="100,30 152,47 100,64 48,47" fill="#2A2547"/>
                <rect x="77" y="56" width="46" height="15" rx="4" fill="#1D1938"/>
                <path d="M100 47 L144 61" stroke="#F6C343" stroke-width="2.2"/>
                <circle cx="144" cy="63" r="3.4" fill="#F6C343"/>`;
    } else if (equipped.head === "headphone") {
      back += `<path d="M45 96 C45 46 155 46 155 96" fill="none" stroke="#6D4AE0" stroke-width="7" stroke-linecap="round"/>`;
      front += `<rect x="36" y="84" width="16" height="28" rx="7" fill="#5234B8"/>
                <rect x="148" y="84" width="16" height="28" rx="7" fill="#5234B8"/>`;
    }
    return { back, front };
  }

  function growthParts(growth, equipped) {
    let aura = "", head = "", chest = "";
    if (!equipped.head) {
      if (growth >= 3) {
        head = `<path d="M100 55 Q99 44 101 34" stroke="#3E9B5B" stroke-width="3" fill="none" stroke-linecap="round"/>
                <path d="M100 46 Q88 36 82 44 Q90 51 100 46 Z" fill="#5BC27A"/>
                ${[0, 72, 144, 216, 288].map((r) => `<ellipse cx="101" cy="26" rx="4.2" ry="7" fill="#F6C343" transform="rotate(${r} 101 33)"/>`).join("")}
                <circle cx="101" cy="33" r="4" fill="#E08A1E"/>`;
      } else if (growth === 2) {
        head = `<path d="M100 55 Q99 45 101 37" stroke="#3E9B5B" stroke-width="3" fill="none" stroke-linecap="round"/>
                <path d="M100 46 Q88 36 82 44 Q90 51 100 46 Z" fill="#5BC27A"/>
                <path d="M101 42 Q112 31 120 38 Q111 47 101 42 Z" fill="#7AD493"/>
                <ellipse cx="101" cy="34" rx="4.5" ry="6" fill="#F6C343"/>`;
      } else {
        head = `<path d="M100 55 Q100 47 101 41" stroke="#3E9B5B" stroke-width="3" fill="none" stroke-linecap="round"/>
                <path d="M101 43 Q90 33 84 41 Q92 48 101 43 Z" fill="#5BC27A"/>
                <path d="M101 43 Q112 31 119 39 Q110 47 101 43 Z" fill="#7AD493"/>`;
      }
    }
    if (growth >= 2 && !equipped.neck) {
      chest = `<circle cx="78" cy="146" r="8" fill="#fff" stroke="#6D4AE0" stroke-width="2"/>
               ${growth >= 3 ? star(78, 146, 5.2, "#F6C343") : `<path d="M74 146 L77 149 L82.5 142.5" stroke="#6D4AE0" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`}`;
    }
    if (growth >= 3) {
      aura = `<circle class="b-aura" cx="100" cy="112" r="86" fill="none" stroke="#F6C343" stroke-width="3" opacity=".35"/>
              <circle class="b-aura" cx="100" cy="112" r="78" fill="#F6C343" opacity=".08"/>`;
    }
    return { aura, head, chest };
  }

  /**
   * 버디 SVG
   * @param {string} mood  표정
   * @param {string} type  성향 (curious | meticulous | cheer | challenger)
   * @param {Object} equipped 꾸미기
   * @param {Object} [opts] { growth: 1~3 }
   */
  window.renderBuddy = function (mood, type, equipped, opts) {
    mood = mood || "listening";
    equipped = equipped || {};
    opts = opts || {};
    const c = TYPE_COLORS[type] || TYPE_COLORS.curious;
    const growth = opts.growth || 1;
    const f = face(mood);
    const acc = accessories(equipped);
    const g = growthParts(growth, equipped);

    return `<svg viewBox="0 0 200 200" class="buddy-svg mood-${mood}" role="img" aria-label="버디" xmlns="http://www.w3.org/2000/svg">
      ${g.aura}
      <ellipse class="b-shadow" cx="100" cy="184" rx="54" ry="10" fill="#1E1B3A" opacity=".1"/>
      <g class="b-all">
        <g class="b-tilt">
          ${acc.back}
          <path d="M60 70 Q44 38 70 52 Z" fill="${c.body}"/>
          <path d="M140 70 Q156 38 130 52 Z" fill="${c.body}"/>
          <path d="M62 64 Q53 47 67 55 Z" fill="${c.belly}"/>
          <path d="M138 64 Q147 47 133 55 Z" fill="${c.belly}"/>
          <ellipse cx="78" cy="174" rx="15" ry="9" fill="${c.body}"/>
          <ellipse cx="122" cy="174" rx="15" ry="9" fill="${c.body}"/>
          <ellipse cx="100" cy="115" rx="66" ry="62" fill="${c.body}"/>
          <ellipse cx="100" cy="131" rx="46" ry="41" fill="${c.belly}"/>
          <ellipse cx="57" cy="107" rx="8" ry="5" fill="${c.cheek}" opacity=".8"/>
          <ellipse cx="143" cy="107" rx="8" ry="5" fill="${c.cheek}" opacity=".8"/>
          <g class="b-eyes">${f.eyes}</g>
          ${f.mouth}
          ${g.chest}
          ${g.head}
          ${acc.front}
          <g class="b-fx">${f.fx}</g>
        </g>
      </g>
    </svg>`;
  };

  /**
   * 학습 방 배경 — 성장 단계마다 소품이 늘어납니다
   * @param {number} growth 1~3
   */
  window.renderBuddyRoom = function (growth) {
    growth = growth || 1;
    const shelf = growth >= 2 ? `
      <g>
        <rect x="18" y="30" width="62" height="6" rx="2" fill="#C9B8F2"/>
        <rect x="22" y="12" width="9" height="18" rx="1.5" fill="#6D4AE0"/>
        <rect x="33" y="15" width="8" height="15" rx="1.5" fill="#2BB5A0"/>
        <rect x="43" y="10" width="10" height="20" rx="1.5" fill="#F6C343"/>
        <rect x="55" y="14" width="7" height="16" rx="1.5" fill="#E07A3F"/>
      </g>
      <g>
        <rect x="246" y="14" width="70" height="44" rx="4" fill="#2F5D50"/>
        <rect x="246" y="14" width="70" height="44" rx="4" fill="none" stroke="#B88A55" stroke-width="3"/>
        <path d="M256 44 L270 30 L282 38 L302 22" stroke="#E8F3EE" stroke-width="2" fill="none" stroke-linecap="round" opacity=".8"/>
      </g>` : `
      <g>
        <rect x="250" y="16" width="56" height="40" rx="6" fill="#FFFFFF" stroke="#D9D0F5" stroke-width="2"/>
        <path d="M278 16 V56 M250 36 H306" stroke="#D9D0F5" stroke-width="2"/>
        <circle cx="292" cy="27" r="5" fill="#F6C343" opacity=".9"/>
      </g>`;
    const badge = growth >= 3 ? `
      <g>
        <circle cx="48" cy="58" r="13" fill="#FFF5D6" stroke="#F6C343" stroke-width="2.5"/>
        ${star(48, 58, 7, "#F6C343")}
        <path d="M42 70 L38 82 L44 79 L48 84 L48 71 Z" fill="#6D4AE0"/>
      </g>` : "";
    return `<svg viewBox="0 0 330 150" preserveAspectRatio="xMidYMax slice" class="room-svg" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
      <rect width="330" height="150" fill="#F5F1FF"/>
      <rect y="116" width="330" height="34" fill="#E9E2FB"/>
      <path d="M0 116 H330" stroke="#D9D0F5" stroke-width="2"/>
      ${shelf}
      ${badge}
      <g>
        <rect x="236" y="96" width="78" height="8" rx="3" fill="#C9B8F2"/>
        <rect x="244" y="104" width="6" height="14" fill="#C9B8F2"/>
        <rect x="300" y="104" width="6" height="14" fill="#C9B8F2"/>
        <rect x="252" y="86" width="26" height="10" rx="1.5" fill="#FFFFFF" stroke="#B9A9EE" stroke-width="1.5"/>
        <path d="M265 86 V96" stroke="#B9A9EE" stroke-width="1.5"/>
        ${growth >= 2 ? `<rect x="284" y="82" width="20" height="14" rx="1.5" fill="#2BB5A0"/><rect x="286" y="78" width="16" height="5" rx="1" fill="#F6C343"/>` : ""}
      </g>
    </svg>`;
  };
})();
