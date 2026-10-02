export const DSL_TYPES = [
  'text',
  'textarea',
  'number',
  'checkbox',
  'select',
  'multiselect',
  'password',
  'fqdn',
  'ipaddr',
  'cidr',
  'path',
];

const PASSWORD_FLOOR = 8;

const FQDN_PATTERN =
  /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z](?:[a-z0-9-]{0,61}[a-z0-9])?$/iu;

const OCTET_PATTERN = /^\d{1,3}$/u;

const HEX_PATTERN = /^[0-9a-f]{1,4}$/iu;

const IPV6_CHARS = /^[0-9a-f:.]+$/iu;

/**
 * A version's `{ groups, fields }` configuration, hyperweaver-ui's field
 * DSL, shape-checked: null while the manifest carries no field, the
 * manifest predating the DSL, so a caller draws its hint and no form.
 *
 * @param {Object|null} version - The provisioner version
 * @returns {{ groups: Array<Object>, fields: Array<Object> }|null} The configuration
 */
export const dslConfiguration = version => {
  const configuration = version?.metadata?.configuration;
  if (!configuration || typeof configuration !== 'object') {
    return null;
  }
  const fields = Array.isArray(configuration.fields)
    ? configuration.fields.filter(field => field && typeof field === 'object' && field.name)
    : null;
  if (!fields || fields.length === 0) {
    return null;
  }
  const groups = (Array.isArray(configuration.groups) ? configuration.groups : []).filter(
    group => group && typeof group === 'object' && group.name
  );
  return { groups, fields };
};

/**
 * A field's option rows as `{ value, label }`, a scalar option doubling
 * as both.
 *
 * @param {Object} field - The field
 * @returns {Array<{ value: *, label: string }>} The rows
 */
export const optionRows = field =>
  (Array.isArray(field.options) ? field.options : []).map(option =>
    option && typeof option === 'object'
      ? { value: option.value, label: option.label ?? String(option.value) }
      : { value: option, label: String(option) }
  );

/**
 * The role-enable flags a condition may name, `<role>_enabled` for each
 * role of the form's toggles, verbatim.
 *
 * @param {Array<Object>} roles - The form's roles, `{ name, enabled }`
 * @returns {Object<string, boolean>} The flags
 */
export const roleFlagScope = roles => {
  const scope = {};
  (Array.isArray(roles) ? roles : []).forEach(role => {
    const name = String(role?.name || '');
    if (name) {
      scope[`${name}_enabled`] = Boolean(role.enabled);
    }
  });
  return scope;
};

/**
 * The defaults of a configuration's fields as the answers a form opens
 * with, a password never seeded.
 *
 * @param {{ fields: Array<Object> }|null} config - The configuration
 * @returns {Object} The answers
 */
export const seedAnswers = config => {
  const answers = {};
  (config?.fields || []).forEach(field => {
    if (field.default !== undefined && field.type !== 'password') {
      answers[field.name] = field.default;
    }
  });
  return answers;
};

const numberOf = value => {
  if (value === '' || value === null || value === undefined) {
    return null;
  }
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isNaN(parsed) ? null : parsed;
};

const COMPARISONS = {
  gt: (current, limit) => current > limit,
  gte: (current, limit) => current >= limit,
  lt: (current, limit) => current < limit,
  lte: (current, limit) => current <= limit,
};

const matchEntry = (actual, expected) => {
  if (Array.isArray(expected)) {
    return expected.some(candidate => matchEntry(actual, candidate));
  }
  if (expected !== null && typeof expected === 'object') {
    if ('not' in expected) {
      return !matchEntry(actual, expected.not);
    }
    const current = numberOf(actual);
    return Object.entries(expected).every(([op, bound]) => {
      const limit = numberOf(bound);
      if (current === null || limit === null || !COMPARISONS[op]) {
        return false;
      }
      return COMPARISONS[op](current, limit);
    });
  }
  if (typeof expected === 'number') {
    return numberOf(actual) === expected;
  }
  return String(actual ?? '') === String(expected);
};

/**
 * Whether a `show_if` condition holds over a scope, hyperweaver-ui's
 * closed grammar: a map is an AND of its entries, an entry's value a
 * scalar (equals), a list (in), `{ not }`, or `{ gt, gte, lt, lte }`,
 * and a top-level `{ any: [map, map] }` an OR of maps; booleans and
 * strings compare as their canonical strings, an absent value never
 * equal to false.
 *
 * @param {Object|null} condition - The condition
 * @param {Object} scope - The answers and the role flags
 * @returns {boolean} True when it holds
 */
export const evaluateShowIf = (condition, scope) => {
  if (!condition || typeof condition !== 'object') {
    return true;
  }
  if (Array.isArray(condition.any)) {
    return condition.any.some(branch => evaluateShowIf(branch, scope));
  }
  return Object.entries(condition).every(([name, expected]) => matchEntry(scope[name], expected));
};

/**
 * Which fields and groups of a configuration show for the answers and
 * the role flags, a cascade in declaration order: a visible field
 * contributes its answer, falling back to its default, to the scope, a
 * hidden field its default alone; a group's condition ANDs with each
 * member's own, and a field naming an undeclared group is ungrouped.
 *
 * @param {{ groups: Array<Object>, fields: Array<Object> }|null} config - The configuration
 * @param {Object} answers - The answers
 * @param {Array<Object>} roles - The form's roles
 * @returns {{ fields: Set<string>, groups: Set<string> }} The visible names
 */
export const visibility = (config, answers, roles) => {
  const scope = { ...roleFlagScope(roles) };
  const byGroup = new Map((config?.groups || []).map(group => [group.name, group]));
  const fields = new Set();
  const groups = new Set();
  (config?.fields || []).forEach(field => {
    const group = field.group ? byGroup.get(field.group) : undefined;
    const inGroup = group ? evaluateShowIf(group.show_if, scope) : true;
    const isVisible = inGroup && evaluateShowIf(field.show_if, scope);
    if (isVisible) {
      fields.add(field.name);
      if (group) {
        groups.add(group.name);
      }
    }
    const contributed =
      isVisible && answers[field.name] !== undefined ? answers[field.name] : field.default;
    if (contributed !== undefined) {
      scope[field.name] = contributed;
    }
  });
  return { fields, groups };
};

/**
 * The answers minus the hidden fields, what the wire carries.
 *
 * @param {{ groups: Array<Object>, fields: Array<Object> }|null} config - The configuration
 * @param {Object} answers - The answers
 * @param {Array<Object>} roles - The form's roles
 * @returns {Object} The pruned answers
 */
export const pruneHidden = (config, answers, roles) => {
  if (!config) {
    return answers;
  }
  const visible = visibility(config, answers, roles).fields;
  const pruned = {};
  Object.entries(answers).forEach(([name, value]) => {
    if (visible.has(name) && value !== undefined) {
      pruned[name] = value;
    }
  });
  return pruned;
};

const ipv4Ok = value => {
  const parts = String(value).split('.');
  return (
    parts.length === 4 &&
    parts.every(part => OCTET_PATTERN.test(part) && Number(part) >= 0 && Number(part) <= 255)
  );
};

const ipv6Ok = value => {
  const text = String(value);
  if (!IPV6_CHARS.test(text) || !text.includes(':')) {
    return false;
  }
  const doubles = text.split('::').length - 1;
  if (doubles > 1) {
    return false;
  }
  const parts = text.split('::').flatMap(half => (half === '' ? [] : half.split(':')));
  if (parts.some(part => part === '')) {
    return false;
  }
  const tailV4 = parts.length > 0 && parts[parts.length - 1].includes('.');
  if (tailV4 && !ipv4Ok(parts[parts.length - 1])) {
    return false;
  }
  const hexParts = tailV4 ? parts.slice(0, -1) : parts;
  if (!hexParts.every(part => HEX_PATTERN.test(part))) {
    return false;
  }
  const full = tailV4 ? 6 : 8;
  return doubles === 1 ? hexParts.length <= full - 1 : hexParts.length === full;
};

const ipOk = (value, version) => {
  if (version === 4) {
    return ipv4Ok(value);
  }
  if (version === 6) {
    return ipv6Ok(value);
  }
  return ipv4Ok(value) || ipv6Ok(value);
};

const isBlank = value =>
  value === undefined || value === null || value === '' || (Array.isArray(value) && !value.length);

const numberError = (field, value, t) => {
  const rules = field.validate || {};
  const parsed = numberOf(value);
  if (parsed === null) {
    return t('provisioning.provisionerFieldDsl.errMustBeNumber');
  }
  if (rules.min !== undefined && parsed < rules.min) {
    return t('provisioning.provisionerFieldDsl.errMinNumber', { min: rules.min });
  }
  if (rules.max !== undefined && parsed > rules.max) {
    return t('provisioning.provisionerFieldDsl.errMaxNumber', { max: rules.max });
  }
  return '';
};

const optionsError = (field, value, t) => {
  const allowed = optionRows(field).map(option => option.value);
  if (allowed.length === 0) {
    return '';
  }
  const picks = field.type === 'multiselect' && Array.isArray(value) ? value : [value];
  const stray = picks.find(pick => !allowed.some(candidate => String(candidate) === String(pick)));
  return stray === undefined
    ? ''
    : t('provisioning.provisionerFieldDsl.errNotOption', { value: stray });
};

const lengthError = (field, text, t) => {
  const rules = field.validate || {};
  if (field.type === 'password' && text.length < Math.max(PASSWORD_FLOOR, rules.min_length || 0)) {
    return t('provisioning.provisionerFieldDsl.errMinLength', {
      count: Math.max(PASSWORD_FLOOR, rules.min_length || 0),
    });
  }
  if (rules.min_length !== undefined && text.length < rules.min_length) {
    return t('provisioning.provisionerFieldDsl.errMinLength', { count: rules.min_length });
  }
  if (rules.max_length !== undefined && text.length > rules.max_length) {
    return t('provisioning.provisionerFieldDsl.errMaxLength', { count: rules.max_length });
  }
  return '';
};

const cidrError = (text, t) => {
  const [address, prefix, extra] = text.split('/');
  if (extra !== undefined || !prefix || !OCTET_PATTERN.test(prefix) || !ipOk(address)) {
    return t('provisioning.provisionerFieldDsl.errNotCidr');
  }
  if (Number(prefix) > (ipv4Ok(address) ? 32 : 128)) {
    return t('provisioning.provisionerFieldDsl.errCidrPrefixRange');
  }
  return '';
};

const formatError = (field, text, t) => {
  if (field.type === 'fqdn' && !FQDN_PATTERN.test(text)) {
    return t('provisioning.provisionerFieldDsl.errNotFqdn');
  }
  if (field.type === 'ipaddr' && !ipOk(text, field.version)) {
    return t('provisioning.provisionerFieldDsl.errNotIp', { version: field.version || '4/6' });
  }
  return field.type === 'cidr' ? cidrError(text, t) : '';
};

const patternError = (field, text, t) => {
  const rules = field.validate || {};
  if (!rules.pattern) {
    return '';
  }
  try {
    if (!new RegExp(rules.pattern, 'u').test(text)) {
      return rules.pattern_error || t('provisioning.provisionerFieldDsl.errPatternDefault');
    }
  } catch {
    return '';
  }
  return '';
};

/**
 * One field's error text, empty while the value passes: a checkbox
 * always passes; a blank value fails only a required field; a number
 * its coercion and its `min` and `max`; a select or multiselect its
 * declared options; text its length rules, a password's floor of eight,
 * the format of an fqdn, an ipaddr or a cidr, and the author's pattern.
 *
 * @param {Object} field - The field
 * @param {*} value - The answer
 * @param {Function} t - The translator
 * @returns {string} The error, or the empty string
 */
export const validateField = (field, value, t) => {
  if (field.type === 'checkbox') {
    return '';
  }
  if (isBlank(value)) {
    return field.required
      ? t('provisioning.provisionerFieldDsl.errRequired', { label: field.label || field.name })
      : '';
  }
  if (field.type === 'number') {
    return numberError(field, value, t);
  }
  if (field.type === 'select' || field.type === 'multiselect') {
    return optionsError(field, value, t);
  }
  const text = String(value);
  return lengthError(field, text, t) || formatError(field, text, t) || patternError(field, text, t);
};

/**
 * The errors of every visible field, keyed by field name, the gate a
 * form's Next waits behind and the mirror of the agent's 422.
 *
 * @param {{ groups: Array<Object>, fields: Array<Object> }|null} config - The configuration
 * @param {Object} answers - The answers
 * @param {Array<Object>} roles - The form's roles
 * @param {Function} t - The translator
 * @returns {Object<string, string>} The errors
 */
export const validateAnswers = (config, answers, roles, t) => {
  const errors = {};
  if (!config) {
    return errors;
  }
  const visible = visibility(config, answers, roles).fields;
  config.fields.forEach(field => {
    if (!visible.has(field.name)) {
      return;
    }
    const message = validateField(field, answers[field.name], t);
    if (message) {
      errors[field.name] = message;
    }
  });
  return errors;
};

/**
 * The option rows a select or multiselect draws: the caller's inventory
 * under the field's `options_source` where it carries one, else the
 * field's own options.
 *
 * @param {Object} field - The field
 * @param {Object|null} inventory - The platform inventory
 * @returns {Array<{ value: *, label: string }>} The rows
 */
export const rowsFor = (field, inventory) => {
  const sourced =
    field.options_source && Array.isArray(inventory?.[field.options_source])
      ? inventory[field.options_source]
      : null;
  if (sourced) {
    return sourced.map(entry => ({ value: entry, label: String(entry) }));
  }
  return optionRows(field);
};
