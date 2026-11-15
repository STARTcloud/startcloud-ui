import { describe, expect, it } from 'vitest';

import { hasFeature, hasFeatureStrict, isFeatureEntry } from '../../src/utils/capabilities.js';

const plain = { features: ['local-accounts', 'tfa', 'onboarding'] };
const parted = { features: ['local-accounts', { tfa: ['app', 'sms', 'passkey'] }, 'onboarding'] };
const nested = {
  features: [{ integrations: ['search', { hyperweaver: ['deploy', { agents: ['tray'] }] }] }],
};

describe('hasFeature', () => {
  it('finds a feature listed as a string', () => {
    expect(hasFeature(plain, 'tfa')).toBe(true);
    expect(hasFeature(plain, 'onboarding')).toBe(true);
  });

  it('finds a feature listed as an object whose one key is its token', () => {
    expect(hasFeature(parted, 'tfa')).toBe(true);
    expect(hasFeature(parted, 'local-accounts')).toBe(true);
    expect(hasFeature({ features: [{ tfa: [] }] }, 'tfa')).toBe(true);
  });

  it("finds a sub flag inside its feature's list", () => {
    expect(hasFeature(parted, 'tfa', 'app')).toBe(true);
    expect(hasFeature(parted, 'tfa', 'sms')).toBe(true);
    expect(hasFeature(parted, 'tfa', 'passkey')).toBe(true);
  });

  it('finds a sub flag to any depth, each level a string or a one-key object', () => {
    expect(hasFeature(nested, 'integrations', 'search')).toBe(true);
    expect(hasFeature(nested, 'integrations', 'hyperweaver')).toBe(true);
    expect(hasFeature(nested, 'integrations', 'hyperweaver', 'deploy')).toBe(true);
    expect(hasFeature(nested, 'integrations', 'hyperweaver', 'agents')).toBe(true);
    expect(hasFeature(nested, 'integrations', 'hyperweaver', 'agents', 'tray')).toBe(true);
    expect(hasFeature(nested, 'integrations', 'hyperweaver', 'agents', 'desktop')).toBe(false);
    expect(hasFeature(nested, 'integrations', 'agents')).toBe(false);
  });

  it('answers false for a sub flag the feature does not list and ignores one nobody asks for', () => {
    const status = { features: [{ tfa: ['app', 'carrier-pigeon'] }] };
    expect(hasFeature(status, 'tfa', 'sms')).toBe(false);
    expect(hasFeature(status, 'tfa', 'app')).toBe(true);
    expect(hasFeature(status, 'tfa')).toBe(true);
  });

  it('answers false for a feature the list does not carry', () => {
    expect(hasFeature(plain, 'admin')).toBe(false);
    expect(hasFeature(parted, 'admin')).toBe(false);
    expect(hasFeature(parted, 'admin', 'users')).toBe(false);
    expect(hasFeature(parted, 'sms')).toBe(false);
    expect(hasFeature({ features: [] }, 'tfa')).toBe(false);
  });

  it('reads a list of plain strings as it is', () => {
    expect(plain.features.map(token => hasFeature(plain, token))).toEqual([true, true, true]);
  });

  it('answers false for a sub flag asked of a string entry', () => {
    expect(hasFeature(plain, 'tfa', 'sms')).toBe(false);
    expect(hasFeature(plain, 'tfa', 'app')).toBe(false);
  });

  it('matches no entry that is not a string or a one-key object', () => {
    const status = { features: [{ tfa: ['app'], admin: [] }, {}, null, 7, ['tfa'], 'health'] };
    expect(hasFeature(status, 'tfa')).toBe(false);
    expect(hasFeature(status, 'admin')).toBe(false);
    expect(hasFeature(status, 'health')).toBe(true);
  });

  it('finds no sub flag in an object entry whose value is not a list', () => {
    const status = { features: [{ tfa: 'sms' }] };
    expect(hasFeature(status, 'tfa')).toBe(true);
    expect(hasFeature(status, 'tfa', 'sms')).toBe(false);
  });

  it('renders everything, sub flags included, for a host whose features is not an array', () => {
    expect(hasFeature({}, 'tfa')).toBe(true);
    expect(hasFeature({}, 'tfa', 'sms')).toBe(true);
    expect(hasFeature(null, 'admin')).toBe(true);
    expect(hasFeature({ features: 'tfa' }, 'admin')).toBe(true);
  });
});

describe('hasFeatureStrict', () => {
  it('matches a string and a one-key object the way hasFeature does', () => {
    expect(hasFeatureStrict(plain, 'tfa')).toBe(true);
    expect(hasFeatureStrict(parted, 'tfa')).toBe(true);
    expect(hasFeatureStrict(parted, 'tfa', 'sms')).toBe(true);
    expect(hasFeatureStrict(plain, 'tfa', 'sms')).toBe(false);
    expect(hasFeatureStrict(parted, 'admin')).toBe(false);
  });

  it('answers false for a host whose features is not an array', () => {
    expect(hasFeatureStrict({}, 'tfa')).toBe(false);
    expect(hasFeatureStrict({}, 'tfa', 'sms')).toBe(false);
    expect(hasFeatureStrict(null, 'hosts')).toBe(false);
    expect(hasFeatureStrict(undefined, 'hosts')).toBe(false);
  });

  it("reads a host row's capabilities the way it reads the status", () => {
    const capabilities = { hypervisors: ['bhyve'], features: ['machines', { tasks: ['stream'] }] };
    expect(hasFeatureStrict(capabilities, 'machines')).toBe(true);
    expect(hasFeatureStrict(capabilities, 'tasks')).toBe(true);
    expect(hasFeatureStrict(capabilities, 'tasks', 'stream')).toBe(true);
    expect(hasFeatureStrict(capabilities, 'host-terminal')).toBe(false);
    expect(hasFeatureStrict({ hypervisors: ['bhyve'] }, 'machines')).toBe(false);
  });
});

describe('isFeatureEntry', () => {
  it('admits a string and a one-key object over a list of entries, to any depth', () => {
    expect(isFeatureEntry('tfa')).toBe(true);
    expect(isFeatureEntry({ tfa: [] })).toBe(true);
    expect(isFeatureEntry({ tfa: ['app', 'sms'] })).toBe(true);
    expect(nested.features.every(entry => isFeatureEntry(entry))).toBe(true);
  });

  it('refuses every other value, at any depth', () => {
    expect(isFeatureEntry({})).toBe(false);
    expect(isFeatureEntry({ tfa: ['app'], admin: [] })).toBe(false);
    expect(isFeatureEntry({ tfa: 'sms' })).toBe(false);
    expect(isFeatureEntry({ tfa: ['app', 7] })).toBe(false);
    expect(isFeatureEntry({ tfa: [{ sms: [{}] }] })).toBe(false);
    expect(isFeatureEntry(['tfa'])).toBe(false);
    expect(isFeatureEntry(null)).toBe(false);
    expect(isFeatureEntry(7)).toBe(false);
  });
});
