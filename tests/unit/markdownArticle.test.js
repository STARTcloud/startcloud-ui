import { describe, expect, it } from 'vitest';

import {
  anchorNames,
  anchorParts,
  attributeKept,
  blankOf,
  calloutOf,
  classesKept,
  compositeJoin,
  countryName,
  entriesOf,
  relFor,
} from '../../src/components/common/MarkdownArticle.jsx';

const KEY = '8f3k2qz1m7c4x9ab';
const OTHER = '0000000000000000';

const labelOf = entry => entry.label || `label:${entry.name}`;
const dateOf = value => (value ? `date:${value}` : '');

const FIELDS = [
  { name: 'first_name', kind: 'text', group: 'identity', required: true },
  { name: 'last_name', kind: 'text', group: 'identity', required: true },
  { name: 'phone_number', kind: 'tel', group: 'identity', required: true },
  { name: 'country', kind: 'country', group: 'address', required: true },
  { name: 'state', kind: 'state', group: 'address', required: true },
  { name: 'city', kind: 'text', group: 'address', required: false },
  { name: 'address_line_1', kind: 'text', group: 'address', required: true },
  { name: 'full_name', kind: 'composite', parts: ['first_name', 'last_name'], separators: [' '] },
  {
    name: 'address',
    kind: 'composite',
    parts: ['address_line_1', 'city', 'country'],
    separators: [', ', ', '],
  },
  { name: 'over_18', kind: 'checkbox', group: 'document', label: 'I am 18 or older' },
  { name: 'start_date', kind: 'date', group: 'document', label: 'Start date' },
  { name: 'plan', kind: 'choice', group: 'document', label: 'Licence tier', changed: true },
  { name: 'signature', kind: 'signature', group: 'document', label: 'Sign here' },
];

const draw = (name, values = {}, fields = FIELDS, fieldsVersion = 1) =>
  blankOf({ name, entries: entriesOf(fields), values, fieldsVersion, labelOf, dateOf });

describe('attributeKept', () => {
  it('keeps the common attributes and the ones a tag lists', () => {
    expect(attributeKept('p', 'title', 'x')).toBe(true);
    expect(attributeKept('p', 'ID', 'x')).toBe(true);
    expect(attributeKept('td', 'colspan', '2')).toBe(true);
    expect(attributeKept('ol', 'start', '3')).toBe(true);
    expect(attributeKept('a', 'rel', 'nofollow')).toBe(true);
  });

  it('drops handlers, styles and every data attribute, the old blank mark included', () => {
    expect(attributeKept('p', 'onclick', 'alert(1)')).toBe(false);
    expect(attributeKept('p', 'style', 'color:red')).toBe(false);
    expect(attributeKept('span', 'data-tos-field', 'first_name')).toBe(false);
    expect(attributeKept('p', 'rel', 'nofollow')).toBe(false);
  });

  it('keeps align on th and td while it names a side, and nowhere else', () => {
    expect(attributeKept('td', 'align', 'right')).toBe(true);
    expect(attributeKept('th', 'align', 'CENTER')).toBe(true);
    expect(attributeKept('td', 'align', 'justify')).toBe(false);
    expect(attributeKept('p', 'align', 'right')).toBe(false);
  });

  it('keeps a link or an image address only while it is a safe URL', () => {
    expect(attributeKept('a', 'href', 'https://example.com/terms')).toBe(true);
    expect(attributeKept('a', 'href', 'mailto:legal@example.com')).toBe(true);
    expect(attributeKept('a', 'href', '/public/policies/privacy')).toBe(true);
    expect(attributeKept('a', 'href', ['javascript', 'alert(1)'].join(':'))).toBe(false);
    expect(attributeKept('a', 'href', '//evil.example')).toBe(false);
    expect(attributeKept('img', 'src', 'data:text/html;base64,AAAA')).toBe(false);
  });
});

describe('classesKept', () => {
  it('keeps the callout classes and drops every other token, the old blank class included', () => {
    expect(classesKept('callout callout-doc extra')).toBe('callout callout-doc');
    expect(classesKept('tos-blank')).toBe('');
    expect(classesKept('')).toBe('');
  });
});

describe('relFor', () => {
  it('keeps the new-tab safety and the nofollow the server sent', () => {
    expect(relFor('nofollow')).toBe('nofollow noopener noreferrer');
    expect(relFor('NoFollow ugc')).toBe('nofollow noopener noreferrer');
    expect(relFor('')).toBe('noopener noreferrer');
    expect(relFor(null)).toBe('noopener noreferrer');
  });
});

describe('anchorParts', () => {
  it('splits a text at every anchor of the answer key, in order', () => {
    expect(anchorParts(`I, @@field:${KEY}:full_name@@, of @@field:${KEY}:city@@.`, KEY)).toEqual([
      'I, ',
      { name: 'full_name' },
      ', of ',
      { name: 'city' },
      '.',
    ]);
  });

  it('answers the anchor alone when the text is nothing else', () => {
    expect(anchorParts(`@@field:${KEY}:plan@@`, KEY)).toEqual([{ name: 'plan' }]);
  });

  it('splits two anchors that touch', () => {
    expect(anchorParts(`@@field:${KEY}:city@@@@field:${KEY}:state@@`, KEY)).toEqual([
      { name: 'city' },
      { name: 'state' },
    ]);
  });

  it('leaves anchor-looking text of another key, or of none, as text', () => {
    const other = `@@field:${OTHER}:first_name@@ and @@field:first_name@@`;
    expect(anchorParts(other, KEY)).toEqual([other]);
  });

  it('leaves an anchor whose name holds a character outside the name set as text', () => {
    const text = `@@field:${KEY}:First-Name@@`;
    expect(anchorParts(text, KEY)).toEqual([text]);
  });

  it('never splits without a key of sixteen lower-case letters and digits', () => {
    const text = `@@field:${KEY}:first_name@@`;
    expect(anchorParts(text, '')).toEqual([text]);
    expect(anchorParts(text, '.*')).toEqual([text]);
    expect(anchorParts('@@field:ABC:first_name@@', 'ABC')).toEqual(['@@field:ABC:first_name@@']);
  });

  it('answers nothing for an empty text', () => {
    expect(anchorParts('', KEY)).toEqual([]);
  });
});

describe('anchorNames', () => {
  it('lists the names of the answer key alone', () => {
    const text = `@@field:${KEY}:plan@@ @@field:${OTHER}:city@@ @@field:${KEY}:over_18@@`;
    expect(anchorNames(text, KEY)).toEqual(['plan', 'over_18']);
  });
});

describe('compositeJoin', () => {
  const join = (parts, separators, values) =>
    compositeJoin(parts, separators, name => values[name] || '');

  it('joins every part with the separator that belongs to it', () => {
    expect(join(['a', 'b', 'c'], [', ', ' '], { a: '1 Main St', b: 'Springfield', c: 'IL' })).toBe(
      '1 Main St, Springfield IL'
    );
  });

  it('skips a blank part and its separator', () => {
    expect(join(['a', 'b', 'c'], [', ', ' '], { a: '1 Main St', c: 'IL' })).toBe('1 Main St IL');
  });

  it('draws no separator before the first non-blank part', () => {
    expect(join(['a', 'b', 'c'], [', ', ' '], { b: 'Springfield', c: 'IL' })).toBe(
      'Springfield IL'
    );
  });

  it('answers the empty string when every part is blank', () => {
    expect(join(['a', 'b'], [' '], {})).toBe('');
  });
});

describe('countryName', () => {
  it('names an ISO code in English and leaves other text as it is', () => {
    expect(countryName('US')).toBe('United States');
    expect(countryName('mx')).toBe('Mexico');
    expect(countryName('Narnia')).toBe('Narnia');
    expect(countryName('')).toBe('');
  });
});

describe('blankOf', () => {
  it('mirrors a text value, and an empty blank carries no text and its label', () => {
    expect(draw('first_name', { first_name: 'Ada' })).toEqual({
      error: false,
      text: 'Ada',
      label: 'label:first_name',
      empty: false,
      removed: false,
      changed: false,
    });
    expect(draw('first_name')).toEqual({
      error: false,
      text: '',
      label: 'label:first_name',
      empty: true,
      removed: false,
      changed: false,
    });
  });

  it('mirrors a tel, a country and a state as their inputs hold them', () => {
    expect(draw('phone_number', { phone_number: '+15555550100' })).toMatchObject({
      text: '+15555550100',
    });
    expect(draw('country', { country: 'US' })).toMatchObject({ text: 'US', empty: false });
    expect(draw('state', { state: 'Illinois' })).toMatchObject({ text: 'Illinois' });
  });

  it('draws a composite as its join, a country part by its English name', () => {
    expect(draw('full_name', { first_name: 'Ada', last_name: 'Lovelace' })).toMatchObject({
      text: 'Ada Lovelace',
      empty: false,
    });
    expect(draw('address', { address_line_1: '1 Main St', country: 'US' })).toMatchObject({
      text: '1 Main St, United States',
    });
    expect(draw('full_name')).toMatchObject({ text: '', empty: true, label: 'label:full_name' });
  });

  it('draws a tick box, a date, a choice and a signature by kind', () => {
    expect(draw('over_18', { over_18: true })).toMatchObject({ text: '☑', empty: false });
    expect(draw('over_18', { over_18: false })).toMatchObject({ text: '☐', empty: false });
    expect(draw('start_date', { start_date: '2026-12-01' })).toMatchObject({
      text: 'date:2026-12-01',
    });
    expect(draw('start_date')).toMatchObject({ text: '', empty: true, label: 'Start date' });
    expect(draw('plan', { plan: 'Gold' })).toMatchObject({ text: 'Gold', changed: true });
    expect(draw('plan')).toMatchObject({ text: '', empty: true, changed: true });
    expect(draw('signature', { signature: 'Ada King' })).toMatchObject({ text: 'Ada King' });
  });

  it('draws a removed entry by its label, with no value', () => {
    const fields = [{ name: 'city', kind: 'text', group: 'address', removed: true }];
    expect(draw('city', { city: 'Springfield' }, fields)).toEqual({
      error: false,
      text: 'label:city',
      label: 'label:city',
      empty: false,
      removed: true,
      changed: false,
    });
  });

  it('draws a removed composite from its parts, a removed part by its label', () => {
    const fields = [
      { name: 'first_name', kind: 'text', group: 'identity' },
      { name: 'last_name', kind: 'text', group: 'identity', removed: true },
      {
        name: 'full_name',
        kind: 'composite',
        parts: ['first_name', 'last_name'],
        separators: [' '],
        removed: true,
      },
    ];
    expect(draw('full_name', { first_name: 'Ada' }, fields)).toMatchObject({
      text: 'Ada label:last_name',
      removed: true,
    });
    expect(draw('full_name', {}, fields)).toMatchObject({
      text: 'label:first_name label:last_name',
      removed: true,
    });
  });

  it('answers an error for an anchor with no entry, an unknown kind or a later version', () => {
    expect(draw('missing')).toEqual({ error: true });
    expect(draw('odd', {}, [{ name: 'odd', kind: 'slider' }])).toEqual({ error: true });
    expect(draw('first_name', {}, FIELDS, 2)).toEqual({ error: true });
  });
});

describe('calloutOf', () => {
  it('reads a marker followed by a line break', () => {
    expect(calloutOf('[!NOTE]\nRead this.')).toEqual({
      kind: 'note',
      rest: 'Read this.',
      ended: false,
    });
  });

  it('reads a marker that ends the text', () => {
    expect(calloutOf('[!WARNING]')).toEqual({ kind: 'warning', rest: '', ended: true });
    expect(calloutOf('[!CAUTION]  ')).toEqual({ kind: 'caution', rest: '', ended: true });
  });

  it('reads every kind', () => {
    const words = ['NOTE', 'TIP', 'IMPORTANT', 'WARNING', 'CAUTION'];
    const kinds = words.map(word => calloutOf(`[!${word}]`).kind);
    expect(kinds).toEqual(['note', 'tip', 'important', 'warning', 'caution']);
  });

  it('answers null for other text, an unknown word or a marker followed by text', () => {
    expect(calloutOf('Plain quote.')).toBeNull();
    expect(calloutOf('[!DANGER]\nNo.')).toBeNull();
    expect(calloutOf('[!NOTE] same line')).toBeNull();
  });
});
