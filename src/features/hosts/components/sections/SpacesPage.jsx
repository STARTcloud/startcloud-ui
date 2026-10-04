import PropTypes from 'prop-types';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { useStatus } from '../../../../contexts/StatusContext';
import { useFolds } from '../../../../hooks/useFolds';
import { pageContextShape } from '../../../../utils/itemShape';
import { tableOf, useHostManageSearch } from '../../hooks/useHostManageSearch';
import { useHostReading, useHostReadingsRefresh } from '../../hooks/useHostReadings';
import { useNetworkingTools } from '../../hooks/useNetworkingTools';
import { SPACE_FILTERS, matchesSpace, spaceFamiliesOf } from '../../utils/networkingManagement';
import NetworkSpacesPanel, { SPACE_COLUMNS } from '../NetworkSpaces/NetworkSpacesPanel';
import RefreshButton from '../RefreshButton';
import SectionPane from '../SectionPane';
import TaskDialog from '../TaskDialog';

const NAME_SORT = [{ column: 'name', direction: 'asc' }];

const NO_ROWS = [];

/**
 * The Spaces page of a host, behind `network-spaces`: the heading
 * counting the spaces, Refresh in its pane, and `NetworkSpacesPanel`
 * under it over the families the host's platform draws, narrowed by the
 * page's search, every write through `useNetworkingTools` and its task
 * dialog drawn once; the fold kept under `table_prefs_spaces`.
 */
const SpacesPage = ({ id, server, context, section, onRefresh }) => {
  const { t, i18n } = useTranslation();
  const status = useStatus();
  const refreshReadings = useHostReadingsRefresh();
  const folds = useFolds(`${context.prefsPrefix}_${section}`);
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
    <SectionPane
      section={section}
      server={server}
      count={spaces.loaded ? rows.length : null}
      actions={<RefreshButton onRefresh={refresh} />}
    >
      <NetworkSpacesPanel
        id={id}
        server={server}
        role={context.user?.role}
        rows={rows}
        reading={spaces}
        table={search.tables.spaces}
        ctx={ctx}
        filtering={search.filtering}
        fold={{
          folded: folds.folded('manage-spaces'),
          onFold: () => folds.toggle('manage-spaces'),
          title: '',
        }}
        tools={tools}
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
