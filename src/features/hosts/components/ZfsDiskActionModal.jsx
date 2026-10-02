import PropTypes from 'prop-types';
import { useState } from 'react';
import { Modal } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import {
  FaCircleCheck,
  FaCircleMinus,
  FaHardDrive,
  FaMicrochip,
  FaMinus,
  FaRightLeft,
  FaRotate,
} from 'react-icons/fa6';

import { useStatus } from '../../../contexts/StatusContext';
import {
  offlineZfsPoolDevice,
  onlineZfsPoolDevice,
  removeZfsPoolVdev,
  replaceZfsPoolDevice,
} from '../api/zfsAPI';
import { healthBadgeClass, humanSize, shortDevice, solidState } from '../utils/zfsUtils';

const MODES = [
  { key: 'replace', tone: 'primary', icon: FaRightLeft, labelKey: 'host.diskActionModal.replace' },
  { key: 'online', tone: 'success', icon: FaCircleCheck, labelKey: 'host.diskActionModal.online' },
  {
    key: 'offline',
    tone: 'warning',
    icon: FaCircleMinus,
    labelKey: 'host.diskActionModal.offline',
  },
  { key: 'remove', tone: 'danger', icon: FaMinus, labelKey: 'host.diskActionModal.remove' },
];

const FLAG_LABELS = {
  replace: 'host.diskActionModal.forceReplace',
  online: 'host.diskActionModal.expandDevice',
  offline: 'host.diskActionModal.temporaryOffline',
};

const CONFIRM_LABELS = {
  replace: 'host.diskActionModal.confirmReplace',
  online: 'host.diskActionModal.confirmOnline',
  offline: 'host.diskActionModal.confirmOffline',
  remove: 'host.diskActionModal.confirmRemove',
};

const DISK_GROUPS = ['HDD', 'SSD', 'NVMe'];

const DiskGlyph = ({ type, className = '' }) =>
  solidState(type) ? (
    <FaMicrochip className={className} aria-hidden="true" />
  ) : (
    <FaHardDrive className={className} aria-hidden="true" />
  );

DiskGlyph.propTypes = {
  type: PropTypes.string,
  className: PropTypes.string,
};

const groupsOf = disks => {
  const grouped = DISK_GROUPS.map(type => ({
    type,
    disks: disks.filter(disk => (disk.disk_type || 'HDD') === type),
  })).filter(group => group.disks.length > 0);
  const other = disks.filter(disk => !DISK_GROUPS.includes(disk.disk_type || 'HDD'));
  return other.length > 0 ? [...grouped, { type: 'Other', disks: other }] : grouped;
};

/**
 * The free disks as clickable cards grouped by their type, the picker of
 * a replacement: each its glyph, its short name, its faulty badge, its
 * model, its serial and its capacity, the picked one marked.
 */
const FreeDiskPicker = ({ disks, selected, onSelect, disabled }) => {
  const { t } = useTranslation();
  return (
    <>
      {groupsOf(disks).map(group => (
        <div key={group.type} className="mb-2">
          <div className="small fw-semibold text-muted mb-1">{group.type}</div>
          <div className="row g-2">
            {group.disks.map(disk => {
              const picked = selected === disk.device_name;
              return (
                <div className="col-6 col-md-4" key={disk.device_name}>
                  <button
                    type="button"
                    className={`border rounded p-2 w-100 text-start bg-transparent zfs-pick${picked ? ' zfs-pick-on' : ''}`}
                    data-disk={disk.device_name}
                    onClick={() => onSelect(disk.device_name)}
                    disabled={disabled}
                  >
                    <div className="d-flex align-items-center gap-2">
                      <DiskGlyph type={disk.disk_type} className="text-muted" />
                      <strong className="small" title={disk.device_name}>
                        {shortDevice(disk.device_name)}
                      </strong>
                      {disk.faulty ? (
                        <span
                          className="badge text-bg-danger"
                          title={t('host.freeDiskPicker.faultyTitle')}
                        >
                          {t('host.freeDiskPicker.faultyBadge')}
                        </span>
                      ) : null}
                      {picked ? (
                        <FaCircleCheck className="text-primary ms-auto" aria-hidden="true" />
                      ) : null}
                    </div>
                    <div className="small text-muted text-truncate" title={disk.model || ''}>
                      {disk.model || '—'}
                    </div>
                    <div className="d-flex justify-content-between small">
                      <code className="small text-truncate" title={disk.serial_number || ''}>
                        {disk.serial_number || '—'}
                      </code>
                      <span className="text-nowrap ms-1">
                        {disk.capacity || humanSize(disk.capacity_bytes)}
                      </span>
                    </div>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </>
  );
};

FreeDiskPicker.propTypes = {
  disks: PropTypes.array.isRequired,
  selected: PropTypes.string.isRequired,
  onSelect: PropTypes.func.isRequired,
  disabled: PropTypes.bool.isRequired,
};

const InfoLine = ({ label, children }) => (
  <div className="d-flex gap-2 small">
    <span className="text-muted zfs-info-label">{label}</span>
    <span className="text-break">{children}</span>
  </div>
);

InfoLine.propTypes = {
  label: PropTypes.string.isRequired,
  children: PropTypes.node,
};

const located = disk =>
  disk.chassis !== null &&
  disk.chassis !== undefined &&
  disk.bay !== null &&
  disk.bay !== undefined;

const typeLine = disk =>
  [disk.disk_type, disk.interface_type, disk.firmware, disk.removable ? 'removable' : null]
    .filter(Boolean)
    .join(' · ') || '—';

/**
 * The disk's identity: the facts of the status layer, its state and its
 * errors, and the facts of the inventory row that matches it, the model,
 * the serial, the capacity, the type, the location and the path.
 */
const DiskInfoCard = ({ device, inventoryDisk }) => {
  const { t } = useTranslation();
  return (
    <div className="border rounded p-2 mb-3" data-disk-info={device.name}>
      <div className="d-flex align-items-center gap-2 mb-2 flex-wrap">
        <DiskGlyph type={inventoryDisk?.disk_type} className="fs-5 text-muted" />
        <code>{device.name}</code>
        <span className={`badge ${healthBadgeClass(device.state)}`}>{device.state}</span>
        {device.note ? <span className="badge text-bg-warning">{device.note}</span> : null}
        {inventoryDisk?.faulty ? (
          <span className="badge text-bg-danger" title={t('host.diskActionModal.faultyTitle')}>
            {t('host.diskActionModal.faultyBadge')}
          </span>
        ) : null}
      </div>
      <InfoLine label={t('host.diskActionModal.errorsLabel')}>
        {t('host.diskActionModal.readWriteCksum', {
          read: device.read,
          write: device.write,
          cksum: device.cksum,
        })}
      </InfoLine>
      {inventoryDisk ? (
        <>
          <InfoLine label={t('host.diskActionModal.modelLabel')}>
            {`${inventoryDisk.manufacturer || ''} ${inventoryDisk.model || ''}`.trim() || '—'}
          </InfoLine>
          <InfoLine label={t('host.diskActionModal.serialLabel')}>
            <code className="small">{inventoryDisk.serial_number || '—'}</code>
          </InfoLine>
          <InfoLine label={t('host.diskActionModal.capacityLabel')}>
            {inventoryDisk.capacity || humanSize(inventoryDisk.capacity_bytes)}
          </InfoLine>
          <InfoLine label={t('host.diskActionModal.typeLabel')}>{typeLine(inventoryDisk)}</InfoLine>
          {located(inventoryDisk) ? (
            <InfoLine label={t('host.diskActionModal.locationLabel')}>
              {t('host.diskActionModal.locationValue', {
                chassis: inventoryDisk.chassis,
                bay: inventoryDisk.bay,
              })}
            </InfoLine>
          ) : null}
          {inventoryDisk.device_path ? (
            <InfoLine label={t('host.diskActionModal.pathLabel')}>
              <code className="small">{inventoryDisk.device_path}</code>
            </InfoLine>
          ) : null}
        </>
      ) : (
        <p className="form-text text-muted mb-0 mt-1">
          {t('host.diskActionModal.noInventoryText')}
        </p>
      )}
    </div>
  );
};

DiskInfoCard.propTypes = {
  device: PropTypes.object.isRequired,
  inventoryDisk: PropTypes.object,
};

const requestOf = ({ mode, status, id, pool, device, target, flag }) => {
  if (mode === 'replace') {
    return () =>
      replaceZfsPoolDevice(status, id, pool, {
        old_device: device.name,
        new_device: target,
        ...(flag ? { force: true } : {}),
      });
  }
  if (mode === 'online') {
    return () =>
      onlineZfsPoolDevice(status, id, pool, {
        device: device.name,
        ...(flag ? { expand: true } : {}),
      });
  }
  if (mode === 'offline') {
    return () =>
      offlineZfsPoolDevice(status, id, pool, {
        device: device.name,
        ...(flag ? { temporary: true } : {}),
      });
  }
  return () => removeZfsPoolVdev(status, id, pool, device.name);
};

const ReplacementPicker = ({
  freeDisks,
  replacement,
  manual,
  busy,
  rescanning,
  onPick,
  onType,
  onRescan,
}) => {
  const { t } = useTranslation();
  return (
    <div className="mb-3">
      <span className="form-label d-block">
        {t('host.diskActionModal.pickReplacementLabel')}
        <span className="text-danger ms-1">*</span>
      </span>
      {freeDisks.length > 0 ? (
        <FreeDiskPicker
          disks={freeDisks}
          selected={replacement}
          onSelect={onPick}
          disabled={busy}
        />
      ) : (
        <>
          <div className="alert alert-warning py-2 d-flex align-items-center gap-2 flex-wrap">
            <span>{t('host.diskActionModal.noDiskInventoryAlert')}</span>
            <button
              type="button"
              className="btn btn-sm btn-warning"
              onClick={onRescan}
              disabled={rescanning || busy}
            >
              <FaRotate className="me-2" aria-hidden="true" />
              {t('host.zfsPoolsPanel.rescan')}
            </button>
          </div>
          <label className="form-label small" htmlFor="disk-action-manual-replacement">
            {t('host.diskActionModal.lastResortLabel')}
          </label>
          <input
            id="disk-action-manual-replacement"
            className="form-control font-monospace"
            type="text"
            placeholder={t('host.diskActionModal.replacementPlaceholder')}
            value={manual}
            onChange={event => onType(event.target.value)}
            disabled={busy}
          />
        </>
      )}
    </div>
  );
};

ReplacementPicker.propTypes = {
  freeDisks: PropTypes.array.isRequired,
  replacement: PropTypes.string.isRequired,
  manual: PropTypes.string.isRequired,
  busy: PropTypes.bool.isRequired,
  rescanning: PropTypes.bool.isRequired,
  onPick: PropTypes.func.isRequired,
  onType: PropTypes.func.isRequired,
  onRescan: PropTypes.func.isRequired,
};

/**
 * One disk of a pool's topology and its operations, hyperweaver-ui's
 * disk action dialog, a list dialog: the disk's identity, then Replace,
 * Online, Offline and Remove, each opening its own flag, the replace its
 * picker of a free disk from the inventory, typed only while the
 * inventory answers none, and the button that sends the one request,
 * a queued task, through `tools`, one notice, the dialog closing on a
 * success.
 */
const ZfsDiskActionModal = ({
  id,
  pool,
  device,
  inventoryDisk = null,
  freeDisks,
  rescanning,
  onRescan,
  tools,
  onClose,
}) => {
  const { t } = useTranslation();
  const status = useStatus();
  const [mode, setMode] = useState('');
  const [replacement, setReplacement] = useState('');
  const [manual, setManual] = useState('');
  const [flag, setFlag] = useState(false);
  const [problem, setProblem] = useState('');

  const run = async () => {
    const target = replacement || manual.trim();
    if (mode === 'replace' && !target) {
      setProblem('host.diskActionModal.errorPickReplacement');
      return;
    }
    setProblem('');
    const { error } = await tools.send({
      call: requestOf({ mode, status, id, pool, device, target, flag }),
      doneKey: 'host.diskActionModal.queuedMessage',
      values: { mode, device: device.name, pool },
    });
    if (!error) {
      onClose();
    }
  };

  return (
    <Modal show onHide={onClose} dialogClassName="list-modal" scrollable>
      <Modal.Header closeButton>
        <Modal.Title as="h5">
          <FaHardDrive className="me-2" aria-hidden="true" />
          {t('host.diskActionModal.title', { pool })}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body data-dialog="zfs-disk-action">
        <DiskInfoCard device={device} inventoryDisk={inventoryDisk} />
        {problem ? (
          <div className="alert alert-danger py-2" role="alert" data-note="problem">
            {t(problem)}
          </div>
        ) : null}
        <div className="d-flex flex-wrap gap-1 mb-3">
          {MODES.map(({ key, tone, icon: Icon, labelKey }) => (
            <button
              key={key}
              type="button"
              className={`btn btn-sm ${mode === key ? `btn-${tone}` : `btn-outline-${tone}`}`}
              data-mode={key}
              aria-pressed={mode === key}
              onClick={() => setMode(mode === key ? '' : key)}
              disabled={tools.busy}
            >
              <Icon className="me-1" aria-hidden="true" />
              {t(labelKey)}
            </button>
          ))}
        </div>
        {mode === 'replace' ? (
          <ReplacementPicker
            freeDisks={freeDisks}
            replacement={replacement}
            manual={manual}
            busy={tools.busy}
            rescanning={rescanning}
            onPick={name => setReplacement(name === replacement ? '' : name)}
            onType={setManual}
            onRescan={onRescan}
          />
        ) : null}
        {mode === 'offline' ? (
          <div className="alert alert-warning py-2">{t('host.diskActionModal.offlineWarning')}</div>
        ) : null}
        {mode === 'remove' ? (
          <div className="alert alert-danger py-2">{t('host.diskActionModal.removeWarning')}</div>
        ) : null}
        {mode && FLAG_LABELS[mode] ? (
          <div className="form-check mb-3">
            <input
              id="disk-action-flag"
              className="form-check-input"
              type="checkbox"
              checked={flag}
              onChange={event => setFlag(event.target.checked)}
              disabled={tools.busy}
            />
            <label className="form-check-label" htmlFor="disk-action-flag">
              {t(FLAG_LABELS[mode])}
            </label>
          </div>
        ) : null}
        {mode ? (
          <button
            type="button"
            className={`btn ${mode === 'remove' ? 'btn-danger' : 'btn-primary'}`}
            data-action="disk-confirm"
            onClick={run}
            disabled={tools.busy}
          >
            {t(CONFIRM_LABELS[mode])}
          </button>
        ) : null}
      </Modal.Body>
    </Modal>
  );
};

ZfsDiskActionModal.propTypes = {
  id: PropTypes.string.isRequired,
  pool: PropTypes.string.isRequired,
  device: PropTypes.object.isRequired,
  inventoryDisk: PropTypes.object,
  freeDisks: PropTypes.array.isRequired,
  rescanning: PropTypes.bool.isRequired,
  onRescan: PropTypes.func.isRequired,
  tools: PropTypes.shape({ send: PropTypes.func.isRequired, busy: PropTypes.bool.isRequired })
    .isRequired,
  onClose: PropTypes.func.isRequired,
};

export default ZfsDiskActionModal;
