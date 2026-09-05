import { gravatarProfile } from '../../../utils/gravatar';

import { getOrganization, userOrganizations } from './organizations';

const logoPromises = new Map();

export const organizationLogo = async organization => {
  const logo = organization.logo || organization.organization?.logo;
  if (logo) {
    return logo;
  }
  const emailHash = organization.emailHash || organization.organization?.emailHash;
  if (!emailHash) {
    return '';
  }
  const profile = await gravatarProfile(emailHash);
  return profile?.avatar_url || '';
};

export const fetchOrganization = async name => {
  const data = await getOrganization(name);
  return {
    name,
    displayName: data.display_name || '',
    logo: await organizationLogo(data),
    description: data.description || '',
    orgCode: data.external_issuer ? data.org_code || '' : '',
  };
};

export const loadOrganizations = async () => {
  const rows = (await userOrganizations()) || [];
  return Promise.all(
    rows.map(async membership => {
      const name = membership.name || membership.organization?.name;
      return {
        uuid: name,
        name,
        description: membership.description || membership.organization?.description || '',
        roles: membership.role ? [String(membership.role).toUpperCase()] : [],
        primary: Boolean(membership.isPrimary),
        personal: Boolean(membership.personal),
        logo: await organizationLogo(membership),
      };
    })
  );
};

export const logoFor = organization => {
  const name = organization?.name;
  if (!name) {
    return Promise.resolve('');
  }
  if (!logoPromises.has(name)) {
    logoPromises.set(name, organizationLogo(organization));
  }
  return logoPromises.get(name);
};

/**
 * Map backend rows to items with each organization's logo resolved once:
 * the stored logo, else the Gravatar behind its email hash.
 * @param {Array<Object>} entries - The backend rows, each carrying `organization` or none
 * @param {string} fallbackOrg - The organization name for rows carrying none
 * @param {(entry: Object, orgName: string, logo: string) => Object} toItem - The item builder
 * @returns {Promise<Array<Object>>}
 */
export const withLogos = async (entries, fallbackOrg, toItem) => {
  const organizations = new Map();
  entries.forEach(entry => {
    const name = entry.organization?.name || fallbackOrg;
    if (!organizations.has(name)) {
      organizations.set(name, { name, ...(entry.organization || {}) });
    }
  });
  const logos = Object.fromEntries(
    await Promise.all(
      [...organizations.values()].map(async organization => [
        organization.name,
        await logoFor(organization),
      ])
    )
  );
  return entries.map(entry => {
    const name = entry.organization?.name || fallbackOrg;
    return toItem(entry, name, logos[name]);
  });
};
