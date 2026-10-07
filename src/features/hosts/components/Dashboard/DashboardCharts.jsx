import PropTypes from 'prop-types';

import { DASHBOARD_CHARTS, chartOf } from '../../charts/registry';
import { ChartControlsContext, useChartControlsState } from '../../hooks/useChartControls';
import { useHostSeriesQuery } from '../../hooks/useHostSeries';
import { hostLabel } from '../../utils/hosts';
import { hostOffers } from '../../utils/monitoring';
import ChartWidget from '../ChartWidget';

/**
 * The tiles the dashboard's Charts widget draws: one a host and a chart
 * of `DASHBOARD_CHARTS` whose tokens the host's own row lists, checked
 * strictly, in the order of the hosts and then of the charts.
 *
 * @param {Array<Object>} servers - The hosts the dashboard draws
 * @returns {Array<{ server: Object, chart: Object }>} The tiles
 */
export const dashboardTiles = servers =>
  servers.flatMap(server =>
    DASHBOARD_CHARTS.filter(chart => hostOffers(server, chartOf(chart.key).tokens)).map(chart => ({
      server,
      chart,
    }))
  );

/**
 * The dashboard's Charts widget: one `ChartWidget` a tile of
 * `dashboardTiles`, every tile under one set of chart controls over the
 * first host's window, so every tile reads one instant under the pointer.
 */
const DashboardCharts = ({ servers }) => {
  const { query } = useHostSeriesQuery(String(servers[0].id));
  const controls = useChartControlsState(query.window);
  const tiles = dashboardTiles(servers);
  return (
    <ChartControlsContext.Provider value={controls}>
      <div className="row g-3 mb-0" data-panel="charts">
        {tiles.map(({ server, chart }) => (
          <ChartWidget
            key={`${server.id}:${chart.key}`}
            id={String(server.id)}
            host={hostLabel(server)}
            chart={chart}
          />
        ))}
      </div>
    </ChartControlsContext.Provider>
  );
};

DashboardCharts.propTypes = {
  servers: PropTypes.arrayOf(PropTypes.object).isRequired,
};

export default DashboardCharts;
