import PropTypes from 'prop-types';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Dropdown } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import {
  FaArrowUp,
  FaBroom,
  FaCircle,
  FaCircleCheck,
  FaCircleXmark,
  FaFileExport,
  FaFileImport,
  FaGear,
  FaHardDrive,
  FaHeartPulse,
  FaLayerGroup,
  FaLocationDot,
  FaMicrochip,
  FaPlus,
  FaRotate,
  FaSliders,
  FaStop,
  FaTrash,
  FaTriangleExclamation,
} from 'react-icons/fa6';

import RowMenu from '../../../components/common/RowMenu';
import SectionHeading from '../../../components/common/SectionHeading';
import { useStatus } from '../../../contexts/StatusContext';
import { useCssVar } from '../../../hooks/useCssVar';
import {
  exportZfsPool,
  forceMonitoringCollect,
  getZfsPoolStatus,
  getZfsPools,
  scrubZfsPool,
  stopZfsPoolScrub,
  upgradeZfsPool,
} from '../api/zfsAPI';
import {
  capacityVariant,
  flatVdevDevices,
  healthBadgeClass,
  healthTextClass,
  humanSize,
  percentOf,
  shortDevice,
  solidState,
  vdevKey,
} from '../utils/zfsUtils';

import ZfsDiskActionModal from './ZfsDiskActionModal';
import {
  AddVdevsModal,
  CreatePoolModal,
  DestroyPoolModal,
  ImportPoolModal,
  PoolPropertiesModal,
  PoolStatusModal,
} from './ZfsPoolModals';

const POOL_COLORS = ['primary', 'info', 'warning', 'danger', 'dark', 'secondary'];

const SIMPLE = {
  scrub: { call: scrubZfsPool, doneKey: 'hosts.storage.queued.scrub' },
  'scrub-stop': { call: stopZfsPoolScrub, doneKey: 'hosts.storage.queued.scrubStop' },
  upgrade: { call: upgradeZfsPool, doneKey: 'hosts.storage.queued.upgrade' },
  export: { call: exportZfsPool, doneKey: 'hosts.storage.queued.export' },
};

const MIN_SCAN_WIDTH = 8;

const PERCENT = 100;

const HealthGlyph = ({ health }) => {
  const word = (health || '').toUpperCase();
  if (word === 'ONLINE') {
    return <FaCircleCheck className="me-1" aria-hidden="true" />;
  }
  if (word === 'DEGRADED') {
    return <FaTriangleExclamation className="me-1" aria-hidden="true" />;
  }
  return <FaCircleXmark className="me-1" aria-hidden="true" />;
};

HealthGlyph.propTypes = {
  health: PropTypes.string,
};

/**
 * The capacity of a pool as a ring, hyperweaver-ui's donut: a circle
 * whose circumference is a hundred, so its dash reads as the percent,
 * the percent in the middle, the tone of its fullness on both.
 */
const CapacityRing = ({ percent, variant }) => {
  const { t } = useTranslation();
  const ring = useRef(null);
  useCssVar(ring, '--hw-ring-color', `var(--bs-${variant})`);
  useCssVar(ring, '--hw-ring-dash', `${percent} ${PERCENT - percent}`);
  return (
    <div
      ref={ring}
      className="hw-cap-ring"
      role="progressbar"
      aria-label={t('host.poolCard.capacityTitle')}
      aria-valuenow={percent}
      aria-valuemin={0}
      aria-valuemax={PERCENT}
      title={`${percent}%`}
    >
      <svg viewBox="0 0 42 42" aria-hidden="true">
        <circle className="hw-cap-ring-track" cx="21" cy="21" r="15.9155" />
        <circle className="hw-cap-ring-fill" cx="21" cy="21" r="15.9155" />
      </svg>
      <div className="hw-cap-ring-center">
        <span className="hw-cap-ring-pct">{percent}%</span>
        <span className="hw-cap-ring-sub">{t('host.poolCard.usedLabel')}</span>
      </div>
    </div>
  );
};

CapacityRing.propTypes = {
  percent: PropTypes.number.isRequired,
  variant: PropTypes.string.isRequired,
};

const located = disk =>
  disk.chassis !== null &&
  disk.chassis !== undefined &&
  disk.bay !== null &&
  disk.bay !== undefined;

const bayClassOf = (disk, clickable) => {
  if (disk.faulty) {
    return 'hw-bay hw-bay-faulty';
  }
  return clickable ? 'hw-bay' : 'hw-bay hw-bay-free';
};

const ledClassOf = (disk, color) => {
  if (disk.faulty) {
    return 'text-danger';
  }
  return color ? `text-${color}` : 'text-success';
};

const Bay = ({ disk, color, onClick = null }) => {
  const { t } = useTranslation();
  const bay = useRef(null);
  useCssVar(bay, '--hw-bay-accent', color ? `var(--bs-${color})` : null);
  const body = (
    <>
      <div className="d-flex align-items-center gap-2">
        <FaCircle className={`hw-drive-led ${ledClassOf(disk, color)}`} aria-hidden="true" />
        {solidState(disk.disk_type) ? (
          <FaMicrochip className="text-muted" aria-hidden="true" />
        ) : (
          <FaHardDrive className="text-muted" aria-hidden="true" />
        )}
        <strong className="small text-truncate" title={disk.device_name}>
          {shortDevice(disk.device_name)}
        </strong>
        {disk.faulty ? (
          <span className="badge text-bg-danger" title={t('host.zfsPoolsPanel.faultyTitle')}>
            {t('host.zfsPoolsPanel.faulty')}
          </span>
        ) : null}
        <span className={`badge ms-auto ${color ? `text-bg-${color}` : 'text-bg-success'}`}>
          {disk.pool_assignment || t('host.zfsPoolsPanel.free')}
        </span>
      </div>
      <div
        className="small text-muted text-truncate"
        title={`${disk.manufacturer || ''} ${disk.model || ''}`.trim()}
      >
        {disk.model || '—'}
      </div>
      {located(disk) ? (
        <div className="small text-muted" title={t('host.zfsPoolsPanel.physicalLocationTitle')}>
          <FaLocationDot className="me-1" aria-hidden="true" />
          {t('host.zfsPoolsPanel.chassisLocation', { chassis: disk.chassis, bay: disk.bay })}
        </div>
      ) : null}
      <div className="d-flex justify-content-between align-items-center gap-2 small">
        <span className="hw-bay-serial" title={t('host.diskChassis.serialNumberTitle')}>
          {disk.serial_number || '—'}
        </span>
        <span className="fw-semibold text-nowrap">
          {disk.capacity || humanSize(disk.capacity_bytes)}
        </span>
      </div>
      <div className="d-flex gap-1 mt-auto pt-1">
        {disk.disk_type ? <span className="badge text-bg-secondary">{disk.disk_type}</span> : null}
        {disk.interface_type ? (
          <span className="badge text-bg-light border">{disk.interface_type}</span>
        ) : null}
      </div>
    </>
  );
  if (onClick) {
    return (
      <button
        ref={bay}
        type="button"
        className={bayClassOf(disk, true)}
        data-bay={disk.device_name}
        title={t('host.diskChassis.diskDetailsTitle')}
        onClick={onClick}
      >
        {body}
      </button>
    );
  }
  return (
    <div ref={bay} className={bayClassOf(disk, false)} data-bay={disk.device_name}>
      {body}
    </div>
  );
};

Bay.propTypes = {
  disk: PropTypes.object.isRequired,
  color: PropTypes.string,
  onClick: PropTypes.func,
};

/**
 * The host's physical disks as chassis bays, hyperweaver-ui's, tinted
 * by the pool they belong to, a pool member's bay opening its disk's
 * detail and operations; Rescan asks the monitoring service for a
 * collection and reads the inventory again.
 */
const DiskChassis = ({ disks, poolColorOf, rescanning, onRescan, onDiskClick }) => {
  const { t } = useTranslation();
  const title = t('host.zfsPoolsPanel.physicalDisksTitle');
  const actions = (
    <button
      type="button"
      className="btn btn-sm btn-outline-secondary"
      data-action="rescan"
      title={t('host.zfsPoolsPanel.rescanTitle')}
      onClick={onRescan}
      disabled={rescanning}
    >
      <FaRotate className="me-2" aria-hidden="true" />
      {t('host.zfsPoolsPanel.rescan')}
    </button>
  );
  return (
    <div className="mt-4" data-panel="storage-chassis">
      <SectionHeading title={title} className="mb-2" actions={actions} />
      {disks.length === 0 ? (
        <div className="alert alert-warning py-2">{t('host.zfsPoolsPanel.noDiskAlert')}</div>
      ) : null}
      <div className="row g-2">
        {disks.map(disk => (
          <div
            className="col-6 col-md-4 col-lg-3 col-xxl-2"
            key={disk.device_name || disk.disk_index}
          >
            <Bay
              disk={disk}
              color={disk.pool_assignment ? poolColorOf(disk.pool_assignment) : null}
              onClick={disk.pool_assignment ? () => onDiskClick(disk) : null}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

DiskChassis.propTypes = {
  disks: PropTypes.array.isRequired,
  poolColorOf: PropTypes.func.isRequired,
  rescanning: PropTypes.bool.isRequired,
  onRescan: PropTypes.func.isRequired,
  onDiskClick: PropTypes.func.isRequired,
};

const ScanBar = ({ scan }) => {
  const { t } = useTranslation();
  const bar = useRef(null);
  useCssVar(bar, '--progress-width', `${Math.max(scan.pct, MIN_SCAN_WIDTH)}%`);
  return (
    <div
      className="progress hw-scan-bar mb-2"
      title={scan.action}
      role="progressbar"
      aria-label={t('host.zfsPoolsPanel.scanProgressLabel')}
      aria-valuenow={scan.pct}
      aria-valuemin={0}
      aria-valuemax={PERCENT}
    >
      <div
        ref={bar}
        className="progress-bar progress-bar-striped progress-bar-animated bg-info fw-semibold progress-fill"
      >
        {scan.pct}%
      </div>
    </div>
  );
};

ScanBar.propTypes = {
  scan: PropTypes.shape({ pct: PropTypes.number.isRequired, action: PropTypes.string }).isRequired,
};

const DriveChip = ({ device, onClick }) => (
  <button
    type="button"
    className="hw-drive"
    data-drive={device.name}
    title={`${device.name} — ${device.state} · read ${device.read} · write ${device.write} · cksum ${device.cksum}${device.note ? ` · ${device.note}` : ''}`}
    onClick={onClick}
  >
    <FaCircle className={`hw-drive-led ${healthTextClass(device.state)}`} aria-hidden="true" />
    <FaHardDrive className="hw-drive-glyph" aria-hidden="true" />
    <span className="hw-drive-name">{shortDevice(device.name)}</span>
    {device.note ? <FaTriangleExclamation className="text-warning" aria-hidden="true" /> : null}
  </button>
);

DriveChip.propTypes = {
  device: PropTypes.object.isRequired,
  onClick: PropTypes.func.isRequired,
};

/**
 * The pool's vdev layout as boxes of drive chips, hyperweaver-ui's: a
 * mirror is its drives in one box, a state dot colors each disk, an
 * active scrub or resilver sweeps a striped bar over them; a chip opens
 * the disk's detail and operations.
 */
const PoolTopology = ({ parsed, onDiskClick }) => {
  const { t } = useTranslation();
  if (!parsed) {
    return <p className="text-muted small mb-2">{t('host.zfsPoolsPanel.readingTopology')}</p>;
  }
  const groups = Array.isArray(parsed.vdevs) ? parsed.vdevs : [];
  if (groups.length === 0) {
    return null;
  }
  const scan = parsed.scan || null;
  return (
    <div className="mb-2" data-topology>
      {scan ? <ScanBar scan={scan} /> : null}
      <div className="d-flex flex-column gap-2">
        {groups.map(group => {
          const bare = group.type === 'disk';
          return (
            <div className="hw-vdev" key={vdevKey(group)}>
              <div className="hw-vdev-head">
                {bare ? (
                  <FaHardDrive className="text-muted" aria-hidden="true" />
                ) : (
                  <FaLayerGroup className="text-muted" aria-hidden="true" />
                )}
                <span>{bare ? t('host.zfsPoolsPanel.stripe') : group.type}</span>
                <span className={`badge ${healthBadgeClass(group.state)} ms-auto`}>
                  {group.state}
                </span>
              </div>
              <div className="hw-vdev-drives">
                {(group.devices || []).map(device => (
                  <DriveChip
                    key={device.name}
                    device={device}
                    onClick={() => onDiskClick(device)}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
      {scan ? (
        <div className="small text-muted text-truncate mt-1" title={scan.action}>
          <FaBroom className="me-1" aria-hidden="true" />
          {scan.action}
        </div>
      ) : null}
    </div>
  );
};

PoolTopology.propTypes = {
  parsed: PropTypes.object,
  onDiskClick: PropTypes.func.isRequired,
};

const Stat = ({ labelKey, value }) => {
  const { t } = useTranslation();
  return (
    <div className="hw-zpool-stat">
      <span className="hw-zpool-stat-k">{t(labelKey)}</span>
      <span className="hw-zpool-stat-v">{value}</span>
    </div>
  );
};

Stat.propTypes = {
  labelKey: PropTypes.string.isRequired,
  value: PropTypes.node.isRequired,
};

/**
 * One pool's card, hyperweaver-ui's: its name and health, the capacity
 * ring with the used, free, total and dedup figures, its topology, and
 * Status, Scrub, Properties and the gear menu with Stop scrub, Add
 * vdevs, Upgrade, Export and Destroy.
 */
const PoolCard = ({ pool, topology, accent, busy, onAction, onModal, onDiskClick }) => {
  const { t } = useTranslation();
  const card = useRef(null);
  useCssVar(card, '--hw-zpool-accent', `var(--bs-${accent})`);
  const percent = percentOf(pool);
  return (
    <div ref={card} className="card h-100 hw-zpool-card" data-pool={pool.name}>
      <div className="card-body d-flex flex-column">
        <div className="d-flex justify-content-between align-items-start flex-wrap gap-2 mb-2">
          <div>
            <span className="fs-5 fw-bold">{pool.name}</span>
            {pool.altroot ? (
              <code className="small ms-2" title={t('host.poolCard.alternateRootTitle')}>
                {pool.altroot}
              </code>
            ) : null}
          </div>
          <span className={`badge ${healthBadgeClass(pool.health)}`}>
            <HealthGlyph health={pool.health} />
            {pool.health || '?'}
          </span>
        </div>
        {percent !== null ? (
          <div className="d-flex align-items-center gap-3 mb-3">
            <CapacityRing percent={percent} variant={capacityVariant(percent)} />
            <div className="hw-zpool-stats flex-grow-1">
              <Stat labelKey="host.poolCard.usedLabel" value={humanSize(pool.alloc)} />
              <Stat labelKey="host.poolCard.freeLabel" value={humanSize(pool.free)} />
              <Stat labelKey="host.poolCard.totalLabel" value={humanSize(pool.size)} />
              <Stat labelKey="host.poolCard.dedupLabel" value={pool.dedup_ratio || '—'} />
            </div>
          </div>
        ) : (
          <div className="small text-muted mb-3">
            <Stat labelKey="host.poolCard.dedupLabel" value={pool.dedup_ratio || '—'} />
          </div>
        )}
        <PoolTopology parsed={topology} onDiskClick={device => onDiskClick(pool.name, device)} />
        <div className="d-flex flex-wrap gap-1 mt-auto">
          <button
            type="button"
            className="btn btn-sm btn-outline-info"
            data-action="pool-status"
            onClick={() => onModal({ kind: 'status', pool: pool.name, health: pool.health })}
            disabled={busy}
          >
            <FaHeartPulse className="me-1" aria-hidden="true" />
            {t('host.zfsPoolsPanel.status')}
          </button>
          <button
            type="button"
            className="btn btn-sm btn-outline-primary"
            data-action="pool-scrub"
            title={t('host.zfsPoolsPanel.scrubTitle')}
            onClick={() => onAction(pool.name, 'scrub')}
            disabled={busy}
          >
            <FaBroom className="me-1" aria-hidden="true" />
            {t('host.zfsPoolsPanel.scrub')}
          </button>
          <button
            type="button"
            className="btn btn-sm btn-outline-secondary"
            data-action="pool-properties"
            onClick={() => onModal({ kind: 'properties', pool: pool.name })}
            disabled={busy}
          >
            <FaSliders className="me-1" aria-hidden="true" />
            {t('host.zfsPoolsPanel.properties')}
          </button>
          <RowMenu label={<FaGear aria-label={t('host.zfsPoolsPanel.morePoolActionsTitle')} />}>
            <Dropdown.Item
              as="button"
              type="button"
              data-action="pool-scrub-stop"
              onClick={() => onAction(pool.name, 'scrub-stop')}
            >
              <FaStop className="text-warning me-2" aria-hidden="true" />
              {t('host.zfsPoolsPanel.stopScrub')}
            </Dropdown.Item>
            <Dropdown.Divider />
            <Dropdown.Item
              as="button"
              type="button"
              data-action="pool-add-vdevs"
              title={t('host.zfsPoolsPanel.addVdevsTitle')}
              onClick={() => onModal({ kind: 'device', pool: pool.name })}
            >
              <FaPlus className="me-2" aria-hidden="true" />
              {t('host.zfsPoolsPanel.addVdevs')}
            </Dropdown.Item>
            <Dropdown.Divider />
            <Dropdown.Item
              as="button"
              type="button"
              data-action="pool-upgrade"
              title={t('host.zfsPoolsPanel.upgradeTitle')}
              onClick={() => onAction(pool.name, 'upgrade')}
            >
              <FaArrowUp className="me-2" aria-hidden="true" />
              {t('host.zfsPoolsPanel.upgrade')}
            </Dropdown.Item>
            <Dropdown.Item
              as="button"
              type="button"
              data-action="pool-export"
              title={t('host.zfsPoolsPanel.exportTitle')}
              onClick={() => onAction(pool.name, 'export')}
            >
              <FaFileExport className="me-2" aria-hidden="true" />
              {t('host.zfsPoolsPanel.export')}
            </Dropdown.Item>
            <Dropdown.Divider />
            <Dropdown.Item
              as="button"
              type="button"
              data-action="pool-destroy"
              onClick={() => onModal({ kind: 'destroy', pool: pool.name })}
            >
              <FaTrash className="text-danger me-2" aria-hidden="true" />
              {t('host.zfsPoolsPanel.destroy')}
            </Dropdown.Item>
          </RowMenu>
        </div>
      </div>
    </div>
  );
};

PoolCard.propTypes = {
  pool: PropTypes.object.isRequired,
  topology: PropTypes.object,
  accent: PropTypes.string.isRequired,
  busy: PropTypes.bool.isRequired,
  onAction: PropTypes.func.isRequired,
  onModal: PropTypes.func.isRequired,
  onDiskClick: PropTypes.func.isRequired,
};

const NO_STATUS = { name: '', state: '', read: '—', write: '—', cksum: '—', note: '' };

const matchesDisk = (entry, disk) =>
  entry.name === disk.device_name || entry.name.startsWith(disk.device_name);

const PoolDialogs = ({ id, modal, shelf, disks, tools, onClose }) => {
  if (!modal) {
    return null;
  }
  if (modal.kind === 'create') {
    return <CreatePoolModal id={id} shelf={shelf} tools={tools} onClose={onClose} />;
  }
  if (modal.kind === 'import') {
    return <ImportPoolModal id={id} tools={tools} onClose={onClose} />;
  }
  if (modal.kind === 'status') {
    return <PoolStatusModal id={id} pool={modal.pool} health={modal.health} onClose={onClose} />;
  }
  if (modal.kind === 'properties') {
    return <PoolPropertiesModal id={id} pool={modal.pool} tools={tools} onClose={onClose} />;
  }
  if (modal.kind === 'device') {
    return (
      <AddVdevsModal id={id} pool={modal.pool} shelf={shelf} tools={tools} onClose={onClose} />
    );
  }
  if (modal.kind === 'destroy') {
    return <DestroyPoolModal id={id} pool={modal.pool} tools={tools} onClose={onClose} />;
  }
  const inventoryDisk = disks.find(disk => matchesDisk(modal.device, disk)) || null;
  return (
    <ZfsDiskActionModal
      id={id}
      pool={modal.pool}
      device={modal.device}
      inventoryDisk={inventoryDisk}
      freeDisks={shelf.disks}
      rescanning={shelf.rescanning}
      onRescan={shelf.onRescan}
      tools={tools}
      onClose={onClose}
    />
  );
};

PoolDialogs.propTypes = {
  id: PropTypes.string.isRequired,
  modal: PropTypes.object,
  shelf: PropTypes.object.isRequired,
  disks: PropTypes.array.isRequired,
  tools: PropTypes.object.isRequired,
  onClose: PropTypes.func.isRequired,
};

/**
 * The ZFS pool manager, hyperweaver-ui's pools panel: one card a pool
 * with its health, its capacity ring, its scrub, its device, property
 * and lifecycle surface behind it, and the host's disks as chassis bays
 * under them, behind `monitoring`. The pools and each pool's status are
 * read once as the panel opens and again when `turn` moves, the page's
 * Refresh and the end of a task this page queued; the disks are the copy
 * the hosts feature's context holds, read again by Rescan after the
 * monitoring service collected. Every write is one request through
 * `tools`, a queued task, one notice.
 */
const ZfsPoolsPanel = ({ id, turn, disks, tools }) => {
  const { t } = useTranslation();
  const status = useStatus();
  const [pools, setPools] = useState([]);
  const [statuses, setStatuses] = useState({});
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState('');
  const [rescanning, setRescanning] = useState(false);
  const [modal, setModal] = useState(null);

  const load = useCallback(
    () =>
      getZfsPools(status, id)
        .then(answer => {
          const list = Array.isArray(answer?.pools) ? answer.pools : [];
          setPools(list);
          setFailed('');
          list.forEach(pool => {
            getZfsPoolStatus(status, id, pool.name).then(
              detail =>
                setStatuses(previous => ({ ...previous, [pool.name]: detail?.parsed || null })),
              () => setStatuses(previous => ({ ...previous, [pool.name]: null }))
            );
          });
        })
        .catch(error => setFailed(error.message))
        .finally(() => setLoaded(true)),
    [status, id]
  );

  useEffect(() => {
    load();
  }, [load, turn]);

  const rescan = async () => {
    setRescanning(true);
    try {
      await forceMonitoringCollect(status, id);
    } catch (error) {
      setFailed(error.message);
    }
    disks.refresh();
    setRescanning(false);
  };

  const poolColorOf = poolName => {
    const index = pools.findIndex(pool => pool.name === poolName);
    return POOL_COLORS[(index < 0 ? 0 : index) % POOL_COLORS.length];
  };

  const runSimple = (pool, action) =>
    tools.send({
      call: () => SIMPLE[action].call(status, id, pool),
      doneKey: SIMPLE[action].doneKey,
      values: { pool },
    });

  const shelf = {
    disks: disks.rows.filter(disk => disk.is_available),
    failed: disks.failed,
    rescanning,
    onRescan: rescan,
  };

  const openDisk = disk => {
    const row = flatVdevDevices(statuses[disk.pool_assignment]).find(entry =>
      matchesDisk(entry, disk)
    );
    setModal({
      kind: 'disk',
      pool: disk.pool_assignment,
      device: row || { ...NO_STATUS, name: disk.device_name },
    });
  };

  const title = t('host.zfsPoolsPanel.poolsHeading');
  const actions = (
    <>
      <button
        type="button"
        className="btn btn-sm btn-outline-primary"
        data-action="pool-import"
        onClick={() => setModal({ kind: 'import' })}
        disabled={tools.busy}
      >
        <FaFileImport className="me-2" aria-hidden="true" />
        {t('host.zfsPoolsPanel.import')}
      </button>
      <button
        type="button"
        className="btn btn-sm btn-primary"
        data-action="pool-create"
        onClick={() => setModal({ kind: 'create' })}
        disabled={tools.busy}
      >
        <FaPlus className="me-2" aria-hidden="true" />
        {t('host.zfsPoolsPanel.createPool')}
      </button>
    </>
  );

  return (
    <div data-panel="storage-zfs-pools" data-count={pools.length}>
      <SectionHeading title={title} count={pools.length} actions={actions} />
      {failed ? (
        <div className="alert alert-danger py-2" role="alert" data-note="pools-failed">
          {failed}
        </div>
      ) : null}
      {!loaded ? <p className="text-muted">{t('pages.loading')}</p> : null}
      {loaded && !failed && pools.length === 0 ? (
        <p className="text-muted mb-0">{t('host.zfsPoolsPanel.noPools')}</p>
      ) : null}
      <div className="row g-3">
        {pools.map(pool => (
          <div className="col-12 col-xl-6" key={pool.name}>
            <PoolCard
              pool={pool}
              topology={statuses[pool.name] || null}
              accent={poolColorOf(pool.name)}
              busy={tools.busy}
              onAction={runSimple}
              onModal={setModal}
              onDiskClick={(poolName, device) => setModal({ kind: 'disk', pool: poolName, device })}
            />
          </div>
        ))}
      </div>
      {disks.offered ? (
        <DiskChassis
          disks={disks.rows}
          poolColorOf={poolColorOf}
          rescanning={rescanning}
          onRescan={rescan}
          onDiskClick={openDisk}
        />
      ) : null}
      <PoolDialogs
        id={id}
        modal={modal}
        shelf={shelf}
        disks={disks.rows}
        tools={tools}
        onClose={() => setModal(null)}
      />
    </div>
  );
};

ZfsPoolsPanel.propTypes = {
  id: PropTypes.string.isRequired,
  turn: PropTypes.number.isRequired,
  disks: PropTypes.shape({
    rows: PropTypes.array.isRequired,
    failed: PropTypes.bool.isRequired,
    offered: PropTypes.bool.isRequired,
    refresh: PropTypes.func.isRequired,
  }).isRequired,
  tools: PropTypes.shape({
    send: PropTypes.func.isRequired,
    busy: PropTypes.bool.isRequired,
  }).isRequired,
};

export default ZfsPoolsPanel;
