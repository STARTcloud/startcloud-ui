import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';

import { pageContextShape } from '../../../../utils/itemShape';
import { useHostManageData } from '../../hooks/useHostManageData';
import { tableOf, useHostManageSearch } from '../../hooks/useHostManageSearch';
import { matchesPeer } from '../../utils/manage';
import RefreshButton from '../RefreshButton';
import SectionPane from '../SectionPane';
import TimeNTPManagement from '../TimeNTPManagement';
import { PEER_COLUMNS } from '../TimeSync/PeerTable';

/**
 * The Time page of a host: the heading counting the peers the search
 * leaves, Refresh in its pane, and `TimeNTPManagement` under it, the
 * synchronization status read once for this page.
 */
const TimePage = ({ id, server, context, section, host, onRefresh }) => {
  const { t, i18n } = useTranslation();
  const data = useHostManageData({ id, server, only: ['timeSync'] });
  const ctx = { ...context, t, language: i18n.language, id, server };
  const search = useHostManageSearch({
    section,
    tables: {
      peers: tableOf({
        key: 'peers',
        labelKey: 'hostTime.timeSyncPeerTable.columnServer',
        rows: data.rows.peers,
        columns: PEER_COLUMNS,
        matches: matchesPeer,
        sort: 'server',
        offered: true,
      }),
    },
    ctx,
    prefsPrefix: context.prefsPrefix,
    placeholderKey: 'hosts.manage.search',
  });

  return (
    <SectionPane
      section={section}
      server={server}
      count={search.tables.peers.rows.length}
      actions={<RefreshButton onRefresh={onRefresh} />}
    >
      <TimeNTPManagement
        id={id}
        hostname={host.hostname}
        ctx={ctx}
        table={search.tables.peers}
        reading={data.reads.timeSync}
        filtering={search.filtering}
      />
    </SectionPane>
  );
};

TimePage.propTypes = {
  id: PropTypes.string.isRequired,
  server: PropTypes.object.isRequired,
  context: pageContextShape.isRequired,
  section: PropTypes.string.isRequired,
  host: PropTypes.shape({ hostname: PropTypes.string.isRequired }).isRequired,
  onRefresh: PropTypes.func.isRequired,
};

export default TimePage;
