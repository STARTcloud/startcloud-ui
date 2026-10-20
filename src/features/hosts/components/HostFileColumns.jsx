import PropTypes from 'prop-types';
import { Dropdown } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { FaCircleInfo, FaDownload, FaTriangleExclamation } from 'react-icons/fa6';

import { fileLevelColumns } from '../../../components/common/levelColumns';
import RowMenu from '../../../components/common/RowMenu';
import { hasAny } from '../../../components/common/SubTable';
import { listWord } from '../../../utils/closedLists';
import { middleEllipsis } from '../../../utils/text';
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

const statusBadge = (item, ctx) => (
  <span className={`badge text-bg-${item.statusTone}`} title={statusTitle(item, ctx.t)}>
    {ctx.t(STATUS_KEYS[item.status][0])}
  </span>
);

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
 * the storage location cut in its middle with the full path as its
 * tooltip and the status badge with its tooltip.
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
    render: item =>
      item.location ? (
        <span className="small" title={item.location}>
          {middleEllipsis(item.location)}
        </span>
      ) : (
        <span className="small">-</span>
      ),
  },
  {
    key: 'status',
    kind: 'badge',
    labelKey: 'host.installerFiles.colStatus',
    value: item => item.status,
    render: statusBadge,
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

const GLYPHS = [
  ['download', FaDownload, 'host.installerFiles.download', 'btn-outline-primary', true],
  ['details', FaCircleInfo, 'host.installerFiles.details', 'btn-outline-secondary', false],
];

const TRANSFERS = [
  ['move', 'host.installerFiles.moveToLocation'],
  ['copy', 'host.installerFiles.copyToLocation'],
];

/**
 * The actions of one file row, the shape of a downloads file's: the
 * warning glyph on a missing file, which hands the row to
 * `ctx.files.onFetch`, then Download in the primary outline the shared
 * `DownloadAction` draws and Details, then the row's More menu, the one
 * `RowMenu`, holding Move to location and Copy to location and, under a
 * divider, Delete in the danger tone; Download, Move and Copy are held
 * while the file is missing, and each hands the artifact row to
 * `ctx.files.onAction`.
 */
export const HostFileRowActions = ({ item, ctx }) => {
  const { t } = useTranslation();
  const { busy, onAction, onFetch } = ctx.files;
  const missing = !item.fileExists;
  const fetchLabel = t('host.installerFiles.fetchMissing', { filename: item.name });
  const held = needsFile => busy || (needsFile && missing);
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
      {GLYPHS.map(([action, Icon, labelKey, tone, needsFile]) => (
        <button
          key={action}
          type="button"
          className={`btn btn-sm ${tone}`}
          title={t(labelKey)}
          aria-label={t(labelKey)}
          data-action={action}
          disabled={held(needsFile)}
          onClick={() => onAction(action, item.artifact)}
        >
          <Icon aria-hidden="true" />
        </button>
      ))}
      <RowMenu label={t('pages.table.more')}>
        {TRANSFERS.map(([action, labelKey]) => (
          <Dropdown.Item
            key={action}
            as="button"
            type="button"
            data-action={action}
            disabled={held(true)}
            onClick={() => onAction(action, item.artifact)}
          >
            {t(labelKey)}
          </Dropdown.Item>
        ))}
        <Dropdown.Divider />
        <Dropdown.Item
          as="button"
          type="button"
          className="text-danger"
          data-action="delete"
          disabled={held(false)}
          onClick={() => onAction('delete', item.artifact)}
        >
          {t('host.installerFiles.deleteEntry')}
        </Dropdown.Item>
      </RowMenu>
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
 * The chips of one file's card, the status badge with its tooltip the
 * Status column draws.
 */
const HostFileChips = ({ item, ctx }) => statusBadge(item, ctx);

HostFileChips.propTypes = {
  item: PropTypes.object.isRequired,
  ctx: PropTypes.object.isRequired,
};

const WORDS = ['kind', 'platform', 'architecture'];

/**
 * The foot line of one file's card, in the foot line's place and look of
 * every other card: the kind, platform and architecture as closed-list
 * words, the size, the version and the storage location, each only while
 * the file carries it, joined by a middle dot.
 */
const HostFileCardBody = ({ item, ctx }) => {
  const facts = [
    ...WORDS.filter(group => item[group]).map(group => listWord(ctx.t, group, item[group])),
    item.fileSize ? ctx.formatFileSize(item.fileSize) : '',
    item.version,
    item.location,
  ].filter(Boolean);
  return facts.length > 0 ? (
    <div className="d-flex align-items-center gap-3 small text-body-secondary">
      <span>{facts.join(' · ')}</span>
    </div>
  ) : null;
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
 * the adapter's `bulk`, the row actions over `ctx.files`, and each card
 * the status badge as its chip and the file's facts as its foot line.
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
    ItemChips: HostFileChips,
    CardBody: HostFileCardBody,
    BulkDialog: HostFileBulkDialog,
  },
});
