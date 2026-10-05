import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';

import { useFolds } from '../../../../hooks/useFolds';
import { pageContextShape } from '../../../../utils/itemShape';
import { useHostReadingsRefresh } from '../../hooks/useHostReadings';
import { useHostSeriesRefresh } from '../../hooks/useHostSeries';
import TopologyPanel from '../NetworkTopology/TopologyPanel';
import RefreshButton from '../RefreshButton';
import SectionPane from '../SectionPane';

const FOLD_TITLES = {
  topology: ['pages.hostNetworking.show', 'pages.hostNetworking.hide'],
};

const foldOf = ({ folds, key, t }) => {
  const folded = folds.folded(key);
  const [expand, collapse] = FOLD_TITLES[key] || ['', ''];
  return {
    folded,
    onFold: () => folds.toggle(key),
    title: expand ? t(folded ? expand : collapse) : '',
  };
};

/**
 * The Topology page of a host: the heading with Refresh in its pane,
 * and under it the network topology as a folding section over the
 * copies the hosts feature's context holds; the fold kept under
 * `table_prefs_topology`. Refresh reads every held answer of the host
 * and every drawn series again.
 */
const TopologyPage = ({ id, server, context, section, onRefresh }) => {
  const { t } = useTranslation();
  const refreshReadings = useHostReadingsRefresh();
  const refreshSeries = useHostSeriesRefresh();
  const folds = useFolds(`${context.prefsPrefix}_${section}`);

  const refresh = () => {
    onRefresh();
    refreshReadings(id);
    refreshSeries(id);
  };

  return (
    <SectionPane
      section={section}
      server={server}
      count={null}
      actions={<RefreshButton onRefresh={refresh} />}
    >
      <TopologyPanel id={id} fold={foldOf({ folds, key: 'topology', t })} />
    </SectionPane>
  );
};

TopologyPage.propTypes = {
  id: PropTypes.string.isRequired,
  server: PropTypes.object.isRequired,
  context: pageContextShape.isRequired,
  section: PropTypes.string.isRequired,
  onRefresh: PropTypes.func.isRequired,
};

export default TopologyPage;
