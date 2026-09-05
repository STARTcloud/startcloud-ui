import 'bootstrap/dist/css/bootstrap.min.css';
import { createRoot } from 'react-dom/client';

import '../css/styles.css';
import '../css/fonts.css';
import { probeStatus } from '../contexts/StatusContext';
import { createI18n } from '../lib/i18n';
import { configureLogger, log } from '../lib/logger';
import { fetchHealth, initRuntime } from '../lib/runtime';
import { authMethod } from '../utils/capabilities';

import App from './App';
import AppProvider from './provider';

const loadSupportedLanguages = async () => {
  try {
    const data = await fetchHealth();
    if (data.supported_languages) {
      log.app.info('Frontend using backend-detected locales: ', data.supported_languages);
      return data.supported_languages;
    }
  } catch (error) {
    log.app.error('Failed to fetch supported languages', { error });
  }
  return __SUPPORTED_LOCALES__;
};

probeStatus()
  .then(status => {
    initRuntime(status);
    configureLogger({
      fetchHealth,
      reportUrl: authMethod(status) === 'backend' ? '/api/client-errors' : '',
    });
    log.app.info('STARTcloud UI starting', { role: status.role, version: status.version });
    const { i18n, ready, getSupportedLanguages } = createI18n({
      namespace: status.role,
      loadSupportedLanguages,
    });
    return ready.then(() => {
      createRoot(document.getElementById('root')).render(
        <AppProvider i18n={i18n} status={status}>
          <App getSupportedLanguages={getSupportedLanguages} />
        </AppProvider>
      );
    });
  })
  .catch(error => {
    document.getElementById('root').textContent = error.message;
  });
