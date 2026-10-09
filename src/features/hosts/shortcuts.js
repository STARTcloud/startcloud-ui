import { clickInCursor, clickInPage } from '../../lib/listCursor';
import { authMethod, hasFeatureStrict } from '../../utils/capabilities';

const HOST_NODES = '.sidebar-tree [data-node^="host:"]';

const under = (pathname, to) => pathname === to || pathname.startsWith(`${to}/`);

const stepHost = (root, step) => {
  const nodes = [...root.querySelectorAll(HOST_NODES)];
  const { pathname } = window.location;
  const at = nodes.findIndex(node => under(pathname, node.dataset.to));
  const next = nodes[at === -1 ? 0 : at + step];
  next?.click();
};

const row = (category, key, keys, run) => ({
  key,
  category,
  labelKey: `navbar.shortcuts.row.${key}`,
  keys,
  run,
});

const ROWS = [
  row('actions', 'create', [['c']], ({ root }) => clickInPage(root, '[data-action="new-machine"]')),
  row('actions', 'refresh', [['.']], ({ root }) => clickInPage(root, '[data-action="refresh"]')),
  row('actions', 'edit', [['e']], ({ root }) => clickInCursor(root, '[data-action="edit"]')),
  row('actions', 'delete', [['d']], ({ root }) => clickInCursor(root, '[data-action="delete"]')),
  row('navigation', 'nextHost', [['g', 'j']], ({ root }) => stepHost(root, 1)),
  row('navigation', 'previousHost', [['g', 'k']], ({ root }) => stepHost(root, -1)),
];

/**
 * The hosts feature's `shortcuts` export: nothing unless the host
 * advertises `hosts` and, on a host that needs a session, a person is
 * signed in; else the rows `c` New machine where the page draws it, `.`
 * Refresh where the page draws it, `e` and `d` the Edit and Delete of
 * the selected row where it carries them, and `g j` / `g k` the next and
 * the previous host of the sidebar's tree.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {Object} account - The session state from `useSession`
 * @returns {Array<Object>} The rows
 */
export const shortcuts = (status, account) =>
  hasFeatureStrict(status, 'hosts') && (authMethod(status) === 'none' || account?.user) ? ROWS : [];
