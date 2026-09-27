import { createContext, useCallback, useContext, useEffect } from 'react';

export const ServersContext = createContext(null);

const NO_PROVIDER = {
  servers: [],
  held: [],
  loaded: false,
  failed: false,
  epoch: 0,
  read: () => undefined,
};

/**
 * The servers the host lists, from the hosts feature's one context, so
 * the sidebar's tree, the footer's focus, the Controls menu and the
 * pages share one list and one request: on the server role the registry
 * rows of `GET /api/servers`, asked for by the first caller that draws
 * and held for every other, read again by the provider when the event
 * stream opens fresh or answers `reset` and when a person signs in; on
 * an agent role the one serving agent as `selfServer`, with no request.
 * On a host that narrows by organization the servers are the rows that
 * show under the organization a person operates under, every row while
 * the choice is All, the provider narrowing the held rows and asking for
 * nothing when the choice changes. `held` is every row the server
 * answered, the choice aside, the list a host named by its id is found
 * in, so a host reached by its address draws whole under any choice.
 * `refresh` reads the list again for every caller, the read a person
 * asks for; a caller outside the provider holds an empty list.
 *
 * @returns {{ servers: Array<Object>, held: Array<Object>, loaded: boolean, failed: boolean, refresh: Function }} The servers
 */
export const useServers = () => {
  const { servers, held, loaded, failed, epoch, read } = useContext(ServersContext) || NO_PROVIDER;

  useEffect(() => {
    if (!loaded) {
      read(epoch);
    }
  }, [loaded, epoch, read]);

  const refresh = useCallback(() => read(epoch), [read, epoch]);

  return { servers, held, loaded, failed, refresh };
};
