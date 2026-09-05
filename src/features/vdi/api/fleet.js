import { encodePath } from '../../../lib/apiClient';
import { client } from '../../../lib/runtime';

const PUBLIC = { auth: false };

const vmPath = id => encodePath('api', 'vdi', 'vms', id);

export const fetchFleet = () => client.get('/api/vdi/fleet');

export const fetchPools = () => client.get('/api/vdi/pools');

export const fetchVm = id => client.get(vmPath(id));

export const fetchHistory = (id, { since, limit, category } = {}) =>
  client.get(`${vmPath(id)}/history`, { params: { since, limit, category } });

export const fetchStats = (id, { since } = {}) =>
  client.get(`${vmPath(id)}/stats`, { params: { since } });

export const fetchGrafana = () => client.get('/api/config/grafana', PUBLIC);
