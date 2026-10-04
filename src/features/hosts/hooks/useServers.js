import { createContext, useCallback, useContext, useEffect } from 'react';

import { useNavbarSearch } from '../../../contexts/SearchContext';

export const ServersContext = createContext(null);

const NO_PROVIDER = {
  servers: [],
  held: [],
  loaded: false,
  failed: false,
  epoch: 0,
  read: () => undefined,
  commands: null,
};

const NO_PUBLISHED = { label: '', commands: [], disabled: true };

/**
 * The servers the host lists, from the hosts feature's one context: the
 * registry rows on the server role, read by the first caller and held for
 * every other, the one serving agent on an agent role; `servers` narrowed
 * to the chosen organization, `held` every row answered, and `refresh`
 * reading the list again.
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

const signatureOf = published =>
  JSON.stringify([
    published.label,
    published.disabled,
    published.commands.map(command => [
      command.key,
      command.labelKey,
      command.label,
      command.disabled,
    ]),
  ]);

/**
 * Publishes the hosts feature's command list to its context while the
 * caller is mounted, so the Controls menu draws it and search runs the
 * same handlers.
 *
 * @param {{ label: string, commands: Array<Object>, disabled: boolean }} published - The menu's label, the commands and whether the menu is disabled
 */
export const useControlCommandsPublish = published => {
  const store = (useContext(ServersContext) || NO_PROVIDER).commands;
  const signature = signatureOf(published);

  useEffect(() => {
    store?.replace(published);
  });

  useEffect(() => {
    store?.notify();
  }, [store, signature]);

  useEffect(
    () => () => {
      store?.replace(null);
      store?.notify();
    },
    [store]
  );
};

/**
 * The hosts feature's published command list, and the runner of one
 * command by its key through its newest handler.
 *
 * @returns {{ commands: Array<Object>, label: string, disabled: boolean, run: Function }} The commands, empty while nothing is published, the menu's label and whether it is disabled, and `run(key)`
 */
export const useControlCommands = () => {
  const store = (useContext(ServersContext) || NO_PROVIDER).commands;
  const published = useNavbarSearch(store || undefined) || NO_PUBLISHED;
  const run = useCallback(
    key =>
      store
        ?.get()
        ?.commands.find(command => command.key === key)
        ?.run(),
    [store]
  );
  return { ...published, run };
};
