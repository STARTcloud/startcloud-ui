import PropTypes from 'prop-types';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaPlus, FaTriangleExclamation } from 'react-icons/fa6';

import ConfirmModal from '../../../components/common/ConfirmModal';
import { useNotify } from '../../../contexts/NoticeContext';
import { useStatus } from '../../../contexts/StatusContext';
import { serviceAction } from '../api/manage';
import { createAggregate, deleteAggregate, fetchAggregate } from '../api/networking';
import { useHostReading } from '../hooks/useHostReadings';
import {
  CDP_FMRI,
  aggregateBody,
  aggregateLinksOf,
  cdpRunning as cdpRunningOf,
  namedKey,
} from '../utils/networkingManagement';
import { canControlHosts } from '../utils/permissions';

import AggregateCreateModal from './AggregateCreateModal';
import AggregateDetailsModal from './AggregateDetailsModal';
import { AGGREGATE_COLUMNS, AggregateRowActions } from './AggregateTable';
import NetworkingTable from './NetworkingTable';

/**
 * The aggregates section of the networking page's management,
 * hyperweaver-ui's `AggregateManagement` over the one folding table:
 * the aggregates the host answers, each with its details and its
 * delete, Create in the heading, and hyperweaver-ui's warning over the
 * table while the CDP service reads online among the host's services
 * (`GET services` with `pattern=cdp`). A create sends
 * `POST network/aggregates` with `aggregateBody`, a queued task, after
 * the one `serviceAction` of the manage API disabling CDP where the
 * dialog's box is ticked; a delete, behind the typed confirmation, sends
 * `DELETE network/aggregates/{name}`; the details read
 * `GET network/aggregates/{name}` with `lacp` once. Every write goes
 * through the page's one `useNetworkingTools`. Create, the delete and
 * the CDP warning draw for a role that controls hosts alone; every
 * other role reads the table with the details.
 */
const AggregateManagement = ({ id, role, rows, reading, table, ctx, filtering, fold, tools }) => {
  const { t } = useTranslation();
  const status = useStatus();
  const notify = useNotify();
  const interfaces = useHostReading(id, 'interfaces');
  const services = useHostReading(id, 'services-cdp');
  const [creating, setCreating] = useState(false);
  const [removing, setRemoving] = useState(null);
  const [details, setDetails] = useState(null);
  const links = useMemo(() => aggregateLinksOf(interfaces.data?.interfaces), [interfaces.data]);
  const cdpRunning = cdpRunningOf(services.data?.services || services.data);
  const writable = canControlHosts(role);

  const create = async form => {
    if (cdpRunning && form.disableCdp) {
      const { error } = await tools.send({
        id,
        call: () => serviceAction(status, id, CDP_FMRI, 'disable'),
        doneKey: 'hosts.networking.tools.cdpDisabled',
        failKey: 'host.aggregateCreateModal.errors.disableCdpFailed',
        keys: ['services-cdp'],
      });
      if (error) {
        return;
      }
    }
    const { error } = await tools.send({
      id,
      call: () => createAggregate(status, id, aggregateBody(form)),
      doneKey: 'hosts.networking.tools.aggregateCreated',
      values: { name: form.name },
      failKey: 'host.aggregateCreateModal.errors.createError',
    });
    if (!error) {
      setCreating(false);
    }
  };

  const remove = () => {
    const row = removing;
    setRemoving(null);
    return tools.send({
      id,
      call: () => deleteAggregate(status, id, namedKey(row)),
      doneKey: 'hosts.networking.tools.aggregateDeleted',
      values: { name: namedKey(row) },
      failKey: 'host.aggregateManagement.errors.deleteError',
    });
  };

  const open = row =>
    fetchAggregate(status, id, namedKey(row))
      .then(data => setDetails({ aggregate: row, details: data }))
      .catch(error =>
        notify(
          'danger',
          t('host.aggregateManagement.errors.detailsError', { message: error.message })
        )
      );

  const createButton = (
    <button
      type="button"
      className="btn btn-sm btn-primary"
      onClick={() => setCreating(true)}
      disabled={tools.busy}
      data-tool="create-aggregate"
    >
      <FaPlus className="me-2" aria-hidden="true" />
      {t('host.aggregateManagement.createAggregate')}
    </button>
  );

  return (
    <>
      {writable && cdpRunning ? (
        <div className="alert alert-warning d-flex align-items-center gap-2" data-note="cdp">
          <FaTriangleExclamation aria-hidden="true" />
          <div>
            <strong>{t('host.aggregateManagement.cdpDetectedTitle')}</strong>
            <br />
            {t('host.aggregateManagement.cdpDetectedBody')}
          </div>
        </div>
      ) : null}
      <NetworkingTable
        panel="networking-aggregates"
        section
        title={t('host.aggregateManagement.title')}
        count={t('host.aggregateManagement.linkAggregates', { total: rows.length })}
        columns={AGGREGATE_COLUMNS}
        table={table}
        rowKey={namedKey}
        RowActions={AggregateRowActions}
        actionsProps={{
          busy: tools.busy,
          canEdit: writable,
          onDetails: open,
          onDelete: setRemoving,
        }}
        ctx={ctx}
        emptyKey="host.aggregateTable.empty"
        reading={reading}
        filtering={filtering}
        fold={fold}
        actions={writable ? createButton : null}
      />
      {creating ? (
        <AggregateCreateModal
          aggregates={rows}
          links={links}
          cdpRunning={cdpRunning}
          busy={tools.busy}
          onClose={() => setCreating(false)}
          onSubmit={create}
        />
      ) : null}
      {details ? (
        <AggregateDetailsModal
          aggregate={details.aggregate}
          details={details.details}
          onClose={() => setDetails(null)}
        />
      ) : null}
      <ConfirmModal
        show={Boolean(removing)}
        handleClose={() => setRemoving(null)}
        handleConfirm={remove}
        title={t('host.aggregateManagement.deleteTitle')}
        message={t('host.aggregateManagement.deleteMessage', {
          name: removing ? namedKey(removing) : '',
        })}
        variant="delete"
        confirmText={t('host.aggregateManagement.delete')}
      />
    </>
  );
};

AggregateManagement.propTypes = {
  id: PropTypes.string.isRequired,
  role: PropTypes.string,
  rows: PropTypes.array.isRequired,
  reading: PropTypes.object.isRequired,
  table: PropTypes.object.isRequired,
  ctx: PropTypes.object.isRequired,
  filtering: PropTypes.bool.isRequired,
  fold: PropTypes.object.isRequired,
  tools: PropTypes.object.isRequired,
};

export default AggregateManagement;
