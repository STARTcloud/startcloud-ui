import { failure, invalid } from './kit.js';

const SLUG = '^[A-Za-z0-9.-]+$';
const IDENTIFIER = '^[0-9a-zA-Z][0-9a-zA-Z._-]*$';
const DOTS = '\\.\\.';
const EMAIL_LOCAL = "^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+";
const EMAIL_LABEL = '[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?';
const EMAIL = `${EMAIL_LOCAL}@${EMAIL_LABEL}(?:\\.${EMAIL_LABEL})*$`;
const NAME_FIRST = '[^\\x00-\\x40\\x5B-\\x60\\x7B-\\x7F]';
const NAME_REST = '[^\\x00-\\x1F\\x21-\\x26\\x28-\\x2C\\x2F-\\x40\\x5B-\\x60\\x7B-\\x7F]';
const ORIGIN = '^https://[A-Za-z0-9.-]+(?::[0-9]{1,5})?$';
const TEXT = { type: 'string' };

const ref = name => ({ $ref: `#/$defs/${name}` });

const bounded = maxLength => ({ type: 'string', maxLength });

const form = (properties, required = []) => ({ type: 'object', required, properties });

const ADDRESS = form({
  line1: bounded(255),
  city: bounded(128),
  state: bounded(128),
  postal_code: bounded(32),
  country: bounded(128),
  formatted: bounded(1024),
});

const DEFS = {
  slug: {
    type: 'string',
    allOf: [{ pattern: SLUG }, { not: { pattern: DOTS } }],
    minLength: 1,
    maxLength: 255,
  },
  identifier: {
    type: 'string',
    allOf: [{ pattern: IDENTIFIER }, { not: { pattern: DOTS } }],
    maxLength: 255,
  },
  email: { type: 'string', pattern: EMAIL, maxLength: 255 },
  orgCode: { type: 'string', pattern: '^[0-9A-F]{6}$' },
  providerName: { type: 'string', pattern: '^[a-z0-9_]+$' },
  hex: { type: 'string', pattern: '^[a-fA-F0-9]+$' },
  watchId: { type: 'string', pattern: '^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$' },
  personName: { type: 'string', pattern: `^${NAME_FIRST}${NAME_REST}*$`, maxLength: 255 },
  iconName: { type: 'string', pattern: '^[a-z0-9 -]{1,64}$' },
  languageTag: {
    type: 'string',
    pattern: '^[a-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$',
    maxLength: 10,
  },
  timezone: { type: 'string', pattern: '^(?:UTC|[A-Za-z_]+(?:/[A-Za-z0-9_+-]+)+)$' },
  region: { type: 'string', pattern: '^[A-Z]{2}$|^(EU|EEA|UK)$' },
};

const FORMS = {
  login: form({ username: TEXT, password: TEXT }, ['username', 'password']),
  register: form(
    {
      username: { ...ref('slug'), minLength: 3, maxLength: 64, unique: 'global' },
      email: { ...ref('email'), unique: 'global' },
      password: { type: 'string', minLength: 15, maxLength: 128 },
      name: bounded(255),
      invitation_token: TEXT,
    },
    ['username', 'email', 'password']
  ),
  displayName: form({ name: bounded(255) }),
  profile: form({
    given_name: ref('personName'),
    family_name: ref('personName'),
    middle_name: ref('personName'),
    mobile_number: bounded(32),
    address: ADDRESS,
  }),
  password: form({ password: { type: 'string', minLength: 15, maxLength: 128 } }, ['password']),
  email: form({ new_email: { ...ref('email'), unique: 'global' } }, ['new_email']),
  serviceAccount: form(
    {
      description: TEXT,
      expiration_days: { type: 'integer', minimum: 1, maximum: 365 },
      organization_id: { type: 'integer' },
      role: { type: 'string', enum: ['guest', 'member', 'admin', 'owner', 'superadmin'] },
    },
    ['organization_id']
  ),
  organization: form(
    {
      organization: { ...ref('slug'), unique: 'global' },
      org_code: { ...ref('orgCode'), unique: 'global' },
      email: ref('email'),
      description: TEXT,
    },
    ['organization']
  ),
  accessMode: form({
    access_mode: { type: 'string', enum: ['private', 'invite', 'request'] },
    default_role: { type: 'string', enum: ['guest', 'member', 'admin'] },
  }),
  invitation: form(
    {
      email: ref('email'),
      organization_name: ref('slug'),
      invite_role: { type: 'string', enum: ['guest', 'member', 'admin'] },
    },
    ['email']
  ),
  joinRequest: form({ message: TEXT }),
  'integration-hyperweaver': form(
    {
      servers: {
        type: 'array',
        maxItems: 20,
        items: form(
          {
            origin: { type: 'string', pattern: ORIGIN },
            label: bounded(100),
            default: { type: 'boolean' },
          },
          ['origin']
        ),
      },
      deploy_target: TEXT,
    },
    ['servers', 'deploy_target']
  ),
};

/**
 * The rules document of `GET /api/rules`, JSON Schema 2020-12 with the
 * estate's named patterns under `$defs` and the forms a `backend` host
 * has routes for under `forms`.
 */
export const RULES = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  $defs: DEFS,
  forms: FORMS,
};

const blank = value => value === undefined || value === null || value === '';

const defOf = rule => (rule.$ref ? rule.$ref.split('/').pop() : '');

const typeFits = (type, value) => {
  if (type === 'integer') {
    return Number.isInteger(Number(value));
  }
  if (type === 'number') {
    return Number.isFinite(Number(value));
  }
  if (type === 'object') {
    return typeof value === 'object' && !Array.isArray(value);
  }
  return type === 'array' ? Array.isArray(value) : typeof value === type;
};

const partOf = part => {
  const wanted = !part.not;
  return { pattern: wanted ? part.pattern : part.not.pattern, wanted };
};

const patternsOf = rule => [
  ...(rule.pattern ? [partOf(rule)] : []),
  ...(rule.allOf || []).map(partOf),
];

const patternFails = (rule, value) =>
  patternsOf(rule).some(({ pattern, wanted }) => new RegExp(pattern).test(value) !== wanted);

const textFailure = (rule, value, name) => {
  if (rule.minLength && value.length < rule.minLength) {
    return { rule: 'minLength', params: { minLength: rule.minLength } };
  }
  if (rule.maxLength && value.length > rule.maxLength) {
    return { rule: 'maxLength', params: { maxLength: rule.maxLength } };
  }
  return patternFails(rule, value) ? { rule: 'pattern', params: { pattern: name } } : null;
};

const numberFailure = (rule, value) => {
  if (rule.minimum !== undefined && Number(value) < rule.minimum) {
    return { rule: 'minimum', params: { minimum: rule.minimum } };
  }
  if (rule.maximum !== undefined && Number(value) > rule.maximum) {
    return { rule: 'maximum', params: { maximum: rule.maximum } };
  }
  return null;
};

export const valueFailure = (own, value) => {
  const rule = { ...DEFS[defOf(own)], ...own };
  if (rule.type && !typeFits(rule.type, value)) {
    return { rule: 'type', params: { type: rule.type } };
  }
  if (rule.enum && !rule.enum.includes(value)) {
    return { rule: 'enum', params: { enum: rule.enum } };
  }
  return typeof value === 'string'
    ? textFailure(rule, value, defOf(own))
    : numberFailure(rule, value);
};

const walk = { object: null };

const memberFailures = ({ schema, member, value, base }) => {
  const pointer = `${base}/${member}`;
  if (blank(value)) {
    return schema.required.includes(member) ? [failure({ pointer, rule: 'required' })] : [];
  }
  const rule = schema.properties[member];
  const found = valueFailure(rule, value);
  if (found) {
    return [failure({ pointer, ...found })];
  }
  return rule.properties ? walk.object(rule, value, pointer) : [];
};

walk.object = (schema, values, base) =>
  Object.keys(schema.properties).flatMap(member =>
    memberFailures({ schema, member, value: values[member], base })
  );

/**
 * A body evaluated against one form of the rules document as a write
 * route does it, a member the body does not carry evaluated only while
 * the form requires it.
 *
 * @param {string} formKey - The form's key
 * @param {Object} body - The request body
 * @param {Array<string>} [sent] - The members this route requires beyond the body's own
 * @returns {Object|null} The 422 answer, or null when the body passes
 */
export const refusedBy = (formKey, body, sent = []) => {
  const schema = FORMS[formKey];
  const members = Object.keys(schema.properties).filter(
    member => member in body || sent.includes(member)
  );
  const errors = members.flatMap(member =>
    memberFailures({ schema, member, value: body[member], base: '' })
  );
  return errors.length > 0 ? invalid(errors) : null;
};
