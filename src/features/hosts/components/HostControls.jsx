import PropTypes from 'prop-types';
import { useMemo } from 'react';
import { Dropdown } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { FaSliders } from 'react-icons/fa6';
import { matchPath, useLocation } from 'react-router-dom';

import { useStatus } from '../../../contexts/StatusContext';
import { useServers } from '../hooks/useServers';
import { hostHasFeature } from '../utils/capabilities';
import { machineNoun } from '../utils/hosts';
import { canControlHosts, canPowerOffHosts, canStartStopMachines } from '../utils/permissions';

import BulkRows from './BulkRows';
import HostRows from './HostRows';
import MachineRows from './MachineRows';

const TOGGLE_CLASS = 'btn btn-link cluster-btn action-menu-toggle';

const HOME = '/';

const routeOf = pathname => {
  const machine = matchPath('/hosts/:id/machines/:name', pathname);
  if (machine) {
    return machine.params;
  }
  const host = matchPath('/hosts/:id', pathname);
  return host ? { id: host.params.id, name: '' } : { id: '', name: '' };
};

const serverOf = (servers, id) => servers.find(row => String(row.id) === String(id)) || null;

const ControlsMenu = ({ label, disabled = false, children = null }) => (
  <Dropdown as="li" align="end" className="nav-item action-menu">
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
    {children ? <Dropdown.Menu>{children}</Dropdown.Menu> : null}
  </Dropdown>
);

ControlsMenu.propTypes = {
  label: PropTypes.string.isRequired,
  disabled: PropTypes.bool,
  children: PropTypes.node,
};

const RouteControls = ({ id, name, user }) => {
  const { t } = useTranslation();
  const status = useStatus();
  const { held } = useServers();
  const server = serverOf(held, id);
  const role = user?.role;

  if (name) {
    const noun = machineNoun(server ? [server] : []);
    return (
      <ControlsMenu
        label={t(
          noun === 'zone' ? 'hosts.controls.zoneControls' : 'hosts.controls.machineControls'
        )}
      >
        <MachineRows status={status} id={id} name={name} server={server} user={user} />
      </ControlsMenu>
    );
  }
  const powered = canPowerOffHosts(role) && hostHasFeature(server, 'host-power');
  const bulk = canStartStopMachines(role) && hostHasFeature(server, 'machines');
  if (!powered && !bulk && canControlHosts(role)) {
    return <ControlsMenu label={t('hosts.controls.host')} disabled />;
  }
  return (
    <ControlsMenu label={t('hosts.controls.host')}>
      <HostRows status={status} id={id} powered={powered} bulk={bulk} server={server} user={user} />
    </ControlsMenu>
  );
};

RouteControls.propTypes = {
  id: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  user: PropTypes.object,
};

const HomeControls = ({ user }) => {
  const { t } = useTranslation();
  const status = useStatus();
  const { servers } = useServers();
  const offered = useMemo(
    () => servers.filter(server => hostHasFeature(server, 'machines')),
    [servers]
  );
  if (offered.length === 0 || !canStartStopMachines(user?.role)) {
    return <ControlsMenu label={t('hosts.bulk.menu')} disabled />;
  }
  return (
    <ControlsMenu label={t('hosts.bulk.menu')}>
      <BulkRows status={status} servers={offered} scope="all" user={user} />
    </ControlsMenu>
  );
};

HomeControls.propTypes = {
  user: PropTypes.object,
};

/**
 * The hosts feature's Controls menu, the `actionMenu` the header draws in
 * the account slot in the account menu's toggle shape: on
 * `/hosts/{id}/machines/{name}` the machine controls, named by the noun
 * the host's hypervisors fix, over the machine rows; on `/hosts/{id}` the
 * host actions over the host power rows while the person's role and the
 * registry row's `host-power` token allow them and the bulk rows over the
 * host's machines while the role and the row's `machines` token do, the
 * toggle disabled while the role could act but the agent offers neither;
 * on the home route the bulk actions over the machines of every host that
 * lists `machines`, the toggle disabled while none does; on every other
 * route the toggle alone, disabled. The registry row of the host a route
 * names comes from the held rows of `useServers`, every row the server
 * answered, so the menu of a host reached by its address draws whole
 * under any chosen organization, the home route's hosts from the ones
 * the choice narrows to, the running state and the re-read after an
 * action from `useHostStats` inside the rows.
 */
const HostControls = ({ user = null }) => {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const { id, name } = routeOf(pathname);
  if (id) {
    return <RouteControls id={id} name={name} user={user} />;
  }
  if (pathname === HOME) {
    return <HomeControls user={user} />;
  }
  return <ControlsMenu label={t('hosts.controls.none')} disabled />;
};

HostControls.propTypes = {
  user: PropTypes.object,
};

export default HostControls;
