import PropTypes from 'prop-types';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  FaDesktop,
  FaPlug,
  FaRegSquare,
  FaRotate,
  FaSliders,
  FaSquareCheck,
  FaTerminal,
  FaWindowRestore,
  FaWindows,
  FaXmark,
} from 'react-icons/fa6';

import TabStrip from '../../../components/common/TabStrip';
import ContextMenu from '../../../components/layout/ContextMenu';
import { useFocus } from '../hooks/useFocus';
import { useConsoleActions } from '../hooks/useOpenConsole';
import {
  activateConsole,
  closeTerminalPrefs,
  markConsole,
  openTerminalPrefs,
  registerSender,
  useActiveConsole,
  useConsoleTurns,
  useConsoles,
  useTerminalPrefsOpen,
} from '../hooks/useTerminal';
import { useZoneTerminal } from '../hooks/useZoneTerminal';
import { performRdpTyping } from '../utils/rdpUtils';
import { footerConsoles, isHeldKind, receivers } from '../utils/terminals';
import { performTyping } from '../utils/vncUtils';

import ConsoleCommands from './ConsoleCommands';
import RdpSessionHost from './RdpSessionHost';
import ShellTerminal from './ShellTerminal';
import TerminalPrefsDialog from './TerminalPrefsDialog';
import VncViewerReact from './VncViewerReact';
import ZoneShell from './ZoneShell';
import { zoneKeyOf } from './ZoneTerminalProvider';

const ICONS = {
  host_shell: FaTerminal,
  ssh: FaTerminal,
  zlogin: FaTerminal,
  vnc: FaDesktop,
  rdp: FaWindows,
};

const WORDS = {
  host_shell: 'footer.console.hostShell',
  ssh: 'footer.console.ssh',
  zlogin: 'footer.console.zlogin',
  vnc: 'footer.console.vnc',
  rdp: 'footer.console.rdp',
};

const RDP_SETTINGS = {
  colorDepth: 16,
  lossy: true,
  audio: true,
  clipboard: true,
  scale: 'fit',
  resizeMode: 'follow-guest',
};

const VNC_SETTINGS = { quality: 6, compression: 2, resize: 'scale', showDot: true };

const NOOP_REF = { current: null };

const VncTab = ({ entry, turn }) => {
  const ref = useRef(null);
  useEffect(() => {
    registerSender(entry.key, text => performTyping(ref, Boolean(ref.current?.connected), text));
    return () => registerSender(entry.key, null);
  }, [entry.key]);
  return (
    <VncViewerReact
      ref={ref}
      key={`${entry.key}|${turn}`}
      id={entry.id}
      machineName={entry.name}
      autoConnect
      showControls={false}
      quality={VNC_SETTINGS.quality}
      compression={VNC_SETTINGS.compression}
      resize={VNC_SETTINGS.resize}
      showDot={VNC_SETTINGS.showDot}
      className="hw-vnc-container"
    />
  );
};

VncTab.propTypes = {
  entry: PropTypes.object.isRequired,
  turn: PropTypes.number.isRequired,
};

const RdpTab = ({ entry, turn }) => {
  const box = useRef(null);
  useEffect(() => {
    registerSender(entry.key, text =>
      performRdpTyping(box.current?.querySelector('iron-remote-desktop') || null, text)
    );
    return () => registerSender(entry.key, null);
  }, [entry.key]);
  return (
    <div ref={box} className="hw-console-content console-rdp-body">
      <RdpSessionHost
        key={`${entry.key}|${turn}`}
        id={entry.id}
        machineName={entry.name}
        settings={RDP_SETTINGS}
        target={entry.target === 'guest' ? 'guest' : 'console'}
        credentialId={entry.session?.credential_id || ''}
        uiRef={NOOP_REF}
        connectKey={turn}
      />
    </div>
  );
};

RdpTab.propTypes = {
  entry: PropTypes.object.isRequired,
  turn: PropTypes.number.isRequired,
};

const ZloginTab = ({ entry, turn }) => {
  const { pasteTextToZone, restoreZoneHistory } = useZoneTerminal();
  const restore = useCallback(
    terminal => restoreZoneHistory(zoneKeyOf(entry.id, entry.name), terminal),
    [restoreZoneHistory, entry.id, entry.name]
  );
  useEffect(() => {
    registerSender(entry.key, text => pasteTextToZone(entry.id, entry.name, text));
    return () => registerSender(entry.key, null);
  }, [entry.key, entry.id, entry.name, pasteTextToZone]);
  return (
    <ZoneShell
      key={`${entry.key}|${turn}`}
      id={entry.id}
      zoneName={entry.name}
      className="hw-console-zone-shell"
      onTerminal={restore}
    />
  );
};

ZloginTab.propTypes = {
  entry: PropTypes.object.isRequired,
  turn: PropTypes.number.isRequired,
};

const ConsoleBody = ({ entry, active, height, turn }) => {
  if (isHeldKind(entry.kind)) {
    return (
      <ShellTerminal consoleKey={entry.key} kind={entry.kind} active={active} height={height} />
    );
  }
  if (entry.kind === 'zlogin') {
    return <ZloginTab entry={entry} turn={turn} />;
  }
  if (entry.kind === 'vnc') {
    return <VncTab entry={entry} turn={turn} />;
  }
  return <RdpTab entry={entry} turn={turn} />;
};

ConsoleBody.propTypes = {
  entry: PropTypes.object.isRequired,
  active: PropTypes.bool.isRequired,
  height: PropTypes.number.isRequired,
  turn: PropTypes.number.isRequired,
};

/**
 * The Consoles view of the footer's pane: one tab a console placed in
 * the footer, the host shell, an SSH shell, a zlogin terminal, a VNC
 * display or an RDP display, the RDP bridge signing in with the
 * credential its session carries, every body mounted and the active one
 * drawn on top, so a tab switched away keeps running; the tab strip on
 * top while two or more are open, the Commands bar under it; the
 * placeholder while none is open, carrying Open host shell for the host
 * in focus while that host lists `host-terminal`, the one button of the
 * pane that opens a console, because the pane is where a person looks
 * for one. A tab is named by its machine, the
 * host for the host shell, a second shell of the same host or machine
 * numbered, with its kind beside it, the active tab in the brand colour
 * and a tab that accepts broadcasts under the brand bar; its × closes it
 * and stops its session. A right-click on a tab
 * opens its menu: Accept broadcasts, Send to the machine's or the zone's
 * page, Reconnect, Restart, Terminal preferences and Close. The terminal
 * preferences dialog draws here.
 */
const ConsolesPane = ({ active, height }) => {
  const { t } = useTranslation();
  const consoles = useConsoles();
  const activeKey = useActiveConsole();
  const turns = useConsoleTurns();
  const prefsOpen = useTerminalPrefsOpen();
  const actions = useConsoleActions();
  const focus = useFocus();
  const [menu, setMenu] = useState(null);
  const tabs = useMemo(() => footerConsoles(consoles), [consoles]);
  const accepting = receivers(consoles).length;
  const shellOffered = focus.kind === 'host' && focus.features.includes('host-terminal');

  const strip = tabs.map(entry => ({
    key: entry.key,
    label: entry.label,
    detail: t(WORDS[entry.kind]),
    icon: ICONS[entry.kind],
    closable: true,
    accepts: entry.accepts,
  }));

  const rowsOf = entry => {
    const terminal = isHeldKind(entry.kind) || entry.kind === 'zlogin';
    return [
      {
        key: 'accept',
        labelKey: 'footer.console.accept',
        icon: entry.accepts ? FaSquareCheck : FaRegSquare,
        tone: entry.accepts ? 'text-primary' : '',
        onClick: () => markConsole(entry.key, !entry.accepts),
      },
      ...(entry.name
        ? [
            {
              key: 'send-to-page',
              labelKey:
                entry.noun === 'zone'
                  ? 'footer.console.sendToZonePage'
                  : 'footer.console.sendToMachinePage',
              icon: FaWindowRestore,
              onClick: () => actions.move(entry.key, 'page'),
            },
          ]
        : []),
      { key: 'divider-session', divider: true },
      ...(entry.kind === 'zlogin'
        ? []
        : [
            {
              key: 'reconnect',
              labelKey: 'footer.pane.reconnectShell',
              icon: FaPlug,
              onClick: () => actions.reconnect(entry.key),
            },
          ]),
      ...(entry.kind === 'vnc' || entry.kind === 'rdp'
        ? []
        : [
            {
              key: 'restart',
              labelKey: 'footer.pane.restartShell',
              icon: FaRotate,
              onClick: () => actions.restart(entry.key),
            },
          ]),
      ...(terminal
        ? [
            {
              key: 'preferences',
              labelKey: 'footer.terminal.title',
              icon: FaSliders,
              onClick: openTerminalPrefs,
            },
          ]
        : []),
      { key: 'divider-close', divider: true },
      {
        key: 'close',
        labelKey: 'footer.console.close',
        icon: FaXmark,
        tone: 'text-danger',
        onClick: () => actions.close(entry.key),
      },
    ];
  };

  const onTabMenu = (tab, event) => {
    event.preventDefault();
    event.stopPropagation();
    const entry = tabs.find(held => held.key === tab.key);
    if (!entry) {
      return;
    }
    activateConsole(entry.key);
    setMenu({
      x: event.clientX,
      y: event.clientY,
      title: `${entry.label} · ${t(WORDS[entry.kind])}`,
      items: rowsOf(entry),
    });
  };

  return (
    <div className="footer-consoles" data-pane="consoles">
      <TabStrip
        tabs={strip}
        active={activeKey}
        onSelect={activateConsole}
        onClose={key => actions.close(key)}
        closeLabel={t('footer.console.close')}
        onContextMenu={onTabMenu}
        className="footer-consoles-tabs"
      />
      {tabs.length > 1 ? <ConsoleCommands accepting={accepting} total={tabs.length} /> : null}
      <div className="footer-consoles-bodies">
        {tabs.length === 0 ? (
          <div className="footer-consoles-empty" data-note="console-none">
            <div className="text-center">
              <div className="fw-medium">{t('footer.console.noneOpen')}</div>
              <div className="small opacity-75">{t('footer.console.openFromControls')}</div>
              {shellOffered ? (
                <button
                  type="button"
                  className="btn btn-sm btn-outline-primary mt-2"
                  data-action="open-host-shell"
                  onClick={() =>
                    actions.open({
                      kind: 'host_shell',
                      id: focus.id,
                      server: focus.server,
                      placed: 'footer',
                    })
                  }
                >
                  <FaTerminal className="me-1" aria-hidden />
                  {t('hosts.controls.openHostShell')}
                </button>
              ) : null}
            </div>
          </div>
        ) : null}
        {tabs.map(entry => {
          const shown = active && entry.key === activeKey;
          return (
            <div
              key={entry.key}
              className={shown ? 'console-body shown' : 'console-body'}
              data-console-body={entry.key}
              data-console-kind={entry.kind}
              data-console-label={entry.label}
            >
              <ConsoleBody
                entry={entry}
                active={shown}
                height={height}
                turn={turns[entry.key] || 0}
              />
            </div>
          );
        })}
      </div>
      {menu ? <ContextMenu menu={menu} onClose={() => setMenu(null)} /> : null}
      <TerminalPrefsDialog show={prefsOpen} onHide={closeTerminalPrefs} />
    </div>
  );
};

ConsolesPane.propTypes = {
  active: PropTypes.bool.isRequired,
  height: PropTypes.number.isRequired,
};

export default ConsolesPane;
