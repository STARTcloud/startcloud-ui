import {
  FaDatabase,
  FaDesktop,
  FaGauge,
  FaGear,
  FaHardDrive,
  FaSitemap,
  FaUsb,
} from 'react-icons/fa6';

import { hostHasSettings } from './utils/agentSettings';
import { hostHasFeature } from './utils/capabilities';
import { machineNoun } from './utils/hosts';
import { hostHasManage } from './utils/manage';
import { hostHasNetworking } from './utils/networking';

const always = () => true;

/**
 * The pages of a host, the one list every door to them reads, the tab
 * row under a host page's heading and the rows of the host node's
 * right-click menu in the sidebar tree, whose node lists no page row
 * itself, hyperweaver-ui's shape: each entry
 * its key, the segment of its route under `/hosts/{id}`, empty for the
 * host's own route, its glyph, `labelKey(server)` answering the key of
 * its label and `offered(server)` its gate on the host's own row, checked
 * strictly. Overview is always offered; Machines, named by the noun the
 * host's hypervisors fix, behind `machines`; Manage behind any token of
 * its sections, hyperweaver-ui's `MANAGE_FEATURES`; Networking behind
 * `vnics` or `network-spaces`, hyperweaver-ui's gate; Devices behind
 * `devices` and Storage behind `zfs`, hyperweaver-ui's gates of its two
 * tabs; Agent settings, hyperweaver-ui's Agent tab, drawn behind no
 * token there and so offered to a row that names a hypervisor. A page a
 * later round ports is one entry added here.
 */
export const HOST_PAGES = [
  {
    key: 'overview',
    segment: '',
    icon: FaGauge,
    labelKey: () => 'navbar.contextTabs.overview',
    offered: always,
  },
  {
    key: 'machines',
    segment: 'machines',
    icon: FaDesktop,
    labelKey: server => `hosts.machines.title.${machineNoun(server ? [server] : [])}`,
    offered: server => hostHasFeature(server, 'machines'),
  },
  {
    key: 'manage',
    segment: 'manage',
    icon: FaGear,
    labelKey: () => 'navbar.contextTabs.manage',
    offered: hostHasManage,
  },
  {
    key: 'networking',
    segment: 'networking',
    icon: FaSitemap,
    labelKey: () => 'navbar.contextTabs.networking',
    offered: hostHasNetworking,
  },
  {
    key: 'devices',
    segment: 'devices',
    icon: FaUsb,
    labelKey: () => 'navbar.contextTabs.devices',
    offered: server => hostHasFeature(server, 'devices'),
  },
  {
    key: 'storage',
    segment: 'storage',
    icon: FaHardDrive,
    labelKey: () => 'navbar.contextTabs.storage',
    offered: server => hostHasFeature(server, 'zfs'),
  },
  {
    key: 'settings',
    segment: 'settings',
    icon: FaDatabase,
    labelKey: () => 'navbar.contextTabs.agent',
    offered: hostHasSettings,
  },
];

/**
 * The route of one page of a host.
 *
 * @param {string|number} id - The registry id, or `self` on an agent role
 * @param {{ segment: string }} page - The page's entry in `HOST_PAGES`
 * @returns {string} The route
 */
export const hostPagePath = (id, page) =>
  page.segment
    ? `/hosts/${encodeURIComponent(id)}/${page.segment}`
    : `/hosts/${encodeURIComponent(id)}`;

/**
 * The pages one host offers, in the list's order, each with the route it
 * opens and the key of its label; a row that has not answered offers the
 * pages that are behind no token, the Overview alone.
 *
 * @param {Object|null} server - The registry row, or the one serving agent's
 * @param {string|number} id - The registry id, or `self` on an agent role
 * @returns {Array<{ key: string, icon: Function, labelKey: string, to: string, end: boolean }>} The offered pages
 */
export const hostPagesFor = (server, id) =>
  HOST_PAGES.filter(page => page.offered(server)).map(page => ({
    key: page.key,
    icon: page.icon,
    labelKey: page.labelKey(server),
    to: hostPagePath(id, page),
    end: page.segment === '',
  }));
