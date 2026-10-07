import { describe, expect, it } from 'vitest';

import { dashboardTiles } from '../../src/features/hosts/components/Dashboard/DashboardCharts.jsx';
import {
  bytesToSize,
  calculateInfrastructureSummary,
  getServerHealthStatus,
  getStatusColor,
  hasHighLoad,
  hasLowFreeMemory,
  isUnhealthy,
  memoryPercentOf,
  serverResultOf,
} from '../../src/features/hosts/components/Dashboard/dashboardUtils.js';
import {
  DASHBOARD_WIDGET_IDS,
  movedLayout,
  normalizeLayout,
} from '../../src/features/hosts/components/Dashboard/useDashboardLayout.js';

const GIB = 1024 ** 3;

const stats = (over = {}) => ({
  totalmem: 32 * GIB,
  freemem: 16 * GIB,
  loadavg: [0.4, 0.3, 0.2],
  allmachines: ['a', 'b', 'c'],
  runningmachines: ['a'],
  ...over,
});

const result = (id, over = {}) =>
  serverResultOf({
    server: { id },
    stats: stats(),
    loaded: true,
    failed: false,
    health: null,
    error: null,
    ...over,
  });

describe('bytesToSize', () => {
  it('rounds to the largest unit that fits', () => {
    expect(bytesToSize(0)).toBe('0 Byte');
    expect(bytesToSize(512)).toBe('512 Bytes');
    expect(bytesToSize(1536)).toBe('2 KB');
    expect(bytesToSize(32 * GIB)).toBe('32 GB');
  });
});

describe('hasHighLoad, hasLowFreeMemory and memoryPercentOf', () => {
  it('read hyperweaver-ui thresholds from the stats', () => {
    expect(hasHighLoad(stats())).toBe(false);
    expect(hasHighLoad(stats({ loadavg: [2.5] }))).toBe(true);
    expect(hasHighLoad(null)).toBe(false);
    expect(hasLowFreeMemory(stats())).toBe(false);
    expect(hasLowFreeMemory(stats({ freemem: GIB }))).toBe(true);
    expect(hasLowFreeMemory({})).toBe(false);
    expect(memoryPercentOf(stats())).toBe(50);
    expect(memoryPercentOf({})).toBeNull();
  });
});

describe('serverResultOf and getServerHealthStatus', () => {
  it('answers a healthy result for stats that answered and offline for a host that did not', () => {
    const healthy = result(1);
    expect(healthy.success).toBe(true);
    expect(healthy.data).toEqual(stats());
    expect(getServerHealthStatus(healthy)).toBe('healthy');
    const offline = result(2, { failed: true, error: 'down' });
    expect(offline.success).toBe(false);
    expect(offline.data).toBeNull();
    expect(offline.error).toBe('down');
    expect(getServerHealthStatus(offline)).toBe('offline');
    expect(getServerHealthStatus(result(3, { stats: stats({ loadavg: [3] }) }))).toBe('warning');
  });

  it('colors each word', () => {
    expect(getStatusColor('healthy')).toBe('text-success');
    expect(getStatusColor('warning')).toBe('text-warning');
    expect(getStatusColor('offline')).toBe('text-danger');
    expect(getStatusColor('other')).toBe('text-muted');
  });
});

describe('calculateInfrastructureSummary', () => {
  it('counts the hosts, the machines, the memory, the healthy hosts and the issues', () => {
    const summary = calculateInfrastructureSummary([
      result(1),
      result(2, { failed: true, error: 'down' }),
      result(3, {
        stats: stats({ loadavg: [3] }),
        health: { reboot_required: true, faultStatus: { hasFaults: true, faultCount: 2 } },
      }),
    ]);
    expect(summary).toEqual({
      totalServers: 3,
      onlineServers: 2,
      offlineServers: 1,
      totalZones: 6,
      runningZones: 2,
      stoppedZones: 4,
      totalMemory: 64 * GIB,
      usedMemory: 32 * GIB,
      healthyServers: 1,
      totalIssues: 5,
      serversRequiringReboot: 1,
    });
  });

  it('answers zeros for no host', () => {
    expect(calculateInfrastructureSummary([]).totalServers).toBe(0);
  });
});

describe('isUnhealthy', () => {
  it('names a host that is not healthy, owes a reboot or carries a fault', () => {
    expect(isUnhealthy(result(1))).toBe(false);
    expect(isUnhealthy(result(2, { failed: true }))).toBe(true);
    expect(isUnhealthy(result(3, { health: { reboot_required: true } }))).toBe(true);
    expect(isUnhealthy(result(4, { health: { faultStatus: { hasFaults: true } } }))).toBe(true);
  });
});

describe('normalizeLayout', () => {
  it('keeps the saved order and flags, drops an unknown id and appends a widget never saved', () => {
    expect(normalizeLayout(null)).toEqual(
      DASHBOARD_WIDGET_IDS.map(id => ({ id, hidden: false, collapsed: false }))
    );
    expect(
      normalizeLayout([
        { id: 'serverCards', hidden: true },
        { id: 'gone' },
        { id: 'summary', collapsed: true },
      ])
    ).toEqual([
      { id: 'serverCards', hidden: true, collapsed: false },
      { id: 'summary', hidden: false, collapsed: true },
      { id: 'charts', hidden: false, collapsed: false },
      { id: 'quickActions', hidden: false, collapsed: false },
      { id: 'topology', hidden: false, collapsed: false },
    ]);
  });
});

describe('dashboardTiles', () => {
  it('answers one tile a host and dashboard chart whose tokens the host lists, none of a host without them', () => {
    const watched = { id: 'self', capabilities: { features: ['hosts', 'monitoring'] } };
    const bare = { id: 2, capabilities: { features: ['hosts'] } };
    expect(dashboardTiles([watched, bare]).map(tile => [tile.server.id, tile.chart.key])).toEqual([
      ['self', 'cpu'],
      ['self', 'network'],
    ]);
    expect(dashboardTiles([bare])).toEqual([]);
  });
});

describe('movedLayout', () => {
  it('moves one widget to the place of another and answers the same layout when nothing moves', () => {
    const layout = normalizeLayout(null);
    expect(movedLayout(layout, 'topology', 'summary').map(row => row.id)).toEqual([
      'topology',
      'summary',
      'charts',
      'quickActions',
      'serverCards',
    ]);
    expect(movedLayout(layout, 'summary', 'serverCards').map(row => row.id)).toEqual([
      'charts',
      'quickActions',
      'summary',
      'serverCards',
      'topology',
    ]);
    expect(movedLayout(layout, 'summary', 'summary')).toBe(layout);
    expect(movedLayout(layout, null, 'summary')).toBe(layout);
    expect(movedLayout(layout, 'summary', 'gone')).toBe(layout);
  });
});
