import { describe, expect, it } from 'vitest';

import {
  CONSOLE_KINDS,
  asksConnectAs,
  captureFileName,
  consoleAdmin,
  consoleCredentialParamOf,
  consoleDoorsOf,
  consoleParamOf,
  consoleRoute,
  credentialsFor,
  doorCredentialOf,
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
    expect(consoleRoute('self', 'dev-1', 'ssh', 'sec a')).toBe(
      '/hosts/self/machines/dev-1?console=ssh&credential=sec%20a'
    );
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

  it('answers the credential the query names and the empty string otherwise', () => {
    expect(consoleCredentialParamOf(new URLSearchParams('console=ssh&credential=sec-a'))).toBe(
      'sec-a'
    );
    expect(consoleCredentialParamOf(new URLSearchParams('console=ssh'))).toBe('');
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

describe('credentialsFor and doorCredentialOf', () => {
  const detail = {
    credentials: [
      { id: 'a', use: 'ssh', default: false },
      { id: 'b', use: 'ssh', default: true },
      { id: 'c', use: 'rdp', default: true },
      { use: 'ssh' },
    ],
  };

  it('lists the credentials of one use, the default first', () => {
    expect(credentialsFor(detail, 'ssh').map(row => row.id)).toEqual(['b', 'a']);
    expect(credentialsFor(detail, 'console')).toEqual([]);
    expect(credentialsFor(null, 'ssh')).toEqual([]);
  });

  it('starts a door with the default while the use holds more than one and with none otherwise', () => {
    expect(doorCredentialOf(detail, 'ssh')).toBe('b');
    expect(doorCredentialOf(detail, 'rdp')).toBe('');
    expect(doorCredentialOf({}, 'ssh')).toBe('');
  });

  it('asks Connect as for SSH or RDP while the use holds more than one credential', () => {
    expect(asksConnectAs(detail, 'ssh')).toBe(true);
    expect(asksConnectAs(detail, 'rdp')).toBe(false);
    expect(
      asksConnectAs(
        {
          credentials: [
            { id: 'a', use: 'vnc' },
            { id: 'b', use: 'vnc' },
          ],
        },
        'vnc'
      )
    ).toBe(false);
    expect(asksConnectAs(null, 'ssh')).toBe(false);
  });
});

describe('captureFileName', () => {
  it('names the file by the console, the machine and the moment', () => {
    expect(captureFileName('vnc-screenshot', 'dev-1', 'png', 5)).toBe('vnc-screenshot-dev-1-5.png');
    expect(captureFileName('zlogin-output', 'web-1', 'txt', 7)).toBe('zlogin-output-web-1-7.txt');
  });
});
