import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as domMatchers from '@testing-library/jest-dom/matchers';
import BasePage from './BasePage';

expect.extend(domMatchers);

const catalog = {
  schemaVersion: 1, revision: 1, siteUrl: 'https://ljs0336-koco.github.io/Seung_AI_Labs/',
  items: [
    { id: 'donguri', title: '돈구리', description: '경제 습관 게임', href: './apps/donguri/index.html', section: 'code', placement: 'base', status: 'live', children: [{ title: '돈구리 매뉴얼', href: './slides/manual_guil.html' }] },
    { id: 'playground', title: 'AI 놀이터', href: './#/playground', section: 'showcase', placement: 'portal', children: [{ title: '말랑런', href: './hub/apps/malang_run/index.html' }] },
    { id: 'malang', title: '말랑런', description: '말랑런 원본 게임 설명', href: './hub/apps/malang_run/index.html', section: 'playground', placement: 'base', status: 'live' },
    { id: 'old-app', title: '지난 실습 앱', href: './hub/apps/old/index.html', section: 'archive', placement: 'archive', status: 'orphan' },
  ],
};
const latest = { date: '2026-10-27', collectedAt: '09:58', headlines: [{ id: 'news-stable', title: '교육 챗봇 소식', summary: '교육 뉴스 요약', field: '챗봇', href: './share/news/news-stable/' }], bids: [], editions: [{ date: '2026-10-26', url: './briefing/archive/2026-10-26.html' }] };
const library = {
  total: 50, reviewed: 27, special: 23, shelves: [{ id: 'A', label: 'AI 리터러시·시민성', count: 6 }],
  recent: [{ id: '050', call: 'B-06', title: '최근 입고 연구', authors: '저자 A', kind: 'journal', href: './library/index.html#no-050' }],
  items: [{ id: '001', call: 'C-01', title: '이전 입고 연구', authors: 'Kim Researcher', keywords: ['학습'], href: './library/index.html#no-001' }],
};

function mockData() {
  vi.stubGlobal('fetch', vi.fn(async path => ({ ok: true, json: async () => String(path).includes('catalog') ? catalog : String(path).includes('latest') ? latest : library })));
}
function show() { return render(<MemoryRouter><BasePage /></MemoryRouter>); }
async function revealManual() {
  await waitFor(() => expect(document.querySelector('[data-id="donguri"]')).toBeInTheDocument());
  fireEvent.click(screen.getByRole('button', { name: 'C.O.D.E' }));
  fireEvent.click(within(document.querySelector('[data-id="donguri"]')).getByText('연결 자료 1개'));
  return screen.findByRole('link', { name: '돈구리 매뉴얼' });
}

describe('나만의 기지', () => {
  beforeEach(() => { mockData(); vi.stubGlobal('location', { hostname: 'example.com', href: 'https://example.com/#/base' }); });
  afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

  it('opens directly with concise briefing and library entrances', async () => {
    show();
    expect(screen.getByRole('heading', { level: 1, name: '나만의 기지' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '게시 원칙 확인하고 열기' })).not.toBeInTheDocument();
    expect(await screen.findByText('소장 50편')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '서고 열기 ↗' })).toHaveAttribute('href', './library/index.html');
    expect(screen.queryByRole('link', { name: /AI 리터러시·시민성/ })).not.toBeInTheDocument();
    expect(screen.queryByText('최근 입고 연구')).not.toBeInTheDocument();
    expect(screen.queryByText('교육 뉴스 요약')).not.toBeInTheDocument();
    expect(screen.queryByText('최근 1호')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '교육 챗봇 소식 공유' })).toHaveAttribute('data-share-id', 'news-stable');
    expect(screen.queryByRole('link', { name: '자료 편집' })).not.toBeInTheDocument();
  });

  it('keeps mentoring compact and opens its materials from the section shortcut', async () => {
    show();
    await waitFor(() => expect(document.querySelector('[data-id="donguri"]')).toBeInTheDocument());
    expect(screen.getByRole('link', { name: '돈구리', hidden: true })).not.toBeVisible();
    const manual = await revealManual();
    expect(manual).toBeVisible();
    expect(manual).toHaveAttribute('href', './slides/manual_guil.html');
  });

  it('finds authors in the full paper index and attached materials', async () => {
    show();
    await waitFor(() => expect(document.querySelector('[data-id="donguri"]')).toBeInTheDocument());
    const input = screen.getByRole('searchbox', { name: '자료·논문·저자 찾기' });
    fireEvent.change(input, { target: { value: 'Kim' } });
    const results = within(document.getElementById('base-results'));
    expect(await results.findByRole('link', { name: /이전 입고 연구/ })).toHaveAttribute('href', './library/index.html#no-001');
    fireEvent.change(input, { target: { value: '매뉴얼' } });
    expect(results.getByRole('link', { name: /돈구리 매뉴얼/ })).toHaveAttribute('href', './slides/manual_guil.html');
    expect(document.querySelector('.p-code .catalog-fold')).not.toHaveAttribute('open');
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(document.getElementById('base-results')).not.toBeVisible();
  });

  it('groups playground apps under one entrance while retaining their search links', async () => {
    show();
    expect(await screen.findByRole('link', { name: 'AI 놀이터' })).toHaveAttribute('href', './#/playground');
    expect(document.querySelector('[data-id="malang"]')).not.toBeInTheDocument();
    expect(within(document.querySelector('[data-id="playground"]')).getByRole('link', { name: '말랑런', hidden: true })).not.toBeVisible();
    fireEvent.change(screen.getByRole('searchbox', { name: '자료·논문·저자 찾기' }), { target: { value: '말랑런' } });
    const results = within(document.getElementById('base-results'));
    expect(results.getAllByRole('link').filter(link => link.getAttribute('href') === './hub/apps/malang_run/index.html')).toHaveLength(1);
    const result = results.getByRole('link', { name: /말랑런/ });
    expect(result).toHaveAttribute('href', './hub/apps/malang_run/index.html');
    expect(within(result).getByText('AI 놀이터')).toBeInTheDocument();
    expect(within(result).getByText('말랑런 원본 게임 설명')).toBeInTheDocument();
  });

  it('copies deployed addresses on local previews and exposes editing only locally', async () => {
    vi.stubGlobal('location', { hostname: 'localhost', href: 'http://localhost:5173/#/base' });
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
    show();
    expect(screen.getByRole('link', { name: '자료 편집' })).toHaveAttribute('href', 'http://127.0.0.1:8788/__manage/');
    await revealManual();
    fireEvent.click(screen.getByRole('button', { name: '돈구리 매뉴얼 링크 복사' }));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith('https://ljs0336-koco.github.io/Seung_AI_Labs/slides/manual_guil.html'));
    expect(writeText.mock.calls[0][0]).not.toContain('localhost');
  });

  it('opens the archive from its section button', async () => {
    show();
    await waitFor(() => expect(document.querySelector('[data-id="old-app"]')).toBeInTheDocument());
    expect(document.getElementById('base-archive')).not.toHaveAttribute('open');
    fireEvent.click(screen.getByRole('button', { name: /보관함/ }));
    expect(document.getElementById('base-archive')).toHaveAttribute('open');
  });

  it('retains usable public entrances when metadata cannot be fetched', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    show();
    await screen.findByText('자료 목록을 불러오지 못해 기본 링크를 표시합니다.');
    expect(screen.getByRole('link', { name: '브리핑 열기 ↗' })).toHaveAttribute('href', './briefing/index.html');
    expect(screen.getByRole('link', { name: '서고 열기 ↗' })).toHaveAttribute('href', './library/index.html');
    await revealManual();
    expect(screen.getByRole('link', { name: '돈구리 매뉴얼' })).toHaveAttribute('href', './slides/manual_guil.html');
  });
});
