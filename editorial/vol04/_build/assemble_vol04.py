"""Vol.02 게시본을 틀로 Vol.04를 조립한다. 틀 파일은 고치지 않는다."""
import re
from pathlib import Path

here = Path(__file__).resolve().parent
root = here.parents[2]
base = (root / "public/deck/vol02/index.html").read_text(encoding="utf-8")
slides = (here / "vol04_slides.html").read_text(encoding="utf-8")
extra = (here / "vol04_extra.css").read_text(encoding="utf-8")
out = root / "public/deck/vol04/index.html"

html = base
html = html.replace("<title>The Curated Mind</title>", "<title>The Open Tabs</title>")
html = html.replace("/deck/vol02/", "/deck/vol04/")
html = html.replace("The Curated Mind · Vol.02", "The Open Tabs · Vol.04")
html = html.replace("AI의 답에는 누구의 기준이 담기는가 · Seung AI Labs", "열린 창이 늘수록, 주의는 얇아진다 · Seung AI Labs")
html = re.sub(r'<meta name="description" content="[^"]*">',
              '<meta name="description" content="AI &amp; Learning Vol.04 — 멀티태스킹의 비용, 흘러드는 시청, 에이전트를 지켜보는 일, 읽기의 자리. 10쪽 에디토리얼.">',
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
assert "Vol.02" not in html.split("<body", 1)[1].split("<script", 1)[0], "Vol.02 표기가 본문에 남았다"
out.parent.mkdir(parents=True, exist_ok=True)
out.write_text(html, encoding="utf-8")
print(out)
