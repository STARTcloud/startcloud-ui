import { useCallback, useState } from 'react';

import { useStatus } from '../../../contexts/StatusContext';
import { selectGroup, switchGroup } from '../../../hooks/useClientFilters';
import { fetchPackages, searchPackages } from '../api/packages';
import { fetchProvisioners, fetchRecipes, fetchTemplates } from '../api/provisioning';
import { fetchTemplateSources } from '../api/templates';
import { hostHasFeature, hostHasHypervisor } from '../utils/capabilities';
import {
  BRANDS,
  OS_FAMILIES,
  PACKAGE_PARAMS,
  RECIPE_PARAMS,
  recipesOf,
  searchRowsOf,
} from '../utils/manageCatalog';

import { useManageRead } from './useHostManage';

const NO_ROWS = [];

/**
 * The request filters the catalog sections open with.
 */
export const CATALOG_PARAMS = {
  packages: PACKAGE_PARAMS,
  recipes: RECIPE_PARAMS,
};

const listOf = (reading, member) =>
  Array.isArray(reading.data?.[member]) ? reading.data[member] : NO_ROWS;

const rowsOf = reading => (Array.isArray(reading.data) ? reading.data : NO_ROWS);

const withClear = (group, onClear) => ({ ...group, onClear });

/**
 * The request filters of the packages and recipes tables as panel
 * groups, each clearing its table's filters.
 *
 * @param {Object} options - The filters and the vocabularies
 * @param {Object} options.params - The filters of `useManageCatalogData`
 * @param {Function} options.setParam - Its writer
 * @param {Function} options.resetParams - Its reset of one table
 * @param {Function} options.t - The translator
 * @returns {Object} The groups by table key
 */
export const catalogParamGroups = ({ params, setParam, resetParams, t }) => ({
  packages: [
    withClear(
      switchGroup({
        key: 'all',
        label: t('host.packageFilters.showAll'),
        pill: t('host.packageFilters.allPackages'),
        on: params.packages.showAll,
        onChange: on => setParam('packages', 'showAll', on),
      }),
      () => resetParams('packages')
    ),
  ],
  recipes: [
    withClear(
      selectGroup({
        key: 'family',
        label: t('host.recipesManagement.filterByOsFamily'),
        values: OS_FAMILIES,
        value: params.recipes.os_family,
        onChange: value => setParam('recipes', 'os_family', value),
      }),
      () => resetParams('recipes')
    ),
    withClear(
      selectGroup({
        key: 'brand',
        label: t('host.recipesManagement.filterByBrand'),
        values: BRANDS,
        value: params.recipes.brand,
        onChange: value => setParam('recipes', 'brand', value),
      }),
      () => resetParams('recipes')
    ),
  ],
});

/**
 * Whether a host's own row offers each catalog section.
 *
 * @param {Object|null} server - The registry row, or the one serving agent's
 * @returns {Object<string, boolean>} The gates by section
 */
export const catalogGates = server => ({
  packages: hostHasFeature(server, 'packages'),
  recipes: hostHasFeature(server, 'provisioning') && hostHasHypervisor(server, 'bhyve'),
  templates: hostHasFeature(server, 'templates'),
  provisioners: hostHasFeature(server, 'provisioner-registry'),
});

/**
 * The reads of a host's catalog sections, each behind its section's gate
 * and `only`, under the request filters `params`.
 *
 * @param {Object} options - The host
 * @param {string} options.id - The registry id, or `self` on an agent role
 * @param {Object|null} options.server - The registry row, or the one serving agent's
 * @param {Array<string>} [options.only] - The sections wanted, every section without the list
 * @returns {{ params: Object, setParam: Function, resetParams: Function, reads: Object, rows: Object, gates: Object }} The data
 */
export const useManageCatalogData = ({ id, server, only = null }) => {
  const status = useStatus();
  const [params, setParams] = useState(CATALOG_PARAMS);
  const wanted = key => !only || only.includes(key);
  const offers = catalogGates(server);
  const gates = Object.fromEntries(
    Object.entries(offers).map(([key, offered]) => [key, offered && wanted(key)])
  );

  const setParam = useCallback((table, key, value) => {
    setParams(current => ({ ...current, [table]: { ...current[table], [key]: value } }));
  }, []);

  const resetParams = useCallback(table => {
    setParams(current => ({ ...current, [table]: CATALOG_PARAMS[table] }));
  }, []);

  const reads = {
    packages: useManageRead(
      useCallback(
        () =>
          params.packages.searchQuery
            ? searchPackages(status, id, params.packages.searchQuery).then(searchRowsOf)
            : fetchPackages(status, id, { all: params.packages.showAll }),
        [status, id, params.packages]
      ),
      gates.packages
    ),
    recipes: useManageRead(
      useCallback(
        () =>
          fetchRecipes(status, id, {
            ...(params.recipes.os_family ? { os_family: params.recipes.os_family } : {}),
            ...(params.recipes.brand ? { brand: params.recipes.brand } : {}),
          }).then(recipesOf),
        [status, id, params.recipes]
      ),
      gates.recipes
    ),
    templates: useManageRead(
      useCallback(() => fetchTemplates(status, id), [status, id]),
      gates.templates
    ),
    sources: useManageRead(
      useCallback(() => fetchTemplateSources(status, id), [status, id]),
      gates.templates
    ),
    provisioners: useManageRead(
      useCallback(() => fetchProvisioners(status, id), [status, id]),
      gates.provisioners
    ),
  };

  const rows = {
    packages: rowsOf(reads.packages),
    recipes: rowsOf(reads.recipes),
    templates: listOf(reads.templates, 'templates'),
    sources: rowsOf(reads.sources),
    provisioners: listOf(reads.provisioners, 'provisioners'),
  };

  return { params, setParam, resetParams, reads, rows, gates };
};
