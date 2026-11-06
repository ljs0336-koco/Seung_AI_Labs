"""Vol.02 게시본을 틀로 Vol.03을 조립한다. 틀 파일은 고치지 않는다."""
import re
from pathlib import Path

here = Path(__file__).resolve().parent
root = here.parents[2]
base = (root / "public/deck/vol02/index.html").read_text(encoding="utf-8")
slides = (here / "vol03_slides.html").read_text(encoding="utf-8")
extra = (here / "vol03_extra.css").read_text(encoding="utf-8")
out = root / "public/deck/vol03/index.html"

html = base
html = html.replace("<title>The Curated Mind</title>", "<title>The Easy Answer</title>")
html = html.replace("/deck/vol02/", "/deck/vol03/")
html = html.replace("The Curated Mind · Vol.02", "The Easy Answer · Vol.03")
html = html.replace("AI의 답에는 누구의 기준이 담기는가 · Seung AI Labs", "답이 쉬워질수록, 판단은 어려워진다 · Seung AI Labs")
html = re.sub(r'<meta name="description" content="[^"]*">',
              '<meta name="description" content="AI &amp; Learning Vol.03 — 인지적 항복, 경력 사다리의 균열, 노동 이후의 시간, 관계의 역설. 10쪽 에디토리얼.">',
              html)
html = html.replace("design tokens · Vol.02 세피아 B", "design tokens · Vol.02 세피아 B 계승")

# Vol.02 전용 문단 보정은 가져오지 않는다.
html, n = re.subn(r"\n/\* User-reviewed prose, with the original eight-page grid retained\. \*/.*?(?=</style>)", "\n", html, flags=re.S)
assert n == 1

assert html.count("</style>") == 1
html = html.replace("</style>", extra.rstrip() + "\n</style>")

start = html.index("<!-- ======================================================================\n     01 · 표지")
nav = html.index('<nav class="nav-controls"')
end = html.index("</nav>", nav) + len("</nav>")
html = html[:start] + slides.rstrip() + html[end:]
html = html.replace("딥링크: #1 … #8", "딥링크: #1 … #10")

n_slides = len(re.findall(r'<section class="slide[ "]', html))
assert n_slides == 10, n_slides
assert 'href="../../#/"' in html
out.parent.mkdir(parents=True, exist_ok=True)
out.write_text(html, encoding="utf-8")
print(out)
