import { configurationOf } from './machines';

/**
 * The form the take dialog opens with, hyperweaver-ui's: a named
 * snapshot, every field empty and no option chosen.
 */
export const TAKE_FORM = {
  mode: 'name',
  name: '',
  prefix: '',
  retention: '',
  description: '',
  quiesce: false,
  live: false,
};

/**
 * The kinds of retention policy a machine may carry, the agents' own
 * words.
 */
export const POLICY_TYPES = ['none', 'simple', 'age', 'rotation'];

/**
 * The key of the label of each kind of retention policy,
 * hyperweaver-ui's own.
 */
export const POLICY_LABELS = {
  none: 'machine.machineSnapshots.policyNone',
  simple: 'machine.machineSnapshots.policySimple',
  age: 'machine.machineSnapshots.policyAge',
  rotation: 'machine.machineSnapshots.policyRotation',
};

/**
 * The tiers of a rotation policy, each the number of snapshots the
 * agents keep of it where the policy names none, drawn as the field's
 * placeholder.
 */
export const POLICY_TIERS = [
  { key: 'hourly', keep: '24' },
  { key: 'daily', keep: '8' },
  { key: 'weekly', keep: '5' },
];

/**
 * The snapshots a simple policy keeps and the days an age policy keeps
 * them where the policy names none, drawn as the fields' placeholders.
 */
export const POLICY_DEFAULTS = { keep: '24', maxAgeDays: '14' };

const textOf = value => (value === undefined || value === null ? '' : String(value));

/**
 * The key of one snapshot's row: its `uuid` where the agent answers one,
 * its name otherwise.
 *
 * @param {Object} row - The snapshot's row
 * @returns {string} The key
 */
export const snapshotKey = row => String(row.uuid || row.name);

/**
 * How deep a snapshot sits in the tree of VirtualBox, the dashes of its
 * `node`, `SnapshotName` the root, `SnapshotName-1` its first child and
 * `SnapshotName-1-1` that child's; zero for a row that carries no node,
 * the row of an agent whose snapshots are no tree.
 *
 * @param {Object} row - The snapshot's row
 * @returns {number} The depth
 */
export const snapshotDepth = row => (String(row?.node || '').match(/-/gu) || []).length;

/**
 * The instant a snapshot was taken, zero for a row that carries none.
 *
 * @param {Object} row - The snapshot's row
 * @returns {number} The instant, in milliseconds
 */
export const snapshotInstant = row => {
  const instant = row?.created ? new Date(row.created).getTime() : 0;
  return Number.isFinite(instant) ? instant : 0;
};

/**
 * The holds a snapshot carries, zero for a row that names none.
 *
 * @param {Object} row - The snapshot's row
 * @returns {number} The count
 */
export const holdsOf = row => Number(row?.holds) || 0;

/**
 * The flags of one snapshot, the values its filter group narrows by:
 * `current` while the machine's state derives from it and `held` while
 * it carries a hold.
 *
 * @param {Object} row - The snapshot's row
 * @returns {Array<string>} The flags
 */
export const snapshotFlags = row => [
  ...(row?.current ? ['current'] : []),
  ...(holdsOf(row) > 0 ? ['held'] : []),
];

/**
 * Whether a snapshot's row matches the navbar's query: its name or its
 * description.
 *
 * @param {Object} row - The snapshot's row
 * @param {string} needle - The query, lower-cased
 * @returns {boolean} True when the row matches
 */
export const matchesSnapshot = (row, needle) =>
  [textOf(row.name), textOf(row.description)].some(text => text.toLowerCase().includes(needle));

/**
 * The handles the holds of a snapshot are asked by, one a dataset that
 * carries it: the dataset and the snapshot as `dataset@snapshot`. A hold
 * belongs to one dataset's snapshot and a machine's snapshot is one
 * instant over several, so a hold is placed on every one of them; none
 * for a row that names no dataset.
 *
 * @param {Object|null} row - The snapshot's row
 * @returns {Array<{ dataset: string, snapshot: string }>} The handles
 */
export const holdHandles = row =>
  (Array.isArray(row?.dataset_names) ? row.dataset_names : []).map(dataset => ({
    dataset,
    snapshot: `${dataset}@${row.name}`,
  }));

/**
 * Why a take form cannot be sent, the key of the sentence that says so,
 * empty for a form that can: a machine on UTM is snapshotted while it is
 * off alone, and the name, or the prefix of a dated name, is required.
 *
 * @param {Object} form - The form, the shape of `TAKE_FORM`
 * @param {Object} machine - Whether the machine runs and whether it is on UTM
 * @param {boolean} machine.running - Whether the machine runs
 * @param {boolean} machine.utm - Whether the machine is on UTM
 * @returns {string} The locale key, or the empty string
 */
export const takeProblem = (form, { running, utm }) => {
  if (utm && running) {
    return 'machine.machineSnapshots.utmStoppedOnly';
  }
  if (form.mode === 'prefix') {
    return form.prefix.trim() ? '' : 'machine.machineSnapshots.prefixRequired';
  }
  return form.name.trim() ? '' : 'machine.machineSnapshots.nameRequired';
};

const namingOf = form => {
  if (form.mode !== 'prefix') {
    return { name: form.name.trim() };
  }
  return {
    prefix: form.prefix.trim(),
    ...(form.retention === '' ? {} : { retention: Number(form.retention) }),
  };
};

/**
 * The body of `POST machines/{name}/snapshots` a take form sends: the
 * name, or the prefix with the retention where one is given; the
 * description where given; `quiesce` where chosen and `live` where
 * chosen of a machine that runs, neither of a machine on UTM, which has
 * neither.
 *
 * @param {Object} form - The form, the shape of `TAKE_FORM`
 * @param {Object} machine - Whether the machine runs and whether it is on UTM
 * @param {boolean} machine.running - Whether the machine runs
 * @param {boolean} machine.utm - Whether the machine is on UTM
 * @returns {Object} The body
 */
export const takeBody = (form, { running, utm }) => ({
  ...namingOf(form),
  ...(form.description.trim() ? { description: form.description.trim() } : {}),
  ...(form.quiesce && !utm ? { quiesce: true } : {}),
  ...(form.live && running && !utm ? { live: true } : {}),
});

/**
 * The body of `PUT machines/{name}/snapshots/{snapshot}` an edit form
 * sends, the members that changed alone: `new_name` where a name is
 * given that is not the snapshot's own, and `description` where it
 * differs from the snapshot's, an emptied one sent empty, which clears
 * it; null while nothing changed.
 *
 * @param {Object} form - The new name and the description
 * @param {string} form.newName - The new name, empty to keep the name
 * @param {string} form.description - The description
 * @param {Object} row - The snapshot's row
 * @returns {Object|null} The body, or null
 */
export const modifyBody = (form, row) => {
  const name = form.newName.trim();
  const body = {
    ...(name && name !== row.name ? { new_name: name } : {}),
    ...(form.description === textOf(row.description) ? {} : { description: form.description }),
  };
  return Object.keys(body).length > 0 ? body : null;
};

/**
 * The retention policy a machine carries of its own, `snapshots` of its
 * configuration; null for a machine that follows the agent's.
 *
 * @param {Object|null} detail - The answer of `GET machines/{name}`
 * @returns {Object|null} The policy
 */
export const policyOf = detail => {
  const policy = configurationOf(detail).snapshots;
  return policy && typeof policy === 'object' && !Array.isArray(policy) ? policy : null;
};

/**
 * A retention policy as the form its editor holds: the type, empty for
 * a machine that follows the agent's, whether the guest is quiesced, and
 * the numbers as the text of their fields.
 *
 * @param {Object|null} policy - The policy of `policyOf`
 * @returns {{ type: string, quiesce: boolean, keep: string, maxAgeDays: string, tiers: Object<string, string> }} The form
 */
export const policyFormOf = policy => ({
  type: POLICY_TYPES.includes(policy?.type) ? policy.type : '',
  quiesce: policy?.quiesce === true,
  keep: textOf(policy?.keep),
  maxAgeDays: textOf(policy?.max_age_days),
  tiers: Object.fromEntries(
    POLICY_TIERS.map(tier => [tier.key, textOf(policy?.tiers?.[tier.key]?.keep)])
  ),
});

const tiersOf = form => {
  const tiers = Object.fromEntries(
    POLICY_TIERS.filter(tier => form.tiers[tier.key] !== '').map(tier => [
      tier.key,
      { keep: Number(form.tiers[tier.key]) },
    ])
  );
  return Object.keys(tiers).length > 0 ? { tiers } : {};
};

const NUMBERS = {
  none: () => ({}),
  simple: form => (form.keep === '' ? {} : { keep: Number(form.keep) }),
  age: form => (form.maxAgeDays === '' ? {} : { max_age_days: Number(form.maxAgeDays) }),
  rotation: tiersOf,
};

/**
 * The policy a form of the editor sends as `snapshots` of
 * `PUT machines/{name}`: the type, `quiesce` where chosen of every type
 * but `none`, and the numbers of the type alone, the ones a field
 * carries: `keep` of a simple policy, `max_age_days` of an age policy
 * and the tiers of a rotation.
 *
 * @param {Object} form - The form of `policyFormOf`
 * @returns {Object} The policy
 */
export const policyBody = form => ({
  type: form.type,
  ...(form.type !== 'none' && form.quiesce ? { quiesce: true } : {}),
  ...NUMBERS[form.type](form),
});
