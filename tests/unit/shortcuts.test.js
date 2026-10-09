import { describe, expect, it } from 'vitest';

import {
  CATEGORIES,
  comboOf,
  filterRows,
  groupRows,
  isActivation,
  isEditableTarget,
  partsOf,
  resolve,
} from '../../src/lib/shortcuts.js';

const rows = [
  { key: 'home', category: 'jump', labelKey: 'home', keys: [['g', 'h']] },
  { key: 'search', category: 'search', labelKey: 'search', keys: [['/'], ['ctrl+alt+f']] },
  { key: 'help', category: 'application', labelKey: 'help', keys: [['?']] },
  { key: 'logout', category: 'application', labelKey: 'logout', keys: [['shift+z', 'shift+z']] },
  { key: 'bulk', category: 'actions', labelKey: 'bulk', keys: [['shift+b']] },
  { key: 'open', category: 'navigation', labelKey: 'open', keys: [['o'], ['enter']] },
];

const target = selector => ({ closest: query => (query.includes(selector) ? {} : null) });

describe('isEditableTarget', () => {
  it('names an input, a select, a textarea and an editable element', () => {
    expect(isEditableTarget(target('input'))).toBe(true);
    expect(isEditableTarget(target('textarea'))).toBe(true);
    expect(isEditableTarget({ closest: () => null })).toBe(false);
    expect(isEditableTarget(null)).toBe(false);
  });
});

describe('isActivation', () => {
  it('leaves Enter and Ctrl+Enter to a link, a button or a menu row', () => {
    expect(isActivation('enter', target('button'))).toBe(true);
    expect(isActivation('ctrl+enter', target('a[href]'))).toBe(true);
    expect(isActivation('enter', target('[role="menuitem"]'))).toBe(true);
  });

  it('fires Enter on a row or the body and every other key anywhere', () => {
    expect(isActivation('enter', { closest: () => null })).toBe(false);
    expect(isActivation('enter', null)).toBe(false);
    expect(isActivation('o', target('button'))).toBe(false);
    expect(isActivation('shift+b', target('a[href]'))).toBe(false);
  });
});

describe('comboOf', () => {
  it('lowercases a letter and names shift before it', () => {
    expect(comboOf({ key: 'g' })).toBe('g');
    expect(comboOf({ key: 'Z', shiftKey: true })).toBe('shift+z');
    expect(comboOf({ key: 'B', shiftKey: true })).toBe('shift+b');
  });

  it('leaves shift off a symbol the key already says', () => {
    expect(comboOf({ key: '?', shiftKey: true })).toBe('?');
    expect(comboOf({ key: '#', shiftKey: true })).toBe('#');
    expect(comboOf({ key: '/' })).toBe('/');
    expect(comboOf({ key: '=' })).toBe('=');
  });

  it('names control, command and alt before the key', () => {
    expect(comboOf({ key: 'f', ctrlKey: true, altKey: true })).toBe('ctrl+alt+f');
    expect(comboOf({ key: 'f', metaKey: true, altKey: true })).toBe('ctrl+alt+f');
    expect(comboOf({ key: '/', ctrlKey: true })).toBe('ctrl+/');
    expect(comboOf({ key: 'Enter', ctrlKey: true })).toBe('ctrl+enter');
    expect(comboOf({ key: 'Enter' })).toBe('enter');
  });

  it('answers nothing for a modifier pressed alone', () => {
    expect(comboOf({ key: 'Shift', shiftKey: true })).toBe('');
    expect(comboOf({ key: 'Control', ctrlKey: true })).toBe('');
    expect(comboOf({ key: '' })).toBe('');
  });
});

describe('resolve', () => {
  it('fires a plain key and either alternative', () => {
    expect(resolve(rows, '', '?').hit.key).toBe('help');
    expect(resolve(rows, '', '/').hit.key).toBe('search');
    expect(resolve(rows, '', 'ctrl+alt+f').hit.key).toBe('search');
    expect(resolve(rows, '', 'shift+b').hit.key).toBe('bulk');
    expect(resolve(rows, '', 'enter').hit.key).toBe('open');
  });

  it('holds a chord start and fires on the very next key', () => {
    const started = resolve(rows, '', 'g');
    expect(started).toEqual({ pending: 'g', hit: null });
    expect(resolve(rows, started.pending, 'h').hit.key).toBe('home');
  });

  it('cancels a chord on any other key, that key firing nothing', () => {
    const cancelled = resolve(rows, 'g', '?');
    expect(cancelled).toEqual({ pending: '', hit: null });
    expect(resolve(rows, 'g', 'x')).toEqual({ pending: '', hit: null });
  });

  it('keeps a pending chord over a modifier pressed alone', () => {
    const first = resolve(rows, '', 'shift+z');
    expect(first).toEqual({ pending: 'shift+z', hit: null });
    const held = resolve(rows, first.pending, '');
    expect(held).toEqual({ pending: 'shift+z', hit: null });
    expect(resolve(rows, held.pending, 'shift+z').hit.key).toBe('logout');
  });

  it('holds nothing for a key no row names', () => {
    expect(resolve(rows, '', 'q')).toEqual({ pending: '', hit: null });
  });
});

describe('partsOf', () => {
  it('names the modifiers and uppercases a letter', () => {
    expect(partsOf('ctrl+alt+f')).toEqual([
      { name: 'ctrl', text: '' },
      { name: 'alt', text: '' },
      { name: '', text: 'F' },
    ]);
    expect(partsOf('shift+z')).toEqual([
      { name: 'shift', text: '' },
      { name: '', text: 'Z' },
    ]);
    expect(partsOf('?')).toEqual([{ name: '', text: '?' }]);
    expect(partsOf('enter')).toEqual([{ name: 'enter', text: '' }]);
  });
});

describe('filterRows', () => {
  const labelOf = row => `Label ${row.key}`;

  it('keeps every row while nothing is typed', () => {
    expect(filterRows(rows, '  ', labelOf)).toBe(rows);
  });

  it('matches the description and the key combination', () => {
    expect(filterRows(rows, 'HOME', labelOf).map(row => row.key)).toEqual(['home']);
    expect(filterRows(rows, 'g h', labelOf).map(row => row.key)).toEqual(['home']);
    expect(filterRows(rows, 'ctrl alt', labelOf).map(row => row.key)).toEqual(['search']);
    expect(filterRows(rows, 'shift', labelOf).map(row => row.key)).toEqual(['logout', 'bulk']);
  });
});

describe('groupRows', () => {
  it('groups by category in the categories order, an empty category left out', () => {
    const groups = groupRows(rows);
    expect(CATEGORIES).toEqual(['jump', 'application', 'navigation', 'actions', 'search']);
    expect(groups.map(group => group.category)).toEqual([
      'jump',
      'application',
      'navigation',
      'actions',
      'search',
    ]);
    expect(groups[1].rows.map(row => row.key)).toEqual(['help', 'logout']);
    expect(groupRows([]).length).toBe(0);
  });
});
