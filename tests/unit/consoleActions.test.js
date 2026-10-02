import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../src/features/hosts/api/consoleAPI.js', () => ({
  fetchVncInfo: vi.fn(),
  fetchRdpInfo: vi.fn(),
  fetchFtpInfo: vi.fn(),
  openRdp: vi.fn(),
  openDirectory: vi.fn(),
  openFtp: vi.fn(),
  startSshSession: vi.fn(),
}));

const api = await import('../../src/features/hosts/api/consoleAPI.js');
const {
  launchDirectoryOrFtp,
  launchRdp,
  startConsole,
  startRdpPreview,
  startSshPreview,
  startVncPreview,
  startZloginPreview,
} = await import('../../src/features/hosts/components/consoleActions.js');

const status = { role: 'hyperweaver-server' };

const settersOf = () => {
  const details = { current: {} };
  return {
    details,
    setters: {
      setLoading: vi.fn(),
      setLoadingVnc: vi.fn(),
      setError: vi.fn(),
      setActiveConsoleType: vi.fn(),
      setMachineDetails: vi.fn(updater => {
        details.current = updater(details.current);
      }),
    },
  };
};

beforeEach(() => {
  vi.resetAllMocks();
  globalThis.window = { open: vi.fn() };
});

describe('startVncPreview', () => {
  it('marks the session active on the direct model when the display is on and the machine runs', async () => {
    const { details, setters } = settersOf();
    api.fetchVncInfo.mockResolvedValue({ vrde_enabled: true, running: true, vnc_capable: true });
    const startVncSession = vi.fn();
    await startVncPreview({
      status,
      id: '1',
      name: 'dev-1',
      ...setters,
      startVncSession,
      waitForVncSessionReady: vi.fn(),
    });
    expect(startVncSession).not.toHaveBeenCalled();
    expect(details.current.active_vnc_session).toBe(true);
    expect(details.current.vnc_session_info.vrde_enabled).toBe(true);
    expect(setters.setActiveConsoleType).toHaveBeenCalledWith('vnc');
    expect(setters.setLoadingVnc.mock.calls).toEqual([[true], [false]]);
  });

  it('refuses the direct model while the machine is off or the display is off', async () => {
    const { details, setters } = settersOf();
    api.fetchVncInfo.mockResolvedValue({ vrde_enabled: true, running: false });
    await startVncPreview({
      status,
      id: '1',
      name: 'dev-1',
      ...setters,
      startVncSession: vi.fn(),
      waitForVncSessionReady: vi.fn(),
    });
    expect(setters.setError).toHaveBeenCalledWith(
      'The machine must be running for the VNC console.'
    );
    expect(details.current.active_vnc_session).toBeUndefined();
    api.fetchVncInfo.mockResolvedValue({ vrde_enabled: false, running: true });
    await startVncPreview({
      status,
      id: '1',
      name: 'dev-1',
      ...setters,
      startVncSession: vi.fn(),
      waitForVncSessionReady: vi.fn(),
    });
    expect(setters.setError).toHaveBeenCalledTimes(2);
  });

  it('falls through to the session model when the facts are not answered', async () => {
    const { details, setters } = settersOf();
    api.fetchVncInfo.mockRejectedValue(new Error('Not Found'));
    const startVncSession = vi.fn().mockResolvedValue({ id: 's1', web_port: 6080 });
    const waitForVncSessionReady = vi
      .fn()
      .mockResolvedValue({ ready: true, sessionInfo: { status: 'active' } });
    await startVncPreview({
      status,
      id: 'self',
      name: 'web-1',
      ...setters,
      startVncSession,
      waitForVncSessionReady,
    });
    expect(startVncSession).toHaveBeenCalledWith(status, 'self', 'web-1');
    expect(details.current.vnc_session_info).toEqual({
      id: 's1',
      web_port: 6080,
      status: 'active',
    });
    expect(setters.setActiveConsoleType).toHaveBeenCalledWith('vnc');
  });

  it('says why a session that started is not ready', async () => {
    const { setters } = settersOf();
    api.fetchVncInfo.mockRejectedValue(new Error('Not Found'));
    await startVncPreview({
      status,
      id: 'self',
      name: 'web-1',
      ...setters,
      startVncSession: vi.fn().mockResolvedValue({ id: 's1' }),
      waitForVncSessionReady: vi.fn().mockResolvedValue({ ready: false, reason: 'no session' }),
    });
    expect(setters.setError).toHaveBeenCalledWith('VNC session started but not ready: no session');
    expect(setters.setActiveConsoleType).not.toHaveBeenCalled();
  });
});

describe('startZloginPreview', () => {
  it('keeps the session the context started and moves the console to zlogin', async () => {
    const { details, setters } = settersOf();
    const startZloginSessionExplicitly = vi.fn().mockResolvedValue({ id: 'z1' });
    await startZloginPreview({
      id: 'self',
      name: 'web-1',
      ...setters,
      startZloginSessionExplicitly,
    });
    expect(startZloginSessionExplicitly).toHaveBeenCalledWith('self', 'web-1');
    expect(details.current.zlogin_session).toEqual({ id: 'z1' });
    expect(details.current.active_zlogin_session).toBe(true);
    expect(setters.setActiveConsoleType).toHaveBeenCalledWith('zlogin');
  });

  it('says so when no session came back', async () => {
    const { setters } = settersOf();
    await startZloginPreview({
      id: 'self',
      name: 'web-1',
      ...setters,
      startZloginSessionExplicitly: vi.fn().mockResolvedValue(null),
    });
    expect(setters.setError).toHaveBeenCalledWith('Error starting zlogin console');
  });
});

describe('startSshPreview', () => {
  it('keeps the session row and names the candidates a refusal carries', async () => {
    const { details, setters } = settersOf();
    api.startSshSession.mockResolvedValue({ id: 'c1', ssh_host: '10.0.0.5' });
    await startSshPreview({ status, id: '1', name: 'dev-1', ...setters, ipIndex: 1 });
    expect(api.startSshSession).toHaveBeenCalledWith(status, '1', 'dev-1', 1);
    expect(details.current.ssh_session.id).toBe('c1');
    expect(setters.setActiveConsoleType).toHaveBeenCalledWith('ssh');
    const refusal = Object.assign(new Error('ip_index out of range'), {
      data: { ip_candidates: ['10.0.0.5', '10.0.0.6'] },
    });
    api.startSshSession.mockRejectedValue(refusal);
    await startSshPreview({ status, id: '1', name: 'dev-1', ...setters });
    expect(setters.setError).toHaveBeenCalledWith(
      'SSH session failed: ip_index out of range — candidate addresses: 10.0.0.5, 10.0.0.6.'
    );
  });

  it('hints at the SSH user when the agent names vagrant_user', async () => {
    const { setters } = settersOf();
    api.startSshSession.mockRejectedValue(new Error('no vagrant_user configured'));
    await startSshPreview({ status, id: '1', name: 'dev-1', ...setters });
    expect(setters.setError).toHaveBeenCalledWith(
      'SSH session failed: no vagrant_user configured — set the SSH user under Edit Machine → Credentials.'
    );
  });
});

describe('startRdpPreview', () => {
  it('keeps the display facts for the console target and nothing for the guest target', async () => {
    const { details, setters } = settersOf();
    api.fetchVncInfo.mockResolvedValue({
      vrde_enabled: true,
      running: true,
      video: { width: 1024, height: 768, depth: 32 },
      additions_run_level: 2,
    });
    await startRdpPreview({ status, id: '1', name: 'dev-1', ...setters });
    expect(details.current.rdp_session).toEqual({
      target: 'console',
      video: { width: 1024, height: 768, depth: 32 },
      additions_run_level: 2,
    });
    await startRdpPreview({ status, id: '1', name: 'dev-1', ...setters, target: 'guest' });
    expect(details.current.rdp_session).toEqual({ target: 'guest' });
    expect(api.fetchVncInfo).toHaveBeenCalledTimes(1);
  });

  it('refuses the console target while the machine is off', async () => {
    const { details, setters } = settersOf();
    api.fetchVncInfo.mockResolvedValue({ vrde_enabled: true, running: false });
    await startRdpPreview({ status, id: '1', name: 'dev-1', ...setters });
    expect(setters.setError).toHaveBeenCalledWith(
      'The machine must be running for the RDP console.'
    );
    expect(details.current.rdp_session).toBeUndefined();
  });
});

describe('startConsole', () => {
  it('forwards each kind to its own start', async () => {
    const { details, setters } = settersOf();
    const starters = { status, id: '1', name: 'dev-1', ...setters };
    api.startSshSession.mockResolvedValue({ id: 'c9' });
    await startConsole({ kind: 'ssh', starters });
    expect(details.current.ssh_session.id).toBe('c9');
    const startZloginSessionExplicitly = vi.fn().mockResolvedValue({ id: 'z9' });
    await startConsole({ kind: 'zlogin', starters, startZloginSessionExplicitly });
    expect(details.current.zlogin_session.id).toBe('z9');
    await startConsole({ kind: 'rdp', starters: { ...starters, target: 'guest' } });
    expect(details.current.rdp_session).toEqual({ target: 'guest' });
    api.fetchVncInfo.mockResolvedValue({ vrde_enabled: true, running: true });
    await startConsole({
      kind: 'vnc',
      starters,
      setLoadingVnc: setters.setLoadingVnc,
      startVncSession: vi.fn(),
      waitForVncSessionReady: vi.fn(),
    });
    expect(details.current.active_vnc_session).toBe(true);
    expect(setters.setActiveConsoleType.mock.calls.map(([kind]) => kind)).toEqual([
      'ssh',
      'zlogin',
      'rdp',
      'vnc',
    ]);
  });
});

describe('launchRdp', () => {
  it('opens the agent host client on an agent role and the guest url on the server role', async () => {
    const { setters } = settersOf();
    api.fetchRdpInfo.mockResolvedValue({
      targets: [{ type: 'guest', rdp_url: 'rdp://10.0.0.5:3389' }],
    });
    await launchRdp({ status, id: 'self', name: 'dev-1', isDirect: true, ...setters });
    expect(api.openRdp).toHaveBeenCalledWith(status, 'self', 'dev-1');
    await launchRdp({ status, id: '1', name: 'dev-1', isDirect: false, ...setters });
    expect(globalThis.window.open).toHaveBeenCalledWith('rdp://10.0.0.5:3389');
    api.fetchRdpInfo.mockResolvedValue({ targets: [{ type: 'console' }] });
    await launchRdp({ status, id: '1', name: 'dev-1', isDirect: false, ...setters });
    expect(setters.setError).toHaveBeenCalledTimes(1);
  });
});

describe('launchDirectoryOrFtp', () => {
  it('opens on the agent host on an agent role and hands the browser the sftp url otherwise', async () => {
    const { setters } = settersOf();
    await launchDirectoryOrFtp({
      kind: 'directory',
      status,
      id: 'self',
      name: 'dev-1',
      isDirect: true,
      ...setters,
    });
    expect(api.openDirectory).toHaveBeenCalledWith(status, 'self', 'dev-1');
    api.fetchFtpInfo.mockResolvedValue({ sftp_url: 'sftp://u@10.0.0.5:22', host: '10.0.0.5' });
    await launchDirectoryOrFtp({
      kind: 'ftp',
      status,
      id: '1',
      name: 'dev-1',
      isDirect: false,
      ...setters,
    });
    expect(globalThis.window.open).toHaveBeenCalledWith('sftp://u@10.0.0.5:22');
    api.fetchFtpInfo.mockResolvedValue({ sftp_url: 'sftp://u@127.0.0.1:2222', host: '127.0.0.1' });
    await launchDirectoryOrFtp({
      kind: 'ftp',
      status,
      id: '1',
      name: 'dev-1',
      isDirect: false,
      ...setters,
    });
    expect(setters.setError).toHaveBeenCalledTimes(1);
  });
});
