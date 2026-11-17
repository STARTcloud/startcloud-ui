import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { register } from 'register-service-worker';

import { useNotify } from '../contexts/NoticeContext';

const XSRF_COOKIES = ['__Host-XSRF-TOKEN', 'XSRF-TOKEN'];

const cookieValue = name =>
  document.cookie
    .split('; ')
    .filter(entry => entry.startsWith(`${name}=`))
    .map(entry => decodeURIComponent(entry.slice(name.length + 1)))[0] || '';

const xsrfToken = () => XSRF_COOKIES.map(cookieValue).find(Boolean) || '';

/**
 * Hands the XSRF token to a worker, `{ type: 'xsrf', token }`, so a
 * notification button pressed with no page open can still send its
 * request with the header on a browser whose workers cannot read cookies;
 * nothing is posted while there is no worker or no token.
 *
 * @param {ServiceWorker|null|undefined} worker - The worker to tell
 * @param {string} token - The XSRF token the page reads from its cookie
 */
export const tellWorkerToken = (worker, token) => {
  if (worker && token) {
    worker.postMessage({ type: 'xsrf', token });
  }
};

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
 * Asks one worker for the version the build stamped into it: posts
 * `{ type: 'version' }` once over a `MessageChannel` and resolves with the
 * `version` the worker answers on it, the empty string for an answer that
 * carries none; a worker that never answers leaves it pending.
 *
 * @param {ServiceWorker} worker - The worker to ask
 * @returns {Promise<string>} The version
 */
export const askWorkerVersion = worker =>
  new Promise(resolve => {
    const channel = new MessageChannel();
    channel.port1.onmessage = event => {
      channel.port1.close();
      resolve(typeof event.data?.version === 'string' ? event.data.version : '');
    };
    worker.postMessage({ type: 'version' }, [channel.port2]);
  });

/**
 * Registers the build's service worker at scope `/` in production, hands
 * the active worker the page's XSRF token once the registration is ready
 * and again whenever a new worker takes the page, through
 * `tellWorkerToken`, and, when
 * a new worker is installed while one already controls the page, raises the
 * sticky "A new version is available" banner with a Reload action, asks the
 * new worker its version through `askWorkerVersion` and, once it answers,
 * redraws the banner naming that version; while
 * the status the app booted with is the worker's saved copy, `offline`,
 * raises the same shape of banner saying the host is offline and what is
 * drawn is the copy this device holds, closed by its dismiss, with Launch
 * Hyperweaver Agent, `launchHref`, as its action while that link is given.
 *
 * @param {Object} options - The host
 * @param {string} options.app - The host's brand name
 * @param {boolean} options.offline - Whether the status came from the worker's cache
 * @param {string} options.launchHref - The link that starts the agent, empty for no action
 */
export const usePwa = ({ app, offline, launchHref }) => {
  const { t } = useTranslation();
  const notify = useNotify();

  useEffect(() => {
    if (offline) {
      notify('warning', t('pwa.offline', { app }), {
        tier: 'banner',
        key: 'pwa-offline',
        sticky: true,
        action: launchHref
          ? { label: t('pwa.launchAgent'), href: launchHref, action: 'launch-agent' }
          : null,
      });
    }
  }, [app, offline, launchHref, notify, t]);

  useEffect(() => {
    if (!import.meta.env.PROD) {
      return undefined;
    }
    const onController = () => tellWorkerToken(navigator.serviceWorker.controller, xsrfToken());
    navigator.serviceWorker?.addEventListener('controllerchange', onController);
    register(serviceWorkerUrl(app), {
      registrationOptions: { scope: '/' },
      ready(registration) {
        tellWorkerToken(registration.active, xsrfToken());
      },
      updated(registration) {
        const banner = text =>
          notify('info', text, {
            tier: 'banner',
            key: 'pwa-update',
            sticky: true,
            action: { label: t('pwa.reload'), onClick: () => window.location.reload() },
          });
        banner(t('pwa.newVersion', { app }));
        const worker = registration.waiting || registration.installing || registration.active;
        if (worker) {
          askWorkerVersion(worker).then(version => {
            if (version) {
              banner(t('pwa.newVersionWith', { app, version }));
            }
          });
        }
      },
    });
    return () => navigator.serviceWorker?.removeEventListener('controllerchange', onController);
  }, [app, notify, t]);
};
