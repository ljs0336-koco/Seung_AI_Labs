"""Vol.01 HTML을 틀로 Vol.02 초안을 조립한다.

- 바탕 토큰을 세피아 B로 바꾸고, 토큰을 따르지 않는 하드코딩 색도 같은 값으로 옮긴다.
- Vol.02 추가 CSS를 넣고, 슬라이드 8장과 네비게이션을 새 본문으로 바꾼다.
원본(_vol01_base.html)은 고치지 않는다.
"""
import re
import sys
from pathlib import Path

here = Path(__file__).resolve().parent
base = (here.parent / "_vol01_base.html").read_text(encoding="utf-8")
slides = (here / "vol02_slides.html").read_text(encoding="utf-8")
extra = (here / "vol02_extra.css").read_text(encoding="utf-8")
out = Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else here.parents[2] / "public/deck/vol02/index.html"

SEPIA_B = {"--paper": "#F6EFE2", "--paper-2": "#F1E9DA", "--paper-3": "#EAE1CF", "--paper-4": "#E4D9C5",
           "--sheet": "#EEE3CF", "--white": "#FFFBF2", "--ink-3": "#605C54", "--rule": "#E2D7C3",
           "--rule-2": "#C9BBA2", "--desk": "#D9CCB4"}
HARD = [("#FBF9F5", "--paper"), ("#F5F3EF", "--paper-2"), ("#E4E2DE", "--rule"), ("#777771", "--ink-3")]

html = base
html = html.replace("<title>The Agentic Shift</title>", "<title>The Curated Mind</title>")
html = re.sub(r'<meta name="description" content="[^"]*">',
              '<meta name="description" content="Responsible AI Vol.02 — AI의 답에 담긴 판단 기준, 데이터 정제, 목적에 맞는 AI와 통제 범위. 8쪽 에디토리얼.">',
              html)
html = html.replace("L'Éditeur Archival — design tokens", "L'Éditeur Archival — design tokens · Vol.02 세피아 B")

root = re.search(r":root\{.*?\n\}", html, re.S)
block = root.group(0)
for k, v in SEPIA_B.items():
    block, n = re.subn(rf"({re.escape(k)}:)\s*#[0-9A-Fa-f]{{6}}", rf"\g<1>{v}", block)
    assert n == 1, k
head, tail = html[:root.start()] + block, html[root.end():]
for old, k in HARD:
    tail = re.sub(re.escape(old), SEPIA_B[k], tail, flags=re.I)
tail = tail.replace("rgba(239,238,234,.8)", "rgba(237,230,216,.8)")
html = head + tail

assert html.count("</style>") == 1
html = html.replace("</style>", extra.rstrip() + "\n</style>")

start = html.index("<!-- ======================================================================\n     01 · 표지")
nav = html.index('<nav class="nav-controls"')
end = html.index("</nav>", nav) + len("</nav>")
html = html[:start] + slides.rstrip() + html[end:]

n_slides = len(re.findall(r'<section class="slide[ "]', html))
assert n_slides == 8, n_slides
html = html.replace('href="../#/"', 'href="../../#/"')
html = html.replace('</title>', '</title>\n<link rel="canonical" href="https://ljs0336-koco.github.io/Seung_AI_Labs/deck/vol02/">\n<meta property="og:title" content="The Curated Mind · Vol.02">\n<meta property="og:description" content="AI의 답에는 누구의 기준이 담기는가 · Seung AI Labs">\n<meta property="og:url" content="https://ljs0336-koco.github.io/Seung_AI_Labs/deck/vol02/">', 1)
out.parent.mkdir(parents=True, exist_ok=True)
out.write_text(html, encoding="utf-8")
print(out)
