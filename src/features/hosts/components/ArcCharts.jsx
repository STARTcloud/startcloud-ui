import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';

import { foldsShape } from '../../../components/common/SectionCard';
import SectionHeading from '../../../components/common/SectionHeading';
import { ARC_CHARTS, chartOf } from '../charts/registry';
import { arcChartSpec } from '../utils/chartDefaults';

import ChartCard from './ChartCard';
import OneSampleNote from './OneSampleNote';

/**
 * The three ARC charts, the `ARC_CHARTS` entries of the registry: the
 * memory allocation, the cache efficiency and the compression
 * effectiveness, each a `ChartCard` over the one series of the ARC the
 * host's context holds. Nothing draws while the series holds no sample.
 */
const ArcCharts = ({ rows, host, emptyText, single, folds }) => {
  const { t } = useTranslation();
  if (rows.length === 0) {
    return null;
  }
  return (
    <div data-panel="storage-arc-charts">
      <SectionHeading title={t('hostCharts.arcCharts.sectionTitle')} />
      <div className="row g-3 mb-3">
        {ARC_CHARTS.map(key => (
          <div key={key} className="col-12 col-lg-6 col-xxl-4">
            <ChartCard
              chart={key}
              metric={key}
              title={t(chartOf(key).texts.expandedKey)}
              chartTitle={t(chartOf(key).texts.titleKey)}
              expandedTitle={t(chartOf(key).texts.expandedKey)}
              spec={arcChartSpec(key, rows, t)}
              emptyText={emptyText}
              host={host}
              folds={folds}
              fold={`chart-${key}`}
            >
              <OneSampleNote single={single} />
            </ChartCard>
          </div>
        ))}
      </div>
    </div>
  );
};

ArcCharts.propTypes = {
  rows: PropTypes.array.isRequired,
  host: PropTypes.string.isRequired,
  emptyText: PropTypes.string.isRequired,
  single: PropTypes.bool.isRequired,
  folds: foldsShape.isRequired,
};

export default ArcCharts;
