import PropTypes from 'prop-types';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { useFolds } from '../../../../hooks/useFolds';
import { pageContextShape } from '../../../../utils/itemShape';
import { ChartControlsContext, useChartControlsState } from '../../hooks/useChartControls';
import { useHostSeries, useHostSeriesQuery, useHostSeriesRefresh } from '../../hooks/useHostSeries';
import { canControlHosts } from '../../utils/permissions';
import { latestOf } from '../../utils/series';
import { arcRatios } from '../../utils/StorageUtils';
import ArcConfigurationSection from '../ArcConfigurationSection';
import ArcStats from '../ArcStats';
import ChartControls from '../ChartControls';
import SectionPane from '../SectionPane';
import StorageCharts from '../StorageCharts';

const NO_ROWS = [];

const NO_SERIES = { rows: NO_ROWS, loaded: true, failed: false, offered: false };

const ARC_CHARTS = ['arc'];

/**
 * The ARC page of a host, behind `zfs`: the heading reading the hit
 * ratio of the newest sample, the time window, Refresh and Pause in its
 * pane, and under it the ARC statistics card, the three ARC charts under
 * the page's chart controls, both behind `monitoring` as the series is,
 * and, for an admin, `ArcConfigurationSection`; the series the copy the
 * hosts feature's context holds and every fold kept under the page's
 * `table_prefs_arc`.
 */
const ArcPage = ({ id, server, context, section, host, onRefresh }) => {
  const { t } = useTranslation();
  const refreshSeries = useHostSeriesRefresh();
  const { query, setQuery } = useHostSeriesQuery(id);
  const controls = useChartControlsState(query.window);
  const folds = useFolds(`${context.prefsPrefix}_${section}`);
  const arc = useHostSeries(id, 'arc');
  const newest = useMemo(() => latestOf(arc.rows), [arc.rows]);
  const admin = canControlHosts(context.user?.role);

  const refresh = () => {
    onRefresh();
    refreshSeries(id);
  };

  const actions = (
    <ChartControls
      query={query}
      onQuery={setQuery}
      scope="storageHeader"
      series={arc.offered}
      controls={controls}
      onRefresh={refresh}
    />
  );

  return (
    <ChartControlsContext.Provider value={controls}>
      <SectionPane
        section={section}
        server={server}
        count={newest ? t('hosts.nav.arcHitRatio', { ratio: arcRatios(newest).hitRatio }) : null}
        actions={actions}
      >
        {arc.offered ? <ArcStats arc={newest} folds={folds} /> : null}
        <StorageCharts
          diskIo={NO_SERIES}
          poolIo={{ ...NO_SERIES, latest: NO_ROWS }}
          arc={arc}
          host={host.label}
          folds={folds}
          charts={ARC_CHARTS}
        />
        {admin ? <ArcConfigurationSection id={id} /> : null}
      </SectionPane>
    </ChartControlsContext.Provider>
  );
};

ArcPage.propTypes = {
  id: PropTypes.string.isRequired,
  server: PropTypes.object.isRequired,
  context: pageContextShape.isRequired,
  section: PropTypes.string.isRequired,
  host: PropTypes.shape({ label: PropTypes.string.isRequired }).isRequired,
  onRefresh: PropTypes.func.isRequired,
};

export default ArcPage;
