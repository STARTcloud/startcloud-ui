import PropTypes from 'prop-types';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { foldsShape } from '../../../components/common/SectionCard';
import { chartOf } from '../charts/registry';
import { useHostSeries } from '../hooks/useHostSeries';
import { chartSpec } from '../utils/chartSpecs';
import { samplesIn } from '../utils/series';

import ChartCard from './ChartCard';

const emptyKeyOf = ({ loaded, failed, texts }) => {
  if (!loaded) {
    return 'pages.loading';
  }
  return failed ? 'hosts.charts.loadError' : texts.emptyKey;
};

/**
 * One performance chart of the host page, a `ChartCard` that folds under
 * `chart-` and the chart's key over the series `useHostSeries` holds of
 * the host, and under the chart, while the series holds one sample
 * alone, the line saying the chart draws one sample and grows as
 * samples arrive, an agent that keeps no history answering no more.
 */
const PerformanceCard = ({ id, metric, host, folds }) => {
  const { t } = useTranslation();
  const { rows, loaded, failed } = useHostSeries(id, metric);
  const { texts } = chartOf(metric);
  const spec = useMemo(() => chartSpec(metric, { rows, t }), [metric, rows, t]);
  return (
    <ChartCard
      chart={metric}
      metric={metric}
      title={t(texts.titleKey)}
      chartTitle={t(texts.chartTitleKey)}
      expandedTitle={t(texts.expandedKey)}
      spec={spec}
      emptyText={t(emptyKeyOf({ loaded, failed, texts }))}
      host={host}
      folds={folds}
      fold={`chart-${metric}`}
    >
      {samplesIn(rows) === 1 ? (
        <p className="small text-muted mt-2 mb-0" data-note="one-sample">
          {t('hosts.charts.oneSample')}
        </p>
      ) : null}
    </ChartCard>
  );
};

PerformanceCard.propTypes = {
  id: PropTypes.string.isRequired,
  metric: PropTypes.string.isRequired,
  host: PropTypes.string.isRequired,
  folds: foldsShape.isRequired,
};

export default PerformanceCard;
