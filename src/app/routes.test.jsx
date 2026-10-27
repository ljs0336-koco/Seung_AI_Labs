import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as domMatchers from '@testing-library/jest-dom/matchers';
import AppRoutes from './routes';
import { BASE_PATH, MATERIALS_PATH } from './materialsRoute';

expect.extend(domMatchers);

vi.mock('./Home', () => ({ default: () => <h1>공개 학습</h1> }));

describe('portal and base routes', () => {
  beforeEach(() => { vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('metadata unavailable'))); });
  afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
  it.each([BASE_PATH, MATERIALS_PATH, '/admin'])('opens the base directly at %s without a gate', async path => {
    render(<MemoryRouter initialEntries={[path]}><AppRoutes /></MemoryRouter>);
    expect(await screen.findByRole('heading', { name: '나만의 기지', level: 1 })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '게시 원칙 확인하고 열기' })).not.toBeInTheDocument();
  });
  it('keeps the public learning path available', () => {
    render(<MemoryRouter initialEntries={['/literacy']}><AppRoutes /></MemoryRouter>);
    expect(screen.getByRole('heading', { name: '공개 학습' })).toBeInTheDocument();
  });
});
