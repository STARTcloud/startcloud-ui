import { describe, expect, it } from 'vitest';

import { INBOX_EVENTS, applyInboxEvent, applyInboxPage } from '../../src/utils/inboxEvents.js';

const STAMP = '2026-10-07T12:00:00Z';

const rowOf = (id, readAt = null) => ({ id, title: `Row ${id}`, read_at: readAt });

const rows = () => [rowOf('a'), rowOf('b', '2026-10-01T00:00:00Z'), rowOf('c')];

describe('INBOX_EVENTS', () => {
  it('names the six row events of the notifications topic', () => {
    expect(INBOX_EVENTS).toEqual([
      'notification-created',
      'notification-read',
      'notification-unread',
      'notification-dismissed',
      'inbox-read-all',
      'inbox-cleared',
    ]);
  });
});

describe('applyInboxEvent', () => {
  it('puts a created row first and cuts the list to its size', () => {
    const next = applyInboxEvent(rows(), 'notification-created', rowOf('d'), 3);
    expect(next.map(row => row.id)).toEqual(['d', 'a', 'b']);
  });

  it('keeps the same rows for a created row it already holds or one without an id', () => {
    const held = rows();
    expect(applyInboxEvent(held, 'notification-created', rowOf('a'))).toBe(held);
    expect(applyInboxEvent(held, 'notification-created', { title: 'x' })).toBe(held);
  });

  it('stamps a read row with the event read_at and leaves the others', () => {
    const next = applyInboxEvent(rows(), 'notification-read', { id: 'a', read_at: STAMP });
    expect(next.find(row => row.id === 'a').read_at).toBe(STAMP);
    expect(next.find(row => row.id === 'c').read_at).toBeNull();
  });

  it('keeps the same rows for a read event without read_at or for a row it does not hold', () => {
    const held = rows();
    expect(applyInboxEvent(held, 'notification-read', { id: 'a' })).toBe(held);
    expect(applyInboxEvent(held, 'notification-read', { id: 'z', read_at: STAMP })).toBe(held);
  });

  it('puts a row back to unread and keeps an unread row as it is', () => {
    const held = rows();
    const next = applyInboxEvent(held, 'notification-unread', { id: 'b' });
    expect(next.find(row => row.id === 'b').read_at).toBeNull();
    expect(applyInboxEvent(held, 'notification-unread', { id: 'a' })).toBe(held);
  });

  it('removes a dismissed row and keeps the list for one it does not hold', () => {
    const held = rows();
    expect(applyInboxEvent(held, 'notification-dismissed', { id: 'b' }).map(row => row.id)).toEqual(
      ['a', 'c']
    );
    expect(applyInboxEvent(held, 'notification-dismissed', { id: 'z' })).toBe(held);
  });

  it('stamps every unread row on read-all and keeps the read ones', () => {
    const next = applyInboxEvent(rows(), 'inbox-read-all', { read_at: STAMP });
    expect(next.map(row => row.read_at)).toEqual([STAMP, '2026-10-01T00:00:00Z', STAMP]);
  });

  it('keeps the rows on read-all when every row is read or no read_at came', () => {
    const read = [rowOf('a', STAMP)];
    expect(applyInboxEvent(read, 'inbox-read-all', { read_at: STAMP })).toBe(read);
    const held = rows();
    expect(applyInboxEvent(held, 'inbox-read-all', {})).toBe(held);
  });

  it('empties the list on cleared', () => {
    expect(applyInboxEvent(rows(), 'inbox-cleared', {})).toEqual([]);
    const none = [];
    expect(applyInboxEvent(none, 'inbox-cleared', {})).toBe(none);
  });

  it('keeps the rows for an event it does not name', () => {
    const held = rows();
    expect(applyInboxEvent(held, 'unread-count', { count: 1 })).toBe(held);
  });
});

describe('applyInboxPage', () => {
  const listing = () => ({ rows: rows(), total: 30, totalPages: 2 });

  it('puts a created row on the first page and counts it', () => {
    const next = applyInboxPage(listing(), 'notification-created', rowOf('d'), {
      size: 25,
      first: true,
    });
    expect(next.rows[0].id).toBe('d');
    expect(next.total).toBe(31);
    expect(next.totalPages).toBe(2);
  });

  it('counts a created row on a later page without drawing it', () => {
    const held = listing();
    const next = applyInboxPage(held, 'notification-created', rowOf('d'), {
      size: 10,
      first: false,
    });
    expect(next.rows).toBe(held.rows);
    expect(next.total).toBe(31);
    expect(next.totalPages).toBe(4);
  });

  it('does not count a created row the first page already holds', () => {
    const held = listing();
    expect(
      applyInboxPage(held, 'notification-created', rowOf('a'), { size: 25, first: true })
    ).toBe(held);
  });

  it('takes a dismissed row away from the rows and the total', () => {
    const next = applyInboxPage(
      listing(),
      'notification-dismissed',
      { id: 'a' },
      {
        size: 25,
        first: true,
      }
    );
    expect(next.rows.map(row => row.id)).toEqual(['b', 'c']);
    expect(next.total).toBe(29);
  });

  it('leaves the total for a dismissed row the page does not hold', () => {
    const held = listing();
    expect(
      applyInboxPage(held, 'notification-dismissed', { id: 'z' }, { size: 25, first: true })
    ).toBe(held);
  });

  it('answers an empty page on cleared', () => {
    expect(applyInboxPage(listing(), 'inbox-cleared', {}, { size: 25, first: false })).toEqual({
      rows: [],
      total: 0,
      totalPages: 0,
    });
  });

  it('flips a read row and keeps the total', () => {
    const next = applyInboxPage(
      listing(),
      'notification-read',
      { id: 'c', read_at: STAMP },
      {
        size: 25,
        first: false,
      }
    );
    expect(next.rows[2].read_at).toBe(STAMP);
    expect(next.total).toBe(30);
  });
});
