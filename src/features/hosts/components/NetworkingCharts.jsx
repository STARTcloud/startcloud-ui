import PropTypes from 'prop-types';
import { useMemo, useState } from 'react';
import { Form } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';

import { foldsShape } from '../../../components/common/SectionCard';
import SectionHeading from '../../../components/common/SectionHeading';
import { chartOf } from '../charts/registry';
import { useHostSeries } from '../hooks/useHostSeries';
import {
  CHART_SORTS,
  DEFAULT_CHART_SORT,
  interfaceSpec,
  sortedInterfaces,
  summarySpec,
} from '../utils/networking';
import { samplesIn } from '../utils/series';

import ChartCard from './ChartCard';
import OneSampleNote from './OneSampleNote';

const FOLD = 'charts';

const SUMMARY = chartOf('network-summary');

const emptyKeyOf = ({ loaded, failed }) => {
  if (!loaded) {
    return 'pages.loading';
  }
  return failed ? 'hosts.charts.loadError' : SUMMARY.texts.emptyKey;
};

const SortSelect = ({ order, onChange }) => {
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
 * The bandwidth charts of the networking page, behind `monitoring`, over
 * the one series `useHostSeries` holds of the host's network usage, the
 * copy the host page's network chart and the bandwidth table share: one
 * heading with its title, the select that orders the charts of the
 * interfaces, the busiest first, by name, or by the rate received or
 * sent, and the chevron that folds the whole section, the fold kept in
 * the page's preferences; under it the three charts that draw every
 * interface together, the megabits a second received, sent and both, a
 * line an interface, and then one chart an interface, titled by the
 * interface's own name, its three lines received, sent and both, in the
 * order the select names, each a `ChartCard`, all over `entities`, the
 * points per interface the page drew of the series. The order is the
 * page's own and is kept while the page is drawn.
 */
const NetworkingCharts = ({ id, host, entities, folds }) => {
  const { t } = useTranslation();
  const { rows, loaded, failed, offered } = useHostSeries(id, 'network');
  const [order, setOrder] = useState(DEFAULT_CHART_SORT);
  const names = useMemo(() => sortedInterfaces(entities, order), [entities, order]);

  if (!offered) {
    return null;
  }

  const emptyText = t(emptyKeyOf({ loaded, failed }));
  const single = samplesIn(rows) === 1;
  const folded = folds.folded(FOLD);

  return (
    <div data-panel="networking-charts" data-folded={folded}>
      <SectionHeading
        title={t('host.bandwidthCharts.title')}
        actions={<SortSelect order={order} onChange={setOrder} />}
        folded={folded}
        onFold={() => folds.toggle(FOLD)}
        foldTitle={t(folded ? 'host.bandwidthCharts.expand' : 'host.bandwidthCharts.collapse')}
      />
      {folded ? null : (
        <>
          <div data-panel="networking-summary-charts">
            <SectionHeading title={t('host.bandwidthCharts.allInterfacesSummary')} />
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
                    folds={folds}
                    fold={`chart-network-${chart.key}`}
                  >
                    <OneSampleNote single={single} />
                  </ChartCard>
                </div>
              ))}
            </div>
          </div>
          {names.length > 0 ? (
            <div data-panel="networking-interface-charts">
              <SectionHeading title={t('host.bandwidthCharts.individualCharts')} />
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
                      folds={folds}
                      fold={`chart-interface:${name}`}
                    >
                      <OneSampleNote single={single} />
                    </ChartCard>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
};

NetworkingCharts.propTypes = {
  id: PropTypes.string.isRequired,
  host: PropTypes.string.isRequired,
  entities: PropTypes.object.isRequired,
  folds: foldsShape.isRequired,
};

export default NetworkingCharts;
