import PropTypes from 'prop-types';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { useFolds } from '../../../../hooks/useFolds';
import { pageContextShape } from '../../../../utils/itemShape';
import { useHostSeries, useHostSeriesQuery, useHostSeriesRefresh } from '../../hooks/useHostSeries';
import { canControlHosts } from '../../utils/permissions';
import { latestOf } from '../../utils/series';
import { arcRatios } from '../../utils/StorageUtils';
import ArcConfigurationSection from '../ArcConfigurationSection';
import ArcStats from '../ArcStats';
import SectionPane from '../SectionPane';
import StorageCharts from '../StorageCharts';
import StorageHeader from '../StorageHeader';

const NO_ROWS = [];

const NO_SERIES = { rows: NO_ROWS, loaded: true, failed: false, offered: false };

const ARC_CHARTS = ['arc'];

/**
 * The ARC page of a host, the old storage page's ARC statistics and
 * charts and the old Manage page's ARC configuration as the one body of
 * its own page, behind `zfs`: the heading reading the hit ratio of the
 * newest sample, the time window, the resolution and Refresh in its
 * pane, and under it the ARC statistics card, the three ARC charts,
 * both behind `monitoring` as the series is, and, for an admin as the
 * old Manage page was, `ArcConfigurationSection` as it was drawn; the
 * series the copy the hosts feature's context holds and every fold kept
 * under the page's `table_prefs_arc`.
 */
const ArcPage = ({ id, server, context, section, host, onRefresh }) => {
  const { t } = useTranslation();
  const refreshSeries = useHostSeriesRefresh();
  const { query, setQuery } = useHostSeriesQuery(id);
  const folds = useFolds(`${context.prefsPrefix}_${section}`);
  const arc = useHostSeries(id, 'arc');
  const newest = useMemo(() => latestOf(arc.rows), [arc.rows]);
  const admin = canControlHosts(context.user?.role);

  const refresh = () => {
    onRefresh();
    refreshSeries(id);
  };

  return (
    <SectionPane
      section={section}
      server={server}
      count={newest ? t('hosts.nav.arcHitRatio', { ratio: arcRatios(newest).hitRatio }) : null}
      actions={
        <StorageHeader query={query} onQuery={setQuery} series={arc.offered} onRefresh={refresh} />
      }
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
