import PropTypes from 'prop-types';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';

import ConfirmModal from '../../../components/common/ConfirmModal';
import RecordRows from '../../../components/common/RecordRows';
import { useStatus } from '../../../contexts/StatusContext';
import { changeRunlevel, fetchRunlevel, multiUserHost, singleUserHost } from '../api/host';
import { useManageRead, useManageSend } from '../hooks/useHostManage';
import { runlevelsOf } from '../utils/manage';

import TaskDialog from './TaskDialog';

const NONE = { current: '', available: [] };

/**
 * The runlevel of a host, the calls hyperweaver-ui's
 * `useHostSystemManagement` carried with no view, as the body of the
 * Manage page's Runlevel section behind `host-power`: the current
 * runlevel of `GET system/host/runlevel`, the runlevel chosen among the
 * ones the host offers with Change runlevel, and Single-user and
 * Multi-user with the network services switch, each a queued task
 * behind the typed confirmation, `POST system/host/runlevel`,
 * `POST system/host/single-user` and `POST system/host/multi-user`,
 * raising one notice with View task and reading the runlevel again on
 * a success. Nothing polls.
 */
const RunlevelSection = ({ id }) => {
  const { t } = useTranslation();
  const status = useStatus();
  const { send, busy, task, closeTask } = useManageSend(id);
  const reading = useManageRead(
    useCallback(() => fetchRunlevel(status, id), [status, id]),
    true
  );
  const [chosen, setChosen] = useState('');
  const [network, setNetwork] = useState(true);
  const [action, setAction] = useState('');
  const { current, available } = reading.data ? runlevelsOf(reading.data) : NONE;

  const callOf = useCallback(() => {
    if (action === 'single') {
      return () => singleUserHost(status, id);
    }
    if (action === 'multi') {
      return () => multiUserHost(status, id, network);
    }
    return () => changeRunlevel(status, id, chosen);
  }, [action, status, id, network, chosen]);

  const confirm = async () => {
    const { error } = await send({
      call: callOf(),
      doneKey: `hosts.manage.runlevel.${action}Sent`,
      values: { runlevel: chosen },
      failKey: 'hosts.manage.runlevel.failed',
    });
    setAction('');
    if (!error) {
      reading.refresh();
    }
  };

  const message = (
    <span data-dialog={`runlevel-${action}`}>
      {t(`hosts.manage.runlevel.${action || 'change'}Message`, { runlevel: chosen })}
    </span>
  );

  return (
    <div data-panel="runlevel-body">
      {reading.loaded ? null : <p>{t('pages.loading')}</p>}
      {reading.failed ? (
        <div className="alert alert-danger" role="alert">
          {t('hosts.overview.readError')}
        </div>
      ) : null}
      <RecordRows
        rows={[
          {
            key: 'current',
            label: t('hosts.manage.runlevel.current'),
            value: current ? (
              <code data-note="runlevel">{current}</code>
            ) : (
              t('hosts.overview.unknown')
            ),
          },
        ]}
      />
      <div className="row g-3 align-items-end mb-3">
        <div className="col-md-4">
          <label className="form-label" htmlFor="runlevel-select">
            {t('hosts.manage.runlevel.target')}
          </label>
          <select
            id="runlevel-select"
            className="form-select"
            value={chosen}
            onChange={event => setChosen(event.target.value)}
            disabled={busy}
          >
            <option value="">{t('hosts.manage.runlevel.choose')}</option>
            {available.map(level => (
              <option key={level} value={level}>
                {level}
              </option>
            ))}
          </select>
        </div>
        <div className="col-md-8 d-flex flex-wrap gap-2">
          <button
            type="button"
            className="btn btn-sm btn-warning"
            data-action="runlevel-change"
            onClick={() => setAction('change')}
            disabled={busy || !chosen || chosen === current}
          >
            {t('hosts.manage.runlevel.change')}
          </button>
          <button
            type="button"
            className="btn btn-sm btn-outline-danger"
            data-action="runlevel-single"
            onClick={() => setAction('single')}
            disabled={busy}
          >
            {t('hosts.manage.runlevel.singleUser')}
          </button>
          <button
            type="button"
            className="btn btn-sm btn-outline-primary"
            data-action="runlevel-multi"
            onClick={() => setAction('multi')}
            disabled={busy}
          >
            {t('hosts.manage.runlevel.multiUser')}
          </button>
        </div>
      </div>
      <div className="form-check form-switch">
        <input
          id="runlevel-network"
          className="form-check-input"
          type="checkbox"
          role="switch"
          checked={network}
          onChange={event => setNetwork(event.target.checked)}
          disabled={busy}
        />
        <label className="form-check-label" htmlFor="runlevel-network">
          {t('hosts.manage.runlevel.networkServices')}
        </label>
      </div>
      <ConfirmModal
        show={action !== ''}
        handleClose={() => setAction('')}
        handleConfirm={confirm}
        title={t('hosts.manage.runlevel.confirmTitle')}
        message={message}
        variant="restart"
        keyword="runlevel"
      />
      {task ? <TaskDialog status={status} id={id} task={task.row} onHide={closeTask} /> : null}
    </div>
  );
};

RunlevelSection.propTypes = {
  id: PropTypes.string.isRequired,
};

export default RunlevelSection;
