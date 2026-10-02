import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';

import RecordRows from '../../../../../components/common/RecordRows';

const serviceType = (service, t) => {
  if (service === 'ntp') {
    return 'NTP';
  }
  return service === 'chrony' ? 'Chrony' : t('hostTime.timeSyncConfigInfo.autoDetect');
};

/**
 * The configuration information of the time synchronization,
 * hyperweaver-ui's card as a record: the service type, the
 * configuration file and whether it exists.
 */
const ConfigInfo = ({ configInfo }) => {
  const { t } = useTranslation();
  if (!configInfo) {
    return null;
  }
  return (
    <div data-panel="time-config-info">
      <h6 className="fw-bold">{t('hostTime.timeSyncConfigInfo.heading')}</h6>
      <RecordRows
        rows={[
          {
            key: 'service',
            label: t('hostTime.timeSyncConfigInfo.serviceType'),
            value: <code>{serviceType(configInfo.service, t)}</code>,
          },
          {
            key: 'file',
            label: t('hostTime.timeSyncConfigInfo.configurationFile'),
            value: <code>{configInfo.config_file}</code>,
          },
          {
            key: 'exists',
            label: t('hostTime.timeSyncConfigInfo.fileExists'),
            value: (
              <span className={`badge text-bg-${configInfo.config_exists ? 'success' : 'warning'}`}>
                {t(
                  configInfo.config_exists
                    ? 'hostTime.timeSyncConfigInfo.yes'
                    : 'hostTime.timeSyncConfigInfo.no'
                )}
              </span>
            ),
          },
        ]}
      />
    </div>
  );
};

ConfigInfo.propTypes = {
  configInfo: PropTypes.shape({
    service: PropTypes.string,
    config_file: PropTypes.string,
    config_exists: PropTypes.bool,
  }),
};

export default ConfigInfo;
