import PropTypes from 'prop-types';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import Chart from '../../../components/common/Chart';
import { formatValue, latestValue } from '../../../utils/chart';
import { chartOf, hostSeriesOf } from '../charts/registry';
import { useChartControls, useDrawnRange } from '../hooks/useChartControls';
import { useHostSeries } from '../hooks/useHostSeries';
import { chartSpec, visibleSeries } from '../utils/chartSpecs';

const VALUE_DIGITS = 1;

const NONE = '-';

const emptyKeyOf = ({ loaded, failed, texts }) => {
  if (!loaded) {
    return 'pages.loading';
  }
  return failed ? 'hosts.charts.loadError' : texts.emptyKey;
};

const shownOf = (series, groups) =>
  Object.fromEntries(series.map(line => [line.group, groups.includes(line.group)]));

const unitOf = (series, axes) => {
  const line = series.find(entry => !entry.hidden);
  return line ? (line.unit ?? axes[line.axis || 0]?.unit ?? '') : '';
};

/**
 * One chart of the registry drawn small for one host, the dashboard's
 * Charts widget's tile: the host's name, the chart's title and the
 * newest value its shown lines hold together in the header, and under it
 * the one `Chart` drawn `compact` in the `xs` box over the host series
 * the registry entry names, the lines of `groups` alone shown, over the
 * window of the page's chart controls and in their crosshair group.
 */
const ChartWidget = ({ id, host, chart }) => {
  const { t } = useTranslation();
  const controls = useChartControls();
  const { key, groups } = chart;
  const { texts } = chartOf(key);
  const { rows, loaded, failed } = useHostSeries(id, hostSeriesOf(key));
  const spec = useMemo(() => chartSpec(key, { rows, t }), [key, rows, t]);
  const series = useMemo(
    () => visibleSeries(spec.series, shownOf(spec.series, groups)),
    [spec.series, groups]
  );
  const range = useDrawnRange(series, controls);
  const value = latestValue(series);
  return (
    <div className="col-12 col-sm-6 col-xl-3" data-widget-chart={`${id}:${key}`}>
      <div className="card h-100">
        <div className="card-body py-2 px-3">
          <div className="d-flex align-items-baseline gap-2 mb-1">
            <span className="section-card-title fw-semibold">{host}</span>
            <span className="small text-muted">· {t(texts.titleKey)}</span>
            <span className="ms-auto small fw-semibold" data-widget-value>
              {value === null ? NONE : formatValue(value, unitOf(series, spec.axes), VALUE_DIGITS)}
            </span>
          </div>
          <Chart
            title={t(texts.chartTitleKey || texts.titleKey)}
            series={series}
            axes={spec.axes}
            range={range}
            group={controls.group}
            emptyText={t(emptyKeyOf({ loaded, failed, texts }))}
            size="xs"
            compact
          />
        </div>
      </div>
    </div>
  );
};

ChartWidget.propTypes = {
  id: PropTypes.string.isRequired,
  host: PropTypes.string.isRequired,
  chart: PropTypes.shape({
    key: PropTypes.string.isRequired,
    groups: PropTypes.arrayOf(PropTypes.string).isRequired,
  }).isRequired,
};

export default ChartWidget;
