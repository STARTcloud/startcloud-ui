import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';

import RangeSlider, { twoLines } from './RangeSlider';

const APPLY_METHODS = [
  ['runtime', 'runtimeOnlyOption'],
  ['persistent', 'persistentOnlyOption'],
  ['both', 'bothOption'],
];

/**
 * The performance parameters of ZFS, hyperweaver-ui's: the pending I/Os
 * per device, the prefetching switch, both dynamic, and the apply
 * method.
 */
const PerformanceSection = ({ formData, busy, handleFormChange }) => {
  const { t } = useTranslation();
  return (
    <div data-panel="arc-performance">
      <hr />
      <h6 className="fw-bold text-info">{t('hostCharts.performanceSection.sectionTitle')}</h6>
      <div className="row g-3">
        <div className="col-12 col-lg-6">
          <RangeSlider
            id="arc-vdev-pending"
            label={t('hostCharts.performanceSection.vdevMaxPendingLabel')}
            shown={formData.vdev_max_pending || t('hostCharts.performanceSection.autoValue')}
            dynamic
            tone="primary"
            min="1"
            max="100"
            step="1"
            value={formData.vdev_max_pending || '10'}
            onChange={value => handleFormChange('vdev_max_pending', value)}
            onReset={() => handleFormChange('vdev_max_pending', '')}
            resetLabel={t('hostCharts.performanceSection.defaultLabel')}
            resetTitle={t('hostCharts.performanceSection.resetToDefaultTitle')}
            help={twoLines(t('hosts.manage.arc.pendingHelp'), t('hosts.manage.arc.pendingTypical'))}
            disabled={busy}
          />
        </div>
        <div className="col-12 col-lg-6">
          <div className="mb-3">
            <p className="form-label mb-1">
              {t('hostCharts.performanceSection.zfsPrefetchingLabel')}
              <span className="badge text-bg-success ms-2">
                {t('hostCharts.performanceSection.dynamicBadge')}
              </span>
            </p>
            <div className="form-check form-switch">
              <input
                id="prefetch-enable"
                className="form-check-input"
                type="checkbox"
                role="switch"
                checked={!formData.prefetch_disable}
                onChange={event => handleFormChange('prefetch_disable', !event.target.checked)}
                disabled={busy}
              />
              <label className="form-check-label" htmlFor="prefetch-enable">
                {t('hostCharts.performanceSection.enablePrefetchingLabel')}
              </label>
            </div>
            <div className="form-text text-muted">
              {t('hosts.manage.arc.prefetchHelp')}
              <br />
              {t('hosts.manage.arc.prefetchKeep')}
            </div>
          </div>
        </div>
        <div className="col-12 col-lg-6">
          <div className="mb-3">
            <label className="form-label" htmlFor="apply-method">
              {t('hostCharts.performanceSection.applyMethodLabel')}
            </label>
            <select
              id="apply-method"
              className="form-select"
              value={formData.apply_method}
              onChange={event => handleFormChange('apply_method', event.target.value)}
              disabled={busy}
            >
              {APPLY_METHODS.map(([value, key]) => (
                <option key={value} value={value}>
                  {t(`hostCharts.performanceSection.${key}`)}
                </option>
              ))}
            </select>
            <p className="form-text text-muted">{t('hosts.manage.arc.applyMethodHelp')}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

PerformanceSection.propTypes = {
  formData: PropTypes.object.isRequired,
  busy: PropTypes.bool.isRequired,
  handleFormChange: PropTypes.func.isRequired,
};

export default PerformanceSection;
