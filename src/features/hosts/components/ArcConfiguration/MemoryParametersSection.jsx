import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';

import { arcSliderBounds, formatGbValue } from '../../utils/arcUtils';

import RangeSlider, { twoLines } from './RangeSlider';

const gbShown = (value, t) => {
  const text = formatGbValue(value);
  return text ? `${text} GB` : t('hostCharts.memoryParametersSection.autoValue');
};

/**
 * The memory parameters of the ARC, hyperweaver-ui's four sliders: the
 * maximum and the minimum ARC size in gibibytes between the system's
 * constraints, the ARC maximum as a percent of memory and the user
 * reserve hint, the two percents dynamic.
 */
const MemoryParametersSection = ({ formData, currentConfig, busy, handleFormChange }) => {
  const { t } = useTranslation();
  const bounds = arcSliderBounds(formData, currentConfig?.system_constraints);
  const autoLabel = t('hostCharts.memoryParametersSection.autoLabel');
  const autoTitle = t('hostCharts.memoryParametersSection.resetToAutoTitle');
  const rangeHelp = range =>
    twoLines(
      t('hosts.manage.arc.rangeHelp', { min: range.min, max: range.max }),
      t('hosts.manage.arc.autoHelp')
    );

  return (
    <div data-panel="arc-memory">
      <h6 className="fw-bold text-primary">
        {t('hostCharts.memoryParametersSection.sectionTitle')}
      </h6>
      <div className="row g-3">
        <div className="col-12 col-lg-6">
          <RangeSlider
            id="arc-max-gb"
            label={t('hostCharts.memoryParametersSection.maximumArcSizeLabel')}
            shown={gbShown(formData.arc_max_gb, t)}
            tone="primary"
            min={bounds.max.min}
            max={bounds.max.max}
            step="0.25"
            value={bounds.max.value}
            onChange={value => handleFormChange('arc_max_gb', value)}
            onReset={() => handleFormChange('arc_max_gb', '')}
            resetLabel={autoLabel}
            resetTitle={autoTitle}
            help={rangeHelp(bounds.max)}
            disabled={busy}
          />
        </div>
        <div className="col-12 col-lg-6">
          <RangeSlider
            id="arc-min-gb"
            label={t('hostCharts.memoryParametersSection.minimumArcSizeLabel')}
            shown={gbShown(formData.arc_min_gb, t)}
            tone="info"
            min={bounds.min.min}
            max={bounds.min.max}
            step="0.25"
            value={bounds.min.value}
            onChange={value => handleFormChange('arc_min_gb', value)}
            onReset={() => handleFormChange('arc_min_gb', '')}
            resetLabel={autoLabel}
            resetTitle={autoTitle}
            help={rangeHelp(bounds.min)}
            disabled={busy}
          />
        </div>
        <div className="col-12 col-lg-6">
          <RangeSlider
            id="arc-max-percent"
            label={t('hostCharts.memoryParametersSection.arcMaxPercentLabel')}
            shown={
              formData.arc_max_percent
                ? `${formData.arc_max_percent}%`
                : t('hostCharts.memoryParametersSection.autoValue')
            }
            dynamic
            tone="primary"
            min="1"
            max="100"
            step="1"
            value={formData.arc_max_percent || '90'}
            onChange={value => handleFormChange('arc_max_percent', value)}
            onReset={() => handleFormChange('arc_max_percent', '')}
            resetLabel={autoLabel}
            resetTitle={autoTitle}
            help={twoLines(t('hosts.manage.arc.percentHelp'), t('hosts.manage.arc.immediateHelp'))}
            disabled={busy}
          />
        </div>
        <div className="col-12 col-lg-6">
          <RangeSlider
            id="arc-user-reserve"
            label={t('hostCharts.memoryParametersSection.userReserveHintLabel')}
            shown={
              formData.user_reserve_hint_pct
                ? `${formData.user_reserve_hint_pct}%`
                : t('hostCharts.memoryParametersSection.noneValue')
            }
            dynamic
            tone="info"
            min="0"
            max="99"
            step="1"
            value={formData.user_reserve_hint_pct || '0'}
            onChange={value => handleFormChange('user_reserve_hint_pct', value)}
            onReset={() => handleFormChange('user_reserve_hint_pct', '')}
            resetLabel={t('hostCharts.memoryParametersSection.noneLabel')}
            resetTitle={t('hostCharts.memoryParametersSection.resetToNoneTitle')}
            help={twoLines(
              t('hosts.manage.arc.reserveHelp'),
              t('hosts.manage.arc.reserveImmediateHelp')
            )}
            disabled={busy}
          />
        </div>
      </div>
    </div>
  );
};

MemoryParametersSection.propTypes = {
  formData: PropTypes.object.isRequired,
  currentConfig: PropTypes.object,
  busy: PropTypes.bool.isRequired,
  handleFormChange: PropTypes.func.isRequired,
};

export default MemoryParametersSection;
