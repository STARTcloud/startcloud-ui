import PropTypes from 'prop-types';
import { Component } from 'react';
import { useTranslation } from 'react-i18next';
import { FaArrowsRotate, FaHouse, FaTriangleExclamation } from 'react-icons/fa6';

const Fallback = ({ error, errorInfo, showErrorDetails }) => {
  const { t } = useTranslation();
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
      />
    );
  }
}

Boundary.propTypes = {
  children: PropTypes.node.isRequired,
  showErrorDetails: PropTypes.bool.isRequired,
  onError: PropTypes.func,
};

/**
 * Catches a render error anywhere under it and draws the shared fallback
 * card in the error page's card style, refresh and home, with the component
 * stack behind a details fold when `showErrorDetails` is on; `onError` lets
 * an app ship the error and its component stack its own way.
 */
const ErrorBoundary = ({ children, showErrorDetails = false, onError = null }) => (
  <Boundary showErrorDetails={showErrorDetails} onError={onError}>
    {children}
  </Boundary>
);

ErrorBoundary.propTypes = {
  children: PropTypes.node.isRequired,
  showErrorDetails: PropTypes.bool,
  onError: PropTypes.func,
};

export default ErrorBoundary;
