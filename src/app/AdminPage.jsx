import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { securityService } from '../utils/securityService';
import './AdminPage.css';

// Admin Passcode Hashes for "EDU2026" and "EDU2026)"
const ADMIN_HASH_1 = "27ed6f3f98ed92edaade0ef482aee7cf13b16d68d38ab4a975d687412410300a";
const ADMIN_HASH_2 = "d0e53315da98db3a8d0eea56db8ef802833c4108ffeca3387950aab8b9cf8d57";
const ADMIN_AUTH_KEY = "seung_admin_auth_v2";
const GH_TOKEN_KEY = "seung_gh_pat_v1";

export default function AdminPage() {
  const navigate = useNavigate();
  const [isAdminAuthed, setIsAdminAuthed] = useState(false);
  const [adminInput, setAdminInput] = useState('');
  const [adminError, setAdminError] = useState('');
  const [showAdminPw, setShowAdminPw] = useState(false);

  // Content security config state
  const [config, setConfig] = useState(securityService.getConfig());
  const [newCodeInput, setNewCodeInput] = useState(config.defaultCode || 'EDU2026');
  const [noticeMsg, setNoticeMsg] = useState('');


  // GitHub Remote Sync state
  const [ghToken, setGhToken] = useState(localStorage.getItem(GH_TOKEN_KEY) || '');
  const [isSyncingGh, setIsSyncingGh] = useState(false);
  const [ghSyncResult, setGhSyncResult] = useState('');

  useEffect(() => {
    if (sessionStorage.getItem(ADMIN_AUTH_KEY) === 'granted') {
      setIsAdminAuthed(true);
      loadConfig();
    }
  }, []);

  const loadConfig = () => {
    const current = securityService.getConfig();
    setConfig(current);
    if (current.defaultCode) {
      setNewCodeInput(current.defaultCode);
    }
  };

  const handleAdminLogin = async (e) => {
    if (e) e.preventDefault();
    const clean = adminInput.trim();
    if (!clean) {
      setAdminError('관리자 마스터 암호를 입력해 주세요.');
      return;
    }
    const isMaster = clean === 'EDU2026' || clean === 'EDU2026)';

    if (isMaster) {
      sessionStorage.setItem(ADMIN_AUTH_KEY, 'granted');
      setIsAdminAuthed(true);
      setAdminError('');
      loadConfig();
    } else {
      setAdminError('관리자 암호가 올바르지 않습니다.');
    }
  };

  const handleAdminLogout = () => {
    sessionStorage.removeItem(ADMIN_AUTH_KEY);
    setIsAdminAuthed(false);
    setAdminInput('');
    setAdminError('');
  };

  // Toggle Content Lock
  const handleToggleLock = async () => {
    const nextLocked = !config.isLocked;
    const updated = await securityService.setContentLockMode(nextLocked, newCodeInput);
    setConfig(updated);
    if (nextLocked) {
      setNoticeMsg(
        '🔒 [콘텐츠 잠금 모드]가 즉시 적용되었습니다. (모든 인증 세션 초기화 완료 — 포털 메인으로 나가서 실습 카드를 클릭하면 즉시 인증 코드(SNU1002) 팝업이 뜹니다.)'
      );
    } else {
      setNoticeMsg(
        '🔓 [콘텐츠 전체 공개 모드]로 설정되었습니다. 누구나 실습 콘텐츠에 자유롭게 입장할 수 있습니다.'
      );
    }
    setTimeout(() => setNoticeMsg(''), 5000);
  };

  // Save Custom Code
  const handleSaveCode = async (e) => {
    if (e) e.preventDefault();
    const clean = newCodeInput.trim().toUpperCase();
    if (!clean) {
      setNoticeMsg('⚠️ 인증 코드를 비워둘 수 없습니다.');
      return;
    }
    const updated = await securityService.setContentLockMode(config.isLocked, clean);
    setConfig(updated);
    setNoticeMsg(`✅ 인증 코드가 [${clean}] (으)로 변경 및 저장되었습니다.`);
    setTimeout(() => setNoticeMsg(''), 4000);
  };

  // Reset visitor authentication and immediately test
  const handleTestLock = () => {
    securityService.revokeContentAuth();
    navigate('/');
  };

  // Save GitHub Token locally for one-click API sync
  const handleSaveGhToken = (e) => {
    if (e) e.preventDefault();
    const clean = ghToken.trim();
    if (clean) {
      localStorage.setItem(GH_TOKEN_KEY, clean);
      setGhSyncResult('✅ GitHub 토큰이 이 브라우저에 안전하게 저장되었습니다.');
    } else {
      localStorage.removeItem(GH_TOKEN_KEY);
      setGhSyncResult('ℹ️ GitHub 토큰이 삭제되었습니다.');
    }
    setTimeout(() => setGhSyncResult(''), 4000);
  };

  // Sync to GitHub Pages via GitHub REST API
  const handleSyncToGitHub = async () => {
    const token = (ghToken || localStorage.getItem(GH_TOKEN_KEY) || '').trim();
    if (!token) {
      setGhSyncResult('⚠️ 깃허브 토큰(Personal Access Token)을 먼저 입력해 주세요.');
      return;
    }

    setIsSyncingGh(true);
    setGhSyncResult('⏳ GitHub 원격 저장소로 설정을 전송하는 중...');

    try {
      const repo = 'ljs0336-koco/Seung_AI_Labs';
      const path = 'public/security-config.json';
      const getUrl = `https://api.github.com/repos/${repo}/contents/${path}`;

      // 1. Get current file sha
      const getRes = await fetch(getUrl, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github+json'
        }
      });

      let sha = '';
      if (getRes.ok) {
        const fileData = await getRes.json();
        sha = fileData.sha;
      }

      // 2. Prepare new content
      const newConfig = {
        isLocked: config.isLocked,
        mode: config.isLocked ? 'restricted' : 'public',
        defaultCode: config.defaultCode || 'EDU2026',
        targetHash: config.targetHash,
        updatedAt: new Date().toISOString()
      };

      const contentBase64 = btoa(unescape(encodeURIComponent(JSON.stringify(newConfig, null, 2))));

      // 3. Put to GitHub
      const putRes = await fetch(getUrl, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github+json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: `chore: update security-config.json (isLocked: ${config.isLocked}) from admin console`,
          content: contentBase64,
          sha: sha || undefined
        })
      });

      if (putRes.ok) {
        setGhSyncResult('🎉 GitHub 저장소에 성공적으로 원격 동기화되었습니다! (모든 학생 기기에 적용)');
      } else {
        const errJson = await putRes.json();
        setGhSyncResult(`❌ GitHub API 오류: ${errJson.message || '토큰 권한(repo)을 확인해 주세요.'}`);
      }
    } catch (err) {
      setGhSyncResult(`❌ 동기화 실패: ${err.message}`);
    } finally {
      setIsSyncingGh(false);
      setTimeout(() => setGhSyncResult(''), 7000);
    }
  };

  // Login Screen
  if (!isAdminAuthed) {
    return (
      <div className="admin-login-overlay">
        <div className="admin-login-card">
          <span className="admin-badge">SEUNG AI LABS ADMIN</span>
          <h1 className="admin-title">관리자 콘솔 인증</h1>
          <p className="admin-desc">
            포털의 콘텐츠 보안 및 연수 운영 설정을 관리하는 전용 콘솔입니다.<br />
            관리자 마스터 암호를 입력해 주세요.
          </p>

          <form onSubmit={handleAdminLogin} className="admin-form">
            <div className="admin-input-wrapper">
              <input
                type={showAdminPw ? 'text' : 'password'}
                value={adminInput}
                onChange={(e) => setAdminInput(e.target.value)}
                placeholder="관리자 마스터 암호 입력"
                autoFocus
                className="admin-input"
              />
              <button
                type="button"
                className="admin-pw-toggle"
                onClick={() => setShowAdminPw(!showAdminPw)}
                title={showAdminPw ? '암호 숨기기' : '암호 보기'}
              >
                {showAdminPw ? '👁️' : '🔒'}
              </button>
            </div>

            {adminError && (
              <div className="admin-error-text">
                ⚠️ {adminError}
              </div>
            )}

            <button type="submit" className="admin-login-btn">
              관리자 콘솔 입장 →
            </button>
          </form>

          <div style={{ marginTop: '20px' }}>
            <Link to="/" className="admin-back-portal-link">
              ← 통합 포털 첫 화면으로 돌아가기
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Admin Dashboard
  return (
    <div className="admin-dashboard-container">
      <header className="admin-dashboard-header">
        <div className="admin-header-left">
          <span className="admin-pill">ADMIN CONSOLE</span>
          <h2>Seung AI Labs 통합 관리자 콘솔</h2>
          <p>첫 화면(포털)은 상시 공개되며, 세부 실습 콘텐츠의 잠금 여부 및 인증 코드를 제어합니다.</p>
        </div>
        <div className="admin-header-right">
          <Link to="/" className="admin-btn-secondary">
            🏠 통합 포털 바로가기
          </Link>
          <button onClick={handleAdminLogout} className="admin-btn-logout">
            로그아웃
          </button>
        </div>
      </header>

      {noticeMsg && (
        <div className="admin-toast-banner" role="status">
          {noticeMsg}
        </div>
      )}

      <main className="admin-main-grid">
        {/* Card 1: Content Security Mode Toggle */}
        <section className="admin-card">
          <div className="admin-card-head">
            <span className="admin-card-icon">🔒</span>
            <div>
              <h3>실습 콘텐츠 잠금 제어</h3>
              <p>첫 화면 포털은 언제나 공개되며, 세부 실습 콘텐츠 입장 시에만 인증 코드를 요구합니다.</p>
            </div>
          </div>

          <div className={`admin-status-banner ${config.isLocked ? 'status-locked' : 'status-open'}`}>
            <div className="status-indicator">
              <span className={`status-dot ${config.isLocked ? 'dot-red' : 'dot-green'}`} />
              <strong>
                {config.isLocked
                  ? '🔒 현재 상태: [콘텐츠 잠금 모드] 활성화'
                  : '🔓 현재 상태: [콘텐츠 전체 공개 모드] 활성화'}
              </strong>
            </div>
            <p className="status-sub">
              {config.isLocked
                ? '방문자가 포털에서 리터러시 실험실, 융합 허브, 매거진 입장 클릭 시 인증 코드를 요구합니다.'
                : '비밀번호 없이 누구나 포털의 모든 실습 도구와 매거진에 자유롭게 입장할 수 있습니다.'}
            </p>
          </div>

          <div className="admin-toggle-box">
            <label className="admin-toggle-label">모드 즉시 전환:</label>
            <button
              onClick={handleToggleLock}
              className={`admin-toggle-switch-btn ${config.isLocked ? 'btn-make-open' : 'btn-make-locked'}`}
            >
              {config.isLocked ? '🔓 [전체 공개 모드]로 전환하기' : '🔒 [콘텐츠 잠금 모드]로 전환하기'}
            </button>
          </div>

          <form onSubmit={handleSaveCode} className="admin-passcode-field">
            <label className="admin-input-label">방문자/학생용 인증 코드 설정:</label>
            <div className="admin-code-row">
              <input
                type="text"
                value={newCodeInput}
                onChange={(e) => setNewCodeInput(e.target.value.toUpperCase())}
                placeholder="예: ABC1234"
                className="admin-code-input"
              />
              <button type="submit" className="admin-code-save-btn">
                코드 저장
              </button>
            </div>
            <span className="admin-code-hint">
              ※ 현재 설정된 코드: <strong>{config.defaultCode || 'EDU2026'}</strong> (대소문자 구분 없음)
            </span>
          </form>

          <div className="admin-test-tool-box">
            <button
              type="button"
              onClick={handleTestLock}
              className="admin-reset-test-btn"
            >
              🧪 잠금 팝업 작동 즉시 테스트 (인증 해제 후 포털로 이동)
            </button>
            <span className="admin-test-hint">
              클릭 시 인증이 해제된 상태로 포털 메인으로 이동합니다. 실습 카드를 클릭하여 잠금 팝업이 바로 뜨는지 확인해 보세요!
            </span>
          </div>
        </section>

        {/* Card 2: Remote Cloud / GitHub Sync (Solves static hosting limitations) */}
        <section className="admin-card">
          <div className="admin-card-head">
            <span className="admin-card-icon">🌐</span>
            <div>
              <h3>원격 서버(GitHub Pages) 전역 동기화</h3>
              <p>GitHub Pages(정적 호스팅) 환경에서 모든 수강생 기기에 실시간 잠금을 배포하는 방법입니다.</p>
            </div>
          </div>

          <div style={{ background: '#f8faf9', border: '1px solid #dbe6e3', borderRadius: '14px', padding: '16px 20px', marginBottom: '18px' }}>
            <h4 style={{ margin: '0 0 8px', fontSize: '0.98rem', color: '#1a332d', fontWeight: 700 }}>
              📌 현재 배포 상태 안내
            </h4>
            <p style={{ margin: 0, fontSize: '0.88rem', lineHeight: '1.6', color: '#4d5d59' }}>
              현재 원격 저장소(GitHub Pages)는 <strong>[콘텐츠 잠금 모드 ON / 인증코드: {config.defaultCode || 'EDU2026'}]</strong>로 기본 배포되어 있습니다.<br />
              처음 접속하는 모든 수강생은 실습 콘텐츠 클릭 시 무조건 인증 코드를 입력해야 입장할 수 있습니다.
            </p>
          </div>

          <form onSubmit={handleSaveGhToken} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <label className="admin-input-label">
              ⚡ 브라우저에서 원클릭 원격 동기화 (선택 사항):
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="password"
                value={ghToken}
                onChange={(e) => setGhToken(e.target.value)}
                placeholder="GitHub Personal Access Token (PAT)"
                className="admin-code-input"
                style={{ flex: 1, fontFamily: 'monospace', fontSize: '0.85rem' }}
              />
              <button type="submit" className="admin-code-save-btn" style={{ padding: '0 16px' }}>
                토큰 저장
              </button>
            </div>
            <span className="admin-code-hint">
              GitHub 토큰(repo 권한)을 등록해 두시면, 콘솔에서 버튼 하나로 GitHub Pages 저장소 설정을 즉시 갱신할 수 있습니다. (토큰은 본인 브라우저에만 저장됨)
            </span>
          </form>

          {ghToken && (
            <div style={{ marginTop: '14px' }}>
              <button
                type="button"
                onClick={handleSyncToGitHub}
                disabled={isSyncingGh}
                style={{
                  width: '100%',
                  padding: '13px',
                  background: isSyncingGh ? '#94a3b8' : '#1e3a34',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '12px',
                  fontWeight: 700,
                  fontSize: '0.95rem',
                  cursor: isSyncingGh ? 'not-allowed' : 'pointer'
                }}
              >
                {isSyncingGh ? '동기화 중...' : '⚡ 현재 설정을 GitHub Pages 원격 서버에 즉시 배포하기'}
              </button>
            </div>
          )}

          {ghSyncResult && (
            <div style={{ marginTop: '12px', padding: '10px 14px', borderRadius: '10px', fontSize: '0.88rem', fontWeight: 600, background: ghSyncResult.includes('❌') ? '#fef2f2' : '#f0fdf4', color: ghSyncResult.includes('❌') ? '#dc2626' : '#16a34a', border: '1px solid ' + (ghSyncResult.includes('❌') ? '#fecaca' : '#bbf7d0') }}>
              {ghSyncResult}
            </div>
          )}
        </section>

        {/* Card 3: Quick Links & Services */}
        <section className="admin-card">
          <div className="admin-card-head">
            <span className="admin-card-icon">📊</span>
            <div>
              <h3>플랫폼 콘텐츠 바로가기</h3>
              <p>각 세부 교육 서비스 바로 연결</p>
            </div>
          </div>

          <div className="admin-service-list">

            <div className="admin-service-item">
              <div className="admin-service-info">
                <span className="service-emoji">🧠</span>
                <div>
                  <strong>초등 AI 리터러시 탐험 연구소</strong>
                  <span>4개 인터랙티브 시뮬레이션 모듈 (공정성·팩트체크·역할·안전)</span>
                </div>
              </div>
              <Link to="/literacy" className="admin-service-btn">
                열기 →
              </Link>
            </div>

            <div className="admin-service-item">
              <div className="admin-service-info">
                <span className="service-emoji">🐕</span>
                <div>
                  <strong>에듀테크 융합교육 허브</strong>
                  <span>로보독 강화학습(RL), 질문 전후 비교, 통학 데이터 탐구 v2</span>
                </div>
              </div>
              <a href="./hub/index.html" className="admin-service-btn">
                열기 →
              </a>
            </div>

            <div className="admin-service-item">
              <div className="admin-service-info">
                <span className="service-emoji">📎</span>
                <div>
                  <strong>매거진 덱 (Vol. 01)</strong>
                  <span>The Agentic Shift · 코코아팹 사업부 에디토리얼 프레젠테이션</span>
                </div>
              </div>
              <a href="./deck/index.html" className="admin-service-btn">
                열기 →
              </a>
            </div>
          </div>
        </section>
        {/* Card 4: Experimental Lab Apps (Hidden from Students) */}
        <section className="admin-card">
          <div className="admin-card-head">
            <span className="admin-card-icon">🧪</span>
            <div>
              <h3>비공개 실험실 앱 (Experimental Labs)</h3>
              <p>수강생 화면에서 은닉된 연구·개발 단계의 전용 앱 런처</p>
            </div>
          </div>

          <div className="admin-service-list">
            <div className="admin-service-item">
              <div className="admin-service-info">
                <span className="service-emoji">🏛️</span>
                <div>
                  <strong>서울대 허브 관리자 콘솔</strong>
                  <span>암호화된 서울대 에듀테크 허브 및 팀 데이터 관리</span>
                </div>
              </div>
              <a href="./hub/snu/index.html" target="_blank" rel="noreferrer" className="admin-service-btn">
                관리 ↗
              </a>
            </div>

            <div className="admin-service-item">
              <div className="admin-service-info">
                <span className="service-emoji">🎨</span>
                <div>
                  <strong>Logo Studio (AI 브랜드 디자인 스튜디오)</strong>
                  <span>브랜드 브리프 분석, SVG 벡터 로고 에디터 및 커스텀 내보내기 도구</span>
                </div>
              </div>
              <a href="./hub/apps/logo_studio/index.html" target="_blank" rel="noreferrer" className="admin-service-btn">
                실행 ↗
              </a>
            </div>

            {/* 구일고 돈구리 v0.2 & 매뉴얼 */}
            <div className="admin-service-item">
              <div className="admin-service-info">
                <span className="service-emoji">🪙</span>
                <div>
                  <strong>구일고 0.91 『돈구리 v0.2』 프로토타입 앱</strong>
                  <span>목표 역산 일일 소비한도, 퀴즈, 도토리 보상, 상점 시스템 정적 엔진</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <a href="./slides/manual_guil.html" target="_blank" rel="noreferrer" className="admin-service-btn" style={{ background: '#F59E0B', color: '#FFF' }}>
                  매뉴얼 슬라이드 ↗
                </a>
                <a href="./apps/donguri/index.html" target="_blank" rel="noreferrer" className="admin-service-btn" style={{ background: '#7B4B2A', color: '#FFF' }}>
                  앱 실행 ↗
                </a>
              </div>
            </div>

            {/* 옥종고 STUDY-BUDDY v0.2 & 매뉴얼 */}
            <div className="admin-service-item">
              <div className="admin-service-info">
                <span className="service-emoji">🤖</span>
                <div>
                  <strong>옥종고 OKXEN 『STUDY-BUDDY v0.2』 프로토타입 앱</strong>
                  <span>성향 검사, 소크라테스 반문 루프, 망각곡선 간격 복습, 시즌 리그 프로토타입</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <a href="./slides/manual_okjong.html" target="_blank" rel="noreferrer" className="admin-service-btn" style={{ background: '#10B981', color: '#FFF' }}>
                  매뉴얼 슬라이드 ↗
                </a>
                <a href="./apps/studybuddy/index.html" target="_blank" rel="noreferrer" className="admin-service-btn" style={{ background: '#4C5FD5', color: '#FFF' }}>
                  앱 실행 ↗
                </a>
              </div>
            </div>

            {/* 전문가 협업안내서 */}
            <div className="admin-service-item">
              <div className="admin-service-info">
                <span className="service-emoji">📘</span>
                <div>
                  <strong>앱개발전문가 협업안내서 (슬라이드 덱)</strong>
                  <span>멘토링 역할 분담, 주간 피드백 주기, 코드 리뷰 원칙 및 지원 가이드</span>
                </div>
              </div>
              <a href="./slides/expert_guide.html" target="_blank" rel="noreferrer" className="admin-service-btn" style={{ background: '#0F766E', color: '#FFF' }}>
                안내서 열람 ↗
              </a>
            </div>

            {/* 멘토링 통합 모니터링 관제 데스크 */}
            <div className="admin-service-item">
              <div className="admin-service-info">
                <span className="service-emoji">📊</span>
                <div>
                  <strong>C.O.D.E 2026 통합 모니터링 데스크 (Operations Desk)</strong>
                  <span>D-Day 카운트다운, 학교별 주간 일정, 운영 체크리스트, 멘토링 일지 초안 생성기</span>
                </div>
              </div>
              <a href="./slides/operations_desk.html" target="_blank" rel="noreferrer" className="admin-service-btn" style={{ background: '#A23E18', color: '#FFF' }}>
                관제 데스크 열기 ↗
              </a>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}