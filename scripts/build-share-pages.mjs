import { readFile, writeFile, mkdir, access } from 'node:fs/promises';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const DEFAULT_SITE_URL = 'https://ljs0336-koco.github.io/Seung_AI_Labs/';

export function escapeHtml(value = '') {
  return String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
}

export function publicSiteUrl(value = DEFAULT_SITE_URL) {
  const url = new URL(value);
  const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || host === 'localhost' || host.endsWith('.localhost') || host === '::1' || /^127\./.test(host) || host === '0.0.0.0') {
    throw new Error('siteUrl must be a public HTTP(S) address, not a local preview address.');
  }
  if (url.search || url.hash) throw new Error('siteUrl must not contain a query or fragment.');
  if (!url.pathname.endsWith('/')) url.pathname += '/';
  return url.href;
}

function webUrl(value, field, { optional = false, relative = false } = {}) {
  if (optional && (value === undefined || value === null || value === '')) return '';
  if (typeof value !== 'string') throw new Error(`${field} must be a URL string.`);
  if (/[\u0000-\u001f\u007f]/.test(value) || value !== value.trim()) throw new Error(`${field} must not contain control characters or surrounding spaces.`);
  if (relative && !/^[a-z][a-z0-9+.-]*:/i.test(value) && !value.startsWith('//') && !value.includes('\\')) {
    if (!value.trim() || value.startsWith('#')) throw new Error(`${field} must be a web image path.`);
    return value;
  }
  const url = new URL(value);
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) throw new Error(`${field} must use HTTP(S).`);
  return url.href;
}

export function validateNewsManifest(manifest) {
  if (!manifest || manifest.schemaVersion !== 1 || !Array.isArray(manifest.items)) throw new Error('Expected news schemaVersion 1 and items array.');
  const ids = new Set();
  return manifest.items.map((item, index) => {
    if (!item || typeof item !== 'object' || !/^n-[a-z0-9-]{1,64}$/.test(item.id || '')) throw new Error(`Invalid news ID at item ${index}.`);
    if (ids.has(item.id)) throw new Error(`Duplicate news ID: ${item.id}`);
    ids.add(item.id);
    for (const field of ['title', 'summary', 'source', 'date']) {
      if (typeof item[field] !== 'string' || !item[field].trim()) throw new Error(`${item.id}: ${field} must be non-empty text.`);
    }
    if (item.summary.length > 1600) throw new Error(`${item.id}: shorten summary to 1600 characters or fewer.`);
    return {
      id: item.id,
      title: item.title,
      summary: item.summary,
      source: item.source,
      date: item.date,
      url: webUrl(item.url, `${item.id}.url`),
      image: webUrl(item.image, `${item.id}.image`, { optional: true, relative: true }),
      exportImage: webUrl(item.exportImage, `${item.id}.exportImage`, { optional: true, relative: true }),
      issue: typeof item.issue === 'string' ? item.issue : '',
      field: typeof item.field === 'string' ? item.field : '',
    };
  });
}

export function renderSharePage(item, siteUrl) {
  const e = escapeHtml;
  const pageUrl = new URL(`share/news/${item.id}/`, siteUrl).href;
  const imageUrl = new URL('shared/share-default.png', siteUrl).href;
  const recordJson = JSON.stringify(item).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
  const picture = item.image ? `<img class="cs-article-image" src="${e(new URL(item.image, siteUrl).href)}" alt="" loading="eager" referrerpolicy="no-referrer">` : '';
  return `<!doctype html>
<html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${e(item.title)} · Seung AI Labs</title>
<meta name="description" content="${e(item.summary)}"><meta name="robots" content="noindex, nofollow">
<link rel="canonical" href="${e(pageUrl)}"><meta name="seung-share-site-url" content="${e(siteUrl)}">
<meta property="og:type" content="article"><meta property="og:locale" content="ko_KR"><meta property="og:site_name" content="Seung AI Labs">
<meta property="og:title" content="${e(item.title)}"><meta property="og:description" content="${e(item.summary)}"><meta property="og:url" content="${e(pageUrl)}">
<meta property="og:image" content="${e(imageUrl)}"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta property="og:image:alt" content="Seung AI Labs 뉴스 공유">
<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${e(item.title)}"><meta name="twitter:description" content="${e(item.summary)}"><meta name="twitter:image" content="${e(imageUrl)}">
<link rel="stylesheet" href="../../../shared/content-share.css"><script src="../../../shared/content-share.js" defer></script></head>
<body class="cs-page"><main class="cs-page-main" data-share-page-id="${e(item.id)}">
<a class="cs-back" href="../../../briefing/">← AI 교육 브리핑</a>
<article class="cs-card" aria-labelledby="cs-page-title"><p class="cs-brand">SEUNG AI LABS · AI 교육 브리핑</p>${picture}
<div class="cs-card-body"><p class="cs-meta">${e(item.source)} · ${e(item.date)}</p><h1 id="cs-page-title">${e(item.title)}</h1>
<p class="cs-summary">${e(item.summary)}</p><p class="cs-source">출처: ${e(item.source)} · ${e(item.date)}</p>
<a class="cs-original" href="${e(item.url)}" target="_blank" rel="noopener noreferrer">원문 보기 ↗</a>
<p class="cs-page-address">${e(pageUrl)}</p></div></article><div class="cs-page-controls"></div>
<noscript><p>이 주소를 복사하거나 화면을 캡처해 공유할 수 있습니다. 기사 원문은 위 링크에서 확인하세요.</p></noscript>
<script id="seung-share-record" type="application/json">${recordJson}</script>
</main></body></html>\n`;
}

export async function buildSharePages({ root, siteUrl = process.env.SEUNG_SITE_URL || DEFAULT_SITE_URL } = {}) {
  const projectRoot = resolve(root || join(dirname(fileURLToPath(import.meta.url)), '..'));
  const publicRoot = join(projectRoot, 'public');
  const canonicalRoot = publicSiteUrl(siteUrl);
  const manifest = JSON.parse(await readFile(join(publicRoot, 'content', 'news.json'), 'utf8'));
  const items = validateNewsManifest(manifest);
  await access(join(publicRoot, 'shared', 'share-default.png'));
  for (const item of items) {
    const target = join(publicRoot, 'share', 'news', item.id, 'index.html');
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, renderSharePage(item, canonicalRoot), 'utf8');
  }
  return { count: items.length, siteUrl: canonicalRoot, ids: items.map(item => item.id) };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  buildSharePages().then(result => process.stdout.write(`[share] ${result.count} static news pages generated.\n`)).catch(error => {
    process.stderr.write(`[share] ${error.message}\n`);
    process.exitCode = 1;
  });
}
