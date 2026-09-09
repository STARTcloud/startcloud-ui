import { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';

import AuthShell, { AuthAlert } from '../../../components/common/AuthShell';
import CopyButton from '../../../components/common/CopyButton';

/**
 * `/oauth2/code`: the authorization code from the URL in a monospace
 * block with a copy button, the error state as a danger alert from
 * `error` and `error_description`, and the missing state.
 */
const CodeDisplayPage = () => {
  const { t } = useTranslation(['auth']);
  const location = useLocation();
  const { code, error, description } = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return {
      code: params.get('code') || '',
      error: params.get('error') || '',
      description: params.get('error_description') || '',
    };
  }, [location.search]);

  useEffect(() => {
    document.title = t('code.title');
  }, [t]);

  return (
    <AuthShell title={t('code.title')} subtitle={code ? t('code.subhead') : ''}>
      {error ? (
        <AuthAlert tone="danger">
          <strong>{t('code.failed')}</strong> {error}
          {description ? `: ${description}` : ''}
        </AuthAlert>
      ) : null}
      {code ? (
        <>
          <div className="auth-alert auth-alert-info">
            <code className="auth-code">{code}</code>
          </div>
          <CopyButton
            text={code}
            label={t('code.copy')}
            className="auth-btn auth-btn-primary auth-btn-block"
          />
          <p className="auth-foot">{t('code.close')}</p>
        </>
      ) : null}
      {!code && !error ? <AuthAlert tone="info">{t('code.missing')}</AuthAlert> : null}
    </AuthShell>
  );
};

export default CodeDisplayPage;
