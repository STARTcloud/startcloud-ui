import PropTypes from 'prop-types';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaRegStar, FaStar } from 'react-icons/fa6';

import { versionLevelMatches } from '../../../components/common/levelColumns';
import MarkdownText from '../../../components/common/MarkdownText';
import PageHeader from '../../../components/common/PageHeader';
import StatusChips from '../../../components/common/StatusChips';
import SubTable from '../../../components/common/SubTable';
import { useNotify } from '../../../contexts/NoticeContext';
import { useStatus } from '../../../contexts/StatusContext';
import { useDetailSearch } from '../../../hooks/useDetailSearch';
import { useSelection } from '../../../hooks/useSelection';
import {
  collectionShape,
  detailSearchShape,
  itemShape,
  pageContextShape,
  sortVersionsNewestFirst,
  statusOf,
  visibilityOf,
} from '../../../utils/itemShape';
import { isGuestOnly, managesItem } from '../../../utils/permissions';

import BulkActions from './BulkActions';
import ItemFacts from './ItemFacts';

const DEFAULT_SORT = [{ column: 'version', direction: 'desc' }];

const Readme = ({ readme }) => {
  const { t } = useTranslation();
  return (
    <div className="card h-100">
      <div className="card-header">
        <h5 className="mb-0">{t('pages.item.readme')}</h5>
      </div>
      <div className="card-body">
        <MarkdownText text={readme} />
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
      className="btn btn-link p-0 text-warning d-inline-flex"
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

const useItemWatch = ({ collection, item, user, notify }) => {
  const { t } = useTranslation();
  const [watched, setWatched] = useState(false);
  const [busy, setBusy] = useState(false);
  const { watches } = collection.adapter;
  const available = Boolean(watches) && Boolean(user) && !isGuestOnly(user);

  useEffect(() => {
    if (!available || !item) {
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
  }, [watches, available, item]);

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

  return { available, watched, busy, toggle };
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
          event.currentTarget.classList.add('d-none');
        }}
      />
    );
  }
  return null;
};

const ItemHeading = ({ item, org, editor, actions, watch, manage, ctx }) => {
  const { t } = useTranslation();
  const { ItemChips, ItemHeaderExtra } = ctx.collection.slots;
  if (editor) {
    return (
      <PageHeader title={t('pages.item.details')} actions={actions}>
        {editor}
      </PageHeader>
    );
  }
  const title = (
    <span className="d-inline-flex align-items-center gap-2">
      {item.label || item.name}
      {watch.available ? (
        <WatchStar watched={watch.watched} busy={watch.busy} onToggle={watch.toggle} />
      ) : null}
    </span>
  );
  const chips = (
    <>
      <StatusChips
        status={manage ? statusOf(item) : null}
        visibility={manage ? visibilityOf(item) : null}
        osLabel={item.os?.label || null}
      />
      {ItemChips ? <ItemChips item={item} ctx={ctx} /> : null}
    </>
  );
  return (
    <PageHeader
      media={mediaFor(item)}
      title={title}
      subtitle={`${item.vendor || org} / ${item.name}`}
      chips={chips}
      actions={actions}
    >
      <MarkdownText text={item.description} className="mb-0 mt-2" />
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
  manage: PropTypes.bool.isRequired,
  ctx: PropTypes.object.isRequired,
};

const ItemDetails = ({ item }) => {
  const facts = Boolean(item.metadata);
  if (!facts && !item.readme) {
    return null;
  }
  return (
    <div className="row g-3 mb-4 mx-0 px-0">
      {facts ? (
        <div className="col-lg-5 col-xl-4">
          <ItemFacts item={item} />
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
};

const VersionsSection = ({ collection, item, columns, search, form, manage, org, ctx }) => {
  const { t } = useTranslation();
  const { VersionsActions, VersionRowActions } = collection.slots;
  const level = collection.levels.versions;
  const selection = useSelection(search.rows, {
    keyOf: version => version.version,
    labelOf: version => version.version,
  });
  const bulkable = Boolean(collection.bulk && collection.adapter.bulk && manage);
  const names = search.rows
    .filter(version => selection.selected.has(version.version))
    .map(version => version.version);
  return (
    <>
      <div className="list-table">
        <div className="d-flex align-items-center gap-2 flex-wrap">
          <h4 className="mb-0 me-auto d-flex align-items-center gap-2">
            {t(level.labelKey)}
            {names.length > 0 ? (
              <span className="small text-muted">
                · {t('pages.bulk.selected', { count: names.length })}
              </span>
            ) : null}
          </h4>
          {bulkable ? (
            <BulkActions
              collection={collection}
              level="versions"
              groups={[{ scope: { org, name: item.name }, names }]}
              onClear={selection.clear}
              onDone={() => {
                selection.clear();
                ctx.reload();
              }}
            />
          ) : null}
          {VersionsActions ? <VersionsActions item={item} ctx={ctx} /> : null}
        </div>
      </div>
      {form}
      <SubTable
        columns={columns}
        rows={search.rows}
        rowKey={version => version.version}
        RowActions={manage ? VersionRowActions : null}
        actionsProps={{ item, ctx }}
        rowProp="version"
        sort={search.sort}
        onSort={search.setSort}
        hiddenColumns={search.hiddenColumns}
        widths={search.widths}
        onResize={search.setColumnWidth}
        ctx={ctx}
        emptyText={t(search.filtering ? 'pages.noMatches' : 'pages.empty')}
        selection={bulkable ? selection.subtable : null}
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
  manage: PropTypes.bool.isRequired,
  org: PropTypes.string.isRequired,
  ctx: PropTypes.object.isRequired,
};

const ItemPage = ({ collection, org, name, context }) => {
  const { t, i18n } = useTranslation();
  const notify = useNotify();
  const status = useStatus();
  const [nonce, setNonce] = useState(0);
  const [data, setData] = useState({ key: '', item: null });
  const [editor, setEditor] = useState(null);
  const [form, setForm] = useState(null);
  const key = `${org}/${name}/${nonce}`;
  const ready = data.key === key;
  const { item } = data;
  const watch = useItemWatch({ collection, item: ready ? item : null, user: context.user, notify });
  const columns = collection.levels.versions
    ? collection.levels.versions.columns({ org, name })
    : [];
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
  const search = useDetailSearch({
    rows: ready && item ? sortVersionsNewestFirst(item.versions || []) : [],
    matches: versionLevelMatches,
    placeholderKey: 'pages.search.versions',
    columns,
    ctx,
    prefsKey: `${context.prefsPrefix}_${org}_${name}`,
    defaultSort: DEFAULT_SORT,
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
  const manage = managesItem(status, collection, item, context.user);

  return (
    <div className="list row">
      <ItemHeading
        item={item}
        org={org}
        editor={editor}
        actions={actions}
        watch={watch}
        manage={manage}
        ctx={ctx}
      />
      {ItemExtras ? <ItemExtras item={item} ctx={ctx} /> : null}
      <ItemDetails item={item} />
      {collection.hasVersions ? (
        <VersionsSection
          collection={collection}
          item={item}
          columns={columns}
          search={search}
          form={form}
          manage={manage}
          org={org}
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
