import { describe, expect, it } from 'vitest';

import { SELF, agentPath, isServerRole, selfServer } from '../../src/features/hosts/utils/hosts.js';

const server = { role: 'hyperweaver-server' };
const goAgent = { role: 'hyperweaver-agent', hostname: 'lab-1' };
const nodeAgent = { role: 'zoneweaver-agent', hostname: 'zone-1' };

describe('isServerRole', () => {
  it('answers true on the hyperweaver-server role alone', () => {
    expect(isServerRole(server)).toBe(true);
    expect(isServerRole(goAgent)).toBe(false);
    expect(isServerRole(nodeAgent)).toBe(false);
  });
});

describe('agentPath', () => {
  it('addresses an agent through the server proxy on the server role', () => {
    expect(agentPath(server, 1, 'stats')).toBe('/api/agents/1/stats');
    expect(agentPath(server, 1, 'api/status')).toBe('/api/agents/1/api/status');
  });

  it('addresses the serving agent at its own origin on an agent role', () => {
    expect(agentPath(goAgent, SELF, 'stats')).toBe('/api/stats');
    expect(agentPath(nodeAgent, SELF, 'stats')).toBe('/api/stats');
    expect(agentPath(goAgent, SELF, 'machines')).toBe('/api/machines');
  });

  it('encodes the id', () => {
    expect(agentPath(server, 'a b/c', 'stats')).toBe('/api/agents/a%20b%2Fc/stats');
  });
});

describe('selfServer', () => {
  it('answers the self id with the status as its capabilities row', () => {
    const row = selfServer(goAgent);
    expect(row.id).toBe('self');
    expect(row.hostname).toBe('lab-1');
    expect(row.entityName).toBe('');
    expect(row.capabilities).toBe(goAgent);
  });
});
