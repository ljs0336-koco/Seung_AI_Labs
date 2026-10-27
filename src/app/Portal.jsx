import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import useCatalog, { useJsonResource } from '../hooks/useCatalog';
import './Portal.css';

const LABS = [
  { href: '#/fairness', title: '공정한 AI 실험실', description: '데이터와 기준에 따라 달라지는 AI 추천 비교', icon: '⚖️' },
  { href: '#/verification', title: '진실·미디어 검증소', description: 'AI 답변과 합성 미디어의 출처·제작 이력 검증', icon: '🔍' },
  { href: '#/role', title: 'AI에게 무엇을 맡길까?', description: '자동화·AI의 도움·사람의 결정 구별', icon: '🤝' },
  { href: '#/agent', title: 'AI가 대신 움직인다면?', description: '행동 전 확인, 이상 행동 멈춤과 복구', icon: '🛡️' },
];
const LECTURES = [
  { href: './hub/index.html#jeju', title: '제주대 예비교원 특강', description: '예비교원 대상 AI 교육 특강 안내와 참고 자료', icon: '🎓' },
  { href: './hub/index.html#hs', title: '고교 로보독 특강', description: '강화학습과 피지컬 AI 수업 안내', icon: '🐕' },
  { href: './hub/apps/robotdog_rl/index.html', title: '멍멍 RL Playground', description: 'Q-learning·SARSA로 보는 로보독 길찾기', icon: '🧭' },
];
const PRIMARY_HREFS = new Set(['#/literacy', './hub/index.html', './briefing/index.html', './deck/index.html']);

export default function Portal() {
  const navigate = useNavigate();
  const { catalog, loading } = useCatalog();
  const { data: latest } = useJsonResource('./briefing/latest.json');
  const extras = catalog.items.filter(item => !item.parent && ['portal', 'both'].includes(item.placement) && !['locked', 'orphan'].includes(item.status) && !PRIMARY_HREFS.has(item.href));
  const features = entries => entries.map(entry => ({ ...entry, ...catalog.items.find(item => item.href === entry.href) }));
  const isPortalVisible = id => loading || ['portal', 'both'].includes(catalog.items.find(item => item.id === id)?.placement);

  useEffect(() => {
    document.title = "Seung AI Labs · 에듀테크 통합 포털";

  }, []);

  const handleCardClick = (title, targetPath, isExternal = false) => {
    if (isExternal) {
      window.location.href = targetPath;
    } else {
      navigate(targetPath);
    }
  };

  return (
    <div className="portal-container">

      {/* Main Hero Section */}
      <header className="portal-hero">
        <div className="portal-hero-layout">
          {/* Left Column: Title & Intro */}
          <div className="portal-hero-text">
            <h1 className="portal-main-title">
              Seung AI Labs
            </h1>
            <p className="portal-sub-lead">
              초등 인공지능 리터러시 실험부터 피지컬 컴퓨팅·로보틱스 융합교육까지,<br />
              수업 현장에서 즉시 활용 가능한 실습형 교육 웹앱 생태계입니다.
            </p>
          </div>

          {/* Publications: magazine and latest public briefing */}
          <div className="portal-publications">
          {isPortalVisible('deck') && <aside className="portal-magazine-clip-wrap" aria-label="매거진 탭">
            <div className="magazine-brass-clip" aria-hidden="true"></div>
            <a
              className="magazine-clip-card"
              href="./deck/index.html"
            >
              <div className="magazine-clip-header">
                <span className="magazine-badge-pill">📎 매거진 Vol.01</span>
              </div>
              <h2 className="magazine-clip-title">The Agentic Shift</h2>
              <p className="magazine-clip-desc">
                도구에서 협력자로 — 에이전틱 AI 전환기의 조직과 교육 현장 설계 인사이트
              </p>
              <div className="magazine-clip-footer">
                <span className="magazine-read-btn">
                  매거진 읽기 →
                </span>
              </div>
            </a>
          </aside>}
          {isPortalVisible('briefing') && <aside className="portal-magazine-clip-wrap" aria-label="AI·교육 브리핑">
            <div className="magazine-brass-clip briefing-paper-clip" aria-hidden="true"></div>
            <a className="magazine-clip-card briefing-clip-card" href="./briefing/index.html">
              <div className="magazine-clip-header">
                <span className="magazine-badge-pill briefing-badge-pill">모루의 브리핑</span>
                {typeof latest?.date === 'string' ? <time className="briefing-edition" dateTime={latest.date}>{latest.date.replaceAll('-', '.')}</time> : <span className="briefing-edition">최신 브리핑</span>}
              </div>
              <h2 className="magazine-clip-title">AI·교육 브리핑</h2>
              <p className="magazine-clip-desc">
                교육 사업 기회와 AI 뉴스, 오늘 눈여겨볼 소식을 한눈에
              </p>
              <div className="magazine-clip-footer">
                <span className="magazine-read-btn briefing-read-btn">브리핑 읽기 →</span>
              </div>
            </a>
          </aside>}
          </div>
        </div>
      </header>

      {/* Main Educational Pillars: 2 Primary Columns */}
      <main className="portal-main-content">
        <div className="portal-cards-2col-grid">
          {/* Card 1: AI Literacy Lab */}
          {isPortalVisible('literacy') && <article className="portal-hub-card literacy-hub-card">
            <div className="card-top-accent literacy-accent"></div>
            <div className="card-body">
              <div className="card-header-row">
                <div className="card-badge literacy-badge">
                  <span>MODULE 01 · 리터러시 실습 연구소</span>
                </div>
                <span className="card-status-pill">4개 인터랙티브 모듈</span>
              </div>

              <h2 className="card-headline">
                초등 AI 리터러시 탐험 연구소
              </h2>
              <p className="card-summary">
                AI 추천의 공정성, 답변과 미디어 검증, 사람과 AI의 역할, 에이전트의 행동을 직접 탐구하는 인터랙티브 활동 공간입니다.
              </p>

              <div className="card-feature-list">
                {features(LABS).map(feature => <a className="feature-item" href={feature.href} key={feature.href} style={{ color: 'inherit', textDecoration: 'none' }}>
                  <span className="feature-icon">{feature.icon}</span><div><strong>{feature.title}</strong><p>{feature.description}</p></div>
                </a>)}
              </div>

              <div className="card-action-box">
                <button
                  type="button"
                  className="card-cta-button literacy-cta"
                  onClick={() => handleCardClick('초등 AI 리터러시 탐험 연구소', '/literacy', false)}
                >
                  리터러시 연구소 입장하기 →
                </button>
              </div>
            </div>
          </article>}

          {/* Card 2: Edutech Physical AI Hub */}
          {isPortalVisible('hub') && <article className="portal-hub-card edutech-hub-card">
            <div className="card-top-accent edutech-accent"></div>
            <div className="card-body">
              <div className="card-header-row">
                <div className="card-badge edutech-badge">
                  <span>MODULE 02 · 융합 교육 허브</span>
                </div>
                <span className="card-status-pill" style={{ color: '#047857', borderColor: '#a7f3d0', background: '#ecfdf5', fontWeight: 600 }}>
                  🌱 공개 특강 허브
                </span>
              </div>

              <h2 className="card-headline">
                AI 교육 특강 허브
              </h2>
              <p className="card-summary">
                고등학생 로보독 특강과 제주대학교 예비교원 특강의 안내와 참고 자료
              </p>

              <div className="card-feature-list">
                {features(LECTURES).map(feature => <a className="feature-item" href={feature.href} key={feature.href} style={{ color: 'inherit', textDecoration: 'none' }}>
                  <span className="feature-icon">{feature.icon}</span><div><strong>{feature.title}</strong><p>{feature.description}</p></div>
                </a>)}
              </div>

              <div className="card-action-box">
                <button
                  type="button"
                  className="card-cta-button edutech-cta"
                  onClick={() => handleCardClick('AI 교육 특강 허브', './hub/index.html', true)}
                >
                  특강 허브 열기 →
                </button>
              </div>
            </div>
          </article>}
        </div>
        {!!extras.length && <section aria-labelledby="portal-more" style={{ marginTop: '28px' }}>
          <h2 id="portal-more" style={{ fontSize: '21px', marginBottom: '14px' }}>더 둘러보기</h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px' }}>{extras.map(item => <a key={item.id} className="card" href={item.href} style={{ display: 'block', flex: '1 1 240px', maxWidth: '520px', color: 'inherit', margin: 0 }}><strong>{item.title}</strong>{item.description && <p style={{ margin: '8px 0 0', fontSize: '14px' }}>{item.description}</p>}<span style={{ display: 'block', marginTop: '12px', color: 'var(--color-primary)' }}>열기 →</span></a>)}</div>
        </section>}
      </main>

      


      {/* Portal Footer */}
      <footer className="portal-footer">
        <div className="portal-footer-content">
          <div className="footer-left">
            <span className="footer-logo">Seung AI Labs</span>
            <span className="footer-divider">·</span>
            <span className="footer-copyright">
              © 2026 에듀테크 융합교육 연구실. All rights reserved.
            </span>
          </div>

          <div className="footer-right">
            <Link to="/base" className="footer-admin-link">나만의 기지</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
