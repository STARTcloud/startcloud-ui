import {
  fetchFtpInfo,
  fetchRdpInfo,
  fetchVncInfo,
  openDirectory,
  openFtp,
  openRdp,
  startSshSession,
} from '../api/consoleAPI';

const LOCAL_HOSTS = ['127.0.0.1', 'localhost'];

const vrdeRefusal = info => {
  if (!info.running) {
    return 'The machine must be running for the VNC console.';
  }
  if (!info.vrde_enabled) {
    return 'The remote display (VRDE) is off for this machine — turn VNC "on" via Edit Machine, then start it again.';
  }
  if (info.vnc_capable === false) {
    return "The host's VirtualBox has no usable VNC extension pack — install VBoxVNC on the host and restart the agent.";
  }
  return '';
};

/**
 * Start the VNC preview, hyperweaver-ui's start shared by every console
 * header: `GET machines/{name}/vnc` answering the remote display facts,
 * `vrde_enabled` among them, means the direct websockify model, the
 * display being the console with no session to start, so the session is
 * marked active for the viewer to connect; any other answer falls
 * through to the session model, `startVncSession` then one read of the
 * session's readiness. A refusal of the direct model, the machine off,
 * the display off or no VNC extension pack, is said through `setError`.
 *
 * @param {Object} options - The machine, the state setters and the session calls
 * @returns {Promise<void>} Settles when the console state moved or the refusal was said
 */
export const startVncPreview = async ({
  status,
  id,
  name,
  setLoadingVnc,
  setError,
  setMachineDetails,
  setActiveConsoleType,
  startVncSession,
  waitForVncSessionReady,
}) => {
  try {
    setLoadingVnc(true);
    let info = null;
    try {
      info = await fetchVncInfo(status, id, name);
    } catch {
      info = null;
    }
    if (info && 'vrde_enabled' in info) {
      const refusal = vrdeRefusal(info);
      if (refusal) {
        setError(refusal);
        return;
      }
      setMachineDetails(prev => ({ ...prev, active_vnc_session: true, vnc_session_info: info }));
      setActiveConsoleType('vnc');
      return;
    }
    const session = await startVncSession(status, id, name);
    const readiness = await waitForVncSessionReady(name);
    if (readiness.ready) {
      setMachineDetails(prev => ({
        ...prev,
        active_vnc_session: true,
        vnc_session_info: { ...session, ...readiness.sessionInfo },
      }));
      setActiveConsoleType('vnc');
    } else {
      setError(`VNC session started but not ready: ${readiness.reason}`);
    }
  } catch (error) {
    setError(`Error starting VNC console: ${error.message}`);
  } finally {
    setLoadingVnc(false);
  }
};

/**
 * Start the zlogin preview, zoneweaver-agent's session through the zone
 * terminal context, the console's state moved to it on success.
 *
 * @param {Object} options - The machine, the state setters and the context's start
 * @returns {Promise<void>} Settles when the console state moved or the failure was said
 */
export const startZloginPreview = async ({
  id,
  name,
  setLoading,
  setError,
  setMachineDetails,
  setActiveConsoleType,
  startZloginSessionExplicitly,
}) => {
  try {
    setLoading(true);
    const session = await startZloginSessionExplicitly(id, name);
    if (session) {
      setMachineDetails(prev => ({
        ...prev,
        zlogin_session: session,
        active_zlogin_session: true,
      }));
      setActiveConsoleType('zlogin');
    } else {
      setError('Error starting zlogin console');
    }
  } catch (error) {
    setError(`Error starting zlogin console: ${error.message}`);
  } finally {
    setLoading(false);
  }
};

const sshHint = error => {
  if (/vagrant_user/iu.test(error.message || '')) {
    return ' — set the SSH user under Edit Machine → Credentials.';
  }
  const candidates = error.data?.ip_candidates;
  return Array.isArray(candidates) ? ` — candidate addresses: ${candidates.join(', ')}.` : '';
};

/**
 * Start the SSH console, `POST machines/{name}/ssh/start`, the session
 * row kept in the console's state for the shell to attach to; `ipIndex`
 * targets one of a multi-homed guest's candidate addresses, the next
 * one after a dead connect. A refusal is said with the agent's hint,
 * the SSH user to set or the legal candidates a 400 names.
 *
 * @param {Object} options - The machine, the state setters and the address index
 * @returns {Promise<void>} Settles when the console state moved or the refusal was said
 */
export const startSshPreview = async ({
  status,
  id,
  name,
  setLoading,
  setError,
  setMachineDetails,
  setActiveConsoleType,
  ipIndex = 0,
}) => {
  try {
    setLoading(true);
    const session = await startSshSession(status, id, name, ipIndex);
    if (session?.id) {
      setMachineDetails(prev => ({ ...prev, ssh_session: session }));
      setActiveConsoleType('ssh');
    } else {
      setError('SSH session failed: the agent answered no session.');
    }
  } catch (error) {
    setError(`SSH session failed: ${error.message}${sshHint(error)}`);
  } finally {
    setLoading(false);
  }
};

/**
 * Start the browser-RDP console, the IronRDP client over the agent's
 * RDCleanPath bridge, one of two targets: `console`, the hypervisor's
 * remote display, whose start reads `GET machines/{name}/vnc` for the
 * running check and the display facts the connection panel draws, and
 * `guest`, the guest's own RDP server, which the bridge resolves itself
 * and needs no read. The pane opens its socket on its own; no agent
 * session row exists.
 *
 * @param {Object} options - The machine, the state setters and the target
 * @returns {Promise<void>} Settles when the console state moved or the refusal was said
 */
export const startRdpPreview = async ({
  status,
  id,
  name,
  setLoading,
  setError,
  setMachineDetails,
  setActiveConsoleType,
  target = 'console',
}) => {
  try {
    setLoading(true);
    if (target === 'guest') {
      setMachineDetails(prev => ({ ...prev, rdp_session: { target: 'guest' } }));
      setActiveConsoleType('rdp');
      return;
    }
    const facts = {};
    let info = null;
    try {
      info = await fetchVncInfo(status, id, name);
    } catch {
      info = null;
    }
    if (info && 'vrde_enabled' in info) {
      if (!info.running) {
        setError('The machine must be running for the RDP console.');
        return;
      }
      if (info.video) {
        facts.video = info.video;
      }
      if (typeof info.additions_run_level === 'number') {
        facts.additions_run_level = info.additions_run_level;
      }
    }
    setMachineDetails(prev => ({ ...prev, rdp_session: { target: 'console', ...facts } }));
    setActiveConsoleType('rdp');
  } catch (error) {
    setError(`Error starting RDP console: ${error.message}`);
  } finally {
    setLoading(false);
  }
};

/**
 * Open the machine in an RDP client outside the browser, behind
 * `host-launchers`: on an agent role, the agent host being the desktop,
 * `POST machines/{name}/open-rdp` launches the host's own client; on the
 * server role the guest's `rdp_url` of `GET machines/{name}/rdp` is handed
 * to the browser, and a machine whose only target is the display on the
 * agent host's loopback is said to be reachable from that host alone.
 *
 * @param {Object} options - The machine, whether the page is served by the agent and the setters
 * @returns {Promise<void>} Settles when the client opened or the refusal was said
 */
export const launchRdp = async ({ status, id, name, isDirect, setLoading, setError }) => {
  setLoading(true);
  try {
    const info = await fetchRdpInfo(status, id, name);
    if (isDirect) {
      await openRdp(status, id, name);
      return;
    }
    const guest = (info?.targets || []).find(target => target.type === 'guest');
    if (guest?.rdp_url) {
      window.open(guest.rdp_url);
    } else {
      setError(
        'Only the VRDE console target exists (127.0.0.1 on the agent host) — it is only reachable from that host.'
      );
    }
  } catch (error) {
    setError(`RDP unavailable: ${error.message}`);
  } finally {
    setLoading(false);
  }
};

/**
 * Open the machine's working directory or an sftp handler at it, behind
 * `host-launchers`: on an agent role the agent host's own file manager or
 * handler through `POST machines/{name}/open-directory` and `open-ftp`;
 * on the server role the browser's own sftp handler at the `sftp_url` of
 * `GET machines/{name}/ftp`, unless the address is a forward on the
 * agent host's loopback, which is said to be reachable from that host
 * alone.
 *
 * @param {Object} options - The kind, the machine, whether the page is served by the agent and the setter
 * @returns {Promise<void>} Settles when the handler opened or the refusal was said
 */
export const launchDirectoryOrFtp = async ({ kind, status, id, name, isDirect, setError }) => {
  try {
    if (isDirect) {
      await (kind === 'directory' ? openDirectory : openFtp)(status, id, name);
      return;
    }
    const info = await fetchFtpInfo(status, id, name);
    if (!info?.sftp_url) {
      setError('FTP info failed: the agent answered no address.');
      return;
    }
    if (LOCAL_HOSTS.includes(info.host)) {
      setError(
        `This machine's SFTP endpoint (${info.sftp_url}) is a NAT forward on the agent host — it is only reachable from that host.`
      );
    } else {
      window.open(info.sftp_url);
    }
  } catch (error) {
    setError(`${kind === 'directory' ? 'Open' : 'FTP info'} failed: ${error.message}`);
  }
};

/**
 * Start one console by its key, the one start every switch-or-start
 * button calls: VNC through `startVncPreview` with its own waiting flag
 * and session calls, zlogin through `startZloginPreview` with the zone
 * terminal's start, SSH through `startSshPreview` and RDP through
 * `startRdpPreview`.
 *
 * @param {Object} options - The kind, the shared starters and the console-specific calls
 * @returns {Promise<void>} Settles as the start it forwards to does
 */
export const startConsole = ({
  kind,
  starters,
  setLoadingVnc,
  startVncSession,
  waitForVncSessionReady,
  startZloginSessionExplicitly,
}) => {
  if (kind === 'vnc') {
    return startVncPreview({ ...starters, setLoadingVnc, startVncSession, waitForVncSessionReady });
  }
  if (kind === 'zlogin') {
    return startZloginPreview({ ...starters, startZloginSessionExplicitly });
  }
  if (kind === 'ssh') {
    return startSshPreview(starters);
  }
  return startRdpPreview(starters);
};
