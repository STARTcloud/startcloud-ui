import { createContext, useCallback, useContext, useEffect } from 'react';

import { READS, hostOffers } from '../utils/monitoring';

import { useHostRow } from './useHostRow';

export const HostReadingsContext = createContext(null);

const EMPTY = { data: null, loaded: false, failed: false, stale: false };

const NO_PROVIDER = {
  epoch: 0,
  hosts: {},
  read: () => Promise.resolve(null),
};

/**
 * One of the Overview's reads of one host, `key` naming it in `READS`,
 * from the hosts feature's context, so every panel that draws the answer
 * shares one copy and one request per host: asked for by the first
 * caller that draws it and held for every other, asked for again by the
 * callers that draw it after the event stream opened fresh or answered
 * `reset`, and on `refresh`, the read a person asks for. Nothing is asked
 * of a host whose own row does not list every token the read names,
 * because an agent without the surface answers 404; `offered` says
 * whether it does, and a panel draws only then.
 *
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {string} key - The read's key in `READS`, e.g. `swap`
 * @returns {{ data: Object|null, loaded: boolean, failed: boolean, offered: boolean, refresh: Function }} The answer
 */
export const useHostReading = (id, key) => {
  const server = useHostRow(id);
  const offered = hostOffers(server, READS[key].tokens);
  const { epoch, hosts, read } = useContext(HostReadingsContext) || NO_PROVIDER;
  const { data, loaded, failed, stale } = hosts[id]?.[key] || EMPTY;

  useEffect(() => {
    if (offered && (!loaded || stale)) {
      read(epoch, id, key);
    }
  }, [offered, loaded, stale, epoch, id, key, read]);

  const refresh = useCallback(() => {
    if (offered) {
      read(epoch, id, key);
    }
  }, [offered, read, epoch, id, key]);

  return {
    data: offered ? data : null,
    loaded: offered && loaded,
    failed: offered && failed,
    offered,
    refresh,
  };
};

/**
 * The read of everything the Overview holds of one host, for the page's
 * Refresh: `refresh(id)` asks again for every answer held of that host
 * and for none that no panel drew.
 *
 * @returns {Function} `refresh(id)`
 */
export const useHostReadingsRefresh = () => {
  const { epoch, hosts, read } = useContext(HostReadingsContext) || NO_PROVIDER;
  return useCallback(
    id => {
      Object.keys(hosts[id] || {}).forEach(key => read(epoch, id, key));
    },
    [epoch, hosts, read]
  );
};
