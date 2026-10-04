import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';

import { pageContextShape } from '../../../../utils/itemShape';
import { tableOf, useHostManageSearch } from '../../hooks/useHostManageSearch';
import { useManageSectionsData } from '../../hooks/useManageSectionsData';
import { matchesLogFile } from '../../utils/logs';
import { SYSLOG_RULE_FILTERS, matchesSyslogRule } from '../../utils/syslogUtils';
import RefreshButton from '../RefreshButton';
import SectionPane from '../SectionPane';
import { SYSLOG_RULE_COLUMNS } from '../SyslogConfiguration/CurrentRulesView';
import SyslogSection from '../SyslogSection';
import { LOG_FILE_COLUMNS, LOG_FILE_FILTERS } from '../SystemLogs/LogFileExplorer';
import SystemLogsSection from '../SystemLogsSection';

/**
 * The Logs page of a host: the heading counting the log files the
 * search leaves, Refresh in its pane, and under it `SystemLogsSection`
 * while the host lists `log-streaming` and `SyslogSection` while it
 * lists `syslog`, their reads once for this page.
 */
const LogsPage = ({ id, server, context, section, onRefresh }) => {
  const { t, i18n } = useTranslation();
  const sections = useManageSectionsData({ id, server, only: ['logs', 'syslog'] });
  const ctx = { ...context, t, language: i18n.language, id, server };
  const search = useHostManageSearch({
    section,
    tables: {
      logFiles: tableOf({
        key: 'log-files',
        labelKey: 'host.logFileExplorer.logFiles',
        rows: sections.rows.logFiles,
        columns: LOG_FILE_COLUMNS,
        matches: matchesLogFile,
        filterGroups: LOG_FILE_FILTERS,
        sort: 'name',
        offered: sections.offered.logs,
      }),
      syslogRules: tableOf({
        key: 'syslog-rules',
        labelKey: 'hostTime.syslogCurrentRules.heading',
        rows: sections.rows.syslogRules,
        columns: SYSLOG_RULE_COLUMNS,
        matches: matchesSyslogRule,
        filterGroups: SYSLOG_RULE_FILTERS,
        sort: 'line',
        offered: sections.offered.syslog,
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
      count={sections.offered.logs ? search.tables['log-files'].rows.length : null}
      actions={<RefreshButton onRefresh={onRefresh} />}
    >
      {sections.offered.logs ? (
        <SystemLogsSection
          id={id}
          ctx={ctx}
          table={search.tables['log-files']}
          reading={sections.reads.logFiles}
          filtering={search.filtering}
        />
      ) : null}
      {sections.offered.syslog ? (
        <SyslogSection
          id={id}
          ctx={ctx}
          table={search.tables['syslog-rules']}
          reading={sections.reads.syslog}
          filtering={search.filtering}
        />
      ) : null}
    </SectionPane>
  );
};

LogsPage.propTypes = {
  id: PropTypes.string.isRequired,
  server: PropTypes.object.isRequired,
  context: pageContextShape.isRequired,
  section: PropTypes.string.isRequired,
  onRefresh: PropTypes.func.isRequired,
};

export default LogsPage;
