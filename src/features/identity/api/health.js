import { client } from '../../../lib/runtime';

export const serviceUsage = () => client.get('/api/admin/service-usage');

export const insights = () => client.get('/api/admin/insights');

export const clientHealth = () => client.get('/api/admin/client-health');
