import PropTypes from 'prop-types';
import { FaClipboard, FaDownload } from 'react-icons/fa6';
import { Link } from 'react-router-dom';

import { useNotify } from '../../contexts/NoticeContext';
import { copyToClipboard } from '../../lib/clipboard';
import { listWord } from '../../utils/closedLists';
import { providerPath, versionPath } from '../../utils/routes';

import ChecksumCell from './ChecksumCell';
import {
  badgesText,
  createdColumn,
  managesRows,
  nameBadges,
  statusColumn,
  updatedColumn,
  visibilityColumn,
} from './columns';
import MarkdownText from './MarkdownText';
import { hasAny } from './SubTable';

const carriesAccess = hasAny(row => typeof row.isPublic === 'boolean');

const managedAccess = (rows, ctx) => carriesAccess(rows) && managesRows(rows, ctx);

const withPriority = (column, priority) => ({ ...column, priority });

const rowVisibilityColumn = { ...visibilityColumn, when: managedAccess };

const rowStatusColumn = { ...statusColumn, when: managedAccess };

const accessColumns = (visibility, status) => [
  withPriority(rowVisibilityColumn, visibility),
  withPriority(rowStatusColumn, status),
];

const localeDate = value => (value ? new Date(value).toLocaleDateString() : '');

const timeOf = value => new Date(value || 0).getTime();

const namesOf = entries => (entries || []).map(entry => entry.name);

const badgeLinkClass = 'badge bg-secondary bg-opacity-50 text-body text-decoration-none me-1';

const hostOf = url => (URL.canParse(url) ? new URL(url).host : '');

/**
 * The download actions of every table whose row is a file: the
 * `SubTable`'s `LeadActions` on the architectures and files tables, two
 * icon buttons in the Actions column while the row carries a
 * `downloadUrl`, Download with its tooltip and beside it a clipboard that
 * copies the URL for a browser, curl or wget, drawn for every viewer the
 * row is shown to because a download is a read the row already granted.
 */
export const DownloadAction = ({ architecture, ctx }) => {
  const notify = useNotify();
  if (!architecture.downloadUrl) {
    return null;
  }
  const copy = () => {
    copyToClipboard(architecture.downloadUrl).then(
      () => notify('success', ctx.t('pages.table.linkCopied')),
      () => notify('danger', ctx.t('pages.table.copyLinkFailed'))
    );
  };
  return (
    <span className="d-inline-flex gap-1">
      <a
        href={architecture.downloadUrl}
        className="btn btn-sm btn-outline-primary"
        target="_blank"
        rel="noopener noreferrer"
        title={ctx.t('pages.table.download')}
        aria-label={ctx.t('pages.table.download')}
      >
        <FaDownload />
      </a>
      <button
        type="button"
        className="btn btn-sm btn-outline-primary"
        title={ctx.t('pages.table.copyLink')}
        aria-label={ctx.t('pages.table.copyLink')}
        onClick={copy}
      >
        <FaClipboard />
      </button>
    </span>
  );
};

DownloadAction.propTypes = {
  architecture: PropTypes.shape({ downloadUrl: PropTypes.string }).isRequired,
  ctx: PropTypes.shape({ t: PropTypes.func.isRequired }).isRequired,
};

const downloadsColumn = {
  key: 'downloads',
  kind: 'count',
  labelKey: 'pages.table.downloads',
  priority: 3,
  when: hasAny(row => typeof row.downloadCount === 'number'),
  value: row => (typeof row.downloadCount === 'number' ? row.downloadCount : ''),
};

const sizeColumn = {
  key: 'size',
  kind: 'size',
  labelKey: 'pages.table.fileSize',
  when: hasAny(row => row.fileSize),
  value: row => row.fileSize || 0,
  render: (row, ctx) => (row.fileSize ? ctx.formatFileSize(row.fileSize) : ''),
};

const checksumColumn = {
  key: 'checksum',
  kind: 'checksum',
  labelKey: 'pages.table.checksum',
  priority: 9,
  when: hasAny(row => row.checksum),
  value: row => row.checksum || '',
  render: row =>
    row.checksum ? (
      <ChecksumCell checksum={row.checksum} checksumType={row.checksumType || ''} />
    ) : (
      ''
    ),
};

const detailsColumn = {
  key: 'details',
  kind: 'text',
  labelKey: 'pages.table.details',
  priority: 4,
  prose: true,
  when: hasAny(row => row.description),
  value: row => row.description || '',
  render: row => <MarkdownText text={row.description} />,
};

/**
 * The Released column of the downloads levels, the release, the patch and
 * the file, each row carrying the date its vendor shipped it as
 * `releasedAt`, the release's from its release patch, the file's from its
 * patch, never the day the row was inserted.
 */
const releasedAtColumn = {
  key: 'released',
  kind: 'date',
  labelKey: 'pages.version.released',
  when: hasAny(row => row.releasedAt),
  value: row => timeOf(row.releasedAt),
  render: row => localeDate(row.releasedAt),
};

const versionLinkColumn = (labelKey, { org, name }) => ({
  key: 'version',
  kind: 'link',
  labelKey,
  value: version => version.version,
  render: (version, ctx) => (
    <>
      <Link to={versionPath(ctx.collection, org, name, version.version)}>{version.version}</Link>
      {version.deprecated ? (
        <span className="badge bg-danger ms-2">{ctx.t('pages.status.deprecated')}</span>
      ) : null}
    </>
  ),
});

const providerLinkColumn = (labelKey, { org, name, version }) => ({
  key: 'name',
  kind: 'name',
  labelKey,
  value: provider => provider.name,
  render: (provider, ctx) => (
    <Link to={providerPath(ctx.collection, org, name, version, provider.name)}>
      {provider.name}
    </Link>
  ),
});

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
  versionLinkColumn('pages.table.version', { org, name }),
  ...accessColumns(6, 5),
  {
    key: 'released',
    kind: 'date',
    labelKey: 'pages.version.released',
    priority: 2,
    when: hasAny(version => version.createdAt),
    value: version => timeOf(version.createdAt),
    render: version => localeDate(version.createdAt),
  },
  detailsColumn,
  {
    key: 'providers',
    kind: 'badges',
    labelKey: 'pages.table.providers',
    priority: 3,
    when: hasAny(version => (version.providers || []).length > 0),
    value: version => badgesText(namesOf(version.providers)),
    render: (version, ctx) =>
      (version.providers || []).map(provider => (
        <Link
          key={provider.name}
          to={providerPath(ctx.collection, org, name, version.version, provider.name)}
          className={badgeLinkClass}
        >
          {provider.name}
        </Link>
      )),
  },
  {
    key: 'artifacts',
    kind: 'badges',
    labelKey: 'pages.version.artifacts',
    priority: 3,
    when: hasAny(version => (version.artifacts || []).length > 0),
    value: version => badgesText(namesOf(version.artifacts)),
    render: (version, ctx) =>
      (version.artifacts || []).map(artifact => (
        <Link
          key={artifact.name}
          to={versionPath(ctx.collection, org, name, version.version)}
          className={badgeLinkClass}
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
  providerLinkColumn('pages.table.name', { org, name, version }),
  ...accessColumns(6, 5),
  detailsColumn,
  {
    key: 'downloads',
    kind: 'count',
    labelKey: 'pages.table.downloads',
    priority: 3,
    when: hasAny(provider =>
      (provider.architectures || []).some(
        architecture => typeof architecture.downloadCount === 'number'
      )
    ),
    value: providerDownloads,
  },
  {
    key: 'architectures',
    kind: 'badges',
    labelKey: 'pages.table.architectures',
    priority: 2,
    when: hasAny(provider => (provider.architectures || []).length > 0),
    value: provider => badgesText(namesOf(provider.architectures)),
    render: provider => nameBadges(namesOf(provider.architectures)),
  },
];

/**
 * The columns the architectures table draws, the level whose row is one
 * file: the name, a link to its own page on a collection whose versions
 * carry architectures directly and only while the page is not already that
 * one, its visibility and status badges where the host answers the row's
 * own access words, then the dates, the count, the default flag where a
 * row carries one, the size and the checksum; the download is the table's
 * `DownloadAction` in the Actions column.
 *
 * @param {{org: string, name: string, version: string, provider: string}} scope - The level above, `provider` empty on a version page
 * @returns {Array<Object>} The columns
 */
export const architectureLevelColumns = ({ org, name, version, provider = '' }) => [
  {
    key: 'name',
    kind: 'name',
    labelKey: 'pages.table.name',
    value: architecture => architecture.name,
    render: (architecture, ctx) =>
      ctx.collection.hasProviders || provider ? (
        architecture.name
      ) : (
        <Link to={providerPath(ctx.collection, org, name, version, architecture.name)}>
          {architecture.name}
        </Link>
      ),
  },
  ...accessColumns(8, 7),
  {
    ...createdColumn,
    priority: 5,
    defaultHidden: false,
    when: hasAny(architecture => architecture.createdAt),
  },
  {
    ...updatedColumn,
    priority: 6,
    defaultHidden: false,
    when: hasAny(architecture => architecture.updatedAt),
  },
  downloadsColumn,
  {
    key: 'defaultBox',
    kind: 'word',
    labelKey: 'pages.table.defaultBox',
    priority: 4,
    when: hasAny(architecture => typeof architecture.defaultBox === 'boolean'),
    value: (architecture, ctx) => ctx.t(architecture.defaultBox ? 'yes' : 'no'),
  },
  sizeColumn,
  checksumColumn,
];

const countCell = entries => (entries || []).length;

/**
 * The columns the releases table of a downloads product draws: the release
 * linking to its own page, its visibility and status badges where the host
 * answers the row's own access words, when its vendor shipped it, its
 * details and how many patches it carries.
 *
 * @param {{org: string, name: string}} scope - The product the releases belong to
 * @returns {Array<Object>} The columns
 */
export const releaseLevelColumns = ({ org, name }) => [
  versionLinkColumn('pages.table.release', { org, name }),
  ...accessColumns(6, 5),
  withPriority(releasedAtColumn, 2),
  detailsColumn,
  {
    key: 'patches',
    kind: 'count',
    labelKey: 'pages.table.patches',
    priority: 3,
    value: release => countCell(release.providers),
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
  providerLinkColumn('pages.table.name', { org, name, version }),
  ...accessColumns(6, 5),
  {
    key: 'kind',
    kind: 'badge',
    labelKey: 'pages.table.kind',
    priority: 2,
    when: hasAny(patch => patch.kind),
    value: (patch, ctx) => (patch.kind ? listWord(ctx.t, 'kind', patch.kind) : ''),
    render: (patch, ctx) =>
      patch.kind ? (
        <span className="badge bg-secondary">{listWord(ctx.t, 'kind', patch.kind)}</span>
      ) : (
        ''
      ),
  },
  withPriority(releasedAtColumn, 3),
  {
    key: 'files',
    kind: 'count',
    labelKey: 'pages.table.files',
    priority: 4,
    value: patch => countCell(patch.architectures),
  },
];

const wordColumn = (key, labelKey, group, priority) => ({
  key,
  kind: 'word',
  labelKey,
  priority,
  value: (file, ctx) => listWord(ctx.t, group, file[group]),
});

/**
 * The columns the files table of a downloads patch draws, the level whose
 * row is one file: one Name column, the name it was uploaded with and, only
 * when the key differs from it, the key as a small code beside it (the
 * shape `labelColumn` gives the catalog's label and slug), its visibility
 * and status badges where the host answers the row's own access words,
 * the date its patch shipped, its kind, platform, architecture and
 * language as closed-list words (the language drawn only while a file of
 * the table names one other than `any`, and the first column to fold
 * while it is drawn), the downloads, the size and the checksum; a link
 * row, one holding `sourceUrl` and no bytes, draws the source's host
 * muted beside its name and nothing for its size and checksum; the
 * tokened download is the table's `DownloadAction` in the Actions column.
 *
 * @param {{org: string, name: string, version: string, provider: string}} scope - The patch the files belong to
 * @returns {Array<Object>} The columns
 */
export const fileLevelColumns = () => [
  {
    key: 'name',
    kind: 'name',
    labelKey: 'pages.table.name',
    value: file => file.fileName || file.name,
    render: file => (
      <>
        {file.fileName || file.name}
        {file.fileName && file.fileName !== file.name ? (
          <code className="checksum ms-2">{file.name}</code>
        ) : null}
        {file.sourceUrl ? <span className="text-muted ms-2">{hostOf(file.sourceUrl)}</span> : null}
      </>
    ),
  },
  ...accessColumns(8, 7),
  withPriority(releasedAtColumn, 3),
  wordColumn('kind', 'pages.table.kind', 'kind', 4),
  wordColumn('platform', 'pages.table.platform', 'platform', 5),
  wordColumn('architecture', 'pages.table.architecture', 'architecture', 6),
  {
    ...wordColumn('language', 'pages.table.language', 'language', 11),
    when: hasAny(file => file.language && file.language !== 'any'),
  },
  {
    key: 'variant',
    kind: 'text',
    labelKey: 'pages.table.variant',
    priority: 10,
    defaultHidden: true,
    value: file => file.variant || '',
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
