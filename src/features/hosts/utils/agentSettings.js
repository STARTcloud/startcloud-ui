import { SECRET_KINDS } from '../../certs/utils/records';

const listOf = value => (Array.isArray(value) ? value : []);

export { SECRET_KINDS };

/**
 * Whether a host's own row offers the agent's own pages, API keys,
 * Database and Update: offered to a row that names any hypervisor,
 * because every agent that serves a hypervisor serves its own API keys
 * and update check.
 *
 * @param {Object|null} server - The registry row, or the one serving agent's
 * @returns {boolean} True when the page is offered
 */
export const hostHasSettings = server => listOf(server?.capabilities?.hypervisors).length > 0;

/**
 * The API key rows of the agent's answer, `entities`.
 *
 * @param {Object|null} answer - The answer of `GET api-keys`
 * @returns {Array<Object>} The rows
 */
export const apiKeysOf = answer => listOf(answer?.entities);

const PICK_KINDS = {
  certificate: ['certificate', 'authority'],
  key: ['key', 'ssh_certificate'],
};

/**
 * The store kinds a `secret` field's pick admits: a `certificate` field
 * the certificate and authority rows, a `key` field the key and SSH
 * certificate rows, a secret kind its own rows, and no kind every secret
 * kind.
 *
 * @param {string} kind - The field's kind, empty for every secret kind
 * @returns {Array<string>} The kinds
 */
export const pickKindsOf = kind => {
  if (!kind) {
    return SECRET_KINDS;
  }
  return PICK_KINDS[kind] || [kind];
};

/**
 * The rows of a host store's answer a `secret` pick admits: the rows of
 * the kinds `pickKindsOf` names for `kind` and, where `profile` is given,
 * the ones that name that profile or none.
 *
 * @param {Array<Object>|null} answer - The answer of `GET certs`
 * @param {string} [kind] - The kind wanted, empty for every secret kind
 * @param {string} [profile] - The profile wanted, empty for every row
 * @returns {Array<Object>} The rows
 */
export const secretRowsOf = (answer, kind = '', profile = '') => {
  const kinds = pickKindsOf(kind);
  return listOf(answer).filter(row => {
    if (!row || !kinds.includes(row.kind)) {
      return false;
    }
    const own = row.profile || row.record?.profile || '';
    return !profile || !own || own === profile;
  });
};
