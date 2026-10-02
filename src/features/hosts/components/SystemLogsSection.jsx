import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { FaFileLines } from 'react-icons/fa6';

import { useSystemLogs } from '../hooks/useSystemLogs';

import LogControls from './SystemLogs/LogControls';
import LogFileExplorer from './SystemLogs/LogFileExplorer';
import LogViewer from './SystemLogs/LogViewer';

/**
 * The system logs of a host, hyperweaver-ui's `SystemLogs` as the body
 * of the Manage page's System logs section: the log files over the one
 * table the page's binding narrows, the fault manager logs among them,
 * a row's Open selecting its log; under it the viewer's controls and the
 * viewer, the content read whenever the log or its filters change and on
 * Refresh, and the live stream over the agent's WebSocket, which no
 * timer stands in for. Until a log is chosen the viewer says which logs
 * there are.
 */
const SystemLogsSection = ({ id, ctx, table, reading, filtering }) => {
  const { t } = useTranslation();
  const logs = useSystemLogs({ id });

  return (
    <div data-panel="system-logs">
      <LogFileExplorer
        table={table}
        reading={reading}
        filtering={filtering}
        ctx={ctx}
        selected={logs.selectedLog}
        onSelect={logs.selectLog}
      />
      <div className="mt-3">
        {logs.selectedLog ? (
          <>
            <LogControls
              filters={logs.filters}
              onFilterChange={logs.setFilter}
              onRefresh={logs.content.refresh}
              busy={logs.starting || !logs.content.loaded}
              streaming={logs.streaming}
              onToggleStreaming={logs.streaming ? logs.stopStream : logs.startStream}
              selectedLog={logs.selectedLog}
            />
            {logs.content.failed ? (
              <div className="alert alert-danger" role="alert" data-note="log-failed">
                {logs.content.message || t('hosts.overview.readError')}
              </div>
            ) : null}
            <LogViewer
              selectedLog={logs.selectedLog}
              logData={logs.content.data}
              loading={!logs.content.loaded}
              streaming={logs.streaming}
              streamOpen={logs.streamOpen}
              streamLines={logs.streamLines}
              onClearStream={logs.clearStreamLines}
            />
          </>
        ) : (
          <div className="card" data-note="no-log-selected">
            <div className="card-body text-center">
              <FaFileLines className="fs-2 text-info" aria-hidden="true" />
              <h6 className="fw-bold mt-3">{t('host.systemLogs.title')}</h6>
              <p>{t('host.systemLogs.emptyMessage')}</p>
              <div className="small text-muted">
                <p className="fw-semibold mb-1">{t('host.systemLogs.availableLogs')}</p>
                <ul className="list-unstyled mb-0">
                  <li>
                    <strong>{t('host.systemLogs.systemLogsLabel')}</strong> messages, syslog
                  </li>
                  <li>
                    <strong>{t('host.systemLogs.authLabel')}</strong> authlog
                  </li>
                  <li>
                    <strong>{t('host.systemLogs.faultManagerLabel')}</strong> faults, errors, info
                  </li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

SystemLogsSection.propTypes = {
  id: PropTypes.string.isRequired,
  ctx: PropTypes.object.isRequired,
  table: PropTypes.object.isRequired,
  reading: PropTypes.shape({
    loaded: PropTypes.bool.isRequired,
    failed: PropTypes.bool.isRequired,
    refresh: PropTypes.func.isRequired,
  }).isRequired,
  filtering: PropTypes.bool.isRequired,
};

export default SystemLogsSection;
