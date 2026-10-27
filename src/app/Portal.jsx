import React, { useEffect } from 'react';
import useCatalog, { safeContentHref, useJsonResource } from '../hooks/useCatalog';
import OrbitScene from './OrbitScene';
import PortalQr from './PortalQr';
import './Portal.css';

const LABS = [
  ['#/fairness', '공정한 AI 실험실'], ['#/verification', '진실·미디어 검증소'],
  ['#/role', 'AI에게 무엇을 맡길까?'], ['#/agent', 'AI가 대신 움직인다면?'],
];
const LECTURES = [
  ['./hub/index.html#snu', '서울대 AI 융합교육 연수'],
  ['./hub/index.html#jeju', '제주대 예비교원 특강'],
  ['./hub/index.html#hs', '고교 로보독 특강'],
];
const PUBLICATIONS = new Set(['briefing', 'deck']);
const ORBIT_ORDER = ['literacy', 'hub', 'playground', 'padlet-ai-training'];
const ORBIT_LOOKS = {
  literacy: { kind: 'literacy', label: '배우는 곳', color: '#7d756e' },
  hub: { kind: 'lecture', label: '가르치는 곳', color: '#a2724e' },
  playground: { kind: 'playground', label: 'AI 활용 산출물', color: '#74858e' },
  'padlet-ai-training': { kind: 'padlet', label: '연수 공유 자료', color: '#81759b' },
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
    ...item, ...(ORBIT_LOOKS[item.id] || { kind: 'artifact', label: '새로운 실험', color: '#8b7d68' }),
  }));
  const publication = id => entrances.find(item => item.id === id);
  const magazine = publication('deck');
  const magazineEdition = typeof magazine?.edition === 'string' ? magazine.edition.trim() : '';
  const magazineHistory = (Array.isArray(magazine?.children) ? magazine.children : [])
    .map(child => typeof child === 'string' ? catalog.items.find(item => item.id === child) : child)
    .filter(child => child && typeof child.title === 'string' && safeContentHref(child.href))
    .map(child => ({ ...child, href: safeContentHref(child.href) }));
  const briefing = publication('briefing');
  const literacy = entrances.find(item => item.id === 'literacy');
  const hub = entrances.find(item => item.id === 'hub');
  const library = entrances.find(item => item.id === 'library');

  useEffect(() => { document.title = 'Seung AI Labs · 수업과 실험의 작은 우주'; }, []);

  return <div className="portal-container">
    <div className="portal-sheet">
      <header className="portal-masthead">
        <div>
          <p className="portal-kicker">EDUCATION · RESEARCH · MAKING</p>
          <div className="portal-title-row"><h1 className="portal-main-title">Seung AI Labs</h1><PortalQr /></div>
        </div>
        {library && <nav className="portal-navigation" aria-label="자료와 기록"><a href={library.href}>연구 서고 ↗</a></nav>}
      </header>
      <div className="portal-intro-line"><p>읽고, 실험하고, 수업에 연결하는 작업실.</p><span>AN EXPANDING UNIVERSE</span></div>
      <main>
        {(magazine || briefing) && <section className="portal-publications" id="portal-publications" aria-labelledby="portal-publications-title">
          <h2 className="portal-sr" id="portal-publications-title">매거진과 AI 교육 브리핑</h2>
          <div className="portal-publication-grid">
            {magazine && <article className="portal-publication portal-magazine">
              <div className="portal-publication-copy">
                <div className="portal-publication-meta">
                  <span className="portal-magazine-edition">MAGAZINE{magazineEdition ? ` / ${magazineEdition}` : ''}</span>
                  {!!magazineHistory.length && <nav className="portal-magazine-history" aria-label="매거진 지난호"><span>지난호</span>{magazineHistory.map(child => <a key={child.id || child.href} href={child.href} title={child.title}>{child.title}</a>)}</nav>}
                </div>
                <h3><a href={magazine.href}>{magazine.title}</a></h3>
                <p>{magazine.description || '에이전틱 AI 전환기의 조직과 교육'}</p>
              </div>
              <a className="portal-text-link" href={magazine.href}>매거진 읽기 ↗</a>
            </article>}
            {briefing && <article className="portal-publication portal-briefing">
              <div className="portal-publication-copy">
                <div className="portal-publication-meta"><span>DAILY BRIEFING</span>{typeof latest?.date === 'string' ? <time dateTime={latest.date}>{latest.date.replaceAll('-', '.')}</time> : <span>최신호</span>}</div>
                <h3><a href={briefing.href}>{briefing.title}</a></h3>
                <p>{briefing.description || '교육 사업 기회와 AI 이슈·뉴스'}</p>
              </div>
              <a className="portal-text-link" href={briefing.href}>브리핑 읽기 ↗</a>
            </article>}
          </div>
        </section>}
        <section className="portal-atlas" aria-labelledby="portal-atlas-title">
          <header className="portal-atlas-copy">
            <div className="portal-atlas-heading"><span className="portal-section-no">EXPLORE</span><h2 id="portal-atlas-title">수업과 실험의 작은 우주</h2></div>
            <p>각 구를 누르면 그 공간으로 이어집니다.</p>
          </header>
          <div className="portal-atlas-map"><OrbitScene items={worlds} brand="Seung" /></div>
        </section>
        {error && <p className="portal-load-note" role="status">자료 목록을 불러오지 못해 기본 입구를 표시합니다.</p>}
        {(literacy || hub) && <details className="portal-activity-index">
          <summary>실습·특강 바로가기 <span>INDEX ↗</span></summary>
          <div className="portal-activity-columns">
            {literacy && <div><h3>AI 리터러시 연구소</h3><ul>{LABS.map(([href, title]) => <li key={href}><a href={href}>{title}<span aria-hidden="true">↗</span></a></li>)}</ul></div>}
            {hub && <div><h3>AI 교육 특강 허브</h3><ul>{LECTURES.map(([href, title]) => <li key={href}><a href={href}>{title}<span aria-hidden="true">↗</span></a></li>)}</ul></div>}
          </div>
        </details>}
      </main>
      <footer className="portal-footer"><p>Seung AI Labs <span>·</span> 에듀테크 융합교육 연구실</p></footer>
    </div>
  </div>;
}
