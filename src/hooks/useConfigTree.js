import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { FaGear } from 'react-icons/fa6';

import { useStatus } from '../contexts/StatusContext';

const EMPTY_NAMES = [];

const titleOf = (config, configName) =>
  config.schema(configName).then(
    schema => schema.title || configName,
    () => configName
  );

const fileNodes = (config, configNames) =>
  Promise.all(configNames.map(configName => titleOf(config, configName))).then(titles =>
    configNames.map((configName, index) => ({
      key: configName,
      label: titles[index],
      to: `/admin/config/${encodeURIComponent(configName)}`,
    }))
  );

/**
 * The names of `status.config`, empty when the member is absent.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @returns {Array<string>} The names
 */
export const configNamesOf = status =>
  Array.isArray(status?.config) ? status.config : EMPTY_NAMES;

/**
 * The sidebar tree of the configuration files (identity contract decision
 * 122): one Configuration node at `/admin/config` whose children are one
 * node per name in `status.config`, in list order, labelled by the
 * schema's root `title` once `GET /api/config/<name>/schema` has answered
 * and by the name when it does not, each a deep link to
 * `/admin/config/<name>`; the schemas come through the caller's admin
 * `config` adapter's cached `schema`, so the page and the tree share one
 * fetch, the adapter handed in because the shared layer imports no
 * feature's api.
 *
 * @param {{ schema: Function }} config - The admin adapter's `config` member
 * @returns {{ nodes: Array<Object> }} The tree the sidebar draws
 */
export const useConfigTree = config => {
  const { t } = useTranslation();
  const status = useStatus();
  const configNames = configNamesOf(status);
  return useMemo(
    () => ({
      nodes: [
        {
          key: 'config',
          icon: FaGear,
          label: t('admin.config.title'),
          to: '/admin/config',
          children: () => fileNodes(config, configNames),
        },
      ],
    }),
    [t, config, configNames]
  );
};
