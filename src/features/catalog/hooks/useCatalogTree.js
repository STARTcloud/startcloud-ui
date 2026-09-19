import { useCallback, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';

import { sortVersionsNewestFirst } from '../../../utils/itemShape';
import {
  collectionPath,
  itemPath,
  parseRoute,
  reservedSegments,
  versionPath,
} from '../../../utils/routes';

const byName = (a, b) => a.toLowerCase().localeCompare(b.toLowerCase());

const versionNodes = ({ collection, org, item }) =>
  collection.adapter.getItem(org, item.name).then(loaded =>
    sortVersionsNewestFirst(loaded.versions || []).map(version => ({
      key: `${collection.key}:${org}:${item.name}:${version.version}`,
      label: version.version,
      to: versionPath(collection, org, item.name, version.version),
    }))
  );

const itemNode = ({ collection, org, item, routeOf }) => ({
  key: `${collection.key}:${org}:${item.name}`,
  label: item.label || item.name,
  to: itemPath(collection, org, item.name),
  matches: pathname => {
    const route = routeOf(pathname);
    return route?.collection === collection && route.org === org && route.item === item.name;
  },
  ...(collection.hasVersions ? { children: () => versionNodes({ collection, org, item }) } : {}),
});

const organizationNode = ({ collection, org, items, routeOf }) => ({
  key: `${collection.key}:${org}`,
  label: org,
  to: collectionPath(collection, org),
  matches: pathname => {
    const route = routeOf(pathname);
    return route?.collection === collection && route.org === org;
  },
  children: () =>
    [...items]
      .sort((a, b) => byName(a.name, b.name))
      .map(item => itemNode({ collection, org, item, routeOf })),
});

const groupByOrganization = items => {
  const groups = new Map();
  items.forEach(item => {
    const org = item.organization.name;
    if (!groups.has(org)) {
      groups.set(org, []);
    }
    groups.get(org).push(item);
  });
  return groups;
};

const organizationNodes = ({ collection, items, routeOf }) =>
  [...groupByOrganization(items).entries()]
    .sort(([a], [b]) => byName(a, b))
    .map(([org, own]) => organizationNode({ collection, org, items: own, routeOf }));

/**
 * The catalog feature's sidebar tree in decision 68's hook shape: one root
 * node per mounted collection, labelled by the collection's `labelKey` and
 * routing to its own all-organizations listing (`collectionPath` with no
 * organization, the collection's segment or, without one, its key), whose
 * children are one node per organization
 * from the adapter's `listAll` (grouped by `organization.name` the way the
 * listing groups its rows, sorted case-insensitively), each routing to the
 * organization's listing and folding out one node per item (the label or
 * the name, sorted case-insensitively, routing to the item page), an item
 * of a versioned collection folding out its versions newest first from the
 * adapter's `getItem`, each routing to the version page; every node
 * carries `matches(pathname)` over the shared `parseRoute` against the
 * shell's reserved segments, true for the collection root when the route's
 * collection is it, for an organization node when the route's organization
 * is it too, for an item node when the route's item is it as well, so a
 * deep link opens the path down to the item the way the crumbs read it;
 * the `listAll` answer is memoized per collection for the signed-in person,
 * so two organizations expand from one read, and forgotten when the person
 * changes; the answer carries the Browse heading as its `labelKey`.
 *
 * @param {Array<Object>} collections - The host's mounted collection definitions
 * @param {Object|null} user - The session's user, the memo's owner
 * @returns {{ nodes: Array<Object>, labelKey: string }} The tree the sidebar draws
 */
export const useCatalogTree = (collections, user) => {
  const { t } = useTranslation();
  const cache = useRef({ user: null, promises: new Map() });

  const listAll = useCallback(
    collection => {
      if (cache.current.user !== user) {
        cache.current = { user, promises: new Map() };
      }
      const { promises } = cache.current;
      if (!promises.has(collection.key)) {
        promises.set(collection.key, collection.adapter.listAll());
      }
      return promises.get(collection.key);
    },
    [user]
  );

  const routeOf = useCallback(
    pathname => parseRoute(pathname, { reserved: reservedSegments(collections), collections }),
    [collections]
  );

  return useMemo(
    () => ({
      labelKey: 'pages.sidebar.browse',
      nodes: collections.map(collection => ({
        key: collection.key,
        label: t(collection.labelKey),
        to: collectionPath(collection, ''),
        matches: pathname => routeOf(pathname)?.collection === collection,
        children: () =>
          listAll(collection).then(items => organizationNodes({ collection, items, routeOf })),
      })),
    }),
    [collections, listAll, routeOf, t]
  );
};
