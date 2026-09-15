import { encodePath } from '../../../lib/apiClient';
import { client } from '../../../lib/runtime';

const term = name => encodePath('api', 'admin', 'terms', name);

export const terms = () => client.get('/api/admin/terms');

export const placeholders = () => client.get('/api/admin/terms/placeholders');

export const createTerm = body => client.post('/api/admin/terms', body);

const variant = region => ({ params: region ? { region } : undefined });

export const updateTerm = (name, patch, region = '') =>
  client.patch(term(name), patch, variant(region));

export const deleteTerm = (name, region = '') => client.delete(term(name), variant(region));

export const termsBulk = body => client.post('/api/admin/terms/bulk', body);

export const publishTerm = (name, body, region = '') =>
  client.post(encodePath('api', 'admin', 'terms', name, 'publish'), body, variant(region));

export const termHistory = (name, region = '') =>
  client.get(encodePath('api', 'admin', 'terms', name, 'history'), variant(region));

export const termRevision = (name, version, revision, region = '') =>
  client.get(
    encodePath('api', 'admin', 'terms', name, 'history', version, revision),
    variant(region)
  );

const emailTemplate = kind => encodePath('api', 'admin', 'email-templates', kind);

const copyOf = (site, locale) => {
  const params = { ...(site ? { site } : {}), ...(locale ? { locale } : {}) };
  return { params: Object.keys(params).length > 0 ? params : undefined };
};

export const emailTemplates = () => client.get('/api/admin/email-templates');

export const emailArguments = () => client.get('/api/admin/email-templates/arguments');

export const createEmailTemplate = body => client.post('/api/admin/email-templates', body);

export const updateEmailTemplate = (kind, patch, site = '', locale = '') =>
  client.patch(emailTemplate(kind), patch, copyOf(site, locale));

export const deleteEmailTemplate = (kind, site = '', locale = '') =>
  client.delete(emailTemplate(kind), copyOf(site, locale));

export const emailTemplatesBulk = body => client.post('/api/admin/email-templates/bulk', body);

export const publishEmailTemplate = (kind, body, site = '', locale = '') =>
  client.post(
    encodePath('api', 'admin', 'email-templates', kind, 'publish'),
    body,
    copyOf(site, locale)
  );

export const emailTemplateHistory = (kind, site = '', locale = '') =>
  client.get(encodePath('api', 'admin', 'email-templates', kind, 'history'), copyOf(site, locale));

export const emailTemplateRevision = (kind, version, revision, site = '', locale = '') =>
  client.get(
    encodePath('api', 'admin', 'email-templates', kind, 'history', version, revision),
    copyOf(site, locale)
  );

export const sitesConfig = () => client.get('/api/config/sites');
