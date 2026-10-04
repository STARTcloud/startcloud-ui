import PropTypes from 'prop-types';
import { useContext, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { matchPath, useLocation } from 'react-router-dom';

import { NavbarSearchContext } from '../../../contexts/SearchContext';
import { useStatus } from '../../../contexts/StatusContext';
import { ServersContext, useControlCommandsPublish, useServers } from '../hooks/useServers';
import { hostHasFeature } from '../utils/capabilities';
import { machineNoun } from '../utils/hosts';
import { canPowerOffHosts, canStartStopMachines } from '../utils/permissions';

import { useBulkCommands } from './BulkRows';
import { useHostCommands } from './HostRows';
import { useMachineCommands } from './MachineRows';

const HOME = '/';

const NO_COMMANDS = [];

const routeOf = pathname => {
  const machine = matchPath({ path: '/hosts/:id/machines/:name', end: false }, pathname);
  if (machine) {
    return { id: machine.params.id, name: machine.params.name };
  }
  const host = matchPath({ path: '/hosts/:id', end: false }, pathname);
  return host ? { id: host.params.id, name: '' } : { id: '', name: '' };
};

const serverOf = (servers, id) => servers.find(row => String(row.id) === String(id)) || null;

const useWanted = () => {
  const menuOpen = Boolean(useContext(ServersContext)?.menuOpen);
  const searching = Boolean(useContext(NavbarSearchContext)?.expanded);
  return menuOpen || searching;
};

const MachineCommands = ({ id, name, server, user }) => {
  const { t } = useTranslation();
  const status = useStatus();
  const wanted = useWanted();
  const { commands, dialogs } = useMachineCommands({ status, id, name, server, user, wanted });
  const noun = machineNoun(server ? [server] : []);
  const labelKey =
    noun === 'zone' ? 'hosts.controls.zoneControls' : 'hosts.controls.machineControls';
  useControlCommandsPublish({ label: t(labelKey), commands, disabled: false });
  return dialogs;
};

MachineCommands.propTypes = {
  id: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  server: PropTypes.object,
  user: PropTypes.object,
};

const HostRouteCommands = ({ id, server, user }) => {
  const { t } = useTranslation();
  const status = useStatus();
  const role = user?.role;
  const { commands, dialogs } = useHostCommands({
    status,
    id,
    powered: canPowerOffHosts(role) && hostHasFeature(server, 'host-power'),
    bulk: canStartStopMachines(role) && hostHasFeature(server, 'machines'),
    server,
    user,
  });
  useControlCommandsPublish({ label: t('hosts.controls.host'), commands, disabled: false });
  return dialogs;
};

HostRouteCommands.propTypes = {
  id: PropTypes.string.isRequired,
  server: PropTypes.object,
  user: PropTypes.object,
};

const RouteCommands = ({ id, name, user }) => {
  const { held } = useServers();
  const server = serverOf(held, id);
  if (name) {
    return <MachineCommands id={id} name={name} server={server} user={user} />;
  }
  return <HostRouteCommands id={id} server={server} user={user} />;
};

RouteCommands.propTypes = {
  id: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  user: PropTypes.object,
};

const HomeCommands = ({ user }) => {
  const { t } = useTranslation();
  const status = useStatus();
  const { servers } = useServers();
  const offered = useMemo(
    () => servers.filter(server => hostHasFeature(server, 'machines')),
    [servers]
  );
  const { commands, dialogs } = useBulkCommands({ status, servers: offered, scope: 'all', user });
  const shown = offered.length > 0 ? commands : NO_COMMANDS;
  useControlCommandsPublish({
    label: t('hosts.bulk.menu'),
    commands: shown,
    disabled: shown.length === 0,
  });
  return dialogs;
};

HomeCommands.propTypes = {
  user: PropTypes.object,
};

const NoCommands = () => {
  const { t } = useTranslation();
  useControlCommandsPublish({
    label: t('hosts.controls.none'),
    commands: NO_COMMANDS,
    disabled: true,
  });
  return null;
};

/**
 * The hosts feature's command list wherever the feature is mounted: on a
 * machine's routes the machine's commands under the noun the host's
 * hypervisors fix, on a host's routes the host's commands, on the home
 * route the bulk commands over every host that lists `machines`, and
 * elsewhere none; the host a route names is found among every row the
 * server answered. It draws the commands' dialogs and publishes the list
 * with the Controls menu's label to the hosts feature's context, where
 * the menu draws it and search runs it; the reads a command list needs
 * only to be drawn wait until the menu or the search box is open.
 */
const ControlCommands = ({ user = null }) => {
  const { pathname } = useLocation();
  const { id, name } = routeOf(pathname);
  if (id) {
    return <RouteCommands id={id} name={name} user={user} />;
  }
  if (pathname === HOME) {
    return <HomeCommands user={user} />;
  }
  return <NoCommands />;
};

ControlCommands.propTypes = {
  user: PropTypes.object,
};

export default ControlCommands;
