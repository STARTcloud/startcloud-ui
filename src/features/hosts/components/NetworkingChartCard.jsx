import PropTypes from 'prop-types';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaExpand } from 'react-icons/fa6';

import Chart from '../../../components/common/Chart';
import ChartDialog from '../../../components/common/ChartDialog';
import { axisShape, seriesShape } from '../../../components/common/chartShapes';
import SectionCard, { foldsShape } from '../../../components/common/SectionCard';

/**
 * One bandwidth chart of the networking page, the performance card's
 * shape: a section card that folds under `chart-` and the chart's key,
 * the button that opens the chart at size in the card's actions, the
 * shared chart in the 200px box with its legend under it and, while the
 * series holds one sample alone, the line saying the chart draws one
 * sample and grows as samples arrive. The expanded dialog draws the same
 * series under the chart's title and the host's label.
 */
const NetworkingChartCard = ({
  chart,
  title,
  chartTitle,
  host,
  spec,
  emptyText,
  single,
  folds,
}) => {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const fold = `chart-${chart}`;

  const actions = (
    <button
      type="button"
      className="btn btn-sm btn-outline-secondary"
      data-tool="expand"
      title={t('host.bandwidthCharts.expandChart')}
      aria-label={t('host.bandwidthCharts.expandChart')}
      onClick={() => setExpanded(true)}
    >
      <FaExpand aria-hidden="true" />
    </button>
  );

  return (
    <div data-chart={chart}>
      <SectionCard
        title={title}
        actions={actions}
        className="mb-0"
        folded={folds.folded(fold)}
        onFold={() => folds.toggle(fold)}
      >
        <Chart
          title={chartTitle}
          series={spec.series}
          axes={spec.axes}
          emptyText={emptyText}
          legend
        />
        {single ? (
          <p className="small text-muted mt-2 mb-0" data-note="one-sample">
            {t('hosts.charts.oneSample')}
          </p>
        ) : null}
      </SectionCard>
      {expanded ? (
        <ChartDialog
          title={t('hosts.charts.dialogTitle', { title, host })}
          chartTitle={chartTitle}
          series={spec.series}
          axes={spec.axes}
          emptyText={emptyText}
          onHide={() => setExpanded(false)}
        />
      ) : null}
    </div>
  );
};

NetworkingChartCard.propTypes = {
  chart: PropTypes.string.isRequired,
  title: PropTypes.string.isRequired,
  chartTitle: PropTypes.string.isRequired,
  host: PropTypes.string.isRequired,
  spec: PropTypes.shape({
    series: PropTypes.arrayOf(seriesShape).isRequired,
    axes: PropTypes.arrayOf(axisShape).isRequired,
  }).isRequired,
  emptyText: PropTypes.string.isRequired,
  single: PropTypes.bool.isRequired,
  folds: foldsShape.isRequired,
};

export default NetworkingChartCard;
