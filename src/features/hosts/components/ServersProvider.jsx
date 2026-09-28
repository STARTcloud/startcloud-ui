import PropTypes from 'prop-types';
import { useCallback, useMemo, useRef, useState } from 'react';

import { useStatus } from '../../../contexts/StatusContext';
import { useEventStream } from '../../../hooks/useEventStream';
import { log } from '../../../lib/logger';
import { fetchServers } from '../api/agents';
import { ServersContext } from '../hooks/useServers';
import { isServerRole, selfServer } from '../utils/hosts';
import { visibleRows } from '../utils/organizations';

import HostMachinesProvider from './HostMachinesProvider';
import HostReadingsProvider from './HostReadingsProvider';
import HostSeriesProvider from './HostSeriesProvider';
import HostStatsProvider from './HostStatsProvider';
import MachineDetailProvider from './MachineDetailProvider';

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
 * The hosts feature's one context, the list of servers behind
 * `useServers`: on the server role one `GET /api/servers` when the first
 * caller asks, a second caller while that request is in flight starting
 * none, the rows held for every caller after it; read again when the
 * event stream opens fresh or answers `reset` and on the `hosts` topic's
 * `servers-updated` event, once a caller has asked, and on a caller's
 * `refresh`. The list belongs to the session: when
 * `signedIn` changes the held rows are dropped and the callers that draw
 * ask again, an answer of the session before it discarded. On an agent
 * role the list is the one serving agent and nothing is requested.
 * `organization` is the uuid of the organization a person operates
 * under, empty for All and on every host that narrows by none: the
 * servers handed out are the held rows that show under it
 * (`visibleUnder`, failing open), a view over what the server already
 * answered, so the tree, the pages, the Controls menu and the footer's
 * focus follow the choice without learning of organizations, and a
 * change of the choice asks for nothing; the providers of the stats and
 * of the machine rows are handed the same choice. `held` is every row
 * the server answered, the choice aside: the list a host named by its id
 * is found in, so the page, the Controls menu and the footer's focus of a
 * host the person reached by its address draw whole under any choice, the
 * server having answered for it.
 * Inside it draws `HostStatsProvider`, `HostMachinesProvider`,
 * `MachineDetailProvider`, `HostReadingsProvider` and
 * `HostSeriesProvider`, the stats, the machine rows, the detail of each
 * machine, the Overview's answers and the charts' series of each host
 * held the same way, so the app mounts one provider for the feature.
 */
const ServersProvider = ({ signedIn, organization, children }) => {
  const status = useStatus();
  const server = isServerRole(status);
  const [state, setState] = useState(() => emptyFor(signedIn, 0));
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
    if (!server) {
      const servers = [selfServer(status)];
      return { servers, held: servers, loaded: true, failed: false, epoch: 0, read };
    }
    return {
      servers: visibleRows(state.servers, organization),
      held: state.servers,
      loaded: state.loaded,
      failed: state.failed,
      epoch: state.epoch,
      read,
    };
  }, [server, status, state, read, organization]);

  return (
    <ServersContext.Provider value={value}>
      <HostStatsProvider signedIn={signedIn} organization={organization}>
        <HostMachinesProvider signedIn={signedIn} organization={organization}>
          <MachineDetailProvider signedIn={signedIn}>
            <HostReadingsProvider signedIn={signedIn}>
              <HostSeriesProvider signedIn={signedIn}>{children}</HostSeriesProvider>
            </HostReadingsProvider>
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
