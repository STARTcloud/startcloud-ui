import { useSyncExternalStore } from 'react';

import {
  consoleOf,
  footerConsoles,
  nextActive,
  pageConsolesOf,
  readStoredHistory,
  readStoredTabs,
  receivers,
  withConsole,
  withSent,
  withStoredTab,
  withoutConsole,
  writeStoredHistory,
  writeStoredTabs,
} from '../utils/terminals';

const store = {
  consoles: [],
  active: '',
  states: {},
  turns: {},
  history: readStoredHistory(),
  opens: 0,
  opensIn: 'footer',
  prefsOpen: false,
  listeners: new Set(),
};

const senders = new Map();

const subscribe = listener => {
  store.listeners.add(listener);
  return () => store.listeners.delete(listener);
};

const announce = () => store.listeners.forEach(listener => listener());

const readConsoles = () => store.consoles;

const readActive = () => store.active;

const readStates = () => store.states;

const readTurns = () => store.turns;

const readHistory = () => store.history;

const readOpens = () => store.opens;

const readOpensIn = () => store.opensIn;

const readPrefsOpen = () => store.prefsOpen;

const NO_CONSOLES = [];

const pageCache = new Map();

const without = (map, key) =>
  Object.fromEntries(Object.entries(map).filter(([entry]) => entry !== key));

const storeTab = (entry, placed) => writeStoredTabs(withStoredTab(readStoredTabs(), entry, placed));

/**
 * Open the terminal preferences dialog, the Terminal preferences row of
 * the pane's menu and of the toggle's drop-up.
 */
export const openTerminalPrefs = () => {
  store.prefsOpen = true;
  announce();
};

export const closeTerminalPrefs = () => {
  store.prefsOpen = false;
  announce();
};

/**
 * Whether the terminal preferences dialog is open, one store behind
 * every call so the rows that open it and the pane that draws it agree.
 *
 * @returns {boolean} True while the dialog is open
 */
export const useTerminalPrefsOpen = () => useSyncExternalStore(subscribe, readPrefsOpen);

/**
 * Add one console to the store, or replace the one of its key: a console
 * placed in the footer becomes the active tab and asks the pane to show
 * the Consoles view; its placement is written to `console_tabs`.
 *
 * @param {Object} entry - `{ key, kind, id, name, target, label, noun, session, placed, accepts }`
 */
export const addConsole = entry => {
  const next = { accepts: false, target: '', ...entry };
  store.consoles = withConsole(store.consoles, next);
  storeTab(next, next.placed);
  if (next.placed === 'footer') {
    store.active = next.key;
    store.opens += 1;
  }
  announce();
};

/**
 * Move one console between the footer and the page: to the footer it
 * becomes the active tab and the pane is asked to show the Consoles
 * view; to the page the next tab takes its place.
 *
 * @param {string} key - The console's key
 * @param {string} placed - `footer` or `page`
 */
export const placeConsole = (key, placed) => {
  const entry = consoleOf(store.consoles, key);
  if (!entry || entry.placed === placed) {
    return;
  }
  const before = footerConsoles(store.consoles);
  const next = { ...entry, placed };
  store.consoles = withConsole(store.consoles, next);
  storeTab(next, placed);
  if (placed === 'footer') {
    store.active = key;
    store.opens += 1;
  } else {
    store.active = nextActive(before, footerConsoles(store.consoles), store.active, key);
  }
  announce();
};

/**
 * Drop one console from the store, its placement with it; the caller
 * stops its session and lets its terminal or viewer go.
 *
 * @param {string} key - The console's key
 */
export const dropConsole = key => {
  const entry = consoleOf(store.consoles, key);
  if (!entry) {
    return;
  }
  const before = footerConsoles(store.consoles);
  store.consoles = withoutConsole(store.consoles, key);
  storeTab(entry, '');
  senders.delete(key);
  store.states = without(store.states, key);
  store.turns = without(store.turns, key);
  store.active = nextActive(before, footerConsoles(store.consoles), store.active, key);
  announce();
};

/**
 * Make one footer console the active tab.
 *
 * @param {string} key - The console's key
 */
export const activateConsole = key => {
  if (store.active !== key && consoleOf(store.consoles, key)) {
    store.active = key;
    announce();
  }
};

/**
 * Mark one console as accepting broadcasts, or stop it accepting them,
 * the mark written to `console_tabs` with its placement.
 *
 * @param {string} key - The console's key
 * @param {boolean} accepts - Whether a broadcast reaches it
 */
export const markConsole = (key, accepts) => {
  const entry = consoleOf(store.consoles, key);
  if (!entry || entry.accepts === accepts) {
    return;
  }
  const next = { ...entry, accepts };
  store.consoles = withConsole(store.consoles, next);
  storeTab(next, next.placed);
  announce();
};

/**
 * Give one console a new session, the one a restart answered, its
 * placement re-keyed to the new session's id.
 *
 * @param {string} key - The console's key
 * @param {Object} session - The session the agent answered
 */
export const setConsoleSession = (key, session) => {
  const entry = consoleOf(store.consoles, key);
  if (!entry) {
    return;
  }
  storeTab(entry, '');
  const next = { ...entry, session };
  store.consoles = withConsole(store.consoles, next);
  storeTab(next, next.placed);
  announce();
};

/**
 * Record the connection state of one console, `connecting`, `open` or
 * `closed`, the word its surface draws as a notice.
 *
 * @param {string} key - The console's key
 * @param {string} state - The state
 */
export const setConsoleState = (key, state) => {
  if (store.states[key] === state) {
    return;
  }
  store.states = { ...store.states, [key]: state };
  announce();
};

/**
 * Ask a console's viewer to draw again, a VNC or RDP tab's reconnect,
 * its `turn` raised by one.
 *
 * @param {string} key - The console's key
 */
export const turnConsole = key => {
  store.turns = { ...store.turns, [key]: (store.turns[key] || 0) + 1 };
  announce();
};

/**
 * Register what a broadcast calls for one console, the function that
 * types a string into it, or drop it with null.
 *
 * @param {string} key - The console's key
 * @param {Function|null} sender - Takes the text, answers whether it was sent
 */
export const registerSender = (key, sender) => {
  if (sender) {
    senders.set(key, sender);
  } else {
    senders.delete(key);
  }
};

/**
 * Send one string to every footer console that accepts broadcasts, the
 * string recorded first in the history with the moment, how many tabs
 * took it and their labels, the history written to `console_history`.
 *
 * @param {string} text - The text as the person typed it
 * @param {string} sent - The text sent, Enter added where the preferences say so
 * @returns {number} How many consoles took it
 */
export const broadcast = (text, sent) => {
  const took = receivers(store.consoles).filter(entry => senders.get(entry.key)?.(sent) === true);
  store.history = withSent(store.history, {
    text,
    at: new Date().toISOString(),
    took: took.length,
    targets: took.map(entry => entry.label),
  });
  writeStoredHistory(store.history);
  announce();
  return took.length;
};

/**
 * Forget every broadcast sent, the Clear history button of the history
 * dialog, `console_history` removed with it.
 */
export const clearConsoleHistory = () => {
  store.history = [];
  writeStoredHistory(store.history);
  announce();
};

/**
 * Where the Controls menu's console rows open their console, `footer`
 * or `page`, flipped by the row's own glyph.
 *
 * @param {string} placed - `footer` or `page`
 */
export const setOpensIn = placed => {
  store.opensIn = placed;
  announce();
};

/**
 * Forget every console at once, a sign-out, the placements with them and
 * the broadcast history kept; the caller closes what each held.
 */
export const dropEveryConsole = () => {
  store.consoles = [];
  store.active = '';
  store.states = {};
  store.turns = {};
  senders.clear();
  writeStoredTabs({});
  announce();
};

/**
 * Every console the store holds, footer and page alike.
 *
 * @returns {Array<Object>} The consoles
 */
export const useConsoles = () => useSyncExternalStore(subscribe, readConsoles);

/**
 * The key of the active footer tab.
 *
 * @returns {string} The key, empty while no tab is open
 */
export const useActiveConsole = () => useSyncExternalStore(subscribe, readActive);

/**
 * The connection states of every console by key.
 *
 * @returns {Object} The states
 */
export const useConsoleStates = () => useSyncExternalStore(subscribe, readStates);

/**
 * The redraw turns of every console by key.
 *
 * @returns {Object} The turns
 */
export const useConsoleTurns = () => useSyncExternalStore(subscribe, readTurns);

/**
 * The broadcasts sent before, newest first, each `{ text, at, took,
 * targets }`.
 *
 * @returns {Array<Object>} The history
 */
export const useConsoleHistory = () => useSyncExternalStore(subscribe, readHistory);

/**
 * How many times a console asked the pane to show the Consoles view, the
 * count the pane follows.
 *
 * @returns {number} The count
 */
export const useConsoleOpens = () => useSyncExternalStore(subscribe, readOpens);

/**
 * Where the Controls menu's console rows open, `footer` or `page`.
 *
 * @returns {string} The place
 */
export const useOpensIn = () => useSyncExternalStore(subscribe, readOpensIn);

const readPageConsoles = (id, name) => () => {
  const found = pageConsolesOf(store.consoles, id, name);
  const cacheKey = `${id}|${name}`;
  const cached = pageCache.get(cacheKey);
  if (
    cached &&
    cached.length === found.length &&
    cached.every((entry, index) => entry === found[index])
  ) {
    return cached;
  }
  const next = found.length === 0 ? NO_CONSOLES : found;
  pageCache.set(cacheKey, next);
  return next;
};

/**
 * The consoles placed on the page of one machine.
 *
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {string} name - The machine name
 * @returns {Array<Object>} The page consoles
 */
export const usePageConsoles = (id, name) =>
  useSyncExternalStore(subscribe, readPageConsoles(id, name));

/**
 * The consoles the store holds, read outside a component.
 *
 * @returns {Array<Object>} The consoles
 */
export const consolesHeld = () => store.consoles;

/**
 * The active footer tab's key, read outside a component.
 *
 * @returns {string} The key
 */
export const activeConsoleKey = () => store.active;

/**
 * Where the Controls menu's console rows open, read at the moment a row
 * is pressed, so a published command never carries a stale place.
 *
 * @returns {string} `footer` or `page`
 */
export const opensInHeld = () => store.opensIn;
