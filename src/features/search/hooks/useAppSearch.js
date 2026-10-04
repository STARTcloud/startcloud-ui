import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { hasFeature } from '../../../utils/capabilities';
import { parseRoute, reservedSegments } from '../../../utils/routes';
import { catalogSource, pageSource, servingSource } from '../sources';

const NO_SOURCES = [];

const HOST_ROUTE = /^\/hosts\/(?<id>[^/]+)/u;

const scopeReader = (collections, hostSources, t) => {
  const reserved = reservedSegments(collections);
  return pathname => {
    const host = HOST_ROUTE.exec(pathname);
    if (host) {
      const id = decodeURIComponent(host.groups.id);
      const label = hostSources.find(source => source.host === id)?.label || id;
      return { scope: `host:${id}`, label };
    }
    const route = parseRoute(pathname, { reserved, collections });
    if (route?.org) {
      return { scope: `org:${route.org}`, label: route.org };
    }
    if (route?.collection) {
      return { scope: `collection:${route.collection.key}`, label: t(route.collection.labelKey) };
    }
    return null;
  };
};

/**
 * The app-wide search the box and the results page run: the kind table,
 * the search sources, the sidebar's pages, the hosts feature's sources,
 * the serving backend unless a host source serves it, and the catalog's,
 * the scope a route lies in, and the mounted collections the results
 * list groups its rows by; no source while the host does not list
 * `search`.
 *
 * @param {Object} options
 * @param {Object} options.status - The payload from `probeStatus`
 * @param {Array<Object>} options.collections - The mounted collection definitions
 * @param {Array<Object>} options.sidebar - The folded sidebar groups
 * @param {Object<string, Array<Object>>} options.kinds - The kind table, the owners of each kind in fold order
 * @param {Array<Object>} options.hostSources - The hosts feature's sources
 * @returns {{ kinds: Object<string, Array<Object>>, sources: Array<Object>, scopeOf: Function, collections: Array<Object> }} The app search, `scopeOf(pathname)` answering `{ scope, label }` or null
 */
export const useAppSearch = ({ status, collections, sidebar, kinds, hostSources }) => {
  const { t } = useTranslation();
  const catalog = useMemo(() => catalogSource(status, collections), [status, collections]);
  const serving = useMemo(() => servingSource(status), [status]);
  return useMemo(() => {
    const scopeOf = scopeReader(collections, hostSources, t);
    if (!hasFeature(status, 'search')) {
      return { kinds, sources: NO_SOURCES, scopeOf, collections };
    }
    const served = hostSources.some(source => source.serving);
    return {
      kinds,
      collections,
      sources: [pageSource(sidebar, t), ...hostSources, served ? null : serving, catalog].filter(
        Boolean
      ),
      scopeOf,
    };
  }, [status, collections, kinds, sidebar, t, hostSources, serving, catalog]);
};
