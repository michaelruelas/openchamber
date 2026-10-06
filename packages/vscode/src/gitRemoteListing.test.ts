import assert from 'node:assert/strict';
import { test } from 'node:test';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { parseGitRemoteListing } from './gitRemoteListing';

const git = (cwd: string, args: string[]) => execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });

test('parses fetch and push URLs per remote', () => {
  const listing = [
    'origin\tgit@github.com:owner/repo.git (fetch)',
    'origin\tgit@github.com:owner/push.git (push)',
    'mirror\thttps://example.com/repo.git (fetch)',
    'mirror\thttps://example.com/repo.git (push)',
    '',
  ].join('\n');
  assert.deepEqual(parseGitRemoteListing(listing), [
    { name: 'origin', fetchUrl: 'git@github.com:owner/repo.git', pushUrl: 'git@github.com:owner/push.git' },
    { name: 'mirror', fetchUrl: 'https://example.com/repo.git', pushUrl: 'https://example.com/repo.git' },
  ]);
});

test('drops Git 2.54 partial-clone annotations after the listing kind (#4479)', () => {
  // Git only annotates the fetch line in practice; push and repeated
  // annotations are tolerated so the parser does not depend on that.
  const listing = [
    'origin\tgit@github.com:owner/repo.git (fetch) [blob:none]',
    'origin\tgit@github.com:owner/repo.git (push)',
    'mirror\thttps://example.com/repo.git (fetch) [blob:limit=1m] [tree:1]',
    'mirror\thttps://example.com/repo.git (push) [blob:none]',
  ].join('\n');
  assert.deepEqual(parseGitRemoteListing(listing), [
    { name: 'origin', fetchUrl: 'git@github.com:owner/repo.git', pushUrl: 'git@github.com:owner/repo.git' },
    { name: 'mirror', fetchUrl: 'https://example.com/repo.git', pushUrl: 'https://example.com/repo.git' },
  ]);
});

test('reads a partial-clone remote as `git remote get-url` reports it', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'oc-vscode-remote-listing-'));
  try {
    git(dir, ['init', '-b', 'main']);
    git(dir, ['remote', 'add', 'origin', 'git@github.com:owner/repo.git']);
    // Git 2.54+ annotates the fetch line of `git remote -v` with the filter:
    // `... (fetch) [blob:none]`. Setting just the config key is enough.
    git(dir, ['config', 'remote.origin.partialclonefilter', 'blob:none']);

    const stdout = git(dir, ['remote', '-v']);
    const fetchUrl = git(dir, ['remote', 'get-url', 'origin']).trim();

    assert.deepEqual(parseGitRemoteListing(stdout), [
      { name: 'origin', fetchUrl, pushUrl: fetchUrl },
    ]);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
