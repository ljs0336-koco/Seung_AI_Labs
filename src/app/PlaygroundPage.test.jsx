import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import * as domMatchers from '@testing-library/jest-dom/matchers';
import PlaygroundPage from './PlaygroundPage';

expect.extend(domMatchers);

const terrarium = { id: 'terrarium', title: '작은별 테라리움', description: '캐릭터와 함께하는 3D 미니어처', href: './apps/terrarium/index.html', section: 'playground', placement: 'base', status: 'candidate' };
function catalogResponse(items) {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ schemaVersion: 1, items }) }));
}
function show() { return render(<MemoryRouter><PlaygroundPage /></MemoryRouter>); }

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe('AI 놀이터', () => {
  it('exhibits the current catalog item with a clear working destination and lightweight illustration', async () => {
    catalogResponse([terrarium]);
    const { container } = show();
    expect(screen.getByRole('heading', { name: 'AI 놀이터', level: 1 })).toBeInTheDocument();
    expect(await screen.findByRole('link', { name: '작은별 테라리움 열기' })).toHaveAttribute('href', './apps/terrarium/index.html');
    expect(screen.getAllByRole('article')).toHaveLength(1);
    expect(screen.getByText('1개의 산출물')).toBeInTheDocument();
    expect(container.querySelector('.playground-visual svg')).not.toBeNull();
    expect(container.querySelector('iframe, canvas')).toBeNull();
    expect(screen.getByRole('link', { name: '← 통합 포털' })).toHaveAttribute('href', '/');
    expect(screen.getAllByRole('link').some(link => /\/(base|admin|materials)(?:[/?#]|$)/.test(link.getAttribute('href') || ''))).toBe(false);
    expect(screen.queryByRole('link', { name: /기지/ })).not.toBeInTheDocument();
  });

  it('grows from new catalog items and excludes archives, locked items and other sections', async () => {
    catalogResponse([
      terrarium,
      { ...terrarium, id: 'second', title: '새로 등록한 실험', href: './experiments/new/index.html', status: 'live', placement: 'both' },
      { ...terrarium, id: 'archived', title: '보관된 실험', placement: 'archive' },
      { ...terrarium, id: 'locked', title: '잠긴 실험', status: 'locked' },
      { ...terrarium, id: 'orphan', title: '연결 없는 실험', status: 'orphan' },
      { ...terrarium, id: 'lecture', title: '다른 구역 자료', section: 'lecture' },
    ]);
    show();
    expect(await screen.findByRole('link', { name: '새로 등록한 실험 열기' })).toHaveAttribute('href', './experiments/new/index.html');
    expect(screen.getAllByRole('article')).toHaveLength(2);
    expect(screen.getByText('2개의 산출물')).toBeInTheDocument();
    for (const name of ['보관된 실험', '잠긴 실험', '연결 없는 실험', '다른 구역 자료']) expect(screen.queryByRole('link', { name: `${name} 열기` })).not.toBeInTheDocument();
  });

  it('shows an honest empty state without inventing additional exhibits', async () => {
    catalogResponse([]);
    show();
    expect(await screen.findByText('표시할 산출물이 없습니다.')).toBeInTheDocument();
    expect(screen.queryByRole('article')).not.toBeInTheDocument();
    expect(screen.getByText('0개의 산출물')).toBeInTheDocument();
  });

  it('returns to the public portal without exposing the base when the catalog cannot be loaded', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    show();
    expect(await screen.findByText(/산출물 목록을 불러오지 못했습니다/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '통합 포털로 돌아가기 ↗' })).toHaveAttribute('href', '/');
    expect(screen.getAllByRole('link').some(link => /\/(base|admin|materials)(?:[/?#]|$)/.test(link.getAttribute('href') || ''))).toBe(false);
    expect(screen.queryByRole('link', { name: /기지/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('article')).not.toBeInTheDocument();
  });
});
