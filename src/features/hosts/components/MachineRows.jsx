import PropTypes from 'prop-types';
import { useState } from 'react';
import { Dropdown } from 'react-bootstrap';
import {
  FaArrowsRotate,
  FaBolt,
  FaBug,
  FaCirclePause,
  FaCirclePlay,
  FaPause,
  FaPlay,
  FaPowerOff,
  FaRotate,
  FaSkull,
  FaStop,
  FaTrash,
} from 'react-icons/fa6';

import { useHostActions } from '../hooks/useHostActions';
import { useMachineRow } from '../hooks/useHostMachines';
import { useHostStats } from '../hooks/useHostStats';
import { hostHasFeature, hostHasHypervisor } from '../utils/capabilities';
import { isRunning } from '../utils/hosts';
import { canDestroyMachines, canRestartMachines, canStartStopMachines } from '../utils/permissions';

import ApplicationRows from './ApplicationRows';
import { ActionRow, PrivilegeLine } from './HostActionOptions';
import MachineDangerDialogs from './MachineDangerDialogs';
import ZoneRows from './ZoneRows';

const HELD_STATES = ['paused', 'suspended'];

/**
 * What the host's row and the machine's own row allow in the menu: `utm`
 * while the machine's hypervisor is UTM, which has no reset, no pause
 * apart from its suspend and no guest reboot; `pause` on a VirtualBox
 * host; `suspend` while the host lists `machine-suspend`; `guest` while
 * the guest can be reached from outside, through Guest Additions on
 * VirtualBox or through the guest agent on a bhyve host that lists
 * `guest-agent`.
 *
 * @param {Object} options - The host's row and the machine's row
 * @returns {{ utm: boolean, pause: boolean, suspend: boolean, guest: boolean }} The gates
 */
const gatesOf = ({ server, machine }) => {
  const utm = machine?.hypervisor === 'utm';
  const virtualbox = hostHasHypervisor(server, 'virtualbox');
  return {
    utm,
    pause: virtualbox && !utm,
    suspend: hostHasFeature(server, 'machine-suspend'),
    guest:
      virtualbox || (hostHasHypervisor(server, 'bhyve') && hostHasFeature(server, 'guest-agent')),
  };
};

const gatesShape = PropTypes.shape({
  utm: PropTypes.bool.isRequired,
  pause: PropTypes.bool.isRequired,
  suspend: PropTypes.bool.isRequired,
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

const HoldRows = ({ role, running, held, gates, busy, onAction }) => {
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
      {held && gates.suspend ? (
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
  held: PropTypes.bool.isRequired,
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
 * each one request through `useHostActions` and one notice: Power on
 * while the machine is stopped; Shutdown, Restart, Reset and Inject NMI
 * while it runs; Pause on a VirtualBox host and Suspend on a host that
 * lists `machine-suspend` while it runs, Resume while its own row reads
 * paused or suspended; Guest shutdown and Guest reboot while it runs and
 * its guest can be reached from outside; a machine on UTM draws no Reset,
 * no Pause and no Guest reboot; then the Open in application rows of a
 * host that lists `host-launchers`, the zone lifecycle rows of a bhyve
 * host, and, for a role that may destroy, Force kill while it runs and
 * Destroy, both behind the dialogs of `MachineDangerDialogs`. The host's
 * tokens and hypervisors come from its registry row, `server`, the
 * running state from the host's stats and the machine's hypervisor and
 * state from the host's machine rows, both read again once after every
 * success. A role short of destroying reads the privilege line instead.
 */
const MachineRows = ({ status, id, name, server = null, user = null }) => {
  const role = user?.role;
  const { stats, refresh: refreshStats } = useHostStats(id);
  const { machine, refresh: refreshMachines } = useMachineRow(id, name);
  const refresh = () => {
    refreshStats();
    refreshMachines();
  };
  const { run, busy } = useHostActions({ status, id, name, onDone: refresh });
  const [danger, setDanger] = useState('');
  const running = isRunning(stats, name);
  const gates = gatesOf({ server, machine });
  const held = HELD_STATES.includes(machine?.status);

  return (
    <>
      <PowerRows role={role} running={running} utm={gates.utm} busy={busy} onAction={run} />
      <HoldRows
        role={role}
        running={running}
        held={held}
        gates={gates}
        busy={busy}
        onAction={run}
      />
      <GuestRows role={role} running={running} gates={gates} busy={busy} onAction={run} />
      <ApplicationRows
        status={status}
        id={id}
        server={server}
        busy={busy}
        onLaunch={application => run('launch', { application })}
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
      <Dropdown.Divider />
      <DangerRows role={role} running={running} busy={busy} onDanger={setDanger} />
      <MachineDangerDialogs action={danger} name={name} onClose={() => setDanger('')} onRun={run} />
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
