import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { securityService } from '../utils/securityService';
import './ContentGate.css';

export default function ContentProtected({ children, contentName }) {
  const [isLocked, setIsLocked] = useState(securityService.isContentLocked());
  const [isAuthed, setIsAuthed] = useState(securityService.isContentAuthed());
  const [passcode, setPasscode] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isChecking, setIsChecking] = useState(false);
  const [isShaking, setIsShaking] = useState(false);

  useEffect(() => {
    const handleConfigChange = () => {
      setIsLocked(securityService.isContentLocked());
      setIsAuthed(securityService.isContentAuthed());
    };

    window.addEventListener('seung_security_config_changed', handleConfigChange);
    // sync remote once
    securityService.syncRemoteConfig().then(() => {
      setIsLocked(securityService.isContentLocked());
      setIsAuthed(securityService.isContentAuthed());
    });

    return () => {
      window.removeEventListener('seung_security_config_changed', handleConfigChange);
    };
  }, []);

  // If content is not locked, or user already unlocked it, render immediately
  if (!isLocked || isAuthed) {
    return <>{children}</>;
  }

  const handleUnlock = async (e) => {
    if (e) e.preventDefault();
    const clean = passcode.trim();
    if (!clean) {
      setErrorMsg('인증 코드를 입력해 주세요.');
      triggerShake();
      return;
    }

    setIsChecking(true);
    setErrorMsg('');

    const isValid = await securityService.verifyContentCode(clean);
    setIsChecking(false);

    if (isValid) {
      securityService.grantContentAuth();
      setIsAuthed(true);
    } else {
      setErrorMsg('인증 코드가 올바르지 않습니다.');
      triggerShake();
    }
  };

  const triggerShake = () => {
    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 500);
  };

  return (
    <div className="content-page-gate-wrap">
      <div className={`content-modal-card ${isShaking ? 'shake-animation' : ''}`}>
        <div className="content-modal-icon-wrap">
          <span className="content-modal-icon">🔒</span>
        </div>

        <span className="content-modal-badge">CONTENT ACCESS RESTRICTED</span>
        <h2 className="content-modal-title">참여자 인증이 필요합니다</h2>
        <p className="content-modal-desc">
          <strong>[{contentName || '실습 콘텐츠'}]</strong>에 접근하려면 인증 코드를 입력해 주세요.<br />
          포털 첫 화면은 자유롭게 둘러보실 수 있습니다.
        </p>

        <form onSubmit={handleUnlock} className="content-modal-form">
          <input
            type="text"
            value={passcode}
            onChange={(e) => {
              setPasscode(e.target.value);
              if (errorMsg) setErrorMsg('');
            }}
            placeholder="인증 코드 입력"
            autoFocus
            className="content-modal-input"
            autoComplete="off"
            spellCheck="false"
          />

          {errorMsg && (
            <div className="content-modal-error">
              ⚠️ {errorMsg}
            </div>
          )}

          <div className="content-modal-actions">
            <Link to="/" className="content-modal-btn-cancel" style={{ textAlign: 'center', textDecoration: 'none' }}>
              ← 포털 첫 화면으로 돌아가기
            </Link>
            <button
              type="submit"
              disabled={isChecking}
              className="content-modal-btn-submit"
            >
              {isChecking ? '확인 중...' : '인증하고 실습 시작 →'}
            </button>
          </div>
        </form>

        <p className="content-modal-hint">
          ※ 영문 대소문자 구분 없이 입력 가능합니다.
        </p>
      </div>
    </div>
  );
}
