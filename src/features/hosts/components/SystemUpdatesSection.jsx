import PropTypes from 'prop-types';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  FaChevronDown,
  FaChevronUp,
  FaDownload,
  FaMagnifyingGlass,
  FaRotate,
} from 'react-icons/fa6';

import ConfirmModal from '../../../components/common/ConfirmModal';
import TabStrip from '../../../components/common/TabStrip';
import { useStatus } from '../../../contexts/StatusContext';
import { checkUpdates, installUpdates, refreshUpdates } from '../api/manage';
import { useManageRead, useManageSend, useTaskFollow } from '../hooks/useHostManage';
import { diskSpaceWarning } from '../utils/manage';

import ManageTable from './ManageTable';
import TaskDialog from './TaskDialog';

const TABS = [
  { key: 'updates', labelKey: 'host.systemUpdates.availableUpdatesTab' },
  { key: 'history', labelKey: 'host.systemUpdates.updateHistoryTab' },
];

const SUCCEEDED = 'Succeeded';

/**
 * The columns of the update history table, hyperweaver-ui's: the date,
 * the operation, the user and the status as a badge, success in green
 * and anything else in red.
 */
export const HISTORY_COLUMNS = [
  {
    key: 'date',
    kind: 'date',
    labelKey: 'host.systemUpdates.date',
    value: row => (row.date ? new Date(row.date).getTime() : 0),
    render: row => (row.date ? new Date(row.date).toLocaleString() : ''),
  },
  {
    key: 'operation',
    kind: 'name',
    labelKey: 'host.systemUpdates.operation',
    value: row => row.operation || '',
  },
  {
    key: 'user',
    kind: 'text',
    labelKey: 'host.systemUpdates.user',
    priority: 4,
    value: row => row.user || '',
  },
  {
    key: 'status',
    kind: 'badge',
    labelKey: 'host.systemUpdates.status',
    value: row => row.status || '',
    render: row => (
      <span className={`badge text-bg-${row.status === SUCCEEDED ? 'success' : 'danger'}`}>
        {row.status}
      </span>
    ),
  },
];

/**
 * The filter group of the update history, the status of each run.
 */
export const HISTORY_FILTERS = [
  {
    key: 'status',
    labelKey: 'host.systemUpdates.status',
    values: row => [row.status || ''],
    activeClass: 'bg-primary',
    labelFor: value => value,
  },
];

const PLAN_CELLS = [
  { key: 'packages_to_install', labelKey: 'host.systemUpdates.install' },
  { key: 'packages_to_update', labelKey: 'host.systemUpdates.update' },
  { key: 'packages_to_remove', labelKey: 'host.systemUpdates.remove' },
];

const rowKey = row => `${row.date}-${row.operation}-${row.user}`;

const PlanSummary = ({ plan }) => {
  const { t } = useTranslation();
  return (
    <div className="mt-3" data-panel="updates-plan">
      <h6 className="fw-bold">{t('host.systemUpdates.planSummary')}</h6>
      <div className="row g-3">
        {PLAN_CELLS.map(cell => (
          <div key={cell.key} className="col-6 col-lg-3">
            <div className="card">
              <div className="card-body text-center">
                <p className="text-uppercase small fw-semibold text-muted mb-1">
                  {t(cell.labelKey)}
                </p>
                <p className="fs-4 fw-bold mb-0">{plan[cell.key] || 0}</p>
              </div>
            </div>
          </div>
        ))}
        <div className="col-6 col-lg-3">
          <div className="card">
            <div className="card-body text-center">
              <p className="text-uppercase small fw-semibold text-muted mb-1">
                {t('host.systemUpdates.downloadSize')}
              </p>
              <p className="fs-6 fw-bold mb-0">
                {plan.total_download_size || t('host.systemUpdates.unknown')}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

PlanSummary.propTypes = {
  plan: PropTypes.object.isRequired,
};

const AvailableUpdates = ({ check, busy, onRefresh, onInstall }) => {
  const { t } = useTranslation();
  const [raw, setRaw] = useState(false);
  const { data } = check;
  const warning = diskSpaceWarning(data?.raw_output);
  const RawIcon = raw ? FaChevronUp : FaChevronDown;
  return (
    <div data-tab="updates-available">
      <div className="d-flex flex-wrap gap-2 mb-3">
        <button
          type="button"
          className="btn btn-sm btn-outline-info"
          data-action="updates-refresh"
          onClick={onRefresh}
          disabled={busy}
        >
          <FaRotate className="me-1" aria-hidden="true" />
          {t('host.systemUpdates.refreshMetadata')}
        </button>
        <button
          type="button"
          className="btn btn-sm btn-primary"
          data-action="updates-check"
          onClick={check.refresh}
          disabled={busy}
        >
          <FaMagnifyingGlass className="me-1" aria-hidden="true" />
          {t('host.systemUpdates.checkUpdates')}
        </button>
      </div>
      {check.loaded ? null : <p>{t('pages.loading')}</p>}
      {check.failed ? (
        <div className="alert alert-danger" role="alert">
          {t('hosts.overview.readError')}
        </div>
      ) : null}
      {data ? (
        <div data-panel="updates-status">
          <div className="row g-3">
            <div className="col-md-4">
              <div className="form-label">{t('host.systemUpdates.updatesAvailable')}</div>
              <span
                className={`badge fs-6 text-bg-${data.updates_available ? 'warning' : 'success'}`}
                data-note="updates-available"
              >
                {t(data.updates_available ? 'host.systemUpdates.yes' : 'host.systemUpdates.no')}
              </span>
            </div>
            <div className="col-md-4">
              <div className="form-label">{t('host.systemUpdates.totalUpdates')}</div>
              <span className="badge fs-6 text-bg-info">{data.total_updates || 0}</span>
            </div>
            <div className="col-md-4">
              <div className="form-label">{t('host.systemUpdates.lastChecked')}</div>
              <span className="text-muted">
                {data.last_checked
                  ? new Date(data.last_checked).toLocaleString()
                  : t('host.systemUpdates.never')}
              </span>
            </div>
          </div>
          {warning ? (
            <div className="alert alert-warning mt-3" role="alert" data-note="disk-space">
              <h6 className="fw-bold">{t('host.systemUpdates.insufficientSpace')}</h6>
              <p className="mb-1">
                <strong>{t('host.systemUpdates.available')}</strong> {warning.available}
                <br />
                <strong>{t('host.systemUpdates.required')}</strong> {warning.required}
              </p>
              <p className="mb-0">{t('host.systemUpdates.freeUpSpace')}</p>
            </div>
          ) : null}
          {data.updates_available && !warning ? (
            <div className="text-center mt-3">
              <button
                type="button"
                className="btn btn-warning"
                data-action="updates-install"
                onClick={onInstall}
                disabled={busy}
              >
                <FaDownload className="me-1" aria-hidden="true" />
                {t('host.systemUpdates.installUpdates', { count: data.total_updates })}
              </button>
            </div>
          ) : null}
          {data.plan_summary ? <PlanSummary plan={data.plan_summary} /> : null}
          {data.raw_output ? (
            <div className="mt-3">
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary"
                data-action="updates-raw"
                onClick={() => setRaw(current => !current)}
              >
                <RawIcon className="me-1" aria-hidden="true" />
                {t(raw ? 'host.systemUpdates.hideRaw' : 'host.systemUpdates.showRaw')}
              </button>
              {raw ? <pre className="task-output mt-2 mb-0">{data.raw_output}</pre> : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
};

AvailableUpdates.propTypes = {
  check: PropTypes.shape({
    data: PropTypes.object,
    loaded: PropTypes.bool.isRequired,
    failed: PropTypes.bool.isRequired,
    refresh: PropTypes.func.isRequired,
  }).isRequired,
  busy: PropTypes.bool.isRequired,
  onRefresh: PropTypes.func.isRequired,
  onInstall: PropTypes.func.isRequired,
};

/**
 * The system updates of a host, hyperweaver-ui's section as the body
 * of the Manage page's System updates section: the available updates
 * of `GET system/updates/check`, whether any wait, how many, the last
 * check, the disk space warning its output names, Install updates
 * while any wait and the disk suffices, the plan summary and the raw
 * output; and the update history over the one table narrowed by the
 * page's binding. Refresh metadata sends `POST system/updates/refresh`
 * and Install `POST system/updates/install` behind the typed
 * confirmation, each raising one notice and reading the check and the
 * history again when it answers and again when the task it queued
 * ends. Nothing polls.
 */
const SystemUpdatesSection = ({ id, ctx, table, reading, filtering }) => {
  const { t } = useTranslation();
  const status = useStatus();
  const { send, busy, task, closeTask } = useManageSend(id);
  const check = useManageRead(
    useCallback(() => checkUpdates(status, id), [status, id]),
    true
  );
  const [active, setActive] = useState('updates');
  const [confirming, setConfirming] = useState(false);
  const reread = useCallback(() => {
    check.refresh();
    reading.refresh();
  }, [check, reading]);
  const follow = useTaskFollow({ id, onEnd: reread });
  const installMessage = (
    <div data-dialog="updates-install">
      <p>
        <strong>
          {t('host.systemUpdates.confirmMessage', { count: check.data?.total_updates || 0 })}
        </strong>
      </p>
      <p>{t('host.systemUpdates.operationWill')}</p>
      <ul>
        <li>{t('host.systemUpdates.op1')}</li>
        <li>{t('host.systemUpdates.op2')}</li>
        <li>{t('host.systemUpdates.op3')}</li>
        <li>{t('host.systemUpdates.op4')}</li>
      </ul>
      <div className="alert alert-warning mb-0" role="alert">
        <strong>{t('host.systemUpdates.warningLabel')}</strong>{' '}
        {t('host.systemUpdates.warningMessage')}
      </div>
    </div>
  );

  const write = async ({ call, doneKey }) => {
    const { answer, error } = await send({ call, doneKey, failKey: 'hosts.manage.updates.failed' });
    if (!error) {
      follow(answer);
      reread();
    }
  };

  return (
    <div data-tabs="system-updates">
      <TabStrip
        tabs={TABS.map(tab => ({ key: tab.key, label: t(tab.labelKey) }))}
        active={active}
        onSelect={setActive}
        className="mb-3"
      />
      {active === 'updates' ? (
        <AvailableUpdates
          check={check}
          busy={busy}
          onRefresh={() =>
            write({
              call: () => refreshUpdates(status, id),
              doneKey: 'hosts.manage.updates.refreshed',
            })
          }
          onInstall={() => setConfirming(true)}
        />
      ) : (
        <ManageTable
          name="history"
          columns={HISTORY_COLUMNS}
          table={table}
          rowKey={rowKey}
          ctx={ctx}
          emptyKey="host.systemUpdates.noHistory"
          reading={reading}
          filtering={filtering}
        />
      )}
      <ConfirmModal
        show={confirming}
        handleClose={() => setConfirming(false)}
        handleConfirm={() =>
          write({
            call: () => installUpdates(status, id),
            doneKey: 'hosts.manage.updates.installing',
          })
        }
        title={t('host.systemUpdates.confirmTitle')}
        message={installMessage}
        confirmText={t('host.systemUpdates.installUpdates', {
          count: check.data?.total_updates || 0,
        })}
        variant="restart"
        keyword="install"
      />
      {task ? <TaskDialog status={status} id={id} task={task.row} onHide={closeTask} /> : null}
    </div>
  );
};

SystemUpdatesSection.propTypes = {
  id: PropTypes.string.isRequired,
  ctx: PropTypes.object.isRequired,
  table: PropTypes.object.isRequired,
  reading: PropTypes.shape({
    loaded: PropTypes.bool.isRequired,
    failed: PropTypes.bool.isRequired,
    refresh: PropTypes.func.isRequired,
  }).isRequired,
  filtering: PropTypes.bool.isRequired,
};

export default SystemUpdatesSection;
