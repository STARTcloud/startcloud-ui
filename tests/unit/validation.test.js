import { describe, expect, it } from 'vitest';

import {
  DEFS,
  defaultsFor,
  isPlaceholder,
  isVisible,
  messageFor,
  refusalMessage,
  scopesFor,
  validateObject,
  validateValue,
} from '../../src/utils/validation.js';

const t = (key, params = {}) => `${key}${params.label ? `:${params.label}` : ''}`;

describe('validateValue', () => {
  it('reports required alone for a missing value', () => {
    expect(validateValue({ type: 'string', required: true }, undefined)).toEqual([
      { pointer: '', rule: 'required', params: {} },
    ]);
    expect(validateValue({ type: 'string', required: true }, null)).toEqual([
      { pointer: '', rule: 'required', params: {} },
    ]);
  });

  it('does not evaluate a blank string on an optional member', () => {
    expect(validateValue({ type: 'integer', minimum: 1 }, '')).toEqual([]);
  });

  it('evaluates a blank string on a required member against the non-blank rule alone', () => {
    expect(validateValue({ $ref: '#/$defs/email', required: true }, '')).toEqual([]);
    expect(
      validateValue({ type: 'string', required: true, minLength: 1, pattern: '\\S' }, '')
    ).toEqual([{ pointer: '', rule: 'pattern', params: { pattern: 'nonBlank' } }]);
    expect(validateValue({ type: 'string', required: true, minLength: 3 }, '')).toEqual([
      { pointer: '', rule: 'minLength', params: { minLength: 3 } },
    ]);
  });

  it('names a pattern by its $defs name', () => {
    expect(validateValue({ $ref: '#/$defs/slug' }, 'bad slug')).toEqual([
      { pointer: '', rule: 'pattern', params: { pattern: 'slug' } },
    ]);
    expect(validateValue({ $ref: '#/$defs/slug' }, 'alma9-server')).toEqual([]);
  });

  it('passes and fails the email grammar', () => {
    expect(validateValue({ $ref: '#/$defs/email' }, 'person@example.com')).toEqual([]);
    expect(validateValue({ $ref: '#/$defs/email' }, 'person@')).toEqual([
      { pointer: '', rule: 'pattern', params: { pattern: 'email' } },
    ]);
  });

  it('reports the bound that was crossed and never a range', () => {
    expect(validateValue({ type: 'integer', minimum: 1, maximum: 10 }, 0)).toEqual([
      { pointer: '', rule: 'minimum', params: { minimum: 1 } },
    ]);
    expect(validateValue({ type: 'integer', minimum: 1, maximum: 10 }, '11')).toEqual([
      { pointer: '', rule: 'maximum', params: { maximum: 10 } },
    ]);
  });

  it('reports type, enum and format', () => {
    expect(validateValue({ type: 'integer' }, 'x')).toEqual([
      { pointer: '', rule: 'type', params: { type: 'integer' } },
    ]);
    expect(validateValue({ type: 'string', enum: ['a', 'b'] }, 'c')).toEqual([
      { pointer: '', rule: 'enum', params: { enum: 'a, b' } },
    ]);
    expect(validateValue({ type: 'string', format: 'hostname' }, 'not a host')).toEqual([
      { pointer: '', rule: 'format', params: { format: 'hostname' } },
    ]);
    expect(validateValue({ type: 'string', format: 'ttl' }, '15m')).toEqual([]);
    expect(validateValue({ type: 'string', format: 'duration' }, 'PT30S')).toEqual([]);
    expect(validateValue({ type: 'string', format: 'date' }, '2026-12-01')).toEqual([]);
    expect(validateValue({ type: 'string', format: 'date' }, '12/01/2026')).toEqual([
      { pointer: '', rule: 'format', params: { format: 'date' } },
    ]);
  });

  it('evaluates items and item counts', () => {
    expect(validateValue({ type: 'array', minItems: 2 }, ['a'])).toEqual([
      { pointer: '', rule: 'minItems', params: { minItems: 2 } },
    ]);
    expect(validateValue({ type: 'array', items: { $ref: '#/$defs/hex' } }, ['ff', 'zz'])).toEqual([
      { pointer: '', rule: 'pattern', params: { pattern: 'hex' } },
    ]);
  });

  it('skips every value rule for a placeholder', () => {
    expect(isPlaceholder('${SECRET:default}')).toBe(true);
    expect(validateValue({ type: 'integer', required: true }, '${PORT}')).toEqual([]);
  });

  it('resolves $ref in the document handed in', () => {
    const document = { $defs: { code: { type: 'string', pattern: '^[A-Z]{3}$' } } };
    expect(validateValue({ $ref: '#/$defs/code' }, 'abc', document)).toEqual([
      { pointer: '', rule: 'pattern', params: { pattern: 'code' } },
    ]);
    expect(Object.keys(DEFS)).toContain('personName');
  });
});

describe('validateObject', () => {
  const schema = {
    properties: {
      name: { $ref: '#/$defs/slug' },
      port: { type: 'integer', minimum: 1 },
      sql: {
        type: 'object',
        properties: { host: { type: 'string', format: 'hostname' } },
        required: ['host'],
      },
      sqlite: { type: 'string', dependsOn: 'engine', showWhen: ['sqlite'] },
      engine: { type: 'string', enum: ['sqlite', 'mysql'] },
      labels: {
        type: 'object',
        additionalProperties: { type: 'string', minLength: 1 },
        propertyNames: { $ref: '#/$defs/identifier' },
      },
      confirm: { type: 'string', equals: 'password' },
      password: { type: 'string' },
    },
    required: ['name'],
    dependentRequired: { engine: ['port'] },
  };

  it('walks nested objects and maps with pointers', () => {
    const errors = validateObject(schema, {
      name: 'ok',
      port: 0,
      engine: 'mysql',
      sql: {},
      labels: { 'bad key!': '', good: 'x' },
      password: 'a',
      confirm: 'b',
    });
    expect(errors).toEqual([
      { pointer: '/port', rule: 'minimum', params: { minimum: 1 } },
      { pointer: '/sql/host', rule: 'required', params: {} },
      { pointer: '/labels', rule: 'propertyNames', params: { key: 'bad key!' } },
      { pointer: '/confirm', rule: 'equals', params: { other: 'password' } },
    ]);
  });

  it('walks a nested object even while the parent is absent', () => {
    expect(validateObject(schema, { name: 'ok' })).toEqual([
      { pointer: '/sql/host', rule: 'required', params: {} },
    ]);
  });

  it('walks an array of objects one element at a time and then the array itself', () => {
    const rows = {
      properties: {
        servers: {
          type: 'array',
          maxItems: 2,
          items: {
            type: 'object',
            required: ['origin'],
            properties: {
              origin: { type: 'string', pattern: '^https://[A-Za-z0-9.-]+(?::[0-9]{1,5})?$' },
              label: { type: 'string', maxLength: 3 },
            },
          },
        },
      },
    };
    expect(
      validateObject(rows, {
        servers: [
          { origin: 'https://hw.example.com', label: 'ok' },
          { origin: 'ftp://bad', label: 'toolong' },
          { label: 'x' },
        ],
      })
    ).toEqual([
      {
        pointer: '/servers/1/origin',
        rule: 'pattern',
        params: { pattern: '^https://[A-Za-z0-9.-]+(?::[0-9]{1,5})?$' },
      },
      { pointer: '/servers/1/label', rule: 'maxLength', params: { maxLength: 3 } },
      { pointer: '/servers/2/origin', rule: 'required', params: {} },
      { pointer: '/servers', rule: 'maxItems', params: { maxItems: 2 } },
    ]);
    expect(validateObject(rows, { servers: [{ origin: 'https://hw.example.com' }] })).toEqual([]);
  });

  it('requires a member only while the member it depends on is set', () => {
    expect(validateObject(schema, { name: 'ok', sql: { host: 'db' } })).toEqual([]);
    expect(validateObject(schema, { name: 'ok', engine: 'sqlite', sql: { host: 'db' } })).toEqual([
      { pointer: '/port', rule: 'required', params: {} },
    ]);
  });

  it('skips a property hidden by dependsOn', () => {
    expect(isVisible({ dependsOn: 'engine', showWhen: ['sqlite'] }, [{ engine: 'mysql' }])).toBe(
      false
    );
    expect(isVisible({ dependsOn: 'flag', showWhen: [true] }, [{ flag: 'true' }])).toBe(false);
    expect(isVisible({ dependsOn: 'flag', showWhen: [true] }, [{ flag: true }])).toBe(true);
    expect(scopesFor({ a: { b: { c: 1 } } }, '/a/b/c')).toEqual([
      { a: { b: { c: 1 } } },
      { b: { c: 1 } },
      { c: 1 },
    ]);
  });

  it('reads a dependsOn sibling as its schema default only while the key is missing', () => {
    const rule = { dependsOn: 'mode', showWhen: ['system', 'manual'] };
    const defaults = [{ mode: 'system' }];
    expect(isVisible(rule, [{}], defaults)).toBe(true);
    expect(isVisible(rule, [{ mode: undefined }], defaults)).toBe(true);
    expect(isVisible(rule, [{ mode: null }], defaults)).toBe(false);
    expect(isVisible(rule, [{ mode: '' }], defaults)).toBe(false);
    expect(isVisible(rule, [{ mode: 'none' }], defaults)).toBe(false);
    expect(isVisible(rule, [{ mode: 'manual' }], [{ mode: 'none' }])).toBe(true);
    expect(isVisible(rule, [{}])).toBe(false);
    expect(isVisible(rule, [{}], [{}])).toBe(false);
    expect(isVisible({ dependsOn: 'on', showWhen: [true] }, [{ on: false }], [{ on: true }])).toBe(
      false
    );
  });

  it('answers the defaults of the fields of each scope of a pointer', () => {
    const fields = [
      { pointer: '/level', key: 'level', default: 'info' },
      { pointer: '/proxy/mode', key: 'mode', default: 'system' },
      { pointer: '/proxy/host', key: 'host', default: null },
      { pointer: '/proxy/auth/kind', key: 'kind', default: 'basic' },
    ];
    expect(defaultsFor(fields, '/proxy/no_proxy')).toEqual([{ level: 'info' }, { mode: 'system' }]);
    expect(defaultsFor(fields, '/level')).toEqual([{ level: 'info' }]);
  });

  it('evaluates a property its sibling default shows and skips one it hides', () => {
    const proxy = {
      properties: {
        proxy: {
          type: 'object',
          properties: {
            mode: { type: 'string', enum: ['none', 'system', 'manual'], default: 'system' },
            host: { type: 'string', dependsOn: 'mode', showWhen: ['manual'] },
            no_proxy: {
              type: 'array',
              items: { type: 'string' },
              maxItems: 1,
              dependsOn: 'mode',
              showWhen: ['system', 'manual'],
            },
          },
          required: ['host'],
        },
      },
    };
    expect(validateObject(proxy, { proxy: { no_proxy: ['a', 'b'] } })).toEqual([
      { pointer: '/proxy/no_proxy', rule: 'maxItems', params: { maxItems: 1 } },
    ]);
    expect(validateObject(proxy, { proxy: { mode: 'none', no_proxy: ['a', 'b'] } })).toEqual([]);
    expect(validateObject(proxy, { proxy: { mode: 'manual' } })).toEqual([
      { pointer: '/proxy/host', rule: 'required', params: {} },
    ]);
    expect(validateObject(proxy, { proxy: { mode: null, no_proxy: ['a', 'b'] } })).toEqual([]);
    expect(validateObject(proxy, { proxy: { mode: '', no_proxy: ['a', 'b'] } })).toEqual([]);
  });

  it('reads no schema default inside a map entry', () => {
    const sites = {
      properties: {
        sites: {
          type: 'object',
          additionalProperties: {
            type: 'object',
            properties: {
              mode: { type: 'string', default: 'system' },
              no_proxy: {
                type: 'array',
                items: { type: 'string' },
                maxItems: 1,
                dependsOn: 'mode',
                showWhen: ['system'],
              },
            },
          },
        },
      },
    };
    const stored = { sites: { a: { mode: 'system', no_proxy: ['x', 'y'] } } };
    expect(validateObject(sites, { sites: { a: { no_proxy: ['x', 'y'] } } })).toEqual([]);
    expect(validateObject(sites, stored)).toEqual([
      { pointer: '/sites/a/no_proxy', rule: 'maxItems', params: { maxItems: 1 } },
    ]);
  });
});

describe('messageFor', () => {
  it('answers one key per rule with the label', () => {
    expect(messageFor({ rule: 'pattern', params: { pattern: 'slug' } }, 'Name', t)).toBe(
      'validation.pattern.slug:Name'
    );
    expect(messageFor({ rule: 'format', params: { format: 'ipv4' } }, 'Host', t)).toBe(
      'validation.format.ipv4:Host'
    );
    expect(messageFor({ rule: 'type', params: { type: 'integer' } }, 'Port', t)).toBe(
      'validation.type.integer:Port'
    );
    expect(messageFor({ rule: 'enum', params: {} }, 'Engine', t)).toBe('validation.enum:Engine');
    expect(messageFor({ rule: 'minLength', params: { minLength: 3 } }, 'Name', t)).toBe(
      'validation.minLength:Name'
    );
    expect(
      messageFor({ rule: 'pattern', params: { pattern: 'domainName' } }, 'Default domain', t)
    ).toBe('validation.pattern.domainName:Default domain');
  });

  it('answers a token by its reason with the token inside its braces', () => {
    const named = (key, params = {}) => `${key}:${params.label}:${params.token}`;
    expect(messageFor({ rule: 'token', params: { token: 'nmae' } }, 'Subject', named)).toBe(
      'validation.token.unoffered:Subject:{{nmae}}'
    );
    expect(
      messageFor(
        { rule: 'token', params: { token: 'frist_name', reason: 'unknown' } },
        'Content',
        named
      )
    ).toBe('validation.token.unknown:Content:{{frist_name}}');
    expect(
      messageFor({ rule: 'token', params: { token: 'f:x', reason: 'undeclared' } }, 'Content', t)
    ).toBe('validation.token.undeclared:Content');
    expect(
      messageFor({ rule: 'token', params: { token: 'x', reason: 'mystery' } }, 'Content', t)
    ).toBe('validation.unknown:Content');
  });

  it('answers dependentRequired, const, readOnly, unique and the date format by their keys', () => {
    expect(
      messageFor(
        { rule: 'dependentRequired', params: { dependentRequired: 'default_copy' } },
        'Language',
        t
      )
    ).toBe('validation.dependentRequired.default_copy:Language');
    expect(
      messageFor({ rule: 'dependentRequired', params: { dependentRequired: 'x' } }, 'Language', t)
    ).toBe('validation.unknown:Language');
    expect(messageFor({ rule: 'const', params: { const: 'full_name' } }, 'Signature', t)).toBe(
      'validation.const.full_name:Signature'
    );
    expect(messageFor({ rule: 'const', params: { const: 'x' } }, 'Signature', t)).toBe(
      'validation.unknown:Signature'
    );
    expect(messageFor({ rule: 'readOnly', params: {} }, 'Language', t)).toBe(
      'validation.readOnly:Language'
    );
    expect(messageFor({ rule: 'unique' }, 'Version', t)).toBe('validation.unique:Version');
    expect(messageFor({ rule: 'format', params: { format: 'date' } }, 'Start date', t)).toBe(
      'validation.format.date:Start date'
    );
    expect(messageFor({ rule: 'type', params: { type: 'boolean' } }, 'Enabled', t)).toBe(
      'validation.type.boolean:Enabled'
    );
  });

  it('answers validation.unknown for a rule the UI does not know', () => {
    expect(messageFor({ rule: 'mystery', detail: 'hidden' }, 'X', t)).toBe('validation.unknown:X');
    expect(messageFor({ rule: 'pattern', params: { pattern: 'mystery' } }, 'X', t)).toBe(
      'validation.unknown:X'
    );
  });
});

describe('refusalMessage', () => {
  it('joins every entry of the problem body through messageFor', () => {
    const error = {
      fieldErrors: [
        { pointer: '/name', rule: 'required', params: {} },
        { pointer: '/port', rule: 'minimum', params: { minimum: 1 } },
      ],
    };
    expect(refusalMessage({ error, labels: { name: 'labels.name' }, t })).toBe(
      'validation.required:labels.name validation.minimum:port'
    );
  });

  it('answers the request line when the body carried no entries', () => {
    expect(refusalMessage({ error: { messageKey: 'errors.forbidden' }, t })).toBe(
      'errors.forbidden'
    );
    expect(refusalMessage({ error: null, t })).toBe('errors.request');
  });
});
