import 'bootstrap/dist/css/bootstrap.min.css';

import { configureLogger, mountApp, reportRenderError } from '../../chrome';

import App from './App';
import { i18n, i18nPromise } from './config.jsx';

export const boot = status => {
  configureLogger({ defaults: { enabled: true, level: import.meta.env.DEV ? 'debug' : 'info' } });
  return mountApp({
    App,
    i18n,
    ready: i18nPromise,
    status,
    showErrorDetails: import.meta.env.DEV,
    onError: reportRenderError,
  });
};
