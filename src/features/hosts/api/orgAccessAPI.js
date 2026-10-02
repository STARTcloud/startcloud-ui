import { client, session } from '../../../lib/runtime';

const serverPath = serverId => `/api/servers/${encodeURIComponent(serverId)}`;

const machineOrgsPath = (serverId, name) =>
  `${serverPath(serverId)}/machines/${encodeURIComponent(name)}/orgs`;

/**
 * The organizations that own a registered agent,
 * `GET /api/servers/{id}/orgs` on the `hyperweaver-server` role.
 *
 * @param {string|number} serverId - The registry id
 * @returns {Promise<Object>} `{ success, orgs }`
 */
export const getServerOrgs = serverId => client.get(`${serverPath(serverId)}/orgs`);

/**
 * Replace an agent's owning organizations, `PUT /api/servers/{id}/orgs`
 * with `{ orgs }`, the uuids; an empty list opens the agent to every
 * signed-in person.
 *
 * @param {string|number} serverId - The registry id
 * @param {Array<string>} orgs - The organization uuids
 * @returns {Promise<Object>} `{ success, orgs }`
 */
export const setServerOrgs = (serverId, orgs) =>
  client.put(`${serverPath(serverId)}/orgs`, { orgs });

/**
 * The organizations a machine belongs to,
 * `GET /api/servers/{id}/machines/{name}/orgs`.
 *
 * @param {string|number} serverId - The registry id
 * @param {string} name - The machine name
 * @returns {Promise<Object>} `{ success, orgs }`
 */
export const getMachineOrgs = (serverId, name) => client.get(machineOrgsPath(serverId, name));

/**
 * Replace a machine's organizations,
 * `PUT /api/servers/{id}/machines/{name}/orgs` with `{ orgs }`.
 *
 * @param {string|number} serverId - The registry id
 * @param {string} name - The machine name
 * @param {Array<string>} orgs - The organization uuids
 * @returns {Promise<Object>} `{ success, orgs }`
 */
export const setMachineOrgs = (serverId, name, orgs) =>
  client.put(machineOrgsPath(serverId, name), { orgs });

const localOrgsOf = answer =>
  answer.status === 'fulfilled' && answer.value?.success
    ? (answer.value.organizations || [])
        .filter(org => org.org_uuid)
        .map(org => ({ uuid: org.org_uuid, name: org.name || null, roles: [], primary: false }))
    : [];

const claimedOrgsOf = answer =>
  answer.status === 'fulfilled'
    ? (answer.value?.organizations || [])
        .filter(org => org?.uuid)
        .map(org => ({
          uuid: org.uuid,
          name: org.name || null,
          roles: Array.isArray(org.roles) ? org.roles : [],
          primary: Boolean(org.primary),
        }))
    : [];

/**
 * Every organization the person can assign, merged from the server's own
 * table, `GET /api/organizations`, and the person's own memberships,
 * the session's one copy of `GET /api/userinfo/claims`; a refusal of
 * either narrows the list and assignment by a typed uuid stays possible.
 *
 * @returns {Promise<Array<{ uuid: string, name: string|null, roles: Array<string>, primary: boolean }>>} The organizations, by name
 */
export const getKnownOrgs = async () => {
  const [local, claims] = await Promise.allSettled([
    client.get('/api/organizations'),
    session.claims(),
  ]);
  const byUuid = new Map();
  localOrgsOf(local).forEach(org => byUuid.set(org.uuid, org));
  claimedOrgsOf(claims).forEach(org =>
    byUuid.set(org.uuid, { ...org, name: org.name || byUuid.get(org.uuid)?.name || null })
  );
  return [...byUuid.values()].sort((a, b) => (a.name || a.uuid).localeCompare(b.name || b.uuid));
};

/**
 * The organizations the person manages, those whose membership carries an
 * owner or admin role.
 *
 * @param {Array<{ roles: Array<string> }>} orgs - The organizations of `getKnownOrgs`
 * @returns {Array<Object>} The managed ones
 */
export const managerOrgsOf = orgs =>
  orgs.filter(org => org.roles.includes('OWNER') || org.roles.includes('ADMIN'));
