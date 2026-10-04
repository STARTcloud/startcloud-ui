import PropTypes from 'prop-types';
import { useCallback, useMemo, useRef, useState } from 'react';

import { createStore } from '../../../contexts/SearchContext';
import { useStatus } from '../../../contexts/StatusContext';
import { useEventStream } from '../../../hooks/useEventStream';
import { log } from '../../../lib/logger';
import { fetchServers } from '../api/agents';
import { ServersContext } from '../hooks/useServers';
import { isServerRole, selfServer } from '../utils/hosts';
import { visibleRows } from '../utils/organizations';

import HostApplicationsProvider from './HostApplicationsProvider';
import HostMachinesProvider from './HostMachinesProvider';
import HostReadingsProvider from './HostReadingsProvider';
import HostSeriesProvider from './HostSeriesProvider';
import HostStatsProvider from './HostStatsProvider';
import MachineDetailProvider from './MachineDetailProvider';
import MachineRestoreProvider from './MachineRestoreProvider';
import MachineSeriesProvider from './MachineSeriesProvider';
import MachineSnapshotsProvider from './MachineSnapshotsProvider';
import ZoneTerminalProvider from './ZoneTerminalProvider';

const IDLE = -1;

const emptyFor = (signedIn, epoch) => ({
  epoch,
  signedIn,
  servers: [],
  loaded: false,
  failed: false,
});

const answered = (epoch, patch) => current =>
  current.epoch === epoch ? { ...current, ...patch, loaded: true } : current;

/**
 * The hosts feature's one context: the list of servers behind
 * `useServers`, read once on the server role and again on the stream's
 * fresh `ready`, `reset` and `servers-updated` and on `refresh`, the
 * serving agent alone on an agent role, narrowed to the chosen
 * organization with every answered row kept as `held`; the store of the
 * feature's command list and whether the Controls menu is open; and
 * inside it the providers of the stats,
 * machine rows, machine detail, host applications, readings, series,
 * snapshots, restores and zone terminals.
 */
const ServersProvider = ({ signedIn, organization, children }) => {
  const status = useStatus();
  const server = isServerRole(status);
  const [state, setState] = useState(() => emptyFor(signedIn, 0));
  const [commands] = useState(createStore);
  const [menuOpen, setMenuOpen] = useState(false);
  const flight = useRef(IDLE);

  if (state.signedIn !== signedIn) {
    setState(emptyFor(signedIn, state.epoch + 1));
  }

  const read = useCallback(
    epoch => {
      if (!server || flight.current === epoch) {
        return;
      }
      flight.current = epoch;
      fetchServers()
        .then(servers => setState(answered(epoch, { servers, failed: false })))
        .catch(error => {
          log.api.error('Error fetching servers', { error: error.message });
          setState(answered(epoch, { failed: true }));
        })
        .finally(() => {
          if (flight.current === epoch) {
            flight.current = IDLE;
          }
        });
    },
    [server]
  );

  useEventStream('ready', (data, resumed) => {
    if (data && !resumed && state.loaded) {
      read(state.epoch);
    }
  });

  useEventStream('reset', () => {
    if (state.loaded) {
      read(state.epoch);
    }
  });

  useEventStream('servers-updated', () => {
    if (state.loaded) {
      read(state.epoch);
    }
  });

  const value = useMemo(() => {
    const menu = { commands, menuOpen, setMenuOpen };
    if (!server) {
      const servers = [selfServer(status)];
      return { servers, held: servers, loaded: true, failed: false, epoch: 0, read, ...menu };
    }
    return {
      servers: visibleRows(state.servers, organization),
      held: state.servers,
      loaded: state.loaded,
      failed: state.failed,
      epoch: state.epoch,
      read,
      ...menu,
    };
  }, [server, status, state, read, organization, commands, menuOpen]);

  return (
    <ServersContext.Provider value={value}>
      <HostStatsProvider signedIn={signedIn} organization={organization}>
        <HostMachinesProvider signedIn={signedIn} organization={organization}>
          <MachineDetailProvider signedIn={signedIn}>
            <HostApplicationsProvider signedIn={signedIn}>
              <HostReadingsProvider signedIn={signedIn}>
                <HostSeriesProvider signedIn={signedIn}>
                  <MachineSnapshotsProvider signedIn={signedIn}>
                    <MachineSeriesProvider signedIn={signedIn}>
                      <MachineRestoreProvider signedIn={signedIn}>
                        <ZoneTerminalProvider signedIn={signedIn}>{children}</ZoneTerminalProvider>
                      </MachineRestoreProvider>
                    </MachineSeriesProvider>
                  </MachineSnapshotsProvider>
                </HostSeriesProvider>
              </HostReadingsProvider>
            </HostApplicationsProvider>
          </MachineDetailProvider>
        </HostMachinesProvider>
      </HostStatsProvider>
    </ServersContext.Provider>
  );
};

ServersProvider.propTypes = {
  signedIn: PropTypes.bool.isRequired,
  organization: PropTypes.string.isRequired,
  children: PropTypes.node.isRequired,
};

export default ServersProvider;
