import PropTypes from 'prop-types';
import { useMemo, useState } from 'react';

import { ChartControlsContext, useChartControlsState } from '../../hooks/useChartControls';
import { useHostReadingsRefresh } from '../../hooks/useHostReadings';
import { useHostSeries, useHostSeriesQuery, useHostSeriesRefresh } from '../../hooks/useHostSeries';
import { DEFAULT_CHART_SORT } from '../../utils/networking';
import { networkSeries } from '../../utils/series';
import ChartControls from '../ChartControls';
import NetworkingCharts, { SortSelect } from '../NetworkingCharts';
import SectionPane from '../SectionPane';

/**
 * The Bandwidth page of a host: the page's one heading, the section's
 * title counting the interfaces with a sample, the order of the
 * interfaces' charts, the time window, Refresh and Pause in its pane, no
 * chevron, and straight under it the chart cards, all from the one series
 * `useHostSeries` holds of the host's network usage, its points per
 * interface drawn once, each card its heading with no chevron; the order
 * the page's own and kept while the page is drawn. Refresh reads every
 * held answer of the host and every drawn series again.
 */
const BandwidthPage = ({ id, server, section, host, onRefresh }) => {
  const refreshReadings = useHostReadingsRefresh();
  const refreshSeries = useHostSeriesRefresh();
  const { query, setQuery } = useHostSeriesQuery(id);
  const controls = useChartControlsState(query.window);
  const usage = useHostSeries(id, 'network');
  const entities = useMemo(() => networkSeries(usage.rows), [usage.rows]);
  const [order, setOrder] = useState(DEFAULT_CHART_SORT);

  const refresh = () => {
    onRefresh();
    refreshReadings(id);
    refreshSeries(id);
  };

  const actions = (
    <>
      {usage.offered ? <SortSelect order={order} onChange={setOrder} /> : null}
      <ChartControls
        query={query}
        onQuery={setQuery}
        scope="networkingHeader"
        series={usage.offered}
        controls={controls}
        onRefresh={refresh}
      />
    </>
  );

  return (
    <ChartControlsContext.Provider value={controls}>
      <SectionPane
        section={section}
        server={server}
        count={usage.loaded ? Object.keys(entities).length : null}
        actions={actions}
      >
        <NetworkingCharts id={id} host={host.label} entities={entities} order={order} />
      </SectionPane>
    </ChartControlsContext.Provider>
  );
};

BandwidthPage.propTypes = {
  id: PropTypes.string.isRequired,
  server: PropTypes.object.isRequired,
  section: PropTypes.string.isRequired,
  host: PropTypes.shape({ label: PropTypes.string.isRequired }).isRequired,
  onRefresh: PropTypes.func.isRequired,
};

export default BandwidthPage;
