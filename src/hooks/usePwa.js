import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { register } from 'register-service-worker';

import { useNotify } from '../contexts/NoticeContext';

/**
 * The one service worker URL of the build, the app name in its query; the
 * build stamps its version into the file, so each release is a new worker
 * the browser installs on its next check.
 *
 * @param {string} app - The host's brand name
 * @returns {string} The worker URL push and the update share
 */
export const serviceWorkerUrl = app => `/notification-sw.js?app=${encodeURIComponent(app)}`;

/**
 * Registers the build's service worker at scope `/` in production and, when
 * a new worker is installed while one already controls the page, raises the
 * sticky "A new version is available" banner with a Reload action; while
 * the status the app booted with is the worker's saved copy, `offline`,
 * raises the same shape of banner saying the host is offline and what is
 * drawn is the copy this device holds, closed by its dismiss.
 *
 * @param {Object} options - The host
 * @param {string} options.app - The host's brand name
 * @param {boolean} options.offline - Whether the status came from the worker's cache
 */
export const usePwa = ({ app, offline }) => {
  const { t } = useTranslation();
  const notify = useNotify();

  useEffect(() => {
    if (offline) {
      notify('warning', t('pwa.offline', { app }), {
        tier: 'banner',
        key: 'pwa-offline',
        sticky: true,
      });
    }
  }, [app, offline, notify, t]);

  useEffect(() => {
    if (!import.meta.env.PROD) {
      return;
    }
    register(serviceWorkerUrl(app), {
      registrationOptions: { scope: '/' },
      updated() {
        notify('info', t('pwa.newVersion', { app }), {
          tier: 'banner',
          key: 'pwa-update',
          sticky: true,
          action: { label: t('pwa.reload'), onClick: () => window.location.reload() },
        });
      },
    });
  }, [app, notify, t]);
};
