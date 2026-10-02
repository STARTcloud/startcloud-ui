import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { FaDownload } from 'react-icons/fa6';

/**
 * The templates of the time synchronization configuration,
 * hyperweaver-ui's: the one template the agent suggests, the default
 * pool, and Load template, held until one is chosen; hyperweaver-ui's
 * Refresh is the page's own.
 */
const ConfigTemplates = ({
  configInfo,
  selectedTemplate,
  setSelectedTemplate,
  onLoadTemplate,
  busy,
}) => {
  const { t } = useTranslation();
  return (
    <div className="mb-3" data-panel="time-config-templates">
      <h6 className="fw-bold">{t('hostTime.timeSyncConfigTemplates.heading')}</h6>
      <div className="d-flex gap-2">
        <select
          className="form-select flex-grow-1"
          aria-label={t('hostTime.timeSyncConfigTemplates.heading')}
          value={selectedTemplate}
          onChange={event => setSelectedTemplate(event.target.value)}
        >
          <option value="">{t('hostTime.timeSyncConfigTemplates.selectPlaceholder')}</option>
          {configInfo?.suggested_defaults?.config_template ? (
            <option value="default">
              {t('hostTime.timeSyncConfigTemplates.defaultPoolOption')}
            </option>
          ) : null}
        </select>
        <button
          type="button"
          className="btn btn-outline-info"
          data-action="time-template"
          onClick={onLoadTemplate}
          disabled={!selectedTemplate || busy}
        >
          <FaDownload className="me-1" aria-hidden="true" />
          {t('hostTime.timeSyncConfigTemplates.loadTemplate')}
        </button>
      </div>
    </div>
  );
};

ConfigTemplates.propTypes = {
  configInfo: PropTypes.shape({
    suggested_defaults: PropTypes.shape({ config_template: PropTypes.string }),
  }),
  selectedTemplate: PropTypes.string.isRequired,
  setSelectedTemplate: PropTypes.func.isRequired,
  onLoadTemplate: PropTypes.func.isRequired,
  busy: PropTypes.bool.isRequired,
};

export default ConfigTemplates;
