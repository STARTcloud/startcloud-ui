import PropTypes from 'prop-types';
import { useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { FaDownload, FaEraser, FaSatelliteDish } from 'react-icons/fa6';

import { saveBlob } from '../../hooks/useHostFiles';
import { logDownloadName, logDownloadText, logLevelClass, splitLogLine } from '../../utils/logs';

import { logLabel } from './LogFileExplorer';

const Line = ({ line }) => {
  const { timestamp, content } = splitLogLine(line);
  return (
    <div className="task-output-line">
      {timestamp ? <span className="text-secondary me-2">{timestamp}</span> : null}
      <span className={logLevelClass(content)}>{content}</span>
    </div>
  );
};

Line.propTypes = {
  line: PropTypes.string.isRequired,
};

const Lines = ({ lines, streaming }) => {
  const box = useRef(null);

  useEffect(() => {
    const element = box.current;
    if (element && streaming) {
      element.scrollTop = element.scrollHeight;
    }
  }, [lines, streaming]);

  return (
    <div ref={box} className="task-output" data-lines={lines.length}>
      {lines.map(item => (
        <Line key={item.id} line={item.line} />
      ))}
    </div>
  );
};

Lines.propTypes = {
  lines: PropTypes.arrayOf(PropTypes.object).isRequired,
  streaming: PropTypes.bool.isRequired,
};

const Placeholder = ({ loading, streaming, streamOpen }) => {
  const { t } = useTranslation();
  if (loading) {
    return (
      <p className="text-muted" data-note="log-loading">
        {t(streaming ? 'host.logViewer.connectingStream' : 'host.logViewer.loadingContent')}
      </p>
    );
  }
  if (streaming) {
    return (
      <div className="text-center p-4" data-note={streamOpen ? 'stream-waiting' : 'stream-closed'}>
        <FaSatelliteDish className="fs-3 text-success" aria-hidden="true" />
        <p className="mt-2 text-success fw-bold mb-1">
          {t(streamOpen ? 'host.logViewer.liveStreamActive' : 'hosts.manage.logs.streamLost')}
        </p>
        <p className="small text-muted mb-0">{t('host.logViewer.waitingEntries')}</p>
      </div>
    );
  }
  return (
    <p className="text-muted" data-note="log-empty">
      {t('host.logViewer.clickRefresh')}
    </p>
  );
};

Placeholder.propTypes = {
  loading: PropTypes.bool.isRequired,
  streaming: PropTypes.bool.isRequired,
  streamOpen: PropTypes.bool.isRequired,
};

/**
 * The log viewer, hyperweaver-ui's: the selected log's name with the
 * live badge while it streams, the lines of the read or of the stream in
 * the terminal block, each line's timestamp apart and its level toned,
 * the count of lines, Clear while the stream holds lines, and the file's
 * path, size and date with Download under it. The stream scrolls to its
 * newest line.
 */
const LogViewer = ({
  selectedLog,
  logData,
  loading,
  streaming,
  streamOpen,
  streamLines,
  onClearStream,
}) => {
  const { t } = useTranslation();
  const readLines = useMemo(
    () =>
      (Array.isArray(logData?.lines) ? logData.lines : []).map((line, i) => ({
        line,
        id: `read-${i}`,
      })),
    [logData]
  );
  const lines = streaming ? streamLines : readLines;
  const hasLines = lines.length > 0;

  const download = () => {
    saveBlob(
      new Blob([logDownloadText(logData)], { type: 'text/plain' }),
      logDownloadName(selectedLog)
    );
  };

  return (
    <div data-panel="log-viewer" data-log={selectedLog.name} data-streaming={streaming}>
      <div className="d-flex align-items-center flex-wrap gap-2 mb-2">
        <h6 className="fw-bold mb-0">{logLabel(selectedLog, t)}</h6>
        {streaming ? (
          <span className="badge text-bg-primary">
            <FaSatelliteDish className="me-1" aria-hidden="true" />
            {t('host.logViewer.liveStream')}
          </span>
        ) : null}
        <span className="ms-auto d-flex align-items-center gap-2">
          {streaming && streamLines.length > 0 ? (
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary"
              data-action="log-clear"
              onClick={onClearStream}
              title={t('host.logViewer.clearStreamBuffer')}
            >
              <FaEraser className="me-1" aria-hidden="true" />
              {t('host.logViewer.clear')}
            </button>
          ) : null}
          {streaming ? (
            <span className="badge text-bg-primary">
              {t('host.logViewer.streamLines', { count: streamLines.length })}
            </span>
          ) : null}
          {!streaming && logData ? (
            <span className="badge text-bg-info">
              {t('host.logViewer.lineCount', { count: logData.totalLines ?? readLines.length })}
            </span>
          ) : null}
        </span>
      </div>
      {hasLines ? (
        <Lines lines={lines} streaming={streaming} />
      ) : (
        <Placeholder loading={loading} streaming={streaming} streamOpen={streamOpen} />
      )}
      {logData?.fileInfo ? (
        <div className="alert alert-secondary small d-flex align-items-center flex-wrap gap-3 mt-3 mb-0">
          <span>
            <strong>{t('host.logViewer.fileLabel')}</strong> {logData.path}
          </span>
          <span>
            <strong>{t('host.logViewer.sizeLabel')}</strong> {logData.fileInfo.sizeFormatted}
          </span>
          <span>
            <strong>{t('host.logViewer.modifiedLabel')}</strong>{' '}
            {new Date(logData.fileInfo.modified).toLocaleString()}
          </span>
          <button
            type="button"
            className="btn btn-sm btn-outline-secondary ms-auto"
            data-action="log-download"
            onClick={download}
            title={t('host.logViewer.downloadLog')}
          >
            <FaDownload className="me-1" aria-hidden="true" />
            {t('host.logViewer.download')}
          </button>
        </div>
      ) : null}
    </div>
  );
};

LogViewer.propTypes = {
  selectedLog: PropTypes.object.isRequired,
  logData: PropTypes.object,
  loading: PropTypes.bool.isRequired,
  streaming: PropTypes.bool.isRequired,
  streamOpen: PropTypes.bool.isRequired,
  streamLines: PropTypes.arrayOf(PropTypes.object).isRequired,
  onClearStream: PropTypes.func.isRequired,
};

export default LogViewer;
