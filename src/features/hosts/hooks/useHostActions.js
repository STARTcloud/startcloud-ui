import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useNotify } from '../../../contexts/NoticeContext';
import { fastRebootHost, haltHost, poweroffHost, restartHost, shutdownHost } from '../api/host';
import {
  attachMachine,
  deleteMachine,
  detachMachine,
  injectNmi,
  launchApplication,
  markIncompleteMachine,
  moveMachine,
  pauseMachine,
  readyMachine,
  resetMachine,
  restartMachine,
  resumeMachine,
  shutdownGuest,
  startMachine,
  stopMachine,
  suspendMachine,
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
  nmi: (status, id, name) => injectNmi(status, id, name),
  pause: (status, id, name) => pauseMachine(status, id, name),
  suspend: (status, id, name) => suspendMachine(status, id, name),
  resume: (status, id, name) => resumeMachine(status, id, name),
  'guest-powerdown': (status, id, name) => shutdownGuest(status, id, name, 'powerdown'),
  'guest-reboot': (status, id, name) => shutdownGuest(status, id, name, 'reboot'),
  launch: (status, id, name, options) => launchApplication(status, id, name, options.application),
  'zone-ready': (status, id, name) => readyMachine(status, id, name),
  'zone-mark-incomplete': (status, id, name) => markIncompleteMachine(status, id, name),
  'zone-detach': (status, id, name) => detachMachine(status, id, name),
  'zone-attach': (status, id, name, options) =>
    attachMachine(status, id, name, { update: options.update, force: options.force }),
  'zone-move': (status, id, name, options) => moveMachine(status, id, name, options.targetPath),
  kill: (status, id, name) => stopMachine(status, id, name, true),
  destroy: (status, id, name, options) =>
    deleteMachine(status, id, name, { force: true, cleanupDisks: options.cleanupDisks }),
};

const HOST_CALLS = { 'host-restart': hostRestart, 'host-shutdown': hostShutdown };

const request = ({ action, status, id, name, options }) =>
  HOST_CALLS[action]
    ? HOST_CALLS[action](status, id, options)
    : MACHINE_CALLS[action](status, id, name, options);

/**
 * The runner every action of the hosts feature goes through, for a
 * caller whose target is known only when the action is asked for, the
 * sidebar tree's menu: `run({ id, name, action, options, onDone })` sends
 * the one request, raises one success card naming the action or one
 * danger card carrying the agent's message, and calls `onDone` after a
 * success; `busy` is true while a request is in flight.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @returns {{ run: Function, busy: boolean }} The runner and its state
 */
export const useActionRunner = status => {
  const { t } = useTranslation();
  const notify = useNotify();
  const [busy, setBusy] = useState(false);

  const run = useCallback(
    async ({ id, name, action, options = {}, onDone }) => {
      setBusy(true);
      try {
        await request({ action, status, id, name, options });
        notify(
          'success',
          t(`hosts.controls.done.${action}`, { name, application: options.application || '' })
        );
        onDone();
      } catch (error) {
        notify('danger', error.message || t('hosts.controls.failed'));
      } finally {
        setBusy(false);
      }
    },
    [status, notify, t]
  );

  return { run, busy };
};

/**
 * The hook behind the Controls menu: `run(action, options)` sends the one
 * request of the action for the named machine, the power actions `start`,
 * `shutdown`, `restart`, `reset`, `nmi`, `pause`, `suspend` and `resume`,
 * the guest agent's `guest-powerdown` and `guest-reboot`, `launch` with
 * the `application` to open the machine in, the zone lifecycle's
 * `zone-ready`, `zone-mark-incomplete`, `zone-detach`, `zone-attach` with
 * `update` and `force` and `zone-move` with the `targetPath`, and `kill`
 * and `destroy`, or `host-restart` and `host-shutdown` for the host with
 * the options the host dialogs collected (the restart type and boot
 * environment, the power type, the grace period and the message), raises
 * one success card naming the action or one danger card carrying the
 * agent's message, and calls `onDone` after a success so the caller reads
 * what it draws again once; `busy` is true while a request is in flight.
 * Nothing polls after an action.
 *
 * @param {Object} options - The target
 * @param {Object} options.status - The payload from `probeStatus`
 * @param {string} options.id - The registry id, or `self` on an agent role
 * @param {string} options.name - The machine name, empty on the host route
 * @param {Function} options.onDone - Called after a success
 * @returns {{ run: Function, busy: boolean }} The runner and its state
 */
export const useHostActions = ({ status, id, name, onDone }) => {
  const { run: send, busy } = useActionRunner(status);
  const run = (action, options = {}) => send({ id, name, action, options, onDone });
  return { run, busy };
};
