import PropTypes from 'prop-types';
import { useState } from 'react';
import { Dropdown } from 'react-bootstrap';
import {
  FaArrowsRotate,
  FaBolt,
  FaBug,
  FaCirclePause,
  FaCirclePlay,
  FaDisplay,
  FaPause,
  FaPlay,
  FaPowerOff,
  FaRotate,
  FaSkull,
  FaStop,
  FaTerminal,
  FaTrash,
} from 'react-icons/fa6';

import { useHostActions } from '../hooks/useHostActions';
import { useMachineRow } from '../hooks/useHostMachines';
import { useHostStats } from '../hooks/useHostStats';
import { useMachineDetailRefresh } from '../hooks/useMachineDetail';
import { gatesOf } from '../utils/capabilities';
import { guestToolsOf } from '../utils/guestTools';
import { isRunning } from '../utils/hosts';
import { canDestroyMachines, canRestartMachines, canStartStopMachines } from '../utils/permissions';

import ApplicationRows from './ApplicationRows';
import ConsoleRows from './ConsoleRows';
import DisplayResizeModal from './DisplayResizeModal';
import GuestExecModal from './GuestExecModal';
import { ActionRow, PrivilegeLine, ShareLinkRow } from './HostActionOptions';
import MachineDangerDialogs from './MachineDangerDialogs';
import MachineToolRows from './MachineToolRows';
import ProvisioningRows from './ProvisioningRows';
import ZoneRows from './ZoneRows';

const gatesShape = PropTypes.shape({
  utm: PropTypes.bool.isRequired,
  pause: PropTypes.bool.isRequired,
  suspend: PropTypes.bool.isRequired,
  resume: PropTypes.bool.isRequired,
  guest: PropTypes.bool.isRequired,
});

const RestartRows = ({ utm, busy, onAction }) => (
  <>
    <ActionRow
      icon={FaRotate}
      tone="text-warning"
      labelKey="hosts.controls.restart"
      disabled={busy}
      onClick={() => onAction('restart')}
    />
    {utm ? null : (
      <ActionRow
        icon={FaBolt}
        tone="text-danger"
        labelKey="hosts.controls.reset"
        titleKey="hosts.controls.resetTitle"
        disabled={busy}
        onClick={() => onAction('reset')}
      />
    )}
    <ActionRow
      icon={FaBug}
      tone="text-danger"
      labelKey="hosts.controls.injectNmi"
      titleKey="hosts.controls.injectNmiTitle"
      disabled={busy}
      onClick={() => onAction('nmi')}
    />
  </>
);

RestartRows.propTypes = {
  utm: PropTypes.bool.isRequired,
  busy: PropTypes.bool.isRequired,
  onAction: PropTypes.func.isRequired,
};

const PowerRows = ({ role, running, utm, busy, onAction }) => {
  if (!canStartStopMachines(role)) {
    return null;
  }
  return (
    <>
      {running ? (
        <ActionRow
          icon={FaStop}
          tone="text-danger"
          labelKey="hosts.controls.shutdown"
          disabled={busy}
          onClick={() => onAction('shutdown')}
        />
      ) : (
        <ActionRow
          icon={FaPlay}
          tone="text-success"
          labelKey="hosts.controls.powerOn"
          disabled={busy}
          onClick={() => onAction('start')}
        />
      )}
      {running && canRestartMachines(role) ? (
        <RestartRows utm={utm} busy={busy} onAction={onAction} />
      ) : null}
    </>
  );
};

PowerRows.propTypes = {
  role: PropTypes.string,
  running: PropTypes.bool.isRequired,
  utm: PropTypes.bool.isRequired,
  busy: PropTypes.bool.isRequired,
  onAction: PropTypes.func.isRequired,
};

const HoldRows = ({ role, running, gates, busy, onAction }) => {
  if (!canStartStopMachines(role)) {
    return null;
  }
  return (
    <>
      {running && gates.pause ? (
        <ActionRow
          icon={FaCirclePause}
          tone="text-warning"
          labelKey="hosts.controls.pause"
          titleKey="hosts.controls.pauseTitle"
          disabled={busy}
          onClick={() => onAction('pause')}
        />
      ) : null}
      {running && gates.suspend ? (
        <ActionRow
          icon={FaPause}
          tone="text-warning"
          labelKey="hosts.controls.suspend"
          titleKey="hosts.controls.suspendTitle"
          disabled={busy}
          onClick={() => onAction('suspend')}
        />
      ) : null}
      {gates.resume ? (
        <ActionRow
          icon={FaCirclePlay}
          tone="text-success"
          labelKey="hosts.controls.resume"
          titleKey="hosts.controls.resumeTitle"
          disabled={busy}
          onClick={() => onAction('resume')}
        />
      ) : null}
    </>
  );
};

HoldRows.propTypes = {
  role: PropTypes.string,
  running: PropTypes.bool.isRequired,
  gates: gatesShape.isRequired,
  busy: PropTypes.bool.isRequired,
  onAction: PropTypes.func.isRequired,
};

const GuestRows = ({ role, running, gates, busy, onAction }) => {
  if (!running || !gates.guest || !canStartStopMachines(role)) {
    return null;
  }
  return (
    <>
      <ActionRow
        icon={FaPowerOff}
        tone="text-danger"
        labelKey="hosts.controls.guestShutdown"
        titleKey="hosts.controls.guestShutdownTitle"
        disabled={busy}
        onClick={() => onAction('guest-powerdown')}
      />
      {gates.utm ? null : (
        <ActionRow
          icon={FaArrowsRotate}
          tone="text-warning"
          labelKey="hosts.controls.guestReboot"
          titleKey="hosts.controls.guestRebootTitle"
          disabled={busy}
          onClick={() => onAction('guest-reboot')}
        />
      )}
    </>
  );
};

GuestRows.propTypes = {
  role: PropTypes.string,
  running: PropTypes.bool.isRequired,
  gates: gatesShape.isRequired,
  busy: PropTypes.bool.isRequired,
  onAction: PropTypes.func.isRequired,
};

const GuestToolRows = ({ tools, busy, onTool }) => (
  <>
    {tools.exec ? (
      <ActionRow
        icon={FaTerminal}
        tone="text-info"
        labelKey="hosts.controls.guestExec"
        titleKey="hosts.controls.guestExecTitle"
        action="guest-exec"
        disabled={busy}
        onClick={() => onTool('exec')}
      />
    ) : null}
    {tools.display ? (
      <ActionRow
        icon={FaDisplay}
        tone="text-info"
        labelKey="hosts.controls.displayResize"
        titleKey="hosts.controls.displayResizeTitle"
        action="display-resize"
        disabled={busy}
        onClick={() => onTool('display')}
      />
    ) : null}
  </>
);

GuestToolRows.propTypes = {
  tools: PropTypes.shape({
    exec: PropTypes.bool.isRequired,
    display: PropTypes.bool.isRequired,
    flavor: PropTypes.string.isRequired,
  }).isRequired,
  busy: PropTypes.bool.isRequired,
  onTool: PropTypes.func.isRequired,
};

const GuestToolDialogs = ({ status, id, name, running, tool, gates, tools, onClose }) => {
  if (tool === 'exec') {
    return (
      <GuestExecModal
        status={status}
        hostId={id}
        name={name}
        running={running}
        flavor={tools.flavor}
        utm={gates.utm}
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
  return null;
};

GuestToolDialogs.propTypes = {
  status: PropTypes.object.isRequired,
  id: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  running: PropTypes.bool.isRequired,
  tool: PropTypes.string.isRequired,
  gates: gatesShape.isRequired,
  tools: PropTypes.object.isRequired,
  onClose: PropTypes.func.isRequired,
};

const DangerRows = ({ role, running, busy, onDanger }) => {
  if (!canDestroyMachines(role)) {
    return <PrivilegeLine />;
  }
  return (
    <>
      {running ? (
        <ActionRow
          icon={FaSkull}
          tone="text-danger"
          labelKey="hosts.controls.forceKill"
          disabled={busy}
          onClick={() => onDanger('kill')}
        />
      ) : null}
      <ActionRow
        icon={FaTrash}
        tone="text-danger"
        labelKey="hosts.controls.destroy"
        disabled={busy}
        onClick={() => onDanger('destroy')}
      />
    </>
  );
};

DangerRows.propTypes = {
  role: PropTypes.string,
  running: PropTypes.bool.isRequired,
  busy: PropTypes.bool.isRequired,
  onDanger: PropTypes.func.isRequired,
};

/**
 * The machine rows of the Controls menu on `/hosts/{id}/machines/{name}`,
 * each one request through `useHostActions` and one notice: Share link,
 * hyperweaver-ui's first row, first; Power on
 * while the machine is stopped; Shutdown, Restart, Reset and Inject NMI
 * while it runs; Pause on a VirtualBox host and Suspend on a host that
 * lists `machine-suspend` while it runs, Resume while its own row reads
 * paused on such a host or reads suspended on a host that lists
 * `machine-resume-suspended`; Guest shutdown and Guest reboot while it runs and
 * its guest can be reached from outside; a machine on UTM draws no Reset,
 * no Pause and no Guest reboot; Run in guest and Set display size by
 * `guestToolsOf`, each opening its dialog, the command sent through the
 * guest agent on a host that lists `guest-agent` and through the Guest
 * Additions on a VirtualBox host otherwise, the display size on a
 * VirtualBox host alone and never of a machine on UTM; the console rows
 * of `ConsoleRows`, one a console the host's row lists, each opening it
 * on the machine's page; then the Open in application rows of a
 * host that lists `host-launchers`, the tool rows of `MachineToolRows`,
 * Snapshot, Clone, Convert to template and the move of a VirtualBox
 * machine's files, each behind its own gate, the zone lifecycle rows of
 * a bhyve host, the provisioning rows of `ProvisioningRows`, Provision,
 * Sync files, Sync back and Run provisioners, each opening the
 * Provisioning page with its action, and, for a role that may destroy,
 * Force kill while it runs and
 * Destroy, both behind the dialogs of `MachineDangerDialogs`. The host's
 * tokens and hypervisors come from its registry row, `server`, the
 * running state from the host's stats and the machine's hypervisor and
 * state from the host's machine rows, both read again once after every
 * success, and the machine's detail with them while the machine page
 * holds it, so the page's state row follows the action. A role short of
 * destroying reads the privilege line instead.
 */
const MachineRows = ({ status, id, name, server = null, user = null }) => {
  const role = user?.role;
  const { stats, refresh: refreshStats } = useHostStats(id);
  const { machine, refresh: refreshMachines } = useMachineRow(id, name);
  const refreshDetail = useMachineDetailRefresh();
  const refresh = () => {
    refreshStats();
    refreshMachines();
    refreshDetail(id, name);
  };
  const { run, busy } = useHostActions({ status, id, name, onDone: refresh });
  const [danger, setDanger] = useState('');
  const [tool, setTool] = useState('');
  const running = isRunning(stats, name);
  const gates = gatesOf({ server, machine });
  const guestTools = guestToolsOf({ server, machine, role, running });

  return (
    <>
      <ShareLinkRow />
      <Dropdown.Divider />
      <PowerRows role={role} running={running} utm={gates.utm} busy={busy} onAction={run} />
      <HoldRows role={role} running={running} gates={gates} busy={busy} onAction={run} />
      <GuestRows role={role} running={running} gates={gates} busy={busy} onAction={run} />
      <GuestToolRows tools={guestTools} busy={busy} onTool={setTool} />
      <ConsoleRows id={id} name={name} server={server} busy={busy} />
      <ApplicationRows
        status={status}
        id={id}
        server={server}
        busy={busy}
        onLaunch={application => run('launch', { application })}
      />
      <MachineToolRows
        status={status}
        id={id}
        name={name}
        server={server}
        machine={machine}
        user={user}
        busy={busy}
      />
      <ZoneRows
        status={status}
        id={id}
        name={name}
        server={server}
        user={user}
        busy={busy}
        onAction={run}
      />
      <ProvisioningRows id={id} name={name} server={server} user={user} busy={busy} />
      <Dropdown.Divider />
      <DangerRows role={role} running={running} busy={busy} onDanger={setDanger} />
      <MachineDangerDialogs action={danger} name={name} onClose={() => setDanger('')} onRun={run} />
      <GuestToolDialogs
        status={status}
        id={id}
        name={name}
        running={running}
        tool={tool}
        gates={gates}
        tools={guestTools}
        onClose={() => setTool('')}
      />
    </>
  );
};

MachineRows.propTypes = {
  status: PropTypes.object.isRequired,
  id: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  server: PropTypes.object,
  user: PropTypes.object,
};

export default MachineRows;
