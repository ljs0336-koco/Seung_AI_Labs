import React, { useState } from 'react';
import { securityService } from '../utils/securityService';
import './ContentGate.css';

export default function ContentLockModal({ isOpen, contentTitle, onClose, onSuccess }) {
  const [passcode, setPasscode] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isShaking, setIsShaking] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    const clean = passcode.trim();
    if (!clean) {
      setErrorMsg('인증 코드를 입력해 주세요.');
      triggerShake();
      return;
    }

    setIsVerifying(true);
    setErrorMsg('');

    const isValid = await securityService.verifyContentCode(clean);
    setIsVerifying(false);

    if (isValid) {
      securityService.grantContentAuth();
      if (onSuccess) onSuccess();
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
    <div className="content-modal-backdrop" onClick={onClose}>
      <div
        className={`content-modal-card ${isShaking ? 'shake-animation' : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        <button className="content-modal-close" onClick={onClose} title="닫기">
          ✕
        </button>

        <div className="content-modal-icon-wrap">
          <span className="content-modal-icon">🔐</span>
        </div>

        <span className="content-modal-badge">PARTICIPANT ACCESS REQUIRED</span>
        <h3 className="content-modal-title">콘텐츠 참여자 인증</h3>
        
        <p className="content-modal-desc">
          <strong>[{contentTitle || '선택하신 실습'}]</strong>은(는) 현재 참여자 전용으로 운영 중입니다.<br />
          전달받으신 인증 코드를 입력하시면 자유롭게 이용하실 수 있습니다.
        </p>

        <form onSubmit={handleSubmit} className="content-modal-form">
          <input
            type="text"
            value={passcode}
            onChange={(e) => {
              setPasscode(e.target.value);
              if (errorMsg) setErrorMsg('');
            }}
            placeholder="인증 코드 입력 (예: ABC1234)"
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
            <button
              type="button"
              className="content-modal-btn-cancel"
              onClick={onClose}
            >
              닫기 (포털 유지)
            </button>
            <button
              type="submit"
              disabled={isVerifying}
              className="content-modal-btn-submit"
            >
              {isVerifying ? '확인 중...' : '인증하고 입장하기 →'}
            </button>
          </div>
        </form>

        <p className="content-modal-hint">
          ※ 영문 대소문자 구분 없이 입력하실 수 있습니다.
        </p>
      </div>
    </div>
  );
}
