import React, { useEffect, useId } from 'react';
import { Link } from 'react-router-dom';
import useCatalog from '../hooks/useCatalog';
import './PlaygroundPage.css';

function TerrariumArt() {
  const clipId = `playground-world-${useId().replaceAll(':', '')}`;
  return <svg viewBox="0 0 720 420" fill="none" aria-hidden="true" focusable="false">
    <defs><clipPath id={clipId}><circle cx="360" cy="202" r="145" /></clipPath></defs>
    <rect width="720" height="420" fill="#F0E8DC" />
    <path d="M56 60H664M56 360H664M92 36V384M628 36V384" stroke="#D8CCBA" strokeWidth="1" />
    <path d="M72 60H112M92 40V80M608 360H648M628 340V380" stroke="#A58666" strokeWidth="1" />
    <circle cx="360" cy="202" r="145" fill="#FAF7F1" stroke="#8D7156" strokeWidth="1.5" />
    <g clipPath={`url(#${clipId})`}>
      <ellipse cx="360" cy="270" rx="164" ry="65" fill="#DCCCB6" />
      <path d="M202 267L365 217L528 272M220 297L365 242L502 300M250 329L365 267L472 328M258 234L433 331M312 217L475 312M375 217L505 281M232 296L385 222M276 323L432 232" stroke="#BAA184" strokeWidth="1" />
      <path d="M278 263V193L332 164L384 195V264L330 293Z" fill="#E9DDCA" stroke="#6F533C" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M278 193L332 220L384 195M332 220V293" stroke="#6F533C" strokeWidth="1.5" />
      <path d="M278 193L332 145L384 195L332 220Z" fill="#A75B3C" stroke="#6F3E2D" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M332 145V220" stroke="#C78C6B" strokeWidth="1" />
      <path d="M298 219V247L315 255V228Z" fill="#F8F1E6" stroke="#9B7E5F" />
      <path d="M351 244V273L367 264V236Z" fill="#715440" />
      <path d="M394 270V224L428 206L460 225V271L426 290Z" fill="#C8B499" stroke="#6F533C" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M394 224L428 242L460 225M428 242V290" stroke="#6F533C" strokeWidth="1.5" />
      <path d="M397 218L428 199L458 217L428 234Z" fill="#F7EFE2" stroke="#8D7156" />
      <path d="M242 263V226M232 244L242 226L252 244M232 255L242 238L252 255" stroke="#826547" strokeWidth="2" strokeLinecap="round" />
      <path d="M473 253V218M463 234L473 218L483 234M462 245L473 228L484 245" stroke="#826547" strokeWidth="2" strokeLinecap="round" />
      <path d="M343 299L375 285L392 292L360 307M353 310L385 296L402 303L370 318" fill="#EFE3D0" stroke="#A98C6D" />
      <path d="M216 180C270 146 444 144 507 183M218 205C280 180 441 182 504 209" stroke="#CABBA7" strokeWidth="1" />
    </g>
    <ellipse cx="360" cy="202" rx="215" ry="61" transform="rotate(-17 360 202)" stroke="#8D7156" strokeWidth="1" />
    <path d="M230 344L270 317M487 80L454 110" stroke="#B29B7F" strokeWidth="1" />
    <circle cx="523" cy="150" r="7" fill="#A23E18" />
    <circle cx="188" cy="257" r="3" fill="#8D7156" />
    <path d="M552 298H577M564.5 285.5V310.5" stroke="#A23E18" strokeWidth="1" />
    <path d="M137 123H152M144.5 115.5V130.5" stroke="#A58666" strokeWidth="1" />
  </svg>;
}

function Exhibit({ item, index }) {
  const terrarium = item.id === 'terrarium' || /\/terrarium\//.test(item.href);
  const number = String(index + 1).padStart(2, '0');
  return <article className="playground-exhibit">
    <a className="playground-exhibit-link" href={item.href} aria-label={`${item.title} 열기`}>
      <div className="playground-visual" aria-hidden="true">
        {terrarium ? <TerrariumArt /> : <div className="playground-index-art"><span>AI PLAYGROUND</span><b>{number}</b><span>{item.title}</span></div>}
        <span className="playground-visual-caption">{terrarium ? 'SMALL WORLDS' : 'CREATED WITH AI'}</span>
      </div>
      <div className="playground-exhibit-copy">
        <span className="playground-exhibit-kicker">{number} <i aria-hidden="true" /> AI 활용 산출물</span>
        <h2>{item.title}</h2>
        {item.description && <p>{item.description}</p>}
        <span className="playground-exhibit-action">산출물 열기 <span aria-hidden="true">↗</span></span>
      </div>
    </a>
  </article>;
}

export default function PlaygroundPage() {
  const { catalog, loading, error } = useCatalog();
  const items = catalog.items.filter(item => item.section === 'playground' && item.placement !== 'archive' && !['locked', 'orphan'].includes(item.status));
  useEffect(() => {
    const previousTitle = document.title;
    document.title = 'AI 놀이터 · Seung AI Labs';
    return () => { document.title = previousTitle; };
  }, []);

  return <div className="playground-page">
    <div className="playground-sheet">
      <header className="playground-masthead">
        <Link to="/" className="playground-wordmark">SEUNG AI LABS</Link>
        <nav aria-label="놀이터 이동"><Link to="/">← 통합 포털</Link></nav>
      </header>
      <main>
        <div className="playground-title-block">
          <p className="playground-kicker">AI PLAYGROUND</p>
          <h1>AI 놀이터</h1>
          <p className="playground-intro">AI를 활용해 만든 실험, 도구, 작은 세계를 한곳에 모았습니다.<br />마음이 가는 산출물을 열어 직접 둘러보세요.</p>
        </div>
        <div className="playground-section-head"><h2>만들며 발견한 것들</h2>{!loading && !error && <span>{items.length}개의 산출물</span>}</div>
        {loading ? <p className="playground-state" role="status">AI 놀이터를 불러오는 중입니다.</p> : error ? <p className="playground-state" role="status">산출물 목록을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요. <Link to="/">통합 포털로 돌아가기 ↗</Link></p> : items.length ? <div className="playground-grid">{items.map((item, index) => <Exhibit key={item.id} item={item} index={index} />)}</div> : <p className="playground-state" role="status">표시할 산출물이 없습니다.</p>}
      </main>
      <footer className="playground-footer"><span>Seung AI Labs · AI Playground</span><Link to="/">포털로 돌아가기 ↗</Link></footer>
    </div>
  </div>;
}
