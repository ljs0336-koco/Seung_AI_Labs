import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Portal.css';

export default function Portal() {
  const navigate = useNavigate();

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
          <aside className="portal-magazine-clip-wrap" aria-label="매거진 탭">
            <div className="magazine-brass-clip" aria-hidden="true"></div>
            <div
              className="magazine-clip-card"
              onClick={() => handleCardClick('에이전틱 AI 인사이트 덱', './deck/index.html', true)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCardClick('에이전틱 AI 인사이트 덱', './deck/index.html', true);
              }}
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
            </div>
          </aside>
          <aside className="portal-magazine-clip-wrap" aria-label="AI·교육 브리핑">
            <div className="magazine-brass-clip briefing-paper-clip" aria-hidden="true"></div>
            <a className="magazine-clip-card briefing-clip-card" href="./briefing/index.html">
              <div className="magazine-clip-header">
                <span className="magazine-badge-pill briefing-badge-pill">모루의 브리핑</span>
                <time className="briefing-edition" dateTime="2026-10-21">2026.10.21</time>
              </div>
              <h2 className="magazine-clip-title">AI·교육 브리핑</h2>
              <p className="magazine-clip-desc">
                교육 사업 기회와 AI 뉴스, 오늘 눈여겨볼 소식을 한눈에
              </p>
              <div className="magazine-clip-footer">
                <span className="magazine-read-btn briefing-read-btn">브리핑 읽기 →</span>
              </div>
            </a>
          </aside>
          </div>
        </div>
      </header>

      {/* Main Educational Pillars: 2 Primary Columns */}
      <main className="portal-main-content">
        <div className="portal-cards-2col-grid">
          {/* Card 1: AI Literacy Lab */}
          <article className="portal-hub-card literacy-hub-card">
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
                초등 학습자의 편향 인식, 생성형 AI 환각 팩트체크, 역할 분담 및 안전성 검증을 직접 시뮬레이션하는 인터랙티브 활동 공간입니다.
              </p>

              <div className="card-feature-list">
                <div className="feature-item">
                  <span className="feature-icon">⚖️</span>
                  <div>
                    <strong>공정성 실험실</strong>
                    <p>학습 데이터 편향과 공정한 추천 알고리즘 발견</p>
                  </div>
                </div>
                <div className="feature-item">
                  <span className="feature-icon">🔍</span>
                  <div>
                    <strong>팩트체크 실험실</strong>
                    <p>AI 답변의 교차검증과 출처 신뢰도 평가 훈련</p>
                  </div>
                </div>
                <div className="feature-item">
                  <span className="feature-icon">🤝</span>
                  <div>
                    <strong>역할과 역량 탐구</strong>
                    <p>인간과 인공지능의 협업 가치 및 책임 윤리</p>
                  </div>
                </div>
                <div className="feature-item">
                  <span className="feature-icon">🛡️</span>
                  <div>
                    <strong>안전성 검증</strong>
                    <p>할루시네이션 방지와 안전한 프롬프트 규칙 수립</p>
                  </div>
                </div>
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
          </article>

          {/* Card 2: Edutech Physical AI Hub */}
          <article className="portal-hub-card edutech-hub-card">
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
                <div className="feature-item">
                  <span className="feature-icon">🐕</span>
                  <div>
                    <strong>로보독 강화학습 시뮬레이터</strong>
                    <p>보상 함수와 신경망 파라미터 튜닝 실습</p>
                  </div>
                </div>
                <div className="feature-item">
                  <span className="feature-icon">📊</span>
                  <div>
                    <strong>통학 데이터 탐구 웹앱 (v2)</strong>
                    <p>우리 학교 학생들의 실제 이동 경로와 통계 분석</p>
                  </div>
                </div>
                <div className="feature-item">
                  <span className="feature-icon">💬</span>
                  <div>
                    <strong>질문 전후 비교 도구</strong>
                    <p>모호한 프롬프트 vs 구조화된 질문 결과 대조</p>
                  </div>
                </div>
                <div className="feature-item">
                  <span className="feature-icon">💡</span>
                  <div>
                    <strong>교수학습 지도안 & 실습키트</strong>
                    <p>차시별 수업 지도 가이드라인 및 워크시트 완비</p>
                  </div>
                </div>
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
          </article>
        </div>
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
            <a href="./privacy-guidelines.html" className="footer-admin-link">개인정보 게시 원칙</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
