import PropTypes from 'prop-types';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Markdown from 'react-markdown';

import DeprecationBanner from '../../../components/common/DeprecationBanner';
import {
  architectureLevelMatches,
  providerLevelMatches,
} from '../../../components/common/levelColumns';
import PageHeader from '../../../components/common/PageHeader';
import StatusChips from '../../../components/common/StatusChips';
import SubTable from '../../../components/common/SubTable';
import { useNotify } from '../../../contexts/NoticeContext';
import { useDetailSearch } from '../../../hooks/useDetailSearch';
import { useSelection } from '../../../hooks/useSelection';
import {
  collectionShape,
  detailSearchShape,
  pageContextShape,
  versionShape,
} from '../../../utils/itemShape';
import { sortItems } from '../../../utils/sort';

import BulkActions from './BulkActions';

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

const VersionSummary = ({ entry, manage, actions, editor, slots, slotProps }) => {
  const { t } = useTranslation();
  const { VersionBannerActions, VersionNotesActions } = slots;
  if (editor) {
    return (
      <div className="mb-4">
        <PageHeader title={t('pages.version.edit')} actions={actions}>
          {editor}
        </PageHeader>
      </div>
    );
  }
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
  editor: PropTypes.node,
  slots: PropTypes.object.isRequired,
  slotProps: PropTypes.object.isRequired,
};

const LevelHeading = ({ label, picked, children }) => {
  const { t } = useTranslation();
  return (
    <div className="d-flex align-items-center gap-2 flex-wrap mb-3">
      <h4 className="mb-0 me-auto d-flex align-items-center gap-2">
        {label}
        {picked > 0 ? (
          <span className="small text-muted">· {t('pages.bulk.selected', { count: picked })}</span>
        ) : null}
      </h4>
      {children}
    </div>
  );
};

LevelHeading.propTypes = {
  label: PropTypes.node.isRequired,
  picked: PropTypes.number.isRequired,
  children: PropTypes.node,
};

const ProvidersSection = ({ collection, columns, search, form, scope, manage, slotProps }) => {
  const { t } = useTranslation();
  const { ProvidersActions, ProviderRowActions } = collection.slots;
  const selection = useSelection(search.rows, {
    keyOf: provider => provider.name,
    labelOf: provider => provider.name,
  });
  const bulkable = Boolean(collection.bulk && collection.adapter.bulk && manage);
  const names = search.rows
    .filter(provider => selection.selected.has(provider.name))
    .map(provider => provider.name);
  return (
    <div className="list-table">
      <LevelHeading label={t(collection.levels.providers.labelKey)} picked={names.length}>
        {bulkable ? (
          <BulkActions
            collection={collection}
            level="providers"
            groups={[{ scope, names }]}
            onClear={selection.clear}
            onDone={() => {
              selection.clear();
              slotProps.ctx.reload();
            }}
          />
        ) : null}
        {ProvidersActions ? <ProvidersActions {...slotProps} /> : null}
      </LevelHeading>
      {form}
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
        selection={bulkable ? selection.subtable : null}
      />
    </div>
  );
};

ProvidersSection.propTypes = {
  collection: collectionShape.isRequired,
  columns: PropTypes.arrayOf(PropTypes.object).isRequired,
  search: detailSearchShape.isRequired,
  form: PropTypes.node,
  scope: PropTypes.object.isRequired,
  manage: PropTypes.bool.isRequired,
  slotProps: PropTypes.object.isRequired,
};

const ArtifactsSection = ({
  collection,
  columns,
  rows,
  search,
  form,
  scope,
  manage,
  slotProps,
}) => {
  const { t } = useTranslation();
  const { ArtifactsActions, ArtifactRowActions } = collection.slots;
  const selection = useSelection(rows, {
    keyOf: artifact => artifact.name,
    labelOf: artifact => artifact.name,
  });
  const bulkable = Boolean(collection.bulk && collection.adapter.bulk && manage);
  const names = rows
    .filter(artifact => selection.selected.has(artifact.name))
    .map(artifact => artifact.name);
  return (
    <div className="list-table">
      <LevelHeading label={t(collection.levels.architectures.labelKey)} picked={names.length}>
        {bulkable ? (
          <BulkActions
            collection={collection}
            level="architectures"
            groups={[{ scope, names }]}
            onClear={selection.clear}
            onDone={() => {
              selection.clear();
              slotProps.ctx.reload();
            }}
          />
        ) : null}
        {ArtifactsActions ? <ArtifactsActions {...slotProps} /> : null}
      </LevelHeading>
      {form}
      <SubTable
        columns={columns}
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
        selection={bulkable ? selection.subtable : null}
      />
    </div>
  );
};

ArtifactsSection.propTypes = {
  collection: collectionShape.isRequired,
  columns: PropTypes.arrayOf(PropTypes.object).isRequired,
  rows: PropTypes.array.isRequired,
  search: detailSearchShape.isRequired,
  form: PropTypes.node,
  scope: PropTypes.object.isRequired,
  manage: PropTypes.bool.isRequired,
  slotProps: PropTypes.object.isRequired,
};

const detailRows = (collection, entry) => {
  if (!entry) {
    return [];
  }
  return collection.hasProviders ? entry.providers || [] : entry.artifacts || [];
};

const sideArtifacts = (artifacts, search, columns) => {
  const needle = search.query.trim().toLowerCase();
  const shown = search.filtering
    ? artifacts.filter(artifact => architectureLevelMatches(artifact, needle))
    : artifacts;
  return sortItems(shown, search.sort, columns);
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
  const scope = { org, name, version };
  const columns = collection.levels.providers ? collection.levels.providers.columns(scope) : [];
  const artifactColumns = collection.levels.architectures.columns(scope);
  const detail = collection.hasProviders
    ? { matches: providerLevelMatches, placeholderKey: 'pages.search.providers', columns }
    : {
        matches: architectureLevelMatches,
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
      <VersionSummary
        entry={entry}
        manage={manage}
        actions={actions}
        editor={editor}
        slots={collection.slots}
        slotProps={slotProps}
      />
      {collection.hasProviders && artifacts.length > 0 ? (
        <ArtifactsSection
          collection={collection}
          columns={artifactColumns}
          rows={sideArtifacts(artifacts, search, artifactColumns)}
          search={search}
          scope={scope}
          manage={false}
          slotProps={slotProps}
        />
      ) : null}
      {collection.hasProviders ? (
        <ProvidersSection
          collection={collection}
          columns={columns}
          search={search}
          form={form}
          scope={scope}
          manage={manage}
          slotProps={slotProps}
        />
      ) : (
        <ArtifactsSection
          collection={collection}
          columns={artifactColumns}
          rows={search.rows}
          search={search}
          form={form}
          scope={scope}
          manage={manage}
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
