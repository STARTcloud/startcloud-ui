import 'bootstrap/dist/css/bootstrap.min.css';
import { Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { I18nextProvider } from 'react-i18next';

import '../css/styles.css';
import '../css/fonts.css';
import ErrorBoundary from '../components/common/ErrorBoundary';
import { probeStatus } from '../contexts/StatusContext';
import { CallbackPage } from '../features/auth';
import { createI18n } from '../lib/i18n';
import { configureLogger, reportRenderError } from '../lib/logger';
import { initRuntime, returnTo, session } from '../lib/runtime';

const onDone = () => window.location.replace(returnTo.consume() || '/');

probeStatus()
  .then(status => {
    initRuntime(status);
    configureLogger({});
    const { i18n, ready } = createI18n({
      namespace: status.role,
      loadSupportedLanguages: () => __SUPPORTED_LOCALES__,
    });
    return ready.then(() => {
      createRoot(document.getElementById('root')).render(
        <I18nextProvider i18n={i18n}>
          <Suspense fallback={i18n.t('loading')}>
            <ErrorBoundary showErrorDetails={import.meta.env.DEV} onError={reportRenderError}>
              <CallbackPage complete={session.complete} onDone={onDone} />
            </ErrorBoundary>
          </Suspense>
        </I18nextProvider>
      );
    });
  })
  .catch(error => {
    document.getElementById('root').textContent = error.message;
  });
