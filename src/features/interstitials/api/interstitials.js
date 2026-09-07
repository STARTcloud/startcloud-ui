import { client } from '../../../lib/runtime';

const JSON_ACCEPT = { Accept: 'application/json' };
const SESSION = { headers: JSON_ACCEPT };
const OPTIONAL = { auth: 'optional', headers: JSON_ACCEPT };

export const consent = params => client.get('/api/auth/consent', { ...SESSION, params });

export const ciba = token =>
  client.get('/api/auth/ciba', { headers: { ...JSON_ACCEPT, 'X-Ciba-Token': token } });

export const cibaApprove = token => client.post('/ciba/approve', { token }, SESSION);

export const cibaDeny = token => client.post('/ciba/deny', { token }, SESSION);

export const logoutConfirmState = () => client.get('/api/auth/logout/confirm', SESSION);

export const logoutConfirm = confirm =>
  client.post('/connect/logout/confirm', { confirm }, SESSION);

export const frontChannelState = () => client.get('/api/auth/logout/frontchannel', OPTIONAL);

export const frontChannelDone = () =>
  client.post('/api/auth/logout/frontchannel/done', null, OPTIONAL);

export const linkState = () => client.get('/api/auth/link', OPTIONAL);

export const linkConfirm = body => client.post('/link-account/confirm', body, OPTIONAL);
