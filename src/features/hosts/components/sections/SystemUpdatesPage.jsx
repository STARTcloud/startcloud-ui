import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';

import { pageContextShape } from '../../../../utils/itemShape';
import { useHostManageData } from '../../hooks/useHostManageData';
import { tableOf, useHostManageSearch } from '../../hooks/useHostManageSearch';
import { matchesHistory } from '../../utils/manage';
import RefreshButton from '../RefreshButton';
import SectionPane from '../SectionPane';
import SystemUpdatesSection, { HISTORY_COLUMNS, HISTORY_FILTERS } from '../SystemUpdatesSection';

/**
 * The System updates page of a host: the heading with Refresh in its
 * pane and `SystemUpdatesSection` under it, the update history read once
 * for this page and the check the section's own.
 */
const SystemUpdatesPage = ({ id, server, context, section, onRefresh }) => {
  const { t, i18n } = useTranslation();
  const data = useHostManageData({ id, server, only: ['history'] });
  const ctx = { ...context, t, language: i18n.language, id, server };
  const search = useHostManageSearch({
    section,
    tables: {
      history: tableOf({
        key: 'history',
        labelKey: 'host.systemUpdates.historyTitle',
        rows: data.rows.history,
        columns: HISTORY_COLUMNS,
        matches: matchesHistory,
        filterGroups: HISTORY_FILTERS,
        sort: 'date',
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
      actions={<RefreshButton onRefresh={onRefresh} />}
    >
      <SystemUpdatesSection
        id={id}
        ctx={ctx}
        table={search.tables.history}
        reading={data.reads.history}
        filtering={search.filtering}
      />
    </SectionPane>
  );
};

SystemUpdatesPage.propTypes = {
  id: PropTypes.string.isRequired,
  server: PropTypes.object.isRequired,
  context: pageContextShape.isRequired,
  section: PropTypes.string.isRequired,
  onRefresh: PropTypes.func.isRequired,
};

export default SystemUpdatesPage;
