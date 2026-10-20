import PropTypes from 'prop-types';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaCheck, FaGripVertical, FaListOl } from 'react-icons/fa6';

import ConfirmModal from '../../../components/common/ConfirmModal';
import SectionHeading from '../../../components/common/SectionHeading';
import { useNotify } from '../../../contexts/NoticeContext';
import { useStatus } from '../../../contexts/StatusContext';
import {
  disableOrchestration,
  enableOrchestration,
  fetchMachinePriorities,
  fetchOrchestrationStatus,
  testOrchestration,
} from '../api/host';
import { modifyMachine } from '../api/machines';
import { patchConfigFile } from '../api/manage';
import { useManageRead, useManageSend } from '../hooks/useHostManage';
import {
  STRATEGIES,
  draftChanges,
  movedOrder,
  orderMoved,
  orderOf,
  priorityForIndex,
  strategyPatch,
  validPriority,
} from '../utils/manage';

import RefreshButton from './RefreshButton';

const DEFAULT_STRATEGY = 'parallel_by_priority';

const NO_EDITS = {};

const rowOf = (priorities, name) =>
  (priorities?.machines || []).find(machine => machine.name === name) || null;

const Plan = ({ plan }) => {
  const { t } = useTranslation();
  return (
    <div className="card mb-3" data-panel="orchestration-plan">
      <div className="card-body">
        <h6 className="fw-bold">
          {t('host.orchestrationPanel.dryRunPlan', {
            count: plan.total_machines,
            duration: plan.estimated_duration,
          })}
        </h6>
        {(plan.execution_plan || []).map(group => (
          <div key={group.priority_range} className="mb-1">
            <span className="badge text-bg-secondary me-2">{group.priority_range}</span>
            {(group.machines || []).map(machine => (
              <span key={machine.name} className="me-2">
                <code>{machine.name}</code>
                <span className="text-muted small"> ({machine.priority})</span>
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

Plan.propTypes = {
  plan: PropTypes.shape({
    total_machines: PropTypes.number,
    estimated_duration: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    execution_plan: PropTypes.array,
  }).isRequired,
};

const StatusBadge = ({ state = null }) => {
  const { t } = useTranslation();
  if (!state) {
    return <span className="small text-muted">{t('host.orchestrationPanel.unknown')}</span>;
  }
  const enabled = Boolean(state.orchestration_enabled);
  return (
    <span
      className={`badge text-bg-${enabled ? 'success' : 'secondary'}`}
      data-note="orchestration"
    >
      {t(enabled ? 'host.orchestrationPanel.enabled' : 'host.orchestrationPanel.disabled')}
    </span>
  );
};

StatusBadge.propTypes = {
  state: PropTypes.object,
};

const Controls = ({
  state = null,
  strategy,
  busy,
  dirty,
  onStrategy,
  onToggle,
  onPreview,
  onApply,
  onRefresh,
}) => {
  const { t } = useTranslation();
  const enabled = Boolean(state?.orchestration_enabled);
  return (
    <>
      {state ? (
        <select
          id="orchestration-strategy"
          className="form-select form-select-sm w-auto"
          aria-label={t('host.orchestrationPanel.strategyAriaLabel')}
          data-field="strategy"
          value={strategy}
          onChange={event => onStrategy(event.target.value)}
          disabled={busy}
        >
          {STRATEGIES.map(entry => (
            <option key={entry} value={entry}>
              {entry}
            </option>
          ))}
        </select>
      ) : null}
      {state ? (
        <button
          type="button"
          className={`btn btn-sm ${enabled ? 'btn-outline-danger' : 'btn-primary'}`}
          data-action="orchestration-toggle"
          onClick={onToggle}
          disabled={busy}
        >
          {t(
            enabled
              ? 'host.orchestrationPanel.disableOrchestration'
              : 'host.orchestrationPanel.enableOrchestration'
          )}
        </button>
      ) : null}
      <button
        type="button"
        className="btn btn-sm btn-outline-info"
        data-action="orchestration-preview"
        onClick={onPreview}
        disabled={busy}
      >
        <FaListOl className="me-1" aria-hidden="true" />
        {t('host.orchestrationPanel.previewShutdownPlan')}
      </button>
      <button
        type="button"
        className="btn btn-sm btn-primary"
        data-action="orchestration-apply"
        onClick={onApply}
        disabled={busy || !dirty}
      >
        <FaCheck className="me-1" aria-hidden="true" />
        {t('host.orchestrationPanel.apply')}
      </button>
      <RefreshButton onRefresh={onRefresh} />
    </>
  );
};

Controls.propTypes = {
  state: PropTypes.object,
  strategy: PropTypes.string.isRequired,
  busy: PropTypes.bool.isRequired,
  dirty: PropTypes.bool.isRequired,
  onStrategy: PropTypes.func.isRequired,
  onToggle: PropTypes.func.isRequired,
  onPreview: PropTypes.func.isRequired,
  onApply: PropTypes.func.isRequired,
  onRefresh: PropTypes.func.isRequired,
};

const OrderHeader = () => {
  const { t } = useTranslation();
  return (
    <div
      className="d-flex align-items-center gap-2 px-2 small fw-semibold text-muted"
      data-row="boot-order-header"
    >
      <span>{t('host.orchestrationPanel.machineColumn')}</span>
      <span className="ms-auto d-inline-block boot-priority-input">
        {t('host.orchestrationPanel.priorityColumn')}
      </span>
    </div>
  );
};

const OrderRow = ({ name, index, row, dragged, moved, edit, busy, drag, onEdit }) => {
  const { t } = useTranslation();
  return (
    <div
      role="listitem"
      draggable
      data-machine={name}
      onDragStart={() => drag.start(name)}
      onDragEnd={drag.end}
      onDragOver={event => {
        event.preventDefault();
        drag.over(name);
      }}
      className={`boot-order-row d-flex align-items-center gap-2 border rounded px-2 py-1${
        dragged ? ' opacity-50 border-primary' : ''
      }`}
    >
      <FaGripVertical className="text-muted" aria-hidden="true" />
      <span className="badge text-bg-secondary">{index + 1}</span>
      <code className="small">{name}</code>
      {row ? <span className="text-muted small">{row.state}</span> : null}
      {row && !row.has_custom_priority ? (
        <span className="badge text-bg-light">{t('host.orchestrationPanel.default')}</span>
      ) : null}
      {moved && edit === undefined ? (
        <span className="text-muted small">→ {priorityForIndex(index)}</span>
      ) : null}
      <input
        id={`boot-priority-${name}`}
        className="form-control form-control-sm boot-priority-input ms-auto"
        type="number"
        min="1"
        max="100"
        aria-label={t('host.orchestrationPanel.bootPriorityFor', { name })}
        value={edit ?? row?.priority ?? ''}
        onChange={event => onEdit(name, event.target.value)}
        disabled={busy}
      />
    </div>
  );
};

OrderRow.propTypes = {
  name: PropTypes.string.isRequired,
  index: PropTypes.number.isRequired,
  row: PropTypes.object,
  dragged: PropTypes.bool.isRequired,
  moved: PropTypes.bool.isRequired,
  edit: PropTypes.string,
  busy: PropTypes.bool.isRequired,
  drag: PropTypes.shape({
    start: PropTypes.func.isRequired,
    end: PropTypes.func.isRequired,
    over: PropTypes.func.isRequired,
  }).isRequired,
  onEdit: PropTypes.func.isRequired,
};

/**
 * The orchestration of a host, the body of the host's Orchestration
 * page under its one heading: `title`, the status of
 * `GET machines/orchestration/status` as the badge, and in the pane the
 * strategy select, Enable behind a plain confirmation or Disable, each
 * written at once, Preview, Apply and Refresh, which reads the status,
 * the priorities and the page's `onRefresh` again; under it the boot
 * order of `GET machines/priorities` straight on the page, the rows
 * dragged into order and each row's typed priority under one header row
 * naming the machine and the boot priority, the strategy and the order
 * one draft. Preview draws the dry run of
 * `POST machines/orchestration/test` with the draft's strategy over the
 * priorities the agent holds; Apply, held while the draft equals what the
 * agent holds, writes the draft in one go, the strategy as one merge
 * patch of `PUT config/machines` at `/machines/orchestration/strategy`
 * and each changed priority as `PUT machines/{name}` with
 * `boot_priority`, raises one notice and reads again on a success what it
 * changed; a typed priority outside one to a hundred is refused with its
 * notice and nothing sent. Nothing polls.
 */
const OrchestrationPanel = ({ id, title, onRefresh }) => {
  const { t } = useTranslation();
  const status = useStatus();
  const notify = useNotify();
  const { send, busy } = useManageSend(id);
  const orchestration = useManageRead(
    useCallback(() => fetchOrchestrationStatus(status, id), [status, id]),
    true
  );
  const priorities = useManageRead(
    useCallback(() => fetchMachinePriorities(status, id), [status, id]),
    true
  );
  const [plan, setPlan] = useState(null);
  const [strategy, setStrategy] = useState(null);
  const [order, setOrder] = useState([]);
  const [edits, setEdits] = useState(NO_EDITS);
  const [dragName, setDragName] = useState(null);
  const [confirming, setConfirming] = useState(false);
  const [seen, setSeen] = useState(null);
  const [seenState, setSeenState] = useState(null);
  const state = orchestration.data;
  const held = priorities.data;
  const enabled = Boolean(state?.orchestration_enabled);
  const stored = state?.strategy || DEFAULT_STRATEGY;
  const drawn = strategy ?? stored;
  const moved = orderMoved(order, held);
  const changes = draftChanges({ order, priorities: held, edits });
  const strategyChanged = Boolean(state) && drawn !== stored;
  const dirty = strategyChanged || changes.length > 0;

  if (held !== seen) {
    setSeen(held);
    setOrder(orderOf(held));
    setEdits(NO_EDITS);
  }

  if (state !== seenState) {
    setSeenState(state);
    setStrategy(null);
  }

  const toggle = async () => {
    setConfirming(false);
    const { error } = await send({
      call: () => (enabled ? disableOrchestration(status, id) : enableOrchestration(status, id)),
      doneKey: enabled
        ? 'host.orchestrationPanel.disabledMessage'
        : 'host.orchestrationPanel.enabledMessage',
      values: {},
      failKey: 'hosts.manage.orchestration.failed',
    });
    if (!error) {
      orchestration.refresh();
    }
  };

  const apply = async () => {
    if (changes.some(change => !validPriority(change.priority))) {
      notify('danger', t('host.orchestrationPanel.priorityRange'));
      return;
    }
    const { error } = await send({
      call: () =>
        Promise.all([
          ...(strategyChanged
            ? [patchConfigFile(status, id, 'machines', strategyPatch(drawn))]
            : []),
          ...changes.map(change =>
            modifyMachine(status, id, change.name, { boot_priority: change.priority })
          ),
        ]),
      doneKey: 'host.orchestrationPanel.applied',
      values: { strategy: drawn, count: changes.length },
      failKey: 'hosts.manage.orchestration.failed',
    });
    if (error) {
      return;
    }
    if (strategyChanged) {
      orchestration.refresh();
    }
    if (changes.length > 0) {
      priorities.refresh();
    }
  };

  const preview = async () => {
    try {
      setPlan(await testOrchestration(status, id, drawn));
    } catch (error) {
      notify('danger', t('host.orchestrationPanel.dryRunFailed', { message: error.message }));
    }
  };

  const drag = {
    start: setDragName,
    end: () => setDragName(null),
    over: name => setOrder(current => movedOrder(current, dragName, name)),
  };

  const refresh = () => {
    orchestration.refresh();
    priorities.refresh();
    onRefresh();
  };

  const pane = (
    <Controls
      state={state}
      strategy={drawn}
      busy={busy}
      dirty={dirty}
      onStrategy={setStrategy}
      onToggle={() => (enabled ? toggle() : setConfirming(true))}
      onPreview={preview}
      onApply={apply}
      onRefresh={refresh}
    />
  );

  return (
    <div data-panel="orchestration-body">
      <SectionHeading title={title} badge={<StatusBadge state={state} />} actions={pane} />
      {orchestration.failed ? (
        <div className="alert alert-warning" role="alert" data-note="status-unavailable">
          {t('host.orchestrationPanel.statusUnavailable', { message: orchestration.message })}
        </div>
      ) : null}
      {plan ? <Plan plan={plan} /> : null}
      {held && order.length > 0 ? (
        <div className="mb-3" data-panel="boot-order">
          <h6 className="fw-bold mb-2">{t('host.orchestrationPanel.bootOrderTitle')}</h6>
          <div className="d-flex flex-column gap-1">
            <OrderHeader />
            <div className="d-flex flex-column gap-1" role="list">
              {order.map((name, index) => (
                <OrderRow
                  key={name}
                  name={name}
                  index={index}
                  row={rowOf(held, name)}
                  dragged={dragName === name}
                  moved={moved}
                  edit={edits[name]}
                  busy={busy}
                  drag={drag}
                  onEdit={(machine, value) =>
                    setEdits(current => ({ ...current, [machine]: value }))
                  }
                />
              ))}
            </div>
          </div>
          <p className="form-text text-muted mb-0">{t('host.orchestrationPanel.bootOrderHelp')}</p>
        </div>
      ) : null}
      <p className="form-text text-muted">{t('host.orchestrationPanel.priorityFootnote')}</p>
      <ConfirmModal
        show={confirming}
        handleClose={() => setConfirming(false)}
        handleConfirm={toggle}
        title={t('host.orchestrationPanel.enableOrchestrationTitle')}
        message={t('host.orchestrationPanel.enableOrchestrationMessage')}
        confirmText={t('host.orchestrationPanel.enable')}
        variant="restart"
        typed={false}
      />
    </div>
  );
};

OrchestrationPanel.propTypes = {
  id: PropTypes.string.isRequired,
  title: PropTypes.string.isRequired,
  onRefresh: PropTypes.func.isRequired,
};

export default OrchestrationPanel;
