import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import useCatalog, { publicUrl, safeContentHref, useJsonResource } from '../hooks/useCatalog';
import './BasePage.css';

const SECTIONS = [
  ['today', '오늘'], ['library', '서고'], ['code', 'C.O.D.E'], ['lecture', '특강'],
  ['showcase', '쇼케이스'], ['personal', '개인'], ['archive', '보관함'],
];
const SECTION_NAMES = Object.fromEntries(SECTIONS);
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]', '::1']);
const PUBLICATION_LABELS = {
  journal: '동료심사 저널', conference: '동료심사 학회', workshop: '학회 워크숍',
  'working-paper': '워킹페이퍼(심사 전)', preprint: '프리프린트(심사 전)',
  report: '정책 보고서', book: '단행본·장', magazine: '실무 잡지',
};

function text(value) {
  return Array.isArray(value) ? value.map(text).join(' ') : value == null ? '' : typeof value === 'object' ? Object.values(value).map(text).join(' ') : String(value);
}

function searchable(value) { return text(value).normalize('NFKC').toLocaleLowerCase(); }
function shortDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}/.test(value || '')) return value || '';
  const [, month, day] = value.slice(0, 10).split('-');
  return `${Number(month)}.${Number(day)}`;
}
function deadlineLabel(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return '';
  const today = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Seoul' }).format(new Date());
  const days = Math.round((Date.parse(`${value}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86400000);
  return days < 0 ? '마감' : days === 0 ? 'D-day' : `D-${days}`;
}
function childrenOf(item, items) {
  const explicit = Array.isArray(item.children) ? item.children.map(child => typeof child === 'string' ? items.find(candidate => candidate.id === child) : child).filter(Boolean) : [];
  return [...new Map([...explicit, ...items.filter(child => child.parent === item.id)].filter(child => safeContentHref(child.href)).map(child => [child.id || child.href, child])).values()];
}

function CopyLink({ title, href, copy, compact = false }) {
  return <button className="act copy" type="button" onClick={() => copy(title, href)} aria-label={`${title} 링크 복사`}>{compact ? '복사' : '링크 복사'}</button>;
}

function Item({ item, items, copy }) {
  const children = childrenOf(item, items);
  const onPortal = ['portal', 'both'].includes(item.placement);
  const className = `item${onPortal ? ' is-portal' : ''}${item.status === 'candidate' ? ' is-cand' : ''}`;
  return <li className={className} data-id={item.id}>
    <div className="item-main">
      <div className="item-top">
        <a className="item-title" href={item.href}>{item.title}</a>
        {onPortal && <span className="badge b-portal">포털</span>}
        {!onPortal && item.status === 'candidate' && <span className="badge b-cand">포털 후보</span>}
        {item.status === 'locked' && <span className="badge b-lock">잠김</span>}
        {item.status === 'orphan' && <span className="badge b-orphan">보관 자료</span>}
      </div>
      {item.description && <p className="item-desc">{item.description}</p>}
    </div>
    <div className="acts">
      <a className="act open" href={item.href}>열기 ↗</a>
      <CopyLink title={item.title} href={item.href} copy={copy} />
      {children.map(child => <span className="child-action" key={child.id || child.href}>
        <a className="act kid" href={child.href}>{child.title}</a>
        <CopyLink title={child.title} href={child.href} copy={copy} compact />
      </span>)}
    </div>
  </li>;
}

function Panel({ section, number, title, meta, children, className = '' }) {
  return <section className={`panel p-${section === 'showcase' ? 'show' : section} ${className}`} id={`base-${section}`} aria-labelledby={`base-h-${section}`}>
    <header className="panel-head"><span className="sn">{number}</span><h2 id={`base-h-${section}`}>{title}</h2>{meta && <span className="head-meta">{meta}</span>}</header>
    {children}
  </section>;
}

function CatalogPanel({ section, number, title, items, allItems, copy }) {
  return <Panel section={section} number={number} title={title} meta={`${items.length}개`}>
    {items.length ? <ul className="items">{items.map(item => <Item key={item.id} item={item} items={allItems} copy={copy} />)}</ul> : <p className="empty-state">이 구역에 등록된 자료가 없습니다.</p>}
  </Panel>;
}

function TodayPanel({ latest, loading, error, copy }) {
  const headlines = Array.isArray(latest?.headlines) ? latest.headlines.filter(item => item.title).slice(0, 3) : [];
  const editions = Array.isArray(latest?.editions) ? latest.editions.slice(0, 5) : [];
  const bids = (Array.isArray(latest?.bids) ? latest.bids : []).filter(item => deadlineLabel(item.deadline) !== '마감');
  const dueSoon = bids.filter(item => {
    const label = deadlineLabel(item.deadline);
    return label === 'D-day' || /^D-\d+$/.test(label) && Number(label.slice(2)) <= 14;
  }).sort((a, b) => (a.deadline || '').localeCompare(b.deadline || '')).slice(0, 3);
  const lead = headlines[0];
  const articleHref = item => safeContentHref(item.href || item.url) || './briefing/index.html';
  return <Panel section="today" number="01" title="오늘 · AI·교육 브리핑" meta={latest?.date ? `${shortDate(latest.date)}${latest.collectedAt ? ` · ${latest.collectedAt}` : ''}` : '평일 갱신'}>
    {headlines.length ? <div className="today-grid">
      <div>
        <article className="lead">
          <div className="kick">{(lead.issue || lead.field || lead.tag) && <span className="tag">{[lead.issue, lead.field].filter(Boolean).join(' | ') || lead.tag}</span>}{lead.source}</div>
          <h3><a href={articleHref(lead)}>{lead.title}</a></h3>
          <p>{lead.summary}</p>
          <div className="acts headline-actions"><a className="act open" href={articleHref(lead)}>기사 읽기 ↗</a>{lead.id && <button className="act copy" type="button" data-share-id={lead.id} aria-label={`${lead.title} 공유`}>기사 공유</button>}</div>
        </article>
        <ul className="news">{headlines.slice(1).map((item, index) => <li key={item.id || index}>
          <span className="tag">{item.issue || item.field || item.tag || '뉴스'}</span><a href={articleHref(item)}>{item.title}</a>
          <small>{[item.source, shortDate(item.date)].filter(Boolean).join(' · ')}</small>
          {item.id && <div className="news-copy"><button className="act copy" type="button" data-share-id={item.id} aria-label={`${item.title} 공유`}>기사 공유</button></div>}
        </li>)}</ul>
      </div>
      <aside className="biz" aria-label="사업 제안 기회">
        <div className="biz-head"><b>사업 제안 기회</b><span>접수 중 {bids.length}건</span></div>
        {dueSoon.length ? <ul className="near">{dueSoon.map((bid, index) => <li key={bid.id || index}>
          <span className={`dday ${deadlineLabel(bid.deadline) === 'D-day' ? 'hot' : 'warm'}`}>{deadlineLabel(bid.deadline)}</span>
          <a href={safeContentHref(bid.url || bid.href) || './briefing/index.html'}>{bid.title}</a>
          <small>{[bid.org, `${shortDate(bid.deadline)} 마감`].filter(Boolean).join(' · ')}</small>
        </li>)}</ul> : <p className="empty-state">14일 안에 마감하는 공고가 없습니다.</p>}
      </aside>
    </div> : <p className="empty-state">{loading ? '최신 브리핑을 불러오는 중입니다.' : '최신 소식은 브리핑에서 확인하세요.'}</p>}
    {error && <p className="load-note">요약을 불러오지 못했습니다. 브리핑 링크는 계속 열 수 있습니다.</p>}
    <footer className="panel-foot">
      <a className="btn primary" href="./briefing/index.html">브리핑 열기 ↗</a><CopyLink title="AI·교육 브리핑" href="./briefing/index.html" copy={copy} />
      <a className="btn" href="./briefing/archive/index.html">지난 브리핑 전체</a>
      {!!editions.length && <div className="editions"><span>최근 {editions.length}호</span>{editions.map((edition, index) => <a className={`ed${index === 0 ? ' ed-today' : ''}`} key={edition.date || index} href={safeContentHref(edition.href || edition.url) || './briefing/archive/index.html'}>{shortDate(edition.date)}</a>)}</div>}
    </footer>
  </Panel>;
}

function LibraryPanel({ summary, loading, error, copy }) {
  const shelves = Array.isArray(summary?.shelves) ? summary.shelves : [];
  const recent = Array.isArray(summary?.recent) ? summary.recent : [];
  return <Panel section="library" number="02" title="연구 서고" meta={summary?.updatedAt ? `최근 입고 ${shortDate(summary.updatedAt)}` : '연구·인용 자료'}>
    {summary && <div className="lib-grid">
      <div>
        <dl className="stats">{[['소장', summary.total], ['동료심사', summary.reviewed], ['특별리서치', summary.special]].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{Number.isFinite(Number(value)) ? Number(value) : '—'}<small>편</small></dd></div>)}</dl>
        {!!shelves.length && <><h3 className="sub">서가 <span className="n">{shelves.length}곳</span></h3><ul className="shelves">{shelves.map(shelf => {
          const id = String(shelf.id || '').replace(/^shelf-/, '');
          return <li key={id}><a href={`./library/index.html#shelf-${encodeURIComponent(id)}`}><b>{id}</b><span>{shelf.label || shelf.name}</span><em>{shelf.count}</em></a></li>;
        })}</ul></>}
      </div>
      {!!recent.length && <div><h3 className="sub">신착 자료 <span className="n">{recent.length}편</span></h3><ol className="newin">{recent.map((paper, index) => {
        const href = safeContentHref(paper.href) || './library/index.html';
        const title = paper.titleKo || paper.title;
        return <li key={paper.id || index}><a className="paper-main" href={href}><span className="call">{paper.call || paper.code || '연구'}</span><span className="nt">{title}</span><span className="nm">{[text(paper.authors), paper.year, paper.kind ? PUBLICATION_LABELS[paper.kind] || '연구 자료' : ''].filter(Boolean).join(' · ')}</span></a><div className="acts"><CopyLink title={title} href={href} copy={copy} /></div></li>;
      })}</ol></div>}
    </div>}
    {!summary && <p className="empty-state">{loading ? '서고 현황을 불러오는 중입니다.' : '연구 서고에서 자료 검색과 인용 복사를 이용하세요.'}</p>}
    {error && <p className="load-note">서고 요약을 불러오지 못했습니다. 전체 서고는 아래에서 열 수 있습니다.</p>}
    <footer className="panel-foot"><a className="btn primary" href="./library/index.html">서고 열기 ↗</a><CopyLink title="연구 서고" href="./library/index.html" copy={copy} /><a className="btn" href="./library/library.bib" download>.bib</a><a className="btn" href="./library/library.ris" download>.ris</a></footer>
  </Panel>;
}

export default function BasePage() {
  const { catalog, error: catalogError } = useCatalog();
  const briefing = useJsonResource('./briefing/latest.json');
  const library = useJsonResource('./library/summary.json');
  const [query, setQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('today');
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [notice, setNotice] = useState('');
  const findRef = useRef(null);
  const inputRef = useRef(null);
  const items = catalog.items;
  const mainItems = items.filter(item => !item.parent && item.placement !== 'archive' && item.section !== 'archive');
  const archive = items.filter(item => !item.parent && (item.placement === 'archive' || item.section === 'archive'));
  const bySection = section => mainItems.filter(item => item.section === section);
  const local = LOCAL_HOSTS.has(globalThis.location?.hostname);
  const localDate = new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', month: 'numeric', day: 'numeric', weekday: 'short' }).format(new Date());
  const indexedPapers = useMemo(() => Array.isArray(library.data?.items) ? library.data.items : Array.isArray(library.data?.papers) ? library.data.papers : library.data?.recent || [], [library.data]);
  const results = useMemo(() => {
    const words = searchable(query).trim().split(/\s+/).filter(Boolean);
    if (!words.length) return { materials: [], papers: [] };
    const matches = value => words.every(word => searchable(value).includes(word));
    const materials = [...new Map(items.flatMap(item => [item, ...childrenOf(item, items).map(child => ({ ...child, section: child.section || item.section }))]).map(item => [item.id || item.href, item])).values()];
    return {
      materials: materials.filter(item => matches([item.title, item.description, SECTION_NAMES[item.section], item.keywords])),
      papers: indexedPapers.filter(paper => matches([paper.title, paper.titleKo, paper.authors, paper.call, paper.code, paper.id, paper.keywords])),
    };
  }, [items, indexedPapers, query]);
  const totalResults = results.materials.length + results.papers.length;

  useEffect(() => {
    const previous = document.title;
    document.title = '나만의 기지 · Seung AI Labs';
    function keyboard(event) {
      const isTyping = /^(INPUT|TEXTAREA|SELECT)$/.test(event.target?.tagName) || event.target?.isContentEditable;
      if (event.key === '/' && !isTyping && !event.metaKey && !event.ctrlKey && !event.altKey) { event.preventDefault(); inputRef.current?.focus(); }
      if (event.key === 'Escape') setSearchOpen(false);
    }
    function outside(event) { if (!findRef.current?.contains(event.target)) setSearchOpen(false); }
    document.addEventListener('keydown', keyboard);
    document.addEventListener('pointerdown', outside);
    return () => { document.title = previous; document.removeEventListener('keydown', keyboard); document.removeEventListener('pointerdown', outside); };
  }, []);
  useEffect(() => {
    if (!notice) return undefined;
    const timer = setTimeout(() => setNotice(''), 6000);
    return () => clearTimeout(timer);
  }, [notice]);

  async function copy(title, href) {
    const url = publicUrl(href, catalog.siteUrl);
    if (!url) { setNotice('공유 주소를 확인할 수 없습니다.'); return; }
    try {
      await navigator.clipboard.writeText(url);
      setNotice(`${title} 공유 링크를 복사했습니다.`);
    } catch { setNotice(`주소를 직접 복사해 주세요: ${url}`); }
  }
  async function copyPersonalLinks() {
    const list = bySection('personal').flatMap(item => [item, ...childrenOf(item, items)]);
    const unique = [...new Map(list.map(item => [item.href, item])).values()];
    const links = unique.map(item => `${item.title}: ${publicUrl(item.href, catalog.siteUrl)}`).join('\n');
    try { await navigator.clipboard.writeText(links); setNotice(`개인 자료 ${unique.length}개 공유 링크를 복사했습니다.`); }
    catch { setNotice('복사 권한이 없습니다. 각 자료의 링크 복사 버튼을 이용해 주세요.'); }
  }
  function goToSection(section) {
    setActiveSection(section);
    if (section === 'archive') setArchiveOpen(true);
    const motion = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    document.getElementById(`base-${section}`)?.scrollIntoView?.({ behavior: motion ? 'auto' : 'smooth', block: 'start' });
  }

  return <div className="base-page">
    <header className="top"><div className="wrap">
      <div className="top-row">
        <Link className="brand" to="/" title="통합 포털로"><span className="brand-mark" aria-hidden="true">S</span><div><h1>나만의 기지</h1><small>Seung AI Labs</small></div></Link>
        <span className="date">{localDate}</span>
        <div className="find" role="search" ref={findRef}>
          <label className="sr" htmlFor="base-find">자료·논문·저자 찾기</label>
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="8.5" cy="8.5" r="6" /><path d="m13 13 4.5 4.5" strokeLinecap="round" /></svg>
          <input ref={inputRef} id="base-find" type="search" placeholder="자료·논문·저자 찾기" autoComplete="off" value={query} onChange={event => { setQuery(event.target.value); setSearchOpen(true); }} onFocus={() => setSearchOpen(true)} aria-controls="base-results" aria-expanded={searchOpen && !!query.trim()} />
          <kbd aria-hidden="true">/</kbd>
          <div className="results" id="base-results" hidden={!searchOpen || !query.trim()}>
            <p className="search-count" role="status">{totalResults}건 검색됨</p>
            {!!results.materials.length && <><h3>자료 · {results.materials.length}</h3><ul>{results.materials.map(item => <li key={item.id || item.href}><a href={item.href}><span className="r-k">{SECTION_NAMES[item.section] || '자료'}</span><span className="r-t">{item.title}</span><span className="r-s">{item.description}</span></a></li>)}</ul></>}
            {!!results.papers.length && <><h3>논문 · {results.papers.length}</h3><ul>{results.papers.map((paper, index) => <li key={paper.id || index}><a href={safeContentHref(paper.href) || './library/index.html'}><span className="r-k call-k">{paper.call || paper.code || '연구'}</span><span className="r-t">{paper.titleKo || paper.title}</span><span className="r-s">{[text(paper.authors), paper.year].filter(Boolean).join(' · ')}</span></a></li>)}</ul></>}
            {!totalResults && <p className="none">검색어에 맞는 자료가 없습니다.</p>}
            <a className="all" href="./library/index.html">연구 서고에서 전체 자료 보기 ↗</a>
          </div>
        </div>
        <Link className="portal-link" to="/">포털 ↗</Link>
        {local && <a className="portal-link" href="http://127.0.0.1:8788/__manage/">자료 편집</a>}
      </div>
      <div className="tally" aria-label="자료 배치 현황">
        <span className="t"><i className="dot portal" aria-hidden="true" />포털 노출<b>{mainItems.filter(item => ['both', 'portal'].includes(item.placement)).length}</b></span>
        <span className="t"><i className="dot base" aria-hidden="true" />기지 자료<b>{mainItems.filter(item => item.placement === 'base').length}</b></span>
        <span className="t"><i className="dot cand" aria-hidden="true" />포털 후보<b>{mainItems.filter(item => item.status === 'candidate').length}</b></span>
        <span className="t"><i className="dot arch" aria-hidden="true" />보관<b>{archive.length}</b></span>
      </div>
      {catalogError && <p className="load-note" role="status">자료 목록을 불러오지 못해 기본 링크를 표시합니다.</p>}
    </div></header>
    <nav className="chipbar" aria-label="구역 바로가기"><div className="wrap chips">{SECTIONS.map(([id, label]) => <button className="chip" key={id} type="button" aria-current={activeSection === id ? 'true' : undefined} onClick={() => goToSection(id)}>{label}{id === 'archive' && <span className="n">{archive.length}</span>}</button>)}</div></nav>
    <main className="wrap"><div className="board">
      <div className="col col-main">
        <TodayPanel latest={briefing.data} loading={briefing.loading} error={briefing.error} copy={copy} />
        <CatalogPanel section="code" number="03" title="C.O.D.E 본선 멘토링" items={bySection('code')} allItems={items} copy={copy} />
        <CatalogPanel section="showcase" number="05" title="공개 쇼케이스" items={bySection('showcase')} allItems={items} copy={copy} />
      </div>
      <div className="col col-side">
        <LibraryPanel summary={library.data} loading={library.loading} error={library.error} copy={copy} />
        <CatalogPanel section="lecture" number="04" title="특강" items={bySection('lecture')} allItems={items} copy={copy} />
        <Panel section="personal" number="06" title="개인" meta={`${bySection('personal').length}개`}>
          <ul className="items">{bySection('personal').map(item => <Item key={item.id} item={item} items={items} copy={copy} />)}</ul>
          {!!bySection('personal').length && <div className="panel-foot"><button className="btn" type="button" onClick={copyPersonalLinks}>전체 공유 링크 한 번에 복사</button></div>}
          {!bySection('personal').length && <p className="empty-state">등록된 개인 자료가 없습니다.</p>}
        </Panel>
      </div>
      <details className="panel archive" id="base-archive" open={archiveOpen} onToggle={event => setArchiveOpen(event.currentTarget.open)}>
        <summary><span className="tw" aria-hidden="true">▶</span><h2>보관함</h2><span className="badge b-orphan">{archive.length}</span><span className="head-meta">지난 자료와 보관 중인 앱</span></summary>
        <ul className="items">{archive.map(item => <Item key={item.id} item={item} items={items} copy={copy} />)}</ul>
        {!archive.length && <p className="empty-state">보관 중인 자료가 없습니다.</p>}
      </details>
    </div><footer className="foot"><span>Seung AI Labs · 읽고, 찾고, 수업에 연결하는 작업대</span><Link to="/">통합 포털로 돌아가기 ↗</Link></footer></main>
    <div className="copy-status" role="status" aria-live="polite">{notice}</div>
  </div>;
}
