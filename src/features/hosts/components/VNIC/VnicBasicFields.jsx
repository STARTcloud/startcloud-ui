import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';

/**
 * The name and the link of the VNIC create dialog, hyperweaver-ui's:
 * the name, suggested from the link, and the link among the host's
 * interfaces, etherstubs, aggregates and bridges.
 */
const VnicBasicFields = ({ name, link, availableLinks, onChange, disabled }) => {
  const { t } = useTranslation();
  return (
    <div className="row">
      <div className="col">
        <div className="mb-3">
          <label className="form-label" htmlFor="vnic-create-name">
            {t('hostTools.VnicBasicFields.vnicNameLabel')}
          </label>
          <input
            id="vnic-create-name"
            className="form-control"
            type="text"
            placeholder={t('hostTools.VnicBasicFields.vnicNamePlaceholder')}
            value={name}
            onChange={event => onChange('name', event.target.value)}
            disabled={disabled}
            required
          />
          <p className="form-text text-muted">{t('hostTools.VnicBasicFields.vnicNameHelp')}</p>
        </div>
      </div>
      <div className="col">
        <div className="mb-3">
          <label className="form-label" htmlFor="vnic-create-link">
            {t('hostTools.VnicBasicFields.physicalLinkLabel')}
          </label>
          <select
            id="vnic-create-link"
            className="form-select"
            value={link}
            onChange={event => onChange('link', event.target.value)}
            disabled={disabled}
            required
          >
            <option value="">{t('hostTools.VnicBasicFields.selectLinkOption')}</option>
            {availableLinks.map(row => (
              <option key={row.name} value={row.name}>
                {row.name} ({row.type}, {row.state}, {row.speed})
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
};

VnicBasicFields.propTypes = {
  name: PropTypes.string.isRequired,
  link: PropTypes.string.isRequired,
  availableLinks: PropTypes.arrayOf(
    PropTypes.shape({
      name: PropTypes.string.isRequired,
      type: PropTypes.string,
      state: PropTypes.string,
      speed: PropTypes.string,
    })
  ).isRequired,
  onChange: PropTypes.func.isRequired,
  disabled: PropTypes.bool.isRequired,
};

export default VnicBasicFields;
