import PropTypes from 'prop-types';
import { Dropdown } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';

import { consoleDoorsOf, consoleRoute } from '../utils/consoles';

import { ActionRow } from './HostActionOptions';

/**
 * The console rows of the machine Controls menu, one a console the
 * host's row lists, VNC console behind the `vnc` console token, zlogin
 * console behind `zlogin`, SSH behind the `ssh` feature and RDP behind
 * `rdp`, from the one list of `CONSOLE_DOORS`; a row opens the machine's
 * page with the console named in its `console` query, the door the
 * console panel reads. Nothing draws for a host that lists none.
 */
const ConsoleRows = ({ id, name, server = null, busy }) => {
  const navigate = useNavigate();
  const doors = consoleDoorsOf(server);
  if (doors.length === 0) {
    return null;
  }
  return (
    <>
      <Dropdown.Divider />
      {doors.map(door => (
        <ActionRow
          key={door.key}
          icon={door.icon}
          tone="text-info"
          labelKey={door.labelKey}
          action={`console-${door.key}`}
          disabled={busy}
          onClick={() => navigate(consoleRoute(id, name, door.key))}
        />
      ))}
    </>
  );
};

ConsoleRows.propTypes = {
  id: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  server: PropTypes.object,
  busy: PropTypes.bool.isRequired,
};

export default ConsoleRows;
