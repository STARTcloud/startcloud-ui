import { hostHasFeature } from './capabilities';
import { configurationOf, machineRoute, provisionerOf } from './machines';
import { queuedTaskOf } from './machineTools';
import { canCreateMachines, canStartStopMachines } from './permissions';

export const VAR_NAME_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/u;

export const ROLE_NAME_PATTERN = /^[A-Za-z0-9_]+(?:\.[A-Za-z0-9_]+)*$/u;

export const PIPELINE_ACTIONS = ['provision', 'sync', 'syncback', 'run-provisioners'];

export const HOOK_CONFLICT = 409;

let uiIdSeq = 0;

const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);

/**
 * The route of a machine's Provisioning page, `run` naming the pipeline
 * action the page runs on arrival where the row that opens it asks for
 * one, hyperweaver-ui's `?run=` intent.
 *
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {string} name - The machine name
 * @param {string} [run] - `provision`, `sync`, `syncback` or `run-provisioners`
 * @returns {string} The path
 */
export const provisioningRoute = (id, name, run = '') =>
  `${machineRoute(id, name)}/provisioning${run ? `?run=${encodeURIComponent(run)}` : ''}`;

/**
 * The action a `run` search parameter names, empty for a word the
 * pipeline has no action of.
 *
 * @param {string|null} value - The parameter's value
 * @returns {string} The action, or the empty string
 */
export const requestedActionOf = value => (PIPELINE_ACTIONS.includes(value) ? String(value) : '');

/**
 * The provisioner document a machine's detail carries,
 * `configuration.provisioner`, the Hosts.yml host entry both agents
 * store; null for a machine without one.
 *
 * @param {Object|null} detail - The answer of `GET machines/{name}`
 * @returns {Object|null} The document
 */
export const provisionerDocumentOf = detail => {
  const document = configurationOf(detail).provisioner;
  return isObject(document) ? document : null;
};

/**
 * What the host's own row, the machine and the person's role allow of
 * the machine's provisioning, hyperweaver-ui's gates: `pipeline`, the
 * provisioning rows of the Controls menu and the tree, for a person who
 * may start and stop machines on a host that lists `provisioning`;
 * `rows`, the pipeline rows of the Controls menu, while the machine's
 * detail carries a provisioner document too, the truth
 * `provisioning_configured` reads; `reshape`, the document editor and
 * the Hosts.yml editor, for a person who may create machines on a host
 * that lists `machine-create`; `registry`, the reads of the package
 * registry the editor's catalog draws from, while the host lists
 * `provisioner-registry`.
 *
 * @param {Object} options - The host's row, the machine's detail and the role
 * @param {Object|null} options.server - The registry row, or the one serving agent's
 * @param {Object|null} [options.detail] - The answer of `GET machines/{name}`
 * @param {string} [options.role] - The person's role
 * @returns {{ pipeline: boolean, rows: boolean, reshape: boolean, registry: boolean }} The gates
 */
export const provisioningGates = ({ server, detail = null, role }) => {
  const pipeline = canStartStopMachines(role) && hostHasFeature(server, 'provisioning');
  return {
    pipeline,
    rows: pipeline && provisionerDocumentOf(detail) !== null,
    reshape: canCreateMachines(role) && hostHasFeature(server, 'machine-create'),
    registry: hostHasFeature(server, 'provisioner-registry'),
  };
};

/**
 * Whether Provision draws among a machine row's actions, hyperweaver-ui's
 * rule: for a person who may start and stop machines, on a host that
 * lists `provisioning`, for a row that names its provisioner.
 *
 * @param {Object} options - The host's row, the machine's row and the role
 * @param {Object|null} options.server - The registry row, or the one serving agent's
 * @param {Object|null} options.machine - The machine's own row
 * @param {string} [options.role] - The person's role
 * @returns {boolean} True when the row draws
 */
export const rowProvisions = ({ server, machine, role }) =>
  provisioningGates({ server, role }).pipeline && provisionerOf(machine) !== '';

/**
 * The first playbook group's `local` and `remote` lists, whichever
 * wrapping the document uses, an array of groups or one group.
 *
 * @param {Object|null} doc - The provisioner document
 * @returns {{ local: Array<Object>, remote: Array<Object> }} The lists
 */
export const playbookListsOf = doc => {
  const playbooks = doc?.provisioning?.ansible?.playbooks;
  const group = (Array.isArray(playbooks) ? playbooks[0] : playbooks) || {};
  return {
    local: Array.isArray(group.local) ? group.local : [],
    remote: Array.isArray(group.remote) ? group.remote : [],
  };
};

/**
 * The document with the first playbook group's lists written back in the
 * same wrapping, a list key written only while it has entries or already
 * existed, and later groups untouched.
 *
 * @param {Object} doc - The provisioner document
 * @param {{ local: Array<Object>, remote: Array<Object> }} lists - The lists
 * @returns {Object} The document
 */
export const withPlaybookLists = (doc, lists) => {
  const playbooks = doc?.provisioning?.ansible?.playbooks;
  const base = (Array.isArray(playbooks) ? playbooks[0] : playbooks) || {};
  const group = { ...base };
  ['local', 'remote'].forEach(key => {
    if (lists[key].length > 0 || Array.isArray(base[key])) {
      group[key] = lists[key];
    }
  });
  return {
    ...doc,
    provisioning: {
      ...(doc.provisioning || {}),
      ansible: {
        ...(doc.provisioning?.ansible || {}),
        playbooks: Array.isArray(playbooks) ? [group, ...playbooks.slice(1)] : group,
      },
    },
  };
};

/**
 * A row with an identity of its own for the editor's keys, `_ui_id`,
 * which `clean` strips before anything reaches the wire.
 *
 * @param {Object} row - The row
 * @returns {Object} The tagged row
 */
export const tagRow = row => {
  uiIdSeq += 1;
  return { ...row, _ui_id: uiIdSeq };
};

/**
 * A row without its editor identity.
 *
 * @param {Object} row - The tagged row
 * @returns {Object} The row
 */
export const stripTag = row => {
  const rest = { ...row };
  delete rest._ui_id;
  return rest;
};

const mapHooks = (doc, transform) => {
  const { provisioning } = doc;
  if (!provisioning || (!Array.isArray(provisioning.pre) && !Array.isArray(provisioning.post))) {
    return doc;
  }
  return {
    ...doc,
    provisioning: {
      ...provisioning,
      ...(Array.isArray(provisioning.pre) && { pre: provisioning.pre.map(transform) }),
      ...(Array.isArray(provisioning.post) && { post: provisioning.post.map(transform) }),
    },
  };
};

const mapShellScripts = (doc, transform) => {
  const scripts = doc.provisioning?.shell?.scripts;
  if (!Array.isArray(scripts)) {
    return doc;
  }
  return {
    ...doc,
    provisioning: {
      ...doc.provisioning,
      shell: { ...doc.provisioning.shell, scripts: transform(scripts) },
    },
  };
};

const mapRows = (doc, transformRow, transformScripts) => {
  let next = { ...doc };
  if (Array.isArray(next.folders)) {
    next.folders = next.folders.map(transformRow);
  }
  if (Array.isArray(next.roles)) {
    next.roles = next.roles.map(transformRow);
  }
  const lists = playbookListsOf(next);
  if (lists.local.length > 0 || lists.remote.length > 0) {
    next = withPlaybookLists(next, {
      local: lists.local.map(transformRow),
      remote: lists.remote.map(transformRow),
    });
  }
  next = mapShellScripts(next, transformScripts);
  return mapHooks(next, transformRow);
};

/**
 * The stored document as the editor holds it: every folder, role,
 * playbook and hook row tagged with an identity, and each shell script,
 * a bare string on the wire, wrapped as `{ script }`.
 *
 * @param {Object} doc - The stored document
 * @returns {Object} The editor's document
 */
export const tagRows = doc =>
  mapRows(doc, tagRow, list => list.map(entry => tagRow({ script: entry })));

/**
 * The editor's document as the wire carries it: every identity stripped
 * and each shell script unwrapped to its string.
 *
 * @param {Object} doc - The editor's document
 * @returns {Object} The stored document
 */
export const clean = doc => mapRows(doc, stripTag, list => list.map(row => row.script));

/**
 * The names that would break the Ansible run, the one thing Store
 * refuses: a variable that is no identifier, in the document's `vars`
 * and each role's `vars` and `environment`, and a role name that is no
 * dot-joined name.
 *
 * @param {Object} doc - The stored document
 * @param {Function} t - The translator
 * @returns {Array<string>} The problems
 */
export const invalidNameProblems = (doc, t) => {
  const problems = [];
  const checkKeys = (map, label) => {
    Object.keys(map || {}).forEach(key => {
      if (!VAR_NAME_PATTERN.test(key)) {
        problems.push(t('provisioning.provisioningEditor.invalidNameProblem', { label, key }));
      }
    });
  };
  checkKeys(doc.vars, t('provisioning.provisioningEditor.variableLabel'));
  (Array.isArray(doc.roles) ? doc.roles : []).forEach(role => {
    const name = String(role.name || '').trim();
    if (name === '' || !ROLE_NAME_PATTERN.test(name)) {
      problems.push(
        t('provisioning.provisioningEditor.roleNameProblem', {
          name: name || t('provisioning.provisioningEditor.emptyPlaceholder'),
        })
      );
    }
    const roleWord = name || t('provisioning.provisioningEditor.roleFallback');
    checkKeys(role.vars, t('provisioning.provisioningEditor.variableOnLabel', { role: roleWord }));
    checkKeys(
      role.environment,
      t('provisioning.provisioningEditor.envVarOnLabel', { role: roleWord })
    );
  });
  return problems;
};

/**
 * A patch applied to a row, an undefined value deleting its key.
 *
 * @param {Object} row - The row
 * @param {Object} patch - The patch
 * @returns {Object} The patched row
 */
export const applyPatch = (row, patch) => {
  const next = { ...row, ...patch };
  Object.keys(patch).forEach(key => {
    if (patch[key] === undefined) {
      delete next[key];
    }
  });
  return next;
};

/**
 * A variable's value as the text a field edits, a string as it is and
 * anything else as JSON.
 *
 * @param {*} value - The value
 * @returns {string} The text
 */
export const varToText = value => (typeof value === 'string' ? value : JSON.stringify(value));

/**
 * A field's text as the variable's value, JSON where it parses and the
 * plain string otherwise.
 *
 * @param {string} text - The text
 * @returns {*} The value
 */
export const textToVar = text => {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
};

/**
 * The parsed structure of a variable's text while it is a list or a
 * dict, null otherwise.
 *
 * @param {string} text - The text
 * @returns {Object|Array|null} The structure
 */
export const structureOf = text => {
  try {
    const parsed = JSON.parse(text);
    return parsed !== null && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
};

/**
 * The roles the roles editor opens with from a version's `metadata.roles`,
 * one row a role with its toggle seeded from the manifest's own hint.
 *
 * @param {Object|null} version - The provisioner version
 * @returns {Array<{ name: string, enabled: boolean, files: Object }>} The rows
 */
export const seedRoles = version => {
  const list = version?.metadata?.roles;
  if (!Array.isArray(list)) {
    return [];
  }
  return list
    .filter(role => role && typeof role === 'object' && role.name)
    .map(role => ({
      name: role.name,
      enabled: Boolean(role.defaultEnabled ?? role.default_enabled ?? role.enabled ?? false),
      files: {},
    }));
};

/**
 * The registry's ordering hints, a role's bare name to the roles it
 * depends on, from a version's `metadata.roles`; null while the version
 * carries none.
 *
 * @param {Object|null} version - The provisioner version
 * @returns {Object<string, Array<string>>|null} The hints
 */
export const roleHintsOf = version => {
  const rows = version?.metadata?.roles;
  if (!Array.isArray(rows)) {
    return null;
  }
  return Object.fromEntries(
    rows
      .filter(row => row && typeof row.name === 'string')
      .map(row => [row.name, Array.isArray(row.depends_on) ? row.depends_on : []])
  );
};

/**
 * What the Provisioning page says of a pipeline answer, hyperweaver-ui's
 * report: `nothing`, the skipped entries of a 200 no-op that queued no
 * task, joined; else the sentence in `parts`, the agent's own message or
 * the queued word, the task with its steps where the answer counts them
 * and the skipped suffix where it skips any; and `task`, the queued
 * parent as the task dialog opens on it, or null.
 *
 * @param {Object|null} answer - The agent's answer
 * @param {string} name - The machine name
 * @param {Function} t - The translator
 * @returns {{ nothing: string, parts: Array<string>, task: Object|null }} The outcome
 */
export const pipelineOutcome = (answer, name, t) => {
  const data = answer || {};
  const skipped = Array.isArray(data.playbooks_skipped) ? data.playbooks_skipped : [];
  const skippedWords = skipped
    .map(entry => (typeof entry === 'string' ? entry : entry?.playbook || JSON.stringify(entry)))
    .join(', ');
  if (!data.parent_task_id && skipped.length > 0) {
    return {
      nothing: t('provisioning.machineProvisioning.nothingToRun', { skipped: skippedWords }),
      parts: [],
      task: null,
    };
  }
  const parts = [data.message || t('provisioning.machineProvisioning.queued')];
  if (data.parent_task_id) {
    parts.push(
      data.steps
        ? t('provisioning.machineProvisioning.taskWithSteps', {
            id: data.parent_task_id,
            steps: data.steps,
          })
        : t('provisioning.machineProvisioning.taskOnly', { id: data.parent_task_id })
    );
  }
  if (skipped.length > 0) {
    parts.push(t('provisioning.machineProvisioning.skippedSuffix', { skipped: skippedWords }));
  }
  return { nothing: '', parts, task: queuedTaskOf(data, name) };
};

/**
 * Whether a refusal is the host-hooks confirmation the agent asks for
 * before a provision, the 409 carrying `needs_confirmation`.
 *
 * @param {Object|null} error - The failure of the request
 * @returns {boolean} True when the agent asks for the confirmation
 */
export const needsHookConfirmation = error =>
  error?.status === HOOK_CONFLICT && error?.data?.needs_confirmation === true;

/**
 * The reason a host-hooks refusal carries, the agent's own words.
 *
 * @param {Object|null} error - The failure of the request
 * @returns {string} The reason
 */
export const hookReasonOf = error => String(error?.data?.reason || error?.message || '');

/**
 * The tone the provisioning status badge draws in, success while the
 * machine was provisioned and warning otherwise.
 *
 * @param {string} state - The `provisioning_status`
 * @returns {string} The Bootstrap tone
 */
export const provisionStatusTone = state => (state === 'provisioned' ? 'success' : 'warning');

/**
 * The position a refused YAML names, its numeric `line` and `column`,
 * null for a refusal that names none.
 *
 * @param {Object|null} error - The failure of the request
 * @returns {{ line: number, column: number }|null} The position
 */
export const yamlProblemPosition = error => {
  const line = Number(error?.data?.line);
  if (!Number.isFinite(line) || line <= 0) {
    return null;
  }
  const column = Number(error?.data?.column);
  return { line, column: Number.isFinite(column) && column > 0 ? column : 0 };
};

/**
 * The words of a refused YAML, the agent's own error with the line and
 * column where it names them.
 *
 * @param {Object|null} error - The failure of the request
 * @param {Function} t - The translator
 * @returns {string} The text
 */
export const yamlProblemText = (error, t) => {
  const text = String(error?.data?.error || error?.message || '');
  const position = yamlProblemPosition(error);
  if (!position) {
    return text;
  }
  const suffix = position.column
    ? t('provisioning.hostsYmlModal.lineColumnSuffix', position)
    : t('provisioning.hostsYmlModal.lineSuffix', { line: position.line });
  return `${text} ${suffix}`;
};
