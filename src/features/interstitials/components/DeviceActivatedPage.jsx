import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import AuthShell from '../../../components/common/AuthShell';

/**
 * `/activated`: the tab closes itself once drawn, and "Device connected"
 * with "You can close this window and return to your device." stands for
 * a browser that refuses the close.
 */
const DeviceActivatedPage = () => {
  const { t } = useTranslation(['auth']);

  useEffect(() => {
    document.title = t('device.connected');
  }, [t]);

  useEffect(() => {
    window.close();
  }, []);

  return <AuthShell title={t('device.connected')} subtitle={t('device.close')} />;
};

export default DeviceActivatedPage;
