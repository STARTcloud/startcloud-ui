import { FaCamera, FaCircleInfo, FaCubes, FaSliders } from 'react-icons/fa6';

import { hostHasFeature } from './utils/capabilities';
import { machineRoute } from './utils/machines';
import { canCreateMachines } from './utils/permissions';

const always = () => true;

/**
 * The pages of one machine, the list the machine's column and the tree
 * menu read: each `{ key, segment, icon, labelKey, landed, offered }`,
 * `segment` its route under `/hosts/{id}/machines/{name}`, empty for the
 * machine's own, `labelKey` the page's own word without the machine
 * noun, `landed` whether the page exists in this build, and
 * `offered({ server, role })` its gate on the host's own row and the
 * person's role, checked strictly. Overview is always offered; Settings
 * behind `machine-modify` for a person who may create machines;
 * Snapshots behind `machine-snapshots`; Provisioning always.
 */
export const MACHINE_PAGES = [
  {
    key: 'overview',
    segment: '',
    icon: FaCircleInfo,
    labelKey: 'navbar.contextTabs.overview',
    landed: true,
    offered: always,
  },
  {
    key: 'settings',
    segment: 'settings',
    icon: FaSliders,
    labelKey: 'navbar.contextTabs.settings',
    landed: true,
    offered: ({ server, role }) =>
      hostHasFeature(server, 'machine-modify') && canCreateMachines(role),
  },
  {
    key: 'snapshots',
    segment: 'snapshots',
    icon: FaCamera,
    labelKey: 'navbar.contextTabs.snapshots',
    landed: true,
    offered: ({ server }) => hostHasFeature(server, 'machine-snapshots'),
  },
  {
    key: 'provisioning',
    segment: 'provisioning',
    icon: FaCubes,
    labelKey: 'navbar.contextTabs.provisioning',
    landed: true,
    offered: always,
  },
];

/**
 * The route of one page of a machine.
 *
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {string} name - The machine name
 * @param {{ segment: string }} page - The page's entry in `MACHINE_PAGES`
 * @returns {string} The route
 */
export const machinePagePath = (id, name, page) =>
  page.segment ? `${machineRoute(id, name)}/${page.segment}` : machineRoute(id, name);

/**
 * The pages one machine offers that have landed, in the list's order,
 * each with the route it opens and the key of its label; a host row that
 * has not answered offers the pages that are behind no token, the
 * Overview alone.
 *
 * @param {Object} options - The host's row, the route and the role
 * @param {Object|null} options.server - The registry row, or the one serving agent's
 * @param {string} options.id - The registry id, or `self` on an agent role
 * @param {string} options.name - The machine name
 * @param {string} [options.role] - The person's role
 * @returns {Array<{ key: string, icon: Function, labelKey: string, to: string, end: boolean }>} The offered pages
 */
export const machinePagesFor = ({ server, id, name, role }) =>
  MACHINE_PAGES.filter(page => page.landed && page.offered({ server, role })).map(page => ({
    key: page.key,
    icon: page.icon,
    labelKey: page.labelKey,
    to: machinePagePath(id, name, page),
    end: page.segment === '',
  }));
