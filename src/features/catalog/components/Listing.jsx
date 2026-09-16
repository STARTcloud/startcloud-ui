import PropTypes from 'prop-types';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import SubTable from '../../../components/common/SubTable';
import ViewToggle from '../../../components/common/ViewToggle';
import { useNotify } from '../../../contexts/NoticeContext';
import { useSelection } from '../../../hooks/useSelection';
import { collectionShape, pageContextShape } from '../../../utils/itemShape';
import { isOrgManager, managesAnyOrganization } from '../../../utils/permissions';
import { useCatalogSearch } from '../hooks/useCatalogSearch';

import BulkActions from './BulkActions';
import ItemCards from './ItemCards';

const groupByOrganization = (collection, items) => {
  const groups = new Map();
  items.forEach(item => {
    const key = item.organization.name;
    if (!groups.has(key)) {
      groups.set(key, {
        key: `${collection.key}:org:${key}`,
        organization: item.organization,
        items: [],
      });
    }
    groups.get(key).items.push(item);
  });
  return [...groups.values()];
};

const NO_IDS = new Set();

const useWatches = ({ collections, user, notify }) => {
  const { t } = useTranslation();
  const [ids, setIds] = useState({});
  const signedIn = Boolean(user);
  const available = signedIn && collections.some(collection => collection.adapter.watches);

  useEffect(() => {
    const watchable = collections.filter(collection => collection.adapter.watches);
    if (!signedIn || watchable.length === 0) {
      return undefined;
    }
    let mounted = true;
    Promise.all(
      watchable.map(collection =>
        collection.adapter.watches
          .list()
          .then(loaded => [collection.key, loaded])
          .catch(() => [collection.key, NO_IDS])
      )
    ).then(entries => {
      if (mounted) {
        setIds(Object.fromEntries(entries));
      }
    });
    return () => {
      mounted = false;
    };
  }, [signedIn, collections]);

  const toggle = (collection, item) => {
    const next = !(ids[collection.key] || NO_IDS).has(item.id);
    const apply = (all, watched) => {
      const copy = new Set(all[collection.key] || []);
      if (watched) {
        copy.add(item.id);
      } else {
        copy.delete(item.id);
      }
      return { ...all, [collection.key]: copy };
    };
    setIds(all => apply(all, next));
    collection.adapter.watches.toggle(item, next).catch(() => {
      setIds(all => apply(all, !next));
      notify('danger', t('pages.watch.error'));
    });
  };

  return { ids, toggle, available };
};

const CollectionHeading = ({ collection, count, picked, children }) => {
  const { t } = useTranslation();
  return (
    <div className="d-flex align-items-center gap-2 flex-wrap mb-2">
      <h2 className="h5 mb-0 me-auto d-flex align-items-center gap-2">
        {collection.icon}
        {t(collection.labelKey)}
        {picked > 0 ? (
          <span className="small text-muted">· {t('pages.bulk.selected', { count: picked })}</span>
        ) : (
          <span className="badge bg-secondary bg-opacity-50">{count}</span>
        )}
      </h2>
      {children}
    </div>
  );
};

CollectionHeading.propTypes = {
  collection: collectionShape.isRequired,
  count: PropTypes.number.isRequired,
  picked: PropTypes.number.isRequired,
  children: PropTypes.node,
};

const bulkGroupsOf = picked => {
  const byOrg = new Map();
  picked.forEach(item => {
    const org = item.organization.name;
    if (!byOrg.has(org)) {
      byOrg.set(org, { scope: { org }, names: [] });
    }
    byOrg.get(org).names.push(item.name);
  });
  return [...byOrg.values()];
};

const itemKey = item => item.id;

const NO_WATCH = { ids: NO_IDS, toggle: null };

/**
 * One collection's section of a listing page: the heading row with the
 * count or the picked state as its muted text and the one action pane at
 * its right — the picked-state group first, then the collection's own list
 * actions, then the page's actions and the view toggle — and under it the
 * collection's one `SubTable` (the watch column drawn star or blank, the
 * collection's quick actions and row actions from its slots, one group per
 * organization when the page spans them) or card grid, each row carrying
 * its select checkbox while the collection has bulk actions the viewer may
 * run.
 */
const CollectionSection = ({
  collection,
  items,
  bulkable,
  reload,
  table,
  common,
  view,
  ctx,
  actions = null,
}) => {
  const { t } = useTranslation();
  const selection = useSelection(items, { keyOf: itemKey, labelOf: item => item.name });
  const picked = items.filter(item => selection.selected.has(item.id));
  const { ListActions, ItemQuickActions, RowActions } = collection.slots;
  const shared = {
    collection,
    items,
    ctx,
    selection: bulkable ? selection.subtable : null,
    ...common,
  };
  const emptyText = ctx.filtering ? t('pages.noMatches') : t('pages.empty');
  const list =
    view === 'cards' ? (
      <ItemCards {...shared} />
    ) : (
      <SubTable
        columns={collection.columns}
        rows={items}
        rowKey={itemKey}
        rowProp="item"
        RowActions={RowActions}
        actionsProps={{ ctx }}
        QuickActions={ItemQuickActions}
        selection={shared.selection}
        watches={common.watches || NO_WATCH}
        groups={common.groups}
        collapsed={common.collapsed}
        onToggleGroup={common.onToggleGroup}
        countKey={collection.countKey}
        sort={table.sort}
        onSort={table.onSort}
        hiddenColumns={table.hiddenColumns}
        widths={table.widths}
        onResize={table.onResize}
        ctx={ctx}
        emptyText={emptyText}
      />
    );
  return (
    <div className="mb-4">
      <CollectionHeading collection={collection} count={items.length} picked={picked.length}>
        {bulkable ? (
          <BulkActions
            collection={collection}
            level="items"
            groups={bulkGroupsOf(picked)}
            onClear={selection.clear}
            onDone={() => {
              selection.clear();
              reload();
            }}
          />
        ) : null}
        {ListActions ? <ListActions ctx={ctx} /> : null}
        {actions}
      </CollectionHeading>
      {list}
    </div>
  );
};

CollectionSection.propTypes = {
  collection: collectionShape.isRequired,
  items: PropTypes.array.isRequired,
  bulkable: PropTypes.bool.isRequired,
  reload: PropTypes.func.isRequired,
  table: PropTypes.object.isRequired,
  common: PropTypes.object.isRequired,
  view: PropTypes.string.isRequired,
  ctx: PropTypes.object.isRequired,
  actions: PropTypes.node,
};

/**
 * The one listing behind the home, organization and collection pages: loads
 * every collection it is given, registers the search binding, and draws one
 * heading row per collection carrying that collection's list actions, one
 * table or card grid per collection with organization group rows when the
 * page spans organizations, and the page's actions with the one view toggle
 * on the header row when the page has a header, else on the first
 * collection's heading row.
 */
const Listing = ({ collections, org, member, grouped, context, header = null, actions = null }) => {
  const { t, i18n } = useTranslation();
  const notify = useNotify();
  const [nonce, setNonce] = useState(0);
  const [data, setData] = useState({ key: '', byCollection: {} });
  const signedIn = Boolean(context.user);
  const key = `${org}|${member}|${signedIn}|${nonce}|${collections.map(c => c.key).join(',')}`;
  const ready = data.key === key;
  const reload = () => setNonce(current => current + 1);

  useEffect(() => {
    let mounted = true;
    Promise.all(
      collections.map(collection =>
        (org ? collection.adapter.listOrg(org, { member }) : collection.adapter.listAll())
          .then(items => {
            if (items.notice && mounted) {
              notify(items.notice.type, t(items.notice.key), {
                tier: 'banner',
                key: items.notice.key,
              });
            }
            return [collection.key, items];
          })
          .catch(error => {
            notify('danger', error.messageKey ? t(error.messageKey) : error.message);
            return [collection.key, []];
          })
      )
    ).then(entries => {
      if (mounted) {
        setData({ key, byCollection: Object.fromEntries(entries) });
      }
    });
    return () => {
      mounted = false;
    };
  }, [key, collections, org, member, notify, t]);

  const watches = useWatches({ collections, user: context.user, notify });
  const search = useCatalogSearch({
    collections,
    itemsByCollection: data.byCollection,
    org,
    signedIn,
    watchedIds: watches.ids,
    prefsKey: `${context.prefsPrefix}_${org || 'home'}`,
  });
  const {
    visible,
    filtered,
    filtering,
    sort,
    setSort,
    view,
    setView,
    collapsed,
    toggleCollapsed,
    hiddenColumns,
    widths,
    setColumnWidth,
  } = search;

  const toggle = <ViewToggle view={view} onChange={setView} />;

  const ctxFor = collection => ({
    ...context,
    t,
    language: i18n.language,
    collection,
    org,
    member,
    filtering,
    reload,
    notify,
  });

  const manages = org ? isOrgManager(context.user, org) : managesAnyOrganization(context.user);

  const bulkableFor = collection =>
    Boolean(collection.bulk && collection.adapter.bulk && signedIn && manages);

  const renderCollection = (collection, index) => {
    const items = filtered[collection.key];
    return (
      <CollectionSection
        key={collection.key}
        collection={collection}
        items={items}
        bulkable={bulkableFor(collection)}
        reload={reload}
        view={view}
        ctx={ctxFor(collection)}
        common={{
          groups: grouped ? groupByOrganization(collection, items) : null,
          collapsed,
          onToggleGroup: toggleCollapsed,
          watches:
            watches.available && collection.adapter.watches
              ? {
                  ids: watches.ids[collection.key] || NO_IDS,
                  toggle: item => watches.toggle(collection, item),
                }
              : null,
        }}
        table={{
          sort: sort[collection.key],
          onSort: (column, options) => setSort(collection.key, column, options),
          hiddenColumns: hiddenColumns[collection.key],
          widths: widths[collection.key],
          onResize: (column, pixels) => setColumnWidth(collection.key, column, pixels),
        }}
        actions={
          !header && index === 0 ? (
            <>
              {actions}
              {toggle}
            </>
          ) : null
        }
      />
    );
  };

  return (
    <div className="list row">
      {header ? (
        <div className="d-flex justify-content-between align-items-center gap-3 flex-wrap mb-3">
          <div className="d-flex align-items-center gap-3 min-width-0">{header}</div>
          <div className="d-flex align-items-center gap-2 ms-auto">
            {actions}
            {toggle}
          </div>
        </div>
      ) : null}
      {ready ? visible.map(renderCollection) : <div>{t('pages.loading')}</div>}
    </div>
  );
};

Listing.propTypes = {
  collections: PropTypes.arrayOf(collectionShape).isRequired,
  org: PropTypes.string.isRequired,
  member: PropTypes.bool.isRequired,
  grouped: PropTypes.bool.isRequired,
  context: pageContextShape.isRequired,
  header: PropTypes.node,
  actions: PropTypes.node,
};

export default Listing;
