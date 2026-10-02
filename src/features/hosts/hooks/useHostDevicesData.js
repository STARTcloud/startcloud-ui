import { useCallback, useEffect, useState } from 'react';

import { useStatus } from '../../../contexts/StatusContext';
import { log } from '../../../lib/logger';
import {
  getAvailableDevices,
  getDeviceCategories,
  getHostDevices,
  getPPTStatus,
  refreshDeviceDiscovery,
} from '../api/deviceAPI';

const UNREAD = {
  devices: [],
  summary: {},
  categories: {},
  ppt: {},
  available: [],
  loaded: false,
  failed: false,
  message: '',
};

const listOf = value => (Array.isArray(value) ? value : []);

const objectOf = value => (value && typeof value === 'object' ? value : {});

const settled = answer => (answer.status === 'fulfilled' ? answer.value : null);

const refusalOf = answers =>
  answers.find(answer => answer.status === 'rejected')?.reason?.message || '';

/**
 * What the devices page reads of one host, hyperweaver-ui's four reads
 * sent together: the devices with their summary, the categories, the
 * passthrough status and the devices free for passthrough, read once as
 * the page opens and again on `refresh`, the read a person asks for;
 * `discover` asks the agent to discover its devices again and reads the
 * four at once when it answers, where hyperweaver-ui waited two seconds,
 * a wait not carried over. A read that failed keeps what the others
 * answered and names the agent's message.
 *
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {boolean} offered - Whether the host's own row lists `devices`
 * @returns {Object} The rows, `loaded`, `failed`, `message`, `busy`, `refresh` and `discover`
 */
export const useHostDevicesData = (id, offered) => {
  const status = useStatus();
  const [read, setRead] = useState(UNREAD);
  const [busy, setBusy] = useState(false);

  const load = useCallback(
    () =>
      Promise.allSettled([
        getHostDevices(status, id),
        getDeviceCategories(status, id),
        getPPTStatus(status, id),
        getAvailableDevices(status, id),
      ]).then(answers => {
        const [devices, categories, ppt, available] = answers.map(settled);
        const message = refusalOf(answers);
        if (message) {
          log.api.error('Error reading host devices', { id, error: message });
        }
        setRead({
          devices: listOf(devices?.devices),
          summary: objectOf(devices?.summary),
          categories: objectOf(categories?.categories),
          ppt: objectOf(ppt),
          available: listOf(available?.devices),
          loaded: true,
          failed: Boolean(message),
          message,
        });
      }),
    [status, id]
  );

  useEffect(() => {
    if (offered) {
      load();
    }
  }, [offered, load]);

  const discover = useCallback(async () => {
    setBusy(true);
    try {
      await refreshDeviceDiscovery(status, id);
      await load();
      return null;
    } catch (error) {
      return error.message;
    } finally {
      setBusy(false);
    }
  }, [status, id, load]);

  return { ...read, busy, refresh: load, discover };
};
