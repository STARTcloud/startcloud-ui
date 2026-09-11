import 'bootstrap/dist/css/bootstrap.min.css';
import { Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { I18nextProvider } from 'react-i18next';

import '../css/styles.css';
import '../css/fonts.css';
import StatusUnreachable from '../components/common/StatusUnreachable';
import { probeStatus } from '../contexts/StatusContext';
import { createI18n } from '../lib/i18n';
import { configureLogger, log } from '../lib/logger';
import { fetchHealth, initRuntime, loadRules } from '../lib/runtime';
import { authMethod } from '../utils/capabilities';

import App from './App';
import AppProvider from './provider';

const REPORTING_METHODS = ['backend', 'cookie'];

const root = createRoot(document.getElementById('root'));

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

const boot = status => {
  initRuntime(status);
  configureLogger({
    fetchHealth,
    reportUrl: REPORTING_METHODS.includes(authMethod(status)) ? '/api/client-errors' : '',
  });
  log.app.info('STARTcloud UI starting', { role: status.role, version: status.version });
  const { i18n, ready, getSupportedLanguages } = createI18n({ loadSupportedLanguages });
  return Promise.all([ready, loadRules()]).then(() => {
    root.render(
      <AppProvider i18n={i18n} status={status}>
        <App getSupportedLanguages={getSupportedLanguages} />
      </AppProvider>
    );
  });
};

const unreachable = retry => {
  const { i18n, ready } = createI18n({ loadSupportedLanguages: () => __SUPPORTED_LOCALES__ });
  return ready.then(() => {
    root.render(
      <I18nextProvider i18n={i18n}>
        <Suspense fallback={i18n.t('loading')}>
          <StatusUnreachable onRetry={retry} />
        </Suspense>
      </I18nextProvider>
    );
  });
};

const start = () => probeStatus().then(boot, () => unreachable(start));

start();
