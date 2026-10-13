import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { securityService } from '../utils/securityService';
import ContentLockModal from './ContentLockModal';
import './Portal.css';

export default function Portal() {
  const navigate = useNavigate();
  const [isLocked, setIsLocked] = useState(securityService.isContentLocked());
  const [modalTarget, setModalTarget] = useState(null);

  useEffect(() => {
    document.title = "Seung AI Labs · 에듀테크 통합 포털";

    const handleConfigChange = () => {
      setIsLocked(securityService.isContentLocked());
    };
    window.addEventListener('seung_security_config_changed', handleConfigChange);
    securityService.syncRemoteConfig().then(() => {
      setIsLocked(securityService.isContentLocked());
    });
    return () => {
      window.removeEventListener('seung_security_config_changed', handleConfigChange);
    };
  }, []);

  const handleCardClick = (title, targetPath, isExternal = false) => {
    // 허브는 공개 페이지이며, 에듀테크 특강 자료 연결
    const requiresPasscode = securityService.isContentLocked();

    if (requiresPasscode && !securityService.isContentAuthed()) {
      setModalTarget({
        title,
        onSuccess: () => {
          setModalTarget(null);
          if (isExternal) {
            window.location.href = targetPath;
          } else {
            navigate(targetPath);
          }
        }
      });
      return;
    }

    if (isExternal) {
      window.location.href = targetPath;
    } else {
      navigate(targetPath);
    }
  };

  return (
    <div className="portal-container">
      {/* Content Lock Modal */}
      <ContentLockModal
        isOpen={Boolean(modalTarget)}
        contentTitle={modalTarget ? modalTarget.title : ''}
        onClose={() => setModalTarget(null)}
        onSuccess={modalTarget ? modalTarget.onSuccess : () => {}}
      />

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

          {/* Right Column: Serialized Magazine Tab Clip */}
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

      {/* C.O.D.E 2026 Open Labs & Mentoring Apps Section (Open Access) */}
      <section className="portal-open-labs-section">
        <div className="open-labs-header">
          <div className="open-labs-badge">
            <span>🚀 OPEN-SOURCE LABS &amp; MENTORING PROJECTS</span>
          </div>
          <h2 className="open-labs-title">
            C.O.D.E 2026 에듀테크 오픈 프로젝트 &amp; 멘토링 랩
          </h2>
          <p className="open-labs-desc">
            참여자 인증(koco2027) 후 누구나 자유롭게 탐색할 수 있는 프로토타입 웹앱 및 멘토링 가이드입니다.
          </p>
        </div>

        <div className="open-labs-grid">
          {/* Card: Guil Donguri */}
          <div className="open-lab-card">
            <div className="open-lab-icon">🪙</div>
            <div className="open-lab-info">
              <h3>구일고 『돈구리 v0.2』</h3>
              <p>목표 역산 일일 소비한도 계산 및 게임형 경제 학습 프로토타입</p>
              <div className="open-lab-actions">
                <button
                  type="button"
                  className="open-lab-btn primary"
                  onClick={() => handleCardClick('돈구리 v0.2 앱', './apps/donguri/index.html', true)}
                >
                  앱 실행 ↗
                </button>
                <button
                  type="button"
                  className="open-lab-btn secondary"
                  onClick={() => handleCardClick('구일고 학생 매뉴얼', './slides/manual_guil.html', true)}
                >
                  매뉴얼 슬라이드 ↗
                </button>
              </div>
            </div>
          </div>

          {/* Card: Okjong StudyBuddy */}
          <div className="open-lab-card">
            <div className="open-lab-icon">🤖</div>
            <div className="open-lab-info">
              <h3>옥종고 『STUDY-BUDDY v0.2』</h3>
              <p>AI 학생 캐릭터 생성, 소크라테스 반문 루프, 망각곡선 간격 복습</p>
              <div className="open-lab-actions">
                <button
                  type="button"
                  className="open-lab-btn primary"
                  onClick={() => handleCardClick('STUDY-BUDDY v0.2 앱', './apps/studybuddy/index.html', true)}
                >
                  앱 실행 ↗
                </button>
                <button
                  type="button"
                  className="open-lab-btn secondary"
                  onClick={() => handleCardClick('옥종고 학생 매뉴얼', './slides/manual_okjong.html', true)}
                >
                  매뉴얼 슬라이드 ↗
                </button>
              </div>
            </div>
          </div>

          {/* Card: Logo Studio */}
          <div className="open-lab-card">
            <div className="open-lab-icon">🎨</div>
            <div className="open-lab-info">
              <h3>Logo Studio (AI 브랜드 디자인)</h3>
              <p>브랜드 브리프 분석, SVG 벡터 로고 에디터 및 커스텀 내보내기 도구</p>
              <div className="open-lab-actions">
                <button
                  type="button"
                  className="open-lab-btn primary"
                  onClick={() => handleCardClick('Logo Studio', './hub/apps/logo_studio/index.html', true)}
                >
                  스튜디오 열기 ↗
                </button>
              </div>
            </div>
          </div>

          {/* Card: Operations Desk & Masterplan */}
          <div className="open-lab-card">
            <div className="open-lab-icon">📊</div>
            <div className="open-lab-info">
              <h3>멘토링 운영 관제 데스크 &amp; 마스터플랜</h3>
              <p>D-Day 카운트다운, 주간 일정표, 체크리스트, 멘토링 일지 생성기</p>
              <div className="open-lab-actions">
                <button
                  type="button"
                  className="open-lab-btn primary"
                  onClick={() => handleCardClick('운영 관제 데스크', './slides/operations_desk.html', true)}
                >
                  관제 데스크 ↗
                </button>
                <button
                  type="button"
                  className="open-lab-btn secondary"
                  onClick={() => handleCardClick('운영 마스터플랜', './slides/masterplan.html', true)}
                >
                  마스터플랜 열람 ↗
                </button>
              </div>
            </div>
          </div>

          {/* Card: Expert Collaboration Guide */}
          <div className="open-lab-card">
            <div className="open-lab-icon">📘</div>
            <div className="open-lab-info">
              <h3>앱개발전문가 협업안내서</h3>
              <p>역할 분담, 주간 피드백 주기, 코드 리뷰 원칙 및 개발 가이드라인</p>
              <div className="open-lab-actions">
                <button
                  type="button"
                  className="open-lab-btn primary"
                  onClick={() => handleCardClick('전문가 협업안내서', './slides/expert_guide.html', true)}
                >
                  안내서 열람 ↗
                </button>
              </div>
            </div>
          </div>

          {/* Card: Edutech Hub Console */}
          <div className="open-lab-card">
            <div className="open-lab-icon">🏛️</div>
            <div className="open-lab-info">
              <h3>에듀테크 허브 프로젝트 콘솔</h3>
              <p>에듀테크 연계 융합교육 프로젝트 데이터 및 특강 자료 모음</p>
              <div className="open-lab-actions">
                <button
                  type="button"
                  className="open-lab-btn primary"
                  onClick={() => handleCardClick('에듀테크 허브 프로젝트', './hub/snu/index.html', true)}
                >
                  콘솔 열기 ↗
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>


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
            <div className={`footer-security-pill ${isLocked ? 'pill-locked' : 'pill-open'}`}>
              <span className="pill-dot"></span>
              <span>{isLocked ? '🔒 콘텐츠 잠금 모드 활성' : '🔓 콘텐츠 전체 공개 중'}</span>
            </div>

            <Link to="/admin" className="footer-admin-link">
              ⚙️ 관리자 콘솔
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
