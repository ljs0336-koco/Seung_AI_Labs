import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import * as domMatchers from '@testing-library/jest-dom/matchers';
import AdminPage from './AdminPage';

expect.extend(domMatchers);

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
describe('legacy materials component', () => {
  it('opens the base without the former entry gate or posting tool', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    render(<MemoryRouter><AdminPage /></MemoryRouter>);
    expect(screen.getByRole('heading', { name: '나만의 기지', level: 1 })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '게시 원칙 확인하고 열기' })).not.toBeInTheDocument();
    expect(screen.queryByLabelText('게시할 글')).not.toBeInTheDocument();
    expect(await screen.findByRole('link', { name: '포털 ↗' })).toHaveAttribute('href', '/');
    expect(screen.getByRole('link', { name: '브리핑 열기 ↗' })).toHaveAttribute('href', './briefing/index.html');
  });
});
