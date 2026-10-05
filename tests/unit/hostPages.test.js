import { describe, expect, it } from 'vitest';

import {
  HOST_PAGES,
  hostPageOf,
  hostPagePath,
  hostPagesFor,
} from '../../src/features/hosts/pages.js';

const rowOf = (features, hypervisors = [], config = undefined) => ({
  capabilities: { features, hypervisors, ...(config ? { config } : {}) },
});

const keysOf = list => list.map(entry => entry.key);

const pagesOf = (server, id) =>
  Object.fromEntries(hostPagesFor(server, id).map(group => [group.key, keysOf(group.pages)]));

describe('HOST_PAGES', () => {
  it('lists the groups of a host in the order the column draws them, Overview and Machines flat', () => {
    expect(keysOf(HOST_PAGES)).toEqual([
      'overview',
      'machines',
      'network',
      'storage',
      'devices',
      'system',
      'updates',
      'provisioning',
      'files',
      'agent',
    ]);
    expect(HOST_PAGES.filter(group => group.flat).map(group => group.key)).toEqual([
      'overview',
      'machines',
    ]);
    expect(HOST_PAGES.every(group => typeof group.icon === 'function')).toBe(true);
  });

  it('lists one row a page under each group, each with its segment and its glyph', () => {
    const segmentsOf = key => {
      const group = HOST_PAGES.find(entry => entry.key === key);
      const pages = typeof group.pages === 'function' ? group.pages(null) : group.pages;
      expect(pages.every(page => typeof page.icon === 'function')).toBe(true);
      return pages.map(page => page.segment);
    };
    expect(segmentsOf('network')).toEqual([
      'network/interfaces',
      'network/topology',
      'network/addresses',
      'network/routes',
      'network/bandwidth',
      'network/links',
      'network/spaces',
      'network/hostname',
      'network/hosts-file',
      'network/dns',
    ]);
    expect(segmentsOf('storage')).toEqual([
      'storage/pools',
      'storage/snapshots',
      'storage/arc',
      'storage/disks',
      'storage/boot-environments',
    ]);
    expect(segmentsOf('devices')).toEqual(['devices']);
    expect(segmentsOf('system')).toEqual([
      'system/services',
      'system/processes',
      'system/users',
      'system/time',
      'system/runlevel',
      'system/logs',
      'system/faults',
    ]);
    expect(segmentsOf('updates')).toEqual([
      'updates/packages',
      'updates/system',
      'updates/repositories',
    ]);
    expect(segmentsOf('provisioning')).toEqual([
      'provisioning/recipes',
      'provisioning/templates',
      'provisioning/provisioners',
      'provisioning/network',
      'provisioning/installers',
      'provisioning/orchestration',
    ]);
    expect(segmentsOf('files')).toEqual(['files']);
    expect(segmentsOf('agent')).toEqual([
      'agent/secrets',
      'agent/api-keys',
      'agent/database',
      'agent/update',
    ]);
  });
});

describe('hostPagePath', () => {
  it('answers the host route for the overview and a segment under it for every other page', () => {
    const [overview] = HOST_PAGES[0].pages;
    const [machines] = HOST_PAGES[1].pages;
    const [interfaces] = HOST_PAGES[2].pages;
    expect(hostPagePath(3, overview)).toBe('/hosts/3');
    expect(hostPagePath(3, machines)).toBe('/hosts/3/machines');
    expect(hostPagePath('self', interfaces)).toBe('/hosts/self/network/interfaces');
  });
});

describe('hostPagesFor', () => {
  it('offers the overview alone for a row that lists no token of a page and names no hypervisor', () => {
    expect(keysOf(hostPagesFor(rowOf(['tasks']), 1))).toEqual(['overview']);
    expect(keysOf(hostPagesFor(null, 1))).toEqual(['overview']);
  });

  it('drops a group none of whose pages the row offers', () => {
    expect(keysOf(hostPagesFor(rowOf(['machines']), 1))).toEqual([
      'overview',
      'machines',
      'provisioning',
    ]);
    expect(pagesOf(rowOf(['machines']), 1).provisioning).toEqual(['orchestration']);
  });

  it('offers each network row behind the tokens of the reads its page draws', () => {
    expect(pagesOf(rowOf(['monitoring']), 1).network).toEqual([
      'interfaces',
      'topology',
      'addresses',
      'bandwidth',
    ]);
    expect(pagesOf(rowOf(['ip-addresses']), 1).network).toEqual(['addresses']);
    expect(pagesOf(rowOf(['network-spaces']), 1).network).toEqual(['topology', 'spaces']);
    expect(pagesOf(rowOf(['vnics']), 1).network).toEqual([
      'topology',
      'addresses',
      'links',
      'hostname',
      'dns',
    ]);
    expect(pagesOf(rowOf(['monitoring', 'vnics']), 1).network).toEqual([
      'interfaces',
      'topology',
      'addresses',
      'routes',
      'bandwidth',
      'links',
      'hostname',
      'dns',
    ]);
    expect(pagesOf(rowOf(['hosts-file']), 1).network).toEqual(['hosts-file']);
    expect(pagesOf(rowOf(['tasks']), 1).network).toBeUndefined();
  });

  it('offers the storage rows and the disks behind zfs alone and the boot environments behind their token', () => {
    expect(pagesOf(rowOf(['zfs']), 1).storage).toEqual(['pools', 'snapshots', 'arc', 'disks']);
    expect(pagesOf(rowOf(['monitoring']), 1).storage).toBeUndefined();
    expect(pagesOf(rowOf(['boot-environments']), 1).storage).toEqual(['boot-environments']);
    expect(pagesOf(rowOf(['devices']), 1).devices).toEqual(['devices']);
  });

  it('offers the system, updates, provisioning and files rows behind their tokens', () => {
    const row = rowOf(
      [
        'services',
        'processes',
        'system-users',
        'time-sync',
        'runlevel',
        'fault-management',
        'syslog',
        'packages',
        'repositories',
        'provisioning',
        'templates',
        'provisioner-registry',
        'artifacts',
        'machines',
        'file-browser',
      ],
      ['bhyve']
    );
    const pages = pagesOf(row, 1);
    expect(pages.system).toEqual([
      'services',
      'processes',
      'users',
      'time',
      'runlevel',
      'logs',
      'faults',
    ]);
    expect(pages.updates).toEqual(['packages', 'system-updates', 'repositories']);
    expect(pages.provisioning).toEqual([
      'recipes',
      'templates',
      'provisioners',
      'provisioning-network',
      'installers',
      'orchestration',
    ]);
    expect(pages.files).toEqual(['file-manager']);
  });

  it('offers the logs behind fault-management with log-streaming or syslog and the recipes on a bhyve host alone', () => {
    expect(pagesOf(rowOf(['fault-management']), 1).system).toEqual(['faults']);
    expect(pagesOf(rowOf(['fault-management', 'log-streaming']), 1).system).toEqual([
      'logs',
      'faults',
    ]);
    expect(pagesOf(rowOf(['provisioning'], ['virtualbox']), 1).provisioning).toEqual([
      'provisioning-network',
    ]);
    expect(pagesOf(rowOf(['artifacts']), 1).provisioning).toEqual(['installers']);
  });

  it('offers the agent rows to a row that names a hypervisor, the secrets behind secrets and one row a configuration file', () => {
    expect(pagesOf(rowOf([], ['virtualbox']), 1).agent).toEqual(['api-keys', 'database', 'update']);
    expect(pagesOf(rowOf(['secrets'], ['virtualbox']), 1).agent).toEqual([
      'secrets',
      'api-keys',
      'database',
      'update',
    ]);
    expect(pagesOf(rowOf(['vnics'], []), 1).agent).toBeUndefined();
    const configured = hostPagesFor(rowOf([], ['virtualbox'], ['app', 'machines']), 1);
    const agent = configured.find(group => group.key === 'agent');
    expect(agent.pages.slice(0, 2)).toEqual([
      expect.objectContaining({
        key: 'config:app',
        label: 'app',
        to: '/hosts/1/agent/config/app',
        end: false,
      }),
      expect.objectContaining({
        key: 'config:machines',
        label: 'machines',
        to: '/hosts/1/agent/config/machines',
      }),
    ]);
  });

  it('answers each row with its route, its label key and whether its route is exact', () => {
    const groups = hostPagesFor(rowOf(['machines', 'vnics'], ['bhyve']), 7);
    expect(groups.map(group => [group.key, group.labelKey, group.flat])).toEqual([
      ['overview', 'navbar.contextTabs.overview', true],
      ['machines', 'hosts.machines.title.zone', true],
      ['network', 'hosts.nav.network', false],
      ['provisioning', 'navbar.contextTabs.provisioning', false],
      ['agent', 'hosts.nav.agent', false],
    ]);
    expect(groups[0].pages).toEqual([
      expect.objectContaining({
        key: 'overview',
        to: '/hosts/7',
        labelKey: 'navbar.contextTabs.overview',
        end: true,
      }),
    ]);
    expect(groups[2].pages.map(page => [page.key, page.to, page.end])).toEqual([
      ['topology', '/hosts/7/network/topology', false],
      ['addresses', '/hosts/7/network/addresses', false],
      ['links', '/hosts/7/network/links', false],
      ['hostname', '/hosts/7/network/hostname', false],
      ['dns', '/hosts/7/network/dns', false],
    ]);
  });

  it('names the machines by the noun the host fixes', () => {
    const [, machines] = hostPagesFor(rowOf(['machines'], ['virtualbox']), 1);
    expect(machines.labelKey).toBe('hosts.machines.title.machine');
    expect(machines.pages[0].labelKey).toBe('hosts.machines.title.machine');
  });
});

describe('hostPageOf', () => {
  const row = rowOf(['machines', 'vnics', 'zfs'], ['bhyve'], ['app']);

  it('answers the group and the page a route lies on, the overview for the host route alone', () => {
    expect(hostPageOf('/hosts/3', row)).toMatchObject({
      id: '3',
      group: { key: 'overview' },
      page: { key: 'overview' },
    });
    expect(hostPageOf('/hosts/3/network/links', row)).toMatchObject({
      group: { key: 'network' },
      page: { key: 'links' },
    });
    expect(hostPageOf('/hosts/3/storage/pools/rpool', row)).toMatchObject({
      group: { key: 'storage' },
      page: { key: 'pools' },
    });
    expect(hostPageOf('/hosts/3/agent/config/app', row)).toMatchObject({
      group: { key: 'agent' },
      page: { key: 'config:app' },
    });
  });

  it('lays a machine route on the machines page and answers null off the hosts feature', () => {
    expect(hostPageOf('/hosts/3/machines/web-1/settings', row)).toMatchObject({
      page: { key: 'machines' },
    });
    expect(hostPageOf('/hosts/3/network/spaces', row)).toBeNull();
    expect(hostPageOf('/profile', row)).toBeNull();
  });
});
