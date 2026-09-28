const listOf = value => (Array.isArray(value) ? value : []);

/**
 * Whether a host's row names a feature token in its
 * `capabilities.features`, checked strictly: a row without the list names
 * nothing, because a row the Controls menu draws fires an agent request
 * that an agent without the surface answers 404.
 *
 * @param {Object|null} server - The registry row, or the one serving agent's
 * @param {string} token - The feature token, e.g. `machine-suspend`
 * @returns {boolean} True only when the list names the token
 */
export const hostHasFeature = (server, token) =>
  listOf(server?.capabilities?.features).includes(token);

/**
 * Whether a host's row names a hypervisor in its
 * `capabilities.hypervisors`, `bhyve`, `virtualbox` or `utm`, the positive
 * check the rows that exist on one hypervisor alone are gated by.
 *
 * @param {Object|null} server - The registry row, or the one serving agent's
 * @param {string} name - The hypervisor
 * @returns {boolean} True when the list names it
 */
export const hostHasHypervisor = (server, name) =>
  listOf(server?.capabilities?.hypervisors).includes(name);

/**
 * Whether Resume draws for a machine: while its own row reads `paused`
 * and the host lists `machine-suspend`, and while it reads `suspended`
 * and the host lists `machine-resume-suspended`, the token of an agent
 * whose resume route takes a suspended machine; an agent that resumes a
 * paused machine alone lists the first and not the second, and a
 * suspended machine there is brought back by Power on.
 *
 * @param {Object|null} server - The registry row, or the one serving agent's
 * @param {Object|null} machine - The machine's own row, its `status`
 * @returns {boolean} True when the row draws
 */
export const hostResumes = (server, machine) => {
  if (machine?.status === 'paused') {
    return hostHasFeature(server, 'machine-suspend');
  }
  return machine?.status === 'suspended' && hostHasFeature(server, 'machine-resume-suspended');
};

/**
 * What the host's row and the machine's own row allow of the machine's
 * actions, the one rule the Controls menu and the machines list share:
 * `utm` while the machine's hypervisor is UTM, which has no reset, no
 * pause apart from its suspend and no guest reboot; `pause` on a
 * VirtualBox host; `suspend` while the host lists `machine-suspend`;
 * `resume` by `hostResumes`, a paused machine behind `machine-suspend` and
 * a suspended one behind `machine-resume-suspended`; `guest` while the
 * guest can be reached from outside, through Guest Additions on
 * VirtualBox or through the guest agent on a bhyve host that lists
 * `guest-agent`.
 *
 * @param {Object} options - The host's row and the machine's row
 * @param {Object|null} options.server - The registry row, or the one serving agent's
 * @param {Object|null} options.machine - The machine's own row
 * @returns {{ utm: boolean, pause: boolean, suspend: boolean, resume: boolean, guest: boolean }} The gates
 */
export const gatesOf = ({ server, machine }) => {
  const utm = machine?.hypervisor === 'utm';
  const virtualbox = hostHasHypervisor(server, 'virtualbox');
  return {
    utm,
    pause: virtualbox && !utm,
    suspend: hostHasFeature(server, 'machine-suspend'),
    resume: hostResumes(server, machine),
    guest:
      virtualbox || (hostHasHypervisor(server, 'bhyve') && hostHasFeature(server, 'guest-agent')),
  };
};
