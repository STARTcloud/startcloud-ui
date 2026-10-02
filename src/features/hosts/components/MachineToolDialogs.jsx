import PropTypes from 'prop-types';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { startUnattendedInstall } from '../api/machineCreate';
import { cloneMachine, moveMachine } from '../api/machines';
import { takeSnapshot } from '../api/snapshots';
import { exportTemplate } from '../api/templates';
import { useMachineRow } from '../hooks/useHostMachines';
import { useHostRow } from '../hooks/useHostRow';
import { useHostStats } from '../hooks/useHostStats';
import { useMachineTools } from '../hooks/useMachineTools';
import { guestToolsOf } from '../utils/guestTools';
import { isRunning } from '../utils/hosts';
import { nounKeyOf } from '../utils/machines';
import { cloneWireOf, hostTemplatesSnapshots, resourceIssuesOf } from '../utils/machineTools';

import DisplayResizeModal from './DisplayResizeModal';
import GuestExecModal from './GuestExecModal';
import MachineCloneDialog from './MachineCloneDialog';
import MachineMoveDialog from './MachineMoveDialog';
import MachineTemplateDialog from './MachineTemplateDialog';
import SnapshotTakeDialog from './SnapshotTakeDialog';
import TaskDialog from './TaskDialog';
import UnattendedInstallModal from './UnattendedInstallModal';

export const MACHINE_TOOLS = ['take', 'clone', 'template', 'install', 'move', 'exec', 'display'];

const NO_ISSUES = [];

const CONVERT_NOTES = ['machine.convertToTemplateModal.outputNote'];

const INSTALL_NOTES = ['machine.unattendedInstallModal.watchProgressNote'];

const OpenTool = ({ status, tool, id, name, tools, onClose }) => {
  const { t } = useTranslation();
  const server = useHostRow(id);
  const { stats } = useHostStats(id);
  const { machine } = useMachineRow(id, name);
  const [issues, setIssues] = useState(NO_ISSUES);
  const running = isRunning(stats, name);
  const utm = machine?.hypervisor === 'utm';

  const send = async request => {
    const { error } = await tools.send({ id, name, ...request });
    setIssues(resourceIssuesOf(error));
    if (!error) {
      onClose();
    }
  };

  if (tool === 'take') {
    return (
      <SnapshotTakeDialog
        name={name}
        utm={utm}
        running={running}
        busy={tools.busy}
        onClose={onClose}
        onTake={body =>
          send({
            call: () => takeSnapshot(status, id, name, body),
            doneKey: 'hosts.snapshots.done.take',
            failKey: 'machine.machineSnapshots.snapshotFailed',
            watch: true,
          })
        }
      />
    );
  }
  if (tool === 'clone') {
    return (
      <MachineCloneDialog
        id={id}
        name={name}
        noun={t(nounKeyOf(server ? [server] : []))}
        wire={cloneWireOf({ server, machine })}
        running={running}
        busy={tools.busy}
        issues={issues}
        onClose={onClose}
        onSubmit={body =>
          send({
            call: () => cloneMachine(status, id, name, body),
            doneKey: 'hosts.clone.done',
            inline: true,
          })
        }
      />
    );
  }
  if (tool === 'template') {
    return (
      <MachineTemplateDialog
        id={id}
        name={name}
        picks={hostTemplatesSnapshots(server)}
        running={running}
        busy={tools.busy}
        onClose={onClose}
        onSubmit={body =>
          send({
            call: () => exportTemplate(status, id, body),
            doneKey: 'machine.convertToTemplateModal.queuedFallback',
            notes: CONVERT_NOTES,
          })
        }
      />
    );
  }
  if (tool === 'exec') {
    return (
      <GuestExecModal
        status={status}
        hostId={id}
        name={name}
        running={running}
        flavor={guestToolsOf({ server, machine, running }).flavor}
        utm={utm}
        onClose={onClose}
      />
    );
  }
  if (tool === 'display') {
    return (
      <DisplayResizeModal
        status={status}
        hostId={id}
        name={name}
        running={running}
        onClose={onClose}
      />
    );
  }
  if (tool === 'install') {
    return (
      <UnattendedInstallModal
        status={status}
        id={id}
        server={server}
        name={name}
        running={running}
        busy={tools.busy}
        onClose={onClose}
        onSubmit={body =>
          send({
            call: () => startUnattendedInstall(status, id, name, body),
            doneKey: 'machine.unattendedInstallModal.queuedFallback',
            notes: INSTALL_NOTES,
          })
        }
      />
    );
  }
  return (
    <MachineMoveDialog
      name={name}
      running={running}
      busy={tools.busy}
      onClose={onClose}
      onMove={path =>
        send({
          call: () => moveMachine(status, id, name, path),
          doneKey: 'machine.moveMachineModal.queuedFallback',
        })
      }
    />
  );
};

OpenTool.propTypes = {
  status: PropTypes.object.isRequired,
  tool: PropTypes.oneOf(MACHINE_TOOLS).isRequired,
  id: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  tools: PropTypes.shape({
    send: PropTypes.func.isRequired,
    busy: PropTypes.bool.isRequired,
  }).isRequired,
  onClose: PropTypes.func.isRequired,
};

/**
 * The dialogs of a machine's tools, shared by the Controls menu, the
 * sidebar tree's menu and a row of the machines list: `take` opens the
 * dialog that takes a snapshot, `clone` the one that clones the machine,
 * `template` the one that makes a template of it, `install` the one that
 * starts an unattended OS install on a VirtualBox machine that is off
 * and `move` the one that moves the files of a VirtualBox machine,
 * `exec` the one that runs a command in the guest and `display` the one
 * that sets a running VirtualBox machine's display size, these two
 * sending their own request and raising their own notice;
 * nothing shows while `tool` is empty. Every other dialog hands back the body of its one request, sent
 * through `useMachineTools`, one notice and the held copies read again
 * once; a success closes the dialog, a refusal leaves it open, and what
 * an agent short of resources refused draws in the clone dialog alone,
 * where hyperweaver-ui drew it, and raises no card beside it. What the
 * clone and the template take of the machine's platform is told by the
 * host's own row and the machine's own row, `cloneWireOf` and
 * `hostTemplatesSnapshots`. The machine's running state comes from the
 * host's stats and its hypervisor from the host's machine rows, the
 * copies every caller shares. The task dialog of a queued write draws
 * here too and outlives the dialog that queued it: a snapshot's task
 * opens at once, the way hyperweaver-ui followed it, and every other
 * from the notice's View task.
 */
const MachineToolDialogs = ({ status, tool, id, name, onClose }) => {
  const tools = useMachineTools();
  return (
    <>
      {MACHINE_TOOLS.includes(tool) ? (
        <OpenTool
          key={`${tool}|${id}|${name}`}
          status={status}
          tool={tool}
          id={id}
          name={name}
          tools={tools}
          onClose={onClose}
        />
      ) : null}
      {tools.task ? (
        <TaskDialog
          status={status}
          id={tools.task.id}
          task={tools.task.row}
          onHide={tools.closeTask}
        />
      ) : null}
    </>
  );
};

MachineToolDialogs.propTypes = {
  status: PropTypes.object.isRequired,
  tool: PropTypes.string.isRequired,
  id: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  onClose: PropTypes.func.isRequired,
};

export default MachineToolDialogs;
