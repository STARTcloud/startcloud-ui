import { describe, expect, it } from 'vitest';

import { apiReference } from '../../src/features/hosts/apiReference.js';

const server = {
  role: 'hyperweaver-server',
  features: ['hosts'],
  links: { docs: '', contact: '', api: '/api-docs' },
};

const agent = { ...server, role: 'hyperweaver-agent' };

describe('apiReference', () => {
  it('answers Server API alone with no host in the route', () => {
    expect(apiReference(server, '/')).toEqual([
      { key: 'server-api', labelKey: 'hosts.api.server', href: '/api-docs' },
    ]);
  });

  it('answers Agent API after it on a host route and on the routes under it', () => {
    const agentRow = {
      key: 'agent-api',
      labelKey: 'hosts.api.agent',
      href: '/agent/api-docs?server=4',
    };
    expect(apiReference(server, '/hosts/4')[1]).toEqual(agentRow);
    expect(apiReference(server, '/hosts/4/machines/web-1')[1]).toEqual(agentRow);
  });

  it('answers null on an agent role, without hosts and without links.api', () => {
    expect(apiReference(agent, '/hosts/self')).toBeNull();
    expect(apiReference({ ...server, features: [] }, '/hosts/4')).toBeNull();
    expect(apiReference({ ...server, links: { docs: '', contact: '' } }, '/hosts/4')).toBeNull();
  });
});
