import { featuresOf } from './fleet.js';
import { ok, problem, refusal } from './kit.js';
import { queue } from './tasks.js';

const DEFAULT_GRACE = 60;
const DISABLED = 'Host power management is disabled in configuration';
const ZONE_WORDS = {
  restart: grace => `Host restart scheduled in ${grace} seconds`,
  shutdown: grace => `Host shutdown scheduled in ${grace} seconds`,
  poweroff: grace => `Host poweroff scheduled in ${grace} seconds`,
  halt: () => 'EMERGENCY: Host halt task created - system will halt immediately',
  reboot_fast: () => 'Host fast reboot task created - system will fast reboot immediately',
};

const graceOf = ({ body, verb, zone }) => {
  if (zone && (verb === 'halt' || verb === 'reboot_fast')) {
    return 0;
  }
  return Number.isFinite(body.grace_period) ? body.grace_period : DEFAULT_GRACE;
};

const zoneAnswer = ({ task, verb, grace, body }) => ({
  success: true,
  message: ZONE_WORDS[verb](grace),
  task_id: task.id,
  status: 'pending',
  created_at: task.created_at,
  warnings: [],
  grace_period: grace,
  ...(body.boot_environment ? { boot_environment: body.boot_environment } : {}),
});

const agentAnswer = ({ task, verb, grace }) => ({
  success: true,
  message: `${verb} task created successfully`,
  task_id: task.id,
  status: 'pending',
  created_at: task.created_at,
  grace_period: grace,
});

const hostPower = verb => ctx => {
  const { host, person, body } = ctx;
  const zone = host.kind === 'zoneweaver';
  if (!featuresOf(host).includes('host-power')) {
    return refusal(503, DISABLED);
  }
  const grace = graceOf({ body, verb, zone });
  const task = queue({
    host,
    by: person.username,
    operation: `system_host_${verb}`,
    target: 'system',
    priority: zone ? 80 : 100,
    metadata: { grace_period: grace, message: body.message || '' },
  });
  const answer = zone ? zoneAnswer : agentAnswer;
  return ok(answer({ task, verb, grace, body }), 202);
};

const fastReboot = ctx => {
  if (ctx.host.kind !== 'zoneweaver') {
    return problem(404, 'Not Found');
  }
  return hostPower('reboot_fast')(ctx);
};

/**
 * The host power routes, each a queued task on the target `system` that
 * writes its lines and leaves the host up: the zoneweaver kind answers
 * 202 with its scheduled words and knows the fast reboot, the hyperweaver
 * kind answers 202 with `<verb> task created successfully`, has no fast
 * reboot and answers 503 on a host that lists no `host-power`.
 *
 * @param {Function} agentRoute - The router's `agentRoute`
 * @returns {void}
 */
export const mountPower = agentRoute => {
  agentRoute('POST', 'system/host/restart', hostPower('restart'));
  agentRoute('POST', 'system/host/shutdown', hostPower('shutdown'));
  agentRoute('POST', 'system/host/poweroff', hostPower('poweroff'));
  agentRoute('POST', 'system/host/halt', hostPower('halt'));
  agentRoute('POST', 'system/host/reboot/fast', fastReboot);
};
