import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import {
  FaArrowsTurnRight,
  FaCircleInfo,
  FaCopy,
  FaDownload,
  FaTrash,
  FaTriangleExclamation,
} from 'react-icons/fa6';

import { fileLevelColumns } from '../../../components/common/levelColumns';
import RecordRows from '../../../components/common/RecordRows';
import { drawnColumns, hasAny } from '../../../components/common/SubTable';
import { listWord } from '../../../utils/closedLists';
import { hostFileGroupsOf, matchesHostFile } from '../utils/hostFiles';
import { ARTIFACT_TYPES } from '../utils/manageCatalog';

import { DeleteArtifactsModal } from './InstallerFilesModals';

/**
 * The status words of a file in the host's cache, each the key of its
 * badge and the key of its tooltip: missing, mismatch, verified,
 * unhashed and hashed.
 */
export const STATUS_KEYS = {
  missing: ['host.installerFiles.statusMissing', 'host.installerFiles.statusMissingTitle'],
  mismatch: ['host.installerFiles.statusMismatch', 'host.installerFiles.statusMismatchTitle'],
  verified: ['host.installerFiles.statusVerified', 'host.installerFiles.statusVerifiedTitle'],
  unhashed: ['host.installerFiles.statusUnhashed', 'host.installerFiles.statusUnhashedTitle'],
  hashed: ['host.installerFiles.statusHashed', 'host.installerFiles.statusHashedTitle'],
};

const statusTitle = (item, t) => {
  const [, titleKey] = STATUS_KEYS[item.status];
  const values =
    item.status === 'mismatch'
      ? {
          ...item.statusValues,
          expected: item.statusValues.expected || t('host.installerFiles.recordedExpectation'),
        }
      : item.statusValues;
  return t(titleKey, values);
};

const textColumn = (key, labelKey, priority, member) => ({
  key,
  kind: 'text',
  labelKey,
  priority,
  when: hasAny(item => item[member]),
  value: item => item[member] || '',
});

/**
 * The columns of a host's files, the downloads collection's file level
 * with the host's own after it: the name, the kind, platform,
 * architecture and language as closed-list words, the size and the
 * checksum, then the product while the listing is not grouped by it, the
 * release and the patch of the registry, the version the agent parsed,
 * the storage location and the status badge with its tooltip.
 */
export const HOST_FILE_COLUMNS = [
  ...fileLevelColumns(),
  {
    ...textColumn('product', 'host.installerFiles.colProduct', 3, 'product'),
    when: (rows, ctx) => rows.length > 0 && ctx.groupedBy !== 'family',
  },
  textColumn('release', 'host.installerFiles.colRelease', 4, 'release'),
  textColumn('patch', 'host.installerFiles.colPatch', 5, 'patch'),
  {
    key: 'version',
    kind: 'text',
    labelKey: 'host.installerFiles.colVersion',
    priority: 5,
    value: item => item.version || '',
    render: item => <span className="small">{item.version || '-'}</span>,
  },
  {
    key: 'location',
    kind: 'text',
    labelKey: 'host.installerFiles.colLocation',
    priority: 6,
    value: item => item.location || '',
    render: item => <span className="small">{item.location || '-'}</span>,
  },
  {
    key: 'status',
    kind: 'badge',
    labelKey: 'host.installerFiles.colStatus',
    value: item => item.status,
    render: (item, ctx) => (
      <span className={`badge text-bg-${item.statusTone}`} title={statusTitle(item, ctx.t)}>
        {ctx.t(STATUS_KEYS[item.status][0])}
      </span>
    ),
  },
];

/**
 * The filter groups of a host's files: the product, the organization,
 * the kind, the storage location and the status.
 */
export const HOST_FILE_FILTERS = [
  {
    key: 'family',
    labelKey: 'host.installerFiles.colProduct',
    values: item => (item.family ? [item.family] : []),
    activeClass: 'bg-primary',
  },
  {
    key: 'vendor',
    labelKey: 'pages.filter.vendor',
    values: item => (item.vendor ? [item.vendor] : []),
    activeClass: 'bg-secondary',
  },
  {
    key: 'kind',
    labelKey: 'pages.filter.kind',
    values: item => (item.kind ? [item.kind] : []),
    order: ARTIFACT_TYPES,
    activeClass: 'bg-success',
    labelFor: (value, t) => listWord(t, 'kind', value),
  },
  {
    key: 'location',
    labelKey: 'host.installerFiles.colLocation',
    values: item => (item.location ? [item.location] : []),
    activeClass: 'bg-info',
  },
  {
    key: 'status',
    labelKey: 'host.installerFiles.colStatus',
    values: item => [item.status],
    order: Object.keys(STATUS_KEYS),
    activeClass: 'bg-warning text-dark',
    labelFor: (value, t) => t(STATUS_KEYS[value][0]),
  },
];

const ACTIONS = [
  ['details', FaCircleInfo, 'host.installerFiles.details', 'btn-outline-secondary', false],
  ['download', FaDownload, 'host.installerFiles.download', 'btn-outline-secondary', true],
  ['move', FaArrowsTurnRight, 'host.installerFiles.moveToLocation', 'btn-outline-secondary', true],
  ['copy', FaCopy, 'host.installerFiles.copyToLocation', 'btn-outline-secondary', true],
  ['delete', FaTrash, 'host.installerFiles.deleteEntry', 'btn-outline-danger', false],
];

/**
 * The actions of one file row: the warning glyph on a missing file,
 * which hands the row to `ctx.files.onFetch`, then Details, Download,
 * Move to location and Copy to location, the three held while the file
 * is missing, and Delete, each handing the artifact row to
 * `ctx.files.onAction`.
 */
export const HostFileRowActions = ({ item, ctx }) => {
  const { t } = useTranslation();
  const { busy, onAction, onFetch } = ctx.files;
  const missing = !item.fileExists;
  const fetchLabel = t('host.installerFiles.fetchMissing', { filename: item.name });
  return (
    <span className="d-inline-flex align-items-center gap-1" data-artifact={item.id}>
      {missing ? (
        <button
          type="button"
          className="btn btn-sm btn-outline-warning"
          title={fetchLabel}
          aria-label={fetchLabel}
          data-action="artifact-fetch"
          disabled={busy}
          onClick={() => onFetch(item.artifact)}
        >
          <FaTriangleExclamation aria-hidden="true" />
        </button>
      ) : null}
      {ACTIONS.map(([action, Icon, labelKey, tone, needsFile]) => (
        <button
          key={action}
          type="button"
          className={`btn btn-sm ${tone}`}
          title={t(labelKey)}
          aria-label={t(labelKey)}
          data-action={action}
          disabled={busy || (needsFile && missing)}
          onClick={() => onAction(action, item.artifact)}
        >
          <Icon aria-hidden="true" />
        </button>
      ))}
    </span>
  );
};

HostFileRowActions.propTypes = {
  item: PropTypes.shape({
    id: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    fileExists: PropTypes.bool.isRequired,
    artifact: PropTypes.object.isRequired,
  }).isRequired,
  ctx: PropTypes.shape({
    files: PropTypes.shape({
      busy: PropTypes.bool.isRequired,
      onAction: PropTypes.func.isRequired,
      onFetch: PropTypes.func.isRequired,
    }).isRequired,
  }).isRequired,
};

/**
 * The body of one file's card: the drawn columns as record rows, the
 * value each cell would have drawn.
 */
const HostFileCardBody = ({ item, ctx }) => {
  const { t } = useTranslation();
  const columns = drawnColumns(HOST_FILE_COLUMNS, [item], ctx).filter(
    column => column.key !== 'name'
  );
  return (
    <RecordRows
      className="mb-0"
      rows={columns.map(column => ({
        key: column.key,
        label: t(column.labelKey),
        value: column.render ? column.render(item, ctx) : column.value(item, ctx),
      }))}
    />
  );
};

HostFileCardBody.propTypes = {
  item: PropTypes.object.isRequired,
  ctx: PropTypes.object.isRequired,
};

/**
 * The dialog of the listing's Delete selected, the delete dialog with
 * its files-too switch, its answer the `delete_files` member the bulk
 * delete carries.
 */
const HostFileBulkDialog = ({ count, onSubmit, onClose }) => (
  <DeleteArtifactsModal
    count={count}
    busy={false}
    onClose={onClose}
    onSubmit={filesToo => onSubmit({ delete_files: filesToo })}
  />
);

HostFileBulkDialog.propTypes = {
  count: PropTypes.number.isRequired,
  onSubmit: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
};

const HOST_FILE_BULK = [
  {
    key: 'delete',
    labelKey: 'host.installerFiles.deleteEntries',
    variant: 'btn-outline-danger',
    confirm: false,
    dialog: 'delete',
    picker: '',
  },
];

/**
 * The downloads collection as a host draws its cache: every file the
 * host knows as one row of the file level, grouped by product unless the
 * person groups otherwise, the product, organization, kind, location
 * and status groups, the table by default and cards as the toggle, no
 * item pages and no watches, Delete selected the one bulk action through
 * the adapter's `bulk`, and the row actions over `ctx.files`.
 *
 * @param {Object} options - What differs per host
 * @param {Object} options.adapter - The adapter of `hostFilesAdapter`
 * @returns {Object} The collection
 */
export const hostFilesCollection = ({ adapter }) => ({
  key: 'host-files',
  labelKey: 'host.installerFiles.title',
  countKey: 'host.installerFilesModals.filesCount',
  icon: FaDownload,
  segment: 'installers',
  hasVersions: false,
  hasProviders: false,
  leafIsFile: true,
  itemRoute: false,
  searchKey: 'host.installerFiles.search',
  defaultView: 'table',
  adapter,
  canManage: () => false,
  manages: () => true,
  matches: matchesHostFile,
  filterGroups: HOST_FILE_FILTERS,
  columns: HOST_FILE_COLUMNS,
  defaultSort: [{ column: 'name', direction: 'asc' }],
  defaultGroup: 'family',
  groupsOf: hostFileGroupsOf,
  levels: {
    versions: { labelKey: 'pages.table.files', countKey: 'host.installerFilesModals.filesCount' },
  },
  bulk: { items: HOST_FILE_BULK },
  slots: {
    RowActions: HostFileRowActions,
    CardBody: HostFileCardBody,
    BulkDialog: HostFileBulkDialog,
  },
});
