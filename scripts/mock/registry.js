import { randomBytes } from 'crypto';

import { REGISTRY, registerHost, setAllowInsecure, unregisterHost } from './fleet.js';
import { missing, ok, refusal } from './kit.js';

const keys = new Map(
  REGISTRY.map(row => [String(row.id), `hws_${randomBytes(10).toString('hex')}`])
);

/**
 * The API key the server holds for one registered agent, the row
 * `GET /api/servers?includeApiKeys=true` carries.
 *
 * @param {string|number} id - The registry id
 * @returns {string} The key
 */
export const serverKeyOf = id => keys.get(String(id)) || '';

const nextId = () => Math.max(0, ...REGISTRY.map(row => Number(row.id))) + 1;

const addServer = ctx => {
  const { hostname, port, protocol, entityName, allowInsecure } = ctx.body;
  if (!hostname || !port || !protocol) {
    return refusal(400, 'hostname, port and protocol are required');
  }
  if (REGISTRY.some(row => row.hostname === hostname && Number(row.port) === Number(port))) {
    return refusal(409, `${hostname}:${port} is already registered`);
  }
  const id = nextId();
  registerHost({
    id,
    hostname,
    port: Number(port),
    protocol,
    entityName: entityName || '',
    allowInsecure: Boolean(allowInsecure),
  });
  keys.set(String(id), ctx.body.apiKey || `hws_${randomBytes(10).toString('hex')}`);
  return ok({ success: true, message: `${hostname} registered`, id }, 201);
};

const testServer = ctx => {
  const { hostname } = ctx.body;
  if (String(hostname || '').includes('unreachable')) {
    return ok({ success: false, message: `${hostname} did not answer` });
  }
  return ok({
    success: true,
    message: `${hostname} answered`,
    serverInfo: { hostname, agent: 'hyperweaver-agent', version: '1.2.0' },
  });
};

const patchServer = ctx => {
  const row = REGISTRY.find(entry => String(entry.id) === ctx.params.id);
  if (!row) {
    return missing('No such server');
  }
  setAllowInsecure(row.id, Boolean(ctx.body.allowInsecure));
  return ok({ success: true, message: `${row.hostname} updated` });
};

const removeServer = ctx => {
  const row = REGISTRY.find(entry => String(entry.id) === ctx.params.id);
  if (!row) {
    return missing('No such server');
  }
  unregisterHost(row.id);
  keys.delete(String(row.id));
  return ok({ success: true, message: `${row.hostname} removed` });
};

/**
 * The registry's writes on the server role, the hosts page's registry
 * panel: an agent registered with a key of its own, tested, refused while
 * its hostname says `unreachable`, its self-signed switch and its removal.
 *
 * @param {Object} router - `sessionRoute` and `adminRoute`
 * @returns {void}
 */
export const mountRegistry = ({ sessionRoute, adminRoute }) => {
  adminRoute('POST', '/api/servers', addServer);
  sessionRoute('POST', '/api/servers/test', testServer);
  adminRoute('PATCH', '/api/servers/:id', patchServer);
  adminRoute('DELETE', '/api/servers/:id', removeServer);
};
