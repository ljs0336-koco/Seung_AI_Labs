"""루틴 폴더의 공개 페이지를 Seung AI Labs 저장소(GitHub Pages)에 맞게 옮긴다.

  python publish_site.py "<Seung_AI_Labs 저장소 경로>"            # 브리핑 + 연구 서고
  python publish_site.py "<Seung_AI_Labs 저장소 경로>" library    # 연구 서고만 (briefing 이면 브리핑만)

- 브리핑: ai-edu-briefing/ → public/briefing/
  각 페이지 맨 위에 포털 이동 바를 넣고 바닥글 링크를 사이트에 맞게 바꾼다.
  '지난 브리핑' 목록은 사이트 디자인(요약 한 줄 + 최신호 표시)으로 새로 만든다.
  public/briefing/assets/style.css 는 사이트 전용으로 따로 꾸민 파일이라 건드리지 않는다.
- 연구 서고: research-library/ → public/library/ (공개 화면의 기지 진입 링크만 제거)
- briefing/latest.json과 library/summary.json, content/news.json으로 포털·기지에 공개 메타데이터를 제공한다.
  JSX 파일은 바꾸지 않는다.
커밋·푸시는 하지 않는다. 저장소에서 개인정보 검사(npm run check:privacy) 뒤 사람이 확인하고 올린다.
"""
import datetime as dt
import html
import json
import re
import shutil
import sys
import os
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlsplit
from build_briefing import news_record, active_bids

ROOT = Path(os.environ.get("SEUNG_ROUTINE_ROOT", Path(__file__).resolve().parent.parent))
BRIEF = ROOT / "ai-edu-briefing"
LIB = ROOT / "research-library"
NEWS = ROOT / "03_테크트렌드"
BIDS = ROOT / "01_사업공고"
WEEKDAY = "월화수목금토일"

NAV_INDEX = """<nav class="site-bar" aria-label="포털 이동">
  <a class="brand" href="../#/"><span class="brand-mark" aria-hidden="true">S</span><span>Seung AI Labs</span></a>
  <div class="site-actions">
    <a class="portal-link" href="../library/">연구 서고</a>
    <a class="portal-link" href="archive/index.html">📚 지난 브리핑</a>
    <a class="portal-link" href="../#/">← 포털 돌아가기</a>
  </div>
</nav>"""
NAV_ARCHIVE = """<nav class="site-bar" aria-label="포털 이동">
  <a class="brand" href="../../#/"><span class="brand-mark" aria-hidden="true">S</span><span>Seung AI Labs</span></a>
  <div class="site-actions">
    <a class="portal-link" href="../../library/">연구 서고</a>
    <a class="portal-link" href="./index.html">📚 지난 브리핑 목록</a>
    <a class="portal-link" href="../index.html">오늘 브리핑</a>
    <a class="portal-link" href="../../#/">← 포털 돌아가기</a>
  </div>
</nav>"""
NAV_LIST = """<nav class="site-bar" aria-label="포털 이동">
  <a class="brand" href="../../#/"><span class="brand-mark" aria-hidden="true">S</span><span>Seung AI Labs</span></a>
  <div class="site-actions">
    <a class="portal-link" href="../../library/">연구 서고</a>
    <a class="portal-link" href="../index.html">오늘 브리핑으로 →</a>
    <a class="portal-link" href="../../#/">← 포털 돌아가기</a>
  </div>
</nav>"""
FOOT_INDEX = ('<a href="archive/">지난 브리핑</a></span>',
              '<a href="archive/index.html">지난 브리핑</a> · <a href="../#/">Seung AI Labs</a></span>')
FOOT_ARCHIVE = ('<a href="./">지난 브리핑</a></span>',
                '<a href="./index.html">지난 브리핑 목록</a> · <a href="../../#/">Seung AI Labs</a></span>')


def read(p):
    return p.read_text(encoding="utf-8").replace("\r\n", "\n")


def write(p, text):
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(text, encoding="utf-8", newline="\n")


def is_base_entry(href):
    """Recognize local entry aliases without changing their directly opened pages."""
    try:
        target = urlsplit(unquote(href or ""))
    except ValueError:
        return False
    if target.scheme not in ("", "http", "https"):
        return False
    if target.netloc and target.netloc.lower() != "ljs0336-koco.github.io":
        return False
    aliases = {"base", "admin", "desk-3802e7b987d344178fc03571", "privacy-guidelines.html"}
    route = target.fragment.split("?", 1)[0].strip("/")
    destination = re.sub(r"^(?:\.\.?/)+", "", target.path).strip("/")
    if destination.startswith("Seung_AI_Labs/"):
        destination = destination[len("Seung_AI_Labs/"):]
    return route in aliases or destination in aliases


def normalize_public_navigation(text):
    """Remove base entry anchors while preserving all other source markup verbatim."""
    class EntryLinks(HTMLParser):
        def __init__(self):
            super().__init__(convert_charrefs=False)
            self.starts = [0] + [m.end() for m in re.finditer("\n", text)]
            self.anchor = None
            self.ranges = []

        def text_offset(self):
            row, column = self.getpos()
            return self.starts[row - 1] + column

        def handle_starttag(self, tag, attrs):
            if tag == "a":
                self.anchor = (self.text_offset(), is_base_entry(dict(attrs).get("href")))

        def handle_endtag(self, tag):
            if tag == "a" and self.anchor is not None:
                start, hidden = self.anchor
                if hidden:
                    self.ranges.append((start, text.index(">", self.text_offset()) + 1))
                self.anchor = None

    links = EntryLinks()
    links.feed(text)
    for start, end in reversed(links.ranges):
        text = text[:start] + text[end:]
    return text


def site_page(text, nav, foot, shared_prefix="../"):
    if 'class="site-bar"' not in text:
        text = re.sub(r'(<body[^>]*>)', lambda m: m.group(1) + "\n" + nav, text, count=1)
    old, new = foot
    if old not in text and new not in text:
        sys.exit("바닥글 형식이 바뀌었습니다. publish_site.py 의 FOOT_* 를 맞춰 주세요.")
    text = text.replace(old, new)
    if "content-share.css" not in text:
        text = text.replace('</head>', f'<link rel="stylesheet" href="{shared_prefix}shared/content-share.css">\n</head>')
    if "content-share.js" not in text:
        text = text.replace('</body>', f'<script src="{shared_prefix}shared/content-share.js" defer></script>\n</body>')
    return normalize_public_navigation(text)


def strip_tags(s):
    return html.unescape(re.sub(r"<[^>]+>", "", s)).strip()


def titles(page):
    """대표 뉴스, 나머지 뉴스, 추천 공고 제목."""
    lead = re.search(r'<article class="lead">.*?<h3>(.*?)</h3>', page, re.S)
    news = re.findall(r'<ul class="news">.*?</ul>', page, re.S)
    rest = re.findall(r"<h4>(.*?)</h4>", " ".join(news)) if news else []
    pick = re.search(r'<article class="pick">.*?<h3>(.*?)</h3>', page, re.S)
    out = ([strip_tags(lead.group(1))] if lead else []) + [strip_tags(t) for t in rest[:2]]
    return out + ([strip_tags(pick.group(1))] if pick else [])


def short(t, n=30):
    t = re.split(r"\s*[…]\s*", t)[0]
    if len(t) <= n:
        return t
    cut = t[:n].rsplit(" ", 1)[0]
    return (cut if len(cut) > n // 2 else t[:n]) + "…"


def old_summaries(repo):
    p = repo / "public/briefing/archive/index.html"
    if not p.exists():
        return {}
    found = re.findall(r'href="(\d{4}-\d{2}-\d{2})\.html">.*?<p class="archive-summary">(.*?)</p>', read(p), re.S)
    return {d: s for d, s in found}


def archive_list(dates, summaries):
    items = []
    for i, d in enumerate(dates):
        x = dt.date.fromisoformat(d)
        badge = '\n            <span class="archive-badge">최신호</span>' if i == 0 else ""
        items.append(f"""    <li>
      <a class="archive-item" href="{d}.html">
        <div class="archive-item-main">
          <div class="archive-date">
            <span>{x.month}월 {x.day}일 {WEEKDAY[x.weekday()]}요일 · {d}</span>{badge}
          </div>
          <p class="archive-summary">{summaries[d]}</p>
        </div>
        <span class="btn">브리핑 보기 →</span>
      </a>
    </li>""")
    latest = dt.date.fromisoformat(dates[0])
    return f"""<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>지난 브리핑 아카이브 · AI 교육 업무 브리핑</title>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Noto+Serif+KR:wght@500;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="../assets/style.css">
</head>
<body>
{NAV_LIST}
<div class="sheet">

  <header class="masthead">
    <div>
      <div class="kicker">AI 교육 업무 브리핑 · 아카이브</div>
      <h1>지난 브리핑 모아보기</h1>
    </div>
    <div class="updated">
      평일마다 발행되는 모루의 브리핑이 누적 보관됩니다<br>
      <a href="../index.html">최신 브리핑({latest.month}/{latest.day}) 바로가기 →</a>
    </div>
  </header>

  <ul class="archive-list">
{chr(10).join(items)}
  </ul>

  <footer>
    <span>모루 루틴이 평일마다 자동으로 정리합니다 · <a href="../index.html">오늘 브리핑</a> · <a href="../../#/">Seung AI Labs</a></span>
    <span>공고 자격·일정과 기사 내용은 원문에서 확인해 주세요</span>
  </footer>
</div>
</body>
</html>
"""


def publish(repo, parts=("briefing", "library")):
    if not (repo / "src" / "app" / "Portal.jsx").exists():
        sys.exit(f"Seung_AI_Labs 저장소가 아닙니다: {repo}")
    changed = []
    if "briefing" in parts:
        changed += publish_briefing(repo)
    if "library" in parts:
        changed += publish_library(repo)
    print("옮김: " + ", ".join(changed))


def publish_briefing(repo):
    pub = repo / "public" / "briefing"
    old = old_summaries(repo)
    dates = sorted((p.stem for p in (BRIEF / "archive").glob("????-??-??.html")), reverse=True)
    summaries, changed = {}, []
    for d in dates:
        new_page = site_page(read(BRIEF / "archive" / f"{d}.html"), NAV_ARCHIVE, FOOT_ARCHIVE, "../../")
        new_page = add_legacy_share_links(new_page, d, "../../")
        target = pub / "archive" / f"{d}.html"
        before = read(target) if target.exists() else ""
        if d in old and before and titles(before) == titles(new_page):
            summaries[d] = old[d]          # 내용이 같으면 손으로 다듬은 요약을 그대로 둔다
        else:
            summaries[d] = html.escape(" · ".join(short(t) for t in titles(new_page)), quote=True)
        if new_page != before:
            write(target, new_page)
            changed.append(f"briefing/archive/{d}.html")
    write(pub / "archive" / "index.html", archive_list(dates, summaries))
    write(pub / "index.html", site_page(read(BRIEF / "index.html"), NAV_INDEX, FOOT_INDEX))
    changed += ["briefing/index.html", "briefing/archive/index.html"]

    changed += publish_metadata(repo, dates)
    return changed


def load_json(path):
    return json.loads(path.read_text(encoding="utf-8-sig"))


def add_legacy_share_links(text, edition, prefix):
    """Add stable share controls without changing past editions' labels/layout."""
    if 'data-share-id=' in text:
        return text
    source = NEWS / f"{edition}_테크브리핑.json"
    if not source.exists():
        return text
    for item in load_json(source).get("headlines", []):
        record = news_record(item, edition)
        ident = html.escape(record["id"], quote=True)
        escaped_url = html.escape(record["url"], quote=True)
        pattern = r'(<a\s+href="' + re.escape(escaped_url) + r'"[^>]*>원문 ↗</a>)'
        controls = f' · <button class="link-read" type="button" data-share-id="{ident}">이미지·요약 공유</button> · <a href="{prefix}share/news/{ident}/">개별 보기</a>'
        text = re.sub(pattern, lambda m: m.group(1) + controls, text)
    return text


def publish_metadata(repo, dates):
    """Only allowlisted public fields leave the routine source folder."""
    news_files = sorted(NEWS.glob("????-??-??_테크브리핑.json"))
    records, latest_news = {}, {}
    for source in news_files:
        document = load_json(source)
        for item in document.get("headlines", []):
            record = news_record(item, document.get("date", source.name[:10]))
            records[record["id"]] = record
        latest_news = document
    manifest = {"schemaVersion": 1, "items": sorted(records.values(), key=lambda it: (it["date"], it["id"]), reverse=True)}
    write(repo / "public/content/news.json", json.dumps(manifest, ensure_ascii=False, indent=2) + "\n")
    bid_files = sorted(BIDS.glob("????-??-??_사업공고.json"))
    latest_bids = load_json(bid_files[-1]) if bid_files else {}
    edition = latest_news.get("date") or (dates[0] if dates else latest_bids.get("date"))
    if not edition:
        raise ValueError("발행 날짜가 없는 브리핑 메타데이터")
    today = dt.date.fromisoformat(edition)
    bids = [{key: item.get(key, "") for key in ("title", "deadline", "url", "org")} for item in active_bids(latest_bids, today)]
    bids.sort(key=lambda it: it["deadline"])
    headlines = []
    for item in latest_news.get("headlines", []):
        record = news_record(item, edition)
        record["href"] = f'./share/news/{record["id"]}/'
        headlines.append(record)
    latest = {"schemaVersion": 1, "date": edition, "collectedAt": latest_news.get("collected_at", ""), "headlines": headlines, "bids": bids,
              "editions": [{"date": d, "url": f"./briefing/archive/{d}.html"} for d in dates]}
    write(repo / "public/briefing/latest.json", json.dumps(latest, ensure_ascii=False, indent=2) + "\n")
    return ["content/news.json", "briefing/latest.json"]


def publish_library(repo):
    lib = repo / "public" / "library"
    for p in LIB.rglob("*"):
        if p.is_file():
            dest = lib / p.relative_to(LIB)
            dest.parent.mkdir(parents=True, exist_ok=True)
            if p.suffix in (".html", ".css", ".bib", ".ris", ".json"):
                text = read(p)
                write(dest, normalize_public_navigation(text) if p.suffix == ".html" else text)
            else:
                shutil.copyfile(p, dest)
    return ["library/"]


if __name__ == "__main__":
    if len(sys.argv) not in (2, 3) or (len(sys.argv) == 3 and sys.argv[2] not in ("briefing", "library")):
        sys.exit(__doc__)
    publish(Path(sys.argv[1]), (sys.argv[2],) if len(sys.argv) == 3 else ("briefing", "library"))
