"""사업공고·테크브리핑 JSON으로 공개용 브리핑 페이지를 만든다.

  python build_briefing.py            # 가장 최근 JSON으로 index.html과 지난 브리핑을 갱신

읽는 곳:   <루틴 폴더>/01_사업공고/*_사업공고.json, 03_테크트렌드/*_테크브리핑.json
쓰는 곳:   <루틴 폴더>/ai-edu-briefing/ (GitHub에 올리는 폴더. 공개해도 되는 내용만 들어간다)
JSON 형식: _도구/공개브리핑_규칙.md
"""
import datetime as dt
import html
import hashlib
import json
import re
import os
from pathlib import Path

ROOT = Path(os.environ.get("SEUNG_ROUTINE_ROOT", Path(__file__).resolve().parent.parent))
BIZ_DIR = ROOT / "01_사업공고"
NEWS_DIR = ROOT / "03_테크트렌드"
SITE = ROOT / "ai-edu-briefing"

SHOW_TEAM_NOTES = True   # 추천 공고·요약 읽기의 '우리 팀 메모'를 공개 페이지에 보일지
NEAR_DAYS = 14           # 이 기간 안에 마감하는 공고는 위 목록(마감 순)
MAX_ROWS = 5             # 위 목록 최대 행 수
MAX_LATER = 3            # 마감이 넉넉해도 적합도가 높아 아래에 붙이는 공고 수
SOON_DAYS = 7            # 이 날짜 안에 마감이면 주황으로 표시
FIT_ORDER = {"상": 0, "중": 1}

WEEKDAY = "월화수목금토일"


def e(s):
    return html.escape(str(s or ""), quote=True)


def safe_url(u):
    return u if isinstance(u, str) and u.startswith(("http://", "https://")) else "#"


def latest(folder, suffix):
    files = sorted(folder.glob(f"????-??-??_{suffix}.json"))
    return (files[-1], json.loads(files[-1].read_text(encoding="utf-8"))) if files else (None, None)


def fill_images(path, data):
    """빌드는 저장된 주소만 사용한다. 원격 이미지나 원문을 새로 요청하지 않는다."""
    return data


FIELDS = {"교육", "에이전트", "AI 코딩", "챗봇", "모델", "기기·로봇", "산업"}
ISSUES = {"아동·청소년 안전", "법·규제", "AI 안전", "보안·권한", "개인정보", "공정성", "책임성·투명성", "사회적 영향"}
LEGACY_FIELDS = {"교육 AI": "교육", "교육 정책": "교육", "AI 에이전트": "에이전트", "코딩 도구": "AI 코딩", "모델": "모델", "기기": "기기·로봇", "AI 윤리": "챗봇"}


def stable_news_id(item):
    if item.get("id"):
        value = str(item["id"])
        if not re.fullmatch(r"[A-Za-z0-9_-]+", value):
            raise ValueError("기사 id에는 영문·숫자·밑줄·하이픈만 사용할 수 있습니다")
        return value
    url = item.get("url", "").strip().split("#")[0]
    if not url:
        raise ValueError("기사의 안정 id를 만들 원문 URL이 없습니다")
    return "n-" + hashlib.sha256(url.encode()).hexdigest()[:16]


def taxonomy(item):
    """새 두 축을 우선하고, 기존 tag는 읽기 전용 호환 규칙으로 표시한다."""
    text = " ".join(str(item.get(k, "")) for k in ("title", "summary"))
    field = item.get("field") or LEGACY_FIELDS.get(item.get("tag"), "산업")
    if not item.get("field"):
        if any(x in text for x in ("상장", "S-1", "자금 조달", "매출")):
            field = "산업"
        elif item.get("tag") == "AI 윤리" and any(x in text for x in ("METR", "재앙", "프런티어", "외부 평가")):
            field = "모델"
    if "issue" in item:
        issue = item.get("issue") or ""
    elif any(x in text for x in ("아동", "청소년", "미성년")):
        issue = "아동·청소년 안전"
    elif any(x in text for x in ("법안", "규제", "심의", "고소", "소송", "연방 법")):
        issue = "법·규제"
    elif any(x in text for x in ("재앙", "외부 평가", "METR", "실시간 인터넷")):
        issue = "AI 안전"
    elif any(x in text for x in ("허락", "권한", "보안", "비밀번호", "감시", "취약점", "내부자 위협")):
        issue = "보안·권한"
    elif any(x in text for x in ("개인정보", "Locked Chats", "Face ID", "대화를 잠그")):
        issue = "개인정보"
    elif any(x in text for x in ("편향", "공화당", "민주당", "공정성")):
        issue = "공정성"
    elif any(x in text for x in ("투명성", "책임성", "지배구조")):
        issue = "책임성·투명성"
    else:
        issue = ""
    if field not in FIELDS or (issue and issue not in ISSUES):
        raise ValueError(f"알 수 없는 기사 분류: {issue} | {field}")
    return issue, field


def news_record(item, edition_date=""):
    issue, field = taxonomy(item)
    record = {"id": stable_news_id(item), "title": item.get("title", ""),
              "summary": item.get("summary", ""), "digest": item.get("digest", []),
              "source": item.get("source", ""), "date": item.get("date") or edition_date,
              "url": item.get("url", ""), "issue": issue, "field": field}
    if item.get("image"):
        record["image"] = item["image"]
    return record


def kicker(item):
    issue, field = taxonomy(item)
    label = f'<b class="issue{ " child" if issue == "아동·청소년 안전" else "" }">{e(issue)}</b>' if issue else ""
    return f'<span class="kick">{label}<b>{e(field)}</b></span>'


def md(d):
    """2026-10-17 -> 10/17(금)"""
    try:
        x = dt.date.fromisoformat(d)
        return f"{x.month}/{x.day}({WEEKDAY[x.weekday()]})"
    except (TypeError, ValueError):
        return e(d)


def dday(deadline, today):
    try:
        n = (dt.date.fromisoformat(deadline) - today).days
    except (TypeError, ValueError):
        return '<span class="dday">마감 확인</span>'
    text = "마감" if n < 0 else ("D-day" if n == 0 else f"D-{n}")
    cls = "closed" if n < 0 else ("soon" if n <= SOON_DAYS else "")
    return f'<span class="dday {cls}" data-deadline="{e(deadline)}">{text}</span>'


def img_tag(src, alt=""):
    if not src:
        return ""
    return (f'<img class="img" src="{e(src)}" alt="{e(alt)}" loading="lazy" '
            f'referrerpolicy="no-referrer" onerror="this.parentElement.classList.add(\'noimg\');this.remove()">')


def biz_row(i, today):
    label = "적합" if i.get("fit") == "상" else "검토"
    return f'<li><a href="{e(safe_url(i.get("url")))}" target="_blank" rel="noopener"><span class="row-title"><span class="fit">{label}</span>{e(i.get("title"))}</span><span class="row-due">{dday(i.get("deadline"), today)} · {md(i.get("deadline"))} 마감 · {e(i.get("org"))}</span></a></li>'


def active_bids(biz, today):
    if not biz:
        return []
    candidates = ([biz["pick"]] if biz.get("pick") else []) + biz.get("items", [])
    seen, out = set(), []
    for item in candidates:
        key = item.get("url") or item.get("title")
        if key not in seen and item.get("deadline", "9999") >= today.isoformat():
            seen.add(key)
            out.append(item)
    return out


def render_biz(biz, today):
    active = active_bids(biz, today)
    pick = biz.get("pick") if biz else None
    if pick not in active:
        pick = None
    out = []
    if pick:
        why = f'<p class="why">{e(pick.get("why"))}</p>' if SHOW_TEAM_NOTES and pick.get("why") else ""
        meta = " · ".join(e(x) for x in (pick.get("org"), pick.get("budget")) if x)
        out.append(f'<article class="pick"><div class="label">이번 주 눈여겨볼 공고</div><h3><a href="{e(safe_url(pick.get("url")))}" target="_blank" rel="noopener">{e(pick.get("title"))}</a></h3><div class="meta">{meta}</div>{why}<div class="due">{dday(pick.get("deadline"), today)} · {md(pick.get("deadline"))} 마감</div></article>')
    remaining = [i for i in active if i is not pick]
    cut = (today + dt.timedelta(days=NEAR_DAYS)).isoformat()
    near = sorted((i for i in remaining if i.get("deadline", "9999") <= cut), key=lambda i: i.get("deadline", "9999"))
    later = sorted((i for i in remaining if i.get("deadline", "9999") > cut), key=lambda i: (FIT_ORDER.get(i.get("fit"), 9), i.get("deadline", "9999")))
    if near:
        out.append('<ul class="rows">' + "".join(biz_row(i, today) for i in near[:MAX_ROWS]) + '</ul>')
    if later:
        out.append('<p class="sub-label">마감 여유 있는 적합 공고</p><ul class="rows">' + "".join(biz_row(i, today) for i in later[:MAX_LATER]) + '</ul>')
    if not active:
        out.append('<p class="empty">지금 접수 중인 맞춤 공고가 없습니다.</p>')
    if biz and biz.get("note"):
        out.append(f'<p class="note">{e(biz["note"])}</p>')
    return "\n".join(out), f"접수 중 {len(active)}건"


def src_line(h, idx):
    lang = " · 영문" if h.get("lang") == "en" else ""
    ident = stable_news_id(h)
    read = f' · <button class="link-read" type="button" data-read="read-{idx}">요약 읽기</button>' if h.get("digest") else ""
    return f'<p class="src">{e(h.get("source"))}{lang} · {md(h.get("date"))} · <a href="{e(safe_url(h.get("url")))}" target="_blank" rel="noopener">원문 ↗</a>{read} · <button class="link-read" type="button" data-share-id="{e(ident)}">이미지·요약 공유</button> · <a data-news-link="{e(ident)}" href="../share/news/{e(ident)}/">개별 보기</a></p>'


def render_reader(news, hs):
    items = []
    for idx, h in enumerate(hs[:4]):
        if not h.get("digest"):
            continue
        points = "".join(f'<li>{e(point)}</li>' for point in h["digest"][:5])
        note = f'<p class="reader-note"><span>수업 연결</span>{e(h["note"])}</p>' if SHOW_TEAM_NOTES and h.get("note") else ""
        picture = f'<figure class="reader-picture">{img_tag(h["image"], h.get("title"))}</figure>' if h.get("image") else ""
        items.append(f'<article class="reader-item" id="read-{idx}">{kicker(h)}<div class="meta">{e(h.get("source"))} · {md(h.get("date"))}</div><h3>{e(h.get("title"))}</h3>{picture}<ul class="digest">{points}</ul>{note}<a class="btn" href="{e(safe_url(h.get("url")))}" target="_blank" rel="noopener">원문 보기 ↗</a> <button class="btn" type="button" data-reader-share="{e(stable_news_id(h))}">이미지·요약 공유</button></article>')
    if not items:
        return ""
    return '<div class="reader-backdrop" data-read-close></div><aside class="reader" id="reader" role="dialog" aria-modal="true" aria-labelledby="reader-title" inert><div class="reader-head"><div><div class="kicker">AI 이슈와 뉴스 · ' + e(news.get("period")) + '</div><h2 id="reader-title">요약 읽기</h2></div><button class="btn reader-close" type="button" data-read-close>닫기</button></div>' + "".join(items) + '<p class="reader-foot">원문을 읽고 우리말로 정리한 요약입니다. 정확한 내용은 원문에서 확인해 주세요.</p></aside>'


def photo(h, cls):
    if h.get("image"):
        return f'<figure class="ph {cls}" data-src="{e(taxonomy(h)[1])}">{img_tag(h["image"], h.get("title"))}<figcaption class="credit">이미지: {e(h.get("source"))}</figcaption></figure>'
    return f'<figure class="ph noimg {cls}" data-src="{e(taxonomy(h)[1])}" aria-label="기사 대표 이미지 없음"></figure>'


def story(h, idx):
    return f'<li class="story">{photo(h, "story-fig")}<div class="story-body"><div class="story-top"><span class="no">{idx + 1:02d}</span>{kicker(h)}</div><h4>{e(h.get("title"))}</h4><p class="sum">{e(h.get("summary"))}</p>{src_line(h, idx)}</div></li>'


def render_news(news):
    hs = news.get("headlines", [])[:4] if news else []
    if not hs:
        return '<article class="lead"><p class="empty">아직 수집된 소식이 없습니다.</p></article>', '<section class="more"></section>', '<section class="side"></section>', ""
    h = hs[0]
    note = f'<aside class="lead-note"><b>수업 연결</b><span>{e(h["note"])}</span></aside>' if SHOW_TEAM_NOTES and h.get("note") else ""
    lead = f'<article class="lead"><div class="lead-top"><span class="no">01</span>{kicker(h)}</div><h3>{e(h.get("title"))}</h3><p class="deck">{e(h.get("summary"))}</p>{src_line(h, 0)}{photo(h, "lead-fig capped")}{note}</article>'
    # Three headlines: one below the lead, one below the business box.
    split = max(1, len(hs) - 2)
    left = hs[1:1 + split]
    right = hs[1 + split:]
    more = f'<section class="more more-{max(1, len(left))}" aria-label="다른 헤드라인"><ul class="news">' + "".join(story(it, idx) for idx, it in enumerate(left, start=1)) + '</ul></section>'
    side = '<section class="side" aria-label="더 읽을 뉴스"><ul class="news">' + "".join(story(it, idx) for idx, it in enumerate(right, start=1 + split)) + '</ul>'
    video = news.get("video")
    if video and video.get("url"):
        side += f'<a class="watch-card" href="{e(safe_url(video["url"]))}" target="_blank" rel="noopener"><div class="watch-thumb">{img_tag(video.get("image"), "영상 썸네일")}</div><div class="watch-body"><span class="watch-kick">볼 만한 영상</span><h4 class="watch-title">{e(video.get("title"))}</h4><span class="meta">{e(video.get("channel"))} · {md(video.get("date"))}</span></div></a>'
    briefs = news.get("briefs", [])[:3]
    if briefs:
        side += '<aside class="briefs"><h3>한 줄 뉴스</h3><ul>' + "".join(f'<li><a href="{e(safe_url(it.get("url")))}" target="_blank" rel="noopener">{e(it.get("text"))}</a></li>' for it in briefs) + '</ul></aside>'
    side += '</section>'
    return lead, more, side, render_reader(news, hs)


DDAY_JS = """
<script>
// 페이지를 늦게 열어도 D-day가 맞도록 오늘 날짜로 다시 계산한다
(function () {
  var t = new Date(); t.setHours(0, 0, 0, 0);
  document.querySelectorAll('[data-deadline]').forEach(function (el) {
    var p = el.dataset.deadline.split('-'), d = new Date(+p[0], +p[1] - 1, +p[2]);
    var n = Math.round((d - t) / 86400000);
    el.textContent = n < 0 ? '마감' : (n === 0 ? 'D-day' : 'D-' + n);
    el.classList.toggle('soon', n >= 0 && n <= %d);
    el.classList.toggle('closed', n < 0);
  });
})();
// 요약 읽기 창 열고 닫기
(function () {
  var r = document.getElementById('reader');
  if (!r) return;
  var bg = document.querySelector('.reader-backdrop'), last = null;
  var sheet = document.querySelector('.sheet'), nav = document.querySelector('.site-bar');
  function open(id) {
    last = document.activeElement;
    r.inert = false; r.classList.add('open'); bg.classList.add('open');
    document.body.style.overflow = 'hidden';
    if (sheet) sheet.inert = true; if (nav) nav.inert = true;
    var t = id ? document.getElementById(id) : null;
    r.scrollTop = t ? t.offsetTop - 24 : 0;
    r.querySelector('.reader-close').focus({ preventScroll: true });
  }
  function close() {
    r.classList.remove('open'); bg.classList.remove('open'); r.inert = true;
    document.body.style.overflow = '';
    if (sheet) sheet.inert = false; if (nav) nav.inert = false;
    if (last) last.focus();
  }
  document.querySelectorAll('[data-read]').forEach(function (el) {
    el.addEventListener('click', function () { open(el.dataset.read); });
  });
  document.querySelectorAll('[data-read-open]').forEach(function (el) {
    el.addEventListener('click', function () { open(null); });
  });
  document.querySelectorAll('[data-read-close]').forEach(function (el) {
    el.addEventListener('click', close);
  });
  r.querySelectorAll('[data-reader-share]').forEach(function (el) {
    el.addEventListener('click', function () {
      close();
      if (window.SeungShare) window.SeungShare.open(el.dataset.readerShare);
    });
  });
  document.addEventListener('keydown', function (ev) {
    if (ev.key === 'Tab' && r.classList.contains('open')) {
      var controls = Array.from(r.querySelectorAll('button, a[href]')).filter(function(el) { return !el.hidden; });
      var first = controls[0], end = controls[controls.length - 1];
      if (ev.shiftKey && document.activeElement === first) { ev.preventDefault(); end.focus(); }
      else if (!ev.shiftKey && document.activeElement === end) { ev.preventDefault(); first.focus(); }
    }
    if (ev.key === 'Escape' && r.classList.contains('open')) close();
  });
})();
</script>""" % SOON_DAYS


def page(title, body, css_href, archive_href, extra="", tabloid=False):
    return f"""<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>{e(title)}</title>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Noto+Serif+KR:wght@500;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="{css_href}">
</head>
<body{' class="tabloid"' if tabloid else ""}>
<div class="sheet">
{body}
  <footer>
    <span>모루 루틴이 평일마다 자동으로 정리합니다 · <a href="{archive_href}">지난 브리핑</a></span>
    <span>공고 자격·일정과 기사 내용은 원문에서 확인해 주세요</span>
  </footer>
</div>
{extra}
{DDAY_JS}
</body>
</html>
"""


def build():
    biz_path, biz = latest(BIZ_DIR, "사업공고")
    news_path, news = latest(NEWS_DIR, "테크브리핑")
    # The edition belongs to the collected data, not to a machine timezone.
    edition = (news or biz or {}).get("date") or dt.datetime.now(dt.timezone(dt.timedelta(hours=9))).date().isoformat()
    today = dt.date.fromisoformat(edition)
    biz_html, biz_note = render_biz(biz, today)
    lead, more, side, reader = render_news(news)
    read_btn = '<button class="btn-read" type="button" data-read-open>전체 요약 읽기</button>' if reader else ""
    collected = " · ".join(x for x in [f'사업공고 {biz.get("collected_at", "")}' if biz else "", f'AI 뉴스 {news.get("collected_at", "")}' if news else ""] if x)
    period = e((news or {}).get("period", ""))
    body = f"""
  <header class="masthead"><div class="flag"><p class="flag-tag">K-12 AI 교육팀 데일리</p><h1>AI·교육 브리핑</h1></div><div class="dateline"><time datetime="{edition}"><span class="dl-md">{today.month}.{today.day:02d}</span><span class="dl-wd">{WEEKDAY[today.weekday()]}요일 · {today.year}</span></time></div></header>
  <div class="rail"><div class="rail-news"><h2>오늘의 AI 이슈와 뉴스</h2><span class="rail-note">{period}</span>{read_btn}</div><div class="rail-meta">{e(collected)} 수집<br>원문 확인 후 우리말로 정리합니다</div></div>
  <div class="front">{lead}<section class="biz" aria-labelledby="biz"><div class="biz-head"><h2 id="biz">사업 제안 기회</h2><span class="count">{biz_note}</span></div>{biz_html}</section>{more}{side}</div>
"""
    title = f"AI·교육 브리핑 · {edition}"
    (SITE / "archive").mkdir(parents=True, exist_ok=True)
    (SITE / "index.html").write_text(page(title, body, "assets/style.css", "archive/", reader, True), encoding="utf-8")
    archive_body = body.replace('href="../share/news/', 'href="../../share/news/')
    archive_reader = reader.replace('href="../share/news/', 'href="../../share/news/')
    (SITE / "archive" / f"{edition}.html").write_text(page(title, archive_body, "../assets/style.css", "./", archive_reader, True), encoding="utf-8")
    dates = sorted((p.stem for p in (SITE / "archive").glob("????-??-??.html")), reverse=True)
    links = "".join(f'<li><a href="{d}.html">{md(d)} · {d}</a></li>' for d in dates)
    arch_body = f'<header class="masthead"><div><div class="kicker">AI 교육 업무 브리핑 · 아카이브</div><h1>지난 브리핑</h1></div><div class="updated"><a href="../">오늘 브리핑으로 →</a></div></header><ul class="archive-list">{links}</ul>'
    (SITE / "archive" / "index.html").write_text(page("지난 브리핑 · AI 교육 업무 브리핑", arch_body, "../assets/style.css", "./"), encoding="utf-8")
    print(f"브리핑 갱신: {edition} (지난 브리핑 {len(dates)}개, 원격 요청 없음)")


if __name__ == "__main__":
    build()
