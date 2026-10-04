import PropTypes from 'prop-types';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaPlus } from 'react-icons/fa6';

import ConfirmModal from '../../../components/common/ConfirmModal';
import { useNotify } from '../../../contexts/NoticeContext';
import { useStatus } from '../../../contexts/StatusContext';
import { createVnic, deleteVnic, fetchVnic } from '../api/networking';
import { useHostReading } from '../hooks/useHostReadings';
import { vnicBody, vnicLinksOf } from '../utils/networkingManagement';
import { canControlHosts } from '../utils/permissions';

import NetworkingTable from './NetworkingTable';
import VnicCreateModal from './VnicCreateModal';
import VnicDetailsModal from './VnicDetailsModal';
import { VNIC_COLUMNS, VnicRowActions } from './VnicTable';

/**
 * The VNICs section of the networking page's management,
 * hyperweaver-ui's `VnicManagement` over the one folding table: the
 * VNICs the host answers, each with its details and its delete, and
 * Create in the heading. A create sends `POST network/vnics` with
 * `vnicBody`, a queued task; a delete, behind the typed confirmation,
 * sends `DELETE network/vnics/{link}`; the details read
 * `GET network/vnics/{link}` once and open the dialog on the answer.
 * Every write goes through the page's one `useNetworkingTools`. Create
 * and the delete draw for a role that controls hosts alone; every other
 * role reads the table with the details.
 */
const VnicManagement = ({ id, role, rows, reading, table, ctx, filtering, fold, tools }) => {
  const { t } = useTranslation();
  const status = useStatus();
  const notify = useNotify();
  const interfaces = useHostReading(id, 'interfaces');
  const etherstubs = useHostReading(id, 'etherstubs');
  const aggregates = useHostReading(id, 'aggregates');
  const bridges = useHostReading(id, 'bridges');
  const [creating, setCreating] = useState(false);
  const [removing, setRemoving] = useState(null);
  const [details, setDetails] = useState(null);
  const writable = canControlHosts(role);
  const links = useMemo(
    () =>
      vnicLinksOf({
        interfaces: interfaces.data?.interfaces,
        etherstubs: etherstubs.data?.etherstubs,
        aggregates: aggregates.data?.aggregates,
        bridges: bridges.data?.bridges,
      }),
    [interfaces.data, etherstubs.data, aggregates.data, bridges.data]
  );

  const create = async form => {
    const { error } = await tools.send({
      id,
      call: () => createVnic(status, id, vnicBody(form)),
      doneKey: 'hosts.networking.tools.vnicCreated',
      values: { name: form.name },
      failKey: 'host.vnicCreateModal.errorCreatingVnic',
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
      call: () => deleteVnic(status, id, row.link),
      doneKey: 'hosts.networking.tools.vnicDeleted',
      values: { name: row.link, vnicName: row.link },
      failKey: 'host.vnicManagement.errorDeletingVnic',
    });
  };

  const open = row =>
    fetchVnic(status, id, row.link)
      .then(data => setDetails({ vnic: row, details: data?.vnic || data }))
      .catch(error =>
        notify(
          'danger',
          t('host.vnicManagement.errorLoadingVnicDetails', { message: error.message })
        )
      );

  const createButton = (
    <button
      type="button"
      className="btn btn-sm btn-primary"
      onClick={() => setCreating(true)}
      disabled={tools.busy}
      data-tool="create-vnic"
    >
      <FaPlus className="me-2" aria-hidden="true" />
      {t('host.vnicManagement.createVnic')}
    </button>
  );

  return (
    <>
      <NetworkingTable
        panel="networking-vnics"
        section
        title={t('host.vnicManagement.vnicManagement')}
        count={t('host.vnicManagement.vnicsHeading', { count: rows.length })}
        columns={VNIC_COLUMNS}
        table={table}
        rowKey={row => row.link}
        RowActions={VnicRowActions}
        actionsProps={{
          busy: tools.busy,
          canEdit: writable,
          onDetails: open,
          onDelete: setRemoving,
        }}
        ctx={ctx}
        emptyKey="host.vnicTable.noVnicsFound"
        reading={reading}
        filtering={filtering}
        fold={fold}
        actions={writable ? createButton : null}
      />
      {creating ? (
        <VnicCreateModal
          links={links}
          vnics={rows}
          busy={tools.busy}
          onClose={() => setCreating(false)}
          onSubmit={create}
        />
      ) : null}
      {details ? (
        <VnicDetailsModal
          vnic={details.vnic}
          details={details.details}
          onClose={() => setDetails(null)}
        />
      ) : null}
      <ConfirmModal
        show={Boolean(removing)}
        handleClose={() => setRemoving(null)}
        handleConfirm={remove}
        title={t('host.vnicManagement.deleteVnicTitle')}
        message={t('host.vnicManagement.deleteVnicConfirm', { vnicName: removing?.link })}
        variant="delete"
        confirmText={t('host.vnicManagement.delete')}
      />
    </>
  );
};

VnicManagement.propTypes = {
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

export default VnicManagement;
