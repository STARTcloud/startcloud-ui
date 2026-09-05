import { useEffect, useState } from 'react';

import { log } from '../../../lib/logger';
import { fetchGrafana } from '../api/fleet';

const DISABLED = { enabled: false, base_url: '', dashboard_uid: '', vm_var: 'host', panels: [] };

/**
 * The host's Grafana settings from `/api/config/grafana`: `enabled`,
 * `base_url`, `dashboard_uid`, `vm_var` and `panels`; disabled until they
 * arrive and when the call fails.
 *
 * @returns {Object} The settings
 */
export const useGrafana = () => {
  const [grafana, setGrafana] = useState(DISABLED);

  useEffect(() => {
    let mounted = true;
    fetchGrafana()
      .then(data => {
        if (mounted) {
          setGrafana({ ...DISABLED, ...data });
        }
      })
      .catch(error => {
        log.api.error('Error fetching Grafana settings', { error: error.message });
      });
    return () => {
      mounted = false;
    };
  }, []);

  return grafana;
};
