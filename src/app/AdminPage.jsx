import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import './AdminPage.css';

const CONFIRM_KEY = 'seung_materials_guideline_seen_v1';
const materials = [
  ['1차 멘토링 워크숍 보드', '10.19 사전질문 요약 · 항목별 피드백 · 정리 프롬프트', './slides/mentoring_round1.html'],
  ['마스터플랜 (v1.3)', '운영 일정과 역할 분담', './slides/masterplan.html'],
  ['관제 데스크 (v1.3)', '체크리스트와 멘토링 일지', './slides/operations_desk.html'],
  ['협업 안내서', '앱 개발 협업과 피드백 안내', './slides/expert_guide.html'],
  ['Logo Studio', '브랜드 디자인 실습', './hub/apps/logo_studio/index.html'],
  ['돈구리', '학생용 앱', './apps/donguri/index.html'],
  ['돈구리 매뉴얼', '앱 사용 안내', './slides/manual_guil.html'],
  ['STUDY-BUDDY', '학생용 앱', './apps/studybuddy/index.html'],
  ['STUDY-BUDDY 매뉴얼', '앱 사용 안내', './slides/manual_okjong.html'],
];

const travelGuides = [
  ['KANSAI NOTES · 통합 선택 화면', '취향으로 고르는 겨울 간사이 3박 4일 입구', './kansai-travel-guide/index.html'],
  ['01. 느긋한 커플편', '오사카 3연박 + 교토 하루 버스투어 · 휴식 중심', './kansai-travel-guide/couple.html'],
  ['02. 포켓몬 원정대편', '오사카·교토 2일씩 · 포켓몬센터 3곳과 카드·피규어 매장', './kansai-travel-guide/pokemon.html'],
];

export default function AdminPage() {
  const [confirmed, setConfirmed] = useState(() => {
    try { return sessionStorage.getItem(CONFIRM_KEY) === 'yes'; } catch { return false; }
  });
  const [draft, setDraft] = useState('');
  const [notice, setNotice] = useState('');
  const [shareNotice, setShareNotice] = useState('');
  const privacy = globalThis.SeungPrivacy;
  const issues = privacy?.findPrivacyIssues(draft) || [];
  const labels = [...new Set(issues.map(issue => issue.label))].join(', ');

  useEffect(() => {
    const previousTitle = document.title;
    document.title = '운영 자료실 · Seung AI Labs';
    const robots = document.createElement('meta');
    robots.name = 'robots'; robots.content = 'noindex, nofollow';
    document.head.appendChild(robots);
    return () => { robots.remove(); document.title = previousTitle; };
  }, []);

  function enterMaterials() {
    try { sessionStorage.setItem(CONFIRM_KEY, 'yes'); } catch { /* Storage is optional. */ }
    setConfirmed(true);
  }
  function maskDraft() {
    if (!privacy) return;
    setDraft(privacy.maskPrivateText(draft));
    setNotice('감지한 개인정보를 가렸습니다. 이름·주소·사진도 직접 확인해 주세요.');
  }
  async function copyDraft() {
    if (!privacy || !draft.trim() || privacy.findPrivacyIssues(draft).length) return;
    try { await navigator.clipboard.writeText(draft); setNotice('확인한 글을 복사했습니다. 게시 전 내용도 한 번 더 확인해 주세요.'); }
    catch { setNotice('복사 권한이 없습니다. 글을 선택해 직접 복사해 주세요.'); }
  }
  function resolveShareUrl(href) {
    try { return new URL(href, globalThis.location?.href || 'https://ljs0336-koco.github.io/Seung_AI_Labs/').href; }
    catch { return href; }
  }
  async function copyGuideLink(title, href) {
    const url = resolveShareUrl(href);
    try {
      await navigator.clipboard.writeText(url);
      setShareNotice(`'${title}' 공유 링크를 복사했습니다.`);
    } catch {
      setShareNotice(`복사 권한이 없습니다. 직접 복사해 주세요: ${url}`);
    }
  }
  async function copyAllTravelLinks() {
    const lines = [
      '[KANSAI NOTES · 겨울 간사이 3박 4일 여행가이드]',
      `- 통합 선택 화면: ${resolveShareUrl('./kansai-travel-guide/index.html')}`,
      `- 느긋한 커플편: ${resolveShareUrl('./kansai-travel-guide/couple.html')}`,
      `- 포켓몬 원정대편: ${resolveShareUrl('./kansai-travel-guide/pokemon.html')}`,
    ].join('\n');
    try {
      await navigator.clipboard.writeText(lines);
      setShareNotice('여행가이드 3종 전체 공유 링크를 복사했습니다.');
    } catch {
      setShareNotice('복사 권한이 없습니다. 각 가이드를 열어 주소를 복사해 주세요.');
    }
  }

  if (!confirmed) return (
    <main className="admin-login-overlay"><section className="admin-login-card" aria-labelledby="materials-entry-title">
      <span className="admin-badge">SEUNG AI LABS</span><h1 id="materials-entry-title" className="admin-title">운영 자료실</h1>
      <p className="admin-desc">공개돼도 괜찮은 운영 자료와 도구를 모아 둔 곳입니다.<br />개인정보·학생 식별 자료·암호는 올리지 않습니다.</p>
      <p className="materials-hint">주소를 아는 사람은 열 수 있습니다. 비밀자료는 보관하지 마세요.</p>
      <button type="button" className="admin-login-btn" onClick={enterMaterials}>게시 원칙 확인하고 열기</button>
      <div className="materials-entry-links"><a href="./privacy-guidelines.html">개인정보 게시 원칙</a><Link to="/">포털로 돌아가기</Link></div>
    </section></main>
  );

  return (
    <div className="admin-dashboard-container">
      <header className="admin-dashboard-header">
        <div className="admin-header-left"><span className="admin-pill">MATERIALS</span><h1>Seung AI Labs 운영 자료실</h1><p>이 주소를 북마크해 사용하세요. 자료는 공개 가능한 내용만 둡니다.</p></div>
        <Link to="/" className="admin-btn-secondary">포털로 돌아가기</Link>
      </header>
      <main className="admin-main-grid">
        <section className="admin-card" aria-labelledby="privacy-heading">
          <div className="admin-card-head"><div><h2 id="privacy-heading">게시 전 글 확인</h2><p>전화번호·이메일·주민등록번호를 찾아 가립니다. 입력한 글은 이 도구에 저장하거나 전송하지 않습니다.</p></div></div>
          <label htmlFor="posting-draft" className="materials-label">게시할 글</label>
          <textarea id="posting-draft" value={draft} maxLength={30000} rows={7} className="materials-draft" onChange={event => { setDraft(event.target.value); setNotice(''); }} placeholder="게시할 글을 붙여 넣고 확인하세요. 이름은 학생 A, 교사 B처럼 바꿔 주세요." aria-describedby="privacy-check-status privacy-check-limit" />
          <p id="privacy-check-status" role="status" className={issues.length ? 'materials-warning' : 'materials-hint'}>
            {!privacy ? '검사 도구를 불러오지 못했습니다. 새로고침 후 다시 확인해 주세요.' : issues.length ? `${labels} ${issues.length}건을 감지했습니다. 가린 뒤 복사해 주세요.` : draft ? '자동 검사에서 감지한 항목이 없습니다. 내용을 직접 확인한 뒤 복사하세요.' : '글을 입력하면 자동으로 확인합니다.'}
          </p>
          <div className="materials-actions">
            <button type="button" className="admin-btn-secondary" onClick={maskDraft} disabled={!privacy || !issues.length}>개인정보 가리기</button>
            <button type="button" className="admin-login-btn" onClick={copyDraft} disabled={!privacy || !draft.trim() || issues.length > 0}>확인한 글 복사</button>
          </div>
          <p role="status" className="materials-hint">{notice}</p>
          <p id="privacy-check-limit" className="materials-hint">이름·얼굴·주소·학생을 특정하는 조합은 자동으로 찾지 못할 수 있습니다. <a href="./privacy-guidelines.html">게시 원칙 확인하기</a></p>
        </section>
        <div className="admin-columns-grid">
          <section className="admin-card" aria-labelledby="materials-heading">
            <div className="admin-card-head"><h2 id="materials-heading">자료와 도구</h2></div>
            <div className="admin-service-list">{materials.map(([title, description, href]) => (
              <div key={href} className="admin-service-item"><div className="admin-service-info"><div><strong>{title}</strong><span>{description}</span></div></div><a href={href} target="_blank" rel="noreferrer" className="admin-service-btn">열기 ↗</a></div>
            ))}</div>
          </section>
          <section className="admin-card admin-side-card" aria-labelledby="travel-guides-heading">
            <div className="admin-card-head">
              <div>
                <span className="admin-pill">TRAVEL GUIDE · SHARE</span>
                <h2 id="travel-guides-heading" style={{ marginTop: '8px' }}>겨울 간사이 여행가이드</h2>
                <p>첫날 정오 도착 · 마지막 날 19시 이후 귀국편 기준 (개인 이력·지출 제외 공개본)</p>
              </div>
            </div>
            <div className="admin-service-list">{travelGuides.map(([title, description, href]) => (
              <div key={href} className="admin-service-item">
                <div className="admin-service-info">
                  <div>
                    <strong>{title}</strong>
                    <span>{description}</span>
                  </div>
                </div>
                <div className="admin-service-actions">
                  <button type="button" className="admin-service-btn-ghost" onClick={() => copyGuideLink(title, href)}>링크 복사</button>
                  <a href={href} target="_blank" rel="noreferrer" className="admin-service-btn">열기 ↗</a>
                </div>
              </div>
            ))}</div>
            <div className="admin-share-footer">
              <button type="button" className="admin-login-btn" onClick={copyAllTravelLinks}>전체 공유 링크 한 번에 복사</button>
              {shareNotice && <p role="status" className="materials-hint" style={{ marginTop: '10px', marginBottom: 0 }}>{shareNotice}</p>}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
