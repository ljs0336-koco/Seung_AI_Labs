import { useEffect, useState } from 'react';

export const PUBLIC_SITE_URL = 'https://ljs0336-koco.github.io/Seung_AI_Labs/';

// A failed metadata request still leaves the established public entrances usable.
export const FALLBACK_CATALOG = {
  schemaVersion: 1,
  revision: 'fallback',
  siteUrl: PUBLIC_SITE_URL,
  items: [
    { id: 'briefing', title: 'AI·교육 브리핑', description: '사업 제안 기회와 AI 뉴스', href: './briefing/index.html', section: 'today', placement: 'both', status: 'live' },
    { id: 'library', title: '연구 서고', description: 'AI 교육 연구와 인용 자료', href: './library/index.html', section: 'library', placement: 'base', status: 'live' },
    { id: 'code-masterplan', title: '운영 마스터플랜', description: 'C.O.D.E 일정과 역할 분담', href: './slides/masterplan.html', section: 'code', placement: 'base', status: 'live' },
    { id: 'code-desk', title: '관제 데스크', description: '체크리스트와 멘토링 일지', href: './slides/operations_desk.html', section: 'code', placement: 'base', status: 'live' },
    { id: 'code-round1', title: '1차 멘토링 보드', description: '사전질문과 팀별 피드백', href: './slides/mentoring_round1.html', section: 'code', placement: 'base', status: 'live' },
    { id: 'code-partner-guide', title: '협업 안내서', description: '앱 개발 협업과 피드백', href: './slides/expert_guide.html', section: 'code', placement: 'base', status: 'live' },
    { id: 'donguri', title: '돈구리', description: '학생용 경제 습관 게임', href: './apps/donguri/index.html', section: 'code', placement: 'base', status: 'live' },
    { id: 'donguri-manual', title: '돈구리 매뉴얼', href: './slides/manual_guil.html', parent: 'donguri', section: 'code', placement: 'base', status: 'live' },
    { id: 'studybuddy', title: 'STUDY-BUDDY', description: '학생용 학습 버디', href: './apps/studybuddy/index.html', section: 'code', placement: 'base', status: 'live' },
    { id: 'studybuddy-manual', title: 'STUDY-BUDDY 매뉴얼', href: './slides/manual_okjong.html', parent: 'studybuddy', section: 'code', placement: 'base', status: 'live' },
    { id: 'hub', title: 'AI 교육 특강 허브', description: '교사·예비교원 특강과 로보독 실습', href: './hub/index.html', section: 'lecture', placement: 'both', status: 'live' },
    { id: 'padlet-ai-training', title: 'AI 연수·특강 자료 · Padlet', description: '연수와 특강에서 사용하는 패들렛 자료', href: 'https://padlet.com/jaeseungtek/ai-8js4uzp6xqxjztbf', section: 'lecture', placement: 'base', status: 'live' },
    { id: 'literacy', title: '초등 AI 리터러시 탐험 연구소', description: '네 가지 인터랙티브 실험실', href: '#/literacy', section: 'showcase', placement: 'both', status: 'live' },
    { id: 'deck', title: 'The Curated Mind', edition: 'VOL.02', description: 'AI의 답에 담긴 기준과, 목적에 맞는 AI의 통제 범위', href: './deck/vol02/index.html', children: [{title:'Vol.01 · The Agentic Shift',href:'./deck/index.html'}], section: 'showcase', placement: 'both', status: 'live' },
    { id: 'playground', title: 'AI 놀이터', description: 'AI로 만든 실험과 산출물이 모이는 공간', href: '#/playground', section: 'showcase', placement: 'both', status: 'live' },
    { id: 'terrarium', title: '작은별 테라리움', description: 'AI 활용 산출물 · 코코·금쪽이·로보독 3D 미니어처', href: './apps/terrarium/index.html', section: 'playground', placement: 'base', status: 'live' },
    { id: 'kansai', title: 'KANSAI NOTES · 겨울 간사이 3박 4일', description: '취향별 두 여행가이드', href: './kansai-travel-guide/index.html', section: 'personal', placement: 'base', status: 'live' },
    { id: 'kansai-couple', title: '느긋한 커플편', href: './kansai-travel-guide/couple.html', parent: 'kansai', section: 'personal', placement: 'base', status: 'live' },
    { id: 'kansai-pokemon', title: '포켓몬 원정대편', href: './kansai-travel-guide/pokemon.html', parent: 'kansai', section: 'personal', placement: 'base', status: 'live' },
  ],
};

export function safeContentHref(value) {
  if (typeof value !== 'string') return '';
  const href = value.trim();
  if (!href || [...href].some(character => character.charCodeAt(0) < 32) || href.includes('\\') || href.startsWith('//')) return '';
  if (/^[a-z][a-z\d+.-]*:/i.test(href) && !/^https?:\/\//i.test(href)) return '';
  if (href.startsWith('#') && !href.startsWith('#/')) return '';
  return href;
}

export function publicUrl(href, siteUrl = PUBLIC_SITE_URL) {
  const safeHref = safeContentHref(href);
  if (!safeHref) return '';
  try {
    const base = new URL(siteUrl || PUBLIC_SITE_URL);
    if (!['http:', 'https:'].includes(base.protocol)) return '';
    return new URL(safeHref, base).href;
  } catch {
    return '';
  }
}

export function normalizeCatalog(value) {
  if (!value || value.schemaVersion !== 1 || !Array.isArray(value.items)) throw new Error('목록 형식을 확인할 수 없습니다.');
  const seen = new Set();
  const items = value.items.filter(item => {
    if (!item || typeof item.id !== 'string' || seen.has(item.id) || typeof item.title !== 'string' || !safeContentHref(item.href)) return false;
    seen.add(item.id);
    return true;
  }).map(item => ({ ...item, href: safeContentHref(item.href) }));
  return { ...value, siteUrl: value.siteUrl || PUBLIC_SITE_URL, items };
}

export function useJsonResource(path, fallback = null, normalize) {
  const [state, setState] = useState({ data: fallback, loading: true, error: null });
  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    async function read() {
      try {
        const response = await fetch(path, { signal: controller.signal, cache: 'no-cache' });
        if (!response.ok) throw new Error('자료를 불러오지 못했습니다.');
        const value = await response.json();
        const data = normalize ? normalize(value) : value;
        if (active) setState({ data, loading: false, error: null });
      } catch (error) {
        if (active && error.name !== 'AbortError') setState({ data: fallback, loading: false, error: error.message });
      }
    }
    read();
    return () => { active = false; controller.abort(); };
    // Paths and normalizers are module constants. Re-rendering must not re-fetch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path]);
  return state;
}

export default function useCatalog() {
  const state = useJsonResource('./content/catalog.json', FALLBACK_CATALOG, normalizeCatalog);
  return { ...state, catalog: state.data };
}
