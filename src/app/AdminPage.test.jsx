import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import '../../public/shared/privacy-guard.js';
import AdminPage from './AdminPage';

describe('public-safe materials room', () => {
  beforeEach(() => { sessionStorage.clear(); localStorage.clear(); });
  afterEach(() => { cleanup(); vi.restoreAllMocks(); });

  it('explains the public nature before showing the tools', () => {
    render(<MemoryRouter><AdminPage /></MemoryRouter>);
    expect(screen.getByText(/주소를 아는 사람은 열 수 있습니다/)).toBeInTheDocument();
    expect(screen.queryByLabelText('게시할 글')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '게시 원칙 확인하고 열기' }));
    expect(screen.getByLabelText('게시할 글')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '게시 원칙 확인하기' })).toHaveAttribute('href', './privacy-guidelines.html');
  });

  it('refuses copying personal data and copies only the explicitly masked draft', async () => {
    sessionStorage.setItem('seung_materials_guideline_seen_v1', 'yes');
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
    render(<MemoryRouter><AdminPage /></MemoryRouter>);
    const input = screen.getByLabelText('게시할 글');
    const phone = ['010', '2345', '6789'].join('-');
    fireEvent.change(input, { target: { value: `학생 A 연락 ${phone}` } });
    expect(screen.getByRole('button', { name: '확인한 글 복사' })).toBeDisabled();
    expect(writeText).not.toHaveBeenCalled();
    expect([...Object.values(localStorage), ...Object.values(sessionStorage)].join(' ')).not.toContain(phone);
    fireEvent.click(screen.getByRole('button', { name: '개인정보 가리기' }));
    expect(input.value).not.toContain(phone);
    expect(input.value).toContain('[휴대전화번호 가림]');
    fireEvent.click(screen.getByRole('button', { name: '확인한 글 복사' }));
    expect(writeText).toHaveBeenCalledWith('학생 A 연락 [휴대전화번호 가림]');
  });
});
