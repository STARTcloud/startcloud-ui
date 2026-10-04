import PropTypes from 'prop-types';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Dropdown } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import {
  FaAnglesDown,
  FaAnglesUp,
  FaArrowUp,
  FaCamera,
  FaCaretDown,
  FaCaretRight,
  FaClockRotateLeft,
  FaClone,
  FaDatabase,
  FaFolder,
  FaGear,
  FaHardDrive,
  FaICursor,
  FaLock,
  FaPlus,
  FaSliders,
  FaTrash,
} from 'react-icons/fa6';

import ConfirmModal from '../../../components/common/ConfirmModal';
import RowMenu from '../../../components/common/RowMenu';
import SectionHeading from '../../../components/common/SectionHeading';
import { useNotify } from '../../../contexts/NoticeContext';
import { useStatus } from '../../../contexts/StatusContext';
import { useCssVar } from '../../../hooks/useCssVar';
import { destroyZfsSnapshot, getZfsDatasets, getZfsPools, promoteZfsDataset } from '../api/zfsAPI';
import {
  allNodeNames,
  buildTree,
  capacityVariant,
  humanSize,
  nodeMatches,
  toggleIn,
  usedPercent,
} from '../utils/zfsUtils';

import {
  CloneSnapshotModal,
  CreateDatasetModal,
  DatasetPropertiesModal,
  DestroyDatasetModal,
  RenameDatasetModal,
  RollbackSnapshotModal,
  SnapshotCreateModal,
  SnapshotHoldsModal,
} from './ZfsDatasetModals';

const TYPE_TOGGLES = [
  { key: 'filesystem', label: 'host.zfsDatasetsPanel.filesystemToggle', icon: FaFolder },
  { key: 'volume', label: 'host.zfsDatasetsPanel.volumeToggle', icon: FaHardDrive },
  { key: 'snapshot', label: 'host.zfsDatasetsPanel.snapshotToggle', icon: FaCamera },
];

const ALL_SHOWN = { filesystem: true, volume: true, snapshot: true };

const TypeGlyph = ({ row, depth }) => {
  if (depth === 0) {
    return <FaDatabase className="text-muted" aria-hidden="true" />;
  }
  return row.type === 'volume' ? (
    <FaHardDrive className="text-muted" aria-hidden="true" />
  ) : (
    <FaFolder className="text-muted" aria-hidden="true" />
  );
};

TypeGlyph.propTypes = {
  row: PropTypes.object.isRequired,
  depth: PropTypes.number.isRequired,
};

const UsageBar = ({ row }) => {
  const { t } = useTranslation();
  const bar = useRef(null);
  const percent = usedPercent(row.used, row.avail);
  useCssVar(bar, '--progress-width', `${percent || 0}%`);
  if (percent === null) {
    return null;
  }
  return (
    <div
      className="progress flex-shrink-0 zfs-usage"
      role="progressbar"
      aria-label={t('host.usageBar.ariaLabel', { name: row.name })}
      aria-valuenow={percent}
      aria-valuemin={0}
      aria-valuemax={100}
      title={t('host.usageBar.title', { percent, used: row.used, avail: row.avail })}
    >
      <div ref={bar} className={`progress-bar progress-fill bg-${capacityVariant(percent)}`} />
    </div>
  );
};

UsageBar.propTypes = {
  row: PropTypes.object.isRequired,
};

const TreeLine = ({ depth, children, name = '' }) => {
  const line = useRef(null);
  useCssVar(line, '--zfs-depth', String(depth));
  return (
    <div
      ref={line}
      className="d-flex align-items-center gap-2 border-bottom py-1 zfs-tree-line"
      data-dataset={name || undefined}
    >
      {children}
    </div>
  );
};

TreeLine.propTypes = {
  depth: PropTypes.number.isRequired,
  children: PropTypes.node.isRequired,
  name: PropTypes.string,
};

const DatasetRow = ({ node, depth, isCollapsed, hasContent, showSnapshots, busy, handlers }) => {
  const { t } = useTranslation();
  return (
    <TreeLine depth={depth} name={node.name}>
      {hasContent ? (
        <button
          type="button"
          className="btn btn-sm btn-link p-0 text-decoration-none zfs-caret"
          data-action="toggle"
          aria-label={t(
            isCollapsed ? 'host.datasetRow.expandDataset' : 'host.datasetRow.collapseDataset',
            { name: node.name }
          )}
          onClick={() => handlers.onToggle(node.name)}
        >
          {isCollapsed ? <FaCaretRight aria-hidden="true" /> : <FaCaretDown aria-hidden="true" />}
        </button>
      ) : (
        <span className="zfs-caret" />
      )}
      <TypeGlyph row={node.row} depth={depth} />
      <span className={depth === 0 ? 'fw-bold' : 'fw-semibold'} title={node.name}>
        {node.label}
      </span>
      {node.row.type === 'volume' ? (
        <span className="badge text-bg-info">{t('host.datasetRow.volume')}</span>
      ) : null}
      {showSnapshots && node.snapshots.length > 0 ? (
        <span
          className="badge text-bg-secondary"
          title={t('host.datasetRow.snapshotsCountLabel', { count: node.snapshots.length })}
        >
          <FaCamera className="me-1" aria-hidden="true" />
          {node.snapshots.length}
        </span>
      ) : null}
      <span className="ms-auto d-flex align-items-center gap-2">
        <UsageBar row={node.row} />
        <span className="text-muted small text-nowrap" title={t('host.datasetRow.usageInfo')}>
          {`${humanSize(node.row.used)} / ${humanSize(node.row.avail)} / ${humanSize(node.row.refer)}`}
        </span>
        {node.row.mountpoint && node.row.mountpoint !== '-' ? (
          <code
            className="small text-muted d-none d-lg-inline"
            title={t('host.datasetRow.mountpointTitle')}
          >
            {node.row.mountpoint}
          </code>
        ) : null}
        <button
          type="button"
          className="btn btn-sm btn-outline-primary py-0"
          data-action="dataset-snapshot"
          title={t('host.datasetRow.snapshotButton')}
          aria-label={t('host.datasetRow.snapshotButton')}
          onClick={() => handlers.onModal({ kind: 'snapshot', name: node.name })}
          disabled={busy}
        >
          <FaCamera aria-hidden="true" />
        </button>
        <RowMenu label={<FaGear aria-label={t('host.datasetRow.moreActionsTitle')} />}>
          <Dropdown.Item
            as="button"
            type="button"
            data-action="dataset-create-child"
            onClick={() => handlers.onModal({ kind: 'create', name: `${node.name}/` })}
          >
            <FaPlus className="me-2" aria-hidden="true" />
            {t('host.datasetRow.createChildDataset')}
          </Dropdown.Item>
          <Dropdown.Item
            as="button"
            type="button"
            data-action="dataset-properties"
            onClick={() => handlers.onModal({ kind: 'properties', name: node.name })}
          >
            <FaSliders className="me-2" aria-hidden="true" />
            {t('host.datasetRow.datasetProperties')}
          </Dropdown.Item>
          <Dropdown.Item
            as="button"
            type="button"
            data-action="dataset-rename"
            onClick={() => handlers.onModal({ kind: 'rename', name: node.name })}
          >
            <FaICursor className="me-2" aria-hidden="true" />
            {t('host.datasetRow.renameDataset')}
          </Dropdown.Item>
          <Dropdown.Item
            as="button"
            type="button"
            data-action="dataset-promote"
            title={t('host.datasetRow.promoteCloneTitle')}
            onClick={() => handlers.onModal({ kind: 'promote', name: node.name })}
          >
            <FaArrowUp className="me-2" aria-hidden="true" />
            {t('host.datasetRow.promoteClone')}
          </Dropdown.Item>
          <Dropdown.Divider />
          <Dropdown.Item
            as="button"
            type="button"
            data-action="dataset-destroy"
            onClick={() =>
              handlers.onModal({ kind: 'destroy', name: node.name, isSnapshot: false })
            }
          >
            <FaTrash className="text-danger me-2" aria-hidden="true" />
            {t('host.datasetRow.destroyDataset')}
          </Dropdown.Item>
        </RowMenu>
      </span>
    </TreeLine>
  );
};

DatasetRow.propTypes = {
  node: PropTypes.object.isRequired,
  depth: PropTypes.number.isRequired,
  isCollapsed: PropTypes.bool.isRequired,
  hasContent: PropTypes.bool.isRequired,
  showSnapshots: PropTypes.bool.isRequired,
  busy: PropTypes.bool.isRequired,
  handlers: PropTypes.object.isRequired,
};

const SnapshotRow = ({ snap, depth, busy, isSelected, handlers }) => {
  const { t } = useTranslation();
  return (
    <TreeLine depth={depth} name={snap.name}>
      <span className="zfs-caret" />
      <input
        type="checkbox"
        className="form-check-input flex-shrink-0 mt-0"
        checked={isSelected}
        onChange={() => handlers.onSelect(snap.name)}
        disabled={busy}
        aria-label={t('host.snapshotRow.selectSnapshot', { name: snap.name })}
      />
      <FaCamera className="text-muted" aria-hidden="true" />
      <code className="small" title={snap.name}>
        @{snap.name.split('@')[1] || snap.name}
      </code>
      <span className="ms-auto d-flex align-items-center gap-2">
        <span className="text-muted small text-nowrap" title={t('host.snapshotRow.usageInfoSnap')}>
          {`${humanSize(snap.used)} / ${humanSize(snap.refer)}`}
        </span>
        <button
          type="button"
          className="btn btn-sm btn-outline-warning py-0"
          data-action="snapshot-rollback"
          title={t('host.snapshotRow.rollbackTitle')}
          aria-label={t('host.snapshotRow.rollbackTitle')}
          onClick={() => handlers.onModal({ kind: 'rollback', name: snap.name })}
          disabled={busy}
        >
          <FaClockRotateLeft aria-hidden="true" />
        </button>
        <RowMenu label={<FaGear aria-label={t('host.datasetRow.moreActionsTitle')} />}>
          <Dropdown.Item
            as="button"
            type="button"
            data-action="snapshot-clone"
            onClick={() => handlers.onModal({ kind: 'clone', name: snap.name })}
          >
            <FaClone className="me-2" aria-hidden="true" />
            {t('host.snapshotRow.cloneSnapshot')}
          </Dropdown.Item>
          <Dropdown.Item
            as="button"
            type="button"
            data-action="snapshot-holds"
            onClick={() => handlers.onModal({ kind: 'holds', name: snap.name })}
          >
            <FaLock className="me-2" aria-hidden="true" />
            {t('host.snapshotRow.snapshotHolds')}
          </Dropdown.Item>
          <Dropdown.Divider />
          <Dropdown.Item
            as="button"
            type="button"
            data-action="snapshot-destroy"
            onClick={() => handlers.onModal({ kind: 'destroy', name: snap.name, isSnapshot: true })}
          >
            <FaTrash className="text-danger me-2" aria-hidden="true" />
            {t('host.snapshotRow.destroySnapshot')}
          </Dropdown.Item>
        </RowMenu>
      </span>
    </TreeLine>
  );
};

SnapshotRow.propTypes = {
  snap: PropTypes.object.isRequired,
  depth: PropTypes.number.isRequired,
  busy: PropTypes.bool.isRequired,
  isSelected: PropTypes.bool.isRequired,
  handlers: PropTypes.object.isRequired,
};

const TreeNode = ({ node, depth, view, busy, handlers }) => {
  const { t } = useTranslation();
  const { needle, show, collapsed, snapsOpen, selected } = view;
  if (!nodeMatches(node, needle, show)) {
    return null;
  }
  const isCollapsed = !needle && collapsed.has(node.name);
  const snapsMatch = node.snapshots.some(snap => snap.name.toLowerCase().includes(needle));
  const snapsVisible = snapsOpen.has(node.name) || (needle !== '' && snapsMatch);
  const hasContent = node.children.length > 0 || (show.snapshot && node.snapshots.length > 0);
  const snapshots = show.snapshot && node.snapshots.length > 0;
  return (
    <>
      <DatasetRow
        node={node}
        depth={depth}
        isCollapsed={isCollapsed}
        hasContent={hasContent}
        showSnapshots={show.snapshot}
        busy={busy}
        handlers={handlers}
      />
      {!isCollapsed && snapshots ? (
        <TreeLine depth={depth + 1}>
          <button
            type="button"
            className="btn btn-sm btn-link p-0 text-decoration-none zfs-caret"
            data-action="toggle-snapshots"
            aria-label={t(
              snapsVisible ? 'host.treeNode.collapseSnapshots' : 'host.treeNode.expandSnapshots',
              { name: node.name }
            )}
            onClick={() => handlers.onToggleSnaps(node.name)}
          >
            {snapsVisible ? (
              <FaCaretDown aria-hidden="true" />
            ) : (
              <FaCaretRight aria-hidden="true" />
            )}
          </button>
          <FaCamera className="text-muted" aria-hidden="true" />
          <span className="text-muted small">
            {t('host.treeNode.snapshotCountLabel', { count: node.snapshots.length })}
          </span>
        </TreeLine>
      ) : null}
      {!isCollapsed && snapshots && snapsVisible
        ? node.snapshots.map(snap => (
            <SnapshotRow
              key={snap.name}
              snap={snap}
              depth={depth + 2}
              busy={busy}
              isSelected={selected.has(snap.name)}
              handlers={handlers}
            />
          ))
        : null}
      {!isCollapsed
        ? node.children.map(child => (
            <TreeNode
              key={child.name}
              node={child}
              depth={depth + 1}
              view={view}
              busy={busy}
              handlers={handlers}
            />
          ))
        : null}
    </>
  );
};

TreeNode.propTypes = {
  node: PropTypes.object.isRequired,
  depth: PropTypes.number.isRequired,
  view: PropTypes.shape({
    needle: PropTypes.string.isRequired,
    show: PropTypes.object.isRequired,
    collapsed: PropTypes.instanceOf(Set).isRequired,
    snapsOpen: PropTypes.instanceOf(Set).isRequired,
    selected: PropTypes.instanceOf(Set).isRequired,
  }).isRequired,
  busy: PropTypes.bool.isRequired,
  handlers: PropTypes.object.isRequired,
};

const DatasetDialogs = ({ id, modal, pools, tools, onClose }) => {
  if (!modal) {
    return null;
  }
  const { kind, name } = modal;
  if (kind === 'create') {
    return (
      <CreateDatasetModal
        id={id}
        pools={pools}
        initialName={name || ''}
        tools={tools}
        onClose={onClose}
      />
    );
  }
  if (kind === 'snapshot') {
    return <SnapshotCreateModal id={id} dataset={name} tools={tools} onClose={onClose} />;
  }
  if (kind === 'rename') {
    return <RenameDatasetModal id={id} dataset={name} tools={tools} onClose={onClose} />;
  }
  if (kind === 'clone') {
    return <CloneSnapshotModal id={id} snapshot={name} tools={tools} onClose={onClose} />;
  }
  if (kind === 'rollback') {
    return <RollbackSnapshotModal id={id} snapshot={name} tools={tools} onClose={onClose} />;
  }
  if (kind === 'holds') {
    return <SnapshotHoldsModal id={id} snapshot={name} tools={tools} onClose={onClose} />;
  }
  if (kind === 'properties') {
    return <DatasetPropertiesModal id={id} dataset={name} tools={tools} onClose={onClose} />;
  }
  if (kind === 'destroy') {
    return (
      <DestroyDatasetModal
        id={id}
        name={name}
        isSnapshot={Boolean(modal.isSnapshot)}
        tools={tools}
        onClose={onClose}
      />
    );
  }
  return null;
};

DatasetDialogs.propTypes = {
  id: PropTypes.string.isRequired,
  modal: PropTypes.object,
  pools: PropTypes.arrayOf(PropTypes.string).isRequired,
  tools: PropTypes.object.isRequired,
  onClose: PropTypes.func.isRequired,
};

const listOf = answer => (Array.isArray(answer?.datasets) ? answer.datasets : []);

/**
 * The ZFS dataset manager, hyperweaver-ui's datasets panel: the pool's
 * real hierarchy as an expandable tree, filesystems and volumes nested
 * by name, each dataset's snapshots folded under it, usage as a bar, a
 * search over the names, a pool filter and the three type toggles;
 * Create dataset, Destroy selected snapshots, Expand all and Collapse
 * all in the heading. The datasets and the snapshots are read as two
 * sweeps as the panel opens and again when `turn` moves, the page's
 * Refresh and the end of a task this page queued. Every write is a
 * queued task through `tools`, one notice; Promote and the bulk destroy
 * confirm first behind the typed word. With `snapshotsOpen` every
 * dataset's snapshots are unfolded as the tree is read, the Snapshots
 * page's view of the same tree.
 */
const ZfsDatasetsPanel = ({ id, turn, tools, snapshotsOpen = false }) => {
  const { t } = useTranslation();
  const status = useStatus();
  const notify = useNotify();
  const [tree, setTree] = useState([]);
  const [pools, setPools] = useState([]);
  const [poolFilter, setPoolFilter] = useState('');
  const [nameFilter, setNameFilter] = useState('');
  const [collapsed, setCollapsed] = useState(() => new Set());
  const [snapsOpen, setSnapsOpen] = useState(() => new Set());
  const [show, setShow] = useState(ALL_SHOWN);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState('');
  const [modal, setModal] = useState(null);
  const [selected, setSelected] = useState(() => new Set());
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkBusy, setBulkBusy] = useState(false);

  const take = useCallback(
    ([datasets, snapshots]) => {
      if (datasets.status === 'rejected') {
        setFailed(
          t('host.zfsDatasetsPanel.errorLoadDatasets', { message: datasets.reason.message })
        );
        setLoaded(true);
        return;
      }
      setFailed(
        snapshots.status === 'rejected'
          ? t('host.zfsDatasetsPanel.errorListSnapshots', { message: snapshots.reason.message })
          : ''
      );
      const merged = new Map();
      [
        ...listOf(datasets.value),
        ...(snapshots.status === 'fulfilled' ? listOf(snapshots.value) : []),
      ].forEach(row => merged.set(row.name, row));
      const built = buildTree([...merged.values()]);
      setTree(built);
      if (snapshotsOpen) {
        setSnapsOpen(new Set(allNodeNames(built)));
      }
      setSelected(previous => new Set([...previous].filter(name => merged.has(name))));
      setLoaded(true);
    },
    [t, snapshotsOpen]
  );

  const load = useCallback(() => {
    const base = { recursive: true, ...(poolFilter ? { pool: poolFilter } : {}) };
    return Promise.allSettled([
      getZfsDatasets(status, id, base),
      getZfsDatasets(status, id, { ...base, type: 'snapshot' }),
    ]).then(take);
  }, [status, id, poolFilter, take]);

  useEffect(() => {
    load();
  }, [load, turn]);

  useEffect(() => {
    getZfsPools(status, id).then(
      answer => setPools(Array.isArray(answer?.pools) ? answer.pools.map(pool => pool.name) : []),
      () => setPools([])
    );
  }, [status, id, turn]);

  const promote = name =>
    tools.send({
      call: () => promoteZfsDataset(status, id, name),
      doneKey: 'host.zfsDatasetsPanel.promoteQueuedMessage',
      values: { name },
    });

  const bulkDestroy = async () => {
    const targets = [...selected];
    setBulkBusy(true);
    const answers = await Promise.allSettled(
      targets.map(name => destroyZfsSnapshot(status, id, name))
    );
    setBulkBusy(false);
    setBulkOpen(false);
    setSelected(new Set());
    answers.forEach(answer => {
      if (answer.status === 'fulfilled') {
        tools.watch(answer.value);
      }
    });
    const failures = answers
      .map((answer, index) =>
        answer.status === 'rejected' ? `${targets[index]}: ${answer.reason.message}` : ''
      )
      .filter(Boolean);
    if (failures.length > 0) {
      notify(
        'danger',
        t('host.zfsDatasetsPanel.bulkFailuresMessage', {
          count: failures.length,
          list: failures.join('; '),
        })
      );
    } else {
      notify(
        'success',
        t('host.zfsDatasetsPanel.bulkDestroyQueuedMessage', { count: targets.length })
      );
    }
  };

  const handlers = {
    onModal: setModal,
    onToggle: name => setCollapsed(previous => toggleIn(previous, name)),
    onToggleSnaps: name => setSnapsOpen(previous => toggleIn(previous, name)),
    onSelect: name => setSelected(previous => toggleIn(previous, name)),
  };

  const needle = nameFilter.trim().toLowerCase();
  const view = { needle, show, collapsed, snapsOpen, selected };
  const roots = tree.filter(node => nodeMatches(node, needle, show));
  const busy = tools.busy || bulkBusy;
  const title = t('host.zfsDatasetsPanel.datasetsHeading');

  const actions = (
    <>
      <button
        type="button"
        className="btn btn-sm btn-outline-danger"
        data-action="snapshots-destroy-selected"
        title={t('host.zfsDatasetsPanel.destroySelectedTitle')}
        onClick={() => setBulkOpen(true)}
        disabled={busy || selected.size === 0}
      >
        <FaTrash className="me-2" aria-hidden="true" />
        {t('host.zfsDatasetsPanel.destroySelectedCount', { count: selected.size })}
      </button>
      <button
        type="button"
        className="btn btn-sm btn-outline-secondary"
        data-action="expand-all"
        title={t('host.zfsDatasetsPanel.expandAllTitle')}
        aria-label={t('host.zfsDatasetsPanel.expandAllTitle')}
        onClick={() => setCollapsed(new Set())}
      >
        <FaAnglesDown aria-hidden="true" />
      </button>
      <button
        type="button"
        className="btn btn-sm btn-outline-secondary"
        data-action="collapse-all"
        title={t('host.zfsDatasetsPanel.collapseAllTitle')}
        aria-label={t('host.zfsDatasetsPanel.collapseAllTitle')}
        onClick={() => {
          setCollapsed(new Set(allNodeNames(tree)));
          setSnapsOpen(new Set());
        }}
      >
        <FaAnglesUp aria-hidden="true" />
      </button>
      <button
        type="button"
        className="btn btn-sm btn-primary"
        data-action="dataset-create"
        onClick={() => setModal({ kind: 'create' })}
        disabled={busy}
      >
        <FaPlus className="me-2" aria-hidden="true" />
        {t('host.zfsDatasetsPanel.createDataset')}
      </button>
    </>
  );

  return (
    <div data-panel="storage-zfs-datasets" data-count={tree.length}>
      <SectionHeading title={title} actions={actions} />
      <div className="row g-2 mb-3">
        <div className="col-12 col-md-5">
          <input
            className="form-control form-control-sm"
            type="search"
            name="dataset-search"
            placeholder={t('host.zfsDatasetsPanel.searchPlaceholder')}
            aria-label={t('host.zfsDatasetsPanel.searchLabel')}
            value={nameFilter}
            onChange={event => setNameFilter(event.target.value)}
          />
        </div>
        <div className="col-12 col-md-3">
          <select
            className="form-select form-select-sm"
            name="dataset-pool"
            aria-label={t('host.zfsDatasetsPanel.filterLabel')}
            value={poolFilter}
            onChange={event => setPoolFilter(event.target.value)}
          >
            <option value="">{t('host.zfsDatasetsPanel.allPoolsOption')}</option>
            {pools.map(pool => (
              <option key={pool} value={pool}>
                {pool}
              </option>
            ))}
          </select>
        </div>
        <div className="col-12 col-md-4">
          <div
            className="btn-group btn-group-sm w-100"
            role="group"
            aria-label={t('host.zfsDatasetsPanel.showTypesLabel')}
          >
            {TYPE_TOGGLES.map(({ key, label, icon: Icon }) => {
              const word = t(label);
              return (
                <button
                  type="button"
                  key={key}
                  className={`btn ${show[key] ? 'btn-primary' : 'btn-outline-secondary'}`}
                  data-type-toggle={key}
                  aria-pressed={show[key]}
                  title={t(
                    show[key]
                      ? 'host.zfsDatasetsPanel.hideTypeTitle'
                      : 'host.zfsDatasetsPanel.showTypeTitle',
                    {
                      label: word.toLowerCase(),
                    }
                  )}
                  onClick={() => setShow(previous => ({ ...previous, [key]: !previous[key] }))}
                >
                  <Icon className="me-1" aria-hidden="true" />
                  {word}
                </button>
              );
            })}
          </div>
        </div>
      </div>
      {failed ? (
        <div className="alert alert-danger py-2" role="alert" data-note="datasets-failed">
          {failed}
        </div>
      ) : null}
      {!loaded ? <p className="text-muted">{t('pages.loading')}</p> : null}
      {loaded && roots.length === 0 ? (
        <p className="text-muted mb-0" data-note="datasets-empty">
          {t(
            tree.length === 0
              ? 'host.zfsDatasetsPanel.noDatasetsText'
              : 'host.zfsDatasetsPanel.noMatchText'
          )}
        </p>
      ) : null}
      {roots.length > 0 ? (
        <div className="border rounded px-2" data-tree="datasets">
          {roots.map(node => (
            <TreeNode
              key={node.name}
              node={node}
              depth={0}
              view={view}
              busy={busy}
              handlers={handlers}
            />
          ))}
        </div>
      ) : null}
      <DatasetDialogs
        id={id}
        modal={modal}
        pools={pools}
        tools={tools}
        onClose={() => setModal(null)}
      />
      <ConfirmModal
        show={modal?.kind === 'promote'}
        handleClose={() => setModal(null)}
        handleConfirm={() => promote(modal.name)}
        title={t('host.promoteConfirmModal.title')}
        message={
          modal?.kind === 'promote'
            ? t('host.promoteConfirmModal.message', { name: modal.name })
            : ''
        }
        keyword={t('host.promoteConfirmModal.confirmText').toLowerCase()}
        confirmText={t('host.promoteConfirmModal.confirmText')}
      />
      <ConfirmModal
        show={bulkOpen}
        handleClose={() => setBulkOpen(false)}
        handleConfirm={bulkDestroy}
        title={t('host.zfsDatasetsPanel.bulkDestroyTitle', { count: selected.size })}
        message={t('host.zfsDatasetsPanel.bulkDestroyMessage', { names: [...selected].join(', ') })}
        keyword={t('hosts.storage.destroyWord')}
        confirmText={t('host.zfsDatasetsPanel.bulkDestroyConfirm', { count: selected.size })}
      />
    </div>
  );
};

ZfsDatasetsPanel.propTypes = {
  id: PropTypes.string.isRequired,
  turn: PropTypes.number.isRequired,
  tools: PropTypes.shape({
    send: PropTypes.func.isRequired,
    watch: PropTypes.func.isRequired,
    busy: PropTypes.bool.isRequired,
  }).isRequired,
  snapshotsOpen: PropTypes.bool,
};

export default ZfsDatasetsPanel;
