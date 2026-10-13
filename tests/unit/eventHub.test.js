import { beforeEach, describe, expect, it, vi } from 'vitest';

const opened = { onEvent: null, onReady: null, onReset: null };

vi.mock('../../src/lib/sse.js', () => ({
  openEventStream: options => {
    opened.onEvent = options.onEvent;
    opened.onReady = options.onReady;
    opened.onReset = options.onReset;
    return () => undefined;
  },
}));

const { createEventHub } = await import('../../src/lib/eventHub.js');

describe('the event hub remembers the last named event', () => {
  let hub;

  beforeEach(() => {
    hub = createEventHub();
    hub.connect({ url: '/api/events', topics: ['fleet'], headers: {} });
  });

  it('answers null before any named event and ignores ready and reset', () => {
    expect(hub.lastEventAt()).toBeNull();
    opened.onReady({ id: '1' }, false);
    opened.onReset({});
    expect(hub.lastEventAt()).toBeNull();
  });

  it('stamps the time a named event arrives and tells its listeners', () => {
    const seen = [];
    const off = hub.onEvent(at => seen.push(at));
    const before = Date.now();
    opened.onEvent('vm-updated', { instance_id: 'i-1' }, '2');
    expect(hub.lastEventAt()).toBeGreaterThanOrEqual(before);
    expect(seen).toEqual([hub.lastEventAt()]);
    off();
    opened.onEvent('vm-updated', { instance_id: 'i-2' }, '3');
    expect(seen).toHaveLength(1);
  });

  it('still hands the event to its subscribers', () => {
    const handler = vi.fn();
    hub.subscribe('vm-removed', handler);
    opened.onEvent('vm-removed', { instance_id: 'i-1' }, '4');
    expect(handler).toHaveBeenCalledWith({ instance_id: 'i-1' }, '4');
  });
});
