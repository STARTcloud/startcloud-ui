import { describe, expect, it } from 'vitest';

import {
  UNIVERSAL_ROUTES,
  buildRouteCrumbs,
  collectionPath,
  parentedCrumbs,
  parseRoute,
  reservedSegments,
  sidebarCrumbs,
  titleCrumb,
} from '../../src/utils/routes.js';

const Icon = () => null;
const boxes = { key: 'boxes', segment: '', icon: Icon, labelKey: 'boxes.label' };
const isos = { key: 'isos', segment: 'isos', icon: Icon, labelKey: 'isos.label' };
const downloads = {
  key: 'downloads',
  segment: 'downloads',
  icon: Icon,
  labelKey: 'downloads.label',
  leafIsFile: true,
};
const collections = [boxes, isos, downloads];
const reserved = reservedSegments(collections);
const t = key => key;

describe('reservedSegments', () => {
  it('lists every universal route, the build folders and every collection root', () => {
    expect(reserved).toEqual([...UNIVERSAL_ROUTES, 'boxes', 'isos', 'downloads']);
    expect(reserved).toEqual(expect.arrayContaining(['api', 'assets', 'brand', 'themes', 'user']));
  });
});

describe('parseRoute', () => {
  it('answers the empty route on the home page and null on a reserved segment', () => {
    expect(parseRoute('/', { reserved, collections })).toEqual({
      org: '',
      collection: null,
      item: '',
      version: '',
      provider: '',
      architecture: '',
    });
    expect(parseRoute('/admin/users', { reserved, collections })).toBeNull();
  });

  it('answers the collection alone on its own root', () => {
    expect(parseRoute('/isos', { reserved, collections })).toMatchObject({
      org: '',
      collection: isos,
    });
    expect(parseRoute('/boxes', { reserved, collections })).toMatchObject({ collection: boxes });
  });

  it('reads the implicit collection on an organization route without a segment', () => {
    expect(parseRoute('/STARTcloud/alma9-server/1.2.3/zone', { reserved, collections })).toEqual({
      org: 'STARTcloud',
      collection: boxes,
      item: 'alma9-server',
      version: '1.2.3',
      provider: 'zone',
      architecture: '',
    });
    expect(parseRoute('/STARTcloud', { reserved, collections })).toMatchObject({
      org: 'STARTcloud',
      collection: null,
    });
  });

  it('reads the explicit collection and the fifth part only for a file leaf', () => {
    expect(parseRoute('/acme/isos/debian/12/amd64/extra', { reserved, collections })).toMatchObject(
      {
        collection: isos,
        item: 'debian',
        version: '12',
        provider: 'amd64',
        architecture: '',
      }
    );
    expect(
      parseRoute('/acme/downloads/domino/14.5/FP1/linux-x64', { reserved, collections })
    ).toMatchObject({ collection: downloads, provider: 'FP1', architecture: 'linux-x64' });
    expect(parseRoute('/org/isos/debian', { reserved, collections })).toBeNull();
  });
});

describe('collectionPath', () => {
  it('answers the root with no organization and the segment under one', () => {
    expect(collectionPath(isos, '')).toBe('/isos');
    expect(collectionPath(boxes, '')).toBe('/boxes');
    expect(collectionPath(isos, 'org')).toBe('/org/isos');
    expect(collectionPath(boxes, 'org')).toBe('/org');
  });
});

describe('crumbs', () => {
  const groups = [
    {
      key: 'account',
      labelKey: 'account.sidebar.title',
      sections: [
        {
          key: 'account',
          items: [
            {
              key: 'profile',
              labelKey: 'account.sidebar.profile',
              to: '/user/profile',
              end: true,
              children: [
                {
                  key: 'favorites',
                  labelKey: 'profile.tabs.favorites',
                  to: '/user/profile/favorites',
                },
              ],
            },
            {
              key: 'organizations',
              labelKey: 'account.sidebar.organizations',
              to: '/user/organizations',
            },
            { key: 'docs', labelKey: 'docs', to: 'https://docs', external: true },
          ],
        },
      ],
    },
  ];

  it('draws group, row and child for a sidebar route', () => {
    expect(sidebarCrumbs({ groups, pathname: '/user/profile/favorites', t })).toEqual([
      { key: 'group', label: 'account.sidebar.title' },
      { key: 'row', label: 'account.sidebar.profile', to: '/user/profile' },
      { key: 'child', label: 'profile.tabs.favorites', to: '/user/profile/favorites' },
    ]);
    expect(sidebarCrumbs({ groups, pathname: '/user/profile', t })).toHaveLength(2);
    expect(sidebarCrumbs({ groups, pathname: '/user/profile/security', t })).toEqual([]);
    expect(sidebarCrumbs({ groups, pathname: '/user/organizations/x', t })).toHaveLength(2);
    expect(sidebarCrumbs({ groups, pathname: 'https://docs', t })).toEqual([]);
  });

  it('draws a parented page as the row then the page name', () => {
    expect(
      parentedCrumbs({ groups, parent: '/user/organizations', name: 'STARTcloud', t })
    ).toEqual([
      { key: 'group', label: 'account.sidebar.title' },
      { key: 'row', label: 'account.sidebar.organizations', to: '/user/organizations' },
      { key: 'page', label: 'STARTcloud' },
    ]);
    expect(parentedCrumbs({ groups, parent: '/user/organizations', name: '', t })).toEqual([]);
  });

  it('draws one crumb per present catalog level and leaves the host organization out', () => {
    const route = parseRoute('/acme/isos/debian/12/amd64', { reserved, collections });
    const crumbs = buildRouteCrumbs({ route, t, orgIcon: null });
    expect(crumbs.map(crumb => crumb.key)).toEqual([
      'org',
      'collection',
      'item',
      'version',
      'provider',
    ]);
    expect(crumbs[2].to).toBe('/acme/isos/debian');
    expect(buildRouteCrumbs({ route, t, orgIcon: null, hostOrg: 'acme' })[0].key).toBe(
      'collection'
    );
    expect(buildRouteCrumbs({ route: null, t, orgIcon: null })).toEqual([]);
    expect(titleCrumb('pages.about.title', t)).toEqual([
      { key: 'title', label: 'pages.about.title' },
    ]);
    expect(titleCrumb('', t)).toEqual([]);
  });
});
