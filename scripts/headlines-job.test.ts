import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

/**
 * The two shell scripts of the headlines job, run against a throwaway repository as a GitHub runner has it: a
 * shallow checkout of `main`, with the list on a branch of its own. Nothing here touches Compass's own repository
 * or the network.
 */

const HERE = import.meta.dirname, TAKE = join(HERE, 'take-headlines.sh'), PUSH = join(HERE, 'push-headlines.sh');
const LIST_A = '{"format":1,"checked":"2026-11-20T04:00:00Z","items":[]}\n', LIST_B = '{"format":1,"checked":"2026-11-20T08:00:00Z","items":[]}\n';
// git as a fresh machine has it: no one's own settings, so nothing here signs a commit or asks for a name
const ENV = { ...process.env, GIT_CONFIG_GLOBAL: '/dev/null', GIT_CONFIG_SYSTEM: '/dev/null', GIT_TERMINAL_PROMPT: '0' };
const made: string[] = [];
afterEach(() => { for (const dir of made.splice(0)) rmSync(dir, { recursive: true, force: true }); });

function run(cwd: string, command: string, args: string[]): { ok: boolean; out: string } {
  try { return { ok: true, out: execFileSync(command, args, { cwd, env: ENV, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }) }; }
  catch (e) { const failed = e as { stdout?: string; stderr?: string }; return { ok: false, out: `${failed.stdout ?? ''}${failed.stderr ?? ''}` }; }
}

/** A repository with `main` on it, and a shallow checkout of it, as the job starts with. */
function sandbox() {
  const root = mkdtempSync(join(tmpdir(), 'compass-headlines-')), remote = join(root, 'remote.git'), seed = join(root, 'seed'), clone = join(root, 'clone');
  made.push(root);
  const git = (cwd: string, ...args: string[]) => { const r = run(cwd, 'git', args); if (!r.ok) throw new Error(`git ${args.join(' ')}: ${r.out}`); return r.out.trim(); };
  git(root, 'init', '--quiet', '--bare', '--initial-branch=main', remote);
  mkdirSync(seed);
  git(seed, 'init', '--quiet', '--initial-branch=main');
  writeFileSync(join(seed, 'app.txt'), 'the app\n');
  git(seed, 'add', 'app.txt');
  git(seed, '-c', 'user.name=Someone', '-c', 'user.email=someone@example.invalid', 'commit', '--quiet', '-m', 'main');
  git(seed, 'push', '--quiet', remote, 'main');
  git(root, 'clone', '--quiet', '--depth', '1', '--branch', 'main', `file://${remote}`, clone);
  const out = join(clone, 'out', 'headlines.json');
  return {
    clone, out, git,
    remote: (...args: string[]) => git(root, '--git-dir', remote, ...args),
    take: () => run(clone, 'bash', [TAKE, 'out/headlines.json']),
    push: (list: string) => { mkdirSync(join(clone, 'out'), { recursive: true }); writeFileSync(out, list); return run(clone, 'bash', [PUSH, 'out/headlines.json']); },
    unreachable: () => git(clone, 'remote', 'set-url', 'origin', `file://${join(root, 'gone.git')}`),
  };
}

describe('taking the list as it stands', () => {
  it('finds no list when there is no branch yet, and that is not a fault', () => {
    const s = sandbox(), took = s.take();
    expect(took.ok, took.out).toBe(true);
    expect(existsSync(s.out)).toBe(false);
  });
  it('takes the list that the branch holds', () => {
    const s = sandbox();
    expect(s.push(LIST_A).ok).toBe(true);
    rmSync(s.out);
    const took = s.take();
    expect(took.ok, took.out).toBe(true);
    expect(readFileSync(s.out, 'utf8')).toBe(LIST_A);
  });
  it('fails, and leaves no list, when the repository cannot be asked: the job must not start again from nothing', () => {
    const s = sandbox();
    expect(s.push(LIST_A).ok).toBe(true);
    s.unreachable();
    const took = s.take();
    expect(took.ok).toBe(false);
    expect(existsSync(s.out)).toBe(false);
  });
});

describe('publishing the list', () => {
  it('makes the branch on the first run, holding the list and a note and nothing of main', () => {
    const s = sandbox(), main = s.remote('rev-parse', 'main'), pushed = s.push(LIST_A);
    expect(pushed.ok, pushed.out).toBe(true);
    expect(s.remote('ls-tree', '--name-only', 'headlines').split('\n').sort()).toEqual(['README.md', 'headlines.json']);
    expect(s.remote('show', 'headlines:headlines.json')).toBe(LIST_A.trim());
    expect(s.remote('rev-list', '--count', 'headlines')).toBe('1');
    expect(s.remote('rev-parse', 'main')).toBe(main);
    // the two branches share no history at all
    expect(run(s.clone, 'git', ['--git-dir', join(s.clone, '..', 'remote.git'), 'merge-base', 'main', 'headlines']).ok).toBe(false);
  }, 20_000);
  it('adds one commit when the list has changed, and none when it has not', () => {
    const s = sandbox();
    s.push(LIST_A);
    const first = s.remote('rev-parse', 'headlines');
    expect(s.push(LIST_B).ok).toBe(true);
    expect(s.remote('rev-list', '--count', 'headlines')).toBe('2');
    // the first commit is still there beneath the second: nothing was forced
    expect(s.remote('rev-parse', 'headlines~1')).toBe(first);
    const again = s.push(LIST_B);
    expect(again.ok, again.out).toBe(true);
    expect(s.remote('rev-list', '--count', 'headlines')).toBe('2');
    expect(s.remote('show', 'headlines:headlines.json')).toBe(LIST_B.trim());
  }, 20_000);
  it('leaves the checkout as it found it: no name set, no branch moved, no working folder left behind', () => {
    const s = sandbox();
    s.push(LIST_A);
    expect(run(s.clone, 'git', ['config', '--local', 'user.name']).ok).toBe(false);
    expect(s.git(s.clone, 'rev-parse', '--abbrev-ref', 'HEAD')).toBe('main');
    expect(s.git(s.clone, 'worktree', 'list').split('\n')).toHaveLength(1);
    expect(s.git(s.clone, 'status', '--porcelain')).toBe('?? out/');
  }, 20_000);
  it('fails without publishing when the repository cannot be reached', () => {
    const s = sandbox();
    s.push(LIST_A);
    const before = s.remote('rev-parse', 'headlines');
    s.unreachable();
    expect(s.push(LIST_B).ok).toBe(false);
    expect(s.remote('rev-parse', 'headlines')).toBe(before);
  }, 20_000);
});
