export const collectionPath = (collection, org) => {
  const base = org ? `/${org}` : '';
  const segment = collection.segment ? `/${collection.segment}` : '';
  return `${base}${segment}` || '/';
};

export const itemPath = (collection, org, name) =>
  `${collectionPath(collection, org).replace(/\/$/, '')}/${name}`;

export const versionPath = (collection, org, name, version) =>
  `${itemPath(collection, org, name)}/${version}`;

export const providerPath = (collection, org, name, version, provider) =>
  `${versionPath(collection, org, name, version)}/${provider}`;

const emptyRoute = { org: '', collection: null, item: '', version: '', provider: '' };

/**
 * Reads the current path as the shared page levels. Returns null on a
 * reserved first segment (an app page that is not an organization), the
 * empty route on the home page, and otherwise the organization, the
 * collection (the implicit one when the route carries no segment for it),
 * the item, the version and the provider.
 */
export const parseRoute = (pathname, { reserved, collections }) => {
  const segments = pathname.split('/').filter(Boolean).map(decodeURIComponent);
  if (segments.length === 0) {
    return emptyRoute;
  }
  const [first, ...rest] = segments;
  const topCollection = collections.find(entry => entry.segment && entry.segment === first);
  if (topCollection) {
    return { ...emptyRoute, collection: topCollection };
  }
  if (reserved.includes(first)) {
    return null;
  }
  const explicit = collections.find(entry => entry.segment && entry.segment === rest[0]);
  const tail = explicit ? rest.slice(1) : rest;
  const implicit = collections.find(entry => !entry.segment) || null;
  const collection = explicit || (tail.length > 0 ? implicit : null);
  return {
    org: first,
    collection,
    item: tail[0] || '',
    version: tail[1] || '',
    provider: tail[2] || '',
  };
};

/**
 * The root crumb a host with a column opens its crumbs with: the product
 * name, linking to `/`.
 */
export const rootCrumb = name => ({ key: 'root', label: name, to: '/' });

/**
 * The page's title as the second crumb of a reserved route no sidebar
 * row matches, from the route's registered title key; none without one.
 */
export const titleCrumb = (titleKey, t) => (titleKey ? [{ key: 'title', label: t(titleKey) }] : []);

const rowMatches = (row, pathname) => {
  if (row.external) {
    return false;
  }
  if (row.end) {
    return pathname === row.to;
  }
  return pathname === row.to || pathname.startsWith(`${row.to}/`);
};

const sidebarEntries = groups =>
  groups.flatMap(group =>
    (group.sections || []).flatMap(section =>
      section.items.flatMap(row => [
        { group, row, parent: null },
        ...(row.children || []).map(child => ({ group, row: child, parent: row })),
      ])
    )
  );

/**
 * The crumbs of a route a sidebar row matches: the group as a plain word,
 * then the row; on a route a child row matches the group, the parent row
 * linking to its own page, then the child's label, so
 * `/user/profile/favorites` reads Account, Profile, Favorites. The
 * longest matching `to` wins, an `end` row matches its exact path alone
 * and an `external` row never matches; none when no row matches.
 *
 * @param {Object} options - The shell's side
 * @param {Array} options.groups - The sidebar groups the features exported
 * @param {string} options.pathname - The current path
 * @param {Function} options.t - The translator
 * @returns {Array} The crumbs after the root crumb
 */
export const sidebarCrumbs = ({ groups, pathname, t }) => {
  const [match] = sidebarEntries(groups)
    .filter(entry => rowMatches(entry.row, pathname))
    .sort((a, b) => b.row.to.length - a.row.to.length);
  if (!match) {
    return [];
  }
  const crumbs = [{ key: 'group', label: t(match.group.labelKey) }];
  if (match.parent) {
    crumbs.push({ key: 'row', label: t(match.parent.labelKey), to: match.parent.to });
  }
  crumbs.push({
    key: match.parent ? 'child' : 'row',
    label: t(match.row.labelKey),
    to: match.row.to,
  });
  return crumbs;
};

/**
 * The crumbs of a page reached from a sidebar row but living at its own
 * path: the row's own crumbs as a child route draws them, the row linking
 * to its page, then the page's name as the last crumb, plain text; none
 * while no row matches the parent path or the page has no name yet.
 *
 * @param {Object} options - The shell's side
 * @param {Array} options.groups - The sidebar groups the features exported
 * @param {string} options.parent - The path of the row the page descends from
 * @param {string} options.name - The page's own name
 * @param {Function} options.t - The translator
 * @returns {Array} The crumbs after the root crumb
 */
export const parentedCrumbs = ({ groups, parent, name, t }) => {
  if (!parent || !name) {
    return [];
  }
  const crumbs = sidebarCrumbs({ groups, pathname: parent, t });
  return crumbs.length > 0 ? [...crumbs, { key: 'page', label: name }] : [];
};

export const buildRouteCrumbs = ({ route, t, orgIcon }) => {
  if (!route) {
    return [];
  }
  const { org, collection, item, version, provider } = route;
  const crumbs = [];
  if (org) {
    crumbs.push({ key: 'org', icon: orgIcon, label: org, to: `/${org}` });
  }
  if (collection) {
    crumbs.push({
      key: 'collection',
      icon: collection.icon,
      label: t(collection.labelKey),
      to: collectionPath(collection, org),
    });
  }
  if (item) {
    crumbs.push({ key: 'item', label: item, to: itemPath(collection, org, item) });
  }
  if (version) {
    crumbs.push({
      key: 'version',
      label: version,
      to: versionPath(collection, org, item, version),
    });
  }
  if (provider) {
    crumbs.push({
      key: 'provider',
      label: provider,
      to: providerPath(collection, org, item, version, provider),
    });
  }
  return crumbs;
};
