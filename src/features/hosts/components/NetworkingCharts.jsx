import PropTypes from 'prop-types';
import { useMemo } from 'react';
import { Form } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';

import { chartOf } from '../charts/registry';
import { useHostSeries } from '../hooks/useHostSeries';
import { CHART_SORTS, interfaceSpec, sortedInterfaces, summarySpec } from '../utils/networking';
import { samplesIn } from '../utils/series';

import ChartCard from './ChartCard';
import OneSampleNote from './OneSampleNote';

const SUMMARY = chartOf('network-summary');

const emptyKeyOf = ({ loaded, failed }) => {
  if (!loaded) {
    return 'pages.loading';
  }
  return failed ? 'hosts.charts.loadError' : SUMMARY.texts.emptyKey;
};

/**
 * The select of the Bandwidth page's heading pane that orders the charts
 * of the interfaces: the busiest first, by name, or by the rate received
 * or sent.
 */
export const SortSelect = ({ order, onChange }) => {
  const { t } = useTranslation();
  return (
    <Form.Select
      size="sm"
      className="w-auto"
      name="chart-sort"
      value={order}
      title={t('host.bandwidthCharts.sortTooltip')}
      aria-label={t('host.bandwidthCharts.sortTooltip')}
      onChange={event => onChange(event.target.value)}
    >
      {CHART_SORTS.map(entry => (
        <option key={entry.key} value={entry.key}>
          {t(entry.labelKey)}
        </option>
      ))}
    </Form.Select>
  );
};

SortSelect.propTypes = {
  order: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
};

/**
 * The bandwidth charts of the Bandwidth page, behind `monitoring`, over
 * the one series `useHostSeries` holds of the host's network usage, the
 * copy the host page's network chart and the interfaces' trend share,
 * straight under the page's heading with no heading of their own: the
 * three charts that draw every interface together, the megabits a second
 * received, sent and both, a line an interface, each titled by its own
 * card header, and then one chart an interface, titled by the
 * interface's own name, its three lines received, sent and both, in the
 * `order` the heading's `SortSelect` names, each a `ChartCard` with its
 * heading and no chevron, all over `entities`, the points per interface
 * the page drew of the series.
 */
const NetworkingCharts = ({ id, host, entities, order }) => {
  const { t } = useTranslation();
  const { rows, loaded, failed, offered } = useHostSeries(id, 'network');
  const names = useMemo(() => sortedInterfaces(entities, order), [entities, order]);

  if (!offered) {
    return null;
  }

  const emptyText = t(emptyKeyOf({ loaded, failed }));
  const single = samplesIn(rows) === 1;

  return (
    <div data-panel="networking-charts">
      <div data-panel="networking-summary-charts">
        <div className="row g-3 mb-3">
          {SUMMARY.charts.map(chart => (
            <div key={chart.key} className="col-12 col-lg-6 col-xxl-4">
              <ChartCard
                chart={`network-${chart.key}`}
                metric="network-summary"
                title={t(chart.titleKey)}
                chartTitle={t(chart.titleKey)}
                expandedTitle={t(chart.titleKey)}
                spec={summarySpec(chart.member, entities, t)}
                emptyText={emptyText}
                host={host}
              >
                <OneSampleNote single={single} />
              </ChartCard>
            </div>
          ))}
        </div>
      </div>
      {names.length > 0 ? (
        <div data-panel="networking-interface-charts">
          <div className="row g-3 mb-3">
            {names.map(name => (
              <div key={name} className="col-12 col-lg-6 col-xxl-4">
                <ChartCard
                  chart={`interface:${name}`}
                  metric="interface"
                  title={name}
                  chartTitle={name}
                  expandedTitle={name}
                  spec={interfaceSpec(entities[name], t)}
                  emptyText={emptyText}
                  host={host}
                >
                  <OneSampleNote single={single} />
                </ChartCard>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
};

NetworkingCharts.propTypes = {
  id: PropTypes.string.isRequired,
  host: PropTypes.string.isRequired,
  entities: PropTypes.object.isRequired,
  order: PropTypes.string.isRequired,
};

export default NetworkingCharts;
