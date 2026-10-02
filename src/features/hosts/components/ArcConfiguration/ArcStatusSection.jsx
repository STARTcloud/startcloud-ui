import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';

import RecordRows from '../../../../components/common/RecordRows';
import { formatBytes } from '../../utils/arcUtils';

const badge = (tone, text) => <span className={`badge text-bg-${tone}`}>{text}</span>;

/**
 * The current ARC status, hyperweaver-ui's card: the current, the
 * maximum and the minimum size and the physical memory as badges, and
 * the system constraints, the safe maximum, the recommended minimum and
 * the configuration source.
 */
const ArcStatusSection = ({ currentConfig }) => {
  const { t } = useTranslation();
  if (!currentConfig) {
    return null;
  }
  const current = currentConfig.current_config || {};
  const constraints = currentConfig.system_constraints;
  return (
    <div className="card mb-3" data-panel="arc-status">
      <div className="card-body">
        <h6 className="fw-bold">{t('hostCharts.arcStatusSection.sectionTitle')}</h6>
        <RecordRows
          rows={[
            {
              key: 'size',
              label: t('hostCharts.arcStatusSection.currentArcSizeLabel'),
              value: badge('info', formatBytes(current.arc_size_bytes)),
            },
            {
              key: 'max',
              label: t('hostCharts.arcStatusSection.maxArcSizeLabel'),
              value: badge('primary', formatBytes(current.arc_max_bytes)),
            },
            {
              key: 'min',
              label: t('hostCharts.arcStatusSection.minArcSizeLabel'),
              value: badge('dark', formatBytes(current.arc_min_bytes)),
            },
            {
              key: 'memory',
              label: t('hostCharts.arcStatusSection.physicalMemoryLabel'),
              value: badge('secondary', formatBytes(constraints?.physical_memory_bytes)),
            },
          ]}
          className="mb-2"
        />
        {constraints ? (
          <div className="alert alert-dark small mb-0" data-note="arc-constraints">
            <h6 className="fw-bold">{t('hostCharts.arcStatusSection.systemConstraintsTitle')}</h6>
            <p className="mb-1">
              <strong>{t('hostCharts.arcStatusSection.maxSafeArcLabel')}:</strong>{' '}
              {formatBytes(constraints.max_safe_arc_bytes)} {t('hosts.manage.arc.safeShare')}
            </p>
            <p className="mb-1">
              <strong>{t('hostCharts.arcStatusSection.minRecommendedLabel')}:</strong>{' '}
              {formatBytes(constraints.min_recommended_arc_bytes)}{' '}
              {t('hosts.manage.arc.recommendedShare')}
            </p>
            <p className="mb-0">
              <strong>{t('hostCharts.arcStatusSection.configurationSourceLabel')}:</strong>{' '}
              {currentConfig.config_source || t('hosts.manage.arc.autoCalculated')}
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
};

ArcStatusSection.propTypes = {
  currentConfig: PropTypes.object,
};

export default ArcStatusSection;
