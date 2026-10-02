import { gatesOf, hostHasFeature, hostHasHypervisor } from './capabilities';
import { canStartStopMachines } from './permissions';

/**
 * What the host's row, the machine's row, the person's role and the
 * running state allow of the two guest tools hyperweaver-ui drew beside
 * the guest rows: `exec`, Run in guest, while the machine runs, its
 * guest can be reached (`gatesOf().guest`) and the person may operate
 * it; `flavor`, the wire the command rides, `qga` through the guest
 * agent on a host that lists `guest-agent` and `additions` through the
 * Guest Additions otherwise; and `display`, Set display size, while the
 * machine runs on a host that names `virtualbox`, never of a machine on
 * UTM. No agent lists a token for the display route, so the host's
 * hypervisors gate it.
 *
 * @param {Object} options - The host's row, the machine's row, the role and the running state
 * @param {Object|null} options.server - The registry row, or the one serving agent's
 * @param {Object|null} options.machine - The machine's own row
 * @param {string} [options.role] - The person's role
 * @param {boolean} options.running - Whether the machine runs
 * @returns {{ exec: boolean, flavor: string, display: boolean }} The tools
 */
export const guestToolsOf = ({ server, machine, role, running }) => {
  const gates = gatesOf({ server, machine });
  const operate = running && canStartStopMachines(role);
  const virtualbox = hostHasHypervisor(server, 'virtualbox');
  return {
    exec: operate && gates.guest,
    flavor: hostHasFeature(server, 'guest-agent') ? 'qga' : 'additions',
    display: operate && virtualbox && !gates.utm,
  };
};
