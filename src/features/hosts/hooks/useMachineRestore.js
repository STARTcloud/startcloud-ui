import { createContext, useContext } from 'react';

export const MachineRestoreContext = createContext(null);

const NO_PROVIDER = { follow: () => undefined };

/**
 * The start that follows a restore, from the hosts feature's context, so
 * it outlives the page that asked for it: `follow({ id, name, snapshot,
 * server, answer })` hands the provider the restore an agent queued and
 * the host's own row, and the provider powers the machine on when the
 * restore's task ends, wherever in the app the person is by then. Where
 * the task's end cannot be known, the agent having named no task or its
 * host streaming none, the provider says so in a notice that offers the
 * start as its action.
 *
 * @returns {Function} `follow({ id, name, snapshot, server, answer })`
 */
export const useRestoreStart = () => (useContext(MachineRestoreContext) || NO_PROVIDER).follow;
