import PropTypes from 'prop-types';
import { Suspense, lazy, useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';

import SectionCard, { foldsShape } from '../../../components/common/SectionCard';
import { useNotify } from '../../../contexts/NoticeContext';
import { useStatus } from '../../../contexts/StatusContext';
import { startVncSession as startVncSessionCall } from '../api/consoleAPI';
import { useHostRow } from '../hooks/useHostRow';
import { useConsoleActions } from '../hooks/useOpenConsole';
import { consolesHeld, dropConsole, useConsoles, usePageConsoles } from '../hooks/useTerminal';
import { useVncSession } from '../hooks/useVncSession';
import { useZloginSession } from '../hooks/useZloginSession';
import { useZoneTerminal } from '../hooks/useZoneTerminal';
import { hostHasConsole } from '../utils/capabilities';
import { consoleParamOf, hostHasConsoles } from '../utils/consoles';
import { consoleKeyOf, isHeldKind } from '../utils/terminals';

import { startRdpPreview, startSshPreview, startVncPreview } from './consoleActions';
import ConsoleDisplay from './ConsoleDisplay';
import FooterConsoleNotes from './FooterConsoleNotes';
import ZloginModal from './ZloginModal';

const VncModal = lazy(() => import('./VncModal'));

const FOLD = 'machine-console';

const NO_SESSIONS = {};

const CLEARED = {
  ssh: { ssh_session: null },
  zlogin: { zlogin_session: null, active_zlogin_session: false },
  vnc: { active_vnc_session: false, vnc_session_info: null },
  rdp: { rdp_session: null },
};

/**
 * The console state a page console of the store draws as: its session
 * under the member the display of its kind reads.
 *
 * @param {Object} entry - The console of the store
 * @returns {Object} The patch of the console state
 */
export const sessionPatchOf = entry => {
  if (entry.kind === 'ssh') {
    return { ssh_session: entry.session };
  }
  if (entry.kind === 'zlogin') {
    return { zlogin_session: entry.session, active_zlogin_session: true };
  }
  if (entry.kind === 'vnc') {
    return { active_vnc_session: true, vnc_session_info: entry.session };
  }
  return { rdp_session: { target: entry.target || 'console', ...(entry.session || {}) } };
};

/**
 * The session a display of one kind holds in the console state, the one
 * a move to the footer takes with it; null while it holds none.
 *
 * @param {Object} details - The console state
 * @param {string} kind - `ssh`, `zlogin`, `vnc` or `rdp`
 * @returns {Object|null} The session
 */
export const pageSessionOf = (details, kind) => {
  if (kind === 'ssh') {
    return details.ssh_session?.id ? details.ssh_session : null;
  }
  if (kind === 'zlogin') {
    return details.zlogin_session?.id ? details.zlogin_session : null;
  }
  if (kind === 'vnc') {
    return details.active_vnc_session ? details.vnc_session_info || {} : null;
  }
  return details.rdp_session || null;
};

/**
 * The console type the section should show after the sessions moved,
 * hyperweaver-ui's rule: an SSH or RDP choice over a live session is
 * kept; with both VNC and zlogin active the choice is kept, VNC when it
 * names neither; zlogin alone active moves the choice to zlogin, VNC
 * alone to VNC, and neither to VNC.
 *
 * @param {Object} details - The console state
 * @param {string} current - The console type chosen now
 * @returns {string} The console type to chose
 */
export const consoleTypeAfter = (details, current) => {
  if (
    (current === 'ssh' && details.ssh_session?.id) ||
    (current === 'rdp' && details.rdp_session)
  ) {
    return current;
  }
  const hasVnc = Boolean(details.active_vnc_session);
  const hasZlogin = Boolean(details.zlogin_session);
  if (hasVnc && hasZlogin) {
    return current === 'zlogin' ? 'zlogin' : 'vnc';
  }
  if (hasZlogin) {
    return 'zlogin';
  }
  return 'vnc';
};

/**
 * The console of one machine on its page, hyperweaver-ui's console half
 * of the Machines page carried as one section card that folds under
 * `machine-console`: the console section of `ConsoleDisplay` over the
 * console state, the sessions of VNC, zlogin, SSH and RDP laid over the
 * detail the page holds, so a start marks its session in the console
 * alone and the detail is never written; the VNC dialog and the zlogin
 * dialog over the page; and the doors, a `console` query on the
 * machine's route, `vnc`, `zlogin`, `ssh` or `rdp`, read once as the
 * panel draws and dropped from the route, opening the VNC or zlogin
 * dialog or starting the SSH or RDP console. The sessions the agent
 * already holds are read as the panel draws and again when `turn`
 * moves, the page's Refresh and the stream's fresh opening, a VNC
 * session from `GET machines/{name}/vnc/info` on a host that lists `vnc`
 * and a zlogin session from `GET zlogin/sessions` on one that lists
 * `zlogin`; SSH and RDP sessions are the console's own, no agent list
 * holding them. Nothing reads on a clock, hyperweaver-ui's
 * thirty-second read not carried over. A host whose row lists no
 * console token draws the placard saying no console is available. A
 * console of this machine placed in the footer's Consoles view draws
 * one line here with Send to this page, which brings it back with its
 * session; a console placed on this page by the footer's Send to the
 * machine's page is drawn as the display of its kind over the session
 * it carries; every live display's Send to footer takes its session to
 * the footer; and a page console ends with the page, the SSH session
 * stopped and the VNC and RDP viewers let go, the zlogin terminal kept
 * by the zone terminal provider as it is.
 */
const MachineConsolePanel = ({ id, name, detail = null, running, turn, user = null, folds }) => {
  const { t } = useTranslation();
  const status = useStatus();
  const notify = useNotify();
  const server = useHostRow(id);
  const [searchParams, setSearchParams] = useSearchParams();
  const [sessions, setSessions] = useState(NO_SESSIONS);
  const [loading, setLoading] = useState(false);
  const [activeConsoleType, setActiveConsoleType] = useState('vnc');
  const [previewReadOnly, setPreviewReadOnly] = useState(true);
  const [previewReconnectKey, setPreviewReconnectKey] = useState(0);
  const [previewVncViewOnly, setPreviewVncViewOnly] = useState(true);
  const [modalVncViewOnly, setModalVncViewOnly] = useState(false);
  const [modalReadOnly, setModalReadOnly] = useState(false);
  const modalVncRef = useRef(null);
  const previewVncRef = useRef(null);
  const machineDetails = { ...(detail || {}), ...sessions };
  const offered = hostHasConsoles(server);
  const vncOffered = hostHasConsole(server, 'vnc');
  const zloginOffered = hostHasConsole(server, 'zlogin');

  const setMachineDetails = useCallback(
    updater => setSessions(prev => (typeof updater === 'function' ? updater(prev) : updater)),
    []
  );

  const setError = useCallback(message => notify('danger', message), [notify]);

  const vnc = useVncSession({ id, setMachineDetails, previewVncRef, modalVncRef });
  const zlogin = useZloginSession({ id, name, setMachineDetails });
  const { forceZoneSessionCleanup, startZloginSessionExplicitly, pasteTextToZone } =
    useZoneTerminal();
  const { refreshVncSessionStatus, setShowVncConsole, waitForVncSessionReady, setLoadingVnc } = vnc;
  const {
    refreshZloginSessionStatus,
    handleZloginConsole,
    setShowZloginConsole,
    showZloginConsole,
  } = zlogin;

  const scope = `${id}:${name}`;
  const [seen, setSeen] = useState({ scope, sessions: NO_SESSIONS });
  if (seen.scope !== scope) {
    setSeen({ scope, sessions: NO_SESSIONS });
    setSessions(NO_SESSIONS);
    setActiveConsoleType('vnc');
  } else if (seen.sessions !== sessions) {
    setSeen({ scope, sessions });
    setActiveConsoleType(current => consoleTypeAfter(sessions, current));
  }

  const consoles = useConsoleActions();
  const pageConsoles = usePageConsoles(id, name);
  const every = useConsoles();
  const inFooter = every.filter(
    entry => entry.placed === 'footer' && entry.id === id && entry.name === name
  );
  const drawn = useRef(new Set());
  const consolesRef = useRef(consoles);

  useEffect(() => {
    consolesRef.current = consoles;
  });

  useEffect(() => {
    const present = new Set(pageConsoles.map(entry => entry.key));
    drawn.current.forEach(key => {
      if (!present.has(key)) {
        drawn.current.delete(key);
      }
    });
    const fresh = pageConsoles.filter(entry => !drawn.current.has(entry.key));
    if (fresh.length === 0) {
      return;
    }
    fresh.forEach(entry => drawn.current.add(entry.key));
    setSessions(prev =>
      fresh.reduce((state, entry) => ({ ...state, ...sessionPatchOf(entry) }), prev)
    );
    setActiveConsoleType(fresh[fresh.length - 1].kind);
  }, [pageConsoles]);

  useEffect(
    () => () => {
      consolesHeld()
        .filter(entry => entry.placed === 'page' && entry.id === id && entry.name === name)
        .forEach(entry => {
          if (isHeldKind(entry.kind)) {
            consolesRef.current.close(entry.key);
          } else {
            dropConsole(entry.key);
          }
        });
    },
    [id, name]
  );

  const sendToFooter = useCallback(
    async kind => {
      const session = pageSessionOf(sessions, kind);
      if (!session) {
        return;
      }
      const key = consoleKeyOf({ kind, id, name, target: session.target || '', session });
      drawn.current.delete(key);
      setSessions(prev => ({ ...prev, ...CLEARED[kind] }));
      if (consolesHeld().some(entry => entry.key === key)) {
        consoles.move(key, 'footer');
        return;
      }
      await consoles.adopt({
        kind,
        id,
        name,
        target: session.target || '',
        server,
        session,
        placed: 'footer',
        accepts: false,
      });
    },
    [sessions, id, name, server, consoles]
  );

  const sendToPage = useCallback(key => consoles.move(key, 'page'), [consoles]);

  useEffect(() => {
    if (vncOffered) {
      refreshVncSessionStatus(name);
    }
    if (zloginOffered) {
      refreshZloginSessionStatus(name);
    }
  }, [vncOffered, zloginOffered, name, turn, refreshVncSessionStatus, refreshZloginSessionStatus]);

  const shownZlogin = useRef(zlogin.showZloginConsole);
  useEffect(() => {
    if (shownZlogin.current && !zlogin.showZloginConsole) {
      setPreviewReconnectKey(value => value + 1);
    }
    shownZlogin.current = zlogin.showZloginConsole;
  }, [zlogin.showZloginConsole]);

  const wanted = consoleParamOf(searchParams);
  useEffect(() => {
    if (!wanted || !offered) {
      return;
    }
    setSearchParams(
      params => {
        const next = new URLSearchParams(params);
        next.delete('console');
        return next;
      },
      { replace: true }
    );
    const starters = {
      status,
      id,
      name,
      setLoading,
      setError,
      setMachineDetails,
      setActiveConsoleType,
    };
    if (wanted === 'vnc') {
      startVncPreview({
        ...starters,
        setLoadingVnc,
        startVncSession: startVncSessionCall,
        waitForVncSessionReady,
      }).then(() => setShowVncConsole(true));
    } else if (wanted === 'zlogin') {
      handleZloginConsole(name).then(result => {
        if (!result.success) {
          setError(result.message);
        }
      });
    } else if (wanted === 'ssh') {
      startSshPreview(starters);
    } else if (wanted === 'rdp') {
      startRdpPreview(starters);
    }
  }, [
    wanted,
    offered,
    status,
    id,
    name,
    setError,
    setMachineDetails,
    setSearchParams,
    setLoadingVnc,
    waitForVncSessionReady,
    setShowVncConsole,
    handleZloginConsole,
  ]);

  return (
    <div className="col-12 col-lg-6" data-panel="machine-console">
      <SectionCard
        title={t('pages.machines.consoleHeading')}
        className="mb-0 h-100"
        folded={folds.folded(FOLD)}
        onFold={() => folds.toggle(FOLD)}
      >
        {inFooter.length > 0 ? (
          <FooterConsoleNotes consoles={inFooter} onSendToPage={sendToPage} />
        ) : null}
        {offered ? (
          <ConsoleDisplay
            id={id}
            name={name}
            server={server}
            user={user}
            running={running}
            turn={turn}
            machineDetails={machineDetails}
            activeConsoleType={activeConsoleType}
            sendToFooter={sendToFooter}
            loading={loading}
            loadingVnc={vnc.loadingVnc}
            previewReadOnly={previewReadOnly}
            previewVncViewOnly={previewVncViewOnly}
            previewReconnectKey={previewReconnectKey}
            vncReconnectKey={vnc.vncReconnectKey}
            vncSettings={vnc.vncSettings}
            setActiveConsoleType={setActiveConsoleType}
            setLoading={setLoading}
            setLoadingVnc={vnc.setLoadingVnc}
            setError={setError}
            setPreviewReadOnly={setPreviewReadOnly}
            setPreviewVncViewOnly={setPreviewVncViewOnly}
            setMachineDetails={setMachineDetails}
            startVncSession={startVncSessionCall}
            startZloginSessionExplicitly={startZloginSessionExplicitly}
            waitForVncSessionReady={vnc.waitForVncSessionReady}
            forceZoneSessionCleanup={forceZoneSessionCleanup}
            pasteTextToZone={pasteTextToZone}
            handleVncConsole={vnc.handleVncConsole}
            handleZloginConsole={zlogin.handleZloginConsole}
            handleKillVncSession={vnc.handleKillVncSession}
            handleVncQualityChange={vnc.handleVncQualityChange}
            handleVncCompressionChange={vnc.handleVncCompressionChange}
            handleVncResizeChange={vnc.handleVncResizeChange}
            handleVncShowDotChange={vnc.handleVncShowDotChange}
            handleVncClipboardPaste={vnc.handleVncClipboardPaste}
            setShowZloginConsole={zlogin.setShowZloginConsole}
          />
        ) : (
          <div className="alert alert-info mb-0" role="status" data-note="no-console">
            <p className="mb-0">{t('pages.machines.noConsoleAvailable')}</p>
          </div>
        )}
      </SectionCard>
      <ZloginModal
        showZloginConsole={showZloginConsole}
        setShowZloginConsole={setShowZloginConsole}
        isZloginFullScreen={zlogin.isZloginFullScreen}
        setIsZloginFullScreen={zlogin.setIsZloginFullScreen}
        id={id}
        name={name}
        handleZloginModalPaste={zlogin.handleZloginModalPaste}
        user={user}
        machineDetails={machineDetails}
        setShowVncConsole={vnc.setShowVncConsole}
        handleVncConsole={vnc.handleVncConsole}
        loadingVnc={vnc.loadingVnc}
        setLoading={setLoading}
        forceZoneSessionCleanup={forceZoneSessionCleanup}
        refreshZloginSessionStatus={zlogin.refreshZloginSessionStatus}
        setError={setError}
        modalReadOnly={modalReadOnly}
        setModalReadOnly={setModalReadOnly}
        vncOffered={vncOffered}
      />
      {vnc.showVncConsole ? (
        <Suspense fallback={null}>
          <VncModal
            showVncConsole={vnc.showVncConsole}
            closeVncConsole={vnc.closeVncConsole}
            isVncFullScreen={vnc.isVncFullScreen}
            openVncFullScreen={() => vnc.setIsVncFullScreen(!vnc.isVncFullScreen)}
            vncLoadError={vnc.vncLoadError}
            openDirectVncFallback={vnc.openDirectVncFallback}
            setVncLoadError={vnc.setVncLoadError}
            id={id}
            name={name}
            vncReconnectKey={vnc.vncReconnectKey}
            modalVncRef={modalVncRef}
            modalVncViewOnly={modalVncViewOnly}
            setModalVncViewOnly={setModalVncViewOnly}
            handleVncModalPaste={vnc.handleVncModalPaste}
            handleVncConsole={vnc.handleVncConsole}
            handleKillVncSession={vnc.handleKillVncSession}
            user={user}
            machineDetails={machineDetails}
            setShowZloginConsole={zlogin.setShowZloginConsole}
            handleZloginConsole={zlogin.handleZloginConsole}
            setError={setError}
            loading={loading}
            loadingVnc={vnc.loadingVnc}
            vncSettings={vnc.vncSettings}
            handleVncQualityChange={vnc.handleVncQualityChange}
            handleVncCompressionChange={vnc.handleVncCompressionChange}
            handleVncResizeChange={vnc.handleVncResizeChange}
            handleVncShowDotChange={vnc.handleVncShowDotChange}
            handleVncClipboardPaste={vnc.handleVncClipboardPaste}
            zloginOffered={zloginOffered}
          />
        </Suspense>
      ) : null}
    </div>
  );
};

MachineConsolePanel.propTypes = {
  id: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  detail: PropTypes.object,
  running: PropTypes.bool.isRequired,
  turn: PropTypes.number.isRequired,
  user: PropTypes.object,
  folds: foldsShape.isRequired,
};

export default MachineConsolePanel;
