import { describe, expect, it } from 'vitest';

import {
  ISSUER_TOPICS,
  streamTargetFor,
  streamsEvents,
  streamsNotifications,
} from '../../src/lib/streamTarget.js';

const ORIGIN = 'https://boxvault.example.com';
const ISSUER = 'https://auth.example.com';

const idpHost = more => ({
  auth: ['idp'],
  idp: { issuer: ISSUER, client_id: 'catalog', scopes: 'openid', storage_prefix: 'catalog' },
  features: ['notifications'],
  ...more,
});

describe('streamTargetFor', () => {
  it('opens a same-origin events path on the serving origin', () => {
    const status = {
      auth: ['backend'],
      features: ['events'],
      events: { path: '/api/events', topics: ['session', 'notifications'] },
    };
    expect(streamTargetFor(status, ORIGIN)).toEqual({
      origin: ORIGIN,
      path: '/api/events',
      topics: ['session', 'notifications'],
    });
  });

  it('drops an events path on another host or a protocol-relative one', () => {
    const elsewhere = { features: ['events'], events: { path: 'https://evil.example.com/x' } };
    const relative = { features: ['events'], events: { path: '//evil.example.com/x' } };
    expect(streamTargetFor(elsewhere, ORIGIN)).toBeNull();
    expect(streamTargetFor(relative, ORIGIN)).toBeNull();
  });

  it("opens the identity provider's stream on an idp host that lists notifications and no events", () => {
    expect(streamTargetFor(idpHost(), ORIGIN)).toEqual({
      origin: ISSUER,
      path: '/api/events',
      topics: ISSUER_TOPICS,
    });
    expect(ISSUER_TOPICS).toEqual(['notifications', 'session']);
  });

  it("admits on an idp host an events path that is the identity provider's own stream", () => {
    const status = idpHost({
      features: ['notifications', 'events'],
      events: { path: `${ISSUER}/api/events`, topics: ['notifications'] },
    });
    expect(streamTargetFor(status, ORIGIN)).toEqual({
      origin: ISSUER,
      path: '/api/events',
      topics: ['notifications'],
    });
  });

  it("drops the identity provider's URL on a host that is not idp", () => {
    const status = {
      auth: ['backend'],
      features: ['events'],
      events: { path: `${ISSUER}/api/events`, topics: ['notifications'] },
    };
    expect(streamTargetFor(status, ORIGIN)).toBeNull();
  });

  it('opens nothing on an idp host without notifications or on a host without a stream', () => {
    expect(streamTargetFor(idpHost({ features: ['deploy'] }), ORIGIN)).toBeNull();
    expect(streamTargetFor({ auth: ['backend'], features: ['health'] }, ORIGIN)).toBeNull();
  });
});

describe('streamsEvents and streamsNotifications', () => {
  it('say whether a stream opens and whether it carries the notifications topic', () => {
    const agent = {
      auth: ['apikey'],
      features: ['events'],
      events: { path: '/api/events', topics: ['health', 'tasks'] },
    };
    expect(streamsEvents(agent)).toBe(true);
    expect(streamsNotifications(agent)).toBe(false);
    expect(streamsEvents(idpHost())).toBe(true);
    expect(streamsNotifications(idpHost())).toBe(true);
    expect(streamsEvents({ auth: ['backend'], features: [] })).toBe(false);
  });
});
