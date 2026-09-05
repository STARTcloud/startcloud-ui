import PropTypes from 'prop-types';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaRegStar, FaStar } from 'react-icons/fa6';
import Markdown from 'react-markdown';
import { Link } from 'react-router-dom';

import PageHeader from '../../../components/common/PageHeader';
import StatusChips from '../../../components/common/StatusChips';
import { useNotify } from '../../../contexts/NoticeContext';
import { providerPath, versionPath } from '../../../utils/routes';
import { useDetailSearch } from '../hooks/useDetailSearch';
import {
  collectionShape,
  detailSearchShape,
  itemShape,
  pageContextShape,
  sortVersionsNewestFirst,
  statusOf,
  visibilityOf,
} from '../utils/itemShape';

import { createdColumn, downloadsColumn, updatedColumn } from './columns';
import ItemFacts from './ItemFacts';
import SubTable, { hasAny } from './SubTable';

const Readme = ({ readme }) => {
  const { t } = useTranslation();
  return (
    <div className="card h-100">
      <div className="card-header">
        <h5 className="mb-0">{t('pages.item.readme')}</h5>
      </div>
      <div className="card-body">
        <Markdown>{readme}</Markdown>
      </div>
    </div>
  );
};

Readme.propTypes = {
  readme: PropTypes.string.isRequired,
};

const WatchStar = ({ watched, busy, onToggle }) => {
  const { t } = useTranslation();
  const label = watched ? t('pages.watch.unwatch') : t('pages.watch.watch');
  return (
    <button
      type="button"
      className="btn btn-link p-0 text-warning fs-5 v-align-middle"
      onClick={onToggle}
      disabled={busy}
      title={label}
      aria-label={label}
      aria-pressed={watched}
    >
      {watched ? <FaStar /> : <FaRegStar />}
    </button>
  );
};

WatchStar.propTypes = {
  watched: PropTypes.bool.isRequired,
  busy: PropTypes.bool.isRequired,
  onToggle: PropTypes.func.isRequired,
};

const watchShape = PropTypes.shape({
  available: PropTypes.bool.isRequired,
  watched: PropTypes.bool.isRequired,
  busy: PropTypes.bool.isRequired,
  toggle: PropTypes.func.isRequired,
});

const useItemWatch = ({ collection, item, signedIn, notify }) => {
  const { t } = useTranslation();
  const [watched, setWatched] = useState(false);
  const [busy, setBusy] = useState(false);
  const { watches } = collection.adapter;

  useEffect(() => {
    if (!watches || !signedIn || !item) {
      return undefined;
    }
    let mounted = true;
    watches
      .list()
      .then(ids => {
        if (mounted) {
          setWatched(ids.has(item.id));
        }
      })
      .catch(() => null);
    return () => {
      mounted = false;
    };
  }, [watches, signedIn, item]);

  const toggle = () => {
    const next = !watched;
    setWatched(next);
    setBusy(true);
    watches
      .toggle(item, next)
      .catch(() => {
        setWatched(!next);
        notify('danger', t('pages.watch.error'));
      })
      .finally(() => setBusy(false));
  };

  return { available: Boolean(watches) && signedIn, watched, busy, toggle };
};

const mediaFor = item => {
  if (item.artwork) {
    return <img src={item.artwork} alt="" className="rounded item-artwork" />;
  }
  if (item.icon) {
    return (
      <img
        src={item.icon}
        alt=""
        className="prov-icon"
        loading="lazy"
        onError={event => {
          event.currentTarget.style.display = 'none';
        }}
      />
    );
  }
  return null;
};

const ItemHeading = ({ item, org, editor, actions, watch, ctx }) => {
  const { t } = useTranslation();
  const { ItemChips, ItemHeaderExtra } = ctx.collection.slots;
  if (editor) {
    return (
      <div className="mb-4">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h4>{t('pages.item.details')}</h4>
          <div>{actions}</div>
        </div>
        {editor}
      </div>
    );
  }
  const title = (
    <>
      {item.label || item.name}
      {watch.available ? (
        <span className="ms-2 align-middle">
          <WatchStar watched={watch.watched} busy={watch.busy} onToggle={watch.toggle} />
        </span>
      ) : null}
    </>
  );
  const chips = (
    <>
      <StatusChips
        status={statusOf(item)}
        visibility={visibilityOf(item)}
        osLabel={item.os?.label || null}
      />
      {ItemChips ? <ItemChips item={item} ctx={ctx} /> : null}
    </>
  );
  return (
    <PageHeader
      media={mediaFor(item)}
      title={title}
      subtitle={`${org} / ${item.name}`}
      chips={chips}
      actions={actions}
    >
      {item.description ? <p className="mb-0 mt-2">{item.description}</p> : null}
      {ItemHeaderExtra ? <ItemHeaderExtra item={item} ctx={ctx} /> : null}
    </PageHeader>
  );
};

ItemHeading.propTypes = {
  item: itemShape.isRequired,
  org: PropTypes.string.isRequired,
  editor: PropTypes.node,
  actions: PropTypes.node,
  watch: watchShape.isRequired,
  ctx: PropTypes.object.isRequired,
};

const ItemDetails = ({ item, formatFileSize }) => {
  const facts = Boolean(item.metadata || item.artifact);
  if (!facts && !item.readme) {
    return null;
  }
  return (
    <div className="row g-3 mb-4 mx-0 px-0">
      {facts ? (
        <div className="col-lg-5 col-xl-4">
          <ItemFacts item={item} formatFileSize={formatFileSize} />
        </div>
      ) : null}
      {item.readme ? (
        <div className="col">
          <Readme readme={item.readme} />
        </div>
      ) : null}
    </div>
  );
};

ItemDetails.propTypes = {
  item: itemShape.isRequired,
  formatFileSize: PropTypes.func.isRequired,
};

const versionColumns = (org, name) => [
  {
    key: 'version',
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
  { ...createdColumn, defaultHidden: false, when: hasAny(version => version.createdAt) },
  { ...updatedColumn, defaultHidden: false, when: hasAny(version => version.updatedAt) },
  { ...downloadsColumn, when: hasAny(version => typeof version.downloads === 'number') },
  {
    key: 'details',
    labelKey: 'pages.table.details',
    sortValue: version => (version.description || '').toLowerCase(),
    when: hasAny(version => version.description),
    render: version => version.description,
  },
  {
    key: 'providers',
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

const versionMatches = (version, needle) =>
  [
    version.version,
    version.description,
    version.releaseNotes,
    ...(version.providers || []).map(provider => provider.name),
  ].some(value => (value || '').toLowerCase().includes(needle));

const VersionsTable = ({ collection, item, columns, search, ctx }) => {
  const { t } = useTranslation();
  const { VersionRowActions } = collection.slots;
  return (
    <SubTable
      columns={columns}
      rows={search.rows}
      rowKey={version => version.version}
      RowActions={VersionRowActions}
      actionsProps={{ item, ctx }}
      rowProp="version"
      sort={search.sort}
      onSort={search.setSort}
      hiddenColumns={search.hiddenColumns}
      ctx={ctx}
      emptyText={t(search.filtering ? 'pages.noMatches' : 'pages.empty')}
    />
  );
};

VersionsTable.propTypes = {
  collection: collectionShape.isRequired,
  item: PropTypes.object.isRequired,
  columns: PropTypes.arrayOf(PropTypes.object).isRequired,
  search: detailSearchShape.isRequired,
  ctx: PropTypes.object.isRequired,
};

const VersionsSection = ({ collection, item, columns, search, form, ctx }) => {
  const { t } = useTranslation();
  const { VersionsActions } = collection.slots;
  return (
    <>
      <div className="list-table">
        <div className="d-flex justify-content-between align-items-center">
          <h4>{t('pages.item.versions')}</h4>
          {VersionsActions ? <VersionsActions item={item} ctx={ctx} /> : null}
        </div>
      </div>
      {form}
      <VersionsTable
        collection={collection}
        item={item}
        columns={columns}
        search={search}
        ctx={ctx}
      />
    </>
  );
};

VersionsSection.propTypes = {
  collection: collectionShape.isRequired,
  item: itemShape.isRequired,
  columns: PropTypes.arrayOf(PropTypes.object).isRequired,
  search: detailSearchShape.isRequired,
  form: PropTypes.node,
  ctx: PropTypes.object.isRequired,
};

const ItemPage = ({ collection, org, name, context }) => {
  const { t, i18n } = useTranslation();
  const notify = useNotify();
  const [nonce, setNonce] = useState(0);
  const [data, setData] = useState({ key: '', item: null });
  const [editor, setEditor] = useState(null);
  const [form, setForm] = useState(null);
  const key = `${org}/${name}/${nonce}`;
  const ready = data.key === key;
  const { item } = data;
  const signedIn = Boolean(context.user);
  const watch = useItemWatch({ collection, item: ready ? item : null, signedIn, notify });
  const columns = versionColumns(org, name);
  const search = useDetailSearch({
    rows: ready && item ? sortVersionsNewestFirst(item.versions || []) : [],
    matches: versionMatches,
    placeholderKey: 'pages.search.versions',
    columns,
    prefsKey: `${context.prefsPrefix}_${org}_${name}`,
  });

  useEffect(() => {
    let mounted = true;
    collection.adapter
      .getItem(org, name)
      .then(loaded => {
        if (mounted) {
          setData({ key, item: loaded });
        }
      })
      .catch(() => {
        if (mounted) {
          setData({ key, item: null });
          notify('danger', t('pages.notFound'));
        }
      });
    return () => {
      mounted = false;
    };
  }, [key, collection, org, name, notify, t]);

  useEffect(() => {
    document.title = ready && item ? item.label || item.name : name;
  }, [ready, item, name]);

  const { ItemActions, ItemExtras, ItemSections } = collection.slots;
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
  if (!item) {
    return <div className="list row" />;
  }

  const actions = ItemActions ? <ItemActions item={item} ctx={ctx} /> : null;

  return (
    <div className="list row">
      <ItemHeading
        item={item}
        org={org}
        editor={editor}
        actions={actions}
        watch={watch}
        ctx={ctx}
      />
      {ItemExtras ? <ItemExtras item={item} ctx={ctx} /> : null}
      <ItemDetails item={item} formatFileSize={context.formatFileSize} />
      {collection.hasVersions ? (
        <VersionsSection
          collection={collection}
          item={item}
          columns={columns}
          search={search}
          form={form}
          ctx={ctx}
        />
      ) : null}
      {ItemSections ? <ItemSections item={item} ctx={ctx} /> : null}
    </div>
  );
};

ItemPage.propTypes = {
  collection: collectionShape.isRequired,
  org: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  context: pageContextShape.isRequired,
};

export default ItemPage;
