import PropTypes from 'prop-types';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Modal } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { FaHardDrive } from 'react-icons/fa6';

import { useNotify } from '../../../contexts/NoticeContext';
import { useCssVar } from '../../../hooks/useCssVar';
import { modifyMachine } from '../api/machines';
import { createZfsSnapshot, getZfsDataset, setZfsDatasetProperties } from '../api/zfsAPI';
import { humanSize, parseZfsSize, queuedMessage } from '../utils/zfsUtils';

import ZfsPropertiesEditor, { propertyEdits } from './ZfsPropertiesEditor';

const GiB = 2 ** 30;
const MiB = 2 ** 20;

const UNREAD = { properties: null, failed: false };

const propValue = (properties, key) => properties?.[key]?.value ?? '';

/**
 * Bytes as the size box's text, whole or tenth gigabytes, falling to
 * megabytes under one.
 *
 * @param {number} bytes - The size
 * @returns {string} The text
 */
export const bytesToInput = bytes => {
  if (!bytes || bytes <= 0) {
    return '0';
  }
  const g = bytes / GiB;
  if (g >= 1) {
    return `${Number.isInteger(g) ? g : g.toFixed(1)}G`;
  }
  return `${Math.max(1, Math.round(bytes / MiB))}M`;
};

const clampPct = value => Math.min(100, Math.max(0, value));

/**
 * The geometry of the capacity bar from the disk, its dataset properties,
 * the pools and the target: the current, used and target sizes, the pool's
 * ceiling (null while its free space is unknown) and each as a percent
 * of the slider.
 *
 * @param {Object} disk - The zone disk row
 * @param {Object|null} properties - The dataset's properties
 * @param {Array<Object>} pools - The host's pools
 * @param {string} target - The typed size
 * @param {boolean} overprovision - Whether a thin size past the pool is allowed
 * @returns {Object} The geometry
 */
export const computeBar = (disk, properties, pools, target, overprovision) => {
  const currentBytes =
    parseZfsSize(disk.size) ?? parseZfsSize(propValue(properties, 'volsize')) ?? 0;
  const usedBytes = parseZfsSize(propValue(properties, 'used'));
  const blockSize = propValue(properties, 'volblocksize');
  const refreservation = propValue(properties, 'refreservation');
  const sparse = refreservation === '0' || refreservation === '';
  const [poolName] = (disk.value || '').split('/');
  const poolRow = pools.find(pool => pool.name === poolName);
  const poolFreeBytes = parseZfsSize(poolRow?.free) ?? 0;
  const poolKnown = Boolean(poolRow) && poolFreeBytes > 0;
  const capBytes = poolKnown ? currentBytes + poolFreeBytes : null;
  const targetBytes = target.trim() ? (parseZfsSize(target) ?? currentBytes) : currentBytes;
  const delta = targetBytes - currentBytes;
  const pastCap = capBytes !== null && targetBytes > capBytes + MiB;
  const openMax = Math.max(targetBytes, currentBytes * 2);
  const sliderMax = Math.max(
    overprovision || capBytes === null ? openMax : capBytes,
    currentBytes,
    GiB
  );
  const pct = value => clampPct((value / sliderMax) * 100);
  return {
    currentBytes,
    usedBytes,
    blockSize,
    refreservation,
    sparse,
    poolName,
    poolFreeBytes,
    capBytes,
    targetBytes,
    delta,
    pastCap,
    sliderMax,
    step: Math.max(MiB, parseZfsSize(blockSize) ?? MiB),
    pctUsed: pct(usedBytes ?? 0),
    pctCurrent: pct(currentBytes),
    pctCap: capBytes === null ? null : pct(capBytes),
    pctTarget: pct(targetBytes),
  };
};

/**
 * The line a resize's answer reads as, one sentence a resized disk saying
 * whether the guest sees it live or after a power cycle.
 *
 * @param {Object} answer - The agent's answer
 * @param {Function} t - The translator
 * @returns {string} The line
 */
export const resizeOutcome = (answer, t) => {
  const rows = Array.isArray(answer?.resized_disks) ? answer.resized_disks : [];
  if (rows.length === 0) {
    return answer?.message || t('machine.zvolManageModal.resizeAppliedFallback');
  }
  return rows
    .map(row => {
      const base = `${row.name} → ${row.resized_to}${
        row.shrunk ? ` ${t('machine.zvolManageModal.shrunkSuffix')}` : ''
      }`;
      return row.requires_restart
        ? `${base} ${t('machine.zvolManageModal.restartNote', { diskif: row.diskif })}`
        : `${base} ${t('machine.zvolManageModal.liveNote', { diskif: row.diskif })}`;
    })
    .join(' ');
};

const summaryLine = (bar, disk, t) =>
  [
    `${humanSize(bar.currentBytes) || disk.size || '—'} ${t('machine.zvolManageModal.allocatedSuffix')}`,
    bar.usedBytes !== null
      ? `${humanSize(bar.usedBytes)} ${t('machine.zvolManageModal.usedSuffix')}`
      : null,
    bar.blockSize
      ? `${humanSize(bar.blockSize)} ${t('machine.zvolManageModal.blockSuffix')}`
      : null,
    bar.sparse
      ? t('machine.zvolManageModal.sparseLabel')
      : `${humanSize(bar.refreservation)} ${t('machine.zvolManageModal.reservedSuffix')}`,
  ]
    .filter(Boolean)
    .join(' · ');

const Segment = ({ kind, left, width, title = undefined }) => {
  const element = useRef(null);
  useCssVar(element, '--zvol-left', `${left}%`);
  useCssVar(element, '--zvol-width', `${width}%`);
  return <div ref={element} className={`zvol-seg zvol-${kind}`} title={title} />;
};

Segment.propTypes = {
  kind: PropTypes.string.isRequired,
  left: PropTypes.number.isRequired,
  width: PropTypes.number.isRequired,
  title: PropTypes.string,
};

const Mark = ({ kind, left, title = undefined }) => {
  const element = useRef(null);
  useCssVar(element, '--zvol-left', `${left}%`);
  return <div ref={element} className={`zvol-mark zvol-mark-${kind}`} title={title} />;
};

Mark.propTypes = {
  kind: PropTypes.string.isRequired,
  left: PropTypes.number.isRequired,
  title: PropTypes.string,
};

const CapacityBar = ({ bar, overprovision, busy, shrinking, onValue }) => {
  const { t } = useTranslation();
  return (
    <>
      <div className="d-flex justify-content-between align-items-baseline">
        <label className="fw-bold mb-0" htmlFor="zvol-size-range">
          {t('machine.zvolManageModal.sizeLabel')}
        </label>
        <span className="small text-muted">
          {humanSize(bar.currentBytes)}
          {bar.delta !== 0 ? (
            <>
              {' → '}
              <span className={`fw-bold ${shrinking ? 'text-warning' : 'text-primary'}`}>
                {humanSize(bar.targetBytes)}
              </span>{' '}
              ({bar.delta > 0 ? '+' : '−'}
              {humanSize(Math.abs(bar.delta))})
            </>
          ) : null}
        </span>
      </div>
      <div className="zvol">
        <div className="zvol-track">
          {bar.usedBytes !== null ? (
            <Segment
              kind="used"
              left={0}
              width={bar.pctUsed}
              title={t('machine.zvolManageModal.inUseTooltip', { size: humanSize(bar.usedBytes) })}
            />
          ) : null}
          <Segment kind="alloc" left={bar.pctUsed} width={clampPct(bar.pctCurrent - bar.pctUsed)} />
          {bar.pctCap !== null ? (
            <Segment
              kind="free"
              left={bar.pctCurrent}
              width={clampPct(bar.pctCap - bar.pctCurrent)}
              title={t('machine.zvolManageModal.freeOnPoolTooltip', {
                size: humanSize(bar.poolFreeBytes),
                poolName: bar.poolName,
              })}
            />
          ) : null}
          {overprovision && bar.pctCap !== null ? (
            <Segment
              kind="over"
              left={bar.pctCap}
              width={clampPct(100 - bar.pctCap)}
              title={t('machine.zvolManageModal.overProvisionedTooltip')}
            />
          ) : null}
          <Mark kind="current" left={bar.pctCurrent} />
          {bar.pctCap !== null && bar.capBytes < bar.sliderMax ? (
            <Mark
              kind="cap"
              left={bar.pctCap}
              title={t('machine.zvolManageModal.poolCeilingTooltip', {
                size: humanSize(bar.capBytes),
              })}
            />
          ) : null}
          <Mark kind="target" left={bar.pctTarget} />
        </div>
        <input
          id="zvol-size-range"
          className="zvol-range"
          type="range"
          min={0}
          max={bar.sliderMax}
          step={bar.step}
          value={Math.min(Math.max(bar.targetBytes, 0), bar.sliderMax)}
          onChange={event => onValue(Number(event.target.value))}
          disabled={busy}
          aria-label={t('machine.zvolManageModal.dragAriaLabel')}
        />
      </div>
    </>
  );
};

CapacityBar.propTypes = {
  bar: PropTypes.object.isRequired,
  overprovision: PropTypes.bool.isRequired,
  busy: PropTypes.bool.isRequired,
  shrinking: PropTypes.bool.isRequired,
  onValue: PropTypes.func.isRequired,
};

const PropertiesDrawer = ({ read, edits, onEdit, onApply, busy }) => {
  const { t } = useTranslation();
  const { properties, failed } = read;
  return (
    <details data-drawer="zfs-properties">
      <summary className="fw-bold">{t('machine.zvolManageModal.zfsPropertiesSummary')}</summary>
      {properties === null ? (
        <p className="text-muted mb-0 mt-1">
          <span className="spinner-border spinner-border-sm me-2" aria-hidden="true" />
          {t('machine.zvolManageModal.loading')}
        </p>
      ) : null}
      {failed ? (
        <p className="form-text text-muted mt-1">
          {t('machine.zvolManageModal.propertiesUnavailable')}
        </p>
      ) : null}
      {properties !== null && !failed ? (
        <>
          <p className="form-text text-muted mt-1">
            {t('machine.zvolManageModal.appliesImmediatelyNote')}
          </p>
          <ZfsPropertiesEditor
            properties={properties}
            edits={edits}
            onEdit={onEdit}
            disabled={busy}
          />
          <button
            type="button"
            className="btn btn-primary btn-sm mt-2"
            data-action="apply-properties"
            onClick={onApply}
            disabled={busy}
          >
            {t('machine.zvolManageModal.applyPropertiesButton')}
          </button>
        </>
      ) : null}
    </details>
  );
};

PropertiesDrawer.propTypes = {
  read: PropTypes.shape({
    properties: PropTypes.object,
    failed: PropTypes.bool.isRequired,
  }).isRequired,
  edits: PropTypes.object.isRequired,
  onEdit: PropTypes.func.isRequired,
  onApply: PropTypes.func.isRequired,
  busy: PropTypes.bool.isRequired,
};

/**
 * The zvol manager of one zone disk, hyperweaver-ui's: the capacity bar
 * with the used, the allocated and the pool's free space, a resize sent
 * at once through `PUT machines/{name}` with `resize_disks`, a shrink
 * allowed by `allow_shrink` and a thin grow past the pool by
 * `allow_overprovision`; a snapshot of the dataset,
 * `POST storage/dataset/snapshots`; and its ZFS properties, read once on
 * open and written through `PUT storage/dataset/properties`. Every write
 * is one request and one notice, and `onResized` reads the held copies
 * again.
 */
const ZvolManageModal = ({
  status,
  hostId,
  name,
  disk,
  running,
  pools = [],
  onClose,
  onResized,
}) => {
  const { t } = useTranslation();
  const notify = useNotify();
  const [read, setRead] = useState(UNREAD);
  const [busy, setBusy] = useState(false);
  const [target, setTarget] = useState('');
  const [overprovision, setOverprovision] = useState(false);
  const [snapName, setSnapName] = useState('');
  const [edits, setEdits] = useState({});
  const dataset = disk.value || '';

  const load = useCallback(
    () =>
      getZfsDataset(status, hostId, dataset).then(
        answer => setRead({ properties: answer?.properties || {}, failed: false }),
        () => setRead({ properties: {}, failed: true })
      ),
    [status, hostId, dataset]
  );

  useEffect(() => {
    load();
  }, [load]);

  const reload = () => {
    setRead(UNREAD);
    load();
  };

  const bar = computeBar(disk, read.properties, pools, target, overprovision);
  const shrinking = bar.delta < 0;
  const applyBlocked =
    busy || bar.targetBytes <= 0 || bar.delta === 0 || (bar.pastCap && !overprovision);

  const runResize = async () => {
    setBusy(true);
    try {
      const answer = await modifyMachine(status, hostId, name, {
        resize_disks: [
          {
            name: disk.name,
            size: target.trim(),
            ...(shrinking && { allow_shrink: true }),
            ...(overprovision && { allow_overprovision: true }),
          },
        ],
      });
      notify('success', resizeOutcome(answer, t));
      setTarget('');
      reload();
      onResized();
    } catch (error) {
      notify(
        'danger',
        !overprovision && bar.delta > 0
          ? `${error.message} ${t('machine.zvolManageModal.overprovisionHint')}`
          : error.message
      );
    } finally {
      setBusy(false);
    }
  };

  const takeSnapshot = async () => {
    setBusy(true);
    try {
      const answer = await createZfsSnapshot(status, hostId, dataset, {
        snapshot_name: snapName.trim(),
      });
      notify(
        'success',
        queuedMessage(
          answer,
          t('machine.zvolManageModal.snapshotQueuedFallback', {
            handle: `${dataset}@${snapName.trim()}`,
          })
        )
      );
      setSnapName('');
    } catch (error) {
      notify('danger', error.message);
    } finally {
      setBusy(false);
    }
  };

  const applyProperties = async () => {
    const changed = propertyEdits(read.properties || {}, edits);
    if (Object.keys(changed).length === 0) {
      notify('warning', t('machine.zvolManageModal.nothingChanged'));
      return;
    }
    setBusy(true);
    try {
      const answer = await setZfsDatasetProperties(status, hostId, dataset, changed);
      notify(
        'success',
        queuedMessage(
          answer,
          t('machine.zvolManageModal.propertyUpdateQueuedFallback', { dataset })
        )
      );
      setEdits({});
      reload();
    } catch (error) {
      notify('danger', error.message);
    } finally {
      setBusy(false);
    }
  };

  const shrinkNote = shrinking
    ? t('machine.zvolManageModal.shrinkNote')
    : t('machine.zvolManageModal.growNote');
  const runningNote = running ? ` ${t('machine.zvolManageModal.runningNote')}` : '';
  const sizeWord = target.trim() ? humanSize(bar.targetBytes) : '—';

  return (
    <Modal show onHide={onClose} dialogClassName="list-modal" scrollable data-dialog="zvol-manage">
      <Modal.Header closeButton>
        <Modal.Title as="h5">
          <FaHardDrive className="me-2" aria-hidden="true" />
          {t('machine.zvolManageModal.manageTitle', { diskName: disk.name })}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <div className="d-flex align-items-center gap-2 mb-1 flex-wrap">
          <code className="text-break">{dataset}</code>
          {disk.boot ? (
            <span
              className="badge text-bg-light border"
              title={t('machine.zvolManageModal.bootMediumTooltip')}
            >
              {t('machine.zvolManageModal.bootBadge')}
            </span>
          ) : null}
        </div>
        <div className="text-muted small mb-3">{summaryLine(bar, disk, t)}</div>
        <CapacityBar
          bar={bar}
          overprovision={overprovision}
          busy={busy}
          shrinking={shrinking}
          onValue={value => setTarget(bytesToInput(value))}
        />
        <div className="d-flex align-items-center gap-2 flex-wrap mb-2">
          <div className="input-group input-group-sm zvol-size-input">
            <input
              className="form-control"
              type="text"
              placeholder={bytesToInput(bar.currentBytes)}
              aria-label={t('machine.zvolManageModal.exactSizeAriaLabel')}
              value={target}
              onChange={event => setTarget(event.target.value)}
              disabled={busy}
            />
            <span className="input-group-text">{t('machine.zvolManageModal.sizeUnitLabel')}</span>
          </div>
          <div className="form-check form-switch mb-0">
            <input
              id="zvol-overprovision"
              className="form-check-input"
              type="checkbox"
              role="switch"
              checked={overprovision}
              onChange={event => setOverprovision(event.target.checked)}
              disabled={busy}
            />
            <label className="form-check-label small" htmlFor="zvol-overprovision">
              {t('machine.zvolManageModal.overprovisionCheckboxLabel')}
            </label>
          </div>
          <button
            type="button"
            className="btn btn-sm btn-primary ms-auto"
            data-action="resize"
            onClick={runResize}
            disabled={applyBlocked}
          >
            {shrinking
              ? t('machine.zvolManageModal.shrinkTo', { size: sizeWord })
              : t('machine.zvolManageModal.growTo', { size: sizeWord })}
          </button>
        </div>
        {bar.pastCap && !overprovision ? (
          <p className="form-text text-warning mt-0">
            {t('machine.zvolManageModal.pastCapWarning', {
              target: humanSize(bar.targetBytes),
              cap: humanSize(bar.capBytes),
            })}
          </p>
        ) : null}
        <p className="form-text text-muted mt-0">{`${shrinkNote}${runningNote}`}</p>
        <div className="input-group input-group-sm mb-3">
          <span className="input-group-text font-monospace">{dataset}@</span>
          <input
            id="zvol-snapshot-name"
            className="form-control"
            type="text"
            placeholder={t('machine.zvolManageModal.snapshotNamePlaceholder')}
            aria-label={t('machine.zvolManageModal.snapshotNameAriaLabel')}
            value={snapName}
            onChange={event => setSnapName(event.target.value)}
            disabled={busy}
          />
          <button
            type="button"
            className="btn btn-outline-primary"
            data-action="snapshot"
            onClick={takeSnapshot}
            disabled={busy || !snapName.trim()}
          >
            {t('machine.zvolManageModal.snapshotButton')}
          </button>
        </div>
        <PropertiesDrawer
          read={read}
          edits={edits}
          onEdit={(key, value) => setEdits(prev => ({ ...prev, [key]: value }))}
          onApply={applyProperties}
          busy={busy}
        />
      </Modal.Body>
    </Modal>
  );
};

ZvolManageModal.propTypes = {
  status: PropTypes.object.isRequired,
  hostId: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  disk: PropTypes.object.isRequired,
  running: PropTypes.bool.isRequired,
  pools: PropTypes.arrayOf(PropTypes.object),
  onClose: PropTypes.func.isRequired,
  onResized: PropTypes.func.isRequired,
};

export default ZvolManageModal;
