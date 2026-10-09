import { clickInCursor, clickInPage } from '../../lib/listCursor';
import { hasFeature } from '../../utils/capabilities';

const row = (key, keys, run) => ({
  key,
  category: 'actions',
  labelKey: `navbar.shortcuts.row.${key}`,
  keys,
  run,
});

const ROWS = [
  row('bulkSelect', [['shift+b']], ({ root }) => clickInPage(root, 'thead .col-select input')),
  row('toggleRow', [['x']], ({ root }) => clickInCursor(root, '.col-select input')),
  row('dismiss', [['shift+d']], ({ root }) =>
    clickInPage(root, '[data-action="dismiss-selected"]')
  ),
];

/**
 * The notifications feature's `shortcuts` export: nothing unless the host
 * lists `inbox` and a person is signed in; else the rows Shift+B the
 * select-all of the page's table, `x` the selected row's checkbox and
 * Shift+D the inbox page's Delete of the picked rows.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {Object} account - The session state from `useSession`
 * @returns {Array<Object>} The rows
 */
export const shortcuts = (status, account) =>
  hasFeature(status, 'inbox') && account?.user ? ROWS : [];
