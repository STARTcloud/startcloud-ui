import { clickInCursor, clickInPage, cursorOf } from '../../lib/listCursor';
import { hasFeature } from '../../utils/capabilities';

const WATCH = '[data-action="watch"]';

const toggleWatch = ({ root }) =>
  cursorOf(root) ? clickInCursor(root, WATCH) : clickInPage(root, WATCH);

const ROWS = [
  {
    key: 'watch',
    category: 'actions',
    labelKey: 'navbar.shortcuts.row.watch',
    keys: [['b']],
    run: toggleWatch,
  },
];

/**
 * The catalog feature's `shortcuts` export: nothing unless the host
 * mounts a collection, lists `watches` and a person is signed in; else
 * the row `b`, the watch star of the selected row or of the item page.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {Object} account - The session state from `useSession`
 * @param {Array<Object>} collections - The host's mounted collection definitions
 * @returns {Array<Object>} The rows
 */
export const shortcuts = (status, account, collections) =>
  collections.length > 0 && hasFeature(status, 'watches') && account?.user ? ROWS : [];
