"""연구 서고 JSON으로 공유용 '연구 서고' 페이지를 만든다.

  python build_library.py

읽는 곳:   <루틴 폴더>/02_연구논문/연구서고.json   (형식: _도구/연구서고_규칙.md)
쓰는 곳:   <루틴 폴더>/research-library/index.html, library.bib, library.ris
디자인:    research-library/assets/library.css 만 손으로 고친다(HTML은 매번 새로 만든다)
"""
import datetime as dt
import hashlib
import html
import json
import re
import sys
import unicodedata
import os
from pathlib import Path

ROOT = Path(os.environ.get("SEUNG_ROUTINE_ROOT", Path(__file__).resolve().parent.parent))
DATA = ROOT / "02_연구논문" / "연구서고.json"
SITE = ROOT / "research-library"

WEEKDAY = "월화수목금토일"
KINDS = {  # 출판 유형·심사 상태: 표시 이름(정렬은 이 순서)
    "journal": "동료심사 저널",
    "conference": "동료심사 학회",
    "workshop": "학회 워크숍",
    "working-paper": "워킹페이퍼(심사 전)",
    "report": "정책 보고서",
    "book": "단행본·장",
    "magazine": "실무 잡지",
    "preprint": "프리프린트(심사 전)",
}
BASIS = [("원문", "원문 확인", "full"), ("전문", "원문 확인", "full"), ("본문 일부", "본문 일부 확인", "partial"),
         ("초록", "초록 기준", "partial"), ("요약", "요약 기준", "partial")]


def basis_badge(basis):
    """카드 밖에서도 보이게 '초록 기준' 같은 확인 범위를 짧게 표시한다."""
    for head, label, cls in BASIS:
        if (basis or "").startswith(head):
            return f'<span class="badge basis {cls}" title="{e(basis)}">{label}</span>'
    return ""
PEER = {"journal", "conference"}
POP_ORDER = ["초등학교", "중학교", "고등학교", "대학", "교사", "일반", "정책"]
RIS_TYPE = {"arxiv": "UNPB", "proceedings": "CPAPER", "report": "RPRT", "book": "BOOK", "repository": "RPRT", "journal": "JOUR"}
STOP = {"a", "an", "the", "of", "for", "in", "on", "and", "to", "via", "can", "you", "not", "how", "what"}
REQUIRED = ["no", "shelf", "added", "kind", "cite_as", "title", "title_ko", "authors", "year", "url"]


def e(s):
    return html.escape(str(s or ""), quote=True)


def md(d):
    """2026-10-19 -> 10/19(월)"""
    try:
        x = dt.date.fromisoformat(d)
        return f"{x.month}/{x.day}({WEEKDAY[x.weekday()]})"
    except (TypeError, ValueError):
        return e(d)


def fold(s):
    return "".join(c for c in unicodedata.normalize("NFKD", s) if not unicodedata.combining(c))


# ---------- 인용 형식 ----------

def initials(given):
    """'Angel Tsai-Hsuan' -> 'A. T.-H.', 'P. Y.' -> 'P. Y.'"""
    out = []
    for part in given.split():
        subs = [p for p in part.split("-") if p]
        out.append("-".join(p[0] + "." for p in subs))
    return " ".join(out)


def hangul(s):
    return any("가" <= ch <= "힣" for ch in s)


def korean_name(f, g):
    """한국어 이름은 이니셜로 줄이지 않고 붙여 쓴다: ['홍', '길동'] -> '홍길동'"""
    return hangul(f + g)


def doi_of(it):
    if it.get("doi"):
        return it["doi"]
    if it["cite_as"] == "arxiv" and it.get("arxiv"):
        return f"10.48550/arXiv.{it['arxiv']}"
    return ""


def end_dot(s):
    return s if s.endswith(("?", "!", ".")) else s + "."


def apa(it):
    """APA 7판. 기울임은 <i>로 표시한다."""
    if it.get("org_author"):
        names = it["authors"][0][0] + "."
    elif all(korean_name(f, g) for f, g in it["authors"]):
        names = ", ".join(f + g for f, g in it["authors"])   # 국내 문헌: 홍길동, 김철수 (2026).
    else:
        ns = [f + g if korean_name(f, g) else (f"{f}, {initials(g)}" if g else f) for f, g in it["authors"]]
        if len(ns) == 1:
            names = ns[0]
        elif len(ns) <= 20:
            names = ", ".join(ns[:-1]) + ", & " + ns[-1]
        else:
            names = ", ".join(ns[:19]) + ", . . . " + ns[-1]
    t = it.get("title_sentence") or it["title"]
    c = it["cite_as"]
    if c == "arxiv":
        body = f"<i>{e(t)}</i> (arXiv:{e(it['arxiv'])}). arXiv."
    elif c == "proceedings":
        pages = f" (pp. {e(it['pages'])})" if it.get("pages") else ""
        body = f"{e(end_dot(t))} In <i>{e(it['container'])}</i>{pages}. {e(it['publisher'])}."
    elif c == "journal":
        vol = f", <i>{e(it['volume'])}</i>" if it.get("volume") else ""
        iss = f"({e(it['issue'])})" if it.get("issue") else ""
        pages = f", {e(it['pages'])}" if it.get("pages") else ""
        if it.get("article"):                      # 쪽 대신 논문 번호를 쓰는 학술지: 5, Article 805.
            pages = f", Article {e(it['article'])}"
        # 권·호가 아직 없는 온라인 선공개 논문은 APA 7대로 'Advance online publication'을 붙인다
        online_first = "" if it.get("volume") else " Advance online publication."
        body = f"{e(end_dot(t))} <i>{e(it['container'])}</i>{vol}{iss}{pages}.{online_first}"
    elif c == "report":
        body = f"<i>{e(t)}</i> ({e(it['series'])} No. {e(it['number'])}). {e(it['publisher'])}."
    elif c == "book":
        if it.get("edition"):                      # 판차는 기울임 밖: *제목* (3rd ed.). 출판사.
            body = f"<i>{e(t)}</i> ({e(it['edition'])} ed.). {e(it['publisher'])}."
        else:
            body = f"<i>{e(end_dot(t))}</i> {e(it['publisher'])}."
    elif c == "repository":
        body = f"<i>{e(t)}</i> [Reproducibility package {e(it['number'])}]. {e(it['publisher'])}."
    else:
        body = f"<i>{e(end_dot(t))}</i>"
    doi = doi_of(it)
    link = f"https://doi.org/{doi}" if doi else it.get("url", "")
    return f"{e(names)} ({it['year']}). {body}" + (f" {e(link)}" if link else "")


def bib_key(it, used):
    fam = re.sub(r"[^a-z]", "", fold(it["authors"][0][0]).lower()) or ("kr" if hangul(it["authors"][0][0]) else "anon")
    words = [re.sub(r"[^a-z0-9]", "", fold(w).lower()) for w in it["title"].split()]
    word = next((w for w in words if w and w not in STOP and w != fam), "")
    key = base = f"{fam}{it['year']}{word}"
    n = 0
    while key in used:
        n += 1
        key = base + "abcdefghij"[n]
    used.add(key)
    return key


def tex(s):
    return re.sub(r"([&%#_$])", r"\\\1", str(s))


def bibtex(it, key):
    if it.get("org_author"):
        authors = "{" + tex(it["authors"][0][0]) + "}"
    else:
        authors = " and ".join(f"{tex(f)}, {tex(g)}" if g else tex(f) for f, g in it["authors"])
    f = [("author", authors), ("title", "{" + tex(it["title"]) + "}"), ("year", str(it["year"]))]
    c = it["cite_as"]
    if c == "arxiv":
        typ = "misc"
        f += [("eprint", it["arxiv"]), ("archivePrefix", "arXiv"), ("primaryClass", it.get("arxiv_class", "")),
              ("doi", doi_of(it))]
        if it.get("bib_note"):
            f.append(("note", tex(it["bib_note"])))
    elif c == "proceedings":
        typ = "inproceedings"
        f += [("booktitle", tex(it["container"])), ("pages", it.get("pages", "").replace("–", "--")),
              ("publisher", tex(it["publisher"])), ("doi", it.get("doi", ""))]
    elif c == "journal":
        typ = "article"
        f += [("journal", tex(it["container"])), ("volume", it.get("volume", "")), ("number", it.get("issue", "")),
              ("pages", it.get("pages", "").replace("–", "--")), ("eid", it.get("article", "")), ("doi", it.get("doi", ""))]
    elif c == "report":
        typ = "techreport"
        f += [("institution", tex(it["publisher"])), ("type", tex(it["series"])), ("number", tex(it["number"])),
              ("doi", it.get("doi", ""))]
    elif c == "book":
        typ = "book"
        f += [("edition", tex(it.get("edition", ""))), ("publisher", tex(it["publisher"])),
              ("address", tex(it.get("address", ""))), ("doi", it.get("doi", ""))]
    else:
        typ = "misc"
        f += [("howpublished", tex(it.get("publisher", ""))),
              ("note", tex(f"Reproducibility package {it['number']}" if it.get("number") else ""))]
    f.append(("url", it["url"]))
    width = max(len(k) for k, v in f if v)
    lines = [f"  {k.ljust(width)} = {{{v}}}" for k, v in f if v]
    return f"@{typ}{{{key},\n" + ",\n".join(lines) + "\n}"


def ris(it, shelves):
    out = [f"TY  - {'MGZN' if it['kind'] == 'magazine' else RIS_TYPE.get(it['cite_as'], 'GEN')}"]
    out += [f"AU  - {f}, {g}" if g else f"AU  - {f}" for f, g in it["authors"]]
    out.append(f"TI  - {it['title']}")
    if it.get("container"):
        out.append(f"T2  - {it['container']}")
    elif it.get("series"):
        out.append(f"T2  - {it['series']}")
    out.append(f"PY  - {it['year']}")
    if it.get("date"):
        out.append(f"DA  - {it['date'].replace('-', '/')}")
    if it.get("publisher"):
        out.append(f"PB  - {it['publisher']}")
    elif it["cite_as"] == "arxiv":
        out.append("PB  - arXiv")
    if it.get("pages"):
        sp, _, ep = it["pages"].partition("–")
        out.append(f"SP  - {sp}")
        if ep:
            out.append(f"EP  - {ep}")
    elif it.get("article"):
        out.append(f"SP  - {it['article']}")
    if it.get("number"):
        out.append(f"M1  - {it['number']}")
    if it.get("arxiv"):
        out.append(f"M3  - arXiv:{it['arxiv']}")
    if doi_of(it):
        out.append(f"DO  - {doi_of(it)}")
    out.append(f"UR  - {it['url']}")
    out += [f"KW  - {k}" for k in it.get("keywords", [])]
    out.append(f"N1  - 연구 서고 {it['_call']} · {KINDS.get(it['kind'], it['kind'])} · {shelves[it['shelf']]['name']}")
    out.append("ER  - ")
    return "\n".join(out)


# ---------- 페이지 ----------

def spine(it):
    h = int(hashlib.md5(it["no"].encode()).hexdigest()[:4], 16)
    label = it.get("spine") or it["title"]
    height = 84 + h % 16                                 # 84~99%
    width = (40 if len(label) <= 14 else 56) + h % 5     # 긴 제목은 두 줄로 쓰는 두꺼운 책
    special = it.get("source") == "special"
    aria = f"{it['_call']} {it['title']} ({it['year']}), {KINDS.get(it['kind'], '')}" + (", 특별리서치" if special else "")
    ribbon = '<span class="spine-ribbon" aria-hidden="true"></span>' if special else ""
    return (f'<a class="spine k-{e(it["kind"])}{" special" if special else ""}" href="#no-{e(it["no"])}" data-no="{e(it["no"])}" '
            f'style="--h:{height}%;--w:{width}px" title="{e(it["title"])}" aria-label="{e(aria)}">{ribbon}'
            f'<span class="spine-title">{e(label)}</span>'
            f'<span class="spine-year">{it["year"]}</span>'
            f'<span class="spine-call">{e(it["_call"])}</span></a>')


def byline(it):
    if it.get("org_author"):
        return e(it["authors"][0][0])
    names = [f + g if korean_name(f, g) else f"{g} {f}".strip() for f, g in it["authors"]]
    if len(names) <= 4:
        return e(", ".join(names))
    return e(", ".join(names[:3])) + f" 외 {len(names) - 3}명"


def card(it, items_by_no, shelves, latest, batches):
    no = it["no"]
    kind = it["kind"]
    shelf_codes = [it["shelf"]] + it.get("also", [])
    pops = it.get("population", [])
    special = it.get("source") == "special"
    batch = batches.get(it.get("batch"), {}) if special else {}
    aliases = {"A": "AI 리터러시 AI 윤리 AI 시민성 AI Literacy Ethics Citizenship", "F": "교육 정책 효과 연구 제도 Policy Impact Systems", "G": "AI Impacts 학습 영향 의존", "H": "Responsible AI 거버넌스 아동 안전"}
    shelf_words = " ".join(shelves[c]["name"] + " " + aliases.get(c, "") for c in shelf_codes)
    search = " ".join([shelf_words, it["title"], it["title_ko"], it.get("venue", ""), it.get("design", ""), it["_call"], no,
                       " ".join(f"{g} {f}" for f, g in it["authors"]), " ".join(it.get("keywords", [])),
                       it.get("arxiv", ""), it.get("doi", ""),
                       ("특별리서치 " + batch.get("name", "")) if special else ""]).lower()
    new = '<span class="badge new">신착</span>' if it["added"] == latest else ""
    sr = '<span class="badge special">특별리서치</span>' if special else ""
    acc_batch = f" · {e(batch.get('name', '특별리서치'))}" if special else ""
    also = ""
    if it.get("also"):
        also = '<span class="also">함께 꽂는 서가 ' + " ".join(
            f'<b>{e(c)}</b> {e(shelves[c]["name"])}' for c in it["also"] if c in shelves) + "</span>"
    ids = []
    if it.get("arxiv"):
        ids.append(f"arXiv:{e(it['arxiv'])}" + (f" ({e(it['arxiv_class'])})" if it.get("arxiv_class") else ""))
    if it.get("doi"):
        ids.append(f"DOI {e(it['doi'])}")
    if it.get("number") and it["cite_as"] in ("report", "repository"):
        ids.append(e(it["number"]))
    if it.get("registry"):
        ids.append(e(it["registry"]))
    date_note = f"{e(it.get('date', ''))}"
    if it.get("updated"):
        date_note += f" 공개 · {e(it['updated'])} 수정" + (f"({e(it['version'])})" if it.get("version") else "")
    facts = [("발표", f"{e(it.get('venue', ''))} · {date_note}"),
             ("연구 설계", e(it.get("design", ""))),
             ("대상·표본", e(it.get("sample", ""))),
             ("식별자", " · ".join(ids))]
    facts_html = "".join(f"<div><dt>{k}</dt><dd>{v}</dd></div>" for k, v in facts if v)
    kws = "".join(f"<li>{e(k)}</li>" for k in it.get("keywords", []))

    def ul(xs):
        return "<ul>" + "".join(f"<li>{e(x)}</li>" for x in xs) + "</ul>"

    notes = []
    if it.get("question"):
        notes.append(("연구 질문", f"<p>{e(it['question'])}</p>"))
    if it.get("findings"):
        notes.append(("주요 결과", ul(it["findings"])))
    if it.get("implications"):
        notes.append(("교육적 시사점", ul(it["implications"])))
    if it.get("limits"):
        notes.append(("한계", f"<p>{e(it['limits'])}</p>"))
    if it.get("note"):
        notes.append(("메모", f"<p>{e(it['note'])}</p>"))
    if not it.get("org_author"):
        notes.append(("저자 전체", "<p>" + e("; ".join(f"{f}, {g}" if g else f for f, g in it["authors"])) + "</p>"))
    rel = [items_by_no[n] for n in it.get("see_also", []) if n in items_by_no]
    if rel:
        notes.append(("함께 볼 자료", "<ul class='rel'>" + "".join(
            f'<li><a href="#no-{e(r["no"])}"><b>{e(r["_call"])}</b> {e(r["title_ko"])}</a></li>' for r in rel) + "</ul>"))
    curator = f" · 정리 {e(it['curator'])}" if it.get("curator") else ""
    notes.append(("확인 기준", f"<p>{e(it.get('basis', ''))} · 서지 확인 {e(it.get('verified', ''))}{curator}</p>"))
    notes_html = "".join(f'<div class="note"><h4>{k}</h4>{v}</div>' for k, v in notes)

    doi = doi_of(it)
    links = [f'<a class="btn" href="{e(it["url"])}" target="_blank" rel="noopener">원문 ↗</a>']
    if doi:
        links.append(f'<a class="btn" href="https://doi.org/{e(doi)}" target="_blank" rel="noopener">DOI ↗</a>')
    for x in it.get("extra_links", []):
        links.append(f'<a class="btn" href="{e(x["url"])}" target="_blank" rel="noopener">{e(x["label"])} ↗</a>')
    links.append(f'<button class="btn btn-cart" type="button" data-cart="{e(no)}" aria-pressed="false">담기 +</button>')

    return f"""
      <article class="card{' special' if special else ''}" id="no-{e(no)}" data-no="{e(no)}" data-call="{e(it['_call'])}" data-kind="{e(kind)}"
        data-shelves="{e(' '.join(shelf_codes))}" data-pop="{e(' '.join(pops))}" data-added="{e(it['added'])}"
        data-source="{'special' if special else 'routine'}"
        data-date="{e(it.get('date', ''))}" data-author="{e(fold(it['authors'][0][0]).lower())}" data-text="{e(search)}">
        <header class="card-head">
          <span class="call">{e(it['_call'])}</span>
          <span class="acc">등록 No.{e(no)} · {md(it['added'])} 입고{acc_batch}</span>
        </header>
        <div class="badges"><span class="badge k-{e(kind)}">{e(KINDS.get(kind, kind))}</span>{basis_badge(it.get('basis'))}{sr}{new}{"".join(f'<span class="badge pop">{e(p)}</span>' for p in pops)}</div>
        <h3 class="card-title" lang="en">{e(it['title'])}</h3>
        <p class="title-ko">{e(it['title_ko'])}</p>
        <p class="byline"><span lang="en">{byline(it)}</span> <span class="year">({it['year']})</span></p>
        <dl class="facts">{facts_html}</dl>
        <ul class="kw" aria-label="키워드">{kws}</ul>
        {also}
        <details class="notes">
          <summary>열람 노트</summary>
          <div class="note-body">{notes_html}</div>
        </details>
        <details class="cite">
          <summary>인용</summary>
          <div class="cite-body">
            <div class="cite-row">
              <div class="cite-label">APA 7</div>
              <p class="apa" id="apa-{e(no)}" lang="en">{apa(it)}</p>
              <button class="btn btn-copy" type="button" data-copy="apa-{e(no)}">복사</button>
            </div>
            <div class="cite-row">
              <div class="cite-label">BibTeX</div>
              <pre class="bib" id="bib-{e(no)}">{e(it['_bib'])}</pre>
              <button class="btn btn-copy" type="button" data-copy="bib-{e(no)}">복사</button>
            </div>
          </div>
        </details>
        <div class="card-links">{"".join(links)}</div>
      </article>"""


SCRIPT = r"""
<script>
(function () {
  'use strict';
  var cards = Array.prototype.slice.call(document.querySelectorAll('.card'));
  var groups = Array.prototype.slice.call(document.querySelectorAll('.shelf-group'));
  var flat = document.getElementById('flat'), flatList = flat.querySelector('.cards'),
      flatTitle = document.getElementById('flat-title'), flatCount = document.getElementById('flat-count');
  cards.forEach(function (c) { c.homeList = c.parentNode; });   // 서가별 보기로 돌아갈 자리
  var SORT_NAMES = { added: '최근 입고순', date: '발표 최신순', author: '제1저자순' };
  var q = document.getElementById('q'), qq = document.getElementById('qq'), fs = document.getElementById('f-shelf'),
      fk = document.getElementById('f-kind'), fp = document.getElementById('f-pop'),
      fsrc = document.getElementById('f-src'),   // 특별리서치가 있을 때만 있다
      sortEl = document.getElementById('sort'), count = document.getElementById('count'),
      none = document.getElementById('none'), reset = document.getElementById('reset');
  var selects = [fs, fk, fp, fsrc].filter(Boolean);
  function clearFilters() { q.value = ''; qq.value = ''; selects.forEach(function (s) { s.value = ''; }); }

  function norm(s) { return (s || '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').trim(); }
  cards.forEach(function (c) { c.dataset.norm = norm(c.dataset.text); });

  var sorters = {
    call: function (a, b) { return a.dataset.call.localeCompare(b.dataset.call); },
    added: function (a, b) { return b.dataset.added.localeCompare(a.dataset.added) || b.dataset.no.localeCompare(a.dataset.no); },
    date: function (a, b) { return b.dataset.date.localeCompare(a.dataset.date) || a.dataset.call.localeCompare(b.dataset.call); },
    author: function (a, b) { return a.dataset.author.localeCompare(b.dataset.author) || b.dataset.date.localeCompare(a.dataset.date); }
  };

  function apply() {
    var words = norm(q.value).split(/\s+/).filter(Boolean), n = 0;
    cards.forEach(function (c) {
      var ok = words.every(function (w) { return c.dataset.norm.indexOf(w) >= 0; }) &&
        (!fs.value || (' ' + c.dataset.shelves + ' ').indexOf(' ' + fs.value + ' ') >= 0) &&
        (!fk.value || c.dataset.kind === fk.value) &&
        (!fp.value || (' ' + c.dataset.pop + ' ').indexOf(' ' + fp.value + ' ') >= 0) &&
        (!fsrc || !fsrc.value || c.dataset.source === fsrc.value);
      c.hidden = !ok;
      if (ok) n += 1;
    });
    var filtered = words.length || selects.some(function (s) { return s.value; });
    var mode = SORT_NAMES[sortEl.value] ? sortEl.value : 'call';
    var by = sorters[mode];
    if (mode === 'call') {
      // 서가별 보기: 카드를 제 서가로 돌려놓고, 걸러졌으면 '표시/소장' 편수를 함께 보여 준다
      flat.hidden = true;
      groups.forEach(function (g) {
        var list = g.querySelector('.cards');
        var mine = cards.filter(function (c) { return c.homeList === list; }).sort(by);
        mine.forEach(function (c) { list.appendChild(c); });
        var shown = mine.filter(function (c) { return !c.hidden; }).length;
        g.hidden = shown === 0;
        g.querySelector('.group-count').textContent =
          filtered && shown !== mine.length ? '표시 ' + shown + '편 · 소장 ' + mine.length + '편' : mine.length + '편';
      });
    } else {
      // 전체 정렬: 서가를 풀고 한 목록으로 보여 준다
      groups.forEach(function (g) { g.hidden = true; });
      cards.slice().sort(by).forEach(function (c) { flatList.appendChild(c); });
      flat.hidden = n === 0;
      flatTitle.textContent = '전체 목록 · ' + SORT_NAMES[mode];
      flatCount.textContent = filtered ? '표시 ' + n + '편 · 소장 ' + cards.length + '편' : cards.length + '편';
    }
    count.textContent = filtered ? n + '편 표시 · 소장 ' + cards.length + '편' : '소장 ' + cards.length + '편 전체';
    none.hidden = n > 0;
    reset.hidden = !filtered;
  }
  [q, sortEl].concat(selects).forEach(function (el) { el.addEventListener('input', apply); });
  q.addEventListener('input', function () { qq.value = q.value; });
  reset.addEventListener('click', function () { clearFilters(); apply(); q.focus(); });

  // 머리의 '자료 바로 찾기': 목록 검색창과 같은 값을 쓰고, Enter를 누르면 목록으로 내려간다
  qq.addEventListener('input', function () { q.value = qq.value; apply(); });
  document.getElementById('quick-find').addEventListener('submit', function (ev) {
    ev.preventDefault();
    q.value = qq.value; apply();
    document.getElementById('catalog').scrollIntoView();
  });

  // 책등이나 '함께 볼 자료'를 눌렀는데 검색으로 숨겨진 카드면 검색을 풀고 보여 준다
  document.addEventListener('click', function (ev) {
    var a = ev.target.closest('a[href^="#no-"]');
    if (!a) return;
    var target = document.getElementById(a.getAttribute('href').slice(1));
    if (target && target.hidden) { clearFilters(); apply(); }
  });

  // 복사: APA는 기울임까지 함께(서식 붙여넣기), 안 되면 글자만
  function flash(btn, text) {
    var old = btn.dataset.label || btn.textContent;
    btn.dataset.label = old; btn.textContent = text; btn.classList.add('done');
    setTimeout(function () { btn.textContent = old; btn.classList.remove('done'); }, 1400);
  }
  function fallback(text, done) {
    var ta = document.createElement('textarea');
    ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); done(); } catch (err) { /* 복사 불가 */ }
    document.body.removeChild(ta);
  }
  function copy(htmlText, plain, btn) {
    var done = function () { flash(btn, '복사됨'); };
    try {
      if (htmlText && navigator.clipboard && window.ClipboardItem) {
        navigator.clipboard.write([new ClipboardItem({
          'text/html': new Blob([htmlText], { type: 'text/html' }),
          'text/plain': new Blob([plain], { type: 'text/plain' })
        })]).then(done, function () { fallback(plain, done); });
        return;
      }
      if (navigator.clipboard) { navigator.clipboard.writeText(plain).then(done, function () { fallback(plain, done); }); return; }
    } catch (err) { /* 아래로 */ }
    fallback(plain, done);
  }
  document.querySelectorAll('[data-copy]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var el = document.getElementById(btn.dataset.copy);
      var isApa = el.classList.contains('apa');
      copy(isApa ? el.innerHTML : '', el.textContent, btn);
    });
  });

  // 담기: 여러 편을 골라 한 번에 인용 복사
  var KEY = 'research-library-cart', cart = [];
  try { cart = JSON.parse(localStorage.getItem(KEY) || '[]').filter(function (no) { return document.getElementById('no-' + no); }); } catch (err) { cart = []; }
  var tray = document.getElementById('tray'), trayCount = document.getElementById('tray-count');
  function save() { try { localStorage.setItem(KEY, JSON.stringify(cart)); } catch (err) { /* 저장 불가 */ } }
  function sync() {
    document.querySelectorAll('[data-cart]').forEach(function (b) {
      var on = cart.indexOf(b.dataset.cart) >= 0;
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
      b.textContent = on ? '담음 ✓' : '담기 +';
    });
    trayCount.textContent = cart.length;
    tray.hidden = cart.length === 0;
    document.body.classList.toggle('has-tray', cart.length > 0);
  }
  document.querySelectorAll('[data-cart]').forEach(function (b) {
    b.addEventListener('click', function () {
      var i = cart.indexOf(b.dataset.cart);
      if (i >= 0) cart.splice(i, 1); else cart.push(b.dataset.cart);
      save(); sync();
    });
  });
  function picked(prefix) {
    return cart.slice().sort().map(function (no) { return document.getElementById(prefix + no); }).filter(Boolean);
  }
  document.getElementById('tray-apa').addEventListener('click', function () {
    var els = picked('apa-');
    var sorted = els.slice().sort(function (a, b) { return a.textContent.localeCompare(b.textContent); });
    copy(sorted.map(function (el) { return '<p>' + el.innerHTML + '</p>'; }).join(''),
         sorted.map(function (el) { return el.textContent; }).join('\n\n'), this);
  });
  document.getElementById('tray-bib').addEventListener('click', function () {
    copy('', picked('bib-').map(function (el) { return el.textContent; }).join('\n\n'), this);
  });
  document.getElementById('tray-clear').addEventListener('click', function () { cart = []; save(); sync(); });

  sync();
  apply();
})();
</script>"""


def build():
    data = json.loads(DATA.read_text(encoding="utf-8-sig"))   # 편집기가 BOM을 붙여 저장해도 읽는다
    shelves = {s["code"]: s for s in data["shelves"]}
    batches = {b["id"]: b for b in data.get("batches", [])}   # 특별리서치 회차
    items = data["items"]
    errors = []
    seen = set()
    nos = [it.get("no") for it in items]
    for n in sorted({n for n in nos if nos.count(n) > 1}):
        errors.append(f"No.{n}: 등록번호가 겹칩니다")
    for it in items:
        miss = [k for k in REQUIRED if not it.get(k)]
        if miss:
            errors.append(f"No.{it.get('no', '?')}: 빠진 항목 {', '.join(miss)}")
        if it.get("source") == "special" and it.get("batch") not in batches:
            errors.append(f"No.{it.get('no', '?')}: 특별리서치 회차(batch) {it.get('batch')}가 batches에 없습니다")
        for c in it.get("also", []):
            if c not in shelves:
                errors.append(f"No.{it.get('no', '?')}: also에 없는 서가 {c}")
        if it.get("shelf") not in shelves:
            errors.append(f"No.{it.get('no', '?')}: 없는 서가 {it.get('shelf')}")
        if it.get("kind") not in KINDS:
            errors.append(f"No.{it.get('no', '?')}: 알 수 없는 출판 유형(kind) {it.get('kind')}")
        ident = it.get("doi") or it.get("arxiv") or it.get("url")
        if ident in seen:
            errors.append(f"No.{it.get('no', '?')}: 이미 있는 자료({ident})")
        seen.add(ident)
    if errors:
        sys.exit("연구서고.json 확인 필요:\n  " + "\n  ".join(errors))

    items.sort(key=lambda it: it["no"])
    seq = {}
    for it in items:                                 # 청구기호 = 서가 기호 + 그 서가에 들어온 순서
        seq[it["shelf"]] = seq.get(it["shelf"], 0) + 1
        it["_call"] = f"{it['shelf']}-{seq[it['shelf']]:02d}"
    used = set()
    for it in items:
        it["_key"] = bib_key(it, used)
        it["_bib"] = bibtex(it, it["_key"])
    by_no = {it["no"]: it for it in items}
    latest = max(it["added"] for it in items)
    news = [it for it in items if it["added"] == latest]
    peer = sum(1 for it in items if it["kind"] in PEER)
    specials = [it for it in items if it.get("source") == "special"]
    # 아직 자료가 없는 서가는 안내도·목록·필터에 보이지 않는다
    used_shelves = [s for s in data["shelves"] if any(it["shelf"] == s["code"] for it in items)]
    filter_shelves = [s for s in data["shelves"]
                      if any(s["code"] == it["shelf"] or s["code"] in it.get("also", []) for it in items)]

    # 서가 안내도
    stacks = []
    for s in used_shelves:
        books = [it for it in items if it["shelf"] == s["code"]]
        stacks.append(f"""
      <div class="shelf">
        <div class="plate"><span class="plate-code">{e(s['code'])}</span><span class="plate-name">{e(s['name'])}</span><span class="plate-count">{len(books)}편</span></div>
        <div class="books">{"".join(spine(b) for b in books)}<span class="bookend" aria-hidden="true"></span></div>
        <div class="board" aria-hidden="true"></div>
      </div>""")

    # 목록 카드(서가별)
    groups = []
    for s in used_shelves:
        books = [it for it in items if it["shelf"] == s["code"]]
        groups.append(f"""
    <section class="shelf-group" aria-labelledby="shelf-{e(s['code'])}">
      <div class="group-head">
        <span class="group-code">{e(s['code'])}</span>
        <div>
          <h2 id="shelf-{e(s['code'])}">{e(s['name'])}</h2>
          <p class="group-desc">{e(s['desc'])}</p>
        </div>
        <span class="group-count">{len(books)}편</span>
      </div>
      <div class="cards">{"".join(card(b, by_no, shelves, latest, batches) for b in books)}
      </div>
    </section>""")

    kinds_present = [k for k in KINDS if any(it["kind"] == k for it in items)]
    pops_present = [p for p in POP_ORDER if any(p in it.get("population", []) for it in items)]
    legend = "".join(f'<li><span class="swatch k-{k}"></span>{KINDS[k]}</li>' for k in kinds_present)
    if specials:
        legend += '<li class="legend-sr"><span class="swatch ribbon"></span>책갈피: 특별리서치</li>'
    src_filter = ('<label><span class="sr">수집 경로</span><select id="f-src"><option value="">모든 수집 경로</option>'
                  '<option value="routine">정기 다이제스트</option><option value="special">특별리서치</option></select></label>'
                  if specials else "")
    sr_stat = f'<div><dt>특별리서치</dt><dd>{len(specials)}<small>편</small></dd></div>' if specials else ""
    batch_lines = "".join(
        f'<li><b>{e(b["name"])}</b> · {e(b.get("date", ""))} · {e(b.get("topic", ""))} · {e(b.get("method", ""))}</li>'
        for b in data.get("batches", []) if any(it.get("batch") == b["id"] for it in specials))
    batch_note = (f'<div class="batches"><h3>수집 경로</h3><p>정기 다이제스트는 모루 루틴이 월·수·금에 고른 연구입니다. '
                  f'특별리서치는 주제를 정해 따로 조사한 자료로, 책등에 책갈피를 달아 구분합니다.</p><ul>{batch_lines}</ul></div>'
                  if batch_lines else "")
    newin = "".join(f'<li><a href="#no-{e(it["no"])}"><b>{e(it["_call"])}</b> {e(it["title_ko"])}</a></li>' for it in news)
    opt = lambda v, t: f'<option value="{e(v)}">{e(t)}</option>'
    now = dt.datetime.now()
    years = sorted({it["year"] for it in items})
    year_span = f"{years[0]}–{years[-1]}" if len(years) > 1 else str(years[0])

    body = f"""
  <header class="masthead">
    <div>
      <div class="kicker">AI 교육 연구 서고 · Research Stacks</div>
      <h1>연구 서고</h1>
      <p class="lede">AI 교육 논문·학회 발표·정책 보고서와, 연구의 바탕이 되는 이론·방법론 문헌을 서가별로 모아 둡니다. 논문과 학술지 원고에 인용할 수 있도록 서지 정보를 확인하고, 연구 설계와 출판 유형·심사 상태, 인용 형식을 함께 적었습니다.</p>
      <form class="quick-find" id="quick-find" role="search" action="#catalog">
        <label for="qq">자료 바로 찾기</label>
        <div class="qf-row">
          <input type="search" id="qq" placeholder="제목·저자·키워드·arXiv 번호" autocomplete="off">
          <button class="btn" type="submit">목록에서 보기 ↓</button>
        </div>
      </form>
    </div>
    <dl class="stats">
      <div><dt>소장</dt><dd>{len(items)}<small>편</small></dd></div>
      <div><dt>서가</dt><dd>{len(used_shelves)}<small>곳</small></dd></div>
      <div><dt>동료심사</dt><dd>{peer}<small>편</small></dd></div>{sr_stat}
      <div><dt>최근 입고</dt><dd class="date">{md(latest)}</dd></div>
    </dl>
  </header>

  <section class="desk" aria-label="열람 안내">
    <div class="guide">
      <div><h3>청구기호</h3><p>서가 기호와 그 서가에 들어온 순서입니다(예: C-02). 등록번호(No.)는 서고 전체에 들어온 순서입니다.</p>
        <h3 class="mt">확인 범위</h3><p>카드의 <span class="badge basis partial">초록 기준</span>은 초록만, <span class="badge basis partial">본문 일부 확인</span>은 본문을 일부만, <span class="badge basis full">원문 확인</span>은 본문 전체를 읽고 정리했다는 뜻입니다.</p></div>
      <div><h3>출판 유형·심사 상태</h3><ul class="legend">{legend}</ul></div>
      <div><h3>인용</h3><p>카드의 <b>인용</b>에서 APA 7·BibTeX를 복사합니다. 여러 편은 <b>담기</b>로 모아 한 번에 복사하거나 전체 목록을 내려받습니다.</p>
        <p class="dl"><a class="btn" href="library.bib" download>BibTeX 전체 (.bib)</a> <a class="btn" href="library.ris" download>RIS 전체 (.ris)</a></p></div>
    </div>
    <details class="newin">
      <summary><h3>신착 자료 <span>{md(latest)} 입고 {len(news)}편</span></h3></summary>
      <ul>{newin}</ul>
    </details>
  </section>

  <section class="stacks" aria-labelledby="stacks-title">
    <div class="section-head">
      <h2 id="stacks-title">서가 안내도</h2>
      <p>책등을 누르면 목록 카드로 갑니다. 색은 출판 유형·심사 상태입니다.</p>
    </div>
    <div class="shelves">{"".join(stacks)}
    </div>
  </section>

  <section class="catalog" id="catalog" aria-labelledby="catalog-title">
    <div class="section-head">
      <h2 id="catalog-title">목록</h2>
      <p>발표 {year_span} · 서지 확인 {md(data.get('updated', latest))}</p>
    </div>
    <div class="toolbar" role="search">
      <label class="search"><span class="sr">자료 찾기</span>
        <input type="search" id="q" placeholder="제목·저자·키워드·arXiv 번호로 찾기" autocomplete="off"></label>
      <label><span class="sr">서가</span><select id="f-shelf"><option value="">모든 서가</option>{"".join(opt(s['code'], s['code'] + ' ' + s['name']) for s in filter_shelves)}</select></label>
      <label><span class="sr">출판 유형·심사 상태</span><select id="f-kind"><option value="">모든 출판 유형</option>{"".join(opt(k, KINDS[k]) for k in kinds_present)}</select></label>
      <label><span class="sr">대상</span><select id="f-pop"><option value="">모든 대상</option>{"".join(opt(p, p) for p in pops_present)}</select></label>
      {src_filter}
      <label><span class="sr">정렬</span><select id="sort">
        <option value="call">서가별 · 청구기호순</option><option value="date">전체 · 발표 최신순</option>
        <option value="added">전체 · 최근 입고순</option><option value="author">전체 · 제1저자순</option></select></label>
      <span class="count" id="count" aria-live="polite">소장 {len(items)}편 전체</span>
      <button class="btn" type="button" id="reset" hidden>조건 지우기</button>
    </div>
    <p class="none" id="none" hidden>조건에 맞는 자료가 없습니다.</p>
    <section class="flat-list" id="flat" hidden aria-labelledby="flat-title">
      <div class="group-head">
        <div>
          <h2 id="flat-title">전체 목록</h2>
          <p class="group-desc">서가 구분 없이 한 줄로 정렬했습니다. 청구기호의 앞 글자가 서가입니다.</p>
        </div>
        <span class="group-count" id="flat-count"></span>
      </div>
      <div class="cards"></div>
    </section>
    {"".join(groups)}
  </section>

  <footer>
    {batch_note}
    <aside class="ai-notice" aria-label="AI 작성 자료 안내">
      <h3>AI 작성 자료 안내</h3>
      <p>이 서고의 요약·번역·분류는 AI(ChatGPT, Gemini, Claude 등)가 작성한 자료입니다. 서지 정보는 원문 페이지와 대조했지만 틀린 곳이 있을 수 있고, 요약은 대부분 초록만 읽고 썼습니다. <b>올바른 인용을 위해 반드시 원문을 직접 확인하고, 이 페이지가 아니라 원문을 인용해 주세요.</b></p>
    </aside>
    <p>서지 정보(저자·발표처·날짜·DOI)는 arXiv, Crossref, 발행처 페이지에서 확인했고 카드마다 확인일을 적었습니다.</p>
    <p>모루 루틴이 연구 다이제스트(월·수·금)를 마친 뒤 새 자료를 서고에 들입니다 · {now.year}-{now.month:02d}-{now.day:02d} {now.hour:02d}:{now.minute:02d} 갱신</p>
  </footer>

<div class="tray" id="tray" hidden role="region" aria-label="담은 자료">
  <span>담은 자료 <b id="tray-count">0</b>편</span>
  <button class="btn" type="button" id="tray-apa">APA 복사</button>
  <button class="btn" type="button" id="tray-bib">BibTeX 복사</button>
  <button class="btn ghost" type="button" id="tray-clear">비우기</button>
</div>
"""
    desc = f"AI 교육 연구 {len(items)}편을 서가별로 정리한 팀 연구 서고. 인용 형식(APA 7·BibTeX) 포함."
    page = f"""<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<meta name="description" content="{e(desc)}">
<meta property="og:title" content="연구 서고 · AI 교육 연구">
<meta property="og:description" content="{e(desc)}">
<title>연구 서고 · AI 교육 연구</title>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Noto+Serif+KR:wght@500;600;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="assets/library.css">
<style>.library-site-nav{{max-width:1240px;margin:0 auto 18px;display:flex;gap:10px 20px;flex-wrap:wrap;font-size:14px;font-weight:700}}.library-site-nav a{{min-height:32px;display:inline-flex;align-items:center}}</style>
</head>
<body>
<nav class="library-site-nav" aria-label="사이트 이동"><a href="../#/">Seung AI Labs · 포털</a><a href="../briefing/">브리핑</a><a href="../briefing/archive/">지난 브리핑</a></nav>
<div class="sheet">
{body}
</div>
{SCRIPT}
</body>
</html>
"""
    SITE.mkdir(parents=True, exist_ok=True)
    (SITE / "index.html").write_text(page, encoding="utf-8")
    def search_record(it):
        authors_text = "; ".join((g + " " + f).strip() for f, g in it["authors"])
        return {"id": it["no"], "code": it["_call"], "call": it["_call"], "title": it["title"], "titleKo": it["title_ko"], "authors": authors_text,
                "year": it["year"], "kind": it["kind"], "href": "./library/index.html#no-" + it["no"], "keywords": it.get("keywords", []), "shelves": [it["shelf"]] + it.get("also", [])}
    summary = {"schemaVersion": 1, "total": len(items), "reviewed": peer, "special": len(specials), "updated": data.get("updated", latest),
               "shelves": [{"id": shelf["code"], "label": shelf["name"], "count": sum(it["shelf"] == shelf["code"] for it in items)} for shelf in data["shelves"]],
               "recent": [search_record(it) for it in sorted(items, key=lambda it: (it["added"], it["no"]), reverse=True)[:5]],
               "items": [search_record(it) for it in items]}
    (SITE / "summary.json").write_text(json.dumps(summary, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    header = (f"% AI 교육 연구 서고 — {len(items)}편, {now.date().isoformat()} 갱신\n"
              "% 이 목록은 AI(ChatGPT, Gemini, Claude 등)의 도움으로 정리했습니다. 인용 전 반드시 원문을 확인하세요.\n\n")
    (SITE / "library.bib").write_text(header + "\n\n".join(it["_bib"] for it in items) + "\n", encoding="utf-8")
    (SITE / "library.ris").write_text("\n\n".join(ris(it, shelves) for it in items) + "\n", encoding="utf-8")
    if not (SITE / "assets" / "library.css").exists():
        print("주의: research-library/assets/library.css 가 없습니다.")
    print(f"연구 서고 갱신: {SITE / 'index.html'} (소장 {len(items)}편, 신착 {len(news)}편)")


if __name__ == "__main__":
    build()
