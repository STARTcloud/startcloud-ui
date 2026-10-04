import { useContext, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { useStatus } from '../../../contexts/StatusContext';
import { hasFeatureStrict } from '../../../utils/capabilities';
import { localAnswer, searchAnswerOf, searchParamsOf, searchRowOf } from '../../../utils/searchRow';
import { matchFields, subsequenceMatch } from '../../../utils/searchScore';
import { searchHost } from '../api/agents';
import { hostHasFeature } from '../utils/capabilities';
import { SELF, hostLabel, isRunning } from '../utils/hosts';
import { visibleUnder } from '../utils/organizations';

import { HostMachinesContext } from './useHostMachines';
import { HostStatsContext } from './useHostStats';
import { ServersContext, useControlCommands } from './useServers';

const NO_SERVERS = [];

const NO_HOSTS = {};

const NO_SOURCES = [];

const searchable = server =>
  hostHasFeature(server, 'search') && Boolean(server.capabilities?.search?.path);

const remoteOf = (status, server) => {
  const { path, kinds } = server.capabilities.search;
  const host = String(server.id);
  return {
    key: `host:${host}`,
    host,
    label: hostLabel(server),
    kinds: Array.isArray(kinds) ? kinds : [],
    serving: host === SELF,
    local: false,
    search: (query, request) =>
      searchHost(status, host, path, searchParamsOf(query, request), request.signal).then(data =>
        searchAnswerOf(data, host)
      ),
  };
};

const hostRows = (servers, query) =>
  servers.flatMap(server => {
    const label = hostLabel(server);
    const match = matchFields(
      [
        { field: 'name', text: label },
        { field: 'hostname', text: server.hostname || '' },
      ],
      query
    );
    if (!match) {
      return [];
    }
    return [
      searchRowOf(
        {
          kind: 'host',
          id: String(server.id),
          name: label,
          title: label,
          subtitle: server.hostname || '',
          ...match,
        },
        ''
      ),
    ];
  });

const heldMachines = ({ server, statsHosts, machineHosts, organization }) => {
  const id = String(server.id);
  const stats = statsHosts[id]?.stats || null;
  const rows = new Map((machineHosts[id]?.machines || []).map(row => [row.name, row]));
  const names = new Set([...(stats?.allmachines || []), ...rows.keys()]);
  return [...names]
    .filter(name => visibleUnder(rows.get(name) || null, organization))
    .map(name => ({
      name,
      notes: rows.get(name)?.notes || '',
      state: rows.get(name)?.status || (isRunning(stats, name) ? 'running' : 'stopped'),
    }));
};

const machineRows = (held, query) =>
  held.servers.flatMap(server =>
    heldMachines({ server, ...held }).flatMap(machine => {
      const match = matchFields(
        [
          { field: 'name', text: machine.name },
          { field: 'notes', text: machine.notes },
        ],
        query
      );
      if (!match) {
        return [];
      }
      return [
        searchRowOf(
          {
            kind: 'machine',
            id: machine.name,
            name: machine.name,
            title: machine.name,
            subtitle: `${hostLabel(server)} · ${machine.state}`,
            facets: { status: machine.state },
            ...match,
          },
          String(server.id)
        ),
      ];
    })
  );

const commandSourceOf = (commands, run, t) => {
  const offered = commands
    .filter(entry => !entry.note && !entry.disabled)
    .map(entry => ({
      key: entry.key,
      title: entry.label || t(entry.labelKey),
      subtitle: entry.header ? t(entry.header) : '',
    }));
  const match = (query, request) =>
    localAnswer(
      offered.flatMap(entry => {
        const hit = subsequenceMatch(entry.title, query);
        if (!hit) {
          return [];
        }
        const row = {
          kind: 'page',
          id: `command:${entry.key}`,
          title: entry.title,
          subtitle: entry.subtitle,
          command: () => run(entry.key),
          ...hit,
        };
        return [searchRowOf(row, '')];
      }),
      { ...request, query }
    );
  return {
    key: 'commands',
    host: '',
    label: '',
    kinds: ['page'],
    local: true,
    match,
    search: (query, request) => Promise.resolve(match(query, request)),
  };
};

/**
 * The hosts feature's search sources while the host lists `hosts`: one
 * over the hosts and machines the feature's context holds and one over
 * the feature's published command list under the `page` kind, both
 * answered in the browser, and one per host whose row lists `search`,
 * asked through the path the role fixes, the one serving agent's own the
 * serving backend's.
 *
 * @returns {Array<Object>} The sources
 */
export const useHostSearchSources = () => {
  const { t } = useTranslation();
  const { commands, run } = useControlCommands();
  const status = useStatus();
  const servers = useContext(ServersContext)?.servers || NO_SERVERS;
  const statsHosts = useContext(HostStatsContext)?.hosts || NO_HOSTS;
  const machineContext = useContext(HostMachinesContext);
  const machineHosts = machineContext?.hosts || NO_HOSTS;
  const organization = machineContext?.organization || '';
  const listed = hasFeatureStrict(status, 'hosts');

  const remote = useMemo(
    () => (listed ? servers.filter(searchable).map(row => remoteOf(status, row)) : NO_SOURCES),
    [listed, status, servers]
  );

  const local = useMemo(() => {
    if (!listed) {
      return null;
    }
    const held = { servers, statsHosts, machineHosts, organization };
    const match = (query, request) =>
      localAnswer([...hostRows(servers, query), ...machineRows(held, query)], {
        ...request,
        query,
      });
    return {
      key: 'hosts',
      host: '',
      label: '',
      kinds: ['host', 'machine'],
      local: true,
      match,
      search: (query, request) => Promise.resolve(match(query, request)),
    };
  }, [listed, servers, statsHosts, machineHosts, organization]);

  const commandSource = useMemo(
    () => (listed && commands.length > 0 ? commandSourceOf(commands, run, t) : null),
    [listed, commands, run, t]
  );

  return useMemo(
    () => (local ? [local, ...(commandSource ? [commandSource] : []), ...remote] : NO_SOURCES),
    [local, commandSource, remote]
  );
};
