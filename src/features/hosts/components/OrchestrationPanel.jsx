import PropTypes from 'prop-types';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaCheck, FaGripVertical, FaListOl } from 'react-icons/fa6';

import ConfirmModal from '../../../components/common/ConfirmModal';
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
  movedOrder,
  orderDiffers,
  orderOf,
  priorityChanges,
  priorityForIndex,
  strategyPatch,
  validPriority,
} from '../utils/manage';

const DEFAULT_STRATEGY = 'parallel_by_priority';

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

const OrderRow = ({ name, index, row, dragged, differs, edit, busy, drag, onEdit, onSave }) => {
  const { t } = useTranslation();
  const edited = edit !== undefined && row && Number(edit) !== row.priority;
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
      {differs ? <span className="text-muted small">→ {priorityForIndex(index)}</span> : null}
      <span className="ms-auto d-inline-flex align-items-center gap-1">
        <input
          id={`boot-priority-${name}`}
          className="form-control form-control-sm boot-priority-input"
          type="number"
          min="1"
          max="100"
          aria-label={t('host.orchestrationPanel.bootPriorityFor', { name })}
          value={edit ?? row?.priority ?? ''}
          onChange={event => onEdit(name, event.target.value)}
          disabled={busy}
        />
        {edited ? (
          <button
            type="button"
            className="btn btn-sm btn-primary py-0"
            data-action="priority-save"
            onClick={() => onSave(name)}
            disabled={busy}
          >
            {t('host.orchestrationPanel.save')}
          </button>
        ) : null}
      </span>
    </div>
  );
};

OrderRow.propTypes = {
  name: PropTypes.string.isRequired,
  index: PropTypes.number.isRequired,
  row: PropTypes.object,
  dragged: PropTypes.bool.isRequired,
  differs: PropTypes.bool.isRequired,
  edit: PropTypes.string,
  busy: PropTypes.bool.isRequired,
  drag: PropTypes.shape({
    start: PropTypes.func.isRequired,
    end: PropTypes.func.isRequired,
    over: PropTypes.func.isRequired,
  }).isRequired,
  onEdit: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
};

/**
 * The orchestration of a host, hyperweaver-ui's panel as the body of
 * the Manage page's Orchestration section: the status and the strategy
 * of `GET machines/orchestration/status`, Enable behind the typed
 * confirmation and Disable, Preview shutdown plan, the dry run of
 * `POST machines/orchestration/test`, and the boot order of
 * `GET machines/priorities`, rows dragged into order with Apply order
 * writing spaced priorities to the machines whose number changed, and
 * each row's own priority written on Save, both `PUT machines/{name}`
 * with `boot_priority`. The strategy is one merge patch of
 * `PUT config/machines` at `/machines/orchestration/strategy`. Every write
 * raises one notice and reads again on a success what it changed, the
 * status after a toggle or a strategy and the priorities after a
 * priority. Nothing polls.
 */
const OrchestrationPanel = ({ id }) => {
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
  const [order, setOrder] = useState([]);
  const [edits, setEdits] = useState({});
  const [dragName, setDragName] = useState(null);
  const [confirming, setConfirming] = useState(false);
  const [seen, setSeen] = useState(null);
  const state = orchestration.data;
  const held = priorities.data;
  const enabled = Boolean(state?.orchestration_enabled);
  const differs = orderDiffers(order, held);

  if (held !== seen) {
    setSeen(held);
    setOrder(orderOf(held));
    setEdits({});
  }

  const write = async ({ call, doneKey, values = {}, reread }) => {
    const { error } = await send({
      call,
      doneKey,
      values,
      failKey: 'hosts.manage.orchestration.failed',
    });
    if (!error) {
      reread();
    }
    return !error;
  };

  const toggle = () => {
    setConfirming(false);
    write({
      call: () => (enabled ? disableOrchestration(status, id) : enableOrchestration(status, id)),
      doneKey: enabled
        ? 'host.orchestrationPanel.disabledMessage'
        : 'host.orchestrationPanel.enabledMessage',
      reread: orchestration.refresh,
    });
  };

  const savePriority = name => {
    const value = Number(edits[name]);
    if (!validPriority(value)) {
      notify('danger', t('host.orchestrationPanel.priorityRange'));
      return;
    }
    write({
      call: () => modifyMachine(status, id, name, { boot_priority: value }),
      doneKey: 'host.orchestrationPanel.prioritySet',
      values: { name, value },
      reread: priorities.refresh,
    });
  };

  const applyOrder = () => {
    const changes = priorityChanges(order, held);
    write({
      call: () =>
        Promise.all(
          changes.map(change =>
            modifyMachine(status, id, change.name, { boot_priority: change.priority })
          )
        ),
      doneKey: 'host.orchestrationPanel.bootOrderApplied',
      values: { count: changes.length },
      reread: priorities.refresh,
    });
  };

  const preview = async () => {
    try {
      setPlan(await testOrchestration(status, id));
    } catch (error) {
      notify('danger', t('host.orchestrationPanel.dryRunFailed', { message: error.message }));
    }
  };

  const setStrategy = strategy =>
    write({
      call: () => patchConfigFile(status, id, 'machines', strategyPatch(strategy)),
      doneKey: 'host.orchestrationPanel.strategySet',
      values: { strategy },
      reread: orchestration.refresh,
    });

  const drag = {
    start: setDragName,
    end: () => setDragName(null),
    over: name => setOrder(current => movedOrder(current, dragName, name)),
  };

  return (
    <div data-panel="orchestration-body">
      {orchestration.failed ? (
        <div className="alert alert-warning" role="alert" data-note="status-unavailable">
          {t('host.orchestrationPanel.statusUnavailable', { message: orchestration.message })}
        </div>
      ) : null}
      <div className="d-flex flex-wrap align-items-center gap-3 mb-3">
        <span>
          {t('host.orchestrationPanel.status')}{' '}
          {state ? (
            <span
              className={`badge text-bg-${enabled ? 'success' : 'secondary'}`}
              data-note="orchestration"
            >
              {t(enabled ? 'host.orchestrationPanel.enabled' : 'host.orchestrationPanel.disabled')}
            </span>
          ) : (
            <span className="text-muted">{t('host.orchestrationPanel.unknown')}</span>
          )}
        </span>
        {state ? (
          <span className="d-inline-flex align-items-center gap-1 small">
            {t('host.orchestrationPanel.strategy')}
            <select
              id="orchestration-strategy"
              className="form-select form-select-sm w-auto"
              aria-label={t('host.orchestrationPanel.strategyAriaLabel')}
              data-field="strategy"
              value={state.strategy || DEFAULT_STRATEGY}
              onChange={event => setStrategy(event.target.value)}
              disabled={busy}
            >
              {STRATEGIES.map(strategy => (
                <option key={strategy} value={strategy}>
                  {strategy}
                </option>
              ))}
            </select>
          </span>
        ) : null}
        {state ? (
          <button
            type="button"
            className={`btn btn-sm ${enabled ? 'btn-outline-danger' : 'btn-primary'}`}
            data-action="orchestration-toggle"
            onClick={() => (enabled ? toggle() : setConfirming(true))}
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
          data-action="orchestration-plan"
          onClick={preview}
          disabled={busy}
        >
          <FaListOl className="me-1" aria-hidden="true" />
          {t('host.orchestrationPanel.previewShutdownPlan')}
        </button>
      </div>
      {plan ? <Plan plan={plan} /> : null}
      {held && order.length > 0 ? (
        <div className="card mb-3" data-panel="boot-order">
          <div className="card-body">
            <div className="d-flex justify-content-between align-items-center mb-2">
              <h6 className="fw-bold mb-0">{t('host.orchestrationPanel.bootOrderTitle')}</h6>
              {differs ? (
                <button
                  type="button"
                  className="btn btn-sm btn-primary"
                  data-action="order-apply"
                  onClick={applyOrder}
                  disabled={busy}
                >
                  <FaCheck className="me-1" aria-hidden="true" />
                  {t('host.orchestrationPanel.applyOrder')}
                </button>
              ) : null}
            </div>
            <div className="d-flex flex-column gap-1" role="list">
              {order.map((name, index) => (
                <OrderRow
                  key={name}
                  name={name}
                  index={index}
                  row={rowOf(held, name)}
                  dragged={dragName === name}
                  differs={differs}
                  edit={edits[name]}
                  busy={busy}
                  drag={drag}
                  onEdit={(machine, value) =>
                    setEdits(current => ({ ...current, [machine]: value }))
                  }
                  onSave={savePriority}
                />
              ))}
            </div>
            <p className="form-text text-muted mb-0">
              {t('host.orchestrationPanel.bootOrderHelp')}
            </p>
          </div>
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
        keyword="enable"
      />
    </div>
  );
};

OrchestrationPanel.propTypes = {
  id: PropTypes.string.isRequired,
};

export default OrchestrationPanel;
