const listOf = value => (Array.isArray(value) ? value : []);

/**
 * Whether a host's own row offers the Agent settings page: hyperweaver-ui
 * drew its door behind no token, so the page is gated by the hypervisor
 * instead, offered to a row that names any hypervisor, because every
 * agent that serves a hypervisor serves its own API keys and update
 * check.
 *
 * @param {Object|null} server - The registry row, or the one serving agent's
 * @returns {boolean} True when the page is offered
 */
export const hostHasSettings = server => listOf(server?.capabilities?.hypervisors).length > 0;

/**
 * The update the check offers, hyperweaver-ui's gate: the current and
 * the latest version while the answer says `update_available`, null
 * otherwise, so an agent that is current or without the surface draws
 * no button.
 *
 * @param {Object|null} answer - The answer of `GET app/updates/check`
 * @returns {{ current: string, latest: string }|null} The update
 */
export const updateOf = answer =>
  answer?.update_available
    ? { current: String(answer.current_version ?? ''), latest: String(answer.latest_version ?? '') }
    : null;

/**
 * The API key rows of the agent's answer, `entities`.
 *
 * @param {Object|null} answer - The answer of `GET api-keys`
 * @returns {Array<Object>} The rows
 */
export const apiKeysOf = answer => listOf(answer?.entities);

/**
 * The six secret categories, hyperweaver-ui's wire shapes: the key of
 * each, the key of its label and its fields, a `checkbox` field a
 * switch and a `multiline` field a textarea.
 */
export const SECRET_CATEGORIES = [
  {
    key: 'hcl_download_portal_api_keys',
    labelKey: 'agentSettings.agentSecretsTab.hclCategoryLabel',
    fields: [
      { key: 'name', labelKey: 'agentSettings.agentSecretsTab.nameFieldLabel' },
      { key: 'key', labelKey: 'agentSettings.agentSecretsTab.keyFieldLabel' },
    ],
  },
  {
    key: 'git_api_keys',
    labelKey: 'agentSettings.agentSecretsTab.gitCategoryLabel',
    fields: [
      { key: 'name', labelKey: 'agentSettings.agentSecretsTab.nameFieldLabel' },
      { key: 'key', labelKey: 'agentSettings.agentSecretsTab.keyFieldLabel' },
    ],
  },
  {
    key: 'vagrant_atlas_token',
    labelKey: 'agentSettings.agentSecretsTab.vagrantCategoryLabel',
    fields: [
      { key: 'name', labelKey: 'agentSettings.agentSecretsTab.nameFieldLabel' },
      { key: 'key', labelKey: 'agentSettings.agentSecretsTab.tokenFieldLabel' },
    ],
  },
  {
    key: 'custom_resource_url',
    labelKey: 'agentSettings.agentSecretsTab.customResourceCategoryLabel',
    fields: [
      { key: 'name', labelKey: 'agentSettings.agentSecretsTab.nameFieldLabel' },
      { key: 'url', labelKey: 'agentSettings.agentSecretsTab.urlFieldLabel' },
      {
        key: 'useAuth',
        labelKey: 'agentSettings.agentSecretsTab.httpBasicAuthFieldLabel',
        type: 'checkbox',
      },
      { key: 'user', labelKey: 'agentSettings.agentSecretsTab.userFieldLabel' },
      { key: 'pass', labelKey: 'agentSettings.agentSecretsTab.passwordFieldLabel' },
    ],
  },
  {
    key: 'docker_hub',
    labelKey: 'agentSettings.agentSecretsTab.dockerHubCategoryLabel',
    fields: [
      { key: 'name', labelKey: 'agentSettings.agentSecretsTab.nameFieldLabel' },
      { key: 'docker_hub_user', labelKey: 'agentSettings.agentSecretsTab.userFieldLabel' },
      { key: 'docker_hub_token', labelKey: 'agentSettings.agentSecretsTab.tokenFieldLabel' },
    ],
  },
  {
    key: 'ssh_keys',
    labelKey: 'agentSettings.agentSecretsTab.sshKeysCategoryLabel',
    fields: [
      { key: 'name', labelKey: 'agentSettings.agentSecretsTab.nameFieldLabel' },
      {
        key: 'key',
        labelKey: 'agentSettings.agentSecretsTab.privateKeyFieldLabel',
        multiline: true,
      },
    ],
  },
];

/**
 * An empty entry of one category, every field blank and every switch
 * off.
 *
 * @param {Object} category - An entry of `SECRET_CATEGORIES`
 * @returns {Object} The entry
 */
export const emptySecretEntry = category =>
  Object.fromEntries(
    category.fields.map(field => [field.key, field.type === 'checkbox' ? false : ''])
  );

/**
 * The entries of one category as the document answers them, none for a
 * category the document does not list.
 *
 * @param {Object|null} document - The answer of `GET secrets`
 * @param {string} categoryKey - The category's key
 * @returns {Array<Object>} The entries
 */
export const secretEntriesOf = (document, categoryKey) => listOf(document?.[categoryKey]);

/**
 * The entries a category is saved with, hyperweaver-ui's rule: the ones
 * that carry a name.
 *
 * @param {Array<Object>} entries - The edited entries
 * @returns {Array<Object>} The entries to send
 */
export const savedSecretEntries = entries => listOf(entries).filter(entry => entry.name);
