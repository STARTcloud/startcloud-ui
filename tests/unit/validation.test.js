import { describe, expect, it } from 'vitest';

import {
  DEFS,
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
