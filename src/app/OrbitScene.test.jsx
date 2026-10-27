import React from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import * as domMatchers from '@testing-library/jest-dom/matchers';
import OrbitScene from './OrbitScene';

expect.extend(domMatchers);

const spaces = [
  { id: 'reading', title: '읽고 판단하는 실험', description: '근거를 비교하는 활동', href: '#/reading', kind: 'router', label: 'LEARN' },
  { id: 'making', title: '만들어 보는 실험', description: '직접 만드는 활동', href: './apps/making/index.html', kind: 'document', label: 'MAKE' },
  { id: 'exploring', title: '자유롭게 탐험하기', description: '다양한 도구를 탐험하는 활동', href: 'https://example.org/explore', kind: 'link', label: 'EXPLORE' },
];

function mockMotionPreference(initial = false) {
  const listeners = new Set();
  const media = {
    matches: initial,
    media: '(prefers-reduced-motion: reduce)',
    addEventListener: vi.fn((type, callback) => { if (type === 'change') listeners.add(callback); }),
    removeEventListener: vi.fn((type, callback) => { if (type === 'change') listeners.delete(callback); }),
  };
  vi.stubGlobal('matchMedia', vi.fn(() => media));
  return {
    media,
    listeners,
    change(matches) {
      act(() => {
        media.matches = matches;
        for (const callback of listeners) callback({ matches, media: media.media });
      });
    },
  };
}

describe('OrbitScene navigation and motion controls', () => {
  afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

  it('lets the visitor pause and resume without changing destination links', () => {
    mockMotionPreference();
    render(<OrbitScene items={spaces} />);
    const destinations = screen.getAllByRole('link').map(link => link.getAttribute('href'));
    const pause = screen.getByRole('button', { name: /공전 정지/ });
    expect(pause).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(pause);
    expect(screen.getByRole('button', { name: /공전 재개/ })).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(screen.getByRole('button', { name: /공전 재개/ }));
    expect(screen.getByRole('button', { name: /공전 정지/ })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getAllByRole('link').map(link => link.getAttribute('href'))).toEqual(destinations);
  });

  it('responds to motion-preference changes and unsubscribes when removed', () => {
    const preference = mockMotionPreference(true);
    const view = render(<OrbitScene items={spaces} />);
    expect(screen.queryByRole('button', { name: /공전/ })).not.toBeInTheDocument();
    expect(screen.getAllByRole('link')).toHaveLength(3);
    preference.change(false);
    expect(screen.getByRole('button', { name: /공전 정지/ })).toBeInTheDocument();
    preference.change(true);
    expect(screen.queryByRole('button', { name: /공전/ })).not.toBeInTheDocument();
    const subscription = preference.media.addEventListener.mock.calls.find(([type]) => type === 'change')[1];
    view.unmount();
    expect(preference.media.removeEventListener).toHaveBeenCalledWith('change', subscription);
    expect(preference.listeners.size).toBe(0);
  });

  it('accepts added spaces through props and preserves their public addresses and descriptions', () => {
    mockMotionPreference();
    const view = render(<OrbitScene items={spaces} />);
    const additions = [
      { id: 'new-one', title: '새로운 공개 공간', description: '새로 연결한 학습 자료', href: './new-space/index.html' },
      { id: 'new-two', title: '다음 탐험 공간', description: '다섯 번째 목적지', href: '#/next-space' },
    ];
    view.rerender(<OrbitScene items={[...spaces, ...additions]} />);
    expect(screen.getAllByRole('link')).toHaveLength(5);
    for (const item of [...spaces, ...additions]) {
      const link = screen.getByRole('link', { name: new RegExp(item.title) });
      expect(link).toHaveAttribute('href', item.href);
      expect(link).toHaveAccessibleDescription(item.description);
    }
    // A larger collection stays navigable as a fixed map, rather than offering
    // a control that cannot meaningfully animate those extra destinations.
    expect(screen.queryByRole('button', { name: /공전/ })).not.toBeInTheDocument();
  });
});
