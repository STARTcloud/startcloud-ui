import { client } from '../../../lib/runtime';

export const stats = () => client.get('/api/admin/stats');

export const loginHeatmap = days => client.get('/api/admin/login-heatmap', { params: { days } });

export const restartStatus = () => client.get('/api/config/restart-status');

export const restart = () => client.post('/api/config/restart', {});
