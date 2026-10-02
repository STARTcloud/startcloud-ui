import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';

import { getServiceType } from '../../utils/syslogUtils';

/**
 * The syslog help, hyperweaver-ui's: the common examples, the service's
 * information and its notes, the m4 example for the traditional syslog
 * alone.
 */
const HelpSection = ({ config }) => {
  const { t } = useTranslation();
  const serviceType = getServiceType(config);

  return (
    <div className="card mt-3" data-panel="syslog-help">
      <div className="card-body small">
        <h6 className="fw-bold">
          {t('hostTime.syslogHelpSection.heading', { service: serviceType.display })}
        </h6>
        <div className="row g-3">
          <div className="col-md-6">
            <p className="fw-semibold mb-1">
              {t('hostTime.syslogHelpSection.commonExamplesLabel')}
            </p>
            <ul>
              <li>
                <code>*.notice /var/adm/messages</code> -{' '}
                {t('hostTime.syslogHelpSection.exampleNotices')}
              </li>
              <li>
                <code>mail.* /var/log/maillog</code> -{' '}
                {t('hostTime.syslogHelpSection.exampleMailLogs')}
              </li>
              <li>
                <code>kern.err @loghost</code> -{' '}
                {t('hostTime.syslogHelpSection.exampleKernelErrors')}
              </li>
              <li>
                <code>*.emerg *</code> - {t('hostTime.syslogHelpSection.exampleEmergency')}
              </li>
              {serviceType.name === 'syslog' ? (
                <li>
                  <code>ifdef(`LOGHOST&apos;, action1, action2)</code> -{' '}
                  {t('hostTime.syslogHelpSection.exampleConditionalMacro')}
                </li>
              ) : null}
            </ul>
          </div>
          <div className="col-md-6">
            <p className="fw-semibold mb-1">{t('hostTime.syslogHelpSection.serviceInfoLabel')}</p>
            <ul>
              <li>
                <strong>{t('hostTime.syslogHelpSection.serviceField')}</strong>{' '}
                {serviceType.display}
              </li>
              <li>
                <strong>{t('hostTime.syslogHelpSection.configFileField')}</strong>{' '}
                {config?.config_file || t('hostTime.syslogHelpSection.unknown')}
              </li>
              <li>
                <strong>{t('hostTime.syslogHelpSection.fmriField')}</strong>{' '}
                {config?.service_fmri || t('hostTime.syslogHelpSection.unknown')}
              </li>
              {serviceType.name === 'rsyslog' ? (
                <li>
                  <strong>{t('hostTime.syslogHelpSection.featuresField')}</strong>{' '}
                  {t('hostTime.syslogHelpSection.rsyslogFeatures')}
                </li>
              ) : null}
              {serviceType.name === 'syslog' ? (
                <li>
                  <strong>{t('hostTime.syslogHelpSection.featuresField')}</strong>{' '}
                  {t('hostTime.syslogHelpSection.syslogFeatures')}
                </li>
              ) : null}
            </ul>
          </div>
        </div>
        {serviceType.name === 'rsyslog' ? (
          <div className="alert alert-info mb-0" role="note">
            <strong>{t('hostTime.syslogHelpSection.rsyslogNotesTitle')}</strong>{' '}
            {t('hostTime.syslogHelpSection.rsyslogNotesBody')}
          </div>
        ) : null}
        {serviceType.name === 'syslog' ? (
          <div className="alert alert-info mb-0" role="note">
            <strong>{t('hostTime.syslogHelpSection.syslogNotesTitle')}</strong>{' '}
            {t('hostTime.syslogHelpSection.syslogNotesBody')}
          </div>
        ) : null}
      </div>
    </div>
  );
};

HelpSection.propTypes = {
  config: PropTypes.object,
};

export default HelpSection;
