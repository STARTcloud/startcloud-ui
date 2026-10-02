import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useNotify } from '../../../contexts/NoticeContext';
import { useEventStream } from '../../../hooks/useEventStream';
import {
  applyPendingChanges,
  clearPendingChanges,
  modifyMachine,
  startMachine,
  stopMachine,
} from '../api/machines';
import { hostHasFeature } from '../utils/capabilities';
import { agentIdOf, isRunning, withoutAgentId } from '../utils/hosts';
import {
  immediateOnlyChanges,
  messageBase,
  pendingCount,
  warningsSuffix,
} from '../utils/machineSettings';
import { hostStreamsTopic, queuedTaskOf, resourceIssuesOf } from '../utils/machineTools';
import { TERMINAL_TASK_STATUSES } from '../utils/tasks';

const NO_ISSUES = [];

const IDLE = { phase: 'form', step: '', staged: null, intent: null };

/**
 * The apply of the Settings page, hyperweaver-ui's flow on events: a body
 * of the members an agent keeps at once applies while the machine runs;
 * any other on a running machine asks, stop, apply and start, or apply at
 * the next power cycle. Stop, apply and start moves on what the host
 * says, never on a clock: the stop is sent, the apply follows the `hosts`
 * topic's frame that no longer names the machine running, and the start
 * follows the `tasks` topic's word that the modify task completed; a host
 * that streams neither is told what to do next. Every answer is one
 * notice, a queued task carrying View task, an accrued set the count of
 * what waits for the next power cycle, and a refusal for want of
 * resources the agent's own issues; after a success `onReset` seeds the
 * form again and `onDone` reads the held copies again.
 *
 * @param {Object} options - The host, the machine and the callbacks
 * @returns {Object} The phase, the step, the issues, the busy flag, the task and the actions
 */
export const useSettingsApply = ({ status, hostId, server, name, running, onReset, onDone }) => {
  const { t } = useTranslation();
  const notify = useNotify();
  const [flow, setFlow] = useState(IDLE);
  const [busy, setBusy] = useState(false);
  const [issues, setIssues] = useState(NO_ISSUES);
  const [task, setTask] = useState(null);
  const streamsTasks = hostStreamsTopic(status, server, 'tasks');
  const streamsHosts = hostStreamsTopic(status, server, 'hosts');

  const watched = answer => {
    const row = hostHasFeature(server, 'tasks') ? queuedTaskOf(answer, name) : null;
    return row ? { label: t('hosts.tools.viewTask'), onClick: () => setTask(row) } : null;
  };

  const finished = (kind, text, answer = null) => {
    notify(kind, text, { action: answer ? watched(answer) : null });
    setFlow(IDLE);
    setIssues(NO_ISSUES);
    setBusy(false);
    onReset();
    onDone();
  };

  const failed = error => {
    const found = resourceIssuesOf(error);
    setIssues(found);
    notify(
      'danger',
      found.length > 0 ? t('machineEdit.machineSettings.insufficientResources') : error.message
    );
    setFlow(current => ({
      ...IDLE,
      phase: current.staged ? 'choice' : 'form',
      staged: current.staged,
    }));
    setBusy(false);
  };

  const startAfterApply = async warnings => {
    setFlow(current => ({
      ...current,
      intent: null,
      step: t('machineEdit.machineSettings.startingMachine', { machineName: name }),
    }));
    try {
      await startMachine(status, hostId, name);
      finished(
        warnings ? 'warning' : 'success',
        `${t('machineEdit.machineSettings.changesAppliedStarting', { machineName: name })}${warnings}`
      );
    } catch (error) {
      failed(
        Object.assign(error, {
          message: t('machineEdit.machineSettings.startFailedError', { message: error.message }),
        })
      );
    }
  };

  const reportApplied = ({ answer, warnings, queuedWhileRunning, immediate }) => {
    if (queuedWhileRunning) {
      finished(
        'warning',
        `${t('machineEdit.machineSettings.changesAcceptedQueued', { machineName: name })}${warnings}`,
        answer
      );
      return;
    }
    const base = messageBase(answer, name, t);
    if (immediate) {
      finished(warnings ? 'warning' : 'success', `${base}.${warnings}`, answer);
      return;
    }
    const restartNote =
      answer.requires_restart === false ? '' : t('machineEdit.machineSettings.takeEffectOnStart');
    finished(warnings ? 'warning' : 'success', `${base}${restartNote}.${warnings}`, answer);
  };

  const applyChanges = async (changes, { restart = false, queuedWhileRunning = false } = {}) => {
    setFlow(current => ({
      ...current,
      phase: 'working',
      step: t('machineEdit.machineSettings.applyingChanges'),
      intent: null,
    }));
    setBusy(true);
    try {
      const answer = (await modifyMachine(status, hostId, name, changes)) || {};
      setIssues(NO_ISSUES);
      const warnings = warningsSuffix(answer, t);
      if (answer.status === 'pending_power_cycle') {
        finished(
          'warning',
          t('machineEdit.machineSettings.pendingNoticeText', {
            base: messageBase(answer, name, t),
            count: pendingCount(answer),
          })
        );
        return;
      }
      if (!restart) {
        reportApplied({
          answer,
          warnings,
          queuedWhileRunning,
          immediate: immediateOnlyChanges(changes),
        });
        return;
      }
      if (answer.task_id && streamsTasks) {
        setFlow(current => ({
          ...current,
          step: t('machineEdit.machineSettings.waitingForModificationTask'),
          intent: { stage: 'applying', taskId: String(answer.task_id), warnings },
        }));
        return;
      }
      if (answer.task_id) {
        finished(
          'info',
          `${messageBase(answer, name, t)}${t('machineEdit.machineSettings.takeEffectOnStart')}.${warnings}`,
          answer
        );
        return;
      }
      await startAfterApply(warnings);
    } catch (error) {
      failed(error);
    }
  };

  const stopThenApply = async () => {
    const { staged } = flow;
    setFlow(current => ({
      ...current,
      phase: 'working',
      step: t('machineEdit.machineSettings.stoppingMachine', { machineName: name }),
    }));
    setBusy(true);
    try {
      await stopMachine(status, hostId, name);
      if (!streamsHosts) {
        notify('info', t('machineEdit.machineSettings.stopSentNoStream', { machineName: name }));
        setFlow(IDLE);
        setBusy(false);
        return;
      }
      setFlow(current => ({ ...current, intent: { stage: 'stopping', changes: staged } }));
    } catch (error) {
      failed(
        Object.assign(error, {
          message: t('machineEdit.machineSettings.stopFailedError', { message: error.message }),
        })
      );
    }
  };

  useEventStream('stats-updated', data => {
    const { intent } = flow;
    if (intent?.stage !== 'stopping' || agentIdOf(data) !== String(hostId)) {
      return;
    }
    if (isRunning(withoutAgentId(data), name)) {
      return;
    }
    applyChanges(intent.changes, { restart: true });
  });

  useEventStream('task-updated', data => {
    const { intent } = flow;
    if (intent?.stage !== 'applying' || agentIdOf(data) !== String(hostId)) {
      return;
    }
    const row = withoutAgentId(data);
    if (String(row.id) !== intent.taskId || !TERMINAL_TASK_STATUSES.includes(row.status)) {
      return;
    }
    if (row.status === 'completed') {
      startAfterApply(intent.warnings);
      return;
    }
    failed(new Error(row.error_message || t('machineEdit.machineSettings.modificationTaskFailed')));
  });

  const submit = changes => {
    setIssues(NO_ISSUES);
    if (running && !immediateOnlyChanges(changes)) {
      setFlow({ ...IDLE, phase: 'choice', staged: changes });
      return;
    }
    applyChanges(changes);
  };

  const cancelPending = async () => {
    setBusy(true);
    try {
      await clearPendingChanges(status, hostId, name);
      finished(
        'success',
        t('machineEdit.machineSettings.pendingChangesCleared', { machineName: name })
      );
    } catch (error) {
      notify('danger', error.message);
      setBusy(false);
    }
  };

  const applyPendingNow = async () => {
    setBusy(true);
    try {
      const answer = (await applyPendingChanges(status, hostId, name)) || {};
      finished(
        'success',
        `${(
          answer.message ||
          t('machineEdit.machineSettings.pendingChangesApplied', { machineName: name })
        ).replace(/\.+$/u, '')}.`,
        answer
      );
    } catch (error) {
      notify('danger', error.message);
      setBusy(false);
    }
  };

  return {
    phase: flow.phase,
    step: flow.step,
    issues,
    busy,
    task,
    closeTask: () => {
      setTask(null);
      onDone();
    },
    submit,
    stopThenApply,
    queueNow: () => applyChanges(flow.staged, { queuedWhileRunning: true }),
    back: () => setFlow(IDLE),
    cancelPending,
    applyPendingNow,
  };
};
