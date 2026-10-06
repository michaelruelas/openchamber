/**
 * Remote names and URLs from `git remote -v` output.
 *
 * The parser is pure so it can be tested outside the extension host, like the
 * status-path and submodule helpers in `gitPathDiff.ts`. Each remote's URLs
 * must read as `git remote get-url [--push]` reports them, so the line grammar
 * matches the web server's `parseRemoteListing`. Git 2.54+ appends the
 * partial-clone filter to the fetch line as a trailing `[...]` annotation
 * (`(fetch) [blob:none]`); that is metadata about the remote, not part of the
 * URL, so it is dropped. Lines may end in CRLF (Git for Windows); a kept `\r`
 * would match no line and read every remote as URL-less. A line that matches
 * no URL kind is skipped.
 */

export interface GitRemote {
  name: string;
  fetchUrl: string;
  pushUrl: string;
}

export function parseGitRemoteListing(stdout: string): GitRemote[] {
  const remoteMap = new Map<string, GitRemote>();
  for (const line of stdout.split(/\r?\n/)) {
    const match = line.match(/^([^\t]+)\t(.*) \((fetch|push)\)(?: \[[^\]]+\])*$/);
    if (match) {
      const [, name, url, kind] = match;
      if (!remoteMap.has(name)) {
        remoteMap.set(name, { name, fetchUrl: '', pushUrl: '' });
      }
      const remote = remoteMap.get(name)!;
      if (kind === 'fetch') {
        remote.fetchUrl = url;
      } else {
        remote.pushUrl = url;
      }
    }
  }

  return Array.from(remoteMap.values());
}
