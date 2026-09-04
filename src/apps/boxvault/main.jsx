import 'bootstrap/dist/css/bootstrap.min.css';

import { configureLogger, log, mountApp, reportRenderError } from '../../chrome';

import App from './App';
import { fetchHealth, i18n, i18nPromise } from './config.jsx';

export const boot = status => {
  configureLogger({ fetchHealth, reportUrl: '/api/client-errors' });
  log.app.info('BoxVault application starting', { version: status.version });
  return mountApp({
    App,
    i18n,
    ready: i18nPromise,
    status,
    showErrorDetails: import.meta.env.DEV,
    onError: reportRenderError,
  });
};
