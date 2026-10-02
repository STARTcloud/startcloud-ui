import { useCallback, useMemo, useState } from 'react';

import { useStatus } from '../../../contexts/StatusContext';
import { fetchPackages, searchPackages } from '../api/packages';
import {
  fetchArtifactStoragePaths,
  fetchArtifacts,
  fetchCatalog,
  fetchProvisioners,
  fetchRecipes,
  fetchSecrets,
  fetchTemplates,
} from '../api/provisioning';
import { fetchTemplateSources } from '../api/templates';
import { hostHasFeature, hostHasHypervisor } from '../utils/capabilities';
import {
  ARTIFACT_PAGE_SIZE,
  ARTIFACT_TYPES,
  BRANDS,
  OS_FAMILIES,
  PACKAGE_PARAMS,
  RECIPE_PARAMS,
  artifactFiltersOf,
  catalogNewestOf,
  recipesOf,
  searchRowsOf,
} from '../utils/manageCatalog';

import { useManageRead } from './useHostManage';
import { selectGroup, switchGroup } from './useHostManageSearch';

const NO_ROWS = [];

const NO_NEWEST = {};

/**
 * The request filters the catalog sections of the Manage page open with,
 * hyperweaver-ui's: every package but the ones a host hides, no remote
 * search, every artifact type and location two hundred at a time, every
 * recipe family and brand.
 */
export const CATALOG_PARAMS = {
  packages: PACKAGE_PARAMS,
  installers: { type: '', storage_path_id: '', limit: ARTIFACT_PAGE_SIZE },
  recipes: RECIPE_PARAMS,
};

const listOf = (reading, member) =>
  Array.isArray(reading.data?.[member]) ? reading.data[member] : NO_ROWS;

const rowsOf = reading => (Array.isArray(reading.data) ? reading.data : NO_ROWS);

const withClear = (group, onClear) => ({ ...group, onClear });

/**
 * The request filters of the catalog tables as panel groups of the
 * navbar, hyperweaver-ui's selects and switches over each request: the
 * show-all switch of the packages, the type and the location of the
 * installer files, the family and the brand of the recipes. A change
 * sends that table's request again; Clear filters puts every filter
 * back to what the page opened with.
 *
 * @param {Object} options - The filters and the vocabularies
 * @param {Object} options.params - The filters of `useManageCatalogData`
 * @param {Function} options.setParam - Its writer
 * @param {Function} options.resetParams - Its reset of one table
 * @param {Array<Object>} options.locations - The storage locations
 * @param {Function} options.t - The translator
 * @returns {Object} The groups by table key
 */
export const catalogParamGroups = ({ params, setParam, resetParams, locations, t }) => ({
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
  installers: [
    withClear(
      selectGroup({
        key: 'type',
        label: t('host.installerFiles.filterByType'),
        values: ARTIFACT_TYPES,
        value: params.installers.type,
        onChange: value => setParam('installers', 'type', value),
      }),
      () => resetParams('installers')
    ),
    withClear(
      selectGroup({
        key: 'location',
        label: t('host.installerFiles.filterByLocation'),
        values: locations.map(location => String(location.id)),
        value: params.installers.storage_path_id,
        onChange: value => setParam('installers', 'storage_path_id', value),
        labelFor: value =>
          locations.find(location => String(location.id) === String(value))?.name || value,
      }),
      () => resetParams('installers')
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
 * Whether a host's own row offers the catalog sections: the packages
 * behind `packages`, the installer files behind `artifacts` and
 * `provisioner-registry`, the recipes behind `provisioning` on a host
 * that names `bhyve`, the templates behind `templates` and the
 * provisioners behind `provisioner-registry`.
 *
 * @param {Object|null} server - The registry row, or the one serving agent's
 * @returns {Object<string, boolean>} The gates by section
 */
export const catalogGates = server => ({
  packages: hostHasFeature(server, 'packages'),
  installers: hostHasFeature(server, 'artifacts') && hostHasFeature(server, 'provisioner-registry'),
  recipes: hostHasFeature(server, 'provisioning') && hostHasHypervisor(server, 'bhyve'),
  templates: hostHasFeature(server, 'templates'),
  provisioners: hostHasFeature(server, 'provisioner-registry'),
});

/**
 * The reads the catalog sections of the Manage page draw, held once at
 * the page so its one search binding narrows them all: the packages, or
 * the repository search's hits while a query stands, the storage
 * locations and the artifacts, the secrets that name the
 * keys the dialogs offer, the recipes, the templates and the registries
 * they come from, the provisioner families and the catalog's newest
 * versions; each behind the token of its section, hyperweaver-ui's
 * request filters kept as `params` and `setParam(table, key, value)`, a
 * change sending the request again with no debounce.
 *
 * @param {Object} options - The host
 * @param {string} options.id - The registry id, or `self` on an agent role
 * @param {Object|null} options.server - The registry row, or the one serving agent's
 * @returns {{ params: Object, setParam: Function, resetParams: Function, reads: Object, rows: Object, gates: Object }} The data
 */
export const useManageCatalogData = ({ id, server }) => {
  const status = useStatus();
  const [params, setParams] = useState(CATALOG_PARAMS);
  const gates = catalogGates(server);
  const secretsWanted = gates.installers || gates.provisioners;

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
    locations: useManageRead(
      useCallback(() => fetchArtifactStoragePaths(status, id), [status, id]),
      gates.installers
    ),
    installers: useManageRead(
      useCallback(
        () => fetchArtifacts(status, id, artifactFiltersOf(params.installers)),
        [status, id, params.installers]
      ),
      gates.installers
    ),
    secrets: useManageRead(
      useCallback(() => fetchSecrets(status, id).catch(() => null), [status, id]),
      secretsWanted
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
    catalog: useManageRead(
      useCallback(() => fetchCatalog(status, id).catch(() => null), [status, id]),
      gates.provisioners
    ),
  };

  const newest = useMemo(
    () => (reads.catalog.data ? catalogNewestOf(reads.catalog.data) : NO_NEWEST),
    [reads.catalog.data]
  );

  const rows = {
    packages: rowsOf(reads.packages),
    locations: listOf(reads.locations, 'paths'),
    installers: listOf(reads.installers, 'artifacts'),
    recipes: rowsOf(reads.recipes),
    templates: listOf(reads.templates, 'templates'),
    sources: rowsOf(reads.sources),
    provisioners: listOf(reads.provisioners, 'provisioners'),
    newest,
  };

  return { params, setParam, resetParams, reads, rows, gates };
};
