/**
 * Remote names and URLs from `git remote -v` output.
 *
 * The parser is pure so it can be tested outside the extension host, like the
 * status-path and submodule helpers in `gitPathDiff.ts`. Each remote's URLs
 * must read as `git remote get-url [--push]` reports them. Git 2.54+ appends
 * the partial-clone filter to the fetch line as a trailing `[...]` annotation
 * (`(fetch) [blob:none]`); that is metadata about the remote, not part of the
 * URL, so it is dropped. A line that matches no URL kind is skipped.
 */

export interface GitRemote {
  name: string;
  fetchUrl: string;
  pushUrl: string;
}

export function parseGitRemoteListing(stdout: string): GitRemote[] {
  const remoteMap = new Map<string, GitRemote>();
  const lines = stdout.split('\n').filter(Boolean);

  for (const line of lines) {
    const match = line.match(/^(\S+)\s+(\S+)\s+\((fetch|push)\)(?:\s+\[[^\]]+\])*$/);
    if (match) {
      const [, name, url, type] = match;
      if (!remoteMap.has(name)) {
        remoteMap.set(name, { name, fetchUrl: '', pushUrl: '' });
      }
      const remote = remoteMap.get(name)!;
      if (type === 'fetch') {
        remote.fetchUrl = url;
      } else {
        remote.pushUrl = url;
      }
    }
  }

  return Array.from(remoteMap.values());
}
