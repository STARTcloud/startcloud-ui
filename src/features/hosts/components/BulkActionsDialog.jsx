import PropTypes from 'prop-types';
import { useEffect, useMemo, useState } from 'react';
import { Button, Form, Modal } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { FaServer } from 'react-icons/fa6';

import SubTable from '../../../components/common/SubTable';
import { useNotify } from '../../../contexts/NoticeContext';
import { nextSort, sortItems } from '../../../utils/sort';
import { restartMachine, startMachine, stopMachine } from '../api/machines';
import { useHostStatsLoad, useHostStatsRefresh } from '../hooks/useHostStats';
import { hostKey, hostLabel, isRunning } from '../utils/hosts';

const ACTIONS = {
  start: {
    call: (status, id, name) => startMachine(status, id, name),
    wantRunning: false,
    variant: 'success',
  },
  stop: {
    call: (status, id, name) => stopMachine(status, id, name),
    wantRunning: true,
    variant: 'danger',
  },
  restart: {
    call: (status, id, name) => restartMachine(status, id, name),
    wantRunning: true,
    variant: 'warning',
  },
};

const STATES = ['all', 'running', 'stopped'];

const STATE_KEYS = {
  all: 'hosts.bulk.allStates',
  running: 'hosts.state.running',
  stopped: 'hosts.state.stopped',
};

const DEFAULT_SORT = [{ column: 'name', direction: 'asc' }];

const NO_HIDDEN = new Set();

const stateWord = (row, ctx) => ctx.t(row.running ? 'hosts.state.running' : 'hosts.state.stopped');

const columns = [
  { key: 'name', kind: 'name', labelKey: 'hosts.page.name', value: row => row.name },
  {
    key: 'state',
    kind: 'badge',
    labelKey: 'hosts.machine.state',
    value: stateWord,
    render: (row, ctx) => (
      <span className={`badge ${row.running ? 'text-bg-success' : 'text-bg-secondary'}`}>
        {stateWord(row, ctx)}
      </span>
    ),
  },
];

const rowsOf = (server, stats) =>
  (stats?.allmachines || []).map(name => ({
    key: `${hostKey(server)}:${name}`,
    host: hostKey(server),
    name,
    running: isRunning(stats, name),
  }));

const toggled = (set, keys) => {
  const next = new Set(set);
  const every = keys.every(key => next.has(key));
  keys.forEach(key => (every ? next.delete(key) : next.add(key)));
  return next;
};

const stateMatches = (row, state) => state === 'all' || row.running === (state === 'running');

const visibleOf = ({ rows, needle, state, hosts }) =>
  rows.filter(
    row =>
      (!needle || row.name.toLowerCase().includes(needle)) &&
      stateMatches(row, state) &&
      (hosts.size === 0 || hosts.has(row.host))
  );

const chipClass = (hosts, key) => {
  if (hosts.has(key)) {
    return 'btn btn-sm btn-primary';
  }
  return hosts.size === 0 ? 'btn btn-sm btn-outline-primary' : 'btn btn-sm btn-outline-secondary';
};

const HostChips = ({ servers, rows, hosts, disabled, onToggle, onClear }) => {
  const { t } = useTranslation();
  return (
    <div className="d-flex flex-wrap align-items-center gap-1 mb-3">
      {servers.map(server => {
        const key = hostKey(server);
        return (
          <button
            key={key}
            type="button"
            className={chipClass(hosts, key)}
            disabled={disabled}
            aria-pressed={hosts.has(key)}
            onClick={() => onToggle(key)}
          >
            <FaServer className="me-1" aria-hidden="true" />
            {hostLabel(server)}
            <span className="badge text-bg-light ms-1">
              {rows.filter(row => row.host === key).length}
            </span>
          </button>
        );
      })}
      {hosts.size > 0 ? (
        <button type="button" className="btn btn-sm btn-link" disabled={disabled} onClick={onClear}>
          {t('hosts.bulk.allHosts')}
        </button>
      ) : null}
    </div>
  );
};

HostChips.propTypes = {
  servers: PropTypes.arrayOf(PropTypes.object).isRequired,
  rows: PropTypes.arrayOf(PropTypes.object).isRequired,
  hosts: PropTypes.instanceOf(Set).isRequired,
  disabled: PropTypes.bool.isRequired,
  onToggle: PropTypes.func.isRequired,
  onClear: PropTypes.func.isRequired,
};

const Filters = ({ needle, state, disabled, onNeedle, onState }) => {
  const { t } = useTranslation();
  return (
    <div className="d-flex flex-wrap gap-2 mb-3">
      <Form.Control
        type="search"
        size="sm"
        className="w-auto"
        value={needle}
        disabled={disabled}
        placeholder={t('hosts.bulk.filterByName')}
        aria-label={t('hosts.bulk.filterByName')}
        onChange={event => onNeedle(event.target.value)}
      />
      <Form.Select
        size="sm"
        className="w-auto"
        value={state}
        disabled={disabled}
        aria-label={t('hosts.machine.state')}
        onChange={event => onState(event.target.value)}
      >
        {STATES.map(entry => (
          <option key={entry} value={entry}>
            {t(STATE_KEYS[entry])}
          </option>
        ))}
      </Form.Select>
    </div>
  );
};

Filters.propTypes = {
  needle: PropTypes.string.isRequired,
  state: PropTypes.string.isRequired,
  disabled: PropTypes.bool.isRequired,
  onNeedle: PropTypes.func.isRequired,
  onState: PropTypes.func.isRequired,
};

const groupsOf = (servers, rows) =>
  servers
    .map(server => ({
      key: hostKey(server),
      label: hostLabel(server),
      items: rows.filter(row => row.host === hostKey(server)),
    }))
    .filter(group => group.items.length > 0);

/**
 * The bulk actions dialog of the Controls menu, one action, `start`,
 * `stop` or `restart`, over the machines of the hosts in scope, one host
 * on a host's route and every host that lists `machines` on the home
 * route: the machines come from each host's stats, the copy the page, the
 * tree and the menu already hold, asked for only where none is held; the
 * machines the action applies to are picked as the dialog opens, the
 * stopped ones for a start and the running ones for a stop or a restart;
 * the name filter, the state select and, over several hosts, one chip per
 * host narrow the one table, grouped by host over several hosts, whose
 * select column and select-all pick the targets; the action's button
 * carries the count and sends one request per target at once, one notice
 * naming how many were sent and how many failed, each failed target
 * listed with the agent's message, and every host acted on has its stats
 * read again once. Nothing polls.
 */
const BulkActionsDialog = ({ status, action, servers, title, onHide }) => {
  const { t, i18n } = useTranslation();
  const notify = useNotify();
  const load = useHostStatsLoad();
  const refreshStats = useHostStatsRefresh();
  const { call, wantRunning, variant } = ACTIONS[action];
  const [rows, setRows] = useState(null);
  const [checked, setChecked] = useState(() => new Set());
  const [needle, setNeedle] = useState('');
  const [state, setState] = useState(wantRunning ? 'running' : 'stopped');
  const [hosts, setHosts] = useState(() => new Set());
  const [sort, setSort] = useState(DEFAULT_SORT);
  const [collapsed, setCollapsed] = useState({});
  const [running, setRunning] = useState(false);
  const [failures, setFailures] = useState([]);
  const ctx = useMemo(() => ({ t, language: i18n.language }), [t, i18n.language]);

  useEffect(() => {
    let live = true;
    Promise.all(
      servers.map(server => load(hostKey(server)).then(stats => rowsOf(server, stats)))
    ).then(lists => {
      if (!live) {
        return;
      }
      const all = lists.flat();
      setRows(all);
      setChecked(new Set(all.filter(row => row.running === wantRunning).map(row => row.key)));
    });
    return () => {
      live = false;
    };
  }, [servers, load, wantRunning]);

  const held = rows || [];
  const visible = sortItems(
    visibleOf({ rows: held, needle: needle.trim().toLowerCase(), state, hosts }),
    sort,
    columns,
    ctx
  );
  const visibleKeys = visible.map(row => row.key);
  const selection = {
    allSelected: visibleKeys.length > 0 && visibleKeys.every(key => checked.has(key)),
    someSelected: visibleKeys.some(key => checked.has(key)),
    onToggleAll: () => setChecked(current => toggled(current, visibleKeys)),
    isSelected: row => checked.has(row.key),
    onToggleRow: row => setChecked(current => toggled(current, [row.key])),
    labelOf: row => row.name,
  };
  const several = servers.length > 1;

  const run = async () => {
    const targets = held.filter(row => checked.has(row.key));
    setRunning(true);
    setFailures([]);
    const answers = await Promise.all(
      targets.map(row =>
        call(status, row.host, row.name).then(
          () => '',
          error => `${row.name}: ${error.message}`
        )
      )
    );
    const failed = answers.filter(Boolean);
    [...new Set(targets.map(row => row.host))].forEach(host => refreshStats(host));
    notify(
      failed.length > 0 ? 'warning' : 'success',
      t('hosts.bulk.done', {
        action: title,
        count: targets.length - failed.length,
        failed: failed.length,
      })
    );
    setRunning(false);
    if (failed.length > 0) {
      setFailures(failed);
      return;
    }
    onHide();
  };

  return (
    <Modal show onHide={running ? undefined : onHide} dialogClassName="list-modal" scrollable>
      <Modal.Header closeButton={!running}>
        <Modal.Title>{title}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {failures.length > 0 ? (
          <div className="alert alert-danger" role="alert">
            <ul className="mb-0">
              {failures.map(line => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </div>
        ) : null}
        <Filters
          needle={needle}
          state={state}
          disabled={running || !rows}
          onNeedle={setNeedle}
          onState={setState}
        />
        {several ? (
          <HostChips
            servers={servers}
            rows={held}
            hosts={hosts}
            disabled={running || !rows}
            onToggle={key => setHosts(current => toggled(current, [key]))}
            onClear={() => setHosts(new Set())}
          />
        ) : null}
        {rows ? (
          <SubTable
            columns={columns}
            rows={visible}
            rowKey={row => row.key}
            sort={sort}
            onSort={(column, options) => setSort(current => nextSort(current, column, options))}
            hiddenColumns={NO_HIDDEN}
            ctx={ctx}
            emptyText={t('pages.noMatches')}
            selection={selection}
            groups={several ? groupsOf(servers, visible) : null}
            collapsed={collapsed}
            onToggleGroup={key => setCollapsed(current => ({ ...current, [key]: !current[key] }))}
            countKey="hosts.bulk.count"
          />
        ) : (
          <p className="mb-0">{t('pages.loading')}</p>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" disabled={running} onClick={onHide}>
          {t('pages.confirm.cancel')}
        </Button>
        <Button variant={variant} disabled={running || checked.size === 0} onClick={run}>
          {title}
          <span className="badge text-bg-light ms-2">{checked.size}</span>
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

BulkActionsDialog.propTypes = {
  status: PropTypes.object.isRequired,
  action: PropTypes.oneOf(Object.keys(ACTIONS)).isRequired,
  servers: PropTypes.arrayOf(PropTypes.object).isRequired,
  title: PropTypes.string.isRequired,
  onHide: PropTypes.func.isRequired,
};

export default BulkActionsDialog;
