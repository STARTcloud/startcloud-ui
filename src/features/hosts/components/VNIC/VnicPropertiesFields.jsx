import PropTypes from 'prop-types';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { VNIC_PROPERTIES, VNIC_PROPERTY_VALUES } from '../../utils/networkingManagement';

/**
 * The link properties of the VNIC create dialog, hyperweaver-ui's: a
 * property picked among dladm's, its value picked where the property
 * has a vocabulary and typed otherwise, added as a badge that can be
 * removed.
 */
const VnicPropertiesFields = ({ properties, onAddProperty, onRemoveProperty, disabled }) => {
  const { t } = useTranslation();
  const [propertyKey, setPropertyKey] = useState('');
  const [propertyValue, setPropertyValue] = useState('');
  const options = VNIC_PROPERTY_VALUES[propertyKey];

  const add = () => {
    if (propertyKey.trim() && propertyValue.trim()) {
      onAddProperty(propertyKey.trim(), propertyValue.trim());
      setPropertyKey('');
      setPropertyValue('');
    }
  };

  return (
    <div className="mb-3">
      <label className="form-label" htmlFor="vnic-create-prop-key">
        {t('hostTools.VnicPropertiesFields.additionalPropertiesLabel')}
      </label>
      <div className="input-group">
        <select
          id="vnic-create-prop-key"
          className="form-select"
          value={propertyKey}
          onChange={event => setPropertyKey(event.target.value)}
          disabled={disabled}
        >
          <option value="">{t('hostTools.VnicPropertiesFields.selectPropertyOption')}</option>
          {VNIC_PROPERTIES.filter(property => !properties[property]).map(property => (
            <option key={property} value={property}>
              {property}
            </option>
          ))}
        </select>
        {options ? (
          <select
            id="vnic-create-prop-value"
            className="form-select"
            value={propertyValue}
            onChange={event => setPropertyValue(event.target.value)}
            disabled={disabled}
          >
            <option value="">
              {t('hostTools.VnicPropertiesFields.selectPropertyValueOption', { propertyKey })}
            </option>
            {options.map(option => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        ) : (
          <input
            id="vnic-create-prop-value"
            className="form-control"
            type="text"
            placeholder={t('hostTools.VnicPropertiesFields.propertyValuePlaceholder')}
            value={propertyValue}
            onChange={event => setPropertyValue(event.target.value)}
            disabled={disabled}
          />
        )}
        <button
          type="button"
          className="btn btn-info"
          onClick={add}
          disabled={!propertyKey.trim() || !propertyValue.trim() || disabled}
          data-tool="add-property"
        >
          {t('hostTools.VnicPropertiesFields.addButton')}
        </button>
      </div>
      {Object.keys(properties).length > 0 ? (
        <div className="mt-3">
          <p>
            <strong>{t('hostTools.VnicPropertiesFields.currentPropertiesHeading')}</strong>
          </p>
          <div className="d-flex flex-wrap gap-2">
            {Object.entries(properties).map(([key, value]) => (
              <span key={key} className="badge text-bg-info d-inline-flex align-items-center gap-1">
                {key}={value}
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  aria-label={t('hostTools.VnicPropertiesFields.removeAriaLabel')}
                  onClick={() => onRemoveProperty(key)}
                  disabled={disabled}
                />
              </span>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
};

VnicPropertiesFields.propTypes = {
  properties: PropTypes.object.isRequired,
  onAddProperty: PropTypes.func.isRequired,
  onRemoveProperty: PropTypes.func.isRequired,
  disabled: PropTypes.bool.isRequired,
};

export default VnicPropertiesFields;
