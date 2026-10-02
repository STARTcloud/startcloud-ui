import PropTypes from 'prop-types';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaPlus } from 'react-icons/fa6';

import ConfirmModal from '../../../components/common/ConfirmModal';
import { useStatus } from '../../../contexts/StatusContext';
import { createAddress, deleteAddress, disableAddress, enableAddress } from '../api/networking';
import { useHostReading } from '../hooks/useHostReadings';
import {
  addressBody,
  addressDeleteParams,
  addressInterfacesOf,
  isGoAgent,
  managedAddressKey,
} from '../utils/networkingManagement';

import IpAddressCreateModal from './IpAddressCreateModal';
import { IpAddressRowActions, MANAGED_ADDRESS_COLUMNS } from './IpAddressTableManagement';
import NetworkingTable from './NetworkingTable';

const NONE = { kind: '', row: null };

/**
 * The IP addresses section of the networking page's management,
 * hyperweaver-ui's `IpAddressManagement` over the one folding table:
 * the addresses the host answers, each with Enable, Disable and Delete,
 * and Create in the heading. A create sends `POST network/addresses`
 * with `addressBody`; a delete, behind the typed confirmation, sends
 * `DELETE network/addresses/{addrobj}` with `addressDeleteParams`; Enable
 * and Disable send their `PUT`, the Disable of a VirtualBox or UTM host
 * behind a confirmation of its own, hyperweaver-ui's, because that
 * agent takes the whole interface down. Every write goes through the
 * page's one `useNetworkingTools`, which raises the notice, follows the
 * queued task and reads the held addresses again.
 */
const IpAddressManagement = ({ id, server, rows, reading, table, ctx, filtering, fold, tools }) => {
  const { t } = useTranslation();
  const status = useStatus();
  const vnics = useHostReading(id, 'vnics');
  const interfaces = useHostReading(id, 'interfaces');
  const [creating, setCreating] = useState(false);
  const [confirm, setConfirm] = useState(NONE);
  const goAgent = isGoAgent(server);
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
        deleteAddress(status, id, row.addrobj, addressDeleteParams({ rows, row, goAgent })),
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
        panel="networking-managed-addresses"
        section
        title={t('host.ipAddressManagement.title')}
        count={t('host.ipAddressManagement.ipAddresses', { total: rows.length })}
        columns={MANAGED_ADDRESS_COLUMNS}
        table={table}
        rowKey={managedAddressKey}
        RowActions={IpAddressRowActions}
        actionsProps={{
          busy: tools.busy,
          onEnable: row => toggle(row, 'enable'),
          onDisable: disable,
          onDelete: row => setConfirm({ kind: 'delete', row }),
        }}
        ctx={ctx}
        emptyKey="host.ipAddressTableManagement.noData"
        reading={reading}
        filtering={filtering}
        fold={fold}
        actions={createButton}
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
  rows: PropTypes.array.isRequired,
  reading: PropTypes.object.isRequired,
  table: PropTypes.object.isRequired,
  ctx: PropTypes.object.isRequired,
  filtering: PropTypes.bool.isRequired,
  fold: PropTypes.object.isRequired,
  tools: PropTypes.object.isRequired,
};

export default IpAddressManagement;
