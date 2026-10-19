import PropTypes from 'prop-types';
import { Component, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaArrowsRotate, FaHouse, FaTriangleExclamation } from 'react-icons/fa6';

import { copyToClipboard } from '../../lib/clipboard';

const CONTEXT_LENGTH = 200;

const reportUrlOf = (ticketUrl, error) => {
  if (!ticketUrl) {
    return '';
  }
  try {
    const url = new URL(ticketUrl);
    url.searchParams.set('type', 'Frontend');
    url.searchParams.set('context', String(error || '').slice(0, CONTEXT_LENGTH));
    return url.href;
  } catch {
    return '';
  }
};

const copyText = (error, errorInfo) =>
  [
    `path: ${window.location.pathname}`,
    `time: ${new Date().toISOString()}`,
    `browser: ${navigator.userAgent}`,
    `screen: ${window.screen.width}x${window.screen.height}`,
    String(error || ''),
    error?.stack || '',
    errorInfo?.componentStack || '',
  ]
    .filter(Boolean)
    .join('\n');

const Fallback = ({ error, errorInfo, showErrorDetails, ticketUrl }) => {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const report = reportUrlOf(ticketUrl, error);

  const copy = () =>
    copyToClipboard(copyText(error, errorInfo))
      .then(() => setCopied(true))
      .catch(() => null);

  return (
    <div className="auth-page">
      <div className="auth-column error-card">
        <div className="auth-icon-circle danger" aria-hidden="true">
          <FaTriangleExclamation />
        </div>
        <h2 className="error-card-title">{t('error.somethingWentWrong')}</h2>
        <p className="auth-hint">{t('error.unexpectedErrorOccurred')}</p>
        <div className="error-card-actions">
          <button
            type="button"
            className="auth-btn auth-btn-primary"
            onClick={() => window.location.reload()}
          >
            <FaArrowsRotate aria-hidden />
            {t('error.refreshPage')}
          </button>
          <button
            type="button"
            className="auth-btn auth-btn-secondary"
            onClick={() => window.location.assign('/')}
          >
            <FaHouse aria-hidden />
            {t('error.goHome')}
          </button>
          {report ? (
            <a
              href={report}
              target="_blank"
              rel="noopener noreferrer"
              className="auth-btn auth-btn-secondary"
              data-action="report-error"
            >
              {t('errors.report')}
            </a>
          ) : null}
          <button
            type="button"
            className="auth-btn auth-btn-secondary"
            data-action="copy-error"
            onClick={copy}
            onBlur={() => setCopied(false)}
            aria-live="polite"
          >
            {copied ? t('errors.copied') : t('errors.copy')}
          </button>
        </div>
        {showErrorDetails && error ? (
          <details className="auth-details w-100">
            <summary>{t('error.errorDetailsDevelopment')}</summary>
            <pre>
              {error.toString()}
              {errorInfo?.componentStack}
            </pre>
          </details>
        ) : null}
      </div>
    </div>
  );
};

Fallback.propTypes = {
  error: PropTypes.object,
  errorInfo: PropTypes.object,
  showErrorDetails: PropTypes.bool.isRequired,
  ticketUrl: PropTypes.string.isRequired,
};

class Boundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ error, errorInfo });
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }
    return (
      <Fallback
        error={this.state.error}
        errorInfo={this.state.errorInfo}
        showErrorDetails={this.props.showErrorDetails}
        ticketUrl={this.props.ticketUrl}
      />
    );
  }
}

Boundary.propTypes = {
  children: PropTypes.node.isRequired,
  showErrorDetails: PropTypes.bool.isRequired,
  ticketUrl: PropTypes.string.isRequired,
  onError: PropTypes.func,
};

/**
 * Catches a render error anywhere under it and draws the shared fallback
 * card in the error page's card style: Refresh page, Go home, Report this
 * issue while `ticketUrl` is given, the ticket URL with `type=Frontend`
 * and the error's first line as `context`, and Copy error details, the
 * path, the time, the browser, the screen, the error, its stack and the
 * component stack to the clipboard; the component stack also behind a
 * details fold when `showErrorDetails` is on. `onError` lets an app ship
 * the error and its component stack its own way.
 */
const ErrorBoundary = ({ children, showErrorDetails = false, ticketUrl = '', onError = null }) => (
  <Boundary showErrorDetails={showErrorDetails} ticketUrl={ticketUrl} onError={onError}>
    {children}
  </Boundary>
);

ErrorBoundary.propTypes = {
  children: PropTypes.node.isRequired,
  showErrorDetails: PropTypes.bool,
  ticketUrl: PropTypes.string,
  onError: PropTypes.func,
};

export default ErrorBoundary;
