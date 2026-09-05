import PropTypes from 'prop-types';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Markdown from 'react-markdown';
import { Link } from 'react-router-dom';

import DeprecationBanner from '../../../components/common/DeprecationBanner';
import PageHeader from '../../../components/common/PageHeader';
import StatusChips from '../../../components/common/StatusChips';
import { useNotify } from '../../../contexts/NoticeContext';
import { providerPath } from '../../../utils/routes';
import { useDetailSearch } from '../hooks/useDetailSearch';
import {
  collectionShape,
  detailSearchShape,
  pageContextShape,
  versionShape,
} from '../utils/itemShape';
import { sortItems } from '../utils/sort';

import ChecksumCell from './ChecksumCell';
import { createdColumn, downloadsColumn, updatedColumn } from './columns';
import SubTable, { hasAny } from './SubTable';

const localeDate = value => (value ? new Date(value).toLocaleDateString() : '');

const MetaRow = ({ entry }) => {
  const { t } = useTranslation();
  const rows = [
    ['description', entry.description],
    ['createdAt', localeDate(entry.createdAt)],
    ['updatedAt', localeDate(entry.updatedAt)],
  ].filter(([, value]) => value);
  return (
    <div className="d-flex flex-wrap gap-4 text-muted small mb-3">
      {rows.map(([key, value]) => (
        <span key={key}>
          {t(`pages.version.${key}`)}: <strong className="text-body">{value}</strong>
        </span>
      ))}
    </div>
  );
};

MetaRow.propTypes = {
  entry: versionShape.isRequired,
};

const VersionSummary = ({ entry, manage, actions, slots, slotProps }) => {
  const { t } = useTranslation();
  const { VersionBannerActions, VersionNotesActions } = slots;
  return (
    <div className="mb-4">
      <PageHeader
        title={t('pages.version.title', { version: entry.version })}
        chips={entry.deprecated ? <StatusChips deprecated /> : null}
        actions={actions}
      />
      <DeprecationBanner version={entry}>
        {VersionBannerActions ? <VersionBannerActions {...slotProps} /> : null}
      </DeprecationBanner>
      {entry.releaseNotes || (manage && VersionNotesActions) ? (
        <div className="card mb-3">
          <div className="card-header">
            <h5 className="mb-0">{t('pages.version.releaseNotes')}</h5>
          </div>
          <div className="card-body">
            {entry.releaseNotes ? <Markdown>{entry.releaseNotes}</Markdown> : null}
            {VersionNotesActions ? <VersionNotesActions {...slotProps} /> : null}
          </div>
        </div>
      ) : null}
      <MetaRow entry={entry} />
    </div>
  );
};

VersionSummary.propTypes = {
  entry: versionShape.isRequired,
  manage: PropTypes.bool.isRequired,
  actions: PropTypes.node,
  slots: PropTypes.object.isRequired,
  slotProps: PropTypes.object.isRequired,
};

const providerColumns = (org, name, version) => [
  {
    key: 'name',
    labelKey: 'pages.table.name',
    sortValue: provider => provider.name.toLowerCase(),
    render: (provider, ctx) => (
      <Link to={providerPath(ctx.collection, org, name, version, provider.name)}>
        {provider.name}
      </Link>
    ),
  },
  { ...createdColumn, defaultHidden: false, when: hasAny(provider => provider.createdAt) },
  { ...updatedColumn, defaultHidden: false, when: hasAny(provider => provider.updatedAt) },
  { ...downloadsColumn, when: hasAny(provider => typeof provider.downloads === 'number') },
  {
    key: 'details',
    labelKey: 'pages.table.details',
    sortValue: provider => (provider.description || '').toLowerCase(),
    when: hasAny(provider => provider.description),
    render: provider => provider.description,
  },
  {
    key: 'architectures',
    labelKey: 'pages.table.architectures',
    when: hasAny(provider => (provider.architectures || []).length > 0),
    render: (provider, ctx) => (
      <span className="d-inline-flex flex-wrap align-items-center gap-2">
        {(provider.architectures || []).map(architecture => (
          <span key={architecture.name} className="d-inline-flex align-items-center gap-1">
            <span className="badge bg-secondary badge-xs">{architecture.name}</span>
            {architecture.downloadUrl ? (
              <a
                href={architecture.downloadUrl}
                className="btn btn-sm btn-outline-primary"
                target="_blank"
                rel="noopener noreferrer"
              >
                {ctx.t('pages.table.download')}
              </a>
            ) : null}
          </span>
        ))}
      </span>
    ),
  },
];

const providerMatches = (provider, needle) =>
  [
    provider.name,
    provider.description,
    ...(provider.architectures || []).map(architecture => architecture.name),
  ].some(value => (value || '').toLowerCase().includes(needle));

const artifactColumns = [
  {
    key: 'name',
    labelKey: 'pages.table.name',
    sortValue: artifact => artifact.name.toLowerCase(),
    render: artifact => artifact.name,
  },
  { ...createdColumn, defaultHidden: false, when: hasAny(artifact => artifact.createdAt) },
  { ...updatedColumn, defaultHidden: false, when: hasAny(artifact => artifact.updatedAt) },
  {
    key: 'downloads',
    labelKey: 'pages.table.downloads',
    sortValue: artifact => artifact.downloadCount || 0,
    when: hasAny(artifact => typeof artifact.downloadCount === 'number'),
    render: artifact => (typeof artifact.downloadCount === 'number' ? artifact.downloadCount : ''),
  },
  {
    key: 'size',
    labelKey: 'pages.table.fileSize',
    sortValue: artifact => artifact.fileSize || 0,
    when: hasAny(artifact => artifact.fileSize),
    render: (artifact, ctx) => (artifact.fileSize ? ctx.formatFileSize(artifact.fileSize) : ''),
  },
  {
    key: 'checksum',
    labelKey: 'pages.table.checksum',
    sortValue: artifact => (artifact.checksum || '').toLowerCase(),
    when: hasAny(artifact => artifact.checksum),
    render: artifact =>
      artifact.checksum ? (
        <ChecksumCell checksum={artifact.checksum} checksumType={artifact.checksumType || ''} />
      ) : (
        ''
      ),
  },
  {
    key: 'download',
    labelKey: 'pages.table.download',
    when: hasAny(artifact => artifact.downloadUrl),
    render: (artifact, ctx) =>
      artifact.downloadUrl ? (
        <a
          href={artifact.downloadUrl}
          className="btn btn-sm btn-outline-primary"
          target="_blank"
          rel="noopener noreferrer"
        >
          {ctx.t('pages.table.download')}
        </a>
      ) : null,
  },
];

const artifactMatches = (artifact, needle) =>
  [artifact.name, artifact.checksum].some(value => (value || '').toLowerCase().includes(needle));

const ProvidersTable = ({ collection, columns, search, slotProps }) => {
  const { t } = useTranslation();
  const { ProviderRowActions } = collection.slots;
  return (
    <SubTable
      columns={columns}
      rows={search.rows}
      rowKey={provider => provider.name}
      RowActions={ProviderRowActions}
      actionsProps={slotProps}
      rowProp="provider"
      sort={search.sort}
      onSort={search.setSort}
      hiddenColumns={search.hiddenColumns}
      ctx={slotProps.ctx}
      emptyText={t(search.filtering ? 'pages.noMatches' : 'pages.empty')}
    />
  );
};

ProvidersTable.propTypes = {
  collection: collectionShape.isRequired,
  columns: PropTypes.arrayOf(PropTypes.object).isRequired,
  search: detailSearchShape.isRequired,
  slotProps: PropTypes.object.isRequired,
};

const ProvidersSection = ({ collection, columns, search, form, slotProps }) => {
  const { t } = useTranslation();
  const { ProvidersActions } = collection.slots;
  return (
    <div className="list-table">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h4>{t('pages.version.providersFor', { version: slotProps.version.version })}</h4>
        {ProvidersActions ? <ProvidersActions {...slotProps} /> : null}
      </div>
      {form}
      <ProvidersTable
        collection={collection}
        columns={columns}
        search={search}
        slotProps={slotProps}
      />
    </div>
  );
};

ProvidersSection.propTypes = {
  collection: collectionShape.isRequired,
  columns: PropTypes.arrayOf(PropTypes.object).isRequired,
  search: detailSearchShape.isRequired,
  form: PropTypes.node,
  slotProps: PropTypes.object.isRequired,
};

const ArtifactsSection = ({ collection, rows, search, form, slotProps }) => {
  const { t } = useTranslation();
  const { ArtifactsActions, ArtifactRowActions } = collection.slots;
  return (
    <div className="list-table">
      <div className="d-flex justify-content-between align-items-center flex-wrap mb-3">
        <h4>{t('pages.version.artifacts')}</h4>
        {ArtifactsActions ? <ArtifactsActions {...slotProps} /> : null}
      </div>
      {form}
      <SubTable
        columns={artifactColumns}
        rows={rows}
        rowKey={artifact => artifact.name}
        RowActions={ArtifactRowActions}
        actionsProps={slotProps}
        rowProp="artifact"
        sort={search.sort}
        onSort={search.setSort}
        hiddenColumns={search.hiddenColumns}
        ctx={slotProps.ctx}
        emptyText={t(search.filtering ? 'pages.noMatches' : 'pages.empty')}
      />
    </div>
  );
};

ArtifactsSection.propTypes = {
  collection: collectionShape.isRequired,
  rows: PropTypes.array.isRequired,
  search: detailSearchShape.isRequired,
  form: PropTypes.node,
  slotProps: PropTypes.object.isRequired,
};

const detailRows = (collection, entry) => {
  if (!entry) {
    return [];
  }
  return collection.hasProviders ? entry.providers || [] : entry.artifacts || [];
};

const sideArtifacts = (artifacts, search) => {
  const needle = search.query.trim().toLowerCase();
  const shown = search.filtering
    ? artifacts.filter(artifact => artifactMatches(artifact, needle))
    : artifacts;
  return sortItems(shown, search.sort, artifactColumns);
};

/**
 * One version of an item: its summary with the release notes and the
 * deprecation banner, then for a collection with providers the version's
 * providers table (with the version's own artifacts above it when it carries
 * any), else the version's artifacts table, one file per architecture; the
 * navbar search, the header sort and the Columns pills drive whichever of
 * the two tables the collection puts first.
 */
const VersionPage = ({ collection, org, name, version, context }) => {
  const { t, i18n } = useTranslation();
  const notify = useNotify();
  const [nonce, setNonce] = useState(0);
  const [data, setData] = useState({ key: '', item: null, entry: null });
  const [editor, setEditor] = useState(null);
  const [form, setForm] = useState(null);
  const key = `${org}/${name}/${version}/${nonce}`;
  const ready = data.key === key;
  const { item, entry } = data;
  const columns = providerColumns(org, name, version);
  const detail = collection.hasProviders
    ? { matches: providerMatches, placeholderKey: 'pages.search.providers', columns }
    : {
        matches: artifactMatches,
        placeholderKey: 'pages.search.artifacts',
        columns: artifactColumns,
      };
  const search = useDetailSearch({
    rows: ready ? detailRows(collection, entry) : [],
    ...detail,
    prefsKey: `${context.prefsPrefix}_${org}_${name}_${version}`,
  });

  useEffect(() => {
    let mounted = true;
    Promise.all([
      collection.adapter.getItemSummary(org, name),
      collection.adapter.getVersion(org, name, version),
    ])
      .then(([loadedItem, loadedEntry]) => {
        if (mounted) {
          setData({ key, item: loadedItem, entry: loadedEntry });
        }
      })
      .catch(() => {
        if (mounted) {
          setData({ key, item: null, entry: null });
          notify('danger', t('pages.notFound'));
        }
      });
    return () => {
      mounted = false;
    };
  }, [key, collection, org, name, version, notify, t]);

  useEffect(() => {
    document.title = `${name} v${version}`;
  }, [name, version]);

  const { VersionActions } = collection.slots;
  const ctx = {
    ...context,
    t,
    language: i18n.language,
    org,
    collection,
    reload: () => setNonce(current => current + 1),
    notify,
    setEditor,
    setForm,
  };
  const manage = Boolean(item && collection.canManage && collection.canManage(item, context.user));

  if (!ready) {
    return (
      <div className="list row">
        <div>{t('pages.loading')}</div>
      </div>
    );
  }
  if (!entry) {
    return <div className="list row" />;
  }

  const slotProps = { item, version: entry, ctx };
  const actions = VersionActions ? <VersionActions {...slotProps} /> : null;
  const artifacts = entry.artifacts || [];

  return (
    <div className="list row">
      {editor ? (
        <div className="mb-4">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h4>{t('pages.version.edit')}</h4>
            <div>{actions}</div>
          </div>
          {editor}
        </div>
      ) : (
        <VersionSummary
          entry={entry}
          manage={manage}
          actions={actions}
          slots={collection.slots}
          slotProps={slotProps}
        />
      )}
      {collection.hasProviders && artifacts.length > 0 ? (
        <ArtifactsSection
          collection={collection}
          rows={sideArtifacts(artifacts, search)}
          search={search}
          slotProps={slotProps}
        />
      ) : null}
      {collection.hasProviders ? (
        <ProvidersSection
          collection={collection}
          columns={columns}
          search={search}
          form={form}
          slotProps={slotProps}
        />
      ) : (
        <ArtifactsSection
          collection={collection}
          rows={search.rows}
          search={search}
          form={form}
          slotProps={slotProps}
        />
      )}
    </div>
  );
};

VersionPage.propTypes = {
  collection: collectionShape.isRequired,
  org: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  version: PropTypes.string.isRequired,
  context: pageContextShape.isRequired,
};

export default VersionPage;
