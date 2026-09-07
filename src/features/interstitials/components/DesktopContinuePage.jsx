import { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';

import CopyButton from '../../../components/common/CopyButton';
import AuthShell, { AuthAlert } from '../../auth/components/AuthShell';

const SCHEME = 'swb://auth/login';

/**
 * `/continue`: "Continue in the Setup Guide", the "Open Setup Guide"
 * button to `swb://auth/login?email&token`, the token in a masked field
 * with the same copy button the code page has, the help line, and the
 * invalid-link warning when either parameter is missing.
 */
const DesktopContinuePage = () => {
  const { t } = useTranslation(['auth']);
  const location = useLocation();
  const { token, email } = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return { token: params.get('token') || '', email: params.get('email') || '' };
  }, [location.search]);
  const valid = Boolean(token && email);
  const href = `${SCHEME}?${new URLSearchParams({ email, token }).toString()}`;

  useEffect(() => {
    document.title = t('desktop.title');
  }, [t]);

  return (
    <AuthShell title={t('desktop.title')} subtitle={t('desktop.subhead')}>
      {valid ? (
        <>
          <a href={href} className="auth-btn auth-btn-primary auth-btn-block">
            {t('desktop.open')}
          </a>
          <div className="field auth-field">
            <label className="form-label" htmlFor="desktop-token">
              {t('desktop.token')}
            </label>
            <div className="auth-row">
              <div className="auth-input-wrap auth-grow">
                <input id="desktop-token" type="password" value={token} readOnly />
              </div>
              <CopyButton text={token} className="auth-btn auth-btn-secondary" />
            </div>
          </div>
          <p className="auth-hint">{t('desktop.help')}</p>
        </>
      ) : (
        <AuthAlert tone="danger">{t('desktop.invalid')}</AuthAlert>
      )}
    </AuthShell>
  );
};

export default DesktopContinuePage;
