import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { log } from '../lib/logger';

/**
 * The first-run gate of a host that advertises `setup`: asks the host
 * whether setup is complete and sends the visitor to `/setup` until it is;
 * a host without the feature is complete from the start.
 *
 * @param {Object} options - The gate
 * @param {boolean} options.enabled - Whether the host advertises `setup`
 * @param {() => Promise<{ setupComplete: boolean }>} options.checkStatus - The host's setup status call
 * @returns {boolean|null} True or false once known, null while the host is asked
 */
export const useSetupGate = ({ enabled, checkStatus }) => {
  const navigate = useNavigate();
  const [setupComplete, setSetupComplete] = useState(enabled ? null : true);

  useEffect(() => {
    if (!enabled) {
      return undefined;
    }
    let mounted = true;
    checkStatus()
      .then(setupStatus => {
        if (!mounted) {
          return;
        }
        setSetupComplete(setupStatus.setupComplete);
        if (!setupStatus.setupComplete) {
          navigate('/setup');
        }
      })
      .catch(error => {
        if (mounted) {
          log.app.error('Error checking setup status', { error: error.message });
        }
      });
    return () => {
      mounted = false;
    };
  }, [enabled, checkStatus, navigate]);

  return setupComplete;
};
