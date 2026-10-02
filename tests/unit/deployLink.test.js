import { describe, expect, it } from 'vitest';

import {
  deployHref,
  deployQuery,
  deployTargetOf,
  isLocalTarget,
} from '../../src/features/deploy/utils/deployLink.js';

const boxSeed = {
  box: 'STARTcloud/debian12-server',
  box_version: '1.2.3',
  box_arch: 'amd64',
  box_url: 'https://boxvault.example.com',
};

const provisionerSeed = {
  provisioner: 'STARTcloud/hcl-domino',
  provisioner_version: '2.0.0',
  provisioner_url: 'https://catalog.example.com/hcl-domino-2.0.0.tar.gz',
};

describe('deployQuery', () => {
  it('opens with create=machine and follows with the box members in the agent order', () => {
    expect(deployQuery(boxSeed)).toBe(
      'create=machine&box=STARTcloud%2Fdebian12-server&box_version=1.2.3&box_arch=amd64&box_url=https%3A%2F%2Fboxvault.example.com'
    );
  });

  it('carries the provisioner members in the agent order and leaves the empty ones out', () => {
    expect(deployQuery({ ...provisionerSeed, box: '' })).toBe(
      'create=machine&provisioner=STARTcloud%2Fhcl-domino&provisioner_version=2.0.0&provisioner_url=https%3A%2F%2Fcatalog.example.com%2Fhcl-domino-2.0.0.tar.gz'
    );
  });

  it('answers create=machine alone for an empty seed', () => {
    expect(deployQuery({})).toBe('create=machine');
    expect(deployQuery(null)).toBe('create=machine');
  });

  it('orders the members as the agent lists them whatever the seed order', () => {
    const query = deployQuery({ box_url: 'u', box: 'b', box_arch: 'a', box_version: 'v' });
    expect([...new URLSearchParams(query).keys()]).toEqual([
      'create',
      'box',
      'box_version',
      'box_arch',
      'box_url',
    ]);
  });
});

describe('deployTargetOf', () => {
  it('answers local without claims, without the claim and without a hyperweaver entry', () => {
    expect(deployTargetOf(null)).toBe('local');
    expect(deployTargetOf({ sub: 'x' })).toBe('local');
    expect(deployTargetOf({ integrations: [{ id: 'other', settings: {} }] })).toBe('local');
  });

  it('answers local while deploy_target is local or absent', () => {
    expect(
      deployTargetOf({
        integrations: [{ id: 'hyperweaver', settings: { deploy_target: 'local' } }],
      })
    ).toBe('local');
    expect(deployTargetOf({ integrations: [{ id: 'hyperweaver', settings: {} }] })).toBe('local');
    expect(deployTargetOf({ integrations: [{ id: 'hyperweaver' }] })).toBe('local');
  });

  it('answers the origin deploy_target names', () => {
    expect(
      deployTargetOf({
        integrations: [
          {
            id: 'hyperweaver',
            status: 'connected',
            settings: { deploy_target: 'https://hw.example.com' },
          },
        ],
      })
    ).toBe('https://hw.example.com');
  });
});

describe('deployHref', () => {
  it('answers the protocol link for the local target', () => {
    expect(deployHref('local', boxSeed)).toBe(
      'hwa://open?create=machine&box=STARTcloud%2Fdebian12-server&box_version=1.2.3&box_arch=amd64&box_url=https%3A%2F%2Fboxvault.example.com'
    );
  });

  it('answers the origin page for a server target, the origin without a trailing slash', () => {
    expect(deployHref('https://hw.example.com', provisionerSeed)).toBe(
      'https://hw.example.com/?create=machine&provisioner=STARTcloud%2Fhcl-domino&provisioner_version=2.0.0&provisioner_url=https%3A%2F%2Fcatalog.example.com%2Fhcl-domino-2.0.0.tar.gz'
    );
    expect(deployHref('https://hw.example.com/', boxSeed)).toMatch(
      /^https:\/\/hw\.example\.com\/\?create=machine&box=/u
    );
  });

  it('keeps the query under the agent limit for the two seeds', () => {
    expect(deployHref('local', boxSeed).length).toBeLessThan(2048);
  });
});

describe('isLocalTarget', () => {
  it('is true for local alone', () => {
    expect(isLocalTarget('local')).toBe(true);
    expect(isLocalTarget('https://hw.example.com')).toBe(false);
  });
});
