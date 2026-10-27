import React from 'react';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import * as domMatchers from '@testing-library/jest-dom/matchers';
import Portal from './Portal';

expect.extend(domMatchers);

function mockCatalog(items) {
  vi.stubGlobal('fetch', vi.fn(async path => ({ ok: true, json: async () => String(path).includes('catalog') ? { schemaVersion: 1, items } : { date: '2026-10-27' } })));
}
function item(id, href, placement = 'both') { return { id, title: id, href, section: 'showcase', placement, status: 'live' }; }
const primary = [item('literacy', '#/literacy'), item('hub', './hub/index.html'), item('deck', './deck/index.html'), item('briefing', './briefing/index.html')];

describe('catalog-connected portal', () => {
  afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
  it('uses the latest edition and actual four lab links while preserving the two pillars', async () => {
    mockCatalog(primary);
    render(<MemoryRouter><Portal /></MemoryRouter>);
    expect(await screen.findByText('2026.10.27')).toHaveAttribute('datetime', '2026-10-27');
    for (const [name, href] of [['공정한 AI 실험실', '#/fairness'], ['진실·미디어 검증소', '#/verification'], ['AI에게 무엇을 맡길까?', '#/role'], ['AI가 대신 움직인다면?', '#/agent']]) {
      expect(screen.getByRole('link', { name: new RegExp(name.replace(/[?]/g, '\\?')) })).toHaveAttribute('href', href);
    }
    expect(screen.getByRole('heading', { name: 'AI 교육 특강 허브' })).toBeInTheDocument();
    expect(screen.queryByText('통학 데이터 탐구 웹앱 (v2)')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: '나만의 기지' })).toHaveAttribute('href', '/base');
  });

  it('applies portal visibility to primary cards and extra items', async () => {
    mockCatalog([...primary.map(entry => ({ ...entry, placement: 'base' })), { ...item('extra', './apps/terrarium/index.html'), title: '새 공개 자료', description: '공개 자료 설명' }]);
    render(<MemoryRouter><Portal /></MemoryRouter>);
    await screen.findByRole('heading', { name: '더 둘러보기' });
    await waitFor(() => expect(screen.queryByRole('heading', { name: 'AI 교육 특강 허브' })).not.toBeInTheDocument());
    expect(screen.queryByRole('link', { name: /브리핑 읽기/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /매거진 읽기/ })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /새 공개 자료/ })).toHaveAttribute('href', './apps/terrarium/index.html');
    expect(screen.getByRole('heading', { name: 'Seung AI Labs', level: 1 })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '나만의 기지' })).toBeInTheDocument();
  });
});
