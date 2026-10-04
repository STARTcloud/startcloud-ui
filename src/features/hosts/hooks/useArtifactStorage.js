import { useCallback, useMemo, useState } from 'react';

import { useStatus } from '../../../contexts/StatusContext';
import { selectGroup } from '../../../hooks/useClientFilters';
import { fetchArtifacts, fetchStoragePaths } from '../api/artifacts';
import { ARTIFACT_PAGE_SIZE, ARTIFACT_TYPES, artifactQuery } from '../utils/artifacts';
import { hostHasFeature } from '../utils/capabilities';

import { useManageRead } from './useHostManage';

/**
 * The request filters the artifacts list opens with: every type, every
 * location, by file name ascending.
 */
export const ARTIFACT_PARAMS = {
  type: '',
  storage_location: '',
  sort_by: 'filename',
  sort_order: 'asc',
};

const FIRST_PAGE = { total: 0, limit: ARTIFACT_PAGE_SIZE, offset: 0, has_more: false };

const NO_ROWS = [];

const TYPE_KEYS = {
  iso: 'artifacts.artifactFilters.isoFiles',
  image: 'artifacts.artifactFilters.vmImages',
};

/**
 * The reads of the artifacts section behind `artifacts`: the storage
 * locations and one page of artifacts under the request filters.
 *
 * @param {Object} options - The host
 * @param {string} options.id - The registry id, or `self` on an agent role
 * @param {Object|null} options.server - The registry row, or the one serving agent's
 * @returns {Object} The params, the reads, the rows and the page
 */
export const useArtifactStorageData = ({ id, server }) => {
  const status = useStatus();
  const offered = hostHasFeature(server, 'artifacts');
  const [params, setParams] = useState(ARTIFACT_PARAMS);
  const [offset, setOffset] = useState(0);

  const setParam = useCallback((key, value) => {
    setParams(current => ({ ...current, [key]: value }));
    setOffset(0);
  }, []);

  const resetParams = useCallback(() => {
    setParams(ARTIFACT_PARAMS);
    setOffset(0);
  }, []);

  const paths = useManageRead(
    useCallback(() => fetchStoragePaths(status, id), [status, id]),
    offered
  );
  const artifacts = useManageRead(
    useCallback(
      () =>
        fetchArtifacts(status, id, artifactQuery(params, { limit: ARTIFACT_PAGE_SIZE, offset })),
      [status, id, params, offset]
    ),
    offered
  );

  const rows = useMemo(
    () => ({
      storagePaths: Array.isArray(paths.data) ? paths.data : NO_ROWS,
      artifacts: Array.isArray(artifacts.data?.artifacts) ? artifacts.data.artifacts : NO_ROWS,
    }),
    [paths.data, artifacts.data]
  );

  const pagination = artifacts.data?.pagination || { ...FIRST_PAGE, offset };

  return {
    offered,
    params,
    setParam,
    resetParams,
    reads: { storagePaths: paths, artifacts },
    rows,
    pagination,
    setOffset,
  };
};

/**
 * The type and storage location filters of the artifacts list as panel
 * groups, each clearing both.
 *
 * @param {Object} options - The filters and the vocabularies
 * @param {Object} options.params - The filters of `useArtifactStorageData`
 * @param {Function} options.setParam - Its writer
 * @param {Function} options.resetParams - Its reset
 * @param {Array<Object>} options.storagePaths - The locations
 * @param {Function} options.t - The translator
 * @returns {Array<Object>} The groups
 */
export const artifactParamGroups = ({ params, setParam, resetParams, storagePaths, t }) => [
  {
    ...selectGroup({
      key: 'type',
      label: t('artifacts.artifactFilters.typeFilterLabel'),
      values: ARTIFACT_TYPES,
      value: params.type,
      onChange: value => setParam('type', value),
      labelFor: value => t(TYPE_KEYS[value]),
    }),
    onClear: resetParams,
  },
  {
    ...selectGroup({
      key: 'location',
      label: t('artifacts.artifactFilters.locationFilterLabel'),
      values: storagePaths.map(path => path.id),
      value: params.storage_location,
      onChange: value => setParam('storage_location', value),
      labelFor: value => {
        const path = storagePaths.find(row => row.id === value);
        return path ? `${path.name} (${path.type})` : value;
      },
    }),
    onClear: resetParams,
  },
];
