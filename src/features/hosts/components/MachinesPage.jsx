import PropTypes from 'prop-types';
import { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

import EmptyState from '../../../components/common/EmptyState';
import PageHeader from '../../../components/common/PageHeader';
import SubTable, { hasAny } from '../../../components/common/SubTable';
import { useStatus } from '../../../contexts/StatusContext';
import { useDetailSearch } from '../../../hooks/useDetailSearch';
import { pageContextShape } from '../../../utils/itemShape';
import { useActionRunner } from '../hooks/useHostActions';
import { useHostMachines } from '../hooks/useHostMachines';
import { useHostRow } from '../hooks/useHostRow';
import { useHostStats } from '../hooks/useHostStats';
import { useMachineDetailRefresh } from '../hooks/useMachineDetail';
import { useServers } from '../hooks/useServers';
import { hostHasFeature } from '../utils/capabilities';
import { hostLabel, isServerRole, machineNoun } from '../utils/hosts';
import {
  machineCounts,
  matchesMachine,
  provisionerOf,
  rolesOf,
  sentenceKey,
  statusOf,
  statusTone,
  systemLine,
  tagsOf,
} from '../utils/machines';

import MachineRowActions from './MachineRowActions';
import RefreshButton from './RefreshButton';

const DEFAULT_SORT = [{ column: 'name', direction: 'asc' }];

const COUNTS = [
  { key: 'total', tone: 'info', labelKey: 'hosts.machines.count.total' },
  { key: 'running', tone: 'success', labelKey: 'hosts.machines.count.running' },
  { key: 'stopped', tone: 'danger', labelKey: 'hosts.machines.count.stopped' },
];

const FLAGS = [
  { member: 'is_orphaned', tone: 'warning', labelKey: 'hosts.machines.flag.orphaned' },
  { member: 'auto_discovered', tone: 'info', labelKey: 'hosts.machines.flag.autoDiscovered' },
];

const machinePath = (id, name) => `/hosts/${id}/machines/${encodeURIComponent(name)}`;

const flagsOf = row => FLAGS.filter(flag => row[flag.member]);

const sentenceOf = (row, ctx) => {
  const key = sentenceKey(statusOf(row));
  return key ? ctx.t(key, { noun: ctx.noun, status: statusOf(row) }) : '';
};

const wordOf = value => value;

const badges = (words, tone) => (
  <span className="d-inline-flex flex-wrap gap-1">
    {words.map(word => (
      <span key={word} className={`badge text-bg-${tone}`}>
        {word}
      </span>
    ))}
  </span>
);

/**
 * The columns of the machines list, hyperweaver-ui's machine row carried
 * into the one table: the name linking to the machine's page, the status
 * badge in its tone and the sentence that says it in words, the server
 * id, the provisioner, the roles, the system line, the hypervisor and
 * the backing as badges, the orphaned and auto-discovered flags and the
 * tags, every column after the status drawn only while a row carries
 * its value, because hyperweaver-agent and zoneweaver-agent answer
 * different rows.
 *
 * @param {string} id - The registry id, or `self` on an agent role
 * @returns {Array<Object>} The columns
 */
const columnsFor = id => [
  {
    key: 'name',
    kind: 'name',
    labelKey: 'hosts.page.name',
    value: row => row.name,
    render: row => (
      <Link to={machinePath(id, row.name)} className="fw-semibold">
        {row.name}
      </Link>
    ),
  },
  {
    key: 'status',
    kind: 'badge',
    labelKey: 'hosts.machine.state',
    value: statusOf,
    render: row => (
      <span className={`badge text-bg-${statusTone(statusOf(row))} text-capitalize`}>
        {statusOf(row)}
      </span>
    ),
  },
  {
    key: 'sentence',
    kind: 'text',
    labelKey: 'hosts.machines.column.sentence',
    priority: 9,
    prose: true,
    value: sentenceOf,
    render: (row, ctx) => <span className="fst-italic text-muted">{sentenceOf(row, ctx)}</span>,
  },
  {
    key: 'server_id',
    kind: 'text',
    labelKey: 'hosts.machines.column.id',
    priority: 6,
    when: hasAny(row => row.server_id),
    value: row => String(row.server_id ?? ''),
  },
  {
    key: 'provisioner',
    kind: 'text',
    labelKey: 'hosts.machines.column.provisioner',
    priority: 5,
    when: hasAny(provisionerOf),
    value: provisionerOf,
    render: row =>
      provisionerOf(row) ? <code className="small">{provisionerOf(row)}</code> : null,
  },
  {
    key: 'roles',
    kind: 'badges',
    labelKey: 'hosts.machines.column.roles',
    priority: 7,
    when: hasAny(row => rolesOf(row).length),
    value: row => rolesOf(row).join(', '),
    render: row => badges(rolesOf(row), 'secondary'),
  },
  {
    key: 'system',
    kind: 'text',
    labelKey: 'hosts.machines.column.system',
    priority: 8,
    when: (rows, ctx) => rows.some(row => systemLine(row, ctx.t)),
    value: (row, ctx) => systemLine(row, ctx.t),
  },
  {
    key: 'hypervisor',
    kind: 'badge',
    labelKey: 'hosts.machines.column.hypervisor',
    priority: 3,
    when: hasAny(row => row.hypervisor),
    value: row => row.hypervisor || '',
    render: row => (row.hypervisor ? badges([row.hypervisor], 'secondary') : null),
  },
  {
    key: 'backing',
    kind: 'badge',
    labelKey: 'hosts.machines.column.backing',
    priority: 4,
    when: hasAny(row => row.backing),
    value: row => row.backing || '',
    render: row => (row.backing ? badges([row.backing], 'secondary') : null),
  },
  {
    key: 'flags',
    kind: 'badges',
    labelKey: 'hosts.machines.column.flags',
    when: hasAny(row => flagsOf(row).length),
    value: (row, ctx) =>
      flagsOf(row)
        .map(flag => ctx.t(flag.labelKey))
        .join(', '),
    render: (row, ctx) => (
      <span className="d-inline-flex flex-wrap gap-1">
        {flagsOf(row).map(flag => (
          <span key={flag.member} className={`badge text-bg-${flag.tone}`}>
            {ctx.t(flag.labelKey)}
          </span>
        ))}
      </span>
    ),
  },
  {
    key: 'tags',
    kind: 'badges',
    labelKey: 'hosts.machines.column.tags',
    when: hasAny(row => tagsOf(row).length),
    value: row => tagsOf(row).join(', '),
    render: row => badges(tagsOf(row), 'light'),
  },
];

const flagLabel = (member, t) => t(FLAGS.find(flag => flag.member === member).labelKey);

/**
 * The filter groups of the machines list, one per enumerable column of
 * its rows: the status, the hypervisor, the backing, the roles, the
 * flags and the tags, each narrowing the rows the host answered.
 */
const FILTER_GROUPS = [
  {
    key: 'status',
    labelKey: 'hosts.machine.state',
    values: row => [statusOf(row)],
    activeClass: 'bg-primary',
    labelFor: wordOf,
  },
  {
    key: 'hypervisor',
    labelKey: 'hosts.machines.column.hypervisor',
    values: row => (row.hypervisor ? [row.hypervisor] : []),
    activeClass: 'bg-info',
    labelFor: wordOf,
  },
  {
    key: 'backing',
    labelKey: 'hosts.machines.column.backing',
    values: row => (row.backing ? [row.backing] : []),
    activeClass: 'bg-secondary',
    labelFor: wordOf,
  },
  {
    key: 'roles',
    labelKey: 'hosts.machines.column.roles',
    values: rolesOf,
    activeClass: 'bg-primary',
    labelFor: wordOf,
  },
  {
    key: 'flags',
    labelKey: 'hosts.machines.column.flags',
    values: row => flagsOf(row).map(flag => flag.member),
    activeClass: 'bg-info',
    labelFor: flagLabel,
  },
  {
    key: 'tags',
    labelKey: 'hosts.machines.column.tags',
    values: tagsOf,
    activeClass: 'bg-success',
    labelFor: wordOf,
  },
];

const labelOf = ({ status, server, id, stats }) => {
  if (isServerRole(status)) {
    return server ? hostLabel(server) : String(id);
  }
  return stats?.hostname || String(id);
};

const Counts = ({ counts }) => {
  const { t } = useTranslation();
  return COUNTS.map(({ key, tone, labelKey }) => (
    <span key={key} className={`badge text-bg-${tone}`} data-count={key} data-number={counts[key]}>
      {t(labelKey, { number: counts[key] })}
    </span>
  ));
};

Counts.propTypes = {
  counts: PropTypes.shape({
    total: PropTypes.number.isRequired,
    running: PropTypes.number.isRequired,
    stopped: PropTypes.number.isRequired,
  }).isRequired,
};

/**
 * The machines of one host at `/hosts/{id}/machines`, hyperweaver-ui's
 * machine list: the heading names the machines by the noun the host's
 * hypervisors fix, the host under it and the counts of all, running and
 * stopped as its chips; under it the one `SubTable` over the rows of
 * `GET machines`, the copy `useHostMachines` shares with the Controls
 * menu and the tree, narrowed to the organization a person operates
 * under and by the navbar binding of `useDetailSearch` under
 * `table_prefs_machines`, its Actions column the row buttons of
 * `MachineRowActions`. A row's action is one request through the
 * Controls menu's runner and one notice, the host's stats and its
 * machine rows read again once after a success, and the machine's
 * detail with them while it is held; what a queued task
 * changes afterwards reaches the rows through the `hosts` topic, and
 * nothing reads on a clock. Refresh in the heading's actions reads the
 * list of servers, the host's stats and its machine rows again. Nothing
 * is asked of a host whose own row does not list `machines`, which draws
 * the placard saying so.
 */
const MachinesPage = ({ id, context }) => {
  const { t, i18n } = useTranslation();
  const status = useStatus();
  const { loaded: listed, refresh: refreshServers } = useServers();
  const server = useHostRow(id);
  const offered = hostHasFeature(server, 'machines');
  const { stats, refresh: refreshStats } = useHostStats(id);
  const { machines, loaded, failed, refresh: refreshMachines } = useHostMachines(id, offered);
  const { run, busy } = useActionRunner(status);
  const refreshDetail = useMachineDetailRefresh();
  const noun = machineNoun(server ? [server] : []);
  const columns = useMemo(() => columnsFor(id), [id]);
  const ctx = {
    ...context,
    t,
    language: i18n.language,
    noun: t(`hosts.machines.noun.${noun}`),
  };
  const search = useDetailSearch({
    rows: machines,
    matches: matchesMachine,
    placeholderKey: `hosts.machines.search.${noun}`,
    columns,
    ctx,
    prefsKey: `${context.prefsPrefix}_machines`,
    filterGroups: FILTER_GROUPS,
    defaultSort: DEFAULT_SORT,
  });
  const label = labelOf({ status, server, id, stats });
  const title = t(`hosts.machines.title.${noun}`);

  useEffect(() => {
    document.title = `${title} · ${label}`;
  }, [title, label]);

  if (!listed || (offered && !loaded)) {
    return (
      <div className="list row">
        <div>{t('pages.loading')}</div>
      </div>
    );
  }

  const refresh = () => {
    refreshServers();
    refreshStats();
    if (offered) {
      refreshMachines();
    }
  };

  const act = (machine, action) =>
    run({
      id,
      name: machine.name,
      action,
      onDone: () => {
        refreshStats();
        refreshMachines();
        refreshDetail(id, machine.name);
      },
    });

  return (
    <div className="list row" data-page="machines">
      <PageHeader
        title={title}
        subtitle={label}
        chips={offered ? <Counts counts={machineCounts(machines)} /> : null}
        actions={<RefreshButton onRefresh={refresh} />}
      />
      {failed ? (
        <div className="alert alert-danger" role="alert">
          {t(`hosts.machines.loadError.${noun}`)}
        </div>
      ) : null}
      {offered ? (
        <SubTable
          columns={columns}
          rows={search.rows}
          rowKey={row => row.name}
          rowProp="machine"
          RowActions={MachineRowActions}
          actionsProps={{ id, server, role: context.user?.role, busy, onAction: act }}
          sort={search.sort}
          onSort={search.setSort}
          hiddenColumns={search.hiddenColumns}
          widths={search.widths}
          onResize={search.setColumnWidth}
          ctx={ctx}
          emptyText={t(search.filtering ? 'pages.noMatches' : `hosts.machines.empty.${noun}`)}
        />
      ) : (
        <EmptyState title={t('hosts.machines.notOffered')} />
      )}
    </div>
  );
};

MachinesPage.propTypes = {
  id: PropTypes.string.isRequired,
  context: pageContextShape.isRequired,
};

export default MachinesPage;
