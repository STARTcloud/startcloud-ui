import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useNotify } from '../../../contexts/NoticeContext';

/**
 * One admin read with the contract's failure surface: `read()` on mount
 * and on every change of `key`, the answer as `data`; a failure raises one
 * danger card from the error's `messageKey` alone, and a `404`, the route
 * not yet answered by the issuer, draws the contract's `example` payload
 * in its place so the page still renders.
 *
 * @param {Object} options - The read
 * @param {Function} options.read - Answers the route's payload
 * @param {*} options.example - The contract's example payload for a `404`
 * @param {string} [options.key] - A value whose change re-reads
 * @returns {{ data: *, loading: boolean, reload: Function }} The state
 */
export const useAdminRead = ({ read, example, key = '' }) => {
  const { t } = useTranslation();
  const notify = useNotify();
  const readRef = useRef(read);
  const [tick, setTick] = useState(0);
  const [answer, setAnswer] = useState({ stamp: null, data: null });
  const stamp = `${key}:${tick}`;

  useEffect(() => {
    readRef.current = read;
  });

  useEffect(() => {
    let mounted = true;
    readRef
      .current()
      .then(data => {
        if (mounted) {
          setAnswer({ stamp, data });
        }
      })
      .catch(error => {
        if (!mounted) {
          return;
        }
        notify('danger', t(error.messageKey || 'errors.request'));
        setAnswer({ stamp, data: error.status === 404 ? example : null });
      });
    return () => {
      mounted = false;
    };
  }, [example, notify, stamp, t]);

  const reload = useCallback(() => setTick(current => current + 1), []);

  return { data: answer.data, loading: answer.stamp !== stamp, reload };
};
