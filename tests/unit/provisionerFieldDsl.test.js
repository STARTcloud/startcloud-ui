import { describe, expect, it } from 'vitest';

import {
  DSL_TYPES,
  dslConfiguration,
  evaluateShowIf,
  hypervisorRowsOf,
  optionRows,
  pruneHidden,
  roleFlagScope,
  roleGroupsOf,
  rowsFor,
  secretFieldsOf,
  secretKindsOf,
  seedAnswers,
  seedInventoryAnswers,
  seedSecretAnswers,
  validateAnswers,
  validateField,
  visibility,
} from '../../src/features/hosts/utils/provisionerFieldDsl.js';

const t = (key, values = {}) =>
  `${key}${Object.keys(values).length > 0 ? ` ${JSON.stringify(values)}` : ''}`;

const version = {
  metadata: {
    configuration: {
      groups: [
        { name: 'domino', label: 'Domino', show_if: { domino_enabled: true } },
        { name: 'advanced', label: 'Advanced', advanced: true },
      ],
      fields: [
        { name: 'hostname', label: 'Hostname', type: 'fqdn', required: true },
        { name: 'size', label: 'Size', type: 'select', options: ['small', 'large'] },
        {
          name: 'disks',
          label: 'Disks',
          type: 'number',
          show_if: { size: 'large' },
          default: 2,
          validate: { min: 1, max: 8 },
        },
        { name: 'organization', type: 'text', group: 'domino', default: 'STARTcloud' },
        { name: 'secret', type: 'password', group: 'domino', default: 'never' },
        { name: 'debug', type: 'checkbox', group: 'advanced' },
        { name: 'ghost', type: 'text', group: 'missing' },
        null,
        { label: 'nameless' },
      ],
    },
  },
};

const config = dslConfiguration(version);

describe('dslConfiguration', () => {
  it('answers the groups and the named fields of a manifest and null without fields', () => {
    expect(config.groups.map(group => group.name)).toEqual(['domino', 'advanced']);
    expect(config.fields.map(field => field.name)).toEqual([
      'hostname',
      'size',
      'disks',
      'organization',
      'secret',
      'debug',
      'ghost',
    ]);
    expect(dslConfiguration({ metadata: {} })).toBeNull();
    expect(dslConfiguration({ metadata: { configuration: { fields: [] } } })).toBeNull();
    expect(dslConfiguration(null)).toBeNull();
  });

  it('lists the closed type set', () => {
    expect(DSL_TYPES).toEqual([
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
      'list',
      'file',
      'secret',
    ]);
  });

  it('names the secret fields with their kind, profile and secret key, the certificate and key kinds among them', () => {
    const shaped = {
      fields: [
        {
          name: 'INSTALLER_BEARER',
          type: 'secret',
          kind: 'api_key',
          profile: 'installer_server',
          secret_key: 'installer_url_bearer',
        },
        { name: 'USER_SAFE_ID', type: 'secret', kind: 'file', secret_key: 'user_safe_id' },
        { name: 'TLS_CERT', type: 'secret', kind: 'certificate', secret_key: 'tls_cert' },
        { name: 'TLS_KEY', type: 'secret', kind: 'key', secret_key: 'tls_key' },
        { name: 'OTHER', type: 'text' },
      ],
    };
    expect(secretFieldsOf(shaped).map(field => field.secret_key)).toEqual([
      'installer_url_bearer',
      'user_safe_id',
      'tls_cert',
      'tls_key',
    ]);
    expect(secretKindsOf(shaped)).toEqual(['api_key', 'file', 'certificate', 'key']);
    expect(secretFieldsOf(null)).toEqual([]);
    expect(secretKindsOf(null)).toEqual([]);
  });

  it('names the groups a role draws', () => {
    const shaped = {
      groups: [
        { name: 'domino', label: 'Domino' },
        { name: 'ssl', label: 'SSL', role: 'ssl' },
        { name: 'iq', label: 'IQ', role: '' },
      ],
      fields: [{ name: 'NAMES', type: 'list', items: 'fqdn' }],
    };
    expect(roleGroupsOf(shaped).map(group => group.name)).toEqual(['ssl']);
    expect(roleGroupsOf(null)).toEqual([]);
  });
});

describe('seedSecretAnswers', () => {
  const shaped = {
    fields: [
      { name: 'INSTALLER_BEARER', type: 'secret', kind: 'api_key', profile: 'installer_server' },
      { name: 'DOMINO_IQ_API_KEY', type: 'secret', kind: 'api_key', profile: 'openai' },
      { name: 'USER_SAFE_ID', type: 'secret', kind: 'file', profile: 'notes_id' },
      { name: 'TLS_CERT', type: 'secret', kind: 'certificate' },
      { name: 'OTHER', type: 'text' },
    ],
  };
  const bearer = { id: 'sec-bearer', kind: 'api_key', profile: 'installer_server' };
  const openai = { id: 'sec-openai', kind: 'api_key', profile: 'openai' };
  const plain = { id: 'sec-plain', kind: 'api_key' };

  it('picks the one row that matches the kind and the profile', () => {
    expect(
      seedSecretAnswers(shaped, {
        api_key: [bearer, openai],
        file: [{ id: 'sec-safe', kind: 'file', profile: 'notes_id' }],
        certificate: [{ id: 'ca-1', kind: 'authority' }],
      })
    ).toEqual({
      INSTALLER_BEARER: 'sec-bearer',
      DOMINO_IQ_API_KEY: 'sec-openai',
      USER_SAFE_ID: 'sec-safe',
      TLS_CERT: 'ca-1',
    });
  });

  it('leaves a field unpicked while no row matches', () => {
    expect(seedSecretAnswers(shaped, { api_key: [bearer], file: [] })).toEqual({
      INSTALLER_BEARER: 'sec-bearer',
    });
    expect(seedSecretAnswers(shaped, {})).toEqual({});
    expect(seedSecretAnswers(null, { api_key: [bearer] })).toEqual({});
  });

  it('leaves a field unpicked while two rows match, a row naming no profile among them', () => {
    expect(seedSecretAnswers(shaped, { api_key: [bearer, openai, plain] })).toEqual({});
    expect(
      seedSecretAnswers(shaped, {
        file: [
          { id: 'sec-safe', kind: 'file', profile: 'notes_id' },
          { id: 'sec-server', kind: 'file', record: { profile: 'notes_id' } },
        ],
      })
    ).toEqual({});
  });
});

describe('the options of a field', () => {
  it('reads scalars as value and label and objects as they are', () => {
    expect(optionRows({ options: ['a', 2] })).toEqual([
      { value: 'a', label: 'a' },
      { value: 2, label: '2' },
    ]);
    expect(optionRows({ options: [{ value: 'x', label: 'Ex' }, { value: 'y' }] })).toEqual([
      { value: 'x', label: 'Ex' },
      { value: 'y', label: 'y' },
    ]);
    expect(optionRows({})).toEqual([]);
  });

  it('draws the inventory rows under options_source where the caller carries them', () => {
    const field = { options: ['a'], options_source: 'bridges' };
    expect(rowsFor(field, { bridges: ['br0', 'br1'] })).toEqual([
      { value: 'br0', label: 'br0' },
      { value: 'br1', label: 'br1' },
    ]);
    expect(rowsFor(field, {})).toEqual([{ value: 'a', label: 'a' }]);
    expect(rowsFor(field, null)).toEqual([{ value: 'a', label: 'a' }]);
  });

  it('draws the hypervisor inventory as the rows of a select sourced from it, objects and strings alike', () => {
    const field = { name: 'VAGRANT_PROVIDER', type: 'select', options_source: 'hypervisor' };
    expect(rowsFor(field, { hypervisor: ['virtualbox', 'zones'] })).toEqual([
      { value: 'virtualbox', label: 'virtualbox' },
      { value: 'zones', label: 'zones' },
    ]);
    expect(rowsFor(field, { hypervisor: [{ value: 'utm', label: 'UTM' }] })).toEqual([
      { value: 'utm', label: 'UTM' },
    ]);
    expect(rowsFor(field, {})).toEqual([]);
  });

  it('names the host hypervisors as the provider names, bhyve as zones, the detected first, each once', () => {
    expect(hypervisorRowsOf(['bhyve', 'virtualbox', 'bhyve'])).toEqual(['zones', 'virtualbox']);
    expect(hypervisorRowsOf(['utm', 'xen'])).toEqual(['utm']);
    expect(hypervisorRowsOf(undefined)).toEqual([]);
  });

  it('seeds a select sourced from an inventory on the first row and leaves the rest alone', () => {
    const shaped = {
      fields: [
        { name: 'VAGRANT_PROVIDER', type: 'select', options_source: 'hypervisor' },
        { name: 'NET', type: 'select', options_source: 'networks' },
        { name: 'SIZE', type: 'select', options: ['small'] },
      ],
    };
    expect(
      seedInventoryAnswers(shaped, { hypervisor: ['zones', 'virtualbox'], networks: [] })
    ).toEqual({ VAGRANT_PROVIDER: 'zones' });
    expect(seedInventoryAnswers(shaped, null)).toEqual({});
    expect(seedInventoryAnswers(null, { hypervisor: ['utm'] })).toEqual({});
  });
});

describe('the role flags and the seeded answers', () => {
  it('names each role as its enabled flag', () => {
    expect(
      roleFlagScope([{ name: 'domino', enabled: true }, { name: 'leap' }, { enabled: true }])
    ).toEqual({ domino_enabled: true, leap_enabled: false });
    expect(roleFlagScope(null)).toEqual({});
  });

  it('seeds every default but a password', () => {
    expect(seedAnswers(config)).toEqual({ disks: 2, organization: 'STARTcloud' });
    expect(seedAnswers(null)).toEqual({});
  });
});

describe('evaluateShowIf', () => {
  it('holds for no condition and for a map whose every entry matches', () => {
    expect(evaluateShowIf(null, {})).toBe(true);
    expect(evaluateShowIf({ size: 'large', debug: true }, { size: 'large', debug: 'true' })).toBe(
      true
    );
    expect(evaluateShowIf({ size: 'large', debug: true }, { size: 'large' })).toBe(false);
  });

  it('reads a list as in, not as its negation and the four comparisons over numbers', () => {
    expect(evaluateShowIf({ size: ['small', 'large'] }, { size: 'small' })).toBe(true);
    expect(evaluateShowIf({ size: { not: 'small' } }, { size: 'large' })).toBe(true);
    expect(evaluateShowIf({ size: { not: ['small', 'large'] } }, { size: 'large' })).toBe(false);
    expect(evaluateShowIf({ disks: { gt: 1, lte: 4 } }, { disks: '4' })).toBe(true);
    expect(evaluateShowIf({ disks: { gte: 5 } }, { disks: 4 })).toBe(false);
    expect(evaluateShowIf({ disks: { lt: 1 } }, { disks: '' })).toBe(false);
    expect(evaluateShowIf({ disks: { between: 1 } }, { disks: 2 })).toBe(false);
  });

  it('reads min_items and max_items over the member count of a list answer, alone and together', () => {
    expect(evaluateShowIf({ names: { min_items: 1 } }, { names: ['a.example.com'] })).toBe(true);
    expect(evaluateShowIf({ names: { min_items: 2 } }, { names: ['a.example.com'] })).toBe(false);
    expect(evaluateShowIf({ names: { max_items: 1 } }, { names: ['a.example.com'] })).toBe(true);
    expect(evaluateShowIf({ names: { max_items: 1 } }, { names: ['a', 'b'] })).toBe(false);
    expect(evaluateShowIf({ names: { min_items: 1, max_items: 2 } }, { names: ['a', 'b'] })).toBe(
      true
    );
    expect(
      evaluateShowIf({ names: { min_items: 1, max_items: 2 } }, { names: ['a', 'b', 'c'] })
    ).toBe(false);
  });

  it('counts a non-list answer as no members', () => {
    expect(evaluateShowIf({ names: { min_items: 1 } }, {})).toBe(false);
    expect(evaluateShowIf({ names: { min_items: 1 } }, { names: 'a.example.com' })).toBe(false);
    expect(evaluateShowIf({ names: { max_items: 0 } }, { names: undefined })).toBe(true);
    expect(evaluateShowIf({ names: { max_items: 0 } }, { names: 'a.example.com' })).toBe(true);
    expect(evaluateShowIf({ names: { min_items: 'one' } }, { names: ['a'] })).toBe(false);
  });

  it('reads any as an or of maps and a number against the number the answer reads as', () => {
    expect(evaluateShowIf({ any: [{ size: 'small' }, { disks: 2 }] }, { disks: '2' })).toBe(true);
    expect(evaluateShowIf({ any: [{ size: 'small' }] }, { size: 'large' })).toBe(false);
    expect(evaluateShowIf({ disks: 2 }, { disks: 'two' })).toBe(false);
  });

  it('never reads an absent answer as false', () => {
    expect(evaluateShowIf({ debug: false }, {})).toBe(false);
    expect(evaluateShowIf({ debug: false }, { debug: false })).toBe(true);
  });
});

describe('visibility and pruneHidden', () => {
  it('cascades in declaration order, a hidden field contributing its default alone', () => {
    const shown = visibility(config, { size: 'large', disks: 5 }, [{ name: 'domino' }]);
    expect([...shown.fields]).toEqual(['hostname', 'size', 'disks', 'debug', 'ghost']);
    expect([...shown.groups]).toEqual(['advanced']);
    const hidden = visibility(config, { size: 'small', disks: 5 }, [
      { name: 'domino', enabled: true },
    ]);
    expect(hidden.fields.has('disks')).toBe(false);
    expect(hidden.fields.has('organization')).toBe(true);
    expect([...hidden.groups]).toEqual(['domino', 'advanced']);
  });

  it('drops the hidden answers from the wire and leaves the answers of no configuration', () => {
    const answers = { hostname: 'a.example.com', size: 'small', disks: 5, organization: 'X' };
    expect(pruneHidden(config, answers, [])).toEqual({ hostname: 'a.example.com', size: 'small' });
    expect(pruneHidden(null, answers, [])).toBe(answers);
  });
});

describe('validateField', () => {
  it('passes a checkbox always and a blank value unless required', () => {
    expect(validateField({ type: 'checkbox', required: true }, undefined, t)).toBe('');
    expect(validateField({ name: 'x', type: 'text' }, '', t)).toBe('');
    expect(validateField({ name: 'x', label: 'X', type: 'text', required: true }, [], t)).toBe(
      'provisioning.provisionerFieldDsl.errRequired {"label":"X"}'
    );
  });

  it('checks a number, its floor and its ceiling', () => {
    const field = { name: 'n', type: 'number', validate: { min: 1, max: 8 } };
    expect(validateField(field, 'x', t)).toBe('provisioning.provisionerFieldDsl.errMustBeNumber');
    expect(validateField(field, 0, t)).toBe(
      'provisioning.provisionerFieldDsl.errMinNumber {"min":1}'
    );
    expect(validateField(field, '9', t)).toBe(
      'provisioning.provisionerFieldDsl.errMaxNumber {"max":8}'
    );
    expect(validateField(field, 4, t)).toBe('');
  });

  it('checks a pick against the declared options and lets an inventory pick through', () => {
    const field = { name: 's', type: 'select', options: ['a', 'b'] };
    expect(validateField(field, 'c', t)).toBe(
      'provisioning.provisionerFieldDsl.errNotOption {"value":"c"}'
    );
    expect(validateField({ ...field, type: 'multiselect' }, ['a', 'z'], t)).toBe(
      'provisioning.provisionerFieldDsl.errNotOption {"value":"z"}'
    );
    expect(validateField({ name: 's', type: 'select', options_source: 'x' }, 'any', t)).toBe('');
  });

  it('holds a password to eight characters and text to its lengths', () => {
    expect(validateField({ name: 'p', type: 'password' }, 'short', t)).toBe(
      'provisioning.provisionerFieldDsl.errMinLength {"count":8}'
    );
    expect(
      validateField({ name: 'p', type: 'password', validate: { min_length: 12 } }, 'tenletters', t)
    ).toBe('provisioning.provisionerFieldDsl.errMinLength {"count":12}');
    expect(validateField({ name: 't', type: 'text', validate: { max_length: 3 } }, 'four', t)).toBe(
      'provisioning.provisionerFieldDsl.errMaxLength {"count":3}'
    );
  });

  it('checks an fqdn, an address of either version and a cidr', () => {
    expect(validateField({ name: 'h', type: 'fqdn' }, 'host', t)).toBe(
      'provisioning.provisionerFieldDsl.errNotFqdn'
    );
    expect(validateField({ name: 'h', type: 'fqdn' }, 'host.example.com', t)).toBe('');
    expect(validateField({ name: 'a', type: 'ipaddr' }, '10.0.0.256', t)).toBe(
      'provisioning.provisionerFieldDsl.errNotIp {"version":"4/6"}'
    );
    expect(validateField({ name: 'a', type: 'ipaddr', version: 6 }, '10.0.0.1', t)).toBe(
      'provisioning.provisionerFieldDsl.errNotIp {"version":6}'
    );
    expect(validateField({ name: 'a', type: 'ipaddr' }, 'fe80::1', t)).toBe('');
    expect(validateField({ name: 'a', type: 'ipaddr' }, '::ffff:10.0.0.1', t)).toBe('');
    expect(validateField({ name: 'a', type: 'ipaddr' }, 'fe80::1::2', t)).toBe(
      'provisioning.provisionerFieldDsl.errNotIp {"version":"4/6"}'
    );
    expect(validateField({ name: 'c', type: 'cidr' }, '10.0.0.0/24', t)).toBe('');
    expect(validateField({ name: 'c', type: 'cidr' }, '10.0.0.0/33', t)).toBe(
      'provisioning.provisionerFieldDsl.errCidrPrefixRange'
    );
    expect(validateField({ name: 'c', type: 'cidr' }, '10.0.0.0', t)).toBe(
      'provisioning.provisionerFieldDsl.errNotCidr'
    );
  });

  it('checks a list by its member count and each member as the items type', () => {
    const names = {
      name: 'NAMES',
      label: 'Names',
      type: 'list',
      items: 'fqdn',
      validate: { min_items: 1, max_items: 2 },
    };
    expect(validateField(names, [], t)).toBe(
      'provisioning.provisionerFieldDsl.errMinItems {"count":1}'
    );
    expect(validateField(names, undefined, t)).toBe(
      'provisioning.provisionerFieldDsl.errMinItems {"count":1}'
    );
    expect(validateField(names, ['a.example.com', 'b.example.com', 'c.example.com'], t)).toBe(
      'provisioning.provisionerFieldDsl.errMaxItems {"count":2}'
    );
    expect(validateField(names, ['a.example.com', 'bare'], t)).toBe(
      'provisioning.provisionerFieldDsl.errNotFqdn'
    );
    expect(validateField(names, ['a.example.com', ''], t)).toBe(
      'provisioning.provisionerFieldDsl.errRequired {"label":"Names"}'
    );
    expect(validateField(names, ['a.example.com'], t)).toBe('');
    expect(validateField({ name: 'free', type: 'list' }, [], t)).toBe('');
    expect(
      validateField({ name: 'free', label: 'Free', type: 'list', required: true }, [], t)
    ).toBe('provisioning.provisionerFieldDsl.errRequired {"label":"Free"}');
    expect(validateField({ name: 'ips', type: 'list', items: 'ipaddr' }, ['10.0.0.1'], t)).toBe('');
  });

  it('checks a file by its name as text', () => {
    const field = {
      name: 'DOMINO_INSTALLER',
      label: 'Installer',
      type: 'file',
      kind: 'installer',
      role: 'domino',
    };
    expect(validateField(field, 'Domino_14.0_Linux_English.tar', t)).toBe('');
    expect(validateField({ ...field, required: true }, '', t)).toBe(
      'provisioning.provisionerFieldDsl.errRequired {"label":"Installer"}'
    );
    expect(validateField({ ...field, validate: { max_length: 4 } }, 'Domino.tar', t)).toBe(
      'provisioning.provisionerFieldDsl.errMaxLength {"count":4}'
    );
  });

  it("checks a secret by its answer, the picked row's id, required only when required", () => {
    const field = {
      name: 'INSTALLER_BEARER',
      label: 'Bearer',
      type: 'secret',
      kind: 'api_key',
      secret_key: 'installer_url_bearer',
    };
    expect(validateField(field, 'sec-bearer', t)).toBe('');
    expect(validateField(field, undefined, t)).toBe('');
    expect(validateField({ ...field, required: true }, '', t)).toBe(
      'provisioning.provisionerFieldDsl.errRequired {"label":"Bearer"}'
    );
    expect(validateField(field, { id: 'sec-bearer' }, t)).toBe(
      'provisioning.provisionerFieldDsl.errNotSecret'
    );
  });

  it("applies the author's pattern with the author's message and ignores a broken one", () => {
    const field = {
      name: 'k',
      type: 'text',
      validate: { pattern: '^[a-z]+$', pattern_error: 'Lower' },
    };
    expect(validateField(field, 'ABC', t)).toBe('Lower');
    expect(validateField({ ...field, validate: { pattern: '^[a-z]+$' } }, 'ABC', t)).toBe(
      'provisioning.provisionerFieldDsl.errPatternDefault'
    );
    expect(validateField({ name: 'k', type: 'text', validate: { pattern: '(' } }, 'x', t)).toBe('');
  });
});

describe('validateAnswers', () => {
  it('names the errors of the visible fields alone', () => {
    const errors = validateAnswers(config, { size: 'large', disks: 0 }, [], t);
    expect(Object.keys(errors)).toEqual(['hostname', 'disks']);
    expect(validateAnswers(config, { size: 'small', disks: 0 }, [], t)).toEqual({
      hostname: 'provisioning.provisionerFieldDsl.errRequired {"label":"Hostname"}',
    });
    expect(validateAnswers(null, {}, [], t)).toEqual({});
  });
});
