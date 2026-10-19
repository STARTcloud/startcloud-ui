const STORAGE_KEY = 'console_tabs';

const HISTORY_KEY = 'console_history';

const HISTORY_LIMIT = 200;

export const CONSOLE_KINDS = ['host_shell', 'ssh', 'zlogin', 'vnc', 'rdp'];

export const TERMINAL_KINDS = ['host_shell', 'ssh', 'zlogin'];

export const HELD_KINDS = ['host_shell', 'ssh'];

export const PLACES = ['footer', 'page'];

/**
 * The key one console is held under: its kind, its host, its machine and
 * its RDP target, the last two empty where the kind has none, and for a
 * held kind, the host shell and SSH, its session's id as well, so every
 * session a person starts is a tab of its own while a display is one tab
 * a machine or an RDP target.
 *
 * @param {{ kind: string, id: string, name?: string, target?: string, session?: Object|null }} entry - The console
 * @returns {string} The key
 */
export const consoleKeyOf = ({ kind, id, name = '', target = '', session = null }) =>
  HELD_KINDS.includes(kind)
    ? `${kind}|${id}|${name}|${target}|${session?.id || ''}`
    : `${kind}|${id}|${name}|${target}`;

/**
 * Whether a list already holds a console of one listed session, the
 * same kind and host and the same session id, whatever key the tab was
 * given when it opened.
 *
 * @param {Array<Object>} consoles - The consoles
 * @param {Object} entry - The console of `sessionToConsole`
 * @returns {boolean} True while a console of that session is held
 */
export const holdsSession = (consoles, entry) =>
  Boolean(entry.session?.id) &&
  consoles.some(
    held =>
      held.kind === entry.kind &&
      held.id === entry.id &&
      String(held.session?.id || '') === String(entry.session.id)
  );

/**
 * Whether a console is a terminal, one whose broadcast is text written
 * down a socket, host shell, SSH and zlogin.
 *
 * @param {string} kind - The console's kind
 * @returns {boolean} True for a terminal kind
 */
export const isTerminalKind = kind => TERMINAL_KINDS.includes(kind);

/**
 * Whether a console's terminal is held by the console store, the host
 * shell and SSH, whose xterm and socket outlive every surface that draws
 * them, the shell behind the socket running on across sockets on both
 * agents.
 *
 * @param {string} kind - The console's kind
 * @returns {boolean} True for a held kind
 */
export const isHeldKind = kind => HELD_KINDS.includes(kind);

/**
 * Whether a listed session is the person's own, its `created_by` the
 * name of the key or the account the person is signed in as; false for
 * a session that names another or none, which is never re-attached
 * unless the person placed it themselves.
 *
 * @param {Object} session - The session as the agent answers it
 * @param {string} person - The signed-in person's name
 * @returns {boolean} True while the session names the person
 */
export const sessionOwnedBy = (session, person) =>
  Boolean(person) && String(session?.created_by || '') === person;

/**
 * The key a console's placement is stored under in the browser: the
 * session's id for the host shell, SSH and zlogin, and the host and the
 * machine for VNC and RDP, which have no session of their own, the VNC
 * display being one shared session per machine and the RDP bridge one
 * socket per viewer.
 *
 * @param {Object} entry - The console
 * @returns {string} The storage key, empty while a session kind holds no session yet
 */
export const storageKeyOf = entry => {
  if (entry.kind === 'vnc') {
    return `vnc:${entry.id}:${entry.name}`;
  }
  if (entry.kind === 'rdp') {
    return `rdp:${entry.id}:${entry.name}:${entry.target || 'console'}`;
  }
  return entry.session?.id ? String(entry.session.id) : '';
};

/**
 * The console of a list by its key, or null.
 *
 * @param {Array<Object>} consoles - The consoles
 * @param {string} key - The key of `consoleKeyOf`
 * @returns {Object|null} The console
 */
export const consoleOf = (consoles, key) => consoles.find(entry => entry.key === key) || null;

/**
 * The list with one console replaced by key, or appended when the list
 * holds none of that key.
 *
 * @param {Array<Object>} consoles - The consoles
 * @param {Object} entry - The console, carrying its `key`
 * @returns {Array<Object>} The list
 */
export const withConsole = (consoles, entry) =>
  consoles.some(held => held.key === entry.key)
    ? consoles.map(held => (held.key === entry.key ? entry : held))
    : [...consoles, entry];

/**
 * The list without the console of one key.
 *
 * @param {Array<Object>} consoles - The consoles
 * @param {string} key - The key to drop
 * @returns {Array<Object>} The list
 */
export const withoutConsole = (consoles, key) => consoles.filter(entry => entry.key !== key);

/**
 * The consoles placed in the footer, the tabs of the Consoles view, in
 * the order they were opened.
 *
 * @param {Array<Object>} consoles - The consoles
 * @returns {Array<Object>} The footer consoles
 */
export const footerConsoles = consoles => consoles.filter(entry => entry.placed === 'footer');

/**
 * The consoles placed on the page of one machine.
 *
 * @param {Array<Object>} consoles - The consoles
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {string} name - The machine name
 * @returns {Array<Object>} The page consoles of that machine
 */
export const pageConsolesOf = (consoles, id, name) =>
  consoles.filter(entry => entry.placed === 'page' && entry.id === id && entry.name === name);

/**
 * The tab that becomes active when one leaves the footer: the active one
 * while it stays, else the neighbour after the one that left, else the
 * last tab left, else none.
 *
 * @param {Array<Object>} before - The footer consoles before the change
 * @param {Array<Object>} after - The footer consoles after it
 * @param {string} active - The active key before the change
 * @param {string} left - The key that left
 * @returns {string} The active key after
 */
export const nextActive = (before, after, active, left) => {
  if (after.some(entry => entry.key === active)) {
    return active;
  }
  if (after.length === 0) {
    return '';
  }
  const index = before.findIndex(entry => entry.key === left);
  const neighbour = after[Math.min(Math.max(index, 0), after.length - 1)];
  return neighbour.key;
};

/**
 * The footer consoles that accept broadcasts, the ones a sent string
 * reaches.
 *
 * @param {Array<Object>} consoles - The consoles
 * @returns {Array<Object>} The receivers
 */
export const receivers = consoles => footerConsoles(consoles).filter(entry => entry.accepts);

/**
 * The text a broadcast sends: the string as typed, with Enter after it
 * while the Terminal preferences say so, the carriage return a terminal
 * sends for the Enter key, which a Unix PTY turns into a newline and a
 * Windows console takes as the line's end, where a bare newline is
 * ignored.
 *
 * @param {string} text - The typed string
 * @param {boolean} newline - Whether Enter follows
 * @returns {string} The text sent
 */
export const broadcastText = (text, newline) => (newline ? `${text}\r` : text);

/**
 * The history after one broadcast: the entry first, the same string's
 * earlier entry dropped, two hundred kept at most.
 *
 * @param {Array<Object>} history - The entries sent before, newest first
 * @param {{ text: string, at: string, took: number, targets: Array<string> }} entry - The string sent, when, how many tabs took it and their labels
 * @returns {Array<Object>} The history
 */
export const withSent = (history, entry) =>
  [entry, ...history.filter(held => held.text !== entry.text)].slice(0, HISTORY_LIMIT);

/**
 * The broadcast history the browser holds, `console_history`, newest
 * first, each entry `{ text, at, took, targets }`; empty while nothing is
 * stored or the stored value is no list.
 *
 * @returns {Array<Object>} The entries
 */
export const readStoredHistory = () => {
  try {
    const stored = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
    return Array.isArray(stored)
      ? stored.filter(entry => entry && typeof entry.text === 'string')
      : [];
  } catch {
    return [];
  }
};

/**
 * Store the broadcast history, the key removed when it empties.
 *
 * @param {Array<Object>} history - The entries of `withSent`
 */
export const writeStoredHistory = history => {
  if (history.length === 0) {
    localStorage.removeItem(HISTORY_KEY);
    return;
  }
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
};

/**
 * A console from one session the agent lists, `GET term/sessions`,
 * `GET ssh/sessions` or `GET zlogin/sessions`: the host shell has no
 * machine, the two others the `machine_name` the session carries.
 *
 * @param {string} kind - `host_shell`, `ssh` or `zlogin`
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {Object} session - The session as the agent answers it
 * @returns {Object} The console, without its placement and label
 */
export const sessionToConsole = (kind, id, session) => {
  const name = kind === 'host_shell' ? '' : String(session.machine_name || '');
  return { key: consoleKeyOf({ kind, id, name, session }), kind, id, name, target: '', session };
};

/**
 * Whether a listed session is one to re-attach to: the agent says it is
 * active, or connecting while the shell waits for its socket.
 *
 * @param {Object} session - The session as the agent answers it
 * @returns {boolean} True while it can be joined
 */
export const sessionLives = session => ['active', 'connecting'].includes(session?.status);

const readStore = () => {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    return stored && typeof stored === 'object' && !Array.isArray(stored) ? stored : {};
  } catch {
    return {};
  }
};

/**
 * The placements the browser holds, `console_tabs`, one entry a console
 * keyed by `storageKeyOf`: `{ kind, id, name, target, placed, accepts }`.
 *
 * @returns {Object} The map
 */
export const readStoredTabs = () => readStore();

/**
 * Store the placements.
 *
 * @param {Object} map - The map of `readStoredTabs`
 */
export const writeStoredTabs = map => {
  if (Object.keys(map).length === 0) {
    localStorage.removeItem(STORAGE_KEY);
    return;
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
};

/**
 * The stored map with one console's placement written or, with no
 * place, dropped.
 *
 * @param {Object} map - The map of `readStoredTabs`
 * @param {Object} entry - The console
 * @param {string} placed - `footer`, `page` or the empty string to drop it
 * @returns {Object} The map
 */
export const withStoredTab = (map, entry, placed) => {
  const key = storageKeyOf(entry);
  if (!key) {
    return map;
  }
  const next = { ...map };
  if (!placed) {
    delete next[key];
    return next;
  }
  next[key] = {
    kind: entry.kind,
    id: String(entry.id),
    name: entry.name || '',
    target: entry.target || '',
    placed,
    accepts: Boolean(entry.accepts),
  };
  return next;
};

/**
 * The stored entries of one host, the ones to re-attach when the host's
 * sessions are read.
 *
 * @param {Object} map - The map of `readStoredTabs`
 * @param {string} id - The registry id, or `self` on an agent role
 * @returns {Array<[string, Object]>} The key and the entry of each
 */
export const storedTabsOf = (map, id) =>
  Object.entries(map).filter(([, entry]) => String(entry.id) === String(id));

/**
 * The entry of a listed session in the stored map, or null while the
 * person never placed it.
 *
 * @param {Object} map - The map of `readStoredTabs`
 * @param {Object} entry - The console of `sessionToConsole`
 * @returns {Object|null} The stored entry
 */
export const storedTabFor = (map, entry) => map[storageKeyOf(entry)] || null;
