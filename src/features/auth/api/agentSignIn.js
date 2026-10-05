import { client } from '../../../lib/runtime';

const PUBLIC = { auth: false };

/**
 * Where a device-flow sign-in stands, `GET /api/auth/oidc/device-status`
 * with the `handle`, answered `{ status }`, `pending`, `denied`, `failed`
 * or `expired`, or `{ status: "approved", api_key, entity_id, name, role,
 * message }` once, a 404 for a handle already delivered.
 *
 * @param {string} handle - The grant's handle
 * @returns {Promise<Object>} The answer
 */
export const deviceSsoStatus = handle =>
  client.get('/api/auth/oidc/device-status', { ...PUBLIC, params: { handle } });

/**
 * Hand the agent the code a person pasted from the identity provider's
 * code page, `POST /api/auth/oidc/code` with the flow's `handle` and the
 * `code`, as `code#state` when the page showed the state beside it,
 * answered `{ status }`; the approved key is read with `deviceSsoStatus`.
 *
 * @param {string} handle - The flow's handle
 * @param {string} code - The pasted code, with or without `#state`
 * @returns {Promise<Object>} The answer
 */
export const codeSsoExchange = (handle, code) =>
  client.post('/api/auth/oidc/code', { handle, code }, PUBLIC);

/**
 * Generate the host's first API key on first boot,
 * `POST /api/api-keys/bootstrap` with hyperweaver-ui's name and
 * description and the `setup_token` the agent reads, answered
 * `{ api_key, message, note }`.
 *
 * @param {string} setupToken - The setup token
 * @returns {Promise<Object>} The answer
 */
export const bootstrapFirstKey = setupToken =>
  client.post(
    '/api/api-keys/bootstrap',
    {
      name: 'Direct-Login',
      description: 'Generated from the Hyperweaver UI first-boot screen',
      setup_token: setupToken,
    },
    PUBLIC
  );
