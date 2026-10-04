import PropTypes from 'prop-types';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaPlus } from 'react-icons/fa6';

import ConfirmModal from '../../../components/common/ConfirmModal';
import { useNotify } from '../../../contexts/NoticeContext';
import { useStatus } from '../../../contexts/StatusContext';
import { createVlan, deleteVlan, fetchVlan } from '../api/vlans';
import { useHostReading } from '../hooks/useHostReadings';
import { physicalLinksOf, vlanBody } from '../utils/networkingManagement';
import { canControlHosts } from '../utils/permissions';

import NetworkingTable from './NetworkingTable';
import VlanCreateModal from './VlanCreateModal';
import VlanDetailsModal from './VlanDetailsModal';
import { VLAN_COLUMNS, VlanRowActions } from './VlanTable';

/**
 * The VLANs section of the networking page's management,
 * hyperweaver-ui's `VlanManagement` over the one folding table: the
 * VLANs the host answers, each with its details and its delete, and
 * Create in the heading. A create sends `POST network/vlans` with
 * `vlanBody`, a queued task; a delete, behind the typed confirmation,
 * sends `DELETE network/vlans/{link}`; the details read
 * `GET network/vlans/{link}` once. Every write goes through the page's
 * one `useNetworkingTools`. Create and the delete draw for a role that
 * controls hosts alone; every other role reads the table with the
 * details.
 */
const VlanManagement = ({ id, role, rows, reading, table, ctx, filtering, fold, tools }) => {
  const { t } = useTranslation();
  const status = useStatus();
  const notify = useNotify();
  const interfaces = useHostReading(id, 'interfaces');
  const [creating, setCreating] = useState(false);
  const [removing, setRemoving] = useState(null);
  const [details, setDetails] = useState(null);
  const writable = canControlHosts(role);
  const links = useMemo(() => physicalLinksOf(interfaces.data?.interfaces), [interfaces.data]);

  const create = async form => {
    const { error } = await tools.send({
      id,
      call: () => createVlan(status, id, vlanBody(form)),
      doneKey: 'hosts.networking.tools.vlanCreated',
      values: { name: form.name || `${form.link}/${form.vid}`, vid: form.vid },
      failKey: 'host.vlanCreateModal.errorCreatingVlan',
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
      call: () => deleteVlan(status, id, row.link),
      doneKey: 'hosts.networking.tools.vlanDeleted',
      values: { name: row.link },
      failKey: 'host.vlanManagement.errors.deleteError',
    });
  };

  const open = row =>
    fetchVlan(status, id, row.link)
      .then(data => setDetails({ vlan: row, details: data?.vlan || data }))
      .catch(error =>
        notify(
          'danger',
          t('host.vlanManagement.errors.loadDetailsError', { message: error.message })
        )
      );

  const createButton = (
    <button
      type="button"
      className="btn btn-sm btn-primary"
      onClick={() => setCreating(true)}
      disabled={tools.busy}
      data-tool="create-vlan"
    >
      <FaPlus className="me-2" aria-hidden="true" />
      {t('host.vlanManagement.createVlan')}
    </button>
  );

  return (
    <>
      <NetworkingTable
        panel="networking-vlans"
        section
        title={t('host.vlanManagement.title')}
        count={t('host.vlanManagement.vlansCount', { count: rows.length })}
        columns={VLAN_COLUMNS}
        table={table}
        rowKey={row => row.link}
        RowActions={VlanRowActions}
        actionsProps={{
          busy: tools.busy,
          canEdit: writable,
          onDetails: open,
          onDelete: setRemoving,
        }}
        ctx={ctx}
        emptyKey="host.vlanTable.noVlansFound"
        reading={reading}
        filtering={filtering}
        fold={fold}
        actions={writable ? createButton : null}
      />
      {creating ? (
        <VlanCreateModal
          links={links}
          vlans={rows}
          busy={tools.busy}
          onClose={() => setCreating(false)}
          onSubmit={create}
        />
      ) : null}
      {details ? (
        <VlanDetailsModal
          vlan={details.vlan}
          details={details.details}
          onClose={() => setDetails(null)}
        />
      ) : null}
      <ConfirmModal
        show={Boolean(removing)}
        handleClose={() => setRemoving(null)}
        handleConfirm={remove}
        title={t('host.vlanManagement.deleteVlanTitle')}
        message={t('host.vlanManagement.deleteVlanMessage', { name: removing?.link })}
        variant="delete"
        confirmText={t('host.vlanManagement.delete')}
      />
    </>
  );
};

VlanManagement.propTypes = {
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

export default VlanManagement;
