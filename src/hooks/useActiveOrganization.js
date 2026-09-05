import { useEffect, useState } from 'react';

import { log } from '../lib/logger';

/**
 * The active organization's record from the primary collection's adapter,
 * the memberships with its logo filled in, and its customer code (the
 * record's `orgCode`, else the membership's `customer_id`).
 *
 * @param {Object} options - The organization inputs
 * @param {Array<Object>} options.collections - The collections the host mounts, the first being primary
 * @param {Array<Object>} options.memberships - The session's organizations
 * @param {Object|null} options.user - The session's user
 * @param {string} options.activeOrgUuid - The active organization's uuid
 * @returns {{ active: Object|null, orgCode: string, organizations: Array<Object> }}
 */
export const useActiveOrganization = ({ collections, memberships, user, activeOrgUuid }) => {
  const [activeOrg, setActiveOrg] = useState(null);

  useEffect(() => {
    const [primary] = collections;
    if (!user || !activeOrgUuid || !primary) {
      return undefined;
    }
    let mounted = true;
    primary.adapter
      .getOrganization(activeOrgUuid)
      .then(organization => {
        if (mounted) {
          setActiveOrg(organization);
        }
      })
      .catch(error => {
        log.api.error('Error fetching active organization', { error: error.message });
      });
    return () => {
      mounted = false;
    };
  }, [collections, user, activeOrgUuid]);

  const active = activeOrg?.name === activeOrgUuid ? activeOrg : null;
  const membership = memberships.find(org => org.uuid === activeOrgUuid) || null;

  return {
    active,
    orgCode: active?.orgCode || membership?.customer_id || '',
    organizations: memberships.map(org => ({
      ...org,
      logo: org.logo || (org.uuid === activeOrgUuid ? active?.logo || '' : ''),
    })),
  };
};
