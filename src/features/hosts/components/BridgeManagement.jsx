import PropTypes from 'prop-types';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaPlus } from 'react-icons/fa6';

import ConfirmModal from '../../../components/common/ConfirmModal';
import { useNotify } from '../../../contexts/NoticeContext';
import { useStatus } from '../../../contexts/StatusContext';
import { createBridge, deleteBridge, fetchBridge } from '../api/networking';
import { useHostReading } from '../hooks/useHostReadings';
import { bridgeBody, bridgeableLinksOf } from '../utils/networkingManagement';
import { canControlHosts } from '../utils/permissions';

import BridgeCreateModal from './BridgeCreateModal';
import { BRIDGE_COLUMNS, BridgeRowActions } from './BridgeTable';
import NetworkingDetailsDialog from './NetworkingDetailsDialog';
import NetworkingTable from './NetworkingTable';

/**
 * The bridges section of the networking page's management,
 * hyperweaver-ui's `BridgeManagement` over the one folding table: the
 * bridges the host answers, each with its details and its delete, and
 * Create in the heading. A create sends `POST network/bridges` with
 * `bridgeBody`, a queued task; a delete, behind the typed confirmation,
 * sends `DELETE network/bridges/{name}`; the details read
 * `GET network/bridges/{name}` with the links and the forwarding table
 * once and show the answer as hyperweaver-ui did, as it came. Every
 * write goes through the page's one `useNetworkingTools`. Create and
 * the delete draw for a role that controls hosts alone; every other
 * role reads the table with the details.
 */
const BridgeManagement = ({ id, role, rows, reading, table, ctx, filtering, fold, tools }) => {
  const { t } = useTranslation();
  const status = useStatus();
  const notify = useNotify();
  const interfaces = useHostReading(id, 'interfaces');
  const [creating, setCreating] = useState(false);
  const [removing, setRemoving] = useState(null);
  const [details, setDetails] = useState(null);
  const writable = canControlHosts(role);
  const links = useMemo(() => bridgeableLinksOf(interfaces.data?.interfaces), [interfaces.data]);

  const create = async form => {
    const { error } = await tools.send({
      id,
      call: () => createBridge(status, id, bridgeBody(form)),
      doneKey: 'hosts.networking.tools.bridgeCreated',
      values: { name: form.name },
      failKey: 'host.bridgeCreateModal.errors.createError',
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
      call: () => deleteBridge(status, id, row.name),
      doneKey: 'hosts.networking.tools.bridgeDeleted',
      values: { name: row.name },
      failKey: 'host.bridgeManagement.errors.deleteError',
    });
  };

  const open = row =>
    fetchBridge(status, id, row.name)
      .then(data => setDetails({ bridge: row, raw: JSON.stringify(data, null, 2) }))
      .catch(error =>
        notify('danger', t('host.bridgeManagement.errors.detailsError', { message: error.message }))
      );

  const createButton = (
    <button
      type="button"
      className="btn btn-sm btn-primary"
      onClick={() => setCreating(true)}
      disabled={tools.busy}
      data-tool="create-bridge"
    >
      <FaPlus className="me-2" aria-hidden="true" />
      {t('host.bridgeManagement.createBridge')}
    </button>
  );

  return (
    <>
      <NetworkingTable
        panel="networking-bridges"
        section
        title={t('host.bridgeManagement.title')}
        count={t('host.bridgeManagement.bridges', { total: rows.length })}
        columns={BRIDGE_COLUMNS}
        table={table}
        rowKey={row => row.name}
        RowActions={BridgeRowActions}
        actionsProps={{
          busy: tools.busy,
          canEdit: writable,
          onDetails: open,
          onDelete: setRemoving,
        }}
        ctx={ctx}
        emptyKey="host.bridgeTable.empty"
        reading={reading}
        filtering={filtering}
        fold={fold}
        actions={writable ? createButton : null}
      />
      {creating ? (
        <BridgeCreateModal
          links={links}
          busy={tools.busy}
          onClose={() => setCreating(false)}
          onSubmit={create}
        />
      ) : null}
      {details ? (
        <NetworkingDetailsDialog
          dialog="bridge-details"
          title={t('host.bridgeManagement.bridgeDetails')}
          sections={[{ key: 'raw', title: details.bridge.name, raw: details.raw }]}
          onClose={() => setDetails(null)}
        />
      ) : null}
      <ConfirmModal
        show={Boolean(removing)}
        handleClose={() => setRemoving(null)}
        handleConfirm={remove}
        title={t('host.bridgeManagement.deleteTitle')}
        message={t('host.bridgeManagement.deleteMessage', { name: removing?.name })}
        variant="delete"
        confirmText={t('host.bridgeManagement.delete')}
      />
    </>
  );
};

BridgeManagement.propTypes = {
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

export default BridgeManagement;
