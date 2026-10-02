import PropTypes from 'prop-types';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaArrowUpRightFromSquare, FaFileCode } from 'react-icons/fa6';
import { useSearchParams } from 'react-router-dom';

import ConfirmModal from '../../../components/common/ConfirmModal';
import RecordRows from '../../../components/common/RecordRows';
import SectionCard, { foldsShape } from '../../../components/common/SectionCard';
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

import HostsYmlModal from './HostsYmlModal';
import ProvisioningEditor from './ProvisioningEditor';
import TaskDialog from './TaskDialog';

const STATUS_FOLD = 'machine-provisioning';

const EDITOR_FOLD = 'machine-provisioning-editor';

const HOOK_KEYWORD = 'provision';

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
  if (!state) {
    return <span className="text-muted">-</span>;
  }
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
        <span className="small text-muted ms-2">
          {t('provisioning.machineProvisioning.lastProvisioned', {
            date: formatTaskDate(state.last_provisioned_at),
          })}
        </span>
      ) : null}
    </>
  );
};

StatusValue.propTypes = {
  state: PropTypes.object,
};

const statusRows = ({ document, state, webAddress, t }) => [
  ...provisionerRows(document, t),
  {
    key: 'status',
    label: t('provisioning.machineProvisioning.statusLabel'),
    value: <StatusValue state={state} />,
  },
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
 * tab: the status card, the provisioner the document names, the
 * pipeline's state with when it last provisioned, read by
 * `GET machines/{name}/provision/status` while the host lists
 * `provisioning` and the machine's detail carries a document, and the
 * welcome page where the agent answers one; under it, for a person who
 * may create machines on a host that lists `machine-create`, Edit
 * Hosts.yml and the document editor. A pipeline action handed in `run`
 * by the Controls menu, the tree or a row is sent once as the page
 * opens, `POST machines/{name}/provision`, `/sync`, `/sync` with
 * `syncback` or `/run-provisioners`, one notice reporting the queued
 * task with View task where the host lists `tasks`, a 200 no-op that
 * skipped everything reported as a warning, and the host-hooks refusal,
 * the 409 with `needs_confirmation`, asking the typed confirmation
 * before the same request goes again with `confirm_host_hooks`. The
 * status is read again when the queued task ends on the stream, when
 * the task dialog closes, on the stream's fresh opening and its `reset`,
 * and after a stored document with the detail; nothing polls.
 */
const MachineProvisioning = ({ id, name, context, folds }) => {
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
  const [hostsYml, setHostsYml] = useState(false);
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
    run('provision', { confirm_host_hooks: true });
  };

  return (
    <div className="row g-3 mb-3">
      <div className="col-12" data-panel="machine-provisioning">
        <SectionCard
          title={t('provisioning.machineProvisioning.heading')}
          badge={
            busy ? (
              <span className="spinner-border spinner-border-sm" role="status">
                <span className="visually-hidden">
                  {t('provisioning.machineProvisioning.working')}
                </span>
              </span>
            ) : null
          }
          actions={
            gates.reshape ? (
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary"
                data-action="hosts-yml-edit"
                title={t('provisioning.machineProvisioning.editHostsYmlTitle')}
                disabled={busy}
                onClick={() => setHostsYml(true)}
              >
                <FaFileCode className="me-2" aria-hidden="true" />
                {t('provisioning.machineProvisioning.editHostsYmlButton')}
              </button>
            ) : null
          }
          className="mb-0"
          folded={folds.folded(STATUS_FOLD)}
          onFold={() => folds.toggle(STATUS_FOLD)}
        >
          {document ? (
            <>
              <RecordRows
                className="mb-2"
                rows={statusRows({ document, state, webAddress: detail?.web_address, t })}
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
        </SectionCard>
      </div>
      {gates.reshape ? (
        <div className="col-12">
          <SectionCard
            title={t('provisioning.provisioningEditor.heading')}
            className="mb-0"
            folded={folds.folded(EDITOR_FOLD)}
            onFold={() => folds.toggle(EDITOR_FOLD)}
          >
            <ProvisioningEditor id={id} name={name} document={document} onSaved={saved} />
          </SectionCard>
        </div>
      ) : null}
      {hostsYml ? (
        <HostsYmlModal id={id} name={name} onClose={() => setHostsYml(false)} onSaved={saved} />
      ) : null}
      <ConfirmModal
        show={hookReason !== ''}
        handleClose={closeHooks}
        handleConfirm={confirmHooks}
        title={t('provisioning.machineProvisioning.hookConfirmTitle')}
        message={`${hookReason} ${t('provisioning.machineProvisioning.hookConfirmSuffix')}`}
        variant="restart"
        keyword={HOOK_KEYWORD}
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
  folds: foldsShape.isRequired,
};

export default MachineProvisioning;
