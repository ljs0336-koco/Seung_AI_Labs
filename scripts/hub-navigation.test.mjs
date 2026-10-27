import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Script } from 'node:vm';
import { JSDOM } from 'jsdom';

const html = readFileSync(new URL('../public/hub/index.html', import.meta.url), 'utf8');
const source = readFileSync(new URL('../public/hub/hub.js', import.meta.url), 'utf8');
const lectureData = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(match => match[1]).join('\n');
const settle = () => new Promise(resolve => setTimeout(resolve, 25));

function openHub(hash = '#home') {
  const dom = new JSDOM(html, { runScripts: 'outside-only', url: `https://example.org/Seung_AI_Labs/hub/${hash}` });
  dom.window.scrollTo = () => {};
  dom.window.HTMLElement.prototype.scrollIntoView = () => {};
  new Script(lectureData).runInContext(dom.getInternalVMContext());
  new Script(source).runInContext(dom.getInternalVMContext());
  return dom;
}

test('hub lists three lectures and retains old lecture deep links', () => {
  const dom = openHub();
  const { document } = dom.window;
  assert.equal(document.querySelectorAll('.lecture-card').length, 3);
  for (const hash of ['#jeju', '#hs', '#snu']) assert.ok(document.querySelector(`.lecture-card[href="${hash}"]`));
  assert.equal(document.querySelector('.portal-link').getAttribute('href'), '../#/');
  assert.equal(document.querySelectorAll('a[href*="base"], a[href*="privacy-guidelines"]').length, 0);
  assert.doesNotMatch(document.getElementById('view-home').textContent, /멍멍 RL/);
  dom.window.close();
});

test('keyboard tabs and flow paging display one step while retaining browser history', async () => {
  const dom = openHub('#jeju');
  const { document, KeyboardEvent } = dom.window;
  assert.equal(document.querySelectorAll('[role="tabpanel"]:not([hidden])').length, 1);
  document.getElementById('tab-overview').focus();
  document.getElementById('tab-overview').dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'ArrowRight' }));
  await settle();
  assert.equal(dom.window.location.hash, '#jeju/content');
  assert.equal(document.activeElement.id, 'tab-content');
  assert.equal(document.querySelectorAll('.step-detail').length, 1);
  assert.equal(document.getElementById('step-previous').disabled, true);
  document.getElementById('step-next').click();
  await settle();
  assert.equal(dom.window.location.hash, '#jeju/content/1');
  assert.match(document.getElementById('step-heading').textContent, /AI의 발전/);
  dom.window.history.back();
  await settle();
  assert.equal(dom.window.location.hash, '#jeju/content');
  assert.equal(document.getElementById('step-0').getAttribute('aria-current'), 'step');
  dom.window.close();
});

test('references are grouped and paged; RL is within the high-school materials', async () => {
  const dom = openHub('#jeju/materials/1');
  const { document } = dom.window;
  assert.equal(document.querySelectorAll('.reference-link').length, 3);
  document.getElementById('refs-next').click();
  await settle();
  assert.equal(document.querySelectorAll('.reference-link').length, 2);
  assert.equal(document.getElementById('refs-next').disabled, true);
  dom.window.location.hash = '#hs/materials';
  await settle();
  assert.equal(document.querySelector('.app-card a').getAttribute('href'), 'apps/robotdog_rl/index.html');
  assert.match(document.querySelector('.app-card').textContent, /기본 수업 범위 밖/);
  dom.window.location.hash = '#hs';
  await settle();
  assert.equal(document.querySelectorAll('.app-card').length, 0);
  dom.window.close();
});

test('SNU summary publishes the six verified topics and no original attachment', () => {
  const dom = openHub('#snu/content/5');
  const { document } = dom.window;
  assert.equal(document.querySelectorAll('.step-button').length, 6);
  assert.match(document.getElementById('step-heading').textContent, /피드백/);
  assert.match(document.querySelector('.step-description').textContent, /KPT/);
  assert.equal(document.querySelectorAll('a[href$=".pptx"], a[href$=".pdf"], a[href$=".docx"]').length, 0);
  dom.window.close();
});

test('skip link focuses main without replacing the selected lecture route', async () => {
  const dom = openHub('#jeju/content/2');
  const { document } = dom.window;
  const heading = document.getElementById('step-heading').textContent;
  document.querySelector('.skip-link').click();
  await settle();
  assert.equal(document.activeElement.id, 'main');
  assert.equal(dom.window.location.hash, '#jeju/content/2');
  assert.equal(document.getElementById('view-lecture').hidden, false);
  assert.equal(document.getElementById('step-heading').textContent, heading);
  dom.window.close();
});
