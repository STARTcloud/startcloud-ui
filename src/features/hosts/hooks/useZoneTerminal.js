import { createContext, useContext } from 'react';

export const ZoneTerminalContext = createContext(null);

const NO_PROVIDER = {
  getZoneAddons: () => null,
  getZoneOptions: () => ({}),
  fitZoneTerminal: () => undefined,
  forceZoneSessionCleanup: () => Promise.resolve(),
  startZloginSessionExplicitly: () => Promise.resolve(null),
  initializeSessionFromExisting: () => Promise.resolve(),
  pasteTextToZone: () => false,
  preserveZoneHistory: () => undefined,
  restoreZoneHistory: () => undefined,
};

/**
 * The zlogin terminals of every zone a person opened, from the hosts
 * feature's `ZoneTerminalProvider`, hyperweaver-ui's zone terminal
 * context: the xterm addons and options of one zone's terminal, shared
 * by the preview and the dialog that host it in turn, the session's
 * start, its adoption from a session the agent already holds, its
 * cleanup, a paste down its socket, and the history kept across a
 * socket's close. A caller outside the provider holds nothing.
 *
 * @returns {Object} The context's members
 */
export const useZoneTerminal = () => useContext(ZoneTerminalContext) || NO_PROVIDER;
