import { useCallback, useMemo, useState } from 'react';

import { useStatus } from '../../../contexts/StatusContext';
import { fetchBootEnvironments } from '../api/bootEnvironments';
import { fetchDatabaseStats } from '../api/database';
import { fetchFaultConfig, fetchFaults } from '../api/faults';
import { fetchLogFiles, fetchSyslogConfig } from '../api/logs';
import { fetchRepositories } from '../api/repositories';
import { BOOT_ENVIRONMENT_PARAMS, bootEnvironmentParams } from '../utils/bootEnvironments';
import { hostHasFeature } from '../utils/capabilities';
import { databaseRows } from '../utils/database';
import { FAULT_LIMITS, FAULT_PARAMS } from '../utils/FaultUtils';
import { groupLogFiles } from '../utils/logs';
import { REPOSITORY_PARAMS, repositoryParams } from '../utils/repositories';

import { useManageRead } from './useHostManage';
import { selectGroup, switchGroup } from './useHostManageSearch';

/**
 * The request filters the boot environments, the faults and the
 * repositories open with, hyperweaver-ui's.
 */
export const SECTION_PARAMS = {
  bootEnvironments: BOOT_ENVIRONMENT_PARAMS,
  faults: FAULT_PARAMS,
  repositories: REPOSITORY_PARAMS,
};

const NO_ROWS = [];

const listOf = value => (Array.isArray(value) ? value : NO_ROWS);

/**
 * The reads of the syslog, the system logs, the boot environments, the
 * faults, the database and the repositories sections, held at the
 * Manage page so its one search binding narrows their lists: each
 * behind hyperweaver-ui's tokens on the host's own row, the syslog and
 * the logs behind `fault-management` with `syslog` and `log-streaming`,
 * the repositories behind `packages` with `repositories`, the database
 * on every host as hyperweaver-ui read it; hyperweaver-ui's request
 * filters kept as `params` and `setParam(table, key, value)`, a change
 * sending the request again.
 *
 * @param {Object} options - The host
 * @param {string} options.id - The registry id, or `self` on an agent role
 * @param {Object|null} options.server - The registry row, or the one serving agent's
 * @returns {Object} The offers, the params, the reads and the rows
 */
export const useManageSectionsData = ({ id, server }) => {
  const status = useStatus();
  const [params, setParams] = useState(SECTION_PARAMS);
  const faultManagement = hostHasFeature(server, 'fault-management');
  const offered = {
    syslog: faultManagement && hostHasFeature(server, 'syslog'),
    logs: faultManagement && hostHasFeature(server, 'log-streaming'),
    bootEnvironments: hostHasFeature(server, 'boot-environments'),
    faults: faultManagement,
    database: true,
    repositories: hostHasFeature(server, 'packages') && hostHasFeature(server, 'repositories'),
  };

  const setParam = useCallback((table, key, value) => {
    setParams(current => ({ ...current, [table]: { ...current[table], [key]: value } }));
  }, []);

  const resetParams = useCallback(table => {
    setParams(current => ({ ...current, [table]: SECTION_PARAMS[table] }));
  }, []);

  const reads = {
    syslog: useManageRead(
      useCallback(() => fetchSyslogConfig(status, id), [status, id]),
      offered.syslog
    ),
    logFiles: useManageRead(
      useCallback(() => fetchLogFiles(status, id), [status, id]),
      offered.logs
    ),
    bootEnvironments: useManageRead(
      useCallback(
        () => fetchBootEnvironments(status, id, bootEnvironmentParams(params.bootEnvironments)),
        [status, id, params.bootEnvironments]
      ),
      offered.bootEnvironments
    ),
    faults: useManageRead(
      useCallback(
        () =>
          fetchFaults(status, id, {
            all: params.faults.all,
            summary: params.faults.summary,
            limit: params.faults.limit,
            force_refresh: false,
          }),
        [status, id, params.faults]
      ),
      offered.faults
    ),
    faultModules: useManageRead(
      useCallback(() => fetchFaultConfig(status, id), [status, id]),
      offered.faults
    ),
    databases: useManageRead(
      useCallback(() => fetchDatabaseStats(status, id), [status, id]),
      offered.database
    ),
    repositories: useManageRead(
      useCallback(
        () => fetchRepositories(status, id, repositoryParams(params.repositories)),
        [status, id, params.repositories]
      ),
      offered.repositories
    ),
  };

  const rows = useMemo(
    () => ({
      syslogRules: listOf(reads.syslog.data?.parsed_rules),
      logFiles: groupLogFiles(listOf(reads.logFiles.data)).flatMap(group => group.logs),
      bootEnvironments: listOf(reads.bootEnvironments.data),
      faults: listOf(reads.faults.data?.faults),
      faultModules: listOf(reads.faultModules.data),
      databases: databaseRows(reads.databases.data),
      repositories: listOf(reads.repositories.data),
    }),
    [
      reads.syslog.data,
      reads.logFiles.data,
      reads.bootEnvironments.data,
      reads.faults.data,
      reads.faultModules.data,
      reads.databases.data,
      reads.repositories.data,
    ]
  );

  return { offered, params, setParam, resetParams, reads, rows };
};

const withClear = (group, onClear) => ({ ...group, onClear });

/**
 * The request filters of the sections' lists as panel groups of the
 * navbar, hyperweaver-ui's switches and selects: the detail and the
 * snapshots of the boot environments, the resolved faults and the
 * limit, and the enabled-only repositories. A change sends that list's
 * request again; Clear filters puts every filter back.
 *
 * @param {Object} options - The filters
 * @param {Object} options.params - The filters of `useManageSectionsData`
 * @param {Function} options.setParam - Its writer
 * @param {Function} options.resetParams - Its reset of one table
 * @param {Function} options.t - The translator
 * @returns {Object} The groups by table key
 */
export const sectionParamGroups = ({ params, setParam, resetParams, t }) => ({
  bootEnvironments: [
    withClear(
      switchGroup({
        key: 'detailed',
        label: t('host.bootEnvironmentManagement.showDetailed'),
        pill: t('host.bootEnvironmentManagement.details'),
        on: params.bootEnvironments.showDetailed,
        onChange: on => setParam('bootEnvironments', 'showDetailed', on),
      }),
      () => resetParams('bootEnvironments')
    ),
    withClear(
      switchGroup({
        key: 'snapshots',
        label: t('host.bootEnvironmentManagement.showSnapshots'),
        pill: t('host.bootEnvironmentManagement.snapshots'),
        on: params.bootEnvironments.showSnapshots,
        onChange: on => setParam('bootEnvironments', 'showSnapshots', on),
      }),
      () => resetParams('bootEnvironments')
    ),
  ],
  faults: [
    withClear(
      switchGroup({
        key: 'all',
        label: t('host.faultList.includeResolved'),
        pill: t('host.faultList.showAll'),
        on: params.faults.all,
        onChange: on => setParam('faults', 'all', on),
      }),
      () => resetParams('faults')
    ),
    withClear(
      selectGroup({
        key: 'limit',
        label: t('host.faultList.maxFaults'),
        values: FAULT_LIMITS,
        value: params.faults.limit,
        onChange: value =>
          setParam('faults', 'limit', value === '' ? FAULT_PARAMS.limit : Number(value)),
        labelFor: value => t('host.faultList.faultsOption', { count: Number(value) }),
      }),
      () => resetParams('faults')
    ),
  ],
  repositories: [
    withClear(
      switchGroup({
        key: 'enabled',
        label: t('host.repositorySection.enabledOnly'),
        pill: t('host.repositorySection.enabled'),
        on: params.repositories.enabledOnly,
        onChange: on => setParam('repositories', 'enabledOnly', on),
      }),
      () => resetParams('repositories')
    ),
  ],
});
