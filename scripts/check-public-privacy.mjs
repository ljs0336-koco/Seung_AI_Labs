import { readdir, readFile, lstat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import '../public/shared/privacy-guard.js';

// These third-party/generated directories and explicitly minified files are not
// authored publication text. Traversal still rejects any nested _private folder.
// Ordinary .js bundles and source maps outside these exclusions are inspected.
export const EXCLUDED_DIRECTORIES = new Set(['vendor', 'node_modules', '.git', 'dist', '.vite', 'coverage']);
// Dependency-manager lockfiles are machine-generated inventories, not lesson
// content. Exact filenames avoid exempting arbitrary JSON or authored scripts.
export const EXCLUDED_FILENAMES = new Set([
  'package-lock.json', 'npm-shrinkwrap.json', 'pnpm-lock.yaml', 'yarn.lock',
  'bun.lock', 'bun.lockb', 'cargo.lock', 'composer.lock', 'poetry.lock', 'uv.lock', 'pipfile.lock',
]);
export const TEXT_EXTENSIONS = new Set([
  '.html', '.htm', '.md', '.markdown', '.txt', '.json', '.jsonl', '.js', '.mjs', '.cjs',
  '.jsx', '.ts', '.tsx', '.csv', '.tsv', '.xml', '.svg', '.yaml', '.yml', '.css', '.map',
]);

function isExcludedFile(file) {
  const filename = path.basename(file).toLowerCase();
  return EXCLUDED_FILENAMES.has(filename) || /\.min\.(?:js|css)$/i.test(filename) ||
    !TEXT_EXTENSIONS.has(path.extname(filename));
}

function inspectText(result, file, contents) {
  if (contents.includes('\0') || contents.includes('\uFFFD')) {
    result.errors.push({ file, line: 1, type: 'INVALID_UTF8_TEXT' });
    return;
  }
  result.scannedFiles += 1;
  for (const issue of globalThis.SeungPrivacy.findPrivacyIssues(contents)) {
    result.issues.push({
      file,
      line: contents.slice(0, issue.start).split(/\r\n|\r|\n/).length,
      type: issue.type,
      label: issue.label,
    });
  }
}

export async function scanPublicPaths(directories) {
  const result = { issues: [], errors: [], scannedFiles: 0, skippedFiles: 0 };

  async function inspectFile(file, skipContent = false) {
    if (skipContent || isExcludedFile(file)) {
      result.skippedFiles += 1;
      return;
    }
    let contents;
    try {
      contents = await readFile(file, 'utf8');
    } catch {
      result.errors.push({ file, line: 1, type: 'READ_FILE_FAILED' });
      return;
    }
    inspectText(result, file, contents);
  }

  async function walk(directory, skipContent = false) {
    let entries;
    try {
      entries = await readdir(directory, { withFileTypes: true });
    } catch {
      result.errors.push({ file: directory, line: 1, type: 'READ_DIRECTORY_FAILED' });
      return;
    }
    entries.sort((left, right) => left.name.localeCompare(right.name));
    for (const entry of entries) {
      const file = path.join(directory, entry.name);
      if (entry.name.toLowerCase() === '_private' && (entry.isDirectory() || entry.isSymbolicLink())) {
        result.issues.push({ file, line: 1, type: 'private-directory', label: '공개 금지 디렉터리' });
      } else if (entry.isSymbolicLink()) {
        // Following links could silently escape the publication root or cycle.
        result.errors.push({ file, line: 1, type: 'SYMLINK_NOT_INSPECTED' });
      } else if (entry.isDirectory()) {
        await walk(file, skipContent || EXCLUDED_DIRECTORIES.has(entry.name.toLowerCase()));
      } else if (entry.isFile()) {
        await inspectFile(file, skipContent);
      }
    }
  }

  for (const input of [...new Set(directories.map((value) => path.resolve(value)))]) {
    try {
      const entry = await lstat(input);
      if (input.split(path.sep).some((segment) => segment.toLowerCase() === '_private')) {
        result.issues.push({ file: input, line: 1, type: 'private-directory', label: '공개 금지 디렉터리' });
      } else if (entry.isSymbolicLink()) {
        result.errors.push({ file: input, line: 1, type: 'SYMLINK_NOT_INSPECTED' });
      } else if (entry.isDirectory()) {
        await walk(input);
      } else if (entry.isFile()) {
        await inspectFile(input);
      } else {
        result.errors.push({ file: input, line: 1, type: 'UNSUPPORTED_INPUT' });
      }
    } catch {
      result.errors.push({ file: input, line: 1, type: 'INPUT_UNAVAILABLE' });
    }
  }
  return result;
}

export function scanStagedPaths(cwd = process.cwd()) {
  const result = { issues: [], errors: [], scannedFiles: 0, skippedFiles: 0 };
  const gitOptions = { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 64 * 1024 * 1024 };
  let repository;
  let stagedFiles;
  try {
    repository = execFileSync('git', ['rev-parse', '--show-toplevel'], gitOptions).replace(/\r?\n$/, '');
    stagedFiles = execFileSync('git', ['diff', '--cached', '--name-only', '-z', '--diff-filter=ACMR'], { ...gitOptions, cwd: repository }).split('\0').filter(Boolean);
  } catch {
    result.errors.push({ file: path.resolve(cwd), line: 1, type: 'READ_STAGED_LIST_FAILED' });
    return result;
  }
  for (const stagedFile of stagedFiles) {
    const segments = stagedFile.split('/');
    const file = path.resolve(repository, ...segments);
    if (segments.some((segment) => segment.toLowerCase() === '_private')) {
      // Check the entire staged path before vendor/generated/extension rules.
      result.issues.push({ file, line: 1, type: 'private-directory', label: '공개 금지 디렉터리' });
      continue;
    }
    if (segments.slice(0, -1).some((segment) => EXCLUDED_DIRECTORIES.has(segment.toLowerCase())) || isExcludedFile(stagedFile)) {
      result.skippedFiles += 1;
      continue;
    }
    try {
      // An argv array and :path select the index blob; working-tree edits cannot
      // hide data already staged for commit. No shell interpolation is used.
      const contents = execFileSync('git', ['show', ':' + stagedFile], { ...gitOptions, cwd: repository });
      inspectText(result, file, contents);
    } catch {
      result.errors.push({ file, line: 1, type: 'READ_STAGED_BLOB_FAILED' });
    }
  }
  return result;
}

function printablePath(file) {
  return (path.relative(process.cwd(), file) || '.').replace(/[\u0000-\u001F\u007F]/g, '?');
}

async function main() {
  const args = process.argv.slice(2);
  const staged = args.includes('--staged');
  const invalid = (staged && args.length !== 1) || args.some((arg) => arg.startsWith('--') && arg !== '--staged');
  const result = invalid
    ? { issues: [], errors: [{ file: process.cwd(), line: 1, type: 'INVALID_ARGUMENTS' }] }
    : staged ? scanStagedPaths() : await scanPublicPaths(args.length ? args : ['public']);
  for (const issue of result.issues) {
    process.stderr.write(`[privacy] ${printablePath(issue.file)}:${issue.line} [${issue.label}]\n`);
  }
  for (const error of result.errors) {
    process.stderr.write(`[privacy] ${printablePath(error.file)}:${error.line} [${error.type}]\n`);
  }
  if (result.issues.length || result.errors.length) {
    process.exitCode = 1;
  } else {
    process.stdout.write(`[privacy] ${result.scannedFiles} text files checked; no personal-data patterns found.\n`);
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(() => {
    process.stderr.write('[privacy] .:1 [SCAN_FAILED]\n');
    process.exitCode = 1;
  });
}
