import { hostConfig } from '../api/agentSettings';

const EMPTY_NAMES = [];

/**
 * The names of a host's configuration files, the registry row's
 * `capabilities.config`, empty while the row carries none.
 *
 * @param {Object|null} server - The registry row, or the one serving agent's
 * @returns {Array<string>} The names
 */
export const configNamesOf = server =>
  Array.isArray(server?.capabilities?.config) ? server.capabilities.config : EMPTY_NAMES;

/**
 * The route of one configuration file of a host, the per-host mount of
 * the shared configuration engine.
 *
 * @param {string|number} id - The registry id, or `self` on an agent role
 * @param {string} name - The file's name
 * @returns {string} The route
 */
export const configPath = (id, name) =>
  `/hosts/${encodeURIComponent(id)}/settings/${encodeURIComponent(name)}`;

const titleOf = (config, name) =>
  config.schema(name).then(
    schema => schema?.title || name,
    () => name
  );

/**
 * The children of a host's Configuration node of the sidebar tree: one
 * node per name of the row's `capabilities.config`, in that order,
 * labelled by the file's schema root `title` once
 * `GET config/<name>/schema` answers through the host's adapter and by
 * the name until then, each a deep link to
 * `/hosts/{id}/settings/<name>`; none for a row without the list.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {Object} server - The registry row
 * @returns {Promise<Array<{ key: string, label: string, to: string }>>} The file nodes
 */
export const configNodes = (status, server) => {
  const names = configNamesOf(server);
  if (names.length === 0) {
    return Promise.resolve([]);
  }
  const config = hostConfig(status, server.id);
  return Promise.all(names.map(name => titleOf(config, name))).then(titles =>
    names.map((name, index) => ({
      key: `config:${server.id}:${name}`,
      label: titles[index],
      to: configPath(server.id, name),
    }))
  );
};
