import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import AppRoutes from './routes';
import { MATERIALS_PATH } from './materialsRoute';

vi.mock('./Home', () => ({ default: () => <h1>공개 학습</h1> }));

describe('public portal and unlisted materials', () => {
  beforeEach(() => { sessionStorage.clear(); localStorage.clear(); });
  afterEach(cleanup);
  it('keeps the materials address out of the portal and old admin route', () => {
    const view = render(<MemoryRouter initialEntries={['/admin']}><AppRoutes /></MemoryRouter>);
    expect(screen.getByRole('heading', { name: 'Seung AI Labs', level: 1 })).toBeInTheDocument();
    expect(view.container.querySelector(`a[href*="${MATERIALS_PATH}"]`)).toBeNull();
    expect(view.container.querySelector('a[href="#/admin"]')).toBeNull();
    expect(screen.getByRole('link', { name: /브리핑 읽기/ })).toHaveAttribute('href', './briefing/index.html');
  });
  it('opens the unlisted room only at its own route', async () => {
    render(<MemoryRouter initialEntries={[MATERIALS_PATH]}><AppRoutes /></MemoryRouter>);
    expect(await screen.findByRole('button', { name: '게시 원칙 확인하고 열기' })).toBeInTheDocument();
  });
  it('does not ask for a participant code in public learning routes', () => {
    localStorage.setItem('seung_security_config_v1', JSON.stringify({ isLocked: true }));
    render(<MemoryRouter initialEntries={['/literacy']}><AppRoutes /></MemoryRouter>);
    expect(screen.getByRole('heading', { name: '공개 학습' })).toBeInTheDocument();
    expect(screen.queryByText('참여자 인증이 필요합니다')).not.toBeInTheDocument();
  });
});
