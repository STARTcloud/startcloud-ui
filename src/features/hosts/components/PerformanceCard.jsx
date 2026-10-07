import PropTypes from 'prop-types';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaExpand } from 'react-icons/fa6';

import Chart from '../../../components/common/Chart';
import ChartDialog from '../../../components/common/ChartDialog';
import SectionCard, { foldsShape } from '../../../components/common/SectionCard';
import SeriesToggles from '../../../components/common/SeriesToggles';
import { chartOf } from '../charts/registry';
import { useHostSeries } from '../hooks/useHostSeries';
import { chartSpec, chartToggles } from '../utils/chartSpecs';
import { samplesIn } from '../utils/series';

const emptyKeyOf = ({ loaded, failed, texts }) => {
  if (!loaded) {
    return 'pages.loading';
  }
  return failed ? 'hosts.charts.loadError' : texts.emptyKey;
};

/**
 * One performance chart of the host page, a section card that folds
 * under `chart-` and the chart's key: the buttons that show and hide the
 * groups of its series and the button that opens the chart at size in
 * the card's actions, the shared chart in the 200px box over the series
 * `useHostSeries` holds of the host, its legend under it on every chart
 * but the CPU's, hyperweaver-ui's manner, and under it, while the series
 * holds one sample alone, the line saying the chart draws one sample and
 * grows as samples arrive, an agent that keeps no history answering no
 * more. The expanded dialog draws the same series with the same groups
 * shown, so a group hidden in one is hidden in the other.
 */
const PerformanceCard = ({ id, metric, host, folds, visibility, onToggle }) => {
  const { t } = useTranslation();
  const { rows, loaded, failed } = useHostSeries(id, metric);
  const [expanded, setExpanded] = useState(false);
  const { texts, cardLegend } = chartOf(metric);
  const toggles = useMemo(() => chartToggles(metric, t), [metric, t]);
  const spec = useMemo(
    () => chartSpec(metric, { rows, visibility, t }),
    [metric, rows, visibility, t]
  );
  const emptyText = t(emptyKeyOf({ loaded, failed, texts }));
  const fold = `chart-${metric}`;

  const actions = (
    <>
      {toggles.length > 0 ? (
        <SeriesToggles toggles={toggles} visibility={visibility} onToggle={onToggle} />
      ) : null}
      <button
        type="button"
        className="btn btn-sm btn-outline-secondary"
        data-tool="expand"
        title={t('hosts.charts.expand')}
        aria-label={t('hosts.charts.expand')}
        onClick={() => setExpanded(true)}
      >
        <FaExpand aria-hidden="true" />
      </button>
    </>
  );

  return (
    <div data-chart={metric}>
      <SectionCard
        title={t(texts.titleKey)}
        actions={actions}
        className="mb-0"
        folded={folds.folded(fold)}
        onFold={() => folds.toggle(fold)}
      >
        <Chart
          title={t(texts.chartTitleKey)}
          series={spec.series}
          axes={spec.axes}
          emptyText={emptyText}
          legend={cardLegend}
        />
        {samplesIn(rows) === 1 ? (
          <p className="small text-muted mt-2 mb-0" data-note="one-sample">
            {t('hosts.charts.oneSample')}
          </p>
        ) : null}
      </SectionCard>
      {expanded ? (
        <ChartDialog
          title={t('hosts.charts.dialogTitle', { title: t(texts.expandedKey), host })}
          chartTitle={t(texts.chartTitleKey)}
          series={spec.series}
          axes={spec.axes}
          emptyText={emptyText}
          toggles={toggles}
          visibility={visibility}
          onToggle={onToggle}
          onHide={() => setExpanded(false)}
        />
      ) : null}
    </div>
  );
};

PerformanceCard.propTypes = {
  id: PropTypes.string.isRequired,
  metric: PropTypes.string.isRequired,
  host: PropTypes.string.isRequired,
  folds: foldsShape.isRequired,
  visibility: PropTypes.objectOf(PropTypes.bool).isRequired,
  onToggle: PropTypes.func.isRequired,
};

export default PerformanceCard;
