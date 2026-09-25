import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { register } from 'register-service-worker';

import { useNotify } from '../contexts/NoticeContext';

/**
 * The one service worker URL of the build, the app name and the UI
 * build's version in its query so the browser fetches and installs a new
 * worker each release while the file's bytes never change.
 *
 * @param {string} app - The host's brand name
 * @returns {string} The worker URL push and the update share
 */
export const serviceWorkerUrl = app =>
  `/notification-sw.js?app=${encodeURIComponent(app)}&v=${__APP_VERSION__}`;

/**
 * Registers the build's service worker at scope `/` in production and, when
 * a new worker is installed while one already controls the page, raises the
 * sticky "A new version is available" banner with a Reload action.
 *
 * @param {string} app - The host's brand name
 */
export const usePwa = app => {
  const { t } = useTranslation();
  const notify = useNotify();

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
