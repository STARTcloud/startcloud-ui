import { cursorLink, moveCursor, moveSection } from '../../lib/listCursor';
import { hasFeature } from '../../utils/capabilities';
import { collectionPath } from '../../utils/routes';

const UNREAD_QUERY = '?read=unread';

const row = (category, key, keys, run, when = null) => ({
  key,
  category,
  labelKey: `navbar.shortcuts.row.${key}`,
  keys,
  run,
  ...(when ? { when } : {}),
});

const jumpRows = ({ status, collections, discoverTo, profile, inboxTo }) => {
  const firstCollection = collections[0] ? collectionPath(collections[0], '') : '';
  const favorites = hasFeature(status, 'favorites') && profile.to;
  const favoritesTo = favorites ? `${profile.to}/favorites` : firstCollection;
  const collectionsTo = discoverTo || firstCollection;
  const profileTo = ({ navigate }) =>
    profile.to ? navigate(profile.to) : window.location.assign(profile.href);
  return [
    row('jump', 'home', [['g', 'h']], ({ navigate }) => navigate('/')),
    row('jump', 'profile', [['g', 'p']], profileTo, () => Boolean(profile.to || profile.href)),
    row(
      'jump',
      'inbox',
      [['g', 'm']],
      ({ navigate }) => navigate(inboxTo),
      () => Boolean(inboxTo)
    ),
    row(
      'jump',
      'inboxUnread',
      [['g', 'u']],
      ({ navigate }) => navigate(`${inboxTo}${UNREAD_QUERY}`),
      () => Boolean(inboxTo)
    ),
    row(
      'jump',
      favorites ? 'favorites' : 'watched',
      [['g', 'b']],
      ({ navigate }) => navigate(favoritesTo),
      () => Boolean(favoritesTo)
    ),
    row(
      'jump',
      'collections',
      [['g', 'c']],
      ({ navigate }) => navigate(collectionsTo),
      () => Boolean(collectionsTo)
    ),
  ];
};

const applicationRows = ({ signedIn, sidebar, help, userMenu, logout }) => [
  row('application', 'help', [['?']], help),
  row('application', 'sidebar', [['=']], sidebar.toggle, () => sidebar.on),
  row('application', 'userMenu', [['p']], userMenu, () => signedIn),
  row('application', 'logout', [['shift+z', 'shift+z']], logout, () => signedIn),
];

const openLink = ({ root }) => cursorLink(root)?.click();

const openInTab = ({ root }) => {
  const link = cursorLink(root);
  if (link) {
    window.open(link.href, '_blank', 'noopener');
  }
};

const hasLink = ({ root }) => Boolean(cursorLink(root));

const navigationRows = () => [
  row('navigation', 'down', [['j']], ({ root }) => moveCursor(root, 1)),
  row('navigation', 'up', [['k']], ({ root }) => moveCursor(root, -1)),
  row('navigation', 'open', [['o'], ['enter']], openLink, hasLink),
  row('navigation', 'openTab', [['ctrl+enter']], openInTab, hasLink),
  row('navigation', 'back', [['u']], ({ navigate }) => navigate(-1)),
  row('navigation', 'nextSection', [['shift+j']], ({ root }) => moveSection(root, 1)),
  row('navigation', 'previousSection', [['shift+k']], ({ root }) => moveSection(root, -1)),
];

const searchRows = ({ search }) => [
  row('search', 'search', [['/'], ['ctrl+alt+f']], search.open, () => search.on),
  row('search', 'filters', [['ctrl+/']], search.toggleFilters, () => search.filters),
];

/**
 * The shell's own rows of the keyboard shortcuts, every row
 * `{ key, category, labelKey, keys, run, when? }`, `keys` the
 * alternatives, each one combo or a chord of two; `run` and `when`
 * receive `{ navigate, root }`.
 *
 * @param {Object} options - The shell's side
 * @param {Object} options.status - The payload from `probeStatus`
 * @param {boolean} options.signedIn - Whether a person is signed in
 * @param {Array<Object>} options.collections - The host's mounted collection definitions
 * @param {string} options.discoverTo - The Discover page's path, empty without `discover`
 * @param {{ to: string, href: string }} options.profile - The local profile page's path, or the identity provider's profile URL
 * @param {string} options.inboxTo - The inbox page's path, empty without one
 * @param {{ on: boolean, filters: boolean, open: Function, toggleFilters: Function }} options.search - The navbar search
 * @param {{ on: boolean, toggle: Function }} options.sidebar - The sidebar
 * @param {Function} options.help - Opens the Keyboard Shortcuts modal
 * @param {Function} options.userMenu - Opens the user menu
 * @param {Function} options.logout - The logout action
 * @returns {Array<Object>} The rows
 */
export const shellShortcutRows = options => [
  ...jumpRows(options),
  ...applicationRows(options),
  ...navigationRows(),
  ...searchRows(options),
];
