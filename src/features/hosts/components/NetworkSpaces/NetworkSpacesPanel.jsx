import PropTypes from 'prop-types';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaPen, FaPlay, FaPlus, FaStop, FaTrash } from 'react-icons/fa6';

import ConfirmModal from '../../../../components/common/ConfirmModal';
import { useStatus } from '../../../../contexts/StatusContext';
import {
  createHostOnlyIf,
  createHostOnlyNet,
  createNatNetwork,
  deleteHostOnlyIf,
  deleteHostOnlyNet,
  deleteNatNetwork,
  modifyHostOnlyIf,
  modifyHostOnlyNet,
  modifyNatNetwork,
  natNetworkService,
} from '../../api/networkSpaces';
import { spaceFamiliesOf } from '../../utils/networkingManagement';
import { canStartStopMachines } from '../../utils/permissions';
import NetworkingTable from '../NetworkingTable';

import { HostOnlyIfModal, HostOnlyNetModal } from './HostOnlyModals';
import NatNetworkModal from './NatNetworkModal';

const badge = (tone, content) => <span className={`badge text-bg-${tone}`}>{content}</span>;

const TYPE_KEYS = {
  hostonly: 'host.networkSpaces.sectionHostonlyIfs',
  hostonlynet: 'host.networkSpaces.sectionHostonlyNets',
  natnetwork: 'host.networkSpaces.sectionNat',
  intnet: 'host.networkSpaces.sectionIntnets',
};

const typeWord = (row, ctx) => (TYPE_KEYS[row.type] ? ctx.t(TYPE_KEYS[row.type]) : row.type);

const networkOf = row => {
  if (row.type === 'hostonly') {
    return `${row.ip_address || ''} / ${row.network_mask || ''}`;
  }
  if (row.type === 'hostonlynet') {
    return `${row.network_mask || ''} · ${row.lower_ip || ''}–${row.upper_ip || ''}`;
  }
  if (row.type === 'natnetwork') {
    return `${row.cidr || ''}${row.gateway ? ` · ${row.gateway}` : ''}`;
  }
  return '';
};

const dhcpWord = (row, ctx) => {
  if (row.type === 'hostonly') {
    return row.dhcp?.exists
      ? ctx.t('host.networkSpaces.dhcpRange', {
          lower: row.dhcp.lower_ip,
          upper: row.dhcp.upper_ip,
        })
      : ctx.t('host.networkSpaces.dhcpOff');
  }
  if (row.type === 'natnetwork') {
    return row.dhcp_enabled ? ctx.t('host.networkSpaces.dhcpToggle') : '';
  }
  return '';
};

const enabledOf = row => row.type !== 'hostonly' && row.type !== 'intnet' && row.enabled !== false;

const stateCell = (row, ctx) => {
  if (row.type === 'hostonly' || row.type === 'intnet') {
    return null;
  }
  return (
    <span className="d-inline-flex flex-wrap gap-1">
      {badge(
        enabledOf(row) ? 'success' : 'secondary',
        ctx.t(
          enabledOf(row) ? 'host.networkSpaces.enabledLabel' : 'host.networkSpaces.disabledLabel'
        )
      )}
      {row.type === 'natnetwork' && row.ipv6 ? badge('info', 'v6') : null}
      {row.type === 'natnetwork'
        ? badge(
            'light',
            ctx.t('host.networkSpaces.forwardCount', { count: (row.port_forwards || []).length })
          )
        : null}
    </span>
  );
};

/**
 * The columns of the network spaces table: the name, the family, the
 * network, the DHCP and the state, every space of the host in one
 * table, hyperweaver-ui's four lists as one.
 */
export const SPACE_COLUMNS = [
  {
    key: 'name',
    kind: 'name',
    labelKey: 'host.networkSpaces.name',
    value: row => row.name || '',
    render: row => <strong className="font-monospace">{row.name}</strong>,
  },
  {
    key: 'type',
    kind: 'badge',
    labelKey: 'hosts.networking.spaces.type',
    value: typeWord,
    render: (row, ctx) => badge('info', typeWord(row, ctx)),
  },
  {
    key: 'network',
    kind: 'text',
    labelKey: 'hosts.networking.spaces.network',
    priority: 2,
    value: networkOf,
    render: row => <code>{networkOf(row)}</code>,
  },
  {
    key: 'dhcp',
    kind: 'text',
    labelKey: 'host.networkSpaces.dhcpToggle',
    priority: 4,
    value: dhcpWord,
  },
  {
    key: 'state',
    kind: 'badges',
    labelKey: 'hosts.networking.spaces.state',
    priority: 3,
    value: (row, ctx) =>
      row.type === 'hostonly' || row.type === 'intnet'
        ? ''
        : ctx.t(
            enabledOf(row) ? 'host.networkSpaces.enabledLabel' : 'host.networkSpaces.disabledLabel'
          ),
    render: stateCell,
  },
];

/**
 * The actions of one space, hyperweaver-ui's: Edit and Delete on a
 * host-only interface, a host-only network and a NAT network, Start and
 * Stop on a NAT network before them, and none on an internal network,
 * which is read only by the platform's rule; all only for a person who
 * may start and stop machines.
 */
const SpaceRowActions = ({ row, busy, canEdit, onEdit, onDelete, onService }) => {
  const { t } = useTranslation();
  if (!canEdit || row.type === 'intnet') {
    return null;
  }
  return (
    <>
      {row.type === 'natnetwork' ? (
        <>
          <button
            type="button"
            className="btn btn-sm btn-outline-success"
            title={t('host.networkSpaces.start')}
            onClick={() => onService(row, 'start')}
            disabled={busy}
            data-tool="start"
          >
            <FaPlay aria-hidden="true" />
          </button>
          <button
            type="button"
            className="btn btn-sm btn-outline-warning"
            title={t('host.networkSpaces.stop')}
            onClick={() => onService(row, 'stop')}
            disabled={busy}
            data-tool="stop"
          >
            <FaStop aria-hidden="true" />
          </button>
        </>
      ) : null}
      <button
        type="button"
        className="btn btn-sm btn-outline-primary"
        title={t('host.networkSpaces.edit')}
        onClick={() => onEdit(row)}
        disabled={busy}
        data-tool="edit"
      >
        <FaPen aria-hidden="true" />
      </button>
      <button
        type="button"
        className="btn btn-sm btn-outline-danger"
        title={t('host.networkSpaces.del')}
        onClick={() => onDelete(row)}
        disabled={busy}
        data-tool="delete"
      >
        <FaTrash aria-hidden="true" />
      </button>
    </>
  );
};

SpaceRowActions.propTypes = {
  row: PropTypes.object.isRequired,
  busy: PropTypes.bool.isRequired,
  canEdit: PropTypes.bool.isRequired,
  onEdit: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
  onService: PropTypes.func.isRequired,
};

const WRITES = {
  hostonly: { create: createHostOnlyIf, modify: modifyHostOnlyIf, remove: deleteHostOnlyIf },
  hostonlynet: { create: createHostOnlyNet, modify: modifyHostOnlyNet, remove: deleteHostOnlyNet },
  natnetwork: { create: createNatNetwork, modify: modifyNatNetwork, remove: deleteNatNetwork },
};

const CREATE_KEYS = {
  hostonly: 'host.networkSpaces.newHostonlyIf',
  hostonlynet: 'host.networkSpaces.newHostonlyNet',
  natnetwork: 'host.networkSpaces.newNat',
};

const DIALOGS = {
  hostonly: HostOnlyIfModal,
  hostonlynet: HostOnlyNetModal,
  natnetwork: NatNetworkModal,
};

/**
 * The network spaces section of the networking page's management,
 * hyperweaver-ui's `NetworkSpacesPanel` over the one folding table, on
 * a host that lists `network-spaces`: the host-only interfaces with
 * their DHCP, the VirtualBox 7 host-only networks, the NAT networks with
 * their forwards and the read-only internal networks, each family drawn
 * as hyperweaver-ui's platform rule has it (`spaceFamiliesOf`), a Darwin
 * host the networks alone and every other host the interfaces alone, and
 * hyperweaver-ui's note on the internal networks under the table. Create
 * in the heading, one button a family the host draws; every write goes
 * through the page's one `useNetworkingTools`, the create and modify of
 * each family their `POST` and `PUT`, the delete behind the typed
 * confirmation its `DELETE`, Start and Stop the NAT network's service
 * routes; the held spaces are read again on each.
 */
const NetworkSpacesPanel = ({
  id,
  server,
  role,
  rows,
  reading,
  table,
  ctx,
  filtering,
  fold,
  tools,
}) => {
  const { t } = useTranslation();
  const status = useStatus();
  const [dialog, setDialog] = useState(null);
  const [removing, setRemoving] = useState(null);
  const canEdit = canStartStopMachines(role);
  const families = spaceFamiliesOf(server);
  const intnets = rows.filter(row => row.type === 'intnet');
  const creatable = ['hostonly', 'hostonlynet', 'natnetwork'].filter(
    kind => kind === 'natnetwork' || families[kind]
  );

  const write = ({ call, doneKey, name }) =>
    tools.send({ id, call, doneKey, values: { name }, keys: ['network-spaces'] });

  const save = async body => {
    const { kind, space } = dialog;
    const { error } = await write({
      call: () =>
        space
          ? WRITES[kind].modify(status, id, space.name, body)
          : WRITES[kind].create(status, id, body),
      doneKey: space
        ? 'hosts.networking.tools.spaceUpdated'
        : 'hosts.networking.tools.spaceCreated',
      name: space?.name || body.name || '',
    });
    if (!error) {
      setDialog(null);
    }
  };

  const remove = () => {
    const space = removing;
    setRemoving(null);
    return write({
      call: () => WRITES[space.type].remove(status, id, space.name),
      doneKey: 'hosts.networking.tools.spaceDeleted',
      name: space.name,
    });
  };

  const service = (space, action) =>
    write({
      call: () => natNetworkService(status, id, space.name, action),
      doneKey:
        action === 'start'
          ? 'hosts.networking.tools.natStarted'
          : 'hosts.networking.tools.natStopped',
      name: space.name,
    });

  const Dialog = dialog ? DIALOGS[dialog.kind] : null;

  return (
    <>
      <NetworkingTable
        panel="networking-spaces"
        section
        title={t('host.networkSpaces.title')}
        columns={SPACE_COLUMNS}
        table={table}
        rowKey={row => `${row.type}|${row.name}`}
        RowActions={SpaceRowActions}
        actionsProps={{
          busy: tools.busy,
          canEdit,
          onEdit: row => setDialog({ kind: row.type, space: row }),
          onDelete: setRemoving,
          onService: service,
        }}
        ctx={ctx}
        emptyKey="hosts.networking.spaces.empty"
        reading={reading}
        filtering={filtering}
        fold={fold}
        actions={
          canEdit
            ? creatable.map(kind => (
                <button
                  key={kind}
                  type="button"
                  className="btn btn-sm btn-outline-primary"
                  onClick={() => setDialog({ kind, space: null })}
                  disabled={tools.busy}
                  data-tool={`create-${kind}`}
                >
                  <FaPlus className="me-2" aria-hidden="true" />
                  {t(CREATE_KEYS[kind])}
                </button>
              ))
            : null
        }
      />
      {intnets.length > 0 && !fold.folded ? (
        <p className="text-muted small" data-note="intnets">
          {t('host.networkSpaces.intnetNote')}
        </p>
      ) : null}
      {Dialog ? (
        <Dialog
          space={dialog.space}
          busy={tools.busy}
          onSave={save}
          onClose={() => setDialog(null)}
        />
      ) : null}
      <ConfirmModal
        show={Boolean(removing)}
        handleClose={() => setRemoving(null)}
        handleConfirm={remove}
        title={t('host.networkSpaces.confirmDeleteTitle', { name: removing?.name })}
        message={t('host.networkSpaces.confirmDeleteBody')}
        variant="delete"
        confirmText={t('host.networkSpaces.del')}
      />
    </>
  );
};

NetworkSpacesPanel.propTypes = {
  id: PropTypes.string.isRequired,
  server: PropTypes.object.isRequired,
  role: PropTypes.string,
  rows: PropTypes.array.isRequired,
  reading: PropTypes.object.isRequired,
  table: PropTypes.object.isRequired,
  ctx: PropTypes.object.isRequired,
  filtering: PropTypes.bool.isRequired,
  fold: PropTypes.object.isRequired,
  tools: PropTypes.object.isRequired,
};

export default NetworkSpacesPanel;
