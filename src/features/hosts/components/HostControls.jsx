import { useContext, useEffect } from 'react';
import { Dropdown } from 'react-bootstrap';
import { FaSliders } from 'react-icons/fa6';

import { ServersContext, useControlCommands } from '../hooks/useServers';

import { CommandRows } from './HostActionOptions';

const TOGGLE_CLASS = 'btn btn-link cluster-btn action-menu-toggle';

const NO_TOGGLE = () => undefined;

/**
 * The hosts feature's Controls menu in the header's account slot: the
 * toggle under the label of the command list the feature publishes and a
 * row per command, disabled while the list says so; whether the menu is
 * open is held in the hosts feature's context so the list's reads wait
 * for it.
 */
const HostControls = () => {
  const { commands, label, disabled } = useControlCommands();
  const setMenuOpen = useContext(ServersContext)?.setMenuOpen || NO_TOGGLE;

  useEffect(() => () => setMenuOpen(false), [setMenuOpen]);

  return (
    <Dropdown as="li" align="end" className="nav-item action-menu" onToggle={setMenuOpen}>
      <Dropdown.Toggle
        as="button"
        type="button"
        bsPrefix="nav-link"
        className={TOGGLE_CLASS}
        disabled={disabled}
      >
        <FaSliders />
        <span>{label}</span>
      </Dropdown.Toggle>
      {commands.length > 0 ? (
        <Dropdown.Menu>
          <CommandRows commands={commands} />
        </Dropdown.Menu>
      ) : null}
    </Dropdown>
  );
};

export default HostControls;
