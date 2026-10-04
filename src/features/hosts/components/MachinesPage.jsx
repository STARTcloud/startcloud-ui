import PropTypes from 'prop-types';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaFileImport, FaPlus } from 'react-icons/fa6';
import { Link, useNavigate } from 'react-router-dom';

import EmptyState from '../../../components/common/EmptyState';
import PageHeader from '../../../components/common/PageHeader';
import SubTable, { hasAny } from '../../../components/common/SubTable';
import { useStatus } from '../../../contexts/StatusContext';
import { useDetailSearch } from '../../../hooks/useDetailSearch';
import { usePageName } from '../../../hooks/usePageName';
import { pageContextShape } from '../../../utils/itemShape';
import { importMachine } from '../api/machines';
import { useActionRunner } from '../hooks/useHostActions';
import { useHostMachines } from '../hooks/useHostMachines';
import { useHostRow } from '../hooks/useHostRow';
import { useHostStats } from '../hooks/useHostStats';
import { useMachineDetailRefresh } from '../hooks/useMachineDetail';
import { useMachineTools } from '../hooks/useMachineTools';
import { useServers } from '../hooks/useServers';
import { hostHasFeature } from '../utils/capabilities';
import { hostLabel, isServerRole } from '../utils/hosts';
import { createRouteOf, hostCreates } from '../utils/machineCreate';
import {
  machineCounts,
  machineRoute,
  matchesMachine,
  nounKeyOf,
  provisionerOf,
  rolesOf,
  sentenceKey,
  statusOf,
  statusTone,
  systemLine,
  tagsOf,
} from '../utils/machines';
import { hostImports } from '../utils/machineTools';

import HostNav from './HostNav';
import MachineImportDialog from './MachineImportDialog';
import MachineRowActions from './MachineRowActions';
import MachineToolDialogs from './MachineToolDialogs';
import RefreshButton from './RefreshButton';
import TaskDialog from './TaskDialog';

const DEFAULT_SORT = [{ column: 'name', direction: 'asc' }];

const NO_TOOL = { tool: '', name: '' };

const IMPORT_NOTES = ['machine.importMachineModal.discoveryNote'];

const COUNTS = [
  { key: 'total', tone: 'info', labelKey: 'pages.machines.total' },
  { key: 'running', tone: 'success', labelKey: 'pages.machines.running' },
  { key: 'stopped', tone: 'danger', labelKey: 'pages.machines.stopped' },
];

const FLAGS = [
  { member: 'is_orphaned', tone: 'warning', labelKey: 'machine.machineListPanel.orphanedBadge' },
  {
    member: 'auto_discovered',
    tone: 'info',
    labelKey: 'machine.machineListPanel.autoDiscoveredBadge',
  },
];

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
 * The columns of the machines list: the name linking to the machine's
 * page, the status badge in its tone and the sentence that says it, the
 * server id, the provisioner, the roles, the system line, the hypervisor
 * and the backing as badges, the orphaned and auto-discovered flags and
 * the tags, every column after the sentence drawn only while a row
 * carries its value, because the agents answer different rows.
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
      <Link to={machineRoute(id, row.name)} className="fw-semibold">
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
    <span key={key} className="d-inline-flex" data-count={key} data-number={counts[key]}>
      <span className="badge text-bg-secondary">{t(labelKey)}</span>
      <span className={`badge text-bg-${tone}`}>{counts[key]}</span>
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

const ImportButton = ({ onImport }) => {
  const { t } = useTranslation();
  return (
    <button
      type="button"
      className="btn btn-sm btn-outline-primary"
      data-action="import"
      onClick={onImport}
    >
      <FaFileImport className="me-1" aria-hidden="true" />
      {t('pages.machines.import')}
    </button>
  );
};

ImportButton.propTypes = {
  onImport: PropTypes.func.isRequired,
};

const NewButton = ({ noun, onNew }) => {
  const { t } = useTranslation();
  return (
    <button
      type="button"
      className="btn btn-sm btn-outline-success"
      data-action="new-machine"
      onClick={onNew}
    >
      <FaPlus className="me-1" aria-hidden="true" />
      {t('navbar.navbar.newMachineButton', { noun })}
    </button>
  );
};

NewButton.propTypes = {
  noun: PropTypes.string.isRequired,
  onNew: PropTypes.func.isRequired,
};

const NotOffered = ({ resource }) => {
  const { t } = useTranslation();
  return (
    <span data-note="machines-not-offered">
      {t('pages.machines.noMachinesCapabilityPre', { resource })} <code>machines</code>{' '}
      {t('pages.machines.noMachinesCapabilityPost')}
    </span>
  );
};

NotOffered.propTypes = {
  resource: PropTypes.string.isRequired,
};

/**
 * The machines of one host at `/hosts/{id}/machines`, the body of the
 * host's column, `HostNav`, naming the host's label and its noun for the
 * crumbs through `usePageName`: the heading names the machines by the noun the
 * host's hypervisors fix, the host under it and the counts of all,
 * running and stopped as its chips; under it one `SubTable` over the
 * rows of `useHostMachines`, narrowed by the navbar binding of
 * `useDetailSearch` under `table_prefs_machines`, its Actions column
 * `MachineRowActions`. A row's action is one request and one notice,
 * the host's stats, its machine rows and the machine's detail read again
 * after a success. Refresh reads the list of servers, the host's stats
 * and its machine rows again. New opens the create wizard while
 * `hostCreates` offers it; Import opens the import dialog while
 * `hostImports` offers it. A host whose row does not list `machines`
 * draws the placard saying so and is asked nothing.
 */
const MachinesPage = ({ id, context }) => {
  const { t, i18n } = useTranslation();
  const status = useStatus();
  const navigate = useNavigate();
  const { loaded: held, refresh: refreshServers } = useServers();
  const server = useHostRow(id);
  const offered = hostHasFeature(server, 'machines');
  const { stats, refresh: refreshStats } = useHostStats(id);
  const {
    machines,
    loaded,
    failed,
    message,
    refresh: refreshMachines,
  } = useHostMachines(id, offered);
  const { run, busy } = useActionRunner(status);
  const refreshDetail = useMachineDetailRefresh();
  const tools = useMachineTools();
  const [open, setOpen] = useState(NO_TOOL);
  const [importing, setImporting] = useState(false);
  const listed = server ? [server] : [];
  const resource = t(nounKeyOf(listed));
  const plural = t(nounKeyOf(listed, true));
  const columns = useMemo(() => columnsFor(id), [id]);
  const ctx = {
    ...context,
    t,
    language: i18n.language,
    noun: resource.toLowerCase(),
  };
  const search = useDetailSearch({
    rows: machines,
    matches: matchesMachine,
    placeholderKey: 'machine.machineListPanel.filterPlaceholder',
    columns,
    ctx,
    prefsKey: `${context.prefsPrefix}_machines`,
    filterGroups: FILTER_GROUPS,
    defaultSort: DEFAULT_SORT,
  });
  const label = labelOf({ status, server, id, stats });

  usePageName(label, plural);

  useEffect(() => {
    document.title = `${plural} · ${label}`;
  }, [plural, label]);

  if (!held || (offered && !loaded)) {
    return (
      <HostNav id={id}>
        <div className="list row">
          <div>{t('pages.loading')}</div>
        </div>
      </HostNav>
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

  const sendImport = async body => {
    const { error } = await tools.send({
      id,
      name: '',
      call: () => importMachine(status, id, body),
      doneKey: 'machine.importMachineModal.importQueuedFallback',
      notes: IMPORT_NOTES,
    });
    if (!error) {
      setImporting(false);
    }
  };

  const actions = (
    <>
      {hostCreates(server, context.user?.role) ? (
        <NewButton noun={resource} onNew={() => navigate(createRouteOf(id))} />
      ) : null}
      {hostImports(server, context.user?.role) ? (
        <ImportButton onImport={() => setImporting(true)} />
      ) : null}
      <RefreshButton onRefresh={refresh} />
    </>
  );

  return (
    <HostNav id={id}>
      <div className="list row" data-page="machines">
        <PageHeader
          title={plural}
          subtitle={label}
          chips={offered ? <Counts counts={machineCounts(machines)} /> : null}
          actions={actions}
        />
        {failed ? (
          <div className="alert alert-danger" role="alert" data-note="machines-failed">
            {t('machine.machineListPanel.loadFailed', { plural: plural.toLowerCase(), message })}
          </div>
        ) : null}
        {offered ? (
          <SubTable
            columns={columns}
            rows={search.rows}
            rowKey={row => row.name}
            rowProp="machine"
            RowActions={MachineRowActions}
            actionsProps={{
              id,
              server,
              role: context.user?.role,
              noun: ctx.noun,
              busy,
              onAction: act,
              onTool: (machine, tool) => setOpen({ tool, name: machine.name }),
            }}
            sort={search.sort}
            onSort={search.setSort}
            hiddenColumns={search.hiddenColumns}
            widths={search.widths}
            onResize={search.setColumnWidth}
            ctx={ctx}
            emptyText={
              search.filtering
                ? t('pages.noMatches')
                : t('machine.machineListPanel.noneOnHost', { plural: plural.toLowerCase() })
            }
          />
        ) : (
          <EmptyState title={<NotOffered resource={resource} />} />
        )}
        <MachineToolDialogs
          status={status}
          tool={open.tool}
          id={id}
          name={open.name}
          onClose={() => setOpen(NO_TOOL)}
        />
        {importing ? (
          <MachineImportDialog
            busy={tools.busy}
            onClose={() => setImporting(false)}
            onSubmit={sendImport}
          />
        ) : null}
        {tools.task ? (
          <TaskDialog
            status={status}
            id={tools.task.id}
            task={tools.task.row}
            onHide={tools.closeTask}
          />
        ) : null}
      </div>
    </HostNav>
  );
};

MachinesPage.propTypes = {
  id: PropTypes.string.isRequired,
  context: pageContextShape.isRequired,
};

export default MachinesPage;
