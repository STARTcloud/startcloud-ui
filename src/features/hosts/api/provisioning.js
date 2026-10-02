import { client } from '../../../lib/runtime';
import { agentPath } from '../utils/hosts';

const machinePath = (status, id, name, verb = '') =>
  agentPath(status, id, `machines/${encodeURIComponent(name)}${verb}`);

const provisionerPath = (name, version = '') =>
  `provisioning/provisioners/${encodeURIComponent(name)}${
    version ? `/versions/${encodeURIComponent(version)}` : ''
  }`;

/**
 * Every provisioner family with its versions, newest first,
 * `GET provisioning/provisioners`, asked for only of a host that lists
 * `provisioner-registry`.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @returns {Promise<Object>} `{ provisioners, total }`
 */
export const fetchProvisioners = (status, id) =>
  client.get(agentPath(status, id, 'provisioning/provisioners'));

/**
 * One provisioner version's full manifest,
 * `GET provisioning/provisioners/{name}/versions/{version}`: its
 * `metadata.roles`, `metadata.configuration`, the field DSL, its
 * `role_specs` and its `playbook_candidates`.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {string} name - The family name
 * @param {string} version - The version
 * @returns {Promise<Object>} The version
 */
export const fetchProvisionerVersion = (status, id, name, version) =>
  client.get(agentPath(status, id, provisionerPath(name, version)));

/**
 * Queue a provisioner import, `POST provisioning/provisioners/import`,
 * the body `{ source_type, path?, url?, branch?, token_name? }`.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {Object} body - The import
 * @returns {Promise<Object>} The queued task
 */
export const importProvisioner = (status, id, body) =>
  client.post(agentPath(status, id, 'provisioning/provisioners/import'), body);

/**
 * Delete a whole provisioner family, `DELETE provisioning/provisioners/{name}`,
 * refused with 409 and `machines` while a machine references it.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {string} name - The family name
 * @returns {Promise<Object>} The agent's answer
 */
export const deleteProvisioner = (status, id, name) =>
  client.delete(agentPath(status, id, provisionerPath(name)));

/**
 * Delete one provisioner version,
 * `DELETE provisioning/provisioners/{name}/versions/{version}`.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {string} name - The family name
 * @param {string} version - The version
 * @returns {Promise<Object>} The agent's answer
 */
export const deleteProvisionerVersion = (status, id, name, version) =>
  client.delete(agentPath(status, id, provisionerPath(name, version)));

/**
 * The public provisioner catalog the agent relays, `GET provisioning/catalog`,
 * `source` naming a configured catalog source where given.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {string} [source] - The catalog source's name
 * @returns {Promise<Object>} The catalog
 */
export const fetchCatalog = (status, id, source = '') =>
  client.get(agentPath(status, id, 'provisioning/catalog'), {
    params: source ? { source } : {},
  });

/**
 * The agent's configured catalog sources, `GET provisioning/catalog/sources`.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @returns {Promise<Object>} `{ sources }`
 */
export const fetchCatalogSources = (status, id) =>
  client.get(agentPath(status, id, 'provisioning/catalog/sources'));

/**
 * Install a catalog version into the registry, `POST provisioning/catalog/install`,
 * the body `{ source_name?, name, version }`.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {Object} body - The install
 * @returns {Promise<Object>} The queued task
 */
export const installFromCatalog = (status, id, body) =>
  client.post(agentPath(status, id, 'provisioning/catalog/install'), body);

/**
 * Re-import a git-imported family from its stored source,
 * `POST provisioning/provisioners/{name}/refresh-from-source`.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {string} name - The family name
 * @returns {Promise<Object>} The queued task
 */
export const refreshProvisionerFromSource = (status, id, name) =>
  client.post(agentPath(status, id, `${provisionerPath(name)}/refresh-from-source`));

/**
 * The whole stored document of a machine as YAML,
 * `GET machines/{name}/hosts-yml`, `{ machine_name, yaml }` on both agents.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {string} name - The machine name
 * @returns {Promise<Object>} `{ machine_name, yaml }`
 */
export const fetchHostsYml = (status, id, name) =>
  client.get(machinePath(status, id, name, '/hosts-yml'));

/**
 * Replace the whole stored document from YAML,
 * `PUT machines/{name}/hosts-yml` with `yaml`, answered `{ warnings }`,
 * or refused 400 with `error` and, for a parse error, `line` and `column`.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {string} name - The machine name
 * @param {string} yaml - The document as YAML
 * @returns {Promise<Object>} `{ warnings }`
 */
export const saveHostsYml = (status, id, name, yaml) =>
  client.put(machinePath(status, id, name, '/hosts-yml'), { yaml });

/**
 * The zlogin recipes of a bhyve host, `GET provisioning/recipes`, narrowed
 * by `os_family` and `brand` where given.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {Object} [filters] - `os_family` and `brand`
 * @returns {Promise<Object>} The recipes
 */
export const fetchRecipes = (status, id, filters = {}) =>
  client.get(agentPath(status, id, 'provisioning/recipes'), { params: filters });

export const createRecipe = (status, id, body) =>
  client.post(agentPath(status, id, 'provisioning/recipes'), body);

export const updateRecipe = (status, id, recipeId, body) =>
  client.put(agentPath(status, id, `provisioning/recipes/${encodeURIComponent(recipeId)}`), body);

export const deleteRecipe = (status, id, recipeId) =>
  client.delete(agentPath(status, id, `provisioning/recipes/${encodeURIComponent(recipeId)}`));

/**
 * Test a recipe, `POST provisioning/recipes/{id}/test`, the body
 * `{ machine_name, variables?, dry_run? }`.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {string} recipeId - The recipe's id
 * @param {Object} body - The test
 * @returns {Promise<Object>} The agent's answer
 */
export const testRecipe = (status, id, recipeId, body) =>
  client.post(
    agentPath(status, id, `provisioning/recipes/${encodeURIComponent(recipeId)}/test`),
    body
  );

/**
 * The global secrets document, `GET secrets`.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @returns {Promise<Object>} The secrets
 */
export const fetchSecrets = (status, id) => client.get(agentPath(status, id, 'secrets'));

/**
 * Replace the submitted secrets categories, `PUT secrets`.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {Object} categories - The categories
 * @returns {Promise<Object>} The agent's answer
 */
export const saveSecrets = (status, id, categories) =>
  client.put(agentPath(status, id, 'secrets'), categories);

/**
 * Create a machine from a provisioner spec, `POST machines`.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {Object} body - The spec with its `name`
 * @returns {Promise<Object>} The queued task
 */
export const createMachine = (status, id, body) =>
  client.post(agentPath(status, id, 'machines'), body);

/**
 * Store a machine's provisioner document verbatim, `PUT machines/{name}`
 * with `provisioner`, the Hosts.yml host entry, kept at once with no
 * task on both agents.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {string} name - The machine name
 * @param {Object} document - The document
 * @returns {Promise<Object>} `{ success, machine_name, operation, status, message, requires_restart }`
 */
export const saveProvisionerDocument = (status, id, name, document) =>
  client.put(machinePath(status, id, name), { provisioner: document });

/**
 * Modify a machine's infrastructure, `PUT machines/{name}` with the
 * changed fields alone.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {string} name - The machine name
 * @param {Object} changes - The changed fields
 * @returns {Promise<Object>} The queued task or the immediate answer
 */
export const modifyInfrastructure = (status, id, name, changes) =>
  client.put(machinePath(status, id, name), changes);

/**
 * Start the provisioning pipeline against the stored document,
 * `POST machines/{name}/provision`, `options` carrying `skip_boot` and
 * `confirm_host_hooks` where given; answered `{ success, message,
 * machine_name, parent_task_id, steps, task_chain }`, or refused 409
 * with `needs_confirmation` and `reason` while the document carries
 * host hooks not yet confirmed.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {string} name - The machine name
 * @param {Object} [options] - `skip_boot` and `confirm_host_hooks`
 * @returns {Promise<Object>} The queued chain
 */
export const provisionMachine = (status, id, name, options = {}) =>
  client.post(machinePath(status, id, name, '/provision'), options);

/**
 * Sync the stored document's folders to the machine,
 * `POST machines/{name}/sync`, `syncback` true pulling the flagged
 * folders back instead; answered `{ parent_task_id, folder_count }`.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {string} name - The machine name
 * @param {boolean} [syncback] - Whether to pull the flagged folders back
 * @returns {Promise<Object>} The queued chain
 */
export const syncMachine = (status, id, name, syncback = false) =>
  client.post(machinePath(status, id, name, '/sync'), syncback ? { syncback: true } : {});

/**
 * Run the stored document's provisioners ad hoc,
 * `POST machines/{name}/run-provisioners`; answered `{ parent_task_id,
 * playbook_count, playbooks_skipped, task_chain }`, or a 200 no-op
 * carrying `playbooks_skipped` and no task while every entry was skipped.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {string} name - The machine name
 * @returns {Promise<Object>} The queued chain
 */
export const runProvisioners = (status, id, name) =>
  client.post(machinePath(status, id, name, '/run-provisioners'));

/**
 * The provisioning pipeline's state, `GET machines/{name}/provision/status`:
 * `provisioning_configured`, `provisioning_status` (`provisioned` or
 * `not_started`), `last_provisioned_at` and `recent_tasks`.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {string} name - The machine name
 * @returns {Promise<Object>} The state
 */
export const fetchProvisionStatus = (status, id, name) =>
  client.get(machinePath(status, id, name, '/provision/status'));

/**
 * The next free server id, `GET machines/ids/next`.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @returns {Promise<Object>} The agent's answer
 */
export const fetchNextServerId = (status, id) =>
  client.get(agentPath(status, id, 'machines/ids/next'));

/**
 * The local template registry, `GET templates`.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @returns {Promise<Object>} `{ templates, total }`
 */
export const fetchTemplates = (status, id) => client.get(agentPath(status, id, 'templates'));

export const pullTemplate = (status, id, body) =>
  client.post(agentPath(status, id, 'templates/pull'), body);

export const deleteTemplate = (status, id, templateId) =>
  client.delete(agentPath(status, id, `templates/${encodeURIComponent(templateId)}`));

export const moveTemplate = (status, id, templateId, targetPath) =>
  client.post(agentPath(status, id, `templates/${encodeURIComponent(templateId)}/move`), {
    target_path: targetPath,
  });

/**
 * The remote catalog of a template source, `GET templates/remote/{source}`.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {string} source - The source's name
 * @returns {Promise<Object>} The agent's answer
 */
export const fetchRemoteTemplates = (status, id, source) =>
  client.get(agentPath(status, id, `templates/remote/${encodeURIComponent(source)}`));

export const fetchArtifactStoragePaths = (status, id) =>
  client.get(agentPath(status, id, 'artifacts/storage/paths'));

export const createArtifactStoragePath = (status, id, body) =>
  client.post(agentPath(status, id, 'artifacts/storage/paths'), body);

export const updateArtifactStoragePath = (status, id, pathId, body) =>
  client.put(agentPath(status, id, `artifacts/storage/paths/${encodeURIComponent(pathId)}`), body);

export const deleteArtifactStoragePath = (status, id, pathId, body) =>
  client.request({
    method: 'DELETE',
    path: agentPath(status, id, `artifacts/storage/paths/${encodeURIComponent(pathId)}`),
    body,
  });

/**
 * The artifact registry, `GET artifacts`, narrowed by `filters`, asked
 * for only of a host that lists `artifacts`.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {Object} [filters] - `type`, `storage_path_id`, `role`, `search`, `limit`, `offset`, `sort_by`, `sort_order`
 * @returns {Promise<Object>} `{ artifacts, pagination }`
 */
export const fetchArtifacts = (status, id, filters = {}) =>
  client.get(agentPath(status, id, 'artifacts'), { params: filters });

export const fetchIsoArtifacts = (status, id) => client.get(agentPath(status, id, 'artifacts/iso'));

export const fetchImageArtifacts = (status, id) =>
  client.get(agentPath(status, id, 'artifacts/image'));

export const fetchArtifactStats = (status, id) =>
  client.get(agentPath(status, id, 'artifacts/stats'));

export const moveArtifact = (status, id, artifactId, destinationId) =>
  client.post(agentPath(status, id, `artifacts/${encodeURIComponent(artifactId)}/move`), {
    destination_storage_location_id: destinationId,
  });

export const copyArtifact = (status, id, artifactId, destinationId) =>
  client.post(agentPath(status, id, `artifacts/${encodeURIComponent(artifactId)}/copy`), {
    destination_storage_location_id: destinationId,
  });

export const scanArtifacts = (status, id, body) =>
  client.post(agentPath(status, id, 'artifacts/scan'), body);

export const downloadArtifact = (status, id, body) =>
  client.post(agentPath(status, id, 'artifacts/download'), body);

export const hclDownloadArtifact = (status, id, body) =>
  client.post(agentPath(status, id, 'artifacts/hcl-download'), body);

export const prepareArtifactUpload = (status, id, body) =>
  client.post(agentPath(status, id, 'artifacts/upload/prepare'), body);

/**
 * The bytes of a prepared upload, `POST artifacts/upload/{taskId}` as
 * the multipart part `file`, the progress reported as the bytes go up.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {string} taskId - The prepared upload's task
 * @param {File} file - The file
 * @param {Function} [onUploadProgress] - axios's progress handler
 * @returns {Promise<Object>} The agent's answer
 */
export const uploadArtifactFile = (status, id, taskId, file, onUploadProgress = undefined) => {
  const form = new FormData();
  form.append('file', file);
  return client.request({
    method: 'POST',
    path: agentPath(status, id, `artifacts/upload/${encodeURIComponent(taskId)}`),
    body: form,
    contentType: 'multipart',
    onUploadProgress,
  });
};

export const registerArtifact = (status, id, body) =>
  client.post(agentPath(status, id, 'artifacts/register'), body);

export const deleteArtifacts = (status, id, body) =>
  client.request({ method: 'DELETE', path: agentPath(status, id, 'artifacts/files'), body });

/**
 * Free addresses of the host's own network, `GET network/ip-suggestions`
 * with `count`, advisory only.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {number} [count] - How many
 * @returns {Promise<Object>} `{ interface, subnet, gateway, used, suggestions, total_used }`
 */
export const fetchIpSuggestions = (status, id, count = 20) =>
  client.get(agentPath(status, id, 'network/ip-suggestions'), { params: { count } });

export const fetchMediaList = (status, id) => client.get(agentPath(status, id, 'media'));

export const fetchBridgedInterfaces = (status, id) =>
  client.get(agentPath(status, id, 'provisioning/bridged-interfaces'));

export const fetchProvisioningNetworkStatus = (status, id) =>
  client.get(agentPath(status, id, 'provisioning/network/status'));

export const setupProvisioningNetwork = (status, id) =>
  client.post(agentPath(status, id, 'provisioning/network/setup'));

export const teardownProvisioningNetwork = (status, id) =>
  client.delete(agentPath(status, id, 'provisioning/network/teardown'));

export const checkAgentUpdate = (status, id) =>
  client.get(agentPath(status, id, 'app/updates/check'));

export const applyAgentUpdate = (status, id) =>
  client.post(agentPath(status, id, 'app/updates/apply'));
