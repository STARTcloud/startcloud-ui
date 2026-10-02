import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../src/features/hosts/api/agentSettings.js', () => ({
  hostConfig: vi.fn(),
}));

const api = await import('../../src/features/hosts/api/agentSettings.js');
const { configNamesOf, configNodes, configPath } =
  await import('../../src/features/hosts/utils/configNodes.js');

const status = { role: 'hyperweaver-server' };

const rowOf = config => ({ id: 1, capabilities: { config } });

beforeEach(() => {
  vi.resetAllMocks();
});

describe('configNamesOf', () => {
  it('answers the names of the row and none without the list', () => {
    expect(configNamesOf(rowOf(['app', 'machines']))).toEqual(['app', 'machines']);
    expect(configNamesOf(rowOf(undefined))).toEqual([]);
    expect(configNamesOf({ capabilities: null })).toEqual([]);
    expect(configNamesOf(null)).toEqual([]);
  });
});

describe('configPath', () => {
  it('answers the file route under the host, both segments encoded', () => {
    expect(configPath(1, 'machines')).toBe('/hosts/1/settings/machines');
    expect(configPath('self', 'a b')).toBe('/hosts/self/settings/a%20b');
  });
});

describe('configNodes', () => {
  it('answers one node per name in list order, titled by the schema and by the name until it answers', async () => {
    const schema = vi.fn(name =>
      name === 'machines'
        ? Promise.resolve({ title: 'Machines' })
        : Promise.reject(new Error('404'))
    );
    api.hostConfig.mockReturnValue({ schema });
    const nodes = await configNodes(status, rowOf(['app', 'machines', 'storage']));
    expect(api.hostConfig).toHaveBeenCalledWith(status, 1);
    expect(nodes).toEqual([
      { key: 'config:1:app', label: 'app', to: '/hosts/1/settings/app' },
      { key: 'config:1:machines', label: 'Machines', to: '/hosts/1/settings/machines' },
      { key: 'config:1:storage', label: 'storage', to: '/hosts/1/settings/storage' },
    ]);
    expect(schema.mock.calls.map(([name]) => name)).toEqual(['app', 'machines', 'storage']);
  });

  it('labels a file by its name while the schema carries no title', async () => {
    api.hostConfig.mockReturnValue({ schema: vi.fn().mockResolvedValue({}) });
    const nodes = await configNodes(status, rowOf(['db']));
    expect(nodes).toEqual([{ key: 'config:1:db', label: 'db', to: '/hosts/1/settings/db' }]);
  });

  it('answers none for a row without capabilities.config and asks nothing', async () => {
    expect(await configNodes(status, rowOf(undefined))).toEqual([]);
    expect(await configNodes(status, rowOf([]))).toEqual([]);
    expect(api.hostConfig).not.toHaveBeenCalled();
  });
});
