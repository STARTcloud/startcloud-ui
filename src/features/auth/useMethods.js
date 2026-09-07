import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useNotify } from '../../contexts/NoticeContext';

import { methods as fetchMethods } from './api/methods';

/**
 * `GET /api/auth/methods`, fetched once per mount: the answer, or null
 * while it is on its way; a failure raises one danger card and leaves the
 * answer null so the page draws its skeleton and nothing else.
 *
 * @returns {{ methods: Object|null, loading: boolean }}
 */
export const useMethods = () => {
  const { t } = useTranslation();
  const notify = useNotify();
  const [state, setState] = useState({ methods: null, loading: true });

  useEffect(() => {
    let active = true;
    fetchMethods()
      .then(answer => {
        if (active) {
          setState({ methods: answer, loading: false });
        }
      })
      .catch(error => {
        if (active) {
          notify('danger', t(error.messageKey || 'errors.request'));
          setState({ methods: null, loading: false });
        }
      });
    return () => {
      active = false;
    };
  }, [notify, t]);

  return state;
};
