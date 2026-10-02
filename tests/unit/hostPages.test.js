import { describe, expect, it } from 'vitest';

import { HOST_PAGES, hostPagePath, hostPagesFor } from '../../src/features/hosts/pages.js';

const rowOf = (features, hypervisors = []) => ({ capabilities: { features, hypervisors } });

const keysOf = pages => pages.map(page => page.key);

describe('HOST_PAGES', () => {
  it('lists the pages of a host in the order their doors draw', () => {
    expect(keysOf(HOST_PAGES)).toEqual([
      'overview',
      'machines',
      'manage',
      'networking',
      'devices',
      'storage',
      'settings',
    ]);
    expect(HOST_PAGES.map(page => page.segment)).toEqual([
      '',
      'machines',
      'manage',
      'networking',
      'devices',
      'storage',
      'settings',
    ]);
    expect(HOST_PAGES.every(page => typeof page.icon === 'function')).toBe(true);
  });
});

describe('hostPagePath', () => {
  it('answers the host route for the overview and a segment under it for every other page', () => {
    const [overview, machines, manage, networking] = HOST_PAGES;
    expect(hostPagePath(3, overview)).toBe('/hosts/3');
    expect(hostPagePath(3, machines)).toBe('/hosts/3/machines');
    expect(hostPagePath(3, manage)).toBe('/hosts/3/manage');
    expect(hostPagePath('self', networking)).toBe('/hosts/self/networking');
  });
});

describe('hostPagesFor', () => {
  it('offers the overview alone for a row that lists no token of a page', () => {
    expect(keysOf(hostPagesFor(rowOf(['monitoring', 'tasks']), 1))).toEqual(['overview']);
    expect(keysOf(hostPagesFor(null, 1))).toEqual(['overview']);
  });

  it('offers the machines behind machines, the manage page with them', () => {
    expect(keysOf(hostPagesFor(rowOf(['machines']), 1))).toEqual([
      'overview',
      'machines',
      'manage',
    ]);
  });

  it('offers the manage page behind any token of its sections', () => {
    expect(keysOf(hostPagesFor(rowOf(['services']), 1))).toEqual(['overview', 'manage']);
    expect(keysOf(hostPagesFor(rowOf(['system-users']), 1))).toEqual(['overview', 'manage']);
    expect(keysOf(hostPagesFor(rowOf(['host-power']), 1))).toEqual(['overview']);
  });

  it('offers the networking behind vnics or network-spaces, monitoring alone opening nothing', () => {
    expect(keysOf(hostPagesFor(rowOf(['vnics']), 1))).toEqual(['overview', 'manage', 'networking']);
    expect(keysOf(hostPagesFor(rowOf(['network-spaces']), 1))).toEqual(['overview', 'networking']);
    expect(keysOf(hostPagesFor(rowOf(['monitoring']), 1))).toEqual(['overview']);
  });

  it('offers the devices behind devices and the storage behind zfs, monitoring alone opening neither', () => {
    expect(keysOf(hostPagesFor(rowOf(['devices']), 1))).toEqual(['overview', 'devices']);
    expect(keysOf(hostPagesFor(rowOf(['zfs']), 1))).toEqual(['overview', 'manage', 'storage']);
    expect(keysOf(hostPagesFor(rowOf(['monitoring', 'zfs']), 1))).toEqual([
      'overview',
      'manage',
      'storage',
    ]);
    expect(hostPagePath(3, HOST_PAGES[4])).toBe('/hosts/3/devices');
    expect(hostPagePath('self', HOST_PAGES[5])).toBe('/hosts/self/storage');
  });

  it('answers each page with its route, its label key and whether its route is exact', () => {
    const pages = hostPagesFor(rowOf(['machines', 'vnics'], ['bhyve']), 7);
    expect(pages.map(page => [page.key, page.to, page.labelKey, page.end])).toEqual([
      ['overview', '/hosts/7', 'navbar.contextTabs.overview', true],
      ['machines', '/hosts/7/machines', 'hosts.machines.title.zone', false],
      ['manage', '/hosts/7/manage', 'navbar.contextTabs.manage', false],
      ['networking', '/hosts/7/networking', 'navbar.contextTabs.networking', false],
      ['settings', '/hosts/7/settings', 'navbar.contextTabs.agent', false],
    ]);
  });

  it('offers the agent settings to a row that names a hypervisor and to no other', () => {
    expect(keysOf(hostPagesFor(rowOf([], ['virtualbox']), 1))).toEqual(['overview', 'settings']);
    expect(keysOf(hostPagesFor(rowOf(['machines'], []), 1))).toEqual([
      'overview',
      'machines',
      'manage',
    ]);
    expect(hostPagePath('self', HOST_PAGES[6])).toBe('/hosts/self/settings');
  });

  it('names the machines by the noun the host fixes', () => {
    const [, machines] = hostPagesFor(rowOf(['machines'], ['virtualbox']), 1);
    expect(machines.labelKey).toBe('hosts.machines.title.machine');
  });
});
