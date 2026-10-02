import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../src/lib/runtime.js', () => ({
  client: {
    get: vi.fn(),
    put: vi.fn(),
    post: vi.fn(),
    request: vi.fn(),
  },
}));

const { client } = await import('../../src/lib/runtime.js');
const { hostConfig } = await import('../../src/features/hosts/api/agentSettings.js');

const server = { role: 'hyperweaver-server' };
const agent = { role: 'hyperweaver-agent' };

beforeEach(() => {
  vi.resetAllMocks();
  client.get.mockResolvedValue({});
  client.put.mockResolvedValue({});
  client.post.mockResolvedValue({});
  client.request.mockResolvedValue({});
});

describe('hostConfig', () => {
  it('reads and writes the file through the server proxy on the server role', async () => {
    const config = hostConfig(server, 1);
    await config.get('machines');
    expect(client.get).toHaveBeenCalledWith('/api/agents/1/config/machines');
    await config.update('machines', { machines: { base_directory: '/srv' } });
    expect(client.put).toHaveBeenCalledWith('/api/agents/1/config/machines', {
      machines: { base_directory: '/srv' },
    });
    await config.restartStatus();
    expect(client.get).toHaveBeenCalledWith('/api/agents/1/config/restart-status');
    await config.restart();
    expect(client.post).toHaveBeenCalledWith('/api/agents/1/config/restart', {});
  });

  it('reads the agent at its own origin on an agent role', async () => {
    const config = hostConfig(agent, 'self');
    await config.get('app');
    expect(client.get).toHaveBeenCalledWith('/api/config/app');
    await config.restartStatus();
    expect(client.get).toHaveBeenCalledWith('/api/config/restart-status');
  });

  it('fetches a schema once per host and name and forgets a failed fetch', async () => {
    client.get.mockResolvedValue({ title: 'Machines' });
    const config = hostConfig(server, 2);
    const [first, second] = await Promise.all([
      config.schema('machines'),
      config.schema('machines'),
    ]);
    expect(first).toEqual({ title: 'Machines' });
    expect(second).toEqual({ title: 'Machines' });
    expect(client.get).toHaveBeenCalledTimes(1);
    expect(client.get).toHaveBeenCalledWith('/api/agents/2/config/machines/schema');
    await hostConfig(server, 3).schema('machines');
    expect(client.get).toHaveBeenCalledTimes(2);
    expect(client.get).toHaveBeenLastCalledWith('/api/agents/3/config/machines/schema');
    client.get.mockRejectedValueOnce(new Error('Not Found'));
    await expect(hostConfig(server, 4).schema('storage')).rejects.toThrow('Not Found');
    await hostConfig(server, 4).schema('storage');
    expect(client.get).toHaveBeenCalledTimes(4);
  });

  it('sends an action route to the agent as the path under its /api', async () => {
    const config = hostConfig(server, 1);
    await config.action('/api/config/machines/test', 'POST', { machines: {} });
    expect(client.request).toHaveBeenCalledWith({
      method: 'POST',
      path: '/api/agents/1/config/machines/test',
      body: { machines: {} },
      contentType: 'json',
    });
    const form = new FormData();
    await hostConfig(agent, 'self').action('/api/config/app/upload', 'POST', form);
    expect(client.request).toHaveBeenLastCalledWith({
      method: 'POST',
      path: '/api/config/app/upload',
      body: form,
      contentType: 'form',
    });
  });
});
