import PropTypes from 'prop-types';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaPlus } from 'react-icons/fa6';

import ConfirmModal from '../../../components/common/ConfirmModal';
import { useNotify } from '../../../contexts/NoticeContext';
import { useStatus } from '../../../contexts/StatusContext';
import { createEtherstub, deleteEtherstub, fetchEtherstub } from '../api/networking';
import { etherstubBody, namedKey } from '../utils/networkingManagement';
import { canControlHosts } from '../utils/permissions';

import EtherstubCreateModal from './EtherstubCreateModal';
import EtherstubDetailsModal from './EtherstubDetailsModal';
import { ETHERSTUB_COLUMNS, EtherstubRowActions } from './EtherstubTable';
import NetworkingTable from './NetworkingTable';

/**
 * The etherstubs section of the networking page's management,
 * hyperweaver-ui's `EtherstubManagement` over the one folding table:
 * the etherstubs the host answers, each with its details and its
 * delete, and Create in the heading. A create sends
 * `POST network/etherstubs` with `etherstubBody`, a queued task; a
 * delete, behind the typed confirmation, sends
 * `DELETE network/etherstubs/{name}`; the details read
 * `GET network/etherstubs/{name}` with `show_vnics` once. Every write
 * goes through the page's one `useNetworkingTools`. Create and the
 * delete draw for a role that controls hosts alone; every other role
 * reads the table with the details.
 */
const EtherstubManagement = ({ id, role, rows, reading, table, ctx, filtering, fold, tools }) => {
  const { t } = useTranslation();
  const status = useStatus();
  const notify = useNotify();
  const [creating, setCreating] = useState(false);
  const [removing, setRemoving] = useState(null);
  const [details, setDetails] = useState(null);
  const writable = canControlHosts(role);

  const create = async form => {
    const { error } = await tools.send({
      id,
      call: () => createEtherstub(status, id, etherstubBody(form)),
      doneKey: 'hosts.networking.tools.etherstubCreated',
      values: { name: form.name },
      failKey: 'host.etherstubCreateModal.errors.createError',
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
      call: () => deleteEtherstub(status, id, namedKey(row)),
      doneKey: 'hosts.networking.tools.etherstubDeleted',
      values: { name: namedKey(row) },
      failKey: 'host.etherstubManagement.errors.deleteError',
    });
  };

  const open = row =>
    fetchEtherstub(status, id, namedKey(row))
      .then(data => setDetails({ etherstub: row, details: data }))
      .catch(error =>
        notify(
          'danger',
          t('host.etherstubManagement.errors.detailsError', { message: error.message })
        )
      );

  const createButton = (
    <button
      type="button"
      className="btn btn-sm btn-primary"
      onClick={() => setCreating(true)}
      disabled={tools.busy}
      data-tool="create-etherstub"
    >
      <FaPlus className="me-2" aria-hidden="true" />
      {t('host.etherstubManagement.createEtherstub')}
    </button>
  );

  return (
    <>
      <NetworkingTable
        panel="networking-etherstubs"
        section
        title={t('host.etherstubManagement.title')}
        count={t('host.etherstubManagement.etherstubs', { total: rows.length })}
        columns={ETHERSTUB_COLUMNS}
        table={table}
        rowKey={namedKey}
        RowActions={EtherstubRowActions}
        actionsProps={{
          busy: tools.busy,
          canEdit: writable,
          onDetails: open,
          onDelete: setRemoving,
        }}
        ctx={ctx}
        emptyKey="host.etherstubTable.noData"
        reading={reading}
        filtering={filtering}
        fold={fold}
        actions={writable ? createButton : null}
      />
      {creating ? (
        <EtherstubCreateModal
          etherstubs={rows}
          busy={tools.busy}
          onClose={() => setCreating(false)}
          onSubmit={create}
        />
      ) : null}
      {details ? (
        <EtherstubDetailsModal
          etherstub={details.etherstub}
          details={details.details}
          onClose={() => setDetails(null)}
        />
      ) : null}
      <ConfirmModal
        show={Boolean(removing)}
        handleClose={() => setRemoving(null)}
        handleConfirm={remove}
        title={t('host.etherstubManagement.deleteTitle')}
        message={t('host.etherstubManagement.deleteMessage', {
          name: removing ? namedKey(removing) : '',
        })}
        variant="delete"
        confirmText={t('host.etherstubManagement.delete')}
      />
    </>
  );
};

EtherstubManagement.propTypes = {
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

export default EtherstubManagement;
