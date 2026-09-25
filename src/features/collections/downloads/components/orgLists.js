import { useEffect, useState } from 'react';

import { downloadsAdapter } from '../api/adapter';

const NO_ITEMS = [];

const useOrgList = (org, load) => {
  const [items, setItems] = useState(NO_ITEMS);
  useEffect(() => {
    if (!org) {
      return undefined;
    }
    let mounted = true;
    load(org)
      .then(loaded => {
        if (mounted) {
          setItems(loaded);
        }
      })
      .catch(() => null);
    return () => {
      mounted = false;
    };
  }, [org, load]);
  return items;
};

/**
 * The organization's products, loaded once per organization, empty until
 * they arrive, on a refusal and while no organization is named.
 *
 * @param {string} org - The organization
 * @returns {Array<Object>} The products
 */
export const useOrgProducts = org => useOrgList(org, downloadsAdapter.listOrg);

const familyNames = org =>
  downloadsAdapter.families.list(org).then(families => families.map(family => family.name));

/**
 * The names of the organization's families, loaded once per organization,
 * empty until they arrive, on a refusal and while no organization is
 * named.
 *
 * @param {string} org - The organization
 * @returns {Array<string>} The family names
 */
export const useOrgFamilies = org => useOrgList(org, familyNames);
