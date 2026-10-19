import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  broadcastText,
  consoleKeyOf,
  footerConsoles,
  holdsSession,
  isHeldKind,
  isTerminalKind,
  nextActive,
  pageConsolesOf,
  readStoredHistory,
  readStoredTabs,
  receivers,
  sessionLives,
  sessionToConsole,
  storageKeyOf,
  storedTabFor,
  storedTabsOf,
  withConsole,
  withSent,
  withStoredTab,
  withoutConsole,
  writeStoredHistory,
  writeStoredTabs,
} from '../../src/features/hosts/utils/terminals.js';

const storage = new Map();

beforeEach(() => {
  storage.clear();
  vi.stubGlobal('localStorage', {
    getItem: key => (storage.has(key) ? storage.get(key) : null),
    setItem: (key, value) => storage.set(key, String(value)),
    removeItem: key => storage.delete(key),
  });
});

const shell = { key: 'host_shell|1|||', kind: 'host_shell', id: '1', name: '', placed: 'footer' };

const ssh = {
  key: 'ssh|1|dev-1||c1',
  kind: 'ssh',
  id: '1',
  name: 'dev-1',
  placed: 'footer',
  accepts: true,
  session: { id: 'c1' },
};

const vnc = { key: 'vnc|1|dev-1|', kind: 'vnc', id: '1', name: 'dev-1', placed: 'page' };

describe('consoleKeyOf and the kinds', () => {
  it('keys a display by its kind, host, machine and target, and a held shell by its session too', () => {
    expect(consoleKeyOf({ kind: 'host_shell', id: '1' })).toBe('host_shell|1|||');
    expect(consoleKeyOf({ kind: 'host_shell', id: '1', session: { id: 'a1' } })).toBe(
      'host_shell|1|||a1'
    );
    expect(consoleKeyOf({ kind: 'ssh', id: '1', name: 'dev-1', session: { id: 'c2' } })).toBe(
      'ssh|1|dev-1||c2'
    );
    expect(consoleKeyOf({ kind: 'rdp', id: 'self', name: 'dev-1', target: 'guest' })).toBe(
      'rdp|self|dev-1|guest'
    );
    expect(consoleKeyOf({ kind: 'vnc', id: '1', name: 'dev-1', session: { id: 'x' } })).toBe(
      'vnc|1|dev-1|'
    );
  });

  it('tells whether a listed session is already held, whatever the tab was keyed', () => {
    expect(holdsSession([ssh], { kind: 'ssh', id: '1', session: { id: 'c1' } })).toBe(true);
    expect(holdsSession([ssh], { kind: 'ssh', id: '1', session: { id: 'c2' } })).toBe(false);
    expect(holdsSession([ssh], { kind: 'host_shell', id: '1', session: { id: 'c1' } })).toBe(false);
    expect(holdsSession([shell], { kind: 'host_shell', id: '1', session: null })).toBe(false);
  });

  it('tells the terminal kinds and the held kinds apart', () => {
    expect(isTerminalKind('zlogin')).toBe(true);
    expect(isTerminalKind('vnc')).toBe(false);
    expect(isHeldKind('ssh')).toBe(true);
    expect(isHeldKind('zlogin')).toBe(false);
  });
});

describe('storageKeyOf', () => {
  it('keys a session kind by its session id and a display by its host and machine', () => {
    expect(storageKeyOf(ssh)).toBe('c1');
    expect(storageKeyOf(shell)).toBe('');
    expect(storageKeyOf(vnc)).toBe('vnc:1:dev-1');
    expect(storageKeyOf({ kind: 'rdp', id: '1', name: 'dev-1', target: '' })).toBe(
      'rdp:1:dev-1:console'
    );
  });
});

describe('the console list', () => {
  it('replaces a console by key or appends it, and drops one', () => {
    const list = withConsole([shell], ssh);
    expect(list).toHaveLength(2);
    expect(withConsole(list, { ...ssh, accepts: false })[1].accepts).toBe(false);
    expect(withoutConsole(list, shell.key)).toEqual([ssh]);
  });

  it('answers the footer consoles, the page consoles of one machine and the receivers', () => {
    const list = [shell, ssh, vnc];
    expect(footerConsoles(list)).toEqual([shell, ssh]);
    expect(pageConsolesOf(list, '1', 'dev-1')).toEqual([vnc]);
    expect(pageConsolesOf(list, '1', 'dev-2')).toEqual([]);
    expect(receivers(list)).toEqual([ssh]);
  });
});

describe('nextActive', () => {
  it('keeps the active tab while it stays and takes the neighbour of the one that left', () => {
    const before = [shell, ssh, vnc];
    expect(nextActive(before, [shell, vnc], shell.key, ssh.key)).toBe(shell.key);
    expect(nextActive(before, [shell, vnc], ssh.key, ssh.key)).toBe(vnc.key);
    expect(nextActive(before, [shell, ssh], vnc.key, vnc.key)).toBe(ssh.key);
    expect(nextActive([shell], [], shell.key, shell.key)).toBe('');
  });
});

describe('broadcastText and withSent', () => {
  it('adds Enter as a carriage return while the preference says so', () => {
    expect(broadcastText('uptime', true)).toBe('uptime\r');
    expect(broadcastText('uptime', false)).toBe('uptime');
  });

  it('keeps the newest first, one entry a string and two hundred at most', () => {
    const sent = text => ({ text, at: '2026-10-18T12:00:00.000Z', took: 2, targets: ['Desk'] });
    expect(withSent([sent('ls'), sent('uptime')], sent('uptime')).map(entry => entry.text)).toEqual(
      ['uptime', 'ls']
    );
    const many = [...Array(200).keys()].map(index => sent(`cmd-${index}`));
    expect(withSent(many, sent('last'))).toHaveLength(200);
    expect(withSent(many, sent('last'))[0].text).toBe('last');
  });

  it('stores the history and reads it back, nothing for a value that is no list', () => {
    const entry = { text: 'uptime', at: '2026-10-18T12:00:00.000Z', took: 1, targets: ['Desk'] };
    writeStoredHistory([entry]);
    expect(readStoredHistory()).toEqual([entry]);
    storage.set('console_history', '{"a":1}');
    expect(readStoredHistory()).toEqual([]);
    writeStoredHistory([]);
    expect(storage.has('console_history')).toBe(false);
  });
});

describe('sessionToConsole and sessionLives', () => {
  it('names the machine of a listed SSH session and none for the host shell', () => {
    expect(sessionToConsole('ssh', '1', { id: 'c1', machine_name: 'dev-1' })).toEqual({
      key: 'ssh|1|dev-1||c1',
      kind: 'ssh',
      id: '1',
      name: 'dev-1',
      target: '',
      session: { id: 'c1', machine_name: 'dev-1' },
    });
    expect(sessionToConsole('host_shell', '1', { id: 'a1' }).name).toBe('');
  });

  it('joins an active or connecting session and never a closed one', () => {
    expect(sessionLives({ status: 'active' })).toBe(true);
    expect(sessionLives({ status: 'connecting' })).toBe(true);
    expect(sessionLives({ status: 'closed' })).toBe(false);
    expect(sessionLives(null)).toBe(false);
  });
});

describe('the stored placements', () => {
  it('reads an empty map while nothing is stored or the stored value is not a map', () => {
    expect(readStoredTabs()).toEqual({});
    storage.set('console_tabs', '[1]');
    expect(readStoredTabs()).toEqual({});
    storage.set('console_tabs', 'not json');
    expect(readStoredTabs()).toEqual({});
  });

  it('writes a placement under the storage key and drops it with no place', () => {
    const map = withStoredTab({}, ssh, 'footer');
    expect(map).toEqual({
      c1: { kind: 'ssh', id: '1', name: 'dev-1', target: '', placed: 'footer', accepts: true },
    });
    expect(withStoredTab(map, shell, 'footer')).toBe(map);
    expect(withStoredTab(map, ssh, '')).toEqual({});
  });

  it('removes the key when the map empties and lists the entries of one host', () => {
    const map = withStoredTab(withStoredTab({}, ssh, 'footer'), vnc, 'page');
    writeStoredTabs(map);
    expect(readStoredTabs()).toEqual(map);
    expect(storedTabsOf(map, '1')).toHaveLength(2);
    expect(storedTabsOf(map, 2)).toEqual([]);
    expect(storedTabFor(map, ssh)).toEqual(map.c1);
    expect(storedTabFor(map, shell)).toBeNull();
    writeStoredTabs({});
    expect(storage.has('console_tabs')).toBe(false);
  });
});
