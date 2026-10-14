import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync, spawnSync } from 'node:child_process';
import { scanPublicPaths, scanStagedPaths } from './check-public-privacy.mjs';

const scanner = fileURLToPath(new URL('./check-public-privacy.mjs', import.meta.url));
const mobile = ['010', '2846', '7395'].join('-');
const email = ['privacy', 'fixture'].join('.') + '@' + ['example', 'org'].join('.');
const rrn = ['900228', '1234567'].join('-');

async function fixture(t) {
  const directory = await mkdtemp(path.join(tmpdir(), 'public-privacy-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  return directory;
}

async function gitFixture(t) {
  const directory = await fixture(t);
  execFileSync('git', ['init', '--quiet', directory], { stdio: ['ignore', 'pipe', 'pipe'] });
  return directory;
}

function stage(directory, filenames) {
  execFileSync('git', ['add', '--', ...filenames], { cwd: directory, stdio: ['ignore', 'pipe', 'pipe'] });
}

test('CLI fails with file, line and type without leaking source values or prose', async (t) => {
  const directory = await fixture(t);
  const prose = 'PRIVATE_FIXTURE_PROSE';
  await writeFile(path.join(directory, 'lesson.html'), `<h1>Lesson</h1>\n<p>${prose}: ${mobile}</p>\n<a href="mailto:${email}">contact</a>\n<p>${rrn}</p>`);
  const run = spawnSync(process.execPath, [scanner, directory], { encoding: 'utf8' });
  assert.equal(run.status, 1);
  assert.match(run.stderr, /lesson\.html:2 \[휴대전화번호\]/);
  assert.match(run.stderr, /lesson\.html:3 \[이메일\]/);
  assert.match(run.stderr, /lesson\.html:4 \[주민등록번호\]/);
  for (const value of [mobile, email, rrn, prose]) {
    assert.equal((run.stdout + run.stderr).includes(value), false, 'matching values and surrounding source must stay out of logs');
  }
});

test('empty and ordinary learning content succeed', async (t) => {
  const directory = await fixture(t);
  const empty = spawnSync(process.execPath, [scanner, directory], { encoding: 'utf8' });
  assert.equal(empty.status, 0);
  await writeFile(path.join(directory, 'lesson.md'), '날짜 2026-10-14, 타임코드 00:10:16, 통계 1010명 / 2345회 / 6789점.\nISBN 978-89-1234-567-0\n해시 abc010' + ['2846', '7395def'].join(''));
  const result = await scanPublicPaths([directory]);
  assert.equal(result.scannedFiles, 1);
  assert.deepEqual(result.issues, []);
  assert.deepEqual(result.errors, []);
});

test('explicit text file inputs share the same scan as directory contents', async (t) => {
  const directory = await fixture(t);
  const filename = path.join(directory, 'index.html');
  await writeFile(filename, `Lesson\n<a href="tel:${mobile}">contact</a>`);
  const result = await scanPublicPaths([filename]);
  assert.equal(result.scannedFiles, 1);
  assert.equal(result.issues.length, 1);
  assert.equal(result.issues[0].line, 2);
  assert.deepEqual(result.errors, []);
  const run = spawnSync(process.execPath, [scanner, filename], { encoding: 'utf8' });
  assert.equal(run.status, 1);
  assert.match(run.stderr, /index\.html:2 \[휴대전화번호\]/);
  assert.equal(run.stderr.includes(mobile), false);
});

test('semver CDN URLs pass while contacts embedded in URLs are still blocked', async (t) => {
  const directory = await fixture(t);
  const filename = path.join(directory, 'links.html');
  await writeFile(filename, '<link href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.css">');
  const clean = await scanPublicPaths([filename]);
  assert.deepEqual(clean.issues, []);
  await writeFile(filename, `https://example.org/share?email=${email}\nhttps://example.org/share?phone=${mobile}`);
  const run = spawnSync(process.execPath, [scanner, filename], { encoding: 'utf8' });
  assert.equal(run.status, 1);
  assert.match(run.stderr, /links\.html:1 \[이메일\]/);
  assert.match(run.stderr, /links\.html:2 \[휴대전화번호\]/);
  for (const value of [email, mobile]) assert.equal((run.stdout + run.stderr).includes(value), false);
});

test('an empty _private directory fails even inside an excluded vendor directory', async (t) => {
  const directory = await fixture(t);
  await mkdir(path.join(directory, 'vendor', '_private'), { recursive: true });
  const run = spawnSync(process.execPath, [scanner, directory], { encoding: 'utf8' });
  assert.equal(run.status, 1);
  assert.match(run.stderr, /_private:1 \[공개 금지 디렉터리\]/);
});

test('authored scripts, contact links and ordinary bundles are inspected; explicit exclusions are skipped', async (t) => {
  const directory = await fixture(t);
  await mkdir(path.join(directory, 'vendor'));
  await mkdir(path.join(directory, 'dist'));
  await writeFile(path.join(directory, 'vendor', 'library.js'), mobile);
  await writeFile(path.join(directory, 'dist', 'generated.js'), mobile);
  await writeFile(path.join(directory, 'library.min.js'), mobile);
  await writeFile(path.join(directory, 'photo.png'), Buffer.from([0, 1, 2, 3]));
  await writeFile(path.join(directory, 'bundle.js'), `const link = 'tel:${mobile}';`);
  const result = await scanPublicPaths([directory]);
  assert.equal(result.scannedFiles, 1);
  assert.equal(result.skippedFiles, 4);
  assert.equal(result.issues.length, 1);
  assert.equal(result.issues[0].type, 'mobile');
  assert.deepEqual(Object.keys(result.issues[0]).sort(), ['file', 'label', 'line', 'type']);
});

test('missing input and invalid text fail without printing read exception details', async (t) => {
  const directory = await fixture(t);
  await writeFile(path.join(directory, 'bad.txt'), Buffer.from([0, 1, 2]));
  const result = await scanPublicPaths([directory, path.join(directory, 'missing')]);
  assert.deepEqual(result.errors.map((entry) => entry.type), ['INVALID_UTF8_TEXT', 'INPUT_UNAVAILABLE']);
  const run = spawnSync(process.execPath, [scanner, directory], { encoding: 'utf8' });
  assert.equal(run.status, 1);
  assert.equal(run.stderr.includes('Error:'), false);
});

test('guard source scans cleanly and masking never returns sensitive source fragments', async () => {
  const guard = await import('node:fs/promises').then((fs) => fs.readFile(new URL('../public/shared/privacy-guard.js', import.meta.url), 'utf8'));
  assert.deepEqual(globalThis.SeungPrivacy.findPrivacyIssues(guard), []);
  const masked = globalThis.SeungPrivacy.maskPrivateText([mobile, email, rrn].join(' / '));
  assert.equal(masked, '[휴대전화번호 가림] / [이메일 가림] / [주민등록번호 가림]');
  for (const value of [mobile, email, rrn]) assert.equal(masked.includes(value), false);
});

test('--staged inspects the index blob even when the working tree is already masked', async (t) => {
  const directory = await gitFixture(t);
  await mkdir(path.join(directory, 'docs'));
  const filename = path.join('docs', 'lesson notes.md');
  await writeFile(path.join(directory, filename), `Lesson\nSTAGED_PRIVATE_PROSE ${mobile}\n${email}`);
  stage(directory, [filename]);
  await writeFile(path.join(directory, filename), 'Lesson\n[휴대전화번호 가림]\n[이메일 가림]');
  const run = spawnSync(process.execPath, [scanner, '--staged'], { cwd: directory, encoding: 'utf8' });
  assert.equal(run.status, 1);
  assert.match(run.stderr, /lesson notes\.md:2 \[휴대전화번호\]/);
  assert.match(run.stderr, /lesson notes\.md:3 \[이메일\]/);
  for (const value of [mobile, email, 'STAGED_PRIVATE_PROSE']) {
    assert.equal((run.stdout + run.stderr).includes(value), false, 'staged source must stay out of diagnostics');
  }
  const current = await scanPublicPaths([directory]);
  assert.deepEqual(current.issues, []);
});

test('--staged permits a masked index even if unstaged working-tree edits contain contact data', async (t) => {
  const directory = await gitFixture(t);
  await writeFile(path.join(directory, 'lesson.jsx'), 'export default "[이메일 가림]";');
  stage(directory, ['lesson.jsx']);
  await writeFile(path.join(directory, 'lesson.jsx'), `export default "${email}";`);
  const result = scanStagedPaths(directory);
  assert.equal(result.scannedFiles, 1);
  assert.deepEqual(result.issues, []);
  assert.deepEqual(result.errors, []);
});

test('--staged blocks _private paths before extension and generated exclusions', async (t) => {
  const directory = await gitFixture(t);
  await mkdir(path.join(directory, 'vendor', '_private'), { recursive: true });
  await writeFile(path.join(directory, 'vendor', '_private', 'empty.bin'), '');
  stage(directory, ['vendor/_private/empty.bin']);
  const result = scanStagedPaths(directory);
  assert.equal(result.issues.length, 1);
  assert.equal(result.issues[0].type, 'private-directory');
  const run = spawnSync(process.execPath, [scanner, '--staged'], { cwd: directory, encoding: 'utf8' });
  assert.equal(run.status, 1);
  assert.match(run.stderr, /empty\.bin:1 \[공개 금지 디렉터리\]/);
});

test('--staged skips exact generated/lock/vendor paths and scans ordinary source bundles', async (t) => {
  const directory = await gitFixture(t);
  await mkdir(path.join(directory, 'vendor'));
  await mkdir(path.join(directory, 'dist'));
  const excluded = ['vendor/tool.js', 'dist/bundle.js', 'package-lock.json', 'tool.min.js'];
  for (const filename of excluded) await writeFile(path.join(directory, filename), mobile);
  await writeFile(path.join(directory, 'bundle.js'), `const sample = "${mobile}";`);
  stage(directory, [...excluded, 'bundle.js']);
  const result = scanStagedPaths(directory);
  assert.equal(result.skippedFiles, 4);
  assert.equal(result.scannedFiles, 1);
  assert.equal(result.issues.length, 1);
  assert.equal(result.issues[0].file, path.join(directory, 'bundle.js'));
});

test('--staged succeeds on an empty index and fails safely outside a repository', async (t) => {
  const directory = await gitFixture(t);
  const empty = spawnSync(process.execPath, [scanner, '--staged'], { cwd: directory, encoding: 'utf8' });
  assert.equal(empty.status, 0);
  const outside = await fixture(t);
  const invalid = spawnSync(process.execPath, [scanner, '--staged'], { cwd: outside, encoding: 'utf8' });
  assert.equal(invalid.status, 1);
  assert.match(invalid.stderr, /\[READ_STAGED_LIST_FAILED\]/);
  assert.equal(invalid.stderr.includes('fatal:'), false);
});
