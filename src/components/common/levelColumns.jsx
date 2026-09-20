import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';

import { listWord } from '../../utils/closedLists';
import { providerPath, versionPath } from '../../utils/routes';

import ChecksumCell from './ChecksumCell';
import { createdColumn, statusColumn, updatedColumn, visibilityColumn } from './columns';
import { hasAny } from './SubTable';

const carriesAccess = hasAny(row => typeof row.isPublic === 'boolean');

const rowVisibilityColumn = { ...visibilityColumn, when: carriesAccess };

const rowStatusColumn = { ...statusColumn, when: carriesAccess };

const localeDate = value => (value ? new Date(value).toLocaleDateString() : '');

const nameBadges = names =>
  names.length > 0 ? (
    <span className="d-inline-flex flex-wrap gap-1">
      {names.map(name => (
        <span key={name} className="badge bg-secondary badge-xs">
          {name}
        </span>
      ))}
    </span>
  ) : (
    ''
  );

/**
 * The one download action of every table whose row is a file: the
 * `SubTable`'s `LeadActions` on the architectures and files tables, a
 * Download button in the Actions column while the row carries a
 * `downloadUrl`, drawn for every viewer the row is shown to because a
 * download is a read the row already granted.
 */
export const DownloadAction = ({ architecture, ctx }) =>
  architecture.downloadUrl ? (
    <a
      href={architecture.downloadUrl}
      className="btn btn-sm btn-outline-primary"
      target="_blank"
      rel="noopener noreferrer"
    >
      {ctx.t('pages.table.download')}
    </a>
  ) : null;

DownloadAction.propTypes = {
  architecture: PropTypes.shape({ downloadUrl: PropTypes.string }).isRequired,
  ctx: PropTypes.shape({ t: PropTypes.func.isRequired }).isRequired,
};

const downloadsColumn = {
  key: 'downloads',
  kind: 'count',
  labelKey: 'pages.table.downloads',
  sortValue: row => row.downloadCount || 0,
  when: hasAny(row => typeof row.downloadCount === 'number'),
  render: row => (typeof row.downloadCount === 'number' ? row.downloadCount : ''),
};

const sizeColumn = {
  key: 'size',
  kind: 'size',
  labelKey: 'pages.table.fileSize',
  sortValue: row => row.fileSize || 0,
  when: hasAny(row => row.fileSize),
  render: (row, ctx) => (row.fileSize ? ctx.formatFileSize(row.fileSize) : ''),
};

const checksumColumn = {
  key: 'checksum',
  kind: 'checksum',
  labelKey: 'pages.table.checksum',
  sortValue: row => (row.checksum || '').toLowerCase(),
  when: hasAny(row => row.checksum),
  render: row =>
    row.checksum ? (
      <ChecksumCell checksum={row.checksum} checksumType={row.checksumType || ''} />
    ) : (
      ''
    ),
};

/**
 * The columns the versions table of an item page draws, one level below the
 * item: the version with its deprecated badge, its visibility and status
 * badges where the host answers the row's own access words, when it was
 * released, its details, and the names of the level below it, whichever
 * of providers and artifacts the collection carries.
 *
 * @param {{org: string, name: string}} scope - The item the versions belong to
 * @returns {Array<Object>} The columns
 */
export const versionLevelColumns = ({ org, name }) => [
  {
    key: 'version',
    kind: 'link',
    labelKey: 'pages.table.version',
    sortValue: version => [new Date(version.createdAt || 0).getTime(), version.version],
    render: (version, ctx) => (
      <>
        <Link to={versionPath(ctx.collection, org, name, version.version)}>{version.version}</Link>
        {version.deprecated ? (
          <span className="badge bg-danger ms-2">{ctx.t('pages.status.deprecated')}</span>
        ) : null}
      </>
    ),
  },
  rowVisibilityColumn,
  rowStatusColumn,
  {
    key: 'released',
    kind: 'date',
    labelKey: 'pages.version.released',
    sortValue: version => new Date(version.createdAt || 0).getTime(),
    when: hasAny(version => version.createdAt),
    render: version => localeDate(version.createdAt),
  },
  {
    key: 'details',
    kind: 'text',
    labelKey: 'pages.table.details',
    sortValue: version => (version.description || '').toLowerCase(),
    when: hasAny(version => version.description),
    render: version => version.description,
  },
  {
    key: 'providers',
    kind: 'badges',
    labelKey: 'pages.table.providers',
    when: hasAny(version => (version.providers || []).length > 0),
    render: (version, ctx) =>
      (version.providers || []).map(provider => (
        <Link
          key={provider.name}
          to={providerPath(ctx.collection, org, name, version.version, provider.name)}
          className="badge bg-secondary bg-opacity-50 text-body text-decoration-none me-1"
        >
          {provider.name}
        </Link>
      )),
  },
  {
    key: 'artifacts',
    kind: 'badges',
    labelKey: 'pages.version.artifacts',
    when: hasAny(version => (version.artifacts || []).length > 0),
    render: (version, ctx) =>
      (version.artifacts || []).map(artifact => (
        <Link
          key={artifact.name}
          to={versionPath(ctx.collection, org, name, version.version)}
          className="badge bg-secondary bg-opacity-50 text-body text-decoration-none me-1"
        >
          {artifact.name}
        </Link>
      )),
  },
];

const providerDownloads = provider =>
  (provider.architectures || []).reduce(
    (sum, architecture) =>
      typeof architecture.downloadCount === 'number' ? sum + architecture.downloadCount : sum,
    0
  );

/**
 * The columns the providers table of a version page draws: the provider
 * linking to its own page, its visibility and status badges where the
 * host answers the row's own access words, its details, the downloads of
 * its files summed and one badge per architecture, each file's own count
 * and download living on the provider's page where the file is a row.
 *
 * @param {{org: string, name: string, version: string}} scope - The version the providers belong to
 * @returns {Array<Object>} The columns
 */
export const providerLevelColumns = ({ org, name, version }) => [
  {
    key: 'name',
    kind: 'name',
    labelKey: 'pages.table.name',
    sortValue: provider => provider.name.toLowerCase(),
    render: (provider, ctx) => (
      <Link to={providerPath(ctx.collection, org, name, version, provider.name)}>
        {provider.name}
      </Link>
    ),
  },
  rowVisibilityColumn,
  rowStatusColumn,
  {
    key: 'details',
    kind: 'text',
    labelKey: 'pages.table.details',
    sortValue: provider => (provider.description || '').toLowerCase(),
    when: hasAny(provider => provider.description),
    render: provider => provider.description,
  },
  {
    key: 'downloads',
    kind: 'count',
    labelKey: 'pages.table.downloads',
    sortValue: providerDownloads,
    when: hasAny(provider =>
      (provider.architectures || []).some(
        architecture => typeof architecture.downloadCount === 'number'
      )
    ),
    render: providerDownloads,
  },
  {
    key: 'architectures',
    kind: 'badges',
    labelKey: 'pages.table.architectures',
    when: hasAny(provider => (provider.architectures || []).length > 0),
    render: provider =>
      nameBadges((provider.architectures || []).map(architecture => architecture.name)),
  },
];

/**
 * The columns the architectures table draws, the level whose row is one
 * file: the name, a link to its own page on a collection whose versions
 * carry architectures directly and only while the page is not already that
 * one, then the dates, the count, the default flag where a row carries one,
 * the size and the checksum; the download is the table's `DownloadAction`
 * in the Actions column.
 *
 * @param {{org: string, name: string, version: string, provider: string}} scope - The level above, `provider` empty on a version page
 * @returns {Array<Object>} The columns
 */
export const architectureLevelColumns = ({ org, name, version, provider = '' }) => [
  {
    key: 'name',
    kind: 'name',
    labelKey: 'pages.table.name',
    sortValue: architecture => architecture.name.toLowerCase(),
    render: (architecture, ctx) =>
      ctx.collection.hasProviders || provider ? (
        architecture.name
      ) : (
        <Link to={providerPath(ctx.collection, org, name, version, architecture.name)}>
          {architecture.name}
        </Link>
      ),
  },
  { ...createdColumn, defaultHidden: false, when: hasAny(architecture => architecture.createdAt) },
  { ...updatedColumn, defaultHidden: false, when: hasAny(architecture => architecture.updatedAt) },
  downloadsColumn,
  {
    key: 'defaultBox',
    kind: 'word',
    labelKey: 'pages.table.defaultBox',
    sortValue: architecture => (architecture.defaultBox ? 0 : 1),
    when: hasAny(architecture => typeof architecture.defaultBox === 'boolean'),
    render: (architecture, ctx) => ctx.t(architecture.defaultBox ? 'yes' : 'no'),
  },
  sizeColumn,
  checksumColumn,
];

const countCell = entries => (entries || []).length;

/**
 * The columns the releases table of a downloads product draws: the release
 * linking to its own page, its visibility and status badges where the host
 * answers the row's own access words, when it shipped, its details and
 * how many patches it carries.
 *
 * @param {{org: string, name: string}} scope - The product the releases belong to
 * @returns {Array<Object>} The columns
 */
export const releaseLevelColumns = ({ org, name }) => [
  {
    key: 'version',
    kind: 'link',
    labelKey: 'pages.table.release',
    sortValue: release => [new Date(release.createdAt || 0).getTime(), release.version],
    render: (release, ctx) => (
      <>
        <Link to={versionPath(ctx.collection, org, name, release.version)}>{release.version}</Link>
        {release.deprecated ? (
          <span className="badge bg-danger ms-2">{ctx.t('pages.status.deprecated')}</span>
        ) : null}
      </>
    ),
  },
  rowVisibilityColumn,
  rowStatusColumn,
  {
    key: 'released',
    kind: 'date',
    labelKey: 'pages.version.released',
    sortValue: release => new Date(release.createdAt || 0).getTime(),
    when: hasAny(release => release.createdAt),
    render: release => localeDate(release.createdAt),
  },
  {
    key: 'details',
    kind: 'text',
    labelKey: 'pages.table.details',
    sortValue: release => (release.description || '').toLowerCase(),
    when: hasAny(release => release.description),
    render: release => release.description,
  },
  {
    key: 'patches',
    kind: 'count',
    labelKey: 'pages.table.patches',
    sortValue: release => countCell(release.providers),
    render: release => countCell(release.providers),
  },
];

/**
 * The columns the patches table of a downloads release draws: the patch
 * linking to its own page, its visibility and status badges where the host
 * answers the row's own access words, its kind, the date the vendor
 * shipped it and how many files it carries.
 *
 * @param {{org: string, name: string, version: string}} scope - The release the patches belong to
 * @returns {Array<Object>} The columns
 */
export const patchLevelColumns = ({ org, name, version }) => [
  {
    key: 'name',
    kind: 'name',
    labelKey: 'pages.table.name',
    sortValue: patch => patch.name.toLowerCase(),
    render: (patch, ctx) => (
      <Link to={providerPath(ctx.collection, org, name, version, patch.name)}>{patch.name}</Link>
    ),
  },
  rowVisibilityColumn,
  rowStatusColumn,
  {
    key: 'kind',
    kind: 'badge',
    labelKey: 'pages.table.kind',
    sortValue: patch => (patch.kind || '').toLowerCase(),
    when: hasAny(patch => patch.kind),
    render: (patch, ctx) =>
      patch.kind ? (
        <span className="badge bg-secondary">{listWord(ctx.t, 'kind', patch.kind)}</span>
      ) : (
        ''
      ),
  },
  {
    key: 'released',
    kind: 'date',
    labelKey: 'pages.version.released',
    sortValue: patch => new Date(patch.releasedAt || 0).getTime(),
    when: hasAny(patch => patch.releasedAt),
    render: patch => localeDate(patch.releasedAt),
  },
  {
    key: 'files',
    kind: 'count',
    labelKey: 'pages.table.files',
    sortValue: patch => countCell(patch.architectures),
    render: patch => countCell(patch.architectures),
  },
];

const wordColumn = (key, labelKey, group) => ({
  key,
  kind: 'word',
  labelKey,
  sortValue: file => (file[group] || '').toLowerCase(),
  render: (file, ctx) => listWord(ctx.t, group, file[group]),
});

/**
 * The columns the files table of a downloads patch draws, the level whose
 * row is one file: one Name column, the name it was uploaded with and, only
 * when the key differs from it, the key as a small code beside it (the
 * shape `labelColumn` gives the catalog's label and slug), its kind,
 * platform, architecture and language, the downloads, the size and the
 * checksum; the tokened download is the table's `DownloadAction` in the
 * Actions column.
 *
 * @param {{org: string, name: string, version: string, provider: string}} scope - The patch the files belong to
 * @returns {Array<Object>} The columns
 */
export const fileLevelColumns = () => [
  {
    key: 'name',
    kind: 'name',
    labelKey: 'pages.table.name',
    sortValue: file => (file.fileName || file.name).toLowerCase(),
    render: file => (
      <>
        {file.fileName || file.name}
        {file.fileName && file.fileName !== file.name ? (
          <code className="checksum ms-2">{file.name}</code>
        ) : null}
      </>
    ),
  },
  wordColumn('kind', 'pages.table.kind', 'kind'),
  wordColumn('platform', 'pages.table.platform', 'platform'),
  wordColumn('architecture', 'pages.table.architecture', 'architecture'),
  {
    key: 'language',
    kind: 'text',
    labelKey: 'pages.table.language',
    sortValue: file => (file.language || '').toLowerCase(),
    render: file => file.language || '',
  },
  {
    key: 'variant',
    kind: 'text',
    labelKey: 'pages.table.variant',
    defaultHidden: true,
    sortValue: file => (file.variant || '').toLowerCase(),
    render: file => file.variant || '',
  },
  downloadsColumn,
  sizeColumn,
  checksumColumn,
];

/**
 * The matchers the navbar search narrows each level's table with.
 */
export const versionLevelMatches = (version, needle) =>
  [
    version.version,
    version.description,
    version.releaseNotes,
    ...(version.providers || []).map(provider => provider.name),
  ].some(value => (value || '').toLowerCase().includes(needle));

export const providerLevelMatches = (provider, needle) =>
  [
    provider.name,
    provider.description,
    ...(provider.architectures || []).map(architecture => architecture.name),
  ].some(value => (value || '').toLowerCase().includes(needle));

export const architectureLevelMatches = (architecture, needle) =>
  [architecture.name, architecture.checksum].some(value =>
    (value || '').toLowerCase().includes(needle)
  );
