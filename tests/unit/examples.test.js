import { describe, expect, it } from 'vitest';

import { EMAIL_ARGUMENTS, EMAIL_TEMPLATES } from '../../src/features/identity/utils/examples.js';

const TOKEN = /\{\{(?<name>[^{}]*)\}\}/g;

const tokensOf = text => [...text.matchAll(TOKEN)].map(match => match.groups.name);

const offeredBy = kind =>
  (EMAIL_ARGUMENTS.find(entry => entry.kind === kind)?.arguments || []).map(entry => entry.name);

describe('the email template examples', () => {
  it('name every token as { name, description } with no index', () => {
    EMAIL_ARGUMENTS.forEach(entry => {
      entry.arguments.forEach(argument => {
        expect(Object.keys(argument)).toEqual(['name', 'description']);
        expect(argument.name).toMatch(/^[a-z][a-z0-9_]*$/);
      });
    });
  });

  it('offer tokens for every kind that has copies and for no other', () => {
    expect(EMAIL_ARGUMENTS.map(entry => entry.kind)).toEqual(
      EMAIL_TEMPLATES.map(template => template.kind)
    );
  });

  it('use in every subject and body only the tokens their kind offers', () => {
    EMAIL_TEMPLATES.forEach(template => {
      const offered = offeredBy(template.kind);
      template.copies.forEach(copy => {
        const used = [...tokensOf(copy.subject), ...tokensOf(copy.body)];
        expect(used.length).toBeGreaterThan(0);
        expect(used.filter(name => !offered.includes(name))).toEqual([]);
        expect(`${copy.subject}${copy.body}`).not.toMatch(/\{\d+\}/);
      });
    });
  });
});
