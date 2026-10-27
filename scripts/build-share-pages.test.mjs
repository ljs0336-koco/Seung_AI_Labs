import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir, mkdtemp, rm } from 'node:fs/promises';
import { join, resolve, relative, dirname, sep } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { buildSharePages, validateNewsManifest, publicSiteUrl, DEFAULT_SITE_URL } from './build-share-pages.mjs';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const entry = {
  id: 'n-abcdef1234567890', title: '한 건의 AI 뉴스', summary: '요약과 출처를 확인합니다.\n두 번째 문장입니다.',
  source: '공식 연구소', date: '2026-10-27', url: 'https://example.org/news', issue: '2026-10-27', field: 'AI 교육',
};
const manifest = items => ({ schemaVersion: 1, items });

async function fixture(t, input) {
  const parent = resolve(tmpdir());
  const root = await mkdtemp(join(parent, 'seung-share-'));
  t.after(async () => {
    const path = resolve(root), within = relative(parent, path);
    if (!within || within.startsWith('..' + sep) || resolve(path) === parent) throw new Error('Unsafe test cleanup target.');
    await rm(path, { recursive: true, force: true });
  });
  await mkdir(join(root, 'public', 'content'), { recursive: true });
  await mkdir(join(root, 'public', 'shared'), { recursive: true });
  await writeFile(join(root, 'public', 'shared', 'share-default.png'), await readFile(join(projectRoot, 'public', 'shared', 'share-default.png')));
  await writeFile(join(root, 'public', 'content', 'news.json'), JSON.stringify(input));
  return root;
}

test('validates schema, IDs, duplicates, summaries and web-only URLs before writing', async t => {
  for (const invalid of [
    { items: [entry] },
    manifest([{ ...entry, id: '../escape' }]),
    manifest([entry, entry]),
    manifest([{ ...entry, url: 'javascript:alert(1)' }]),
    manifest([{ ...entry, image: 'data:image/png;base64,AA==' }]),
    manifest([{ ...entry, image: '\njavascript:alert(1)' }]),
    manifest([{ ...entry, summary: '' }]),
    manifest([{ ...entry, summary: '가'.repeat(1601) }]),
  ]) assert.throws(() => validateNewsManifest(invalid));
  const root = await fixture(t, manifest([entry, entry]));
  await assert.rejects(buildSharePages({ root }), /Duplicate/);
  await assert.rejects(readFile(join(root, 'public', 'share', 'news', entry.id, 'index.html')), /ENOENT/);
});

test('generates first-HTML OG, stable canonical links and safely escaped text without internal fields', async t => {
  const hostile = { ...entry, title: '<script>alert("x")</script>', summary: 'A & B </script><img src=x onerror=alert(1)>', teamNote: 'INTERNAL_NOTE_SENTINEL' };
  const root = await fixture(t, manifest([hostile]));
  const result = await buildSharePages({ root });
  assert.equal(result.count, 1);
  const html = await readFile(join(root, 'public', 'share', 'news', entry.id, 'index.html'), 'utf8');
  assert.match(html, /property="og:title" content="&lt;script&gt;/);
  assert.match(html, /property="og:image" content="https:\/\/ljs0336-koco\.github\.io\/Seung_AI_Labs\/shared\/share-default\.png"/);
  assert.match(html, new RegExp(`rel="canonical" href="${DEFAULT_SITE_URL}share/news/${entry.id}/"`));
  assert.match(html, /\\u003c\/script>/);
  assert.doesNotMatch(html, /INTERNAL_NOTE_SENTINEL|<script>alert|<img src=x onerror=/);
  assert.match(html, /src="\.\.\/\.\.\/\.\.\/shared\/content-share\.js"/);
});

test('public base disallows local preview addresses, credentials, query and fragment', () => {
  for (const address of ['http://localhost:8765/', 'http://127.0.0.1/', 'http://[::1]/', 'file:///tmp/', ['https://user:pass','example.org/'].join('@'), 'https://example.org/?x=1', 'https://example.org/#x']) {
    assert.throws(() => publicSiteUrl(address));
  }
  assert.equal(publicSiteUrl('https://example.org/portal'), 'https://example.org/portal/');
});

const context = vm.createContext({ URL });
vm.runInContext(await readFile(join(projectRoot, 'public', 'shared', 'content-share.js'), 'utf8'), context);
const core = context.SeungShareCore;

test('share text contains source and permanent ID address, never a localhost address or team memo', () => {
  const text = core.shareText({ ...entry, teamNote: 'INTERNAL_NOTE_SENTINEL' }, 'http://localhost:8765/');
  assert.match(text, /출처: 공식 연구소/);
  assert.match(text, new RegExp(`share/news/${entry.id}/`));
  assert.doesNotMatch(text, /localhost|INTERNAL_NOTE_SENTINEL/);
  assert.equal(core.safeImageUrl('https://remote.example.org/pic.jpg', 'https://example.org/portal/', true), null);
  assert.equal(core.safeImageUrl('shared/prepared.png', 'https://example.org/portal/', true), 'https://example.org/portal/shared/prepared.png');
  assert.equal(core.safeImageUrl('javascript:alert(1)', 'https://example.org/portal/', false), null);
});

function fakeCanvas() {
  const labels = [];
  const ctx = {
    font: '', measureText(value) { return { width: Array.from(value).length * (parseInt(this.font.match(/(\d+)px/)?.[1] || '34', 10) * 0.55) }; },
    fillRect() {}, beginPath() {}, moveTo() {}, lineTo() {}, stroke() {}, drawImage() {},
    fillText(value, x, y) { labels.push({ value, x, y }); },
  };
  return { width: 0, height: 0, getContext: () => ctx, labels };
}

test('canvas draws every title/summary/source line within dynamic height without external image', () => {
  const canvas = fakeCanvas();
  const summary = '긴 요약에서도 마지막 문장이 보입니다. '.repeat(35) + '마지막확인문장';
  const layout = core.drawCard(canvas, { ...entry, summary, pageUrl: core.newsUrl(entry.id) }, null);
  assert.equal(canvas.width, 1080);
  assert.equal(canvas.height, layout.height);
  assert.equal(layout.imageHeight, 0);
  assert.ok(canvas.labels.every(label => label.y < canvas.height - 28));
  assert.ok(canvas.labels.map(label => label.value).join('').includes('마지막확인문장'));
  assert.ok(canvas.labels.map(label => label.value).join('').includes('출처: 공식 연구소'));
});

test('canvas refuses unusably long image output rather than silently clipping it', () => {
  assert.throws(() => core.drawCard(fakeCanvas(), { ...entry, title: '제목'.repeat(3000) }, null), /너무 깁니다/);
});

test('default OG asset is an original PNG with expected social preview dimensions', async () => {
  const image = await readFile(join(projectRoot, 'public', 'shared', 'share-default.png'));
  assert.equal(image.subarray(1, 4).toString(), 'PNG');
  assert.equal(image.readUInt32BE(16), 1200);
  assert.equal(image.readUInt32BE(20), 630);
});
