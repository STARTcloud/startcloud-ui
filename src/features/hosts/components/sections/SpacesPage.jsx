import PropTypes from 'prop-types';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { useStatus } from '../../../../contexts/StatusContext';
import { pageContextShape } from '../../../../utils/itemShape';
import { tableOf, useHostManageSearch } from '../../hooks/useHostManageSearch';
import { useHostReading, useHostReadingsRefresh } from '../../hooks/useHostReadings';
import { useNetworkingTools } from '../../hooks/useNetworkingTools';
import { sectionTitle } from '../../pages';
import { SPACE_FILTERS, matchesSpace, spaceFamiliesOf } from '../../utils/networkingManagement';
import NetworkSpacesPanel, { SPACE_COLUMNS } from '../NetworkSpaces/NetworkSpacesPanel';
import RefreshButton from '../RefreshButton';
import SectionPane from '../SectionPane';
import TaskDialog from '../TaskDialog';

const NAME_SORT = [{ column: 'name', direction: 'asc' }];

const NO_ROWS = [];

/**
 * The Spaces page of a host, behind `network-spaces`: one heading, the
 * spaces table's own, the section's title counting the spaces the
 * page's search left with New space and Refresh in its pane, and under
 * it `NetworkSpacesPanel` over the families the host's platform draws,
 * every write through `useNetworkingTools` and its task dialog drawn
 * once.
 */
const SpacesPage = ({ id, server, context, section, onRefresh }) => {
  const { t, i18n } = useTranslation();
  const status = useStatus();
  const refreshReadings = useHostReadingsRefresh();
  const spaces = useHostReading(id, 'network-spaces');
  const tools = useNetworkingTools();
  const families = spaceFamiliesOf(server);
  const rows = useMemo(
    () =>
      (Array.isArray(spaces.data?.spaces) ? spaces.data.spaces : NO_ROWS).filter(
        row => families[row.type] !== false
      ),
    [spaces.data, families]
  );
  const ctx = { ...context, t, language: i18n.language };
  const search = useHostManageSearch({
    section,
    tables: {
      spaces: tableOf({
        key: 'spaces',
        labelKey: 'host.networkSpaces.title',
        rows,
        columns: SPACE_COLUMNS,
        matches: matchesSpace,
        filterGroups: SPACE_FILTERS,
        defaultSort: NAME_SORT,
        offered: spaces.offered,
      }),
    },
    ctx,
    prefsPrefix: context.prefsPrefix,
    placeholderKey: 'hosts.networking.search',
  });

  const refresh = () => {
    onRefresh();
    refreshReadings(id);
  };

  return (
    <SectionPane section={section} server={server} headed={false}>
      <NetworkSpacesPanel
        id={id}
        server={server}
        role={context.user?.role}
        rows={rows}
        reading={spaces}
        table={search.tables.spaces}
        ctx={ctx}
        filtering={search.filtering}
        tools={tools}
        title={sectionTitle(section, server, '', t)}
        count={spaces.loaded ? search.tables.spaces.rows.length : null}
        actions={<RefreshButton onRefresh={refresh} />}
      />
      {tools.task ? (
        <TaskDialog status={status} id={id} task={tools.task.row} onHide={tools.closeTask} />
      ) : null}
    </SectionPane>
  );
};

SpacesPage.propTypes = {
  id: PropTypes.string.isRequired,
  server: PropTypes.object.isRequired,
  context: pageContextShape.isRequired,
  section: PropTypes.string.isRequired,
  onRefresh: PropTypes.func.isRequired,
};

export default SpacesPage;
