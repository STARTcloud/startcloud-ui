import PropTypes from 'prop-types';
import { useCallback, useEffect, useState } from 'react';
import { Modal } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import {
  FaCircleCheck,
  FaFolder,
  FaHardDrive,
  FaLock,
  FaLockOpen,
  FaRotate,
} from 'react-icons/fa6';

import SubTable from '../../../components/common/SubTable';
import { useStatus } from '../../../contexts/StatusContext';
import { useTablePrefs } from '../../../hooks/useTablePrefs';
import {
  cloneZfsSnapshot,
  createZfsDataset,
  createZfsSnapshot,
  destroyZfsDataset,
  destroyZfsSnapshot,
  getZfsDataset,
  getZfsSnapshotHolds,
  holdZfsSnapshot,
  releaseZfsSnapshotHold,
  renameZfsDataset,
  rollbackZfsSnapshot,
  setZfsDatasetProperties,
} from '../api/zfsAPI';
import { parsePropertyLines } from '../utils/zfsUtils';

import ToolFormDialog from './ToolFormDialog';
import ZfsPropertiesEditor, { propertyEdits } from './ZfsPropertiesEditor';

const toolsShape = PropTypes.shape({
  send: PropTypes.func.isRequired,
  watch: PropTypes.func.isRequired,
  busy: PropTypes.bool.isRequired,
});

const DATASET_TYPES = [
  {
    value: 'filesystem',
    label: 'host.createDatasetModal.filesystemLabel',
    icon: FaFolder,
    note: 'host.createDatasetModal.filesystemNote',
  },
  {
    value: 'volume',
    label: 'host.createDatasetModal.volumeLabel',
    icon: FaHardDrive,
    note: 'host.createDatasetModal.volumeNote',
  },
];

const Check = ({ id, labelKey, checked, onChange, disabled }) => {
  const { t } = useTranslation();
  return (
    <div className="form-check">
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

Check.propTypes = {
  id: PropTypes.string.isRequired,
  labelKey: PropTypes.string.isRequired,
  checked: PropTypes.bool.isRequired,
  onChange: PropTypes.func.isRequired,
  disabled: PropTypes.bool.isRequired,
};

const createProblem = ({ leaf, parentPrefix, pools, pool, type, volsize }) => {
  if (!leaf.trim() || (!parentPrefix && pools.length > 0 && !pool)) {
    return parentPrefix
      ? 'host.createDatasetModal.errorNameRequired'
      : 'host.createDatasetModal.errorPoolAndNameRequired';
  }
  return type === 'volume' && !volsize.trim()
    ? 'host.createDatasetModal.errorVolumeSizeRequired'
    : '';
};

/**
 * The create dataset dialog, hyperweaver-ui's: a filesystem or a
 * volume, the pool and the name, or the leaf alone under a locked
 * parent, the volume's size and the properties as `key=value` lines,
 * sent as `POST storage/datasets`, a queued task.
 */
export const CreateDatasetModal = ({ id, pools, initialName = '', tools, onClose }) => {
  const { t } = useTranslation();
  const status = useStatus();
  const parentPrefix = initialName.endsWith('/') ? initialName : '';
  const [leaf, setLeaf] = useState(parentPrefix ? '' : initialName);
  const [pool, setPool] = useState('');
  const [type, setType] = useState('filesystem');
  const [volsize, setVolsize] = useState('');
  const [propLines, setPropLines] = useState('');
  const [problem, setProblem] = useState('');
  const prefix = parentPrefix || (pool ? `${pool}/` : '');
  const fullName = `${prefix}${leaf.trim()}`;

  const submit = async () => {
    const wrong = createProblem({ leaf, parentPrefix, pools, pool, type, volsize });
    setProblem(wrong);
    if (wrong) {
      return;
    }
    const properties = {
      ...parsePropertyLines(propLines),
      ...(type === 'volume' ? { volsize: volsize.trim() } : {}),
    };
    const { error } = await tools.send({
      call: () =>
        createZfsDataset(status, id, {
          name: fullName,
          type,
          ...(Object.keys(properties).length > 0 ? { properties } : {}),
        }),
      doneKey: 'host.createDatasetModal.queuedMessage',
      values: { name: fullName },
    });
    if (!error) {
      onClose();
    }
  };

  return (
    <ToolFormDialog
      dialog="zfs-create-dataset"
      title={
        parentPrefix
          ? t('host.createDatasetModal.titleWithParent', { parent: parentPrefix })
          : t('host.createDatasetModal.title')
      }
      submitKey="host.createDatasetModal.submit"
      problemKey={problem}
      busy={tools.busy}
      onClose={onClose}
      onSubmit={submit}
    >
      <span className="form-label d-block">{t('host.createDatasetModal.typeLabel')}</span>
      <div className="row g-2 mb-3">
        {DATASET_TYPES.map(({ value, label, icon: Icon, note }) => (
          <div className="col-6" key={value}>
            <button
              type="button"
              className={`border rounded p-2 w-100 text-start bg-transparent zfs-pick${type === value ? ' zfs-pick-on' : ''}`}
              data-type={value}
              aria-pressed={type === value}
              onClick={() => setType(value)}
              disabled={tools.busy}
            >
              <div className="d-flex align-items-center gap-2">
                <Icon className="text-muted" aria-hidden="true" />
                <strong className="small">{t(label)}</strong>
                {type === value ? (
                  <FaCircleCheck className="text-primary ms-auto" aria-hidden="true" />
                ) : null}
              </div>
              <span className="form-text d-block">{t(note)}</span>
            </button>
          </div>
        ))}
      </div>
      <div className="row g-3">
        {!parentPrefix && pools.length > 0 ? (
          <div className="col-12 col-md-4">
            <label className="form-label" htmlFor="zfs-create-pool">
              {t('host.createDatasetModal.poolLabel')} <span className="text-danger">*</span>
            </label>
            <select
              id="zfs-create-pool"
              className="form-select"
              value={pool}
              onChange={event => setPool(event.target.value)}
              disabled={tools.busy}
            >
              <option value="">{t('host.createDatasetModal.poolPlaceholder')}</option>
              {pools.map(entry => (
                <option key={entry} value={entry}>
                  {entry}
                </option>
              ))}
            </select>
          </div>
        ) : null}
        <div className="col-12 col-md-8">
          <label className="form-label" htmlFor="zfs-create-name">
            {t('host.createDatasetModal.nameLabel')} <span className="text-danger">*</span>
          </label>
          <div className="input-group">
            {prefix ? <span className="input-group-text font-monospace">{prefix}</span> : null}
            <input
              id="zfs-create-name"
              className="form-control font-monospace"
              type="text"
              placeholder={t(
                type === 'volume'
                  ? 'host.createDatasetModal.namePlaceholderVolume'
                  : 'host.createDatasetModal.namePlaceholderFilesystem'
              )}
              value={leaf}
              onChange={event => setLeaf(event.target.value)}
              disabled={tools.busy}
            />
          </div>
        </div>
        {type === 'volume' ? (
          <div className="col-6 col-md-4">
            <label className="form-label" htmlFor="zfs-create-volsize">
              {t('host.createDatasetModal.volsizeLabel')} <span className="text-danger">*</span>
            </label>
            <input
              id="zfs-create-volsize"
              className="form-control"
              type="text"
              placeholder={t('host.createDatasetModal.volsizePlaceholder')}
              value={volsize}
              onChange={event => setVolsize(event.target.value)}
              disabled={tools.busy}
            />
          </div>
        ) : null}
      </div>
      {leaf.trim() && prefix ? (
        <p className="form-text mt-2 mb-0" data-note="creates">
          {t('host.createDatasetModal.createsText', { type })} <code>{fullName}</code>
          {type === 'volume' && volsize.trim() ? ` — ${volsize.trim()}` : ''}
        </p>
      ) : null}
      <details className="mt-3">
        <summary className="small text-muted">
          {t('host.createDatasetModal.advancedPropertiesLabel')}
        </summary>
        <label className="form-label small mt-2" htmlFor="zfs-create-props">
          {t('host.createDatasetModal.propertiesLabelDataset')}
        </label>
        <textarea
          id="zfs-create-props"
          className="form-control font-monospace"
          rows={2}
          placeholder={t('host.createDatasetModal.propertiesPlaceholderDataset')}
          value={propLines}
          onChange={event => setPropLines(event.target.value)}
          disabled={tools.busy}
        />
      </details>
    </ToolFormDialog>
  );
};

CreateDatasetModal.propTypes = {
  id: PropTypes.string.isRequired,
  pools: PropTypes.arrayOf(PropTypes.string).isRequired,
  initialName: PropTypes.string,
  tools: toolsShape.isRequired,
  onClose: PropTypes.func.isRequired,
};

/**
 * The snapshot dialog of a dataset, hyperweaver-ui's: the snapshot's
 * name after the dataset's and the recursive flag, sent as
 * `POST storage/dataset/snapshots`, a queued task.
 */
export const SnapshotCreateModal = ({ id, dataset, tools, onClose }) => {
  const { t } = useTranslation();
  const status = useStatus();
  const [snapName, setSnapName] = useState('');
  const [recursive, setRecursive] = useState(false);
  const [problem, setProblem] = useState('');

  const submit = async () => {
    if (!snapName.trim()) {
      setProblem('host.snapshotCreateModal.errorNameRequired');
      return;
    }
    setProblem('');
    const { error } = await tools.send({
      call: () =>
        createZfsSnapshot(status, id, dataset, {
          snapshot_name: snapName.trim(),
          ...(recursive ? { recursive: true } : {}),
        }),
      doneKey: 'host.snapshotCreateModal.queuedMessage',
      values: { dataset, name: snapName.trim() },
    });
    if (!error) {
      onClose();
    }
  };

  return (
    <ToolFormDialog
      dialog="zfs-create-snapshot"
      title={t('host.snapshotCreateModal.title', { dataset })}
      submitKey="host.snapshotCreateModal.submit"
      problemKey={problem}
      busy={tools.busy}
      onClose={onClose}
      onSubmit={submit}
    >
      <label className="form-label" htmlFor="zfs-snap-name">
        {t('host.snapshotCreateModal.nameLabel')} <span className="text-danger">*</span>
      </label>
      <div className="input-group">
        <span className="input-group-text font-monospace">{dataset}@</span>
        <input
          id="zfs-snap-name"
          className="form-control font-monospace"
          type="text"
          placeholder={t('host.snapshotCreateModal.namePlaceholderSnap')}
          value={snapName}
          onChange={event => setSnapName(event.target.value)}
          disabled={tools.busy}
        />
      </div>
      <div className="mt-3">
        <Check
          id="zfs-snap-recursive"
          labelKey="host.snapshotCreateModal.recursiveLabel"
          checked={recursive}
          onChange={setRecursive}
          disabled={tools.busy}
        />
      </div>
    </ToolFormDialog>
  );
};

SnapshotCreateModal.propTypes = {
  id: PropTypes.string.isRequired,
  dataset: PropTypes.string.isRequired,
  tools: toolsShape.isRequired,
  onClose: PropTypes.func.isRequired,
};

/**
 * The rename dataset dialog, hyperweaver-ui's: the new name, the
 * recursive and the force flags, sent as `POST storage/dataset/rename`,
 * a queued task.
 */
export const RenameDatasetModal = ({ id, dataset, tools, onClose }) => {
  const { t } = useTranslation();
  const status = useStatus();
  const [newName, setNewName] = useState(dataset);
  const [recursive, setRecursive] = useState(false);
  const [force, setForce] = useState(false);
  const [problem, setProblem] = useState('');

  const submit = async () => {
    if (!newName.trim() || newName.trim() === dataset) {
      setProblem('host.renameDatasetModal.errorDifferentNameRequired');
      return;
    }
    setProblem('');
    const { error } = await tools.send({
      call: () =>
        renameZfsDataset(status, id, dataset, {
          new_name: newName.trim(),
          ...(recursive ? { recursive: true } : {}),
          ...(force ? { force: true } : {}),
        }),
      doneKey: 'host.renameDatasetModal.queuedMessage',
      values: { dataset, newName: newName.trim() },
    });
    if (!error) {
      onClose();
    }
  };

  return (
    <ToolFormDialog
      dialog="zfs-rename-dataset"
      title={t('host.renameDatasetModal.title', { dataset })}
      submitKey="host.renameDatasetModal.submit"
      problemKey={problem}
      busy={tools.busy}
      onClose={onClose}
      onSubmit={submit}
    >
      <label className="form-label" htmlFor="zfs-rename-name">
        {t('host.renameDatasetModal.newNameLabel')} <span className="text-danger">*</span>
      </label>
      <input
        id="zfs-rename-name"
        className="form-control font-monospace"
        type="text"
        value={newName}
        onChange={event => setNewName(event.target.value)}
        disabled={tools.busy}
      />
      <div className="mt-3">
        <Check
          id="zfs-rename-recursive"
          labelKey="host.renameDatasetModal.recursiveLabel"
          checked={recursive}
          onChange={setRecursive}
          disabled={tools.busy}
        />
        <Check
          id="zfs-rename-force"
          labelKey="host.renameDatasetModal.forceLabel"
          checked={force}
          onChange={setForce}
          disabled={tools.busy}
        />
      </div>
    </ToolFormDialog>
  );
};

RenameDatasetModal.propTypes = {
  id: PropTypes.string.isRequired,
  dataset: PropTypes.string.isRequired,
  tools: toolsShape.isRequired,
  onClose: PropTypes.func.isRequired,
};

/**
 * The clone snapshot dialog, hyperweaver-ui's: the target dataset and
 * the properties as `key=value` lines, sent as
 * `POST storage/dataset/clone`, a queued task.
 */
export const CloneSnapshotModal = ({ id, snapshot, tools, onClose }) => {
  const { t } = useTranslation();
  const status = useStatus();
  const [target, setTarget] = useState('');
  const [propLines, setPropLines] = useState('');
  const [problem, setProblem] = useState('');

  const submit = async () => {
    if (!target.trim()) {
      setProblem('host.cloneSnapshotModal.errorTargetRequired');
      return;
    }
    setProblem('');
    const properties = parsePropertyLines(propLines);
    const { error } = await tools.send({
      call: () =>
        cloneZfsSnapshot(status, id, snapshot, {
          target: target.trim(),
          ...(Object.keys(properties).length > 0 ? { properties } : {}),
        }),
      doneKey: 'host.cloneSnapshotModal.queuedMessage',
      values: { snapshot, target: target.trim() },
    });
    if (!error) {
      onClose();
    }
  };

  return (
    <ToolFormDialog
      dialog="zfs-clone-snapshot"
      title={t('host.cloneSnapshotModal.title', { snapshot })}
      submitKey="host.cloneSnapshotModal.submit"
      problemKey={problem}
      busy={tools.busy}
      onClose={onClose}
      onSubmit={submit}
    >
      <label className="form-label" htmlFor="zfs-clone-target">
        {t('host.cloneSnapshotModal.targetLabel')} <span className="text-danger">*</span>
      </label>
      <input
        id="zfs-clone-target"
        className="form-control font-monospace"
        type="text"
        placeholder={t('host.cloneSnapshotModal.targetPlaceholder')}
        value={target}
        onChange={event => setTarget(event.target.value)}
        disabled={tools.busy}
      />
      <label className="form-label mt-3" htmlFor="zfs-clone-props">
        {t('host.cloneSnapshotModal.propertiesLabelClone')}
      </label>
      <textarea
        id="zfs-clone-props"
        className="form-control font-monospace"
        rows={2}
        value={propLines}
        onChange={event => setPropLines(event.target.value)}
        disabled={tools.busy}
      />
      <p className="form-text mb-0 mt-2">{t('host.cloneSnapshotModal.helpText')}</p>
    </ToolFormDialog>
  );
};

CloneSnapshotModal.propTypes = {
  id: PropTypes.string.isRequired,
  snapshot: PropTypes.string.isRequired,
  tools: toolsShape.isRequired,
  onClose: PropTypes.func.isRequired,
};

/**
 * The rollback dialog, hyperweaver-ui's: the warning, the recursive and
 * the force flags, sent as `POST storage/snapshot/rollback`, a queued
 * task.
 */
export const RollbackSnapshotModal = ({ id, snapshot, tools, onClose }) => {
  const { t } = useTranslation();
  const status = useStatus();
  const [recursive, setRecursive] = useState(false);
  const [force, setForce] = useState(false);

  const submit = async () => {
    const { error } = await tools.send({
      call: () =>
        rollbackZfsSnapshot(status, id, snapshot, {
          ...(recursive ? { recursive: true } : {}),
          ...(force ? { force: true } : {}),
        }),
      doneKey: 'host.rollbackSnapshotModal.queuedMessage',
      values: { snapshot },
    });
    if (!error) {
      onClose();
    }
  };

  return (
    <ToolFormDialog
      dialog="zfs-rollback-snapshot"
      title={t('host.rollbackSnapshotModal.title', { snapshot })}
      submitKey="host.rollbackSnapshotModal.submit"
      variant="danger"
      busy={tools.busy}
      onClose={onClose}
      onSubmit={submit}
    >
      <div className="alert alert-warning">{t('host.rollbackSnapshotModal.warningText')}</div>
      <Check
        id="zfs-rollback-recursive"
        labelKey="host.rollbackSnapshotModal.recursiveLabel"
        checked={recursive}
        onChange={setRecursive}
        disabled={tools.busy}
      />
      <Check
        id="zfs-rollback-force"
        labelKey="host.rollbackSnapshotModal.forceLabel"
        checked={force}
        onChange={setForce}
        disabled={tools.busy}
      />
    </ToolFormDialog>
  );
};

RollbackSnapshotModal.propTypes = {
  id: PropTypes.string.isRequired,
  snapshot: PropTypes.string.isRequired,
  tools: toolsShape.isRequired,
  onClose: PropTypes.func.isRequired,
};

const HOLD_COLUMNS = [
  {
    key: 'tag',
    kind: 'name',
    labelKey: 'host.snapshotHoldsModal.tagHeader',
    value: row => row.tag,
    render: row => <code className="small">{row.tag}</code>,
  },
  {
    key: 'since',
    kind: 'text',
    labelKey: 'host.snapshotHoldsModal.sinceHeader',
    value: row => row.timestamp || '',
    render: row => <span className="text-muted small">{row.timestamp}</span>,
  },
];

const ReleaseButton = ({ hold, busy, onRelease }) => {
  const { t } = useTranslation();
  return (
    <button
      type="button"
      className="btn btn-sm btn-outline-danger"
      data-action="hold-release"
      title={t('host.snapshotHoldsModal.releaseTitle')}
      aria-label={t('host.snapshotHoldsModal.releaseTitle')}
      onClick={() => onRelease(hold.tag)}
      disabled={busy}
    >
      <FaLockOpen aria-hidden="true" />
    </button>
  );
};

ReleaseButton.propTypes = {
  hold: PropTypes.shape({ tag: PropTypes.string.isRequired }).isRequired,
  busy: PropTypes.bool.isRequired,
  onRelease: PropTypes.func.isRequired,
};

/**
 * The holds of one snapshot of a dataset, hyperweaver-ui's holds
 * dialog, a list dialog: the holds read once as the dialog opens and
 * again on Refresh and when a hold or a release this dialog queued
 * ended, the one table of them with the open lock that releases each,
 * and the tag with Add hold, `POST storage/snapshot/holds`, both queued
 * tasks, one notice each. hyperweaver-ui waited two seconds and read;
 * that wait is not carried over.
 */
export const SnapshotHoldsModal = ({ id, snapshot, tools, onClose }) => {
  const { t, i18n } = useTranslation();
  const status = useStatus();
  const [holds, setHolds] = useState(null);
  const [failed, setFailed] = useState('');
  const [tag, setTag] = useState('');
  const [turn, setTurn] = useState(0);
  const prefs = useTablePrefs('table_prefs_zfs_holds', HOLD_COLUMNS);

  const again = useCallback(() => setTurn(current => current + 1), []);

  useEffect(() => {
    let live = true;
    getZfsSnapshotHolds(status, id, snapshot).then(
      answer => {
        if (live) {
          setHolds(Array.isArray(answer?.holds) ? answer.holds : []);
          setFailed('');
        }
      },
      error => {
        if (live) {
          setHolds([]);
          setFailed(error.message);
        }
      }
    );
    return () => {
      live = false;
    };
  }, [status, id, snapshot, turn]);

  const hold = async () => {
    if (!tag.trim()) {
      setFailed(t('host.snapshotHoldsModal.errorTagRequired'));
      return;
    }
    const { error } = await tools.send({
      call: () => holdZfsSnapshot(status, id, snapshot, { tag: tag.trim() }),
      doneKey: 'host.snapshotHoldsModal.holdQueuedMessage',
      values: { tag: tag.trim(), snapshot },
    });
    if (!error) {
      setTag('');
    }
  };

  const release = word =>
    tools.send({
      call: () => releaseZfsSnapshotHold(status, id, snapshot, word),
      doneKey: 'host.snapshotHoldsModal.releaseQueuedMessage',
      values: { tag: word, snapshot },
    });

  return (
    <Modal show onHide={onClose} dialogClassName="list-modal" scrollable>
      <Modal.Header closeButton>
        <Modal.Title as="h5">
          <FaLock className="me-2" aria-hidden="true" />
          {t('host.snapshotHoldsModal.title', { snapshot })}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body data-dialog="zfs-snapshot-holds">
        <div className="d-flex align-items-start gap-2">
          <p className="form-text mt-0 flex-grow-1">{t('host.snapshotHoldsModal.helpText')}</p>
          <button
            type="button"
            className="btn btn-sm btn-outline-secondary"
            title={t('hosts.page.refresh')}
            aria-label={t('hosts.page.refresh')}
            data-action="holds-refresh"
            onClick={again}
          >
            <FaRotate aria-hidden="true" />
          </button>
        </div>
        {failed ? (
          <div className="alert alert-danger py-2" role="alert" data-note="holds-failed">
            {failed}
          </div>
        ) : null}
        {holds === null ? (
          <p className="text-muted">{t('host.snapshotHoldsModal.loading')}</p>
        ) : null}
        {holds !== null && holds.length === 0 ? (
          <p className="text-muted">{t('host.snapshotHoldsModal.noHolds')}</p>
        ) : null}
        {holds !== null && holds.length > 0 ? (
          <SubTable
            columns={HOLD_COLUMNS}
            rows={holds}
            rowKey={row => row.tag}
            rowProp="hold"
            RowActions={ReleaseButton}
            actionsProps={{ busy: tools.busy, onRelease: release }}
            sort={prefs.sort}
            onSort={prefs.setSort}
            hiddenColumns={prefs.hiddenColumns}
            widths={prefs.widths}
            onResize={prefs.setColumnWidth}
            ctx={{ t, language: i18n.language }}
            emptyText={t('host.snapshotHoldsModal.noHolds')}
          />
        ) : null}
        <label className="form-label mt-3" htmlFor="zfs-hold-tag">
          {t('host.snapshotHoldsModal.newHoldLabel')}
        </label>
        <div className="input-group input-group-sm">
          <input
            id="zfs-hold-tag"
            className="form-control"
            type="text"
            placeholder={t('host.snapshotHoldsModal.holdPlaceholder')}
            value={tag}
            onChange={event => setTag(event.target.value)}
            disabled={tools.busy}
          />
          <button
            type="button"
            className="btn btn-outline-primary"
            data-action="hold-add"
            onClick={hold}
            disabled={tools.busy || !tag.trim()}
          >
            <FaLock className="me-1" aria-hidden="true" />
            {t('host.snapshotHoldsModal.submit')}
          </button>
        </div>
      </Modal.Body>
    </Modal>
  );
};

SnapshotHoldsModal.propTypes = {
  id: PropTypes.string.isRequired,
  snapshot: PropTypes.string.isRequired,
  tools: toolsShape.isRequired,
  onClose: PropTypes.func.isRequired,
};

/**
 * The dataset properties dialog, hyperweaver-ui's: every property read
 * as the dialog opens, the writable ones edited inline, the changed
 * keys alone sent as `PUT storage/dataset/properties`, a queued task.
 */
export const DatasetPropertiesModal = ({ id, dataset, tools, onClose }) => {
  const { t } = useTranslation();
  const status = useStatus();
  const [properties, setProperties] = useState(null);
  const [failed, setFailed] = useState('');
  const [edits, setEdits] = useState({});
  const [problem, setProblem] = useState('');

  useEffect(() => {
    let live = true;
    getZfsDataset(status, id, dataset).then(
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
  }, [status, id, dataset]);

  const submit = async () => {
    const changed = propertyEdits(properties || {}, edits);
    if (Object.keys(changed).length === 0) {
      setProblem('host.datasetPropertiesModal.errorNothingChanged');
      return;
    }
    setProblem('');
    const { error } = await tools.send({
      call: () => setZfsDatasetProperties(status, id, dataset, changed),
      doneKey: 'host.datasetPropertiesModal.queuedMessage',
      values: { dataset },
    });
    if (!error) {
      onClose();
    }
  };

  return (
    <ToolFormDialog
      dialog="zfs-dataset-properties"
      title={t('host.datasetPropertiesModal.title', { dataset })}
      submitKey="host.datasetPropertiesModal.submit"
      problemKey={problem}
      busy={tools.busy}
      onClose={onClose}
      onSubmit={submit}
    >
      {failed ? (
        <div className="alert alert-danger py-2" role="alert">
          {t('host.datasetPropertiesModal.errorFetchFailed', {
            dataset,
            status: '',
            message: failed,
          })}
        </div>
      ) : null}
      <p className="form-text mt-0">{t('host.datasetPropertiesModal.helpText', { dash: '-' })}</p>
      {properties === null && !failed ? (
        <p className="text-muted mb-0">{t('host.datasetPropertiesModal.loading')}</p>
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

DatasetPropertiesModal.propTypes = {
  id: PropTypes.string.isRequired,
  dataset: PropTypes.string.isRequired,
  tools: toolsShape.isRequired,
  onClose: PropTypes.func.isRequired,
};

/**
 * The destroy dialog of a dataset or a snapshot, hyperweaver-ui's: the
 * warning, the recursive flag and the force of a dataset or the defer
 * of a snapshot, sent as `DELETE storage/dataset` or
 * `DELETE storage/snapshot`, a queued task.
 */
export const DestroyDatasetModal = ({ id, name, isSnapshot, tools, onClose }) => {
  const { t } = useTranslation();
  const status = useStatus();
  const [recursive, setRecursive] = useState(false);
  const [flag, setFlag] = useState(false);

  const submit = async () => {
    const flagged = isSnapshot ? { defer: true } : { force: true };
    const body = {
      ...(recursive ? { recursive: true } : {}),
      ...(flag ? flagged : {}),
    };
    const { error } = await tools.send({
      call: () =>
        isSnapshot
          ? destroyZfsSnapshot(status, id, name, body)
          : destroyZfsDataset(status, id, name, body),
      doneKey: 'host.destroyDatasetModal.queuedMessage',
      values: { name },
    });
    if (!error) {
      onClose();
    }
  };

  return (
    <ToolFormDialog
      dialog="zfs-destroy-dataset"
      title={t('host.destroyDatasetModal.title', { name })}
      submitKey="host.destroyDatasetModal.submit"
      variant="danger"
      busy={tools.busy}
      onClose={onClose}
      onSubmit={submit}
    >
      <div className="alert alert-danger">
        {t(
          isSnapshot
            ? 'host.destroyDatasetModal.warningText'
            : 'host.destroyDatasetModal.warningTextWithData',
          { name }
        )}
      </div>
      <Check
        id="zfs-destroy-recursive"
        labelKey={
          isSnapshot
            ? 'host.destroyDatasetModal.recursiveSnapshot'
            : 'host.destroyDatasetModal.recursiveDataset'
        }
        checked={recursive}
        onChange={setRecursive}
        disabled={tools.busy}
      />
      <Check
        id="zfs-destroy-flag"
        labelKey={
          isSnapshot
            ? 'host.destroyDatasetModal.deferSnapshot'
            : 'host.destroyDatasetModal.forceDataset'
        }
        checked={flag}
        onChange={setFlag}
        disabled={tools.busy}
      />
    </ToolFormDialog>
  );
};

DestroyDatasetModal.propTypes = {
  id: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  isSnapshot: PropTypes.bool.isRequired,
  tools: toolsShape.isRequired,
  onClose: PropTypes.func.isRequired,
};
