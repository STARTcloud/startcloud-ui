import PropTypes from 'prop-types';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import ConfirmModal from '../../../components/common/ConfirmModal';
import RecordRows from '../../../components/common/RecordRows';
import { useStatus } from '../../../contexts/StatusContext';
import { faultAction } from '../api/faults';
import { useManageSend } from '../hooks/useHostManage';
import { FAULT_ACTIONS, faultActionBody, severityTone } from '../utils/FaultUtils';

import FaultDetailsModal from './FaultDetailsModal';
import { FAULT_COLUMNS, FaultRowActions } from './FaultTable';
import ManageTable from './ManageTable';

const CLASSES_SHOWN = 3;

const rowKey = row => row.uuid || row.msgId;

const summaryRows = (summary, t) => {
  const levels = [...new Set((summary.severityLevels || []).map(level => level.toLowerCase()))];
  const classes = summary.faultClasses || [];
  return [
    {
      key: 'total',
      label: t('host.faultList.totalFaults'),
      value: <span className="badge text-bg-info">{summary.totalFaults}</span>,
    },
    ...(levels.length > 0
      ? [
          {
            key: 'levels',
            label: t('host.faultList.severityLevels'),
            value: (
              <span className="d-inline-flex flex-wrap gap-1">
                {levels.map(level => (
                  <span key={level} className={`badge text-bg-${severityTone(level)}`}>
                    {level.charAt(0).toUpperCase() + level.slice(1)}
                  </span>
                ))}
              </span>
            ),
          },
        ]
      : []),
    ...(classes.length > 0
      ? [
          {
            key: 'classes',
            label: t('host.faultList.faultClasses'),
            value: (
              <span className="d-inline-flex flex-wrap gap-1">
                {classes.slice(0, CLASSES_SHOWN).map(cls => (
                  <span key={cls} className="badge text-bg-secondary">
                    {cls.split('.').pop()}
                  </span>
                ))}
                {classes.length > CLASSES_SHOWN ? (
                  <span className="badge text-bg-secondary">
                    {t('host.faultList.moreClasses', { count: classes.length - CLASSES_SHOWN })}
                  </span>
                ) : null}
              </span>
            ),
          },
        ]
      : []),
  ];
};

/**
 * The faults of a host, hyperweaver-ui's `FaultList` as the current
 * faults tab of the Manage page's Fault management section: the fault
 * summary while the agent answers one, the one table over the faults the
 * page's binding left, the resolved switch and the limit in the navbar's
 * panel, and on each row Acquit, Mark repaired and Mark replaced behind
 * the typed confirmation and View details; every action one request and
 * one notice, the faults read again on a success. Nothing polls.
 */
const FaultList = ({ id, ctx, table, reading, filtering }) => {
  const { t } = useTranslation();
  const status = useStatus();
  const { send, busy } = useManageSend(id);
  const [dialog, setDialog] = useState(null);
  const summary = reading.data?.summary;
  const actionLabel =
    dialog?.kind === 'confirm'
      ? t(FAULT_ACTIONS.find(entry => entry.key === dialog.action).labelKey)
      : '';
  const confirmMessage =
    dialog?.kind === 'confirm' ? (
      <p className="mb-0" data-dialog={`fault-${dialog.action}`}>
        {t('host.faultTable.confirmMessage', { action: actionLabel.toLowerCase() })}
      </p>
    ) : null;

  const act = async () => {
    const { action, fault } = dialog;
    const label = actionLabel;
    setDialog(null);
    const { error } = await send({
      call: () => faultAction(status, id, action, faultActionBody(action, fault)),
      doneKey: 'hosts.manage.faults.done',
      values: { action: label, uuid: fault.uuid },
      failKey: 'hosts.manage.faults.failed',
    });
    if (!error) {
      reading.refresh();
    }
  };

  return (
    <>
      {summary ? (
        <div className="card mb-3" data-panel="fault-summary">
          <div className="card-body">
            <h6 className="fw-bold">{t('host.faultList.faultSummary')}</h6>
            <RecordRows rows={summaryRows(summary, t)} className="mb-0" />
          </div>
        </div>
      ) : null}
      <ManageTable
        name="faults"
        columns={FAULT_COLUMNS}
        table={table}
        rowKey={rowKey}
        RowActions={FaultRowActions}
        actionsProps={{
          busy,
          onAction: (action, row) =>
            setDialog(
              action === 'details'
                ? { kind: 'details', fault: row }
                : { kind: 'confirm', action, fault: row }
            ),
        }}
        ctx={ctx}
        emptyKey="host.faultTable.noData"
        reading={reading}
        filtering={filtering}
      />
      {dialog?.kind === 'details' ? (
        <FaultDetailsModal fault={dialog.fault} onClose={() => setDialog(null)} />
      ) : null}
      {dialog?.kind === 'confirm' ? (
        <ConfirmModal
          show
          handleClose={() => setDialog(null)}
          handleConfirm={act}
          title={t('host.faultTable.confirmTitle', { action: actionLabel })}
          message={confirmMessage}
          confirmText={actionLabel}
          variant="restart"
          keyword={dialog.action}
        />
      ) : null}
    </>
  );
};

FaultList.propTypes = {
  id: PropTypes.string.isRequired,
  ctx: PropTypes.object.isRequired,
  table: PropTypes.object.isRequired,
  reading: PropTypes.shape({
    data: PropTypes.object,
    loaded: PropTypes.bool.isRequired,
    failed: PropTypes.bool.isRequired,
    refresh: PropTypes.func.isRequired,
  }).isRequired,
  filtering: PropTypes.bool.isRequired,
};

export default FaultList;
