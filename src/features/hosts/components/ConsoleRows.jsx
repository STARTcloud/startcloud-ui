import PropTypes from 'prop-types';
import { useEffect, useRef, useState } from 'react';
import { Dropdown } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { FaWindowMaximize, FaWindowRestore } from 'react-icons/fa6';
import { useNavigate } from 'react-router-dom';

import { useMachineDetail } from '../hooks/useMachineDetail';
import { useConsoleActions } from '../hooks/useOpenConsole';
import { opensInHeld, setOpensIn, useOpensIn } from '../hooks/useTerminal';
import { asksConnectAs, consoleDoorsOf, consoleRoute, credentialsFor } from '../utils/consoles';

import ConnectAsDialog from './ConnectAsDialog';

/**
 * One console row of the Controls menu, the logout row's shape: the
 * scope glyph first, a toggle between the footer, where the console
 * persists from page to page, and the machine's page, where it ends with
 * the page, a click on it flipping the place and keeping the menu open,
 * the tooltip naming the other place; then the console's glyph and
 * label, a click on them opening the console in the place shown, and
 * the place as a muted word at the row's end.
 */
export const ConsoleRow = ({ command }) => {
  const { t } = useTranslation();
  const opensIn = useOpensIn();
  const inFooter = opensIn === 'footer';
  const ScopeIcon = inFooter ? FaWindowMaximize : FaWindowRestore;
  const Icon = command.icon;

  const flip = event => {
    event.preventDefault();
    event.stopPropagation();
    setOpensIn(inFooter ? 'page' : 'footer');
  };

  const flipKey = event => {
    if (event.key === 'Enter' || event.key === ' ') {
      flip(event);
    }
  };

  return (
    <Dropdown.Item
      as="button"
      type="button"
      disabled={command.disabled}
      data-action={command.action}
      className="d-flex align-items-center"
      onClick={command.run}
    >
      <span
        role="button"
        tabIndex={0}
        className="d-inline-flex me-2 scope-glyph"
        data-scope={command.action}
        title={inFooter ? t('hosts.controls.terminalInFooter') : t('hosts.controls.terminalOnPage')}
        onClick={flip}
        onKeyDown={flipKey}
      >
        <ScopeIcon />
      </span>
      <Icon className={`${command.tone} me-2`} />
      <span className="flex-grow-1">{t(command.labelKey)}</span>
      <small className="text-body-secondary ms-3">
        {inFooter ? t('hosts.controls.targetFooter') : t('hosts.controls.targetPage')}
      </small>
    </Dropdown.Item>
  );
};

ConsoleRow.propTypes = {
  command: PropTypes.shape({
    icon: PropTypes.elementType.isRequired,
    tone: PropTypes.string.isRequired,
    labelKey: PropTypes.string.isRequired,
    action: PropTypes.string.isRequired,
    disabled: PropTypes.bool,
    run: PropTypes.func.isRequired,
  }).isRequired,
};

/**
 * The console commands of the machine Controls menu, one a console the
 * host's row lists, each drawn as `ConsoleRow`: in the footer it opens
 * the console there through the console store, its session started and
 * the pane shown on the Consoles view; on the page it opens the
 * machine's page with that console in its `console` query; an SSH or RDP
 * row of a machine whose held detail names more than one credential of
 * the use asks the Connect as dialog first, the pick riding the start in
 * the footer and the `credential` query on the page. The place and the
 * held detail are read when the row is pressed, because the published
 * command list is renewed only when a row's key, label or disabled state
 * changes.
 *
 * @param {Object} options
 * @param {string} options.id - The registry id, or `self` on an agent role
 * @param {string} options.name - The machine's name
 * @param {Object|null} options.server - The host's registry row
 * @param {boolean} options.busy - Whether an action is in flight
 * @returns {{ commands: Array<Object>, dialogs: import('react').ReactNode }} The commands and the Connect as dialog
 */
export const useConsoleCommands = ({ id, name, server, busy }) => {
  const navigate = useNavigate();
  const actions = useConsoleActions();
  const { detail } = useMachineDetail(id, name, { ask: false });
  const detailRef = useRef(detail);
  const [asking, setAsking] = useState('');

  useEffect(() => {
    detailRef.current = detail;
  });

  const go = (kind, credentialId) => {
    if (opensInHeld() === 'page') {
      navigate(consoleRoute(id, name, kind, credentialId));
      return;
    }
    actions.open({ kind, id, name, server, placed: 'footer', credentialId });
  };

  const commands = consoleDoorsOf(server).map(door => ({
    key: `console-${door.key}`,
    group: 'console',
    icon: door.icon,
    tone: 'text-info',
    labelKey: door.labelKey,
    action: `console-${door.key}`,
    disabled: busy,
    Row: ConsoleRow,
    run: () => {
      if (asksConnectAs(detailRef.current, door.key)) {
        setAsking(door.key);
        return;
      }
      go(door.key, '');
    },
  }));

  const dialogs = asking ? (
    <ConnectAsDialog
      credentials={credentialsFor(detail, asking)}
      onPick={credentialId => {
        setAsking('');
        go(asking, credentialId);
      }}
      onClose={() => setAsking('')}
    />
  ) : null;

  return { commands, dialogs };
};
