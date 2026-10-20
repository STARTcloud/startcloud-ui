import PropTypes from 'prop-types';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaArrowUpRightFromSquare } from 'react-icons/fa6';
import { useSearchParams } from 'react-router-dom';

import ConfirmModal from '../../../components/common/ConfirmModal';
import RecordRows from '../../../components/common/RecordRows';
import SectionHeading from '../../../components/common/SectionHeading';
import { useNotify } from '../../../contexts/NoticeContext';
import { useStatus } from '../../../contexts/StatusContext';
import { useEventStream } from '../../../hooks/useEventStream';
import {
  fetchProvisionStatus,
  provisionMachine,
  runProvisioners,
  syncMachine,
} from '../api/provisioning';
import { useHostRow } from '../hooks/useHostRow';
import { useMachineDetail } from '../hooks/useMachineDetail';
import { hostHasFeature } from '../utils/capabilities';
import { agentIdOf, withoutAgentId } from '../utils/hosts';
import { hostStreamsTasks } from '../utils/machineTools';
import {
  hookReasonOf,
  needsHookConfirmation,
  pipelineOutcome,
  provisionStatusTone,
  provisionerDocumentOf,
  provisioningGates,
  requestedActionOf,
} from '../utils/provisioning';
import { TERMINAL_TASK_STATUSES, formatTaskDate } from '../utils/tasks';

import ProvisioningEditor from './ProvisioningEditor';
import TaskDialog from './TaskDialog';

const provisionerRows = (document, t) =>
  document.provisioner_name || document.provisioner_version
    ? [
        {
          key: 'provisioner',
          label: t('provisioning.machineProvisioning.provisionerLabel'),
          value: (
            <code className="small" data-provisioner={document.provisioner_name || '?'}>
              {document.provisioner_name || '?'}/{document.provisioner_version || '?'}
            </code>
          ),
        },
      ]
    : [];

const StatusValue = ({ state }) => {
  const { t } = useTranslation();
  const word = state.provisioning_status || t('provisioning.machineProvisioning.unknown');
  return (
    <>
      <span
        className={`badge text-bg-${provisionStatusTone(state.provisioning_status)}`}
        data-provisioning-status={state.provisioning_status || 'unknown'}
      >
        {word}
      </span>
      {state.last_provisioned_at ? (
        <span className="ms-2">
          {t('provisioning.machineProvisioning.lastProvisioned', {
            date: formatTaskDate(state.last_provisioned_at),
          })}
        </span>
      ) : null}
    </>
  );
};

StatusValue.propTypes = {
  state: PropTypes.object.isRequired,
};

const statusRows = ({ document, webAddress, t }) => [
  ...provisionerRows(document, t),
  ...(webAddress
    ? [
        {
          key: 'welcome',
          label: t('provisioning.machineProvisioning.welcomePageLabel'),
          value: (
            <a href={webAddress} target="_blank" rel="noopener noreferrer">
              {webAddress}
              <FaArrowUpRightFromSquare className="ms-2 small" aria-hidden="true" />
            </a>
          ),
        },
      ]
    : []),
];

const useProvisionStatus = ({ status, id, name, offered }) => {
  const [held, setHeld] = useState({ key: '', state: null });
  const key = `${id}|${name}`;

  const read = useCallback(() => {
    if (!offered) {
      return;
    }
    fetchProvisionStatus(status, id, name)
      .then(answer => setHeld({ key, state: answer || null }))
      .catch(() => setHeld({ key, state: null }));
  }, [status, id, name, key, offered]);

  useEffect(() => {
    read();
  }, [read]);

  useEventStream('ready', (data, resumed) => {
    if (data && !resumed) {
      read();
    }
  });

  useEventStream('reset', read);

  return { state: offered && held.key === key ? held.state : null, read };
};

/**
 * The Provisioning page of one machine, hyperweaver-ui's Provisioning
 * tab on glass, no card around any of it: one heading, `title`, the
 * pipeline's state as its badge with when it last provisioned as the
 * muted text after it, read by `GET machines/{name}/provision/status`
 * while the host lists `provisioning` and the machine's detail carries a
 * document, and in its pane the editor's Save and Discard, then
 * `actions`; under it the record rows of the provisioner the document
 * names and the welcome page where the agent answers one; under them,
 * for a person who may create machines on a host that lists
 * `machine-create`, the document editor, its tabs, Hosts.yml among them,
 * which draws the heading. A pipeline action handed in `run`
 * by the Controls menu, the tree or a row is sent once as the page
 * opens, `POST machines/{name}/provision`, `/sync`, `/sync` with
 * `syncback` or `/run-provisioners`, one notice reporting the queued
 * task with View task where the host lists `tasks`, a 200 no-op that
 * skipped everything reported as a warning, and the host-hooks refusal,
 * the 409 with `needs_confirmation`, asking a plain confirmation
 * before the same request goes again with `confirm_host_hooks`. On a
 * machine whose status reads `provisioned`, for a person the pipeline
 * rows are offered to, the editor's play glyphs send the same
 * `POST machines/{name}/provision` narrowed to one role, one script or
 * one playbook, with the same notice and task. The
 * status is read again when the queued task ends on the stream, when
 * the task dialog closes, on the stream's fresh opening and its `reset`,
 * and after a stored document with the detail; nothing polls.
 */
const MachineProvisioning = ({ id, name, context, title, actions = null }) => {
  const { t } = useTranslation();
  const status = useStatus();
  const notify = useNotify();
  const server = useHostRow(id);
  const { detail, loaded, refresh } = useMachineDetail(id, name);
  const [searchParams, setSearchParams] = useSearchParams();
  const role = context.user?.role;
  const document = provisionerDocumentOf(detail);
  const gates = provisioningGates({ server, detail, role });
  const offered = hostHasFeature(server, 'provisioning') && document !== null;
  const { state, read } = useProvisionStatus({ status, id, name, offered });
  const [busy, setBusy] = useState(false);
  const [hookReason, setHookReason] = useState('');
  const [hookOptions, setHookOptions] = useState({});
  const [task, setTask] = useState(null);
  const [watched, setWatched] = useState('');
  const confirmedRef = useRef(false);
  const requested = requestedActionOf(searchParams.get('run'));

  const reread = useCallback(() => {
    read();
    refresh();
  }, [read, refresh]);

  useEventStream('task-updated', data => {
    if (!watched || agentIdOf(data) !== String(id)) {
      return;
    }
    const row = withoutAgentId(data);
    if (String(row.id) === watched && TERMINAL_TASK_STATUSES.includes(row.status)) {
      setWatched('');
      reread();
    }
  });

  const callOf = (kind, options) => {
    if (kind === 'provision') {
      return provisionMachine(status, id, name, options);
    }
    if (kind === 'run-provisioners') {
      return runProvisioners(status, id, name);
    }
    return syncMachine(status, id, name, kind === 'syncback');
  };

  const run = async (kind, options = {}) => {
    setBusy(true);
    try {
      const answer = await callOf(kind, options);
      const outcome = pipelineOutcome(answer, name, t);
      if (outcome.nothing) {
        notify('warning', outcome.nothing);
        return;
      }
      const viewable = outcome.task && hostHasFeature(server, 'tasks');
      notify('success', outcome.parts.join(' '), {
        action: viewable
          ? { label: t('hosts.tools.viewTask'), onClick: () => setTask(outcome.task) }
          : null,
      });
      if (outcome.task && hostStreamsTasks(status, server)) {
        setWatched(outcome.task.id);
      }
      read();
    } catch (error) {
      if (kind === 'provision' && needsHookConfirmation(error)) {
        setHookOptions(options);
        setHookReason(hookReasonOf(error));
        return;
      }
      notify('danger', error.message || t('hosts.controls.failed'));
    } finally {
      setBusy(false);
    }
  };

  const runRef = useRef(run);
  const rowsOffered = gates.rows;

  useEffect(() => {
    runRef.current = run;
  });

  useEffect(() => {
    if (!requested || !loaded) {
      return;
    }
    setSearchParams({}, { replace: true });
    if (rowsOffered) {
      runRef.current(requested);
    }
  }, [requested, loaded, rowsOffered, setSearchParams]);

  const saved = text => {
    notify('success', text);
    reread();
  };

  const closeTask = () => {
    setTask(null);
    reread();
  };

  const closeHooks = () => {
    setHookReason('');
    if (confirmedRef.current) {
      confirmedRef.current = false;
      return;
    }
    notify('info', t('provisioning.machineProvisioning.hookConfirmDeclined'));
  };

  const confirmHooks = () => {
    confirmedRef.current = true;
    run('provision', { ...hookOptions, confirm_host_hooks: true });
  };

  const runOne =
    gates.rows && state?.provisioning_status === 'provisioned'
      ? options => {
          if (!busy) {
            run('provision', options);
          }
        }
      : null;

  const heading = {
    title,
    count: state ? <StatusValue state={state} /> : null,
    badge: busy ? (
      <span className="spinner-border spinner-border-sm" role="status">
        <span className="visually-hidden">{t('provisioning.machineProvisioning.working')}</span>
      </span>
    ) : null,
    actions,
  };

  const lead = (
    <div className="mb-3" data-panel="machine-provisioning">
      {document ? (
        <>
          <RecordRows
            className="mb-2"
            rows={statusRows({ document, webAddress: detail?.web_address, t })}
          />
          <p className="form-text text-muted mb-0">
            {t('provisioning.machineProvisioning.pipelineHint')}
          </p>
        </>
      ) : (
        <p className="text-muted mb-0" data-note="no-document">
          {t('provisioning.machineProvisioning.noDocumentYet')}
          {gates.reshape ? t('provisioning.machineProvisioning.noDocumentReshapeSuffix') : ''}.
        </p>
      )}
    </div>
  );

  return (
    <div>
      {gates.reshape ? (
        <ProvisioningEditor
          id={id}
          name={name}
          document={document}
          heading={heading}
          lead={lead}
          onSaved={saved}
          onRun={runOne}
        />
      ) : (
        <>
          <SectionHeading
            title={heading.title}
            count={heading.count}
            badge={heading.badge}
            actions={actions}
          />
          {lead}
        </>
      )}
      <ConfirmModal
        show={hookReason !== ''}
        handleClose={closeHooks}
        handleConfirm={confirmHooks}
        title={t('provisioning.machineProvisioning.hookConfirmTitle')}
        message={`${hookReason} ${t('provisioning.machineProvisioning.hookConfirmSuffix')}`}
        variant="restart"
        typed={false}
        confirmText={t('provisioning.machineProvisioning.confirmAndProvision')}
      />
      {task ? <TaskDialog status={status} id={id} task={task} onHide={closeTask} /> : null}
    </div>
  );
};

MachineProvisioning.propTypes = {
  id: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  context: PropTypes.shape({
    user: PropTypes.object,
  }).isRequired,
  title: PropTypes.string.isRequired,
  actions: PropTypes.node,
};

export default MachineProvisioning;
