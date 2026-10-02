import { FaDesktop, FaTerminal, FaWindows } from 'react-icons/fa6';

import { hostHasConsole, hostHasFeature } from './capabilities';
import { machineRoute } from './machines';

/**
 * The consoles of a machine, hyperweaver-ui's four, the one list every
 * door to them reads, the rows of the Controls menu, of a row's More menu
 * in the machines list, of the tree's right-click menu and of the
 * hardware card: each entry its key, the word the machine route's
 * `console` query carries, the token its backend lists and whether that
 * token is a console token, `capabilities.console`, or a feature token,
 * `capabilities.features`, its glyph and the key of its label.
 */
export const CONSOLE_DOORS = [
  {
    key: 'vnc',
    token: 'vnc',
    feature: false,
    icon: FaDesktop,
    labelKey: 'chrome.sidebarMenu.vncConsole',
  },
  {
    key: 'zlogin',
    token: 'zlogin',
    feature: false,
    icon: FaTerminal,
    labelKey: 'chrome.sidebarMenu.zloginConsole',
  },
  {
    key: 'ssh',
    token: 'ssh',
    feature: true,
    icon: FaTerminal,
    labelKey: 'console.sshConsoleDisplay.sshLabel',
  },
  {
    key: 'rdp',
    token: 'rdp',
    feature: false,
    icon: FaWindows,
    labelKey: 'console.rdpConsoleDisplay.rdpLabel',
  },
];

export const CONSOLE_KINDS = CONSOLE_DOORS.map(door => door.key);

/**
 * Whether a host's row offers one console, its token read strictly from
 * the list its kind names.
 *
 * @param {Object|null} server - The registry row, or the one serving agent's
 * @param {{ token: string, feature: boolean }} door - The entry of `CONSOLE_DOORS`
 * @returns {boolean} True while the row lists the token
 */
export const hostOffersConsole = (server, door) =>
  door.feature ? hostHasFeature(server, door.token) : hostHasConsole(server, door.token);

/**
 * The consoles one host offers, in the list's order, each with its key,
 * glyph and label key; none for a row that lists no console.
 *
 * @param {Object|null} server - The registry row, or the one serving agent's
 * @returns {Array<{ key: string, icon: Function, labelKey: string }>} The offered consoles
 */
export const consoleDoorsOf = server =>
  CONSOLE_DOORS.filter(door => hostOffersConsole(server, door));

/**
 * Whether a host's row offers any console at all, the gate of the
 * console panel on the machine page.
 *
 * @param {Object|null} server - The registry row, or the one serving agent's
 * @returns {boolean} True while the row lists one console token
 */
export const hostHasConsoles = server => consoleDoorsOf(server).length > 0;

/**
 * The route that opens one console of a machine, the machine's page with
 * the console named in its `console` query, the query the console panel
 * reads once and drops.
 *
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {string} name - The machine name
 * @param {string} kind - The console's key, `vnc`, `zlogin`, `ssh` or `rdp`
 * @returns {string} The route
 */
export const consoleRoute = (id, name, kind) => `${machineRoute(id, name)}?console=${kind}`;

/**
 * The route of the full-window console page of a machine, the VNC
 * viewer at `console/vnc` and the RDP client at `console/rdp`, the
 * guest's own desktop named by `?target=guest`.
 *
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {string} name - The machine name
 * @param {string} kind - `vnc` or `rdp`
 * @param {string} [target] - `guest` for the guest's own RDP server
 * @returns {string} The route
 */
export const standaloneConsoleRoute = (id, name, kind, target = '') =>
  `${machineRoute(id, name)}/console/${kind}${target === 'guest' ? '?target=guest' : ''}`;

/**
 * The console a machine route's query asks to open, one of the four
 * keys, or the empty string for a query that names none or an unknown
 * word.
 *
 * @param {URLSearchParams} params - The route's search params
 * @returns {string} The console's key, or the empty string
 */
export const consoleParamOf = params => {
  const kind = params.get('console') || '';
  return CONSOLE_KINDS.includes(kind) ? kind : '';
};

/**
 * Whether the person's role, the hyperweaver-server member's own, may
 * switch a console between read-only and interactive, hyperweaver-ui's
 * rule: an admin, a super-admin or an organization admin.
 *
 * @param {Object|null} user - The session's user
 * @returns {boolean} True for an admin of any of the three kinds
 */
export const consoleAdmin = user =>
  ['admin', 'super-admin', 'organization-admin'].includes(user?.role);

/**
 * Whether a machine's guest can be reached by SSH, hyperweaver-ui's
 * gate: the machine runs and the agent's discovered networking names a
 * guest address.
 *
 * @param {Object} options - Whether the machine runs and its guest addresses
 * @param {boolean} options.running - Whether the machine runs
 * @param {Array<string>} options.ips - The guest's addresses
 * @returns {boolean} True when SSH can be started
 */
export const sshReady = ({ running, ips }) => running && ips.length > 0;

/**
 * The guest's addresses the detail carries, `configuration.guest_info.ips`,
 * none while it carries no list.
 *
 * @param {Object|null} detail - The answer of `GET machines/{name}`
 * @returns {Array<string>} The addresses
 */
export const guestIpsOf = detail => {
  const ips = detail?.configuration?.guest_info?.ips;
  return Array.isArray(ips) ? ips.map(String) : [];
};

/**
 * The addresses of an SSH session, hyperweaver-ui's next-address rule:
 * the candidates the agent answered, the index of the one in use and
 * the index of the one after it, wrapping, or null while the session
 * has one address alone.
 *
 * @param {Object|null} session - The answer of `POST machines/{name}/ssh/start`
 * @returns {{ ipCandidates: Array<string>, ipIndex: number, nextIndex: number|null }} The addresses
 */
export const sshAddressesOf = session => {
  const ipCandidates = Array.isArray(session?.ip_candidates) ? session.ip_candidates : [];
  const ipIndex = Number.isInteger(session?.ip_index) ? session.ip_index : 0;
  const nextIndex = ipCandidates.length > 1 ? (ipIndex + 1) % ipCandidates.length : null;
  return { ipCandidates, ipIndex, nextIndex };
};

/**
 * The file a screenshot or a captured output is saved as: the console's
 * word, the machine and the moment, with the extension.
 *
 * @param {string} kind - `vnc-screenshot` or `zlogin-output`
 * @param {string} name - The machine name
 * @param {string} extension - `png` or `txt`
 * @param {number} [at] - The moment as epoch milliseconds
 * @returns {string} The file name
 */
export const captureFileName = (kind, name, extension, at = Date.now()) =>
  `${kind}-${name}-${at}.${extension}`;

/**
 * Hand the browser a blob to save under a name, the way hyperweaver-ui's
 * console screenshot and captured output are downloaded.
 *
 * @param {Blob} blob - The file's bytes
 * @param {string} fileName - The name to save it as
 */
export const saveBlob = (blob, fileName) => {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
};
