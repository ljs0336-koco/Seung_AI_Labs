import React from 'react';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import * as domMatchers from '@testing-library/jest-dom/matchers';
import Portal from './Portal';
expect.extend(domMatchers);
function item(id, title, href, placement='both') { return {id,title,href,section:'showcase',placement,status:'live'}; }
const primary=[item('literacy','AI 리터러시 연구소','#/literacy'),item('hub','AI 교육 특강 허브','./hub/index.html'),item('playground','AI 놀이터','#/playground'),item('deck','The Agentic Shift','./deck/index.html'),item('briefing','AI·교육 브리핑','./briefing/index.html')];
function mockCatalog(items) { vi.stubGlobal('fetch',vi.fn(async path=>({ok:true,json:async()=>String(path).includes('catalog')?{schemaVersion:1,items}:{date:'2026-10-27'}}))); }
describe('catalog-connected orbital portal',()=>{
 afterEach(()=>{cleanup();vi.unstubAllGlobals();});
 it('opens the three educational spaces while keeping publications separate',async()=>{
  mockCatalog(primary);render(<MemoryRouter><Portal /></MemoryRouter>);
  expect(await screen.findByText('2026.10.27')).toHaveAttribute('datetime','2026-10-27');
  const map=within(screen.getByRole('region',{name:'Seung의 탐험 지도'}));
  expect(map.getAllByRole('link')).toHaveLength(3);
  for(const entry of primary.slice(0,3))expect(map.getByRole('link',{name:new RegExp(entry.title)})).toHaveAttribute('href',entry.href);
  expect(map.queryByRole('link',{name:/The Agentic Shift/})).not.toBeInTheDocument();
  expect(screen.getByRole('link',{name:/매거진 읽기/})).toHaveAttribute('href','./deck/index.html');
  expect(screen.getByText('MAGAZINE')).toBeInTheDocument();
  expect(screen.getByRole('link',{name:/브리핑 읽기/})).toHaveAttribute('href','./briefing/index.html');
  expect(screen.getByRole('button',{name:'통합포털 QR 코드 크게 보기'})).toBeInTheDocument();
  expect(screen.getAllByRole('link').some(link=>link.getAttribute('href')?.includes('#/base'))).toBe(false);
  const publications=screen.getByRole('region',{name:'매거진과 AI 교육 브리핑'});
  const atlas=screen.getByRole('region',{name:'수업과 실험의 작은 우주'});
  expect(publications.compareDocumentPosition(atlas) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  fireEvent.click(screen.getByText('실습·특강 바로가기'));
  for(const [name,href] of [['공정한 AI 실험실','#/fairness'],['진실·미디어 검증소','#/verification'],['AI에게 무엇을 맡길까?','#/role'],['AI가 대신 움직인다면?','#/agent']])expect(screen.getByRole('link',{name:new RegExp(name.replace(/[?]/g,'\\?'))})).toHaveAttribute('href',href);
 });
 it('reads the latest magazine edition and keeps previous issues inside the same publication cell',async()=>{
  const latestIssue={...primary.find(entry=>entry.id==='deck'),title:'The Curated Mind',href:'./deck/vol02/index.html',edition:'VOL.02',children:[{title:'Vol.01 · The Agentic Shift',href:'./deck/index.html'}]};
  mockCatalog(primary.map(entry=>entry.id==='deck'?latestIssue:entry));
  render(<MemoryRouter><Portal /></MemoryRouter>);
  expect(await screen.findByRole('link',{name:'The Curated Mind'})).toHaveAttribute('href','./deck/vol02/index.html');
  expect(screen.getByText('MAGAZINE / VOL.02')).toBeInTheDocument();
  expect(screen.getByRole('link',{name:/매거진 읽기/})).toHaveAttribute('href','./deck/vol02/index.html');
  const history=within(screen.getByRole('navigation',{name:'매거진 지난호'}));
  expect(history.getByRole('link',{name:'Vol.01 · The Agentic Shift'})).toHaveAttribute('href','./deck/index.html');
  const publications=within(screen.getByRole('region',{name:'매거진과 AI 교육 브리핑'}));
  expect(publications.getAllByRole('article')).toHaveLength(2);
  const map=within(screen.getByRole('region',{name:'Seung의 탐험 지도'}));
  expect(map.getAllByRole('link')).toHaveLength(3);
  expect(map.getAllByRole('link').some(link=>['./deck/vol02/index.html','./deck/index.html'].includes(link.getAttribute('href')))).toBe(false);
 });
 it('honors hiding and lets a newly promoted resource expand the map',async()=>{
  mockCatalog([...primary.map(x=>({...x,placement:'base'})),item('padlet-ai-training','AI 연수·특강 자료 · Padlet','https://padlet.com/jaeseungtek/ai-8js4uzp6xqxjztbf','base'),item('new-experiment','새 공개 실험','./apps/terrarium/index.html')]);
  render(<MemoryRouter><Portal /></MemoryRouter>);
  const link=await screen.findByRole('link',{name:/새 공개 실험/});expect(link).toHaveAttribute('href','./apps/terrarium/index.html');
  const map=within(screen.getByRole('region',{name:'Seung의 탐험 지도'}));expect(map.getAllByRole('link')).toHaveLength(1);
  expect(screen.queryByRole('link',{name:/매거진 읽기/})).not.toBeInTheDocument();
  expect(screen.queryByText('실습·특강 바로가기')).not.toBeInTheDocument();
  expect(screen.queryByRole('region',{name:'매거진과 AI 교육 브리핑'})).not.toBeInTheDocument();
  expect(screen.queryByRole('link',{name:/Padlet/})).not.toBeInTheDocument();
  expect(screen.getByRole('heading',{name:'Seung AI Labs',level:1})).toBeInTheDocument();
 });
 it('keeps the three entrances usable if catalog loading fails',async()=>{
  vi.stubGlobal('fetch',vi.fn().mockRejectedValue(new Error('offline')));render(<MemoryRouter><Portal /></MemoryRouter>);
  await screen.findByRole('status');
  const map=within(screen.getByRole('region',{name:'Seung의 탐험 지도'}));expect(map.getAllByRole('link')).toHaveLength(3);
  expect(map.getByRole('link',{name:/AI 놀이터/})).toHaveAttribute('href','#/playground');
 });
});

