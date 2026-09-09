import PropTypes from 'prop-types';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import { useNotify } from '../contexts/NoticeContext';

export const problemShape = PropTypes.shape({
  code: PropTypes.string.isRequired,
  status: PropTypes.number.isRequired,
  wait: PropTypes.number.isRequired,
  since: PropTypes.number.isRequired,
});

/**
 * The page's view of a problem answer: the `code` the page translates
 * from, the status, the `wait_seconds` of a throttled step and the moment
 * it arrived, which the countdown counts from.
 *
 * @param {Object} error - The `ApiError`
 * @returns {{ code: string, status: number, wait: number, since: number }}
 */
export const problemOf = error => ({
  code: String(error?.code || ''),
  status: error?.status || 0,
  wait: Math.max(0, Number(error?.data?.wait_seconds) || 0),
  since: Date.now(),
});

/**
 * How every auth page answers a failed action: a `422` paints inline
 * through the form's rules, a problem body with `code` becomes the page's
 * alert, and anything else (a 5xx, no response) is one danger card from
 * the client's `messageKey`, the form kept.
 *
 * @returns {(error: Object, rules?: Object) => Object|null} The problem to draw, or null
 */
export const useProblemReporter = () => {
  const { t } = useTranslation();
  const notify = useNotify();
  return useCallback(
    (error, rules = null) => {
      if (rules?.applyServerErrors(error)) {
        return null;
      }
      if (error?.code) {
        return problemOf(error);
      }
      notify('danger', t(error?.messageKey || 'errors.request'));
      return null;
    },
    [notify, t]
  );
};
