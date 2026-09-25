import { describe, expect, it } from 'vitest';

import {
  fieldOf,
  patchOf,
  schemaSections,
  setValueAt,
  valueAt,
} from '../../src/utils/schemaSections.js';

const schema = {
  title: 'Application',
  sections: {
    server: { title: 'Server', order: 1 },
    mail: { title: 'Mail', order: 2, action: { route: '/api/config/app/mail/test' } },
  },
  required: ['origin'],
  properties: {
    schemaVersion: { type: 'integer', readOnly: true },
    origin: { type: 'string', section: 'server', order: 2, title: 'Origin' },
    port: { type: 'integer', section: 'server', order: 1, requiresRestart: true },
    debug: { type: 'boolean' },
    smtp: {
      type: 'object',
      section: 'mail',
      subsection: 'smtp',
      title: 'SMTP',
      order: 1,
      action: { route: '/api/config/app/smtp/test' },
      properties: {
        host: { type: 'string', format: 'hostname' },
        password: { type: 'string', writeOnly: true },
      },
    },
    providers: {
      type: 'object',
      section: 'mail',
      additionalProperties: { type: 'object', properties: { key: { type: 'string' } } },
      propertyNames: { pattern: '^[a-z]+$' },
    },
    free: { type: 'object' },
  },
};

describe('schemaSections', () => {
  const sections = schemaSections(schema);

  it('orders the sections by order and puts general last', () => {
    expect(sections.map(section => section.key)).toEqual(['server', 'mail', 'general']);
    expect(sections[2].title).toBe('General');
    expect(sections[1].action).toEqual({ route: '/api/config/app/mail/test' });
  });

  it('orders fields by order with unordered fields after, and never lists schemaVersion', () => {
    expect(sections[0].fields.map(field => field.key)).toEqual(['port', 'origin']);
    expect(sections[2].fields.map(field => field.key)).toEqual(['debug']);
    expect(sections.flatMap(section => section.fields).some(f => f.key === 'schemaVersion')).toBe(
      false
    );
  });

  it('draws a subsection from the object that names it with its pointer and action', () => {
    const [smtp] = sections[1].subsections;
    expect(smtp.key).toBe('smtp');
    expect(smtp.title).toBe('SMTP');
    expect(smtp.pointer).toBe('/smtp');
    expect(smtp.action).toEqual({ route: '/api/config/app/smtp/test' });
    expect(smtp.fields.map(field => field.pointer)).toEqual(['/smtp/host', '/smtp/password']);
  });

  it('keeps a map as one field and drops a free subtree', () => {
    const map = sections[1].fields.find(field => field.key === 'providers');
    expect(map.additionalProperties).toEqual({
      type: 'object',
      properties: { key: { type: 'string' } },
    });
    expect(map.propertyNames).toEqual({ pattern: '^[a-z]+$' });
    expect(sections.flatMap(section => section.fields).some(f => f.key === 'free')).toBe(false);
  });
});

describe('fieldOf', () => {
  it('reads the label, the hint, the restart flag and the required flag', () => {
    const field = fieldOf({
      pointer: '/port',
      key: 'port',
      property: { type: 'integer', requiresRestart: true, restartReason: 'binds the port' },
      required: true,
      index: 3,
    });
    expect(field).toMatchObject({
      pointer: '/port',
      title: 'port',
      description: '',
      type: 'integer',
      requiresRestart: true,
      restartReason: 'binds the port',
      required: true,
      order: null,
      index: 3,
      default: null,
      enum: null,
    });
  });
});

describe('valueAt and setValueAt', () => {
  const config = { boxvault: { origin: 'https://a', nested: { on: true } } };

  it('reads a pointer and answers undefined off the path', () => {
    expect(valueAt(config, '/boxvault/origin')).toBe('https://a');
    expect(valueAt(config, '/boxvault/missing/deeper')).toBeUndefined();
  });

  it('copies along the path and creates the missing objects', () => {
    const next = setValueAt(config, '/boxvault/nested/on', false);
    expect(next.boxvault.nested.on).toBe(false);
    expect(config.boxvault.nested.on).toBe(true);
    expect(setValueAt(config, '/mail/smtp/host', 'h').mail).toEqual({ smtp: { host: 'h' } });
  });
});

describe('patchOf', () => {
  it('answers the merge patch of RFC 7396', () => {
    const before = { a: 1, b: { c: 2, d: 3 }, e: [1], f: 'x', g: 'keep' };
    const after = { a: 1, b: { c: 5 }, e: [1, 2], f: '', h: null, g: 'keep' };
    expect(patchOf(before, after)).toEqual({ b: { d: null, c: 5 }, e: [1, 2], f: '', h: null });
  });

  it('answers an empty patch when nothing changed', () => {
    expect(patchOf({ a: { b: 1 } }, { a: { b: 1 } })).toEqual({});
    expect(patchOf(null, undefined)).toEqual({});
  });
});
