import React, { useRef } from 'react';
import { PUBLIC_SITE_URL } from '../hooks/useCatalog';
import portalQr from '../assets/portal-qr.svg';
import './PortalQr.css';

export default function PortalQr() {
  const dialogRef = useRef(null);

  return <>
    <button className="portal-qr-trigger" type="button" aria-haspopup="dialog" aria-label="통합포털 QR 코드 크게 보기" title="QR 코드 크게 보기" onClick={() => dialogRef.current?.showModal()}>
      <img src={portalQr} alt="" width="44" height="44" />
    </button>
    <dialog className="portal-qr-dialog" ref={dialogRef} aria-labelledby="portal-qr-title" aria-describedby="portal-qr-description" onClick={event => { if (event.target === event.currentTarget) event.currentTarget.close(); }}>
      <div className="portal-qr-content">
        <header className="portal-qr-heading">
          <div><p>SCAN TO EXPLORE</p><h2 id="portal-qr-title">Seung AI Labs</h2></div>
          <button className="portal-qr-close" type="button" aria-label="QR 코드 닫기" onClick={() => dialogRef.current?.close()}>닫기 ×</button>
        </header>
        <p className="portal-qr-instruction" id="portal-qr-description">휴대전화 카메라로 QR 코드를 비추면 접속할 수 있습니다.</p>
        <img className="portal-qr-large" src={portalQr} alt="Seung AI Labs 통합포털 접속 QR 코드" width="492" height="492" />
        <a className="portal-qr-url" href={PUBLIC_SITE_URL}>{PUBLIC_SITE_URL}</a>
      </div>
    </dialog>
  </>;
}
