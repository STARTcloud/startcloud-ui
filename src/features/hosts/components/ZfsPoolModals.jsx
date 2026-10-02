import PropTypes from 'prop-types';
import { useEffect, useMemo, useState } from 'react';
import { Modal } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import {
  FaBroom,
  FaHardDrive,
  FaHeartPulse,
  FaLayerGroup,
  FaMicrochip,
  FaPlus,
  FaRotate,
  FaServer,
  FaXmark,
} from 'react-icons/fa6';

import SubTable from '../../../components/common/SubTable';
import { useStatus } from '../../../contexts/StatusContext';
import { useTablePrefs } from '../../../hooks/useTablePrefs';
import {
  addZfsPoolVdevs,
  createZfsPool,
  destroyZfsPool,
  getImportableZfsPools,
  getZfsPool,
  getZfsPoolStatus,
  importZfsPool,
  setZfsPoolProperties,
} from '../api/zfsAPI';
import {
  buildVdevs,
  healthBadgeClass,
  parsePropertyLines,
  shortDevice,
  solidState,
  vdevKey,
} from '../utils/zfsUtils';

import ToolFormDialog from './ToolFormDialog';
import ZfsPropertiesEditor, { propertyEdits } from './ZfsPropertiesEditor';

const VDEV_TYPES = [
  { value: '', label: 'host.vdevBuilder.vdevTypeStripe', note: 'host.vdevBuilder.vdevNoteStripe' },
  {
    value: 'mirror',
    label: 'host.vdevBuilder.vdevTypeMirror',
    note: 'host.vdevBuilder.vdevNoteMirror',
  },
  {
    value: 'raidz',
    label: 'host.vdevBuilder.vdevTypeRaidz1',
    note: 'host.vdevBuilder.vdevNoteRaidz1',
  },
  {
    value: 'raidz2',
    label: 'host.vdevBuilder.vdevTypeRaidz2',
    note: 'host.vdevBuilder.vdevNoteRaidz2',
  },
  {
    value: 'raidz3',
    label: 'host.vdevBuilder.vdevTypeRaidz3',
    note: 'host.vdevBuilder.vdevNoteRaidz3',
  },
  {
    value: 'spare',
    label: 'host.vdevBuilder.vdevTypeSpare',
    note: 'host.vdevBuilder.vdevNoteSpare',
  },
  { value: 'log', label: 'host.vdevBuilder.vdevTypeLog', note: 'host.vdevBuilder.vdevNoteLog' },
  {
    value: 'cache',
    label: 'host.vdevBuilder.vdevTypeCache',
    note: 'host.vdevBuilder.vdevNoteCache',
  },
];

const SHELF = '__shelf__';

const DISK_GROUPS = ['HDD', 'SSD', 'NVMe', 'Other'];

const groupDisks = (disks, type) =>
  disks.filter(disk => {
    const own = disk.disk_type || 'HDD';
    return type === 'Other' ? !DISK_GROUPS.includes(own) : own === type;
  });

const withoutDevice = (rows, key, device) =>
  rows.map(row =>
    row.key === key ? { ...row, devices: row.devices.filter(entry => entry !== device) } : row
  );

const withDevice = (rows, key, device) =>
  rows.map(row =>
    row.key === key && !row.devices.includes(device)
      ? { ...row, devices: [...row.devices, device] }
      : row
  );

const ShelfChip = ({ disk, dragging, disabled, onDragStart, onDragEnd }) => (
  <span
    className={`badge text-bg-light border d-inline-flex align-items-center gap-1 zfs-chip${dragging ? ' opacity-50' : ''}`}
    role="listitem"
    draggable={!disabled}
    data-shelf-disk={disk.device_name}
    title={`${disk.device_name} · ${disk.manufacturer || ''} ${disk.model || ''} · ${disk.serial_number || ''}`.trim()}
    onDragStart={onDragStart}
    onDragEnd={onDragEnd}
  >
    {solidState(disk.disk_type) ? (
      <FaMicrochip aria-hidden="true" />
    ) : (
      <FaHardDrive aria-hidden="true" />
    )}
    <code className="small">{shortDevice(disk.device_name)}</code>
    <span className="text-muted small">{disk.capacity}</span>
  </span>
);

ShelfChip.propTypes = {
  disk: PropTypes.object.isRequired,
  dragging: PropTypes.bool.isRequired,
  disabled: PropTypes.bool.isRequired,
  onDragStart: PropTypes.func.isRequired,
  onDragEnd: PropTypes.func.isRequired,
};

const Shelf = ({ shelf, placed, dragChip, disabled, onDrop, onDragChip }) => {
  const { t } = useTranslation();
  const free = shelf.filter(disk => !placed.has(disk.device_name));
  return (
    <div
      className="border rounded p-2"
      role="group"
      aria-label={t('host.vdevBuilder.availableDisksAriaLabel')}
      data-shelf
      onDragOver={event => event.preventDefault()}
      onDrop={onDrop}
    >
      <div className="small fw-semibold mb-1">
        <FaServer className="me-2 text-muted" aria-hidden="true" />
        {t('host.vdevBuilder.availableDisksLabel')}
      </div>
      {free.length === 0 ? (
        <span className="text-muted small">{t('host.vdevBuilder.allPlaced')}</span>
      ) : null}
      {DISK_GROUPS.map(type => {
        const disks = groupDisks(free, type);
        if (disks.length === 0) {
          return null;
        }
        return (
          <div key={type} className="mb-1">
            <div className="small text-muted">{type}</div>
            <div className="d-flex flex-wrap gap-1" role="list">
              {disks.map(disk => (
                <ShelfChip
                  key={disk.device_name}
                  disk={disk}
                  dragging={dragChip?.device === disk.device_name && dragChip?.fromKey === SHELF}
                  disabled={disabled}
                  onDragStart={() => onDragChip({ device: disk.device_name, fromKey: SHELF })}
                  onDragEnd={() => onDragChip(null)}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};

Shelf.propTypes = {
  shelf: PropTypes.array.isRequired,
  placed: PropTypes.instanceOf(Set).isRequired,
  dragChip: PropTypes.object,
  disabled: PropTypes.bool.isRequired,
  onDrop: PropTypes.func.isRequired,
  onDragChip: PropTypes.func.isRequired,
};

const VdevRow = ({ row, typed, shelved, dragChip, disabled, actions }) => {
  const { t } = useTranslation();
  const [pending, setPending] = useState('');
  const meta = VDEV_TYPES.find(entry => entry.value === row.type) || VDEV_TYPES[0];

  const addTyped = () => {
    const devices = pending
      .trim()
      .split(/[\s,]+/u)
      .filter(device => device && !row.devices.includes(device));
    if (devices.length > 0) {
      actions.patch(row.key, { devices: [...row.devices, ...devices] });
    }
    setPending('');
  };

  return (
    <div className="col-12 col-md-6">
      <div
        className="border rounded p-2 h-100"
        role="group"
        aria-label={t('host.vdevBuilder.vdevDevicesLabel', { label: t(meta.label) })}
        data-vdev={row.key}
        onDragOver={event => event.preventDefault()}
        onDrop={() => actions.drop(row.key)}
      >
        <div className="d-flex align-items-center gap-2 mb-1">
          <select
            className="form-select form-select-sm w-auto"
            value={row.type}
            onChange={event => actions.patch(row.key, { type: event.target.value })}
            disabled={disabled}
            aria-label={t('host.vdevBuilder.diskDeviceLabel')}
          >
            {VDEV_TYPES.map(entry => (
              <option key={entry.value} value={entry.value}>
                {t(entry.label)}
              </option>
            ))}
          </select>
          <span className="badge text-bg-secondary">
            {t('host.vdevBuilder.diskCountBadge', { count: row.devices.length })}
          </span>
          <button
            type="button"
            className="btn btn-sm btn-outline-danger py-0 ms-auto"
            onClick={() => actions.remove(row.key)}
            disabled={disabled}
            title={t('host.vdevBuilder.removeVdevTitle')}
          >
            <FaXmark aria-hidden="true" />
          </button>
        </div>
        <p className="form-text text-muted mt-0 mb-2 small">{t(meta.note)}</p>
        <div className="d-flex flex-wrap gap-1 mb-2" role="list">
          {row.devices.length === 0 ? (
            <span className="text-muted small">
              {t(shelved ? 'host.vdevBuilder.dragDisksHere' : 'host.vdevBuilder.typeDeviceBelow')}
            </span>
          ) : null}
          {row.devices.map(device => (
            <span
              key={device}
              className={`badge text-bg-light border d-inline-flex align-items-center gap-1 zfs-chip${
                dragChip?.device === device && dragChip?.fromKey === row.key ? ' opacity-50' : ''
              }`}
              role="listitem"
              draggable={!disabled}
              data-vdev-disk={device}
              onDragStart={() => actions.drag({ device, fromKey: row.key })}
              onDragEnd={() => actions.drag(null)}
            >
              <FaHardDrive aria-hidden="true" />
              <code className="small">{device}</code>
              <button
                type="button"
                className="btn btn-link p-0 text-danger"
                aria-label={t('host.vdevBuilder.removeDeviceLabel', { device })}
                onClick={() =>
                  actions.patch(row.key, { devices: row.devices.filter(entry => entry !== device) })
                }
                disabled={disabled}
              >
                <FaXmark className="small" aria-hidden="true" />
              </button>
            </span>
          ))}
        </div>
        {typed ? (
          <div className="input-group input-group-sm">
            <input
              className="form-control font-monospace"
              type="text"
              placeholder={t('host.vdevBuilder.devicePlaceholder')}
              aria-label={t('host.vdevBuilder.addDeviceLabel')}
              value={pending}
              onChange={event => setPending(event.target.value)}
              onKeyDown={event => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  addTyped();
                }
              }}
              disabled={disabled}
            />
            <button
              type="button"
              className="btn btn-outline-secondary"
              onClick={addTyped}
              disabled={disabled || !pending.trim()}
            >
              <FaPlus aria-hidden="true" />
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
};

VdevRow.propTypes = {
  row: PropTypes.shape({
    key: PropTypes.string.isRequired,
    type: PropTypes.string.isRequired,
    devices: PropTypes.arrayOf(PropTypes.string).isRequired,
  }).isRequired,
  typed: PropTypes.bool.isRequired,
  shelved: PropTypes.bool.isRequired,
  dragChip: PropTypes.object,
  disabled: PropTypes.bool.isRequired,
  actions: PropTypes.shape({
    patch: PropTypes.func.isRequired,
    remove: PropTypes.func.isRequired,
    drop: PropTypes.func.isRequired,
    drag: PropTypes.func.isRequired,
  }).isRequired,
};

/**
 * The visual vdev builder, hyperweaver-ui's: a shelf of the host's free
 * disks, the inventory the page holds, over the vdev buckets; a disk is
 * dragged from the shelf into a bucket, between buckets or back to the
 * shelf; devices are typed only while the inventory answers none, the
 * rescan beside the alert.
 */
const VdevBuilder = ({
  rows,
  onChange,
  shelf,
  shelfFailed,
  rescanning,
  onRescan,
  disabled,
  idPrefix,
}) => {
  const { t } = useTranslation();
  const [dragChip, setDragChip] = useState(null);
  const placed = useMemo(() => new Set(rows.flatMap(row => row.devices)), [rows]);
  const shelved = shelf.length > 0;

  const dropOn = toKey => {
    if (dragChip && dragChip.fromKey !== toKey) {
      onChange(
        withDevice(withoutDevice(rows, dragChip.fromKey, dragChip.device), toKey, dragChip.device)
      );
    }
    setDragChip(null);
  };

  const returnToShelf = () => {
    if (dragChip && dragChip.fromKey !== SHELF) {
      onChange(withoutDevice(rows, dragChip.fromKey, dragChip.device));
    }
    setDragChip(null);
  };

  const actions = {
    patch: (key, patch) =>
      onChange(rows.map(row => (row.key === key ? { ...row, ...patch } : row))),
    remove: key => onChange(rows.filter(row => row.key !== key)),
    drop: dropOn,
    drag: setDragChip,
  };

  return (
    <div className="d-flex flex-column gap-2" data-vdev-builder={idPrefix}>
      {shelved ? null : (
        <div className="alert alert-warning py-2 d-flex align-items-center gap-2 flex-wrap mb-0">
          <span>
            {t(
              shelfFailed
                ? 'host.vdevBuilder.inventoryErrorAlert'
                : 'host.vdevBuilder.noFreeDiskAlert'
            )}
          </span>
          <button
            type="button"
            className="btn btn-sm btn-warning"
            onClick={onRescan}
            disabled={rescanning || disabled}
          >
            <FaRotate className="me-2" aria-hidden="true" />
            {t('host.zfsPoolsPanel.rescan')}
          </button>
        </div>
      )}
      {shelved ? (
        <Shelf
          shelf={shelf}
          placed={placed}
          dragChip={dragChip}
          disabled={disabled}
          onDrop={returnToShelf}
          onDragChip={setDragChip}
        />
      ) : null}
      <div className="row g-2">
        {rows.map(row => (
          <VdevRow
            key={row.key}
            row={row}
            typed={!shelved}
            shelved={shelved}
            dragChip={dragChip}
            disabled={disabled}
            actions={actions}
          />
        ))}
      </div>
      <div>
        <button
          type="button"
          id={`${idPrefix}-add-vdev-row`}
          className="btn btn-sm btn-outline-primary"
          onClick={() =>
            onChange([
              ...rows,
              { key: `vdev-${idPrefix}-${rows.length + 1}-${Date.now()}`, type: '', devices: [] },
            ])
          }
          disabled={disabled}
        >
          <FaPlus className="me-2" aria-hidden="true" />
          {t('host.vdevBuilder.addVdevButton')}
        </button>
      </div>
    </div>
  );
};

VdevBuilder.propTypes = {
  rows: PropTypes.array.isRequired,
  onChange: PropTypes.func.isRequired,
  shelf: PropTypes.array.isRequired,
  shelfFailed: PropTypes.bool.isRequired,
  rescanning: PropTypes.bool.isRequired,
  onRescan: PropTypes.func.isRequired,
  disabled: PropTypes.bool.isRequired,
  idPrefix: PropTypes.string.isRequired,
};

const shelfShape = PropTypes.shape({
  disks: PropTypes.array.isRequired,
  failed: PropTypes.bool.isRequired,
  rescanning: PropTypes.bool.isRequired,
  onRescan: PropTypes.func.isRequired,
});

const toolsShape = PropTypes.shape({
  send: PropTypes.func.isRequired,
  busy: PropTypes.bool.isRequired,
});

const ForceCheck = ({ id, labelKey, checked, onChange, disabled }) => {
  const { t } = useTranslation();
  return (
    <div className="form-check mt-3">
      <input
        id={id}
        className="form-check-input"
        type="checkbox"
        checked={checked}
        onChange={event => onChange(event.target.checked)}
        disabled={disabled}
      />
      <label className="form-check-label" htmlFor={id}>
        {t(labelKey)}
      </label>
    </div>
  );
};

ForceCheck.propTypes = {
  id: PropTypes.string.isRequired,
  labelKey: PropTypes.string.isRequired,
  checked: PropTypes.bool.isRequired,
  onChange: PropTypes.func.isRequired,
  disabled: PropTypes.bool.isRequired,
};

/**
 * The create pool dialog, hyperweaver-ui's: the name, the mount point,
 * the vdevs from the builder, the properties as `key=value` lines and
 * the force flag, sent as `POST storage/pools`, a queued task.
 */
export const CreatePoolModal = ({ id, shelf, tools, onClose }) => {
  const { t } = useTranslation();
  const status = useStatus();
  const [name, setName] = useState('');
  const [rows, setRows] = useState([{ key: 'vdev-create-0', type: '', devices: [] }]);
  const [propLines, setPropLines] = useState('');
  const [mountPoint, setMountPoint] = useState('');
  const [force, setForce] = useState(false);
  const [problem, setProblem] = useState('');

  const submit = async () => {
    const vdevs = buildVdevs(rows);
    if (!name.trim() || vdevs.length === 0) {
      setProblem('host.createPoolModal.errorRequired');
      return;
    }
    setProblem('');
    const properties = parsePropertyLines(propLines);
    const { error } = await tools.send({
      call: () =>
        createZfsPool(status, id, {
          pool_name: name.trim(),
          vdevs,
          ...(Object.keys(properties).length > 0 ? { properties } : {}),
          ...(mountPoint.trim() ? { mount_point: mountPoint.trim() } : {}),
          ...(force ? { force: true } : {}),
        }),
      doneKey: 'host.createPoolModal.queuedMessage',
      values: { name: name.trim() },
    });
    if (!error) {
      onClose();
    }
  };

  return (
    <ToolFormDialog
      dialog="zfs-create-pool"
      title={t('host.createPoolModal.title')}
      submitKey="host.createPoolModal.submit"
      problemKey={problem}
      busy={tools.busy}
      onClose={onClose}
      onSubmit={submit}
    >
      <div className="row g-3">
        <div className="col-12 col-md-6">
          <label className="form-label" htmlFor="zpool-create-name">
            {t('host.createPoolModal.poolNameLabel')} <span className="text-danger">*</span>
          </label>
          <input
            id="zpool-create-name"
            className="form-control"
            type="text"
            value={name}
            onChange={event => setName(event.target.value)}
            disabled={tools.busy}
          />
        </div>
        <div className="col-12 col-md-6">
          <label className="form-label" htmlFor="zpool-create-mountpoint">
            {t('host.createPoolModal.mountPointLabel')}
          </label>
          <input
            id="zpool-create-mountpoint"
            className="form-control font-monospace"
            type="text"
            placeholder={t('host.createPoolModal.mountPointPlaceholder')}
            value={mountPoint}
            onChange={event => setMountPoint(event.target.value)}
            disabled={tools.busy}
          />
        </div>
        <div className="col-12">
          <span className="form-label d-block">
            {t('host.createPoolModal.vdevsLabel')} <span className="text-danger">*</span>
          </span>
          <VdevBuilder
            rows={rows}
            onChange={setRows}
            shelf={shelf.disks}
            shelfFailed={shelf.failed}
            rescanning={shelf.rescanning}
            onRescan={shelf.onRescan}
            disabled={tools.busy}
            idPrefix="create"
          />
        </div>
        <div className="col-12">
          <label className="form-label" htmlFor="zpool-create-props">
            {t('host.createPoolModal.propertiesLabel')}
          </label>
          <textarea
            id="zpool-create-props"
            className="form-control font-monospace"
            rows={2}
            placeholder={t('host.createPoolModal.propertiesPlaceholder')}
            value={propLines}
            onChange={event => setPropLines(event.target.value)}
            disabled={tools.busy}
          />
        </div>
      </div>
      <ForceCheck
        id="zpool-create-force"
        labelKey="host.createPoolModal.forceLabelCreate"
        checked={force}
        onChange={setForce}
        disabled={tools.busy}
      />
    </ToolFormDialog>
  );
};

CreatePoolModal.propTypes = {
  id: PropTypes.string.isRequired,
  shelf: shelfShape.isRequired,
  tools: toolsShape.isRequired,
  onClose: PropTypes.func.isRequired,
};

/**
 * The import pool dialog, hyperweaver-ui's: the pools that can be
 * imported, read as the dialog opens, one picked or its name typed
 * while the agent found none, a new name and the force flag, sent as
 * `POST storage/pools/import`, a queued task.
 */
export const ImportPoolModal = ({ id, tools, onClose }) => {
  const { t } = useTranslation();
  const status = useStatus();
  const [importable, setImportable] = useState(null);
  const [failed, setFailed] = useState('');
  const [poolName, setPoolName] = useState('');
  const [newName, setNewName] = useState('');
  const [force, setForce] = useState(false);
  const [problem, setProblem] = useState('');

  useEffect(() => {
    let live = true;
    getImportableZfsPools(status, id).then(
      answer => {
        if (live) {
          setImportable(answer || {});
        }
      },
      error => {
        if (live) {
          setImportable({});
          setFailed(error.message);
        }
      }
    );
    return () => {
      live = false;
    };
  }, [status, id]);

  const pools = Array.isArray(importable?.pools) ? importable.pools : [];

  const submit = async () => {
    if (!poolName.trim()) {
      setProblem('host.importPoolModal.errorPickPool');
      return;
    }
    setProblem('');
    const { error } = await tools.send({
      call: () =>
        importZfsPool(status, id, {
          pool_name: poolName.trim(),
          ...(newName.trim() ? { new_name: newName.trim() } : {}),
          ...(force ? { force: true } : {}),
        }),
      doneKey: 'host.importPoolModal.queuedMessage',
      values: { name: poolName.trim() },
    });
    if (!error) {
      onClose();
    }
  };

  return (
    <ToolFormDialog
      dialog="zfs-import-pool"
      title={t('host.importPoolModal.title')}
      submitKey="host.importPoolModal.submit"
      problemKey={problem}
      busy={tools.busy}
      onClose={onClose}
      onSubmit={submit}
    >
      {failed ? (
        <div className="alert alert-danger py-2" role="alert" data-note="importable-failed">
          {t('host.importPoolModal.errorListFailed', { message: failed })}
        </div>
      ) : null}
      {importable === null ? (
        <p className="text-muted mb-0">{t('host.importPoolModal.scanningLabel')}</p>
      ) : (
        <div className="row g-3">
          <div className="col-12 col-md-6">
            <label className="form-label" htmlFor="zpool-import-name">
              {t('host.importPoolModal.poolLabel')} <span className="text-danger">*</span>
            </label>
            {pools.length > 0 ? (
              <select
                id="zpool-import-name"
                className="form-select"
                value={poolName}
                onChange={event => setPoolName(event.target.value)}
                disabled={tools.busy}
              >
                <option value="">{t('host.importPoolModal.selectPoolPlaceholder')}</option>
                {pools.map(entry => (
                  <option key={entry.id || entry.name} value={entry.name}>
                    {entry.name}
                    {entry.state ? ` — ${entry.state}` : ''}
                    {entry.id ? ` · ${entry.id}` : ''}
                  </option>
                ))}
              </select>
            ) : (
              <input
                id="zpool-import-name"
                className="form-control"
                type="text"
                placeholder={t('host.importPoolModal.poolNamePlaceholder')}
                value={poolName}
                onChange={event => setPoolName(event.target.value)}
                disabled={tools.busy}
              />
            )}
            {importable.message ? <span className="form-text">{importable.message}</span> : null}
          </div>
          <div className="col-12 col-md-6">
            <label className="form-label" htmlFor="zpool-import-newname">
              {t('host.importPoolModal.renameLabel')}
            </label>
            <input
              id="zpool-import-newname"
              className="form-control"
              type="text"
              placeholder={t('host.importPoolModal.renamePlaceholder')}
              value={newName}
              onChange={event => setNewName(event.target.value)}
              disabled={tools.busy}
            />
          </div>
          {importable.output ? (
            <div className="col-12">
              <details>
                <summary className="small">{t('host.importPoolModal.rawOutputLabel')}</summary>
                <pre className="small border rounded p-2 mb-0">{importable.output}</pre>
              </details>
            </div>
          ) : null}
        </div>
      )}
      <ForceCheck
        id="zpool-import-force"
        labelKey="host.importPoolModal.forceLabelImport"
        checked={force}
        onChange={setForce}
        disabled={tools.busy}
      />
    </ToolFormDialog>
  );
};

ImportPoolModal.propTypes = {
  id: PropTypes.string.isRequired,
  tools: toolsShape.isRequired,
  onClose: PropTypes.func.isRequired,
};

const statusRows = groups =>
  groups.flatMap(group => {
    const bare = group.type === 'disk';
    const head = bare
      ? []
      : [
          {
            key: vdevKey(group),
            name: group.type,
            state: group.state,
            group: true,
            read: '',
            write: '',
            cksum: '',
            note: '',
          },
        ];
    return [
      ...head,
      ...(group.devices || []).map(device => ({
        key: `${vdevKey(group)}-${device.name}`,
        name: device.name,
        state: device.state,
        group: false,
        member: !bare,
        read: device.read,
        write: device.write,
        cksum: device.cksum,
        note: device.note || '',
      })),
    ];
  });

const STATUS_COLUMNS = [
  {
    key: 'device',
    kind: 'name',
    labelKey: 'host.poolStatusModal.deviceHeader',
    value: row => row.name,
    render: row => (
      <span className={row.member ? 'ps-4' : ''}>
        {row.group ? (
          <FaLayerGroup className="text-muted me-2" aria-hidden="true" />
        ) : (
          <FaHardDrive className="text-muted me-2" aria-hidden="true" />
        )}
        <code className="small">{row.name}</code>
      </span>
    ),
  },
  {
    key: 'state',
    kind: 'badge',
    labelKey: 'host.poolStatusModal.stateHeader',
    value: row => row.state || '',
    render: row => <span className={`badge ${healthBadgeClass(row.state)}`}>{row.state}</span>,
  },
  {
    key: 'read',
    kind: 'count',
    labelKey: 'host.poolStatusModal.readHeader',
    value: row => row.read,
  },
  {
    key: 'write',
    kind: 'count',
    labelKey: 'host.poolStatusModal.writeHeader',
    value: row => row.write,
  },
  {
    key: 'cksum',
    kind: 'count',
    labelKey: 'host.poolStatusModal.checksumHeader',
    value: row => row.cksum,
  },
  {
    key: 'note',
    kind: 'text',
    labelKey: 'host.poolStatusModal.noteHeader',
    priority: 6,
    value: row => row.note,
    render: row => <span className="text-muted small">{row.note}</span>,
  },
];

/**
 * The pool status dialog, hyperweaver-ui's, a list dialog: the health,
 * the scan in progress, the vdev tree as the one table, a group's row
 * over its members, and the raw `zpool status` text under a fold, read
 * once as the dialog opens.
 */
export const PoolStatusModal = ({ id, pool, health = '', onClose }) => {
  const { t, i18n } = useTranslation();
  const status = useStatus();
  const [data, setData] = useState(null);
  const [failed, setFailed] = useState('');
  const prefs = useTablePrefs('table_prefs_zfs_status', STATUS_COLUMNS);

  useEffect(() => {
    let live = true;
    getZfsPoolStatus(status, id, pool).then(
      answer => {
        if (live) {
          setData(answer || {});
        }
      },
      error => {
        if (live) {
          setFailed(error.message);
        }
      }
    );
    return () => {
      live = false;
    };
  }, [status, id, pool]);

  const scan = data?.parsed?.scan || null;
  const rows = useMemo(
    () => statusRows(Array.isArray(data?.parsed?.vdevs) ? data.parsed.vdevs : []),
    [data]
  );

  return (
    <Modal show onHide={onClose} dialogClassName="list-modal" scrollable>
      <Modal.Header closeButton>
        <Modal.Title as="h5">
          <FaHeartPulse className="me-2" aria-hidden="true" />
          {t('host.poolStatusModal.title', { pool })}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body data-dialog="zfs-pool-status">
        {failed ? (
          <div className="alert alert-danger py-2" role="alert">
            {failed}
          </div>
        ) : null}
        {!failed && data === null ? (
          <p className="text-muted mb-0">{t('host.poolStatusModal.loading')}</p>
        ) : null}
        {data ? (
          <>
            <div className="d-flex flex-wrap gap-2 align-items-center mb-2">
              {health ? (
                <span className={`badge ${healthBadgeClass(health)}`}>{health}</span>
              ) : null}
              {scan ? (
                <span className="small text-muted">
                  <FaBroom className="me-1" aria-hidden="true" />
                  {`${scan.action} — ${scan.pct}%`}
                </span>
              ) : null}
            </div>
            {rows.length > 0 ? (
              <SubTable
                columns={STATUS_COLUMNS}
                rows={rows}
                rowKey={row => row.key}
                sort={prefs.sort}
                onSort={prefs.setSort}
                hiddenColumns={prefs.hiddenColumns}
                widths={prefs.widths}
                onResize={prefs.setColumnWidth}
                ctx={{ t, language: i18n.language }}
                emptyText={t('host.zfsPoolsPanel.readingTopology')}
              />
            ) : null}
            <details>
              <summary className="small text-muted">
                {t('host.poolStatusModal.rawStatusLabel')}
              </summary>
              <pre className="small border rounded p-2 mt-1 mb-0">{data.status}</pre>
            </details>
          </>
        ) : null}
      </Modal.Body>
    </Modal>
  );
};

PoolStatusModal.propTypes = {
  id: PropTypes.string.isRequired,
  pool: PropTypes.string.isRequired,
  health: PropTypes.string,
  onClose: PropTypes.func.isRequired,
};

/**
 * The pool properties dialog, hyperweaver-ui's: every property read as
 * the dialog opens, the writable ones edited inline, the changed keys
 * alone sent as `PUT storage/pools/{pool}/properties`, a queued task.
 */
export const PoolPropertiesModal = ({ id, pool, tools, onClose }) => {
  const { t } = useTranslation();
  const status = useStatus();
  const [properties, setProperties] = useState(null);
  const [failed, setFailed] = useState('');
  const [edits, setEdits] = useState({});
  const [problem, setProblem] = useState('');

  useEffect(() => {
    let live = true;
    getZfsPool(status, id, pool).then(
      answer => {
        if (live) {
          setProperties(answer?.properties || {});
        }
      },
      error => {
        if (live) {
          setFailed(error.message);
        }
      }
    );
    return () => {
      live = false;
    };
  }, [status, id, pool]);

  const submit = async () => {
    const changed = propertyEdits(properties || {}, edits);
    if (Object.keys(changed).length === 0) {
      setProblem('host.poolPropertiesModal.errorNothingChanged');
      return;
    }
    setProblem('');
    const { error } = await tools.send({
      call: () => setZfsPoolProperties(status, id, pool, changed),
      doneKey: 'host.poolPropertiesModal.queuedMessage',
      values: { pool },
    });
    if (!error) {
      onClose();
    }
  };

  return (
    <ToolFormDialog
      dialog="zfs-pool-properties"
      title={t('host.poolPropertiesModal.title', { pool })}
      submitKey="host.poolPropertiesModal.submit"
      problemKey={problem}
      busy={tools.busy}
      onClose={onClose}
      onSubmit={submit}
    >
      {failed ? (
        <div className="alert alert-danger py-2" role="alert">
          {t('host.poolPropertiesModal.errorFetchFailed', { pool, status: '', message: failed })}
        </div>
      ) : null}
      <p className="form-text mt-0">{t('host.poolPropertiesModal.helpText', { dash: '-' })}</p>
      {properties === null && !failed ? (
        <p className="text-muted mb-0">{t('host.poolPropertiesModal.loadingLabel')}</p>
      ) : null}
      {properties !== null ? (
        <ZfsPropertiesEditor
          properties={properties}
          edits={edits}
          onEdit={(key, value) => setEdits(previous => ({ ...previous, [key]: value }))}
          disabled={tools.busy}
        />
      ) : null}
    </ToolFormDialog>
  );
};

PoolPropertiesModal.propTypes = {
  id: PropTypes.string.isRequired,
  pool: PropTypes.string.isRequired,
  tools: toolsShape.isRequired,
  onClose: PropTypes.func.isRequired,
};

/**
 * The add vdevs dialog, hyperweaver-ui's: the same builder the create
 * uses and the force flag, sent as `POST storage/pools/{pool}/vdevs`, a
 * queued task.
 */
export const AddVdevsModal = ({ id, pool, shelf, tools, onClose }) => {
  const { t } = useTranslation();
  const status = useStatus();
  const [rows, setRows] = useState([{ key: 'vdev-device-0', type: '', devices: [] }]);
  const [force, setForce] = useState(false);
  const [problem, setProblem] = useState('');

  const submit = async () => {
    const vdevs = buildVdevs(rows);
    if (vdevs.length === 0) {
      setProblem('host.addVdevsModal.errorNoDisks');
      return;
    }
    setProblem('');
    const { error } = await tools.send({
      call: () => addZfsPoolVdevs(status, id, pool, { vdevs, ...(force ? { force: true } : {}) }),
      doneKey: 'host.addVdevsModal.queuedMessage',
      values: { pool },
    });
    if (!error) {
      onClose();
    }
  };

  return (
    <ToolFormDialog
      dialog="zfs-add-vdevs"
      title={t('host.addVdevsModal.title', { pool })}
      submitKey="host.addVdevsModal.submit"
      problemKey={problem}
      busy={tools.busy}
      onClose={onClose}
      onSubmit={submit}
    >
      <VdevBuilder
        rows={rows}
        onChange={setRows}
        shelf={shelf.disks}
        shelfFailed={shelf.failed}
        rescanning={shelf.rescanning}
        onRescan={shelf.onRescan}
        disabled={tools.busy}
        idPrefix="device"
      />
      <ForceCheck
        id="zpool-addvdev-force"
        labelKey="host.addVdevsModal.forceLabelDevice"
        checked={force}
        onChange={setForce}
        disabled={tools.busy}
      />
    </ToolFormDialog>
  );
};

AddVdevsModal.propTypes = {
  id: PropTypes.string.isRequired,
  pool: PropTypes.string.isRequired,
  shelf: shelfShape.isRequired,
  tools: toolsShape.isRequired,
  onClose: PropTypes.func.isRequired,
};

/**
 * The destroy pool dialog, hyperweaver-ui's: the warning, the pool's
 * name typed to confirm and the force flag, sent as
 * `DELETE storage/pools/{pool}`, a queued task.
 */
export const DestroyPoolModal = ({ id, pool, tools, onClose }) => {
  const { t } = useTranslation();
  const status = useStatus();
  const [confirmName, setConfirmName] = useState('');
  const [force, setForce] = useState(false);

  const submit = async () => {
    const { error } = await tools.send({
      call: () => destroyZfsPool(status, id, pool, force),
      doneKey: 'host.destroyPoolModal.queuedMessage',
      values: { pool },
    });
    if (!error) {
      onClose();
    }
  };

  return (
    <ToolFormDialog
      dialog="zfs-destroy-pool"
      title={t('host.destroyPoolModal.title', { pool })}
      submitKey="host.destroyPoolModal.submit"
      variant="danger"
      disabled={confirmName !== pool}
      busy={tools.busy}
      onClose={onClose}
      onSubmit={submit}
    >
      <div className="alert alert-danger">{t('host.destroyPoolModal.warningText', { pool })}</div>
      <label className="form-label" htmlFor="zpool-destroy-confirm">
        {t('host.destroyPoolModal.confirmLabel')}
      </label>
      <input
        id="zpool-destroy-confirm"
        className="form-control font-monospace"
        type="text"
        value={confirmName}
        onChange={event => setConfirmName(event.target.value)}
        disabled={tools.busy}
      />
      <ForceCheck
        id="zpool-destroy-force"
        labelKey="host.destroyPoolModal.forceLabelDestroy"
        checked={force}
        onChange={setForce}
        disabled={tools.busy}
      />
    </ToolFormDialog>
  );
};

DestroyPoolModal.propTypes = {
  id: PropTypes.string.isRequired,
  pool: PropTypes.string.isRequired,
  tools: toolsShape.isRequired,
  onClose: PropTypes.func.isRequired,
};
