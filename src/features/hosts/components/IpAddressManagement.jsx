import PropTypes from 'prop-types';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaPlus } from 'react-icons/fa6';

import ConfirmModal from '../../../components/common/ConfirmModal';
import { useStatus } from '../../../contexts/StatusContext';
import { createAddress, deleteAddress, disableAddress, enableAddress } from '../api/networking';
import { useHostReading } from '../hooks/useHostReadings';
import { addressKey } from '../utils/networking';
import {
  addressBody,
  addressDeleteParams,
  addressInterfacesOf,
  isGoAgent,
} from '../utils/networkingManagement';
import { canControlHosts } from '../utils/permissions';

import IpAddressCreateModal from './IpAddressCreateModal';
import { IpAddressRowActions } from './IpAddressTableManagement';
import { ADDRESS_COLUMNS } from './NetworkingColumns';
import NetworkingTable from './NetworkingTable';

const NONE = { kind: '', row: null };

/**
 * The one addresses table of the Addresses page, a folding glass section:
 * every address of the monitoring read and of the managed read once, the
 * Managed badge on a row the managed read answers, and, while the host
 * offers the managed read and the person controls hosts, Create in the
 * heading and Enable, Disable and Delete on each managed row. A create
 * sends `POST network/addresses` with `addressBody`; a delete, behind the
 * typed confirmation, sends `DELETE network/addresses/{addrobj}` with
 * `addressDeleteParams` over the managed rows; Enable and Disable send
 * their `PUT`, the Disable of a VirtualBox or UTM host behind a
 * confirmation of its own, hyperweaver-ui's, because that agent takes
 * the whole interface down. Every write goes through the page's one
 * `useNetworkingTools`, which raises the notice, follows the queued task
 * and reads the held addresses again.
 */
const IpAddressManagement = ({
  id,
  server,
  role,
  managedRows,
  managedOffered,
  reading,
  table,
  ctx,
  filtering,
  fold,
  tools,
}) => {
  const { t } = useTranslation();
  const status = useStatus();
  const vnics = useHostReading(id, 'vnics');
  const interfaces = useHostReading(id, 'interfaces');
  const [creating, setCreating] = useState(false);
  const [confirm, setConfirm] = useState(NONE);
  const goAgent = isGoAgent(server);
  const writable = canControlHosts(role) && managedOffered;
  const options = useMemo(
    () =>
      addressInterfacesOf({ vnics: vnics.data?.vnics, interfaces: interfaces.data?.interfaces }),
    [vnics.data, interfaces.data]
  );

  const create = async form => {
    const { error } = await tools.send({
      id,
      call: () => createAddress(status, id, addressBody(form)),
      doneKey: 'hosts.networking.tools.addressCreated',
      values: { name: form.addrobj },
      failKey: 'host.ipAddressCreateModal.errors.createError',
    });
    if (!error) {
      setCreating(false);
    }
  };

  const remove = row =>
    tools.send({
      id,
      call: () =>
        deleteAddress(
          status,
          id,
          row.addrobj,
          addressDeleteParams({ rows: managedRows, row, goAgent })
        ),
      doneKey: 'hosts.networking.tools.addressDeleted',
      values: { name: row.addrobj },
      failKey: 'host.ipAddressManagement.errors.deleteError',
    });

  const toggle = (row, action) =>
    tools.send({
      id,
      call: () =>
        action === 'enable'
          ? enableAddress(status, id, row.addrobj)
          : disableAddress(status, id, row.addrobj),
      doneKey:
        action === 'enable'
          ? 'hosts.networking.tools.addressEnabled'
          : 'hosts.networking.tools.addressDisabled',
      values: { name: row.addrobj, action },
      failKey: 'host.ipAddressManagement.errors.toggleError',
    });

  const disable = row => (goAgent ? setConfirm({ kind: 'disable', row }) : toggle(row, 'disable'));

  const confirmed = () => {
    const { kind, row } = confirm;
    setConfirm(NONE);
    return kind === 'delete' ? remove(row) : toggle(row, 'disable');
  };

  const createButton = (
    <button
      type="button"
      className="btn btn-sm btn-primary"
      onClick={() => setCreating(true)}
      disabled={tools.busy}
      data-tool="create-address"
    >
      <FaPlus className="me-2" aria-hidden="true" />
      {t('host.ipAddressManagement.createIpAddress')}
    </button>
  );

  const deleteMessage = (
    <>
      <p>
        <strong>{t('host.ipAddressManagement.warning')}</strong>{' '}
        {t('host.ipAddressManagement.cannotUndo')}
      </p>
      <p>
        {t('host.ipAddressManagement.deletePrompt')}{' '}
        <strong className="font-monospace">
          {confirm.row?.addrobj}
          {confirm.row?.ip_address ? ` (${confirm.row.ip_address})` : ''}
        </strong>
        ?
      </p>
      <p className="text-muted small mb-0">{t('host.ipAddressManagement.deleteNote')}</p>
    </>
  );

  return (
    <>
      <NetworkingTable
        panel="networking-addresses"
        title={t('host.ipAddressTable.title')}
        columns={ADDRESS_COLUMNS}
        table={table}
        rowKey={addressKey}
        RowActions={writable ? IpAddressRowActions : null}
        actionsProps={{
          busy: tools.busy,
          onEnable: row => toggle(row, 'enable'),
          onDisable: disable,
          onDelete: row => setConfirm({ kind: 'delete', row }),
        }}
        ctx={ctx}
        emptyKey="host.ipAddressTable.noData"
        reading={reading}
        filtering={filtering}
        fold={fold}
        actions={writable ? createButton : null}
      />
      {creating ? (
        <IpAddressCreateModal
          server={server}
          interfaces={options}
          busy={tools.busy}
          onClose={() => setCreating(false)}
          onSubmit={create}
        />
      ) : null}
      <ConfirmModal
        show={confirm.kind === 'delete'}
        handleClose={() => setConfirm(NONE)}
        handleConfirm={confirmed}
        title={t('host.ipAddressManagement.deleteTitle')}
        message={deleteMessage}
        variant="delete"
        confirmText={t('host.ipAddressManagement.delete')}
      />
      <ConfirmModal
        show={confirm.kind === 'disable'}
        handleClose={() => setConfirm(NONE)}
        handleConfirm={confirmed}
        title={t('host.ipAddressManagement.goDisableTitle')}
        message={t('host.ipAddressManagement.goDisableBody', { iface: confirm.row?.interface })}
        variant="restart"
        confirmText={t('host.ipAddressManagement.goDisableConfirm')}
      />
    </>
  );
};

IpAddressManagement.propTypes = {
  id: PropTypes.string.isRequired,
  server: PropTypes.object.isRequired,
  role: PropTypes.string,
  managedRows: PropTypes.array.isRequired,
  managedOffered: PropTypes.bool.isRequired,
  reading: PropTypes.shape({
    loaded: PropTypes.bool.isRequired,
    failed: PropTypes.bool.isRequired,
  }).isRequired,
  table: PropTypes.object.isRequired,
  ctx: PropTypes.object.isRequired,
  filtering: PropTypes.bool.isRequired,
  fold: PropTypes.object.isRequired,
  tools: PropTypes.object.isRequired,
};

export default IpAddressManagement;
