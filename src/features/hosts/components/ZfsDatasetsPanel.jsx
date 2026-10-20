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
import { useStatus } from '../../../contexts/StatusContext';
import { useCssVar } from '../../../hooks/useCssVar';
import { getZfsDatasets, getZfsPools, promoteZfsDataset } from '../api/zfsAPI';
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

const SnapshotRow = ({ snap, depth, busy, isSelected = null, handlers }) => {
  const { t } = useTranslation();
  return (
    <TreeLine depth={depth} name={snap.name}>
      <span className="zfs-caret" />
      {isSelected === null ? null : (
        <input
          type="checkbox"
          className="form-check-input flex-shrink-0 mt-0"
          checked={isSelected}
          onChange={() => handlers.onSelect(snap.name)}
          disabled={busy}
          aria-label={t('host.snapshotRow.selectSnapshot', { name: snap.name })}
        />
      )}
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
  isSelected: PropTypes.bool,
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
              isSelected={selected ? selected.has(snap.name) : null}
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
    selected: PropTypes.instanceOf(Set),
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
 * Every snapshot row of a dataset tree, the roots' and their
 * descendants'.
 *
 * @param {Array<Object>} nodes - The nodes of `buildTree`
 * @returns {Array<Object>} The snapshot rows
 */
export const snapshotRowsOf = nodes =>
  nodes.flatMap(node => [...node.snapshots, ...snapshotRowsOf(node.children)]);

/**
 * The read of a host's dataset tree: the datasets and the snapshots read
 * as two sweeps as the caller draws and again when `turn` moves or the
 * pool filter changes, the pools' names for the pool filter, and with
 * `snapshotsOpen` every dataset's snapshots unfolded as the tree is read.
 *
 * @param {Object} options - `{ id, turn, snapshotsOpen? }`
 * @returns {{ tree: Array, pools: Array<string>, poolFilter: string, setPoolFilter: Function, snapsOpen: Set<string>, setSnapsOpen: Function, loaded: boolean, failed: string }} The tree and its state
 */
export const useDatasetTree = ({ id, turn, snapshotsOpen = false }) => {
  const { t } = useTranslation();
  const status = useStatus();
  const [tree, setTree] = useState([]);
  const [pools, setPools] = useState([]);
  const [poolFilter, setPoolFilter] = useState('');
  const [snapsOpen, setSnapsOpen] = useState(() => new Set());
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState('');

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

  return { tree, pools, poolFilter, setPoolFilter, snapsOpen, setSnapsOpen, loaded, failed };
};

/**
 * The tree of `useDatasetTree` under one heading: `title`, `count` as
 * muted text after it, and in its pane `lead`, Expand all, Collapse all,
 * Create dataset and `trail`; under it `searchBox`, where given, the pool
 * filter and the three type toggles, then the pool's real hierarchy,
 * filesystems and volumes nested by name, each dataset's snapshots
 * folded under it, usage as a bar, the rows narrowed by `needle`. Every
 * write is a queued task through `tools`, one notice; Promote confirms
 * first with a plain confirmation. `selection`, a `useSelection` keyed by
 * the snapshot's name, draws a checkbox on every snapshot row, its select
 * column; `busy` holds every control while the page's own write is in
 * flight.
 */
export const DatasetTree = ({
  id,
  data,
  tools,
  needle,
  title,
  count = null,
  lead = null,
  trail = null,
  searchBox = null,
  selection = null,
  busy: held = false,
}) => {
  const { t } = useTranslation();
  const status = useStatus();
  const { tree, pools, poolFilter, setPoolFilter, snapsOpen, setSnapsOpen, loaded, failed } = data;
  const [collapsed, setCollapsed] = useState(() => new Set());
  const [show, setShow] = useState(ALL_SHOWN);
  const [modal, setModal] = useState(null);

  const promote = name =>
    tools.send({
      call: () => promoteZfsDataset(status, id, name),
      doneKey: 'host.zfsDatasetsPanel.promoteQueuedMessage',
      values: { name },
    });

  const handlers = {
    onModal: setModal,
    onToggle: name => setCollapsed(previous => toggleIn(previous, name)),
    onToggleSnaps: name => setSnapsOpen(previous => toggleIn(previous, name)),
    onSelect: name => selection?.toggle(name),
  };

  const view = { needle, show, collapsed, snapsOpen, selected: selection?.selected || null };
  const roots = tree.filter(node => nodeMatches(node, needle, show));
  const busy = tools.busy || held;

  const actions = (
    <>
      {lead}
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
      {trail}
    </>
  );

  return (
    <div data-panel="storage-zfs-datasets" data-count={tree.length}>
      <SectionHeading title={title} count={count} actions={actions} />
      <div className="row g-2 mb-3">
        {searchBox ? <div className="col-12 col-md-5">{searchBox}</div> : null}
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
        variant="restart"
        typed={false}
        confirmText={t('host.promoteConfirmModal.confirmText')}
      />
    </div>
  );
};

const toolsShape = PropTypes.shape({
  send: PropTypes.func.isRequired,
  watch: PropTypes.func.isRequired,
  busy: PropTypes.bool.isRequired,
});

DatasetTree.propTypes = {
  id: PropTypes.string.isRequired,
  data: PropTypes.shape({
    tree: PropTypes.array.isRequired,
    pools: PropTypes.arrayOf(PropTypes.string).isRequired,
    poolFilter: PropTypes.string.isRequired,
    setPoolFilter: PropTypes.func.isRequired,
    snapsOpen: PropTypes.instanceOf(Set).isRequired,
    setSnapsOpen: PropTypes.func.isRequired,
    loaded: PropTypes.bool.isRequired,
    failed: PropTypes.string.isRequired,
  }).isRequired,
  tools: toolsShape.isRequired,
  needle: PropTypes.string.isRequired,
  title: PropTypes.string.isRequired,
  count: PropTypes.node,
  lead: PropTypes.node,
  trail: PropTypes.node,
  searchBox: PropTypes.node,
  selection: PropTypes.shape({
    selected: PropTypes.instanceOf(Set).isRequired,
    toggle: PropTypes.func.isRequired,
  }),
  busy: PropTypes.bool,
};

/**
 * The ZFS dataset manager of the Pools and datasets page, hyperweaver-ui's
 * datasets panel: the `DatasetTree` of `useDatasetTree` under the
 * Datasets heading with its own search box over the names, the tree read
 * again when `turn` moves, the page's Refresh and the end of a task this
 * page queued.
 */
const ZfsDatasetsPanel = ({ id, turn, tools }) => {
  const { t } = useTranslation();
  const data = useDatasetTree({ id, turn });
  const [nameFilter, setNameFilter] = useState('');
  const searchBox = (
    <input
      className="form-control form-control-sm"
      type="search"
      name="dataset-search"
      placeholder={t('host.zfsDatasetsPanel.searchPlaceholder')}
      aria-label={t('host.zfsDatasetsPanel.searchLabel')}
      value={nameFilter}
      onChange={event => setNameFilter(event.target.value)}
    />
  );
  return (
    <DatasetTree
      id={id}
      data={data}
      tools={tools}
      needle={nameFilter.trim().toLowerCase()}
      title={t('host.zfsDatasetsPanel.datasetsHeading')}
      searchBox={searchBox}
    />
  );
};

ZfsDatasetsPanel.propTypes = {
  id: PropTypes.string.isRequired,
  turn: PropTypes.number.isRequired,
  tools: toolsShape.isRequired,
};

export default ZfsDatasetsPanel;
