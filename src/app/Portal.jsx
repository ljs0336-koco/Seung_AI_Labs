import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import useCatalog, { useJsonResource } from '../hooks/useCatalog';
import OrbitScene from './OrbitScene';
import './Portal.css';

const LABS = [
  ['#/fairness', '공정한 AI 실험실'], ['#/verification', '진실·미디어 검증소'],
  ['#/role', 'AI에게 무엇을 맡길까?'], ['#/agent', 'AI가 대신 움직인다면?'],
];
const LECTURES = [
  ['./hub/index.html#jeju', '제주대 예비교원 특강'],
  ['./hub/index.html#hs', '고교 로보독 특강'],
  ['./hub/apps/robotdog_rl/index.html', '멍멍 RL Playground'],
];
const PUBLICATIONS = new Set(['briefing', 'deck']);
const ORBIT_ORDER = ['literacy', 'hub', 'playground'];
const ORBIT_LOOKS = {
  literacy: { kind: 'literacy', label: '배우는 곳', color: '#bfb7d5' },
  hub: { kind: 'lecture', label: '가르치는 곳', color: '#c99d76' },
  playground: { kind: 'playground', label: 'AI 활용 산출물', color: '#86b9cd' },
};
const visible = item => ['portal', 'both'].includes(item.placement) && !['locked', 'orphan'].includes(item.status);

export default function Portal() {
  const { catalog, error } = useCatalog();
  const { data: latest } = useJsonResource('./briefing/latest.json');
  const entrances = catalog.items.filter(item => !item.parent && visible(item));
  const worlds = entrances.filter(item => !PUBLICATIONS.has(item.id)).sort((a,b) => {
    const order = id => ORBIT_ORDER.includes(id) ? ORBIT_ORDER.indexOf(id) : ORBIT_ORDER.length;
    return order(a.id) - order(b.id);
  }).map(item => ({
    ...item, ...(ORBIT_LOOKS[item.id] || { kind: 'artifact', label: '새로운 실험', color: '#c8bfad' }),
  }));
  const publication = id => entrances.find(item => item.id === id);
  const magazine = publication('deck');
  const briefing = publication('briefing');
  const literacy = entrances.find(item => item.id === 'literacy');
  const hub = entrances.find(item => item.id === 'hub');
  const library = entrances.find(item => item.id === 'library');
  function showPublications() {
    const reduced = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const section = document.getElementById('portal-publications');
    section?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
    section?.focus({ preventScroll: true });
  }

  useEffect(() => { document.title = 'Seung AI Labs · 수업과 실험의 작은 우주'; }, []);

  return <div className="portal-container">
    <div className="portal-sheet">
      <header className="portal-masthead">
        <div>
          <p className="portal-kicker">EDUCATION · RESEARCH · MAKING</p>
          <h1 className="portal-main-title">Seung AI Labs</h1>
        </div>
        <nav className="portal-navigation" aria-label="자료와 기록">
          {library && <a href={library.href}>연구 서고 ↗</a>}
          <Link to="/base">기지로 가기 ↗</Link>
        </nav>
      </header>
      <div className="portal-intro-line"><p>읽고, 실험하고, 수업에 연결하는 작업실.</p><span>AN EXPANDING UNIVERSE</span></div>
      <main>
        <section className="portal-atlas" aria-labelledby="portal-atlas-title">
          <div className="portal-atlas-copy">
            <span className="portal-section-no">01 / EXPLORE</span>
            <h2 id="portal-atlas-title">수업과 실험의<br />작은 우주.</h2>
            <p>AI를 이해하는 실습, 함께 만드는 수업,<br className="portal-desktop-break" /> 그리고 AI로 만들어 본 것들.</p>
            <p className="portal-atlas-note">각 구를 누르면 그 공간으로 이어집니다.</p>
            <div className="portal-atlas-count"><b>{String(worlds.length).padStart(2, '0')}</b><span>개의 공간이<br />하나의 우주 안에</span></div>
            {(magazine || briefing) && <button type="button" className="portal-text-link" onClick={showPublications}>매거진과 브리핑 읽기 ↓</button>}
          </div>
          <div className="portal-atlas-map"><OrbitScene items={worlds} brand="Seung" /></div>
        </section>
        {error && <p className="portal-load-note" role="status">자료 목록을 불러오지 못해 기본 입구를 표시합니다.</p>}
        {(magazine || briefing) && <section className="portal-publications" id="portal-publications" tabIndex={-1} aria-labelledby="portal-publications-title">
          <header className="portal-section-heading"><span className="portal-section-no">02 / PUBLICATIONS</span><h2 id="portal-publications-title">읽는 시간</h2><p>매거진과 오늘의 기록</p></header>
          <div className="portal-publication-grid">
            {magazine && <article className="portal-publication portal-magazine">
              <div className="portal-publication-meta"><span>MAGAZINE / VOL.01</span><span>SEUNG AI LABS</span></div>
              <h3><a href={magazine.href}>{magazine.title}</a></h3>
              <p>{magazine.description || '에이전틱 AI 전환기의 조직과 교육'}</p>
              <a className="portal-text-link" href={magazine.href}>매거진 읽기 ↗</a>
              <span className="portal-publication-folio" aria-hidden="true">M.</span>
            </article>}
            {briefing && <article className="portal-publication portal-briefing">
              <div className="portal-publication-meta"><span>DAILY BRIEFING</span>{typeof latest?.date === 'string' ? <time dateTime={latest.date}>{latest.date.replaceAll('-', '.')}</time> : <span>최신호</span>}</div>
              <h3><a href={briefing.href}>{briefing.title}</a></h3>
              <p>{briefing.description || '교육 사업 기회와 AI 이슈·뉴스'}</p>
              <a className="portal-text-link" href={briefing.href}>브리핑 읽기 ↗</a>
              <span className="portal-publication-folio" aria-hidden="true">B.</span>
            </article>}
          </div>
        </section>}
        {(literacy || hub) && <details className="portal-activity-index">
          <summary>실습·특강 바로가기 <span>INDEX ↗</span></summary>
          <div className="portal-activity-columns">
            {literacy && <div><h3>AI 리터러시 연구소</h3><ul>{LABS.map(([href, title]) => <li key={href}><a href={href}>{title}<span aria-hidden="true">↗</span></a></li>)}</ul></div>}
            {hub && <div><h3>AI 교육 특강 허브</h3><ul>{LECTURES.map(([href, title]) => <li key={href}><a href={href}>{title}<span aria-hidden="true">↗</span></a></li>)}</ul></div>}
          </div>
        </details>}
      </main>
      <footer className="portal-footer"><p>Seung AI Labs <span>·</span> 에듀테크 융합교육 연구실</p><Link to="/base">나만의 기지 ↗</Link></footer>
    </div>
  </div>;
}
