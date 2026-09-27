import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useNotify } from '../../../contexts/NoticeContext';
import { fastRebootHost, haltHost, poweroffHost, restartHost, shutdownHost } from '../api/host';
import {
  deleteMachine,
  resetMachine,
  restartMachine,
  startMachine,
  stopMachine,
} from '../api/machines';

const HOST_SHUTDOWNS = { shutdown: shutdownHost, poweroff: poweroffHost, halt: haltHost };

const hostRestart = (status, id, options) =>
  options.restartType === 'fast'
    ? fastRebootHost(status, id, { bootEnvironment: options.bootEnvironment })
    : restartHost(status, id, { gracePeriod: options.gracePeriod, message: options.message });

const hostShutdown = (status, id, options) =>
  (HOST_SHUTDOWNS[options.powerType] || shutdownHost)(status, id, {
    gracePeriod: options.gracePeriod,
    message: options.message,
  });

const MACHINE_CALLS = {
  start: (status, id, name) => startMachine(status, id, name),
  shutdown: (status, id, name) => stopMachine(status, id, name),
  restart: (status, id, name) => restartMachine(status, id, name),
  reset: (status, id, name) => resetMachine(status, id, name),
  kill: (status, id, name) => stopMachine(status, id, name, true),
  destroy: (status, id, name, options) =>
    deleteMachine(status, id, name, { force: true, cleanupDisks: options.cleanupDisks }),
};

const HOST_CALLS = { 'host-restart': hostRestart, 'host-shutdown': hostShutdown };

const send = ({ action, status, id, name, options }) =>
  HOST_CALLS[action]
    ? HOST_CALLS[action](status, id, options)
    : MACHINE_CALLS[action](status, id, name, options);

/**
 * The hook behind the Controls menu: `run(action, options)` sends the one
 * request of `start`, `shutdown`, `restart`, `reset`, `kill` or `destroy`
 * for the named machine, or `host-restart` and `host-shutdown` for the
 * host with the options the host dialogs collected (the restart type and
 * boot environment, the power type, the grace period and the message),
 * raises one success card naming the action or one danger card carrying
 * the agent's message, and calls `onDone` after a success so the page
 * reads its stats again once; `busy` is true while a request is in
 * flight. Nothing polls after an action.
 *
 * @param {Object} options - The target
 * @param {Object} options.status - The payload from `probeStatus`
 * @param {string} options.id - The registry id, or `self` on an agent role
 * @param {string} options.name - The machine name, empty on the host route
 * @param {Function} options.onDone - Called after a success
 * @returns {{ run: Function, busy: boolean }} The runner and its state
 */
export const useHostActions = ({ status, id, name, onDone }) => {
  const { t } = useTranslation();
  const notify = useNotify();
  const [busy, setBusy] = useState(false);

  const run = async (action, options = {}) => {
    setBusy(true);
    try {
      await send({ action, status, id, name, options });
      notify('success', t(`hosts.controls.done.${action}`, { name }));
      onDone();
    } catch (error) {
      notify('danger', error.message || t('hosts.controls.failed'));
    } finally {
      setBusy(false);
    }
  };

  return { run, busy };
};
