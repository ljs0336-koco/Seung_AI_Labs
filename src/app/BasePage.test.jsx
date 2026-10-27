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

describe('나만의 기지', () => {
  beforeEach(() => { mockData(); vi.stubGlobal('location', { hostname: 'example.com', href: 'https://example.com/#/base' }); });
  afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

  it('opens directly and connects live briefing, shelves and attached manuals', async () => {
    show();
    expect(screen.getByRole('heading', { level: 1, name: '나만의 기지' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '게시 원칙 확인하고 열기' })).not.toBeInTheDocument();
    expect(await screen.findByRole('link', { name: '돈구리 매뉴얼' })).toHaveAttribute('href', './slides/manual_guil.html');
    expect(await screen.findByRole('link', { name: /AI 리터러시·시민성/ })).toHaveAttribute('href', './library/index.html#shelf-A');
    expect(screen.getByRole('button', { name: '교육 챗봇 소식 공유' })).toHaveAttribute('data-share-id', 'news-stable');
    expect(screen.getByText('저자 A · 동료심사 저널')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: '자료 편집' })).not.toBeInTheDocument();
  });

  it('finds authors in the full paper index and attached materials', async () => {
    show();
    await screen.findByRole('link', { name: '돈구리 매뉴얼' });
    const input = screen.getByRole('searchbox', { name: '자료·논문·저자 찾기' });
    fireEvent.change(input, { target: { value: 'Kim' } });
    const results = within(document.getElementById('base-results'));
    expect(await results.findByRole('link', { name: /이전 입고 연구/ })).toHaveAttribute('href', './library/index.html#no-001');
    fireEvent.change(input, { target: { value: '매뉴얼' } });
    expect(results.getByRole('link', { name: /돈구리 매뉴얼/ })).toHaveAttribute('href', './slides/manual_guil.html');
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(document.getElementById('base-results')).not.toBeVisible();
  });

  it('copies deployed addresses on local previews and exposes editing only locally', async () => {
    vi.stubGlobal('location', { hostname: 'localhost', href: 'http://localhost:5173/#/base' });
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
    show();
    expect(screen.getByRole('link', { name: '자료 편집' })).toHaveAttribute('href', 'http://127.0.0.1:8788/__manage/');
    await screen.findByText('경제 습관 게임');
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
    expect(screen.getByRole('link', { name: '돈구리 매뉴얼' })).toHaveAttribute('href', './slides/manual_guil.html');
  });
});
