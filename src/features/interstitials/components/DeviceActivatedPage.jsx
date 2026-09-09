import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import AuthShell from '../../../components/common/AuthShell';

/**
 * `/activated`: "Device connected" and "You can close this window and
 * return to your device."
 */
const DeviceActivatedPage = () => {
  const { t } = useTranslation(['auth']);

  useEffect(() => {
    document.title = t('device.connected');
  }, [t]);

  return <AuthShell title={t('device.connected')} subtitle={t('device.close')} />;
};

export default DeviceActivatedPage;
