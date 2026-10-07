import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';

import { foldsShape } from '../../../components/common/SectionCard';
import SectionHeading from '../../../components/common/SectionHeading';
import { chartOf } from '../charts/registry';
import { summarySpec } from '../utils/chartDefaults';

import NetworkingChartCard from './NetworkingChartCard';

const SUMMARY_CHARTS = chartOf('storage-summary').charts;

/**
 * The three charts that draw every device together, hyperweaver-ui's
 * summary charts: the megabytes a second read, written and both, a line
 * a device, each over the one series of the disk I/O the host's context
 * holds.
 */
const SummaryCharts = ({ devices, host, emptyText, single, folds }) => {
  const { t } = useTranslation();
  return (
    <div data-panel="storage-summary-charts">
      <SectionHeading title={t('hostCharts.summaryCharts.sectionTitle')} />
      <div className="row g-3 mb-3">
        {SUMMARY_CHARTS.map(chart => (
          <div key={chart.key} className="col-12 col-lg-6 col-xxl-4">
            <NetworkingChartCard
              chart={`storage-${chart.key}`}
              title={t(chart.expandedKey)}
              chartTitle={t(chart.titleKey)}
              host={host}
              spec={summarySpec(chart.member, devices, t)}
              emptyText={emptyText}
              single={single}
              folds={folds}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

SummaryCharts.propTypes = {
  devices: PropTypes.object.isRequired,
  host: PropTypes.string.isRequired,
  emptyText: PropTypes.string.isRequired,
  single: PropTypes.bool.isRequired,
  folds: foldsShape.isRequired,
};

export default SummaryCharts;
