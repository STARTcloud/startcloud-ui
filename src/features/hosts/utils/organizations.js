import { hasFeatureStrict } from '../../../utils/capabilities';

import { isServerRole } from './hosts';

/**
 * Whether the host behind `status` narrows its hosts and machines by the
 * organization a person operates under: the `hyperweaver-server` role
 * while it lists `hosts`, the one role that holds the organization layer,
 * an agent served directly holding none. On such a host the switcher
 * carries All organizations, the empty choice, and the choice is a view
 * over what the server already answered, never a boundary, the server
 * deciding access on every request by every organization of the person.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @returns {boolean} True on the server role that lists `hosts`
 */
export const filtersByOrganization = status =>
  isServerRole(status) && hasFeatureStrict(status, 'hosts');

/**
 * Whether a registry row or a machine row shows under the chosen
 * organization, failing open: every row shows while the choice is All,
 * the empty uuid, a row that carries no `org_uuids` list shows, a row
 * whose list is empty, unassigned and open to everyone, shows, and any
 * other row shows while its list names the chosen uuid.
 *
 * @param {Object|null} row - The row, its `org_uuids` the organizations that own it
 * @param {string} organization - The chosen organization's uuid, empty for All
 * @returns {boolean} True when the row shows
 */
export const visibleUnder = (row, organization) =>
  !organization ||
  !Array.isArray(row?.org_uuids) ||
  row.org_uuids.length === 0 ||
  row.org_uuids.includes(organization);

/**
 * The rows that show under the chosen organization, the list itself
 * while the choice is All, so a caller holding the list by identity holds
 * the same one.
 *
 * @param {Array<Object>} rows - Registry rows or machine rows
 * @param {string} organization - The chosen organization's uuid, empty for All
 * @returns {Array<Object>} The rows that show
 */
export const visibleRows = (rows, organization) =>
  organization ? rows.filter(row => visibleUnder(row, organization)) : rows;

/**
 * A host's stats with `allmachines`, the names every list of machines is
 * drawn from, narrowed to the machines that show under the chosen
 * organization: a name is judged by the machine row of that name, and a
 * name no row carries shows. The stats themselves while the choice is
 * All or the agent answered none. `runningmachines` is left whole, because
 * it is asked by name for the state of one machine and a machine outside
 * the choice is still running.
 *
 * @param {Object|null} stats - The host's stats
 * @param {Array<Object>} machines - The host's machine rows
 * @param {string} organization - The chosen organization's uuid, empty for All
 * @returns {Object|null} The stats a list draws from
 */
export const visibleStats = (stats, machines, organization) => {
  if (!organization || !Array.isArray(stats?.allmachines)) {
    return stats;
  }
  const rows = new Map(machines.map(row => [row.name, row]));
  return {
    ...stats,
    allmachines: stats.allmachines.filter(name =>
      visibleUnder(rows.get(name) || null, organization)
    ),
  };
};
