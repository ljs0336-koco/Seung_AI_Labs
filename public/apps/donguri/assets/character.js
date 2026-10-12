/* =====================================================================
   ✏️ EDIT — 돈구리 캐릭터 그림 (SVG 코드로 그림)
   - 색은 PALETTE 에서 바꿉니다.
   - 표정(mood): idle(평소) · happy(무지출·기쁨) · cheer(한도 초과 응원) · proud(레벨업·저축)
   - 꾸미기(equip): { head: "beanie"|"crown", face: "glasses"|"sunglasses", neck: "scarf"|"bowtie" }
   - 직접 그린 이미지로 바꾸려면 data/config.js 의 CHARACTER_IMAGES 를 쓰세요.
   좌표는 가로세로 200 크기 기준입니다.
   ===================================================================== */
(function () {
  "use strict";

  const PALETTE = {
    fur: "#A8764F",
    furDark: "#7E5536",
    mask: "#3A2C26",
    cream: "#F5E8D6",
    earInner: "#E8C29C",
    blush: "#EFA59B",
    nose: "#3A2C26",
    mouth: "#8E3B2E",
    tongue: "#E07A6F",
    acorn: "#C98B4E",
    acornCap: "#6B4226",
    sparkle: "#E2B33C",
    sweat: "#8EC5E8"
  };

  /* 반짝이 별 하나 */
  function sparkle(x, y, r, color) {
    return `<path d="M${x} ${y - r} L${x + r * 0.28} ${y - r * 0.28} L${x + r} ${y} L${x + r * 0.28} ${y + r * 0.28} L${x} ${y + r} L${x - r * 0.28} ${y + r * 0.28} L${x - r} ${y} L${x - r * 0.28} ${y - r * 0.28} Z" fill="${color}"/>`;
  }

  /* 도토리 하나 */
  function acorn(x, y, s, P) {
    return `<g transform="translate(${x} ${y}) scale(${s})">
      <path d="M-11 0 C-11 13 -4 21 0 23 C4 21 11 13 11 0 Z" fill="${P.acorn}"/>
      <path d="M-13 1 C-13 -7 -7 -11 0 -11 C7 -11 13 -7 13 1 Z" fill="${P.acornCap}"/>
      <path d="M0 -11 L1 -16" stroke="${P.acornCap}" stroke-width="2.4" stroke-linecap="round"/>
    </g>`;
  }

  function eyes(mood, P) {
    if (mood === "happy") {
      return `<path d="M67 90 Q76 80 85 90" stroke="#fff" stroke-width="4" fill="none" stroke-linecap="round"/>
              <path d="M115 90 Q124 80 133 90" stroke="#fff" stroke-width="4" fill="none" stroke-linecap="round"/>`;
    }
    const base = (cx) => `<circle cx="${cx}" cy="88" r="9.5" fill="#fff"/>
      <circle cx="${cx + 1}" cy="89" r="5.8" fill="#1F1714"/>
      <circle cx="${cx - 1.5}" cy="86.5" r="2.1" fill="#fff"/>`;
    let out = base(76) + base(124);
    if (mood === "proud") {
      out += sparkle(78, 87, 2.6, "#fff") + sparkle(126, 87, 2.6, "#fff");
    }
    if (mood === "cheer") {
      out += `<path d="M64 66 L86 71" stroke="${P.furDark}" stroke-width="4" stroke-linecap="round"/>
              <path d="M136 66 L114 71" stroke="${P.furDark}" stroke-width="4" stroke-linecap="round"/>`;
    }
    return out;
  }

  function mouth(mood, P) {
    if (mood === "happy" || mood === "proud") {
      return `<path d="M87 112 Q100 130 113 112 Z" fill="${P.mouth}"/>
              <path d="M94 119 Q100 125 106 119 Q100 116 94 119 Z" fill="${P.tongue}"/>`;
    }
    if (mood === "cheer") {
      return `<path d="M92 114 Q100 121 108 114" stroke="${P.nose}" stroke-width="2.6" fill="none" stroke-linecap="round"/>`;
    }
    return `<path d="M91 112 Q95.5 117.5 100 112 Q104.5 117.5 109 112" stroke="${P.nose}" stroke-width="2.6" fill="none" stroke-linecap="round"/>`;
  }

  function arms(mood, P) {
    if (mood === "happy" || mood === "proud") {
      return `<ellipse cx="52" cy="124" rx="10" ry="19" transform="rotate(-38 52 124)" fill="${P.furDark}"/>
              <ellipse cx="148" cy="124" rx="10" ry="19" transform="rotate(38 148 124)" fill="${P.furDark}"/>`;
    }
    return `<ellipse cx="76" cy="152" rx="10" ry="16" transform="rotate(38 76 152)" fill="${P.furDark}"/>
            <ellipse cx="124" cy="152" rx="10" ry="16" transform="rotate(-38 124 152)" fill="${P.furDark}"/>`;
  }

  function accessories(equip) {
    let head = "", face = "", neck = "";
    if (equip.neck === "scarf") {
      neck = `<path d="M60 126 Q100 146 140 126 L141 139 Q100 160 59 139 Z" fill="#2F6E8F"/>
              <path d="M116 141 L128 170 L114 172 L107 146 Z" fill="#2A5F7B"/>
              <path d="M66 133 Q100 150 134 133" stroke="#5B97B5" stroke-width="2" fill="none" stroke-dasharray="4 5"/>`;
    } else if (equip.neck === "bowtie") {
      neck = `<path d="M100 139 L82 130 L82 148 Z M100 139 L118 130 L118 148 Z" fill="#B23A48"/>
              <circle cx="100" cy="139" r="4.5" fill="#8A2B37"/>`;
    }
    if (equip.face === "glasses") {
      face = `<g fill="none" stroke="#E2B33C" stroke-width="3">
                <circle cx="76" cy="88" r="14"/><circle cx="124" cy="88" r="14"/>
                <path d="M90 87 Q100 82 110 87"/></g>`;
    } else if (equip.face === "sunglasses") {
      face = `<path d="M60 80 H92 V92 Q92 101 78 101 Q60 101 60 90 Z" fill="#151515"/>
              <path d="M108 80 H140 V90 Q140 101 122 101 Q108 101 108 92 Z" fill="#151515"/>
              <path d="M92 84 H108" stroke="#151515" stroke-width="3"/>
              <path d="M66 84 L74 84" stroke="#555" stroke-width="2.5" stroke-linecap="round"/>
              <path d="M114 84 L122 84" stroke="#555" stroke-width="2.5" stroke-linecap="round"/>`;
    }
    if (equip.head === "beanie") {
      head = `<path d="M61 55 Q62 12 100 12 Q138 12 139 55 Z" fill="#B5532E"/>
              <rect x="56" y="47" width="88" height="15" rx="7.5" fill="#8C3E22"/>
              <circle cx="100" cy="11" r="8.5" fill="#F1D9BE"/>`;
    } else if (equip.head === "crown") {
      head = `<path d="M70 48 L73 20 L87 35 L100 13 L113 35 L127 20 L130 48 Z" fill="#E2B33C" stroke="#B98A1E" stroke-width="2" stroke-linejoin="round"/>
              <circle cx="100" cy="38" r="4" fill="#C0392B"/><circle cx="83" cy="41" r="3" fill="#2F6E8F"/><circle cx="117" cy="41" r="3" fill="#2F6E8F"/>`;
    }
    return { head, face, neck };
  }

  window.drawDonguri = function (mood, equip) {
    mood = mood || "idle";
    equip = equip || {};
    const P = PALETTE;
    const acc = accessories(equip);
    const holdsAcorn = mood === "idle" || mood === "cheer";
    const extras =
      mood === "cheer" ? `<path d="M152 50 Q145 62 152 67 Q159 62 152 50 Z" fill="${P.sweat}"/>` :
      mood === "proud" ? sparkle(34, 44, 9, P.sparkle) + sparkle(168, 34, 7, P.sparkle) + sparkle(172, 84, 5, P.sparkle) + sparkle(26, 96, 5, P.sparkle) :
      mood === "happy" ? sparkle(36, 52, 7, P.sparkle) + sparkle(166, 46, 6, P.sparkle) : "";

    return `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="돈구리">
      <g transform="rotate(-28 158 150)">
        <ellipse cx="158" cy="150" rx="16" ry="34" fill="${P.fur}"/>
        <ellipse cx="158" cy="132" rx="13" ry="4.5" fill="${P.mask}"/>
        <ellipse cx="158" cy="150" rx="15" ry="4.5" fill="${P.mask}"/>
        <ellipse cx="158" cy="168" rx="13" ry="4.5" fill="${P.mask}"/>
      </g>
      <ellipse cx="100" cy="152" rx="50" ry="40" fill="${P.fur}"/>
      <ellipse cx="100" cy="160" rx="31" ry="27" fill="${P.cream}"/>
      <ellipse cx="78" cy="189" rx="15" ry="7.5" fill="${P.furDark}"/>
      <ellipse cx="122" cy="189" rx="15" ry="7.5" fill="${P.furDark}"/>
      ${arms(mood, P)}
      ${holdsAcorn ? acorn(100, 150, 1, P) : ""}
      <circle cx="55" cy="47" r="18" fill="${P.furDark}"/><circle cx="55" cy="48" r="10" fill="${P.earInner}"/>
      <circle cx="145" cy="47" r="18" fill="${P.furDark}"/><circle cx="145" cy="48" r="10" fill="${P.earInner}"/>
      <ellipse cx="100" cy="88" rx="62" ry="52" fill="${P.fur}"/>
      <path d="M100 38 L93 58 L107 58 Z" fill="${P.furDark}" opacity=".45"/>
      <ellipse cx="56" cy="110" rx="15" ry="11" fill="${P.cream}"/>
      <ellipse cx="144" cy="110" rx="15" ry="11" fill="${P.cream}"/>
      <path d="M44 86 C56 66 84 70 100 80 C116 70 144 66 156 86 C150 104 124 106 108 96 Q100 92 92 96 C76 106 50 104 44 86 Z" fill="${P.mask}"/>
      <ellipse cx="100" cy="112" rx="28" ry="20" fill="${P.cream}"/>
      ${eyes(mood, P)}
      <ellipse cx="100" cy="104" rx="7" ry="5" fill="${P.nose}"/>
      ${mouth(mood, P)}
      <ellipse cx="64" cy="114" rx="7" ry="4" fill="${P.blush}" opacity=".7"/>
      <ellipse cx="136" cy="114" rx="7" ry="4" fill="${P.blush}" opacity=".7"/>
      ${acc.neck}${acc.face}${acc.head}${extras}
    </svg>`;
  };

  /* 화면 위쪽 도토리 아이콘 (재화) */
  window.drawAcornIcon = function () {
    return `<svg viewBox="-14 -18 28 42" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${acorn(0, 0, 1, PALETTE)}</svg>`;
  };
})();
