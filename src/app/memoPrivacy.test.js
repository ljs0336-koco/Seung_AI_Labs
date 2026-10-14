// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { URL as NodeURL } from 'node:url';
import { JSDOM } from 'jsdom';
import { afterEach, describe, expect, it, vi } from 'vitest';

const html = readFileSync(new NodeURL('../../public/hub/snu/index.html', import.meta.url), 'utf8');
const guardSource = readFileSync(new NodeURL('../../public/shared/privacy-guard.js', import.meta.url), 'utf8');
const mobile = ['010', '2846', '7395'].join('-');
const activeDoms = [];

function createMemoHarness({ withGuard = true } = {}) {
  // No resources option: JSDOM never loads the HTML's external resources.
  // outside-only also leaves inline handlers and initialization scripts inactive.
  const dom = new JSDOM(html, {
    url: 'https://example.invalid/hub/snu/',
    runScripts: 'outside-only',
  });
  activeDoms.push(dom);
  const { window: memoWindow } = dom;
  const { document: memoDocument } = memoWindow;
  const fetchMock = vi.fn().mockResolvedValue({ json: async () => [] });
  memoWindow.fetch = fetchMock;
  memoWindow.setTimeout = vi.fn(() => 0);
  memoWindow.clearTimeout = vi.fn();
  const addWindowListener = memoWindow.addEventListener.bind(memoWindow);
  memoWindow.addEventListener = (type, listener, options) => {
    if (type !== 'DOMContentLoaded') addWindowListener(type, listener, options);
  };

  if (withGuard) memoWindow.eval(guardSource);
  const appSource = Array.from(memoDocument.scripts)
    .find((script) => script.textContent.includes('function handleAddNote()'))?.textContent;
  if (!appSource) throw new Error('Memo controller script not found');
  const isolatedSource = appSource.replace(
    /\bconst\s+CLOUD_MEMO_API\s*=\s*["'][^"']+["'];/,
    'const CLOUD_MEMO_API = "https://example.invalid/memos";',
  );
  if (isolatedSource === appSource) throw new Error('Memo endpoint isolation did not match');
  memoWindow.eval(isolatedSource);

  return {
    window: memoWindow,
    document: memoDocument,
    fetchMock,
    setDraft(author, content) {
      memoDocument.getElementById('note-author-input').value = author;
      memoDocument.getElementById('note-input').value = content;
    },
  };
}

function expectUnposted(harness) {
  expect(harness.fetchMock).not.toHaveBeenCalled();
  expect(harness.window.localStorage.getItem('seung_memo_author')).toBeNull();
  expect(harness.document.querySelector('.note-like-button')).toBeNull();
}

afterEach(() => {
  activeDoms.splice(0).forEach((dom) => dom.window.close());
  vi.restoreAllMocks();
});

describe('shared memo privacy integration', () => {
  it('blocks a phone in content before posting, saving an author, or adding a note', () => {
    const harness = createMemoHarness();
    harness.setDraft('교사 B', `연락처 ${mobile}`);

    harness.window.handleAddNote();

    expectUnposted(harness);
    expect(harness.document.getElementById('note-input').getAttribute('aria-invalid')).toBe('true');
    expect(harness.document.getElementById('note-privacy-status').textContent).toContain('전송하지 않았습니다');
    expect(harness.document.getElementById('note-mask-button').classList.contains('hidden')).toBe(false);
  });

  it('also blocks a phone appearing only in the author', () => {
    const harness = createMemoHarness();
    harness.setDraft(`교사 B ${mobile}`, '질문 활동을 함께 만들어요.');

    harness.window.handleAddNote();

    expectUnposted(harness);
    expect(harness.document.getElementById('note-author-input').getAttribute('aria-invalid')).toBe('true');
    expect(harness.document.getElementById('note-input').getAttribute('aria-invalid')).toBe('false');
  });

  it('shows a masked draft without posting, then posts only that draft on a separate registration', () => {
    const harness = createMemoHarness();
    harness.setDraft(`교사 B ${mobile}`, `질문 ${mobile}`);
    harness.window.handleAddNote();

    harness.window.maskNoteDraft();

    expectUnposted(harness);
    expect(harness.document.getElementById('note-author-input').value).toBe('교사 B [휴대전화번호 가림]');
    expect(harness.document.getElementById('note-input').value).toBe('질문 [휴대전화번호 가림]');
    expect(harness.document.getElementById('note-privacy-status').textContent).toContain('공유 등록을 다시');

    harness.window.handleAddNote();

    expect(harness.fetchMock).toHaveBeenCalledTimes(1);
    const [endpoint, request] = harness.fetchMock.mock.calls[0];
    expect(endpoint).toBe('https://example.invalid/memos');
    expect(request.method).toBe('POST');
    expect(JSON.parse(request.body)).toMatchObject({
      author: '교사 B [휴대전화번호 가림]',
      content: '질문 [휴대전화번호 가림]',
    });
    expect(request.body).not.toContain(mobile);
    expect(harness.window.localStorage.getItem('seung_memo_author')).toBe('교사 B [휴대전화번호 가림]');
  });

  it('fails closed for memo submission when the privacy guard is unavailable', () => {
    const harness = createMemoHarness({ withGuard: false });
    harness.setDraft('교사 B', '개인정보 없는 수업 아이디어입니다.');

    harness.window.handleAddNote();

    expectUnposted(harness);
    expect(harness.document.getElementById('note-input').value).toBe('개인정보 없는 수업 아이디어입니다.');
    expect(harness.document.getElementById('note-privacy-status').textContent).toContain('전송할 수 없습니다');
  });

  it('masks remote text, escapes HTML, and binds likes without inserting a remote id into an event', async () => {
    const harness = createMemoHarness();
    const remoteId = "remote');window.__memoInjected=true;//";
    const remoteContent = `<img src=x onerror="window.__memoInjected=true"> 연락 ${mobile}`;
    harness.fetchMock.mockResolvedValueOnce({
      json: async () => [{
        id: remoteId,
        author: `<svg onload="window.__memoInjected=true"></svg> ${mobile}`,
        content: remoteContent,
        time: `시각 <b>확인</b> ${mobile}`,
        teamId: `<em>팀</em> ${mobile}`,
        tag: 'idea',
      }],
    });

    harness.window.loadCloudNotes(true);
    for (let step = 0; step < 6; step += 1) await Promise.resolve();

    const feed = harness.document.getElementById('notes-feed-list');
    expect(feed.textContent).toContain('[휴대전화번호 가림]');
    expect(feed.textContent).toContain('<img src=x');
    expect(feed.textContent).toContain('<svg onload=');
    expect(feed.textContent).toContain('<b>확인</b>');
    expect(feed.textContent).toContain('<em>팀</em>');
    expect(feed.textContent).not.toContain(mobile);
    expect(feed.querySelector('img, svg, script, b, em')).toBeNull();
    expect(feed.innerHTML).not.toContain(remoteId);
    const likeButton = feed.querySelector('.note-like-button');
    expect(likeButton.getAttribute('onclick')).toBeNull();
    expect(likeButton.dataset.noteIndex).toBe('0');

    likeButton.click();

    expect(feed.textContent).toContain('공감 1');
    expect(harness.window.__memoInjected).toBeUndefined();
    expect(harness.fetchMock).toHaveBeenCalledTimes(1);
    expect(harness.fetchMock.mock.calls[0][0]).toMatch(/^https:\/\/example\.invalid\/memos\?/);
    expect(harness.fetchMock.mock.calls[0][1]).toBeUndefined();
  });
});
