import PropTypes from 'prop-types';
import { Suspense } from 'react';
import { I18nextProvider } from 'react-i18next';
import { BrowserRouter } from 'react-router-dom';

import ErrorBoundary from '../components/common/ErrorBoundary';
import { NoticeProvider } from '../contexts/NoticeContext';
import { StatusProvider, statusShape } from '../contexts/StatusContext';
import { reportRenderError } from '../lib/logger';

/**
 * The providers the app renders through: i18n, the status the app booted
 * with, Suspense for the lazy locale loads, the shared error boundary, the
 * notice store and the router.
 */
const AppProvider = ({ i18n, status, children }) => (
  <I18nextProvider i18n={i18n}>
    <StatusProvider status={status}>
      <Suspense fallback={i18n.t('loading')}>
        <ErrorBoundary showErrorDetails={import.meta.env.DEV} onError={reportRenderError}>
          <NoticeProvider>
            <BrowserRouter>{children}</BrowserRouter>
          </NoticeProvider>
        </ErrorBoundary>
      </Suspense>
    </StatusProvider>
  </I18nextProvider>
);

AppProvider.propTypes = {
  i18n: PropTypes.object.isRequired,
  status: statusShape.isRequired,
  children: PropTypes.node.isRequired,
};

export default AppProvider;
