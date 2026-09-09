import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';

import AuthShell from '../../../components/common/AuthShell';
import Field from '../../../components/common/Field';
import NativeForm from '../../../components/common/NativeForm';

const CODE = /[^A-Z0-9-]/g;

/**
 * `/activate`: the device code field, uppercase and prefilled from
 * `?user_code`, the `?error=invalid_user_code` alert painted on the field,
 * and Continue as a real form post to `/oauth2/device_verification`.
 */
const DeviceActivatePage = () => {
  const { t } = useTranslation(['auth']);
  const location = useLocation();
  const params = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const [code, setCode] = useState(() => (params.get('user_code') || '').toUpperCase());
  const mismatch = params.get('error') === 'invalid_user_code';

  useEffect(() => {
    document.title = t('device.title');
  }, [t]);

  return (
    <AuthShell title={t('device.title')} subtitle={t('device.subhead')}>
      <NativeForm action="/oauth2/device_verification">
        <Field
          id="device-code"
          label={t('device.code')}
          error={mismatch ? t('device.mismatch') : ''}
          className="auth-field"
        >
          {aria => (
            <div className="auth-input-wrap">
              <input
                {...aria}
                name="user_code"
                type="text"
                className="device-code"
                autoComplete="off"
                autoCapitalize="characters"
                placeholder="XXXX-XXXX"
                value={code}
                onChange={event => setCode(event.target.value.toUpperCase().replace(CODE, ''))}
              />
            </div>
          )}
        </Field>
        <button type="submit" className="auth-btn auth-btn-primary auth-btn-block">
          {t('device.continue')}
        </button>
      </NativeForm>
    </AuthShell>
  );
};

export default DeviceActivatePage;
