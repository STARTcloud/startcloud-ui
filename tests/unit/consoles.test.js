import { describe, expect, it } from 'vitest';

import {
  CONSOLE_KINDS,
  captureFileName,
  consoleAdmin,
  consoleDoorsOf,
  consoleParamOf,
  consoleRoute,
  guestIpsOf,
  hostHasConsoles,
  hostOffersConsole,
  sshAddressesOf,
  sshReady,
  standaloneConsoleRoute,
} from '../../src/features/hosts/utils/consoles.js';

const rowOf = (consoles, features) => ({ capabilities: { console: consoles, features } });

describe('consoleDoorsOf', () => {
  it('offers the consoles the row lists, vnc, zlogin and rdp from console and ssh from features', () => {
    expect(consoleDoorsOf(rowOf(['vnc', 'zlogin'], ['machines'])).map(door => door.key)).toEqual([
      'vnc',
      'zlogin',
    ]);
    expect(consoleDoorsOf(rowOf(['rdp'], ['ssh'])).map(door => door.key)).toEqual(['ssh', 'rdp']);
    expect(consoleDoorsOf(rowOf(['vnc', 'zlogin', 'rdp'], ['ssh'])).map(door => door.key)).toEqual(
      CONSOLE_KINDS
    );
  });

  it('offers nothing for a row without the lists and for no row', () => {
    expect(consoleDoorsOf({ capabilities: {} })).toEqual([]);
    expect(consoleDoorsOf({ capabilities: null })).toEqual([]);
    expect(consoleDoorsOf(null)).toEqual([]);
    expect(hostHasConsoles(null)).toBe(false);
    expect(hostHasConsoles(rowOf(['vnc'], []))).toBe(true);
  });

  it('reads a console token strictly and a feature token strictly', () => {
    expect(hostOffersConsole(rowOf(['vnc'], []), { token: 'vnc', feature: false })).toBe(true);
    expect(hostOffersConsole(rowOf([], ['ssh']), { token: 'ssh', feature: true })).toBe(true);
    expect(hostOffersConsole(rowOf(['ssh'], []), { token: 'ssh', feature: true })).toBe(false);
  });
});

describe('consoleRoute and standaloneConsoleRoute', () => {
  it('names the console in the machine route query and the full-window pages', () => {
    expect(consoleRoute('1', 'dev 1', 'vnc')).toBe('/hosts/1/machines/dev%201?console=vnc');
    expect(standaloneConsoleRoute('self', 'dev-1', 'vnc')).toBe(
      '/hosts/self/machines/dev-1/console/vnc'
    );
    expect(standaloneConsoleRoute('1', 'dev-1', 'rdp', 'guest')).toBe(
      '/hosts/1/machines/dev-1/console/rdp?target=guest'
    );
    expect(standaloneConsoleRoute('1', 'dev-1', 'rdp', 'console')).toBe(
      '/hosts/1/machines/dev-1/console/rdp'
    );
  });
});

describe('consoleParamOf', () => {
  it('answers a known console and the empty string otherwise', () => {
    expect(consoleParamOf(new URLSearchParams('console=zlogin'))).toBe('zlogin');
    expect(consoleParamOf(new URLSearchParams('console=serial'))).toBe('');
    expect(consoleParamOf(new URLSearchParams(''))).toBe('');
  });
});

describe('consoleAdmin', () => {
  it('admits the three admin roles alone', () => {
    expect(consoleAdmin({ role: 'admin' })).toBe(true);
    expect(consoleAdmin({ role: 'super-admin' })).toBe(true);
    expect(consoleAdmin({ role: 'organization-admin' })).toBe(true);
    expect(consoleAdmin({ role: 'user' })).toBe(false);
    expect(consoleAdmin(null)).toBe(false);
  });
});

describe('sshReady and guestIpsOf', () => {
  it('needs a running machine with a guest address', () => {
    const detail = { configuration: { guest_info: { ips: ['10.0.0.5'] } } };
    expect(guestIpsOf(detail)).toEqual(['10.0.0.5']);
    expect(guestIpsOf({ configuration: {} })).toEqual([]);
    expect(guestIpsOf(null)).toEqual([]);
    expect(sshReady({ running: true, ips: ['10.0.0.5'] })).toBe(true);
    expect(sshReady({ running: false, ips: ['10.0.0.5'] })).toBe(false);
    expect(sshReady({ running: true, ips: [] })).toBe(false);
  });
});

describe('sshAddressesOf', () => {
  it('names the candidates, the one in use and the next one, wrapping', () => {
    expect(sshAddressesOf({ ip_candidates: ['10.0.0.5', '10.0.0.6'], ip_index: 1 })).toEqual({
      ipCandidates: ['10.0.0.5', '10.0.0.6'],
      ipIndex: 1,
      nextIndex: 0,
    });
    expect(sshAddressesOf({ ip_candidates: ['10.0.0.5'], ip_index: 0 })).toEqual({
      ipCandidates: ['10.0.0.5'],
      ipIndex: 0,
      nextIndex: null,
    });
    expect(sshAddressesOf(null)).toEqual({ ipCandidates: [], ipIndex: 0, nextIndex: null });
    expect(sshAddressesOf({ ip_index: 'x' }).ipIndex).toBe(0);
  });
});

describe('captureFileName', () => {
  it('names the file by the console, the machine and the moment', () => {
    expect(captureFileName('vnc-screenshot', 'dev-1', 'png', 5)).toBe('vnc-screenshot-dev-1-5.png');
    expect(captureFileName('zlogin-output', 'web-1', 'txt', 7)).toBe('zlogin-output-web-1-7.txt');
  });
});
