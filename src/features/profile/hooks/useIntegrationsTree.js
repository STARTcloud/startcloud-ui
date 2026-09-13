import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaPlug } from 'react-icons/fa6';

const NO_NODES = [];

/**
 * The Account group's Integrations entry of the identity contract's
 * sidebar export, in decision 68's hook shape: one Integrations node at
 * `/user/integrations` while `GET /api/user/integrations`, read once when
 * the export mounts, answers a `services` member, and no node otherwise,
 * because a row that opens an empty page misleads; the read comes through
 * the integrations adapter the router hands the export.
 *
 * @param {{ list: Function }} integrations - The integrations adapter
 * @returns {{ nodes: Array<Object> }} The tree the sidebar draws
 */
export const useIntegrationsTree = integrations => {
  const { t } = useTranslation();
  const [services, setServices] = useState(false);

  useEffect(() => {
    let mounted = true;
    integrations
      .list()
      .then(data => {
        if (mounted) {
          setServices(Array.isArray(data?.services));
        }
      })
      .catch(() => null);
    return () => {
      mounted = false;
    };
  }, [integrations]);

  return useMemo(
    () => ({
      nodes: services
        ? [
            {
              key: 'integrations',
              icon: FaPlug,
              label: t('account.sidebar.integrations'),
              to: '/user/integrations',
            },
          ]
        : NO_NODES,
    }),
    [services, t]
  );
};
