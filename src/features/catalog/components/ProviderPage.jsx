import PropTypes from 'prop-types';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import PageHeader from '../../../components/common/PageHeader';
import { useNotify } from '../../../contexts/NoticeContext';
import { useDetailSearch } from '../hooks/useDetailSearch';
import { collectionShape, pageContextShape } from '../utils/itemShape';

import ChecksumCell from './ChecksumCell';
import { createdColumn, updatedColumn } from './columns';
import SubTable, { hasAny } from './SubTable';

const architectureColumns = [
  {
    key: 'name',
    labelKey: 'pages.table.name',
    sortValue: architecture => architecture.name.toLowerCase(),
    render: architecture => architecture.name,
  },
  { ...createdColumn, defaultHidden: false, when: hasAny(architecture => architecture.createdAt) },
  { ...updatedColumn, defaultHidden: false, when: hasAny(architecture => architecture.updatedAt) },
  {
    key: 'downloads',
    labelKey: 'pages.table.downloads',
    sortValue: architecture => architecture.downloadCount || 0,
    when: hasAny(architecture => typeof architecture.downloadCount === 'number'),
    render: architecture =>
      typeof architecture.downloadCount === 'number' ? architecture.downloadCount : '',
  },
  {
    key: 'defaultBox',
    labelKey: 'pages.table.defaultBox',
    sortValue: architecture => (architecture.defaultBox ? 0 : 1),
    render: (architecture, ctx) => ctx.t(architecture.defaultBox ? 'yes' : 'no'),
  },
  {
    key: 'size',
    labelKey: 'pages.table.fileSize',
    sortValue: architecture => architecture.fileSize || 0,
    when: hasAny(architecture => architecture.fileSize),
    render: (architecture, ctx) =>
      architecture.fileSize ? ctx.formatFileSize(architecture.fileSize) : '',
  },
  {
    key: 'checksum',
    labelKey: 'pages.table.checksum',
    sortValue: architecture => (architecture.checksum || '').toLowerCase(),
    when: hasAny(architecture => architecture.checksum),
    render: architecture =>
      architecture.checksum ? (
        <ChecksumCell
          checksum={architecture.checksum}
          checksumType={architecture.checksumType || ''}
        />
      ) : (
        ''
      ),
  },
  {
    key: 'download',
    labelKey: 'pages.table.download',
    when: hasAny(architecture => architecture.downloadUrl),
    render: (architecture, ctx) =>
      architecture.downloadUrl ? (
        <a
          href={architecture.downloadUrl}
          className="btn btn-sm btn-outline-primary"
          target="_blank"
          rel="noopener noreferrer"
        >
          {ctx.t('pages.table.download')}
        </a>
      ) : null,
  },
];

const architectureMatches = (architecture, needle) =>
  [architecture.name, architecture.checksum].some(value =>
    (value || '').toLowerCase().includes(needle)
  );

const ProviderPage = ({ collection, org, name, version, provider, context }) => {
  const { t, i18n } = useTranslation();
  const notify = useNotify();
  const [nonce, setNonce] = useState(0);
  const [data, setData] = useState({ key: '', item: null, entry: null });
  const [editor, setEditor] = useState(null);
  const [form, setForm] = useState(null);
  const key = `${org}/${name}/${version}/${provider}/${nonce}`;
  const ready = data.key === key;
  const { item, entry } = data;
  const search = useDetailSearch({
    rows: ready && entry ? entry.architectures || [] : [],
    matches: architectureMatches,
    placeholderKey: 'pages.search.architectures',
    columns: architectureColumns,
    prefsKey: `${context.prefsPrefix}_${org}_${name}_${version}_${provider}`,
  });

  useEffect(() => {
    let mounted = true;
    Promise.all([
      collection.adapter.getItemSummary(org, name),
      collection.adapter.getProvider(org, name, version, provider),
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
  }, [key, collection, org, name, version, provider, notify, t]);

  useEffect(() => {
    document.title = `${provider} - ${name}`;
  }, [provider, name]);

  const { ProviderActions, ArchitecturesActions, ArchitectureRowActions } = collection.slots;
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

  const slotProps = { item, version, provider: entry, ctx };
  const actions = ProviderActions ? <ProviderActions {...slotProps} /> : null;

  return (
    <div className="list row">
      {editor ? (
        <div className="mb-4">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h4>{t('pages.provider.edit')}</h4>
            <div>{actions}</div>
          </div>
          {editor}
        </div>
      ) : (
        <PageHeader title={entry.name} subtitle={entry.description || ''} actions={actions} />
      )}
      <div className="list-table mt-2">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h4>{t('pages.provider.architecturesFor', { provider: entry.name })}</h4>
          {ArchitecturesActions ? <ArchitecturesActions {...slotProps} /> : null}
        </div>
        {form}
        <SubTable
          columns={architectureColumns}
          rows={search.rows}
          rowKey={architecture => architecture.name}
          RowActions={ArchitectureRowActions}
          actionsProps={slotProps}
          rowProp="architecture"
          sort={search.sort}
          onSort={search.setSort}
          hiddenColumns={search.hiddenColumns}
          ctx={ctx}
          emptyText={t(search.filtering ? 'pages.noMatches' : 'pages.empty')}
        />
      </div>
    </div>
  );
};

ProviderPage.propTypes = {
  collection: collectionShape.isRequired,
  org: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  version: PropTypes.string.isRequired,
  provider: PropTypes.string.isRequired,
  context: pageContextShape.isRequired,
};

export default ProviderPage;
