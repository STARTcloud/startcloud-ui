import PropTypes from 'prop-types';
import { useRef, useState } from 'react';
import { Dropdown } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { FaCircle, FaCopy, FaRotate, FaWaveSquare } from 'react-icons/fa6';

import { useStatus } from '../../../contexts/StatusContext';
import { log } from '../../../lib/logger';
import { fetchAgentStatus } from '../api/agents';

const HISTORY_LENGTH = 180;
const LEVELS = ['Excellent', 'Good', 'Fair', 'Poor'];
const LEVEL_KEYS = {
  Excellent: 'console.historySparkline.excellent',
  Good: 'console.historySparkline.good',
  Fair: 'console.historySparkline.fair',
  Poor: 'console.historySparkline.poor',
};
const VERDICT_TONES = ['text-success', 'text-success', 'text-warning', 'text-danger'];
const STALL_AFTER_SAMPLES = 5;
const NO_RATES = { down: null, up: null, updates: null };

const rdpClient = () => import('./rdpClient').then(module => module.loadRdpClient());

/**
 * The quality level of one latency sample: 0 under 50 ms, 1 under 120,
 * 2 under 250 and 3 beyond or with no answer.
 *
 * @param {number|null} latencyMs - The measured latency, null for a failed read
 * @returns {number} The level, 0 to 3
 */
export const scoreSample = latencyMs => {
  if (latencyMs === null) {
    return 3;
  }
  if (latencyMs < 50) {
    return 0;
  }
  if (latencyMs < 120) {
    return 1;
  }
  if (latencyMs < 250) {
    return 2;
  }
  return 3;
};

/**
 * A rate in KB/s, or MB/s from 1024 KB/s on, a dash for none.
 *
 * @param {number|null} bytesPerSec - The rate
 * @returns {string} The words
 */
export const formatRate = bytesPerSec => {
  if (bytesPerSec === null) {
    return '—';
  }
  const kb = bytesPerSec / 1024;
  if (kb >= 1024) {
    return `${(kb / 1024).toFixed(1)} MB/s`;
  }
  return `${kb.toFixed(0)} KB/s`;
};

/**
 * A duration as minutes and seconds, `m:ss`.
 *
 * @param {number} ms - The duration in milliseconds
 * @returns {string} The words
 */
export const formatDuration = ms => {
  const total = Math.floor(ms / 1000);
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
};

/**
 * The rates between two snapshots of the session's cumulative counters,
 * bytes down and up and screen updates a second, and whether the
 * session stalled, keys sent with nothing drawn back for five samples.
 *
 * @param {Object} options - The two snapshots, their moments and the stall count so far
 * @returns {{ rates: Object, quiet: number, stalled: boolean }} The rates and the stall state
 */
export const diffSnapshots = ({ snapshot, previous, dt, quiet }) => {
  if (!snapshot || !previous || dt <= 0) {
    return { rates: NO_RATES, quiet, stalled: quiet >= STALL_AFTER_SAMPLES };
  }
  const rates = {
    down: (snapshot.bytesReceived - previous.bytesReceived) / dt,
    up: (snapshot.bytesSent - previous.bytesSent) / dt,
    updates: (snapshot.regionsDrawn - previous.regionsDrawn) / dt,
  };
  const drew =
    snapshot.framesReceived - previous.framesReceived > 0 ||
    snapshot.regionsDrawn - previous.regionsDrawn > 0;
  const sent = snapshot.bytesSent - previous.bytesSent > 0;
  let next = quiet;
  if (drew) {
    next = 0;
  } else if (sent) {
    next = quiet + 1;
  }
  return { rates, quiet: next, stalled: next >= STALL_AFTER_SAMPLES };
};

const HistorySparkline = ({ history }) => {
  const { t } = useTranslation();
  const width = 220;
  const height = 60;
  const top = 6;
  const rowGap = (height - 2 * top) / (LEVELS.length - 1);
  const points = history
    .map((sample, index) => {
      const x = (index / Math.max(HISTORY_LENGTH - 1, 1)) * width;
      const y = top + sample.score * rowGap;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
  return (
    <div className="d-flex gap-2 align-items-stretch">
      <div className="d-flex flex-column justify-content-between text-muted hw-rdp-fine">
        {LEVELS.map(level => (
          <span key={level}>{t(LEVEL_KEYS[level])}</span>
        ))}
      </div>
      <svg
        width={width}
        height={height}
        role="img"
        aria-label={t('console.historySparkline.qualityAriaLabel')}
      >
        {LEVELS.map((level, index) => (
          <line
            key={level}
            x1="0"
            x2={width}
            y1={top + index * rowGap}
            y2={top + index * rowGap}
            stroke="currentColor"
            strokeOpacity="0.15"
          />
        ))}
        {history.length > 1 ? (
          <polyline points={points} fill="none" className="hw-rdp-sparkline" strokeWidth="1.5" />
        ) : null}
      </svg>
    </div>
  );
};

HistorySparkline.propTypes = {
  history: PropTypes.arrayOf(PropTypes.shape({ score: PropTypes.number })).isRequired,
};

const DetailRow = ({ label, value }) => (
  <div className="d-flex justify-content-between gap-3">
    <span className="text-muted small">{label}</span>
    <span className="small text-end">{value}</span>
  </div>
);

DetailRow.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.node.isRequired,
};

const GuestRows = ({ guestFacts = null }) => {
  const { t } = useTranslation();
  return (
    <>
      {guestFacts?.video ? (
        <DetailRow
          label={t('console.rdpConnectionPanel.guestDisplay')}
          value={`${guestFacts.video.width}×${guestFacts.video.height}×${guestFacts.video.depth}`}
        />
      ) : null}
      {typeof guestFacts?.additions_run_level === 'number' ? (
        <DetailRow
          label={t('console.rdpConnectionPanel.guestAdditions')}
          value={
            guestFacts.additions_run_level > 0
              ? t('console.rdpConnectionPanel.runLevel', { level: guestFacts.additions_run_level })
              : t('console.rdpConnectionPanel.notDetected')
          }
        />
      ) : null}
    </>
  );
};

const guestFactsShape = PropTypes.shape({
  video: PropTypes.shape({
    width: PropTypes.number,
    height: PropTypes.number,
    depth: PropTypes.number,
  }),
  additions_run_level: PropTypes.number,
});

GuestRows.propTypes = { guestFacts: guestFactsShape };

const SessionRows = ({ negotiated = null, settings, guestFacts = null, duration, machineName }) => {
  const { t } = useTranslation();
  const slowPath = negotiated?.inputMode === 'slow-path';
  const outputPath = (
    <span title={t('console.rdpConnectionPanel.fastPathHint')}>
      {t('console.rdpConnectionPanel.fastPath')}
    </span>
  );
  const inputPath = (
    <span
      title={
        slowPath
          ? t('console.rdpConnectionPanel.slowPathHint')
          : t('console.rdpConnectionPanel.fastPathInputHint')
      }
    >
      {slowPath
        ? t('console.rdpConnectionPanel.slowPathVrde')
        : t('console.rdpConnectionPanel.fastPath')}
    </span>
  );
  return (
    <div className="border-top pt-2 mb-2">
      <div className="text-muted small fw-bold mb-1">{t('console.rdpConnectionPanel.session')}</div>
      <DetailRow label={t('console.rdpConnectionPanel.machine')} value={machineName || '—'} />
      <DetailRow
        label={t('console.rdpConnectionPanel.duration')}
        value={formatDuration(duration)}
      />
      <DetailRow
        label={t('console.rdpConnectionPanel.colorDepth')}
        value={`${negotiated?.colorDepth ?? settings.colorDepth}-bit`}
      />
      <DetailRow
        label={t('console.rdpConnectionPanel.compression')}
        value={
          negotiated?.compression ??
          (settings.lossy
            ? t('console.rdpConnectionPanel.lossy')
            : t('console.rdpConnectionPanel.lossless'))
        }
      />
      <DetailRow
        label={t('console.rdpConnectionPanel.sound')}
        value={
          settings.audio ? t('console.rdpConnectionPanel.on') : t('console.rdpConnectionPanel.off')
        }
      />
      {negotiated ? (
        <DetailRow label={t('console.rdpConnectionPanel.outputPath')} value={outputPath} />
      ) : null}
      {negotiated?.inputMode ? (
        <DetailRow label={t('console.rdpConnectionPanel.inputPath')} value={inputPath} />
      ) : null}
      {negotiated?.resizeMode ? (
        <DetailRow
          label={t('console.rdpConnectionPanel.resizeMode')}
          value={negotiated.resizeMode}
        />
      ) : null}
      <GuestRows guestFacts={guestFacts} />
    </div>
  );
};

SessionRows.propTypes = {
  negotiated: PropTypes.object,
  settings: PropTypes.shape({
    colorDepth: PropTypes.number,
    lossy: PropTypes.bool,
    audio: PropTypes.bool,
  }).isRequired,
  guestFacts: guestFactsShape,
  duration: PropTypes.number.isRequired,
  machineName: PropTypes.string.isRequired,
};

const NO_SAMPLE = { at: 0, snapshot: null, quiet: 0 };

/**
 * The connection details of the RDP console, hyperweaver-ui's
 * Citrix-style panel: the quality verdict, the latency of a timed read
 * of the agent's status, the rates diffed from the session's cumulative
 * counters, the session's facts, the negotiated ones read once as it
 * connects, the guest's display facts the start read, the quality
 * history as a sparkline and Copy report. hyperweaver-ui sampled the
 * counters every second and the latency every five; here a sample is
 * taken as the panel opens and on its Refresh, so nothing reads on a
 * clock. The extension readers come from the client of `rdpClient`,
 * which the session host has loaded by the time a session is connected.
 */
const RdpConnectionPanel = ({ uiRef, connected, id, machineName, settings, guestFacts = null }) => {
  const { t } = useTranslation();
  const status = useStatus();
  const [rates, setRates] = useState(NO_RATES);
  const [latency, setLatency] = useState(null);
  const [duration, setDuration] = useState(0);
  const [history, setHistory] = useState([]);
  const [negotiated, setNegotiated] = useState(null);
  const [stalled, setStalled] = useState(false);
  const startedAt = useRef(0);
  const last = useRef(NO_SAMPLE);

  const verdicts = [
    {
      label: t('console.rdpConnectionPanel.verdictExcellentLabel'),
      hint: t('console.rdpConnectionPanel.verdictExcellentHint'),
    },
    {
      label: t('console.rdpConnectionPanel.verdictGoodLabel'),
      hint: t('console.rdpConnectionPanel.verdictGoodHint'),
    },
    {
      label: t('console.rdpConnectionPanel.verdictFairLabel'),
      hint: t('console.rdpConnectionPanel.verdictFairHint'),
    },
    {
      label: t('console.rdpConnectionPanel.verdictPoorLabel'),
      hint: t('console.rdpConnectionPanel.verdictPoorHint'),
    },
  ];
  const stalledVerdict = {
    label: t('console.rdpConnectionPanel.verdictStalledLabel'),
    hint: t('console.rdpConnectionPanel.verdictStalledHint'),
  };

  const sample = async () => {
    if (!connected) {
      setRates(NO_RATES);
      setLatency(null);
      setDuration(0);
      setHistory([]);
      setNegotiated(null);
      setStalled(false);
      startedAt.current = 0;
      last.current = NO_SAMPLE;
      return;
    }
    const now = Date.now();
    startedAt.current ||= now;
    setDuration(now - startedAt.current);
    const { connectionInfo, sessionStats } = await rdpClient();
    if (!negotiated) {
      try {
        const info = uiRef.current?.invokeExtension(connectionInfo());
        if (info) {
          setNegotiated(info);
        }
      } catch (error) {
        log.component.warn('RDP connectionInfo', { error: error.message });
      }
    }
    let snapshot = null;
    try {
      snapshot = uiRef.current?.invokeExtension(sessionStats()) || null;
    } catch (error) {
      log.component.warn('RDP sessionStats', { error: error.message });
    }
    const diffed = diffSnapshots({
      snapshot,
      previous: last.current.snapshot,
      dt: (now - last.current.at) / 1000,
      quiet: last.current.quiet,
    });
    if (snapshot) {
      last.current = { at: now, snapshot, quiet: diffed.quiet };
    }
    setRates(diffed.rates);
    setStalled(diffed.stalled);
    const t0 = performance.now();
    let measured = null;
    try {
      await fetchAgentStatus(status, id);
      measured = Math.round(performance.now() - t0);
    } catch {
      measured = null;
    }
    setLatency(measured);
    const score = diffed.stalled ? 3 : scoreSample(measured);
    setHistory(prev => [...prev.slice(-(HISTORY_LENGTH - 1)), { score }]);
  };

  const verdict = stalled ? stalledVerdict : verdicts[scoreSample(latency)];
  const tone = stalled ? 'text-danger' : VERDICT_TONES[scoreSample(latency)];
  const transport = 'WSS → IronRDP → TLS → RDP';

  const handleCopyReport = async () => {
    const report = {
      machine: machineName,
      transport,
      negotiated,
      latency_ms: latency,
      down_bytes_per_s: rates.down,
      up_bytes_per_s: rates.up,
      updates_per_s: rates.updates,
      session_duration_ms: duration,
      stalled,
      color_depth: settings.colorDepth,
      lossy_compression: settings.lossy,
      sound: settings.audio,
      guest_video: guestFacts?.video ?? null,
      guest_additions_run_level: guestFacts?.additions_run_level ?? null,
      history_scores: history.map(entry => LEVELS[entry.score]),
    };
    try {
      await navigator.clipboard.writeText(JSON.stringify(report, null, 2));
    } catch (error) {
      log.component.warn('RDP report copy', { error: error.message });
    }
  };

  return (
    <Dropdown
      autoClose="outside"
      align="end"
      onToggle={open => {
        if (open) {
          sample();
        }
      }}
    >
      <Dropdown.Toggle
        variant="secondary"
        size="sm"
        title={t('console.rdpConnectionPanel.connectionDetails')}
        data-action="rdp-details"
      >
        <FaWaveSquare aria-hidden="true" />
      </Dropdown.Toggle>
      <Dropdown.Menu className="p-3 hw-rdp-connection-menu" data-menu="rdp-details">
        <div className="d-flex align-items-center gap-2 mb-1">
          <FaCircle className={`hw-rdp-dot ${tone}`} aria-hidden="true" />
          <strong className="small">
            {connected ? verdict.label : t('console.rdpConnectionPanel.notConnected')}
          </strong>
          <button
            type="button"
            className="btn btn-sm btn-outline-secondary ms-auto"
            onClick={sample}
            disabled={!connected}
            title={t('hosts.page.refresh')}
            aria-label={t('hosts.page.refresh')}
            data-action="rdp-details-refresh"
          >
            <FaRotate aria-hidden="true" />
          </button>
        </div>
        <div className="text-muted mb-2 hw-rdp-hint">
          {connected ? verdict.hint : t('console.rdpConnectionPanel.detailsAppearOnceLive')}
        </div>
        <div className="border-top pt-2 mb-2">
          <div className="text-muted small fw-bold mb-1">
            {t('console.rdpConnectionPanel.network')}
          </div>
          <DetailRow
            label={t('console.rdpConnectionPanel.latency')}
            value={latency === null ? '—' : `${latency} ms`}
          />
          <DetailRow label={t('console.rdpConnectionPanel.down')} value={formatRate(rates.down)} />
          <DetailRow label={t('console.rdpConnectionPanel.up')} value={formatRate(rates.up)} />
          <DetailRow
            label={t('console.rdpConnectionPanel.updatesPerSecond')}
            value={rates.updates === null ? '—' : rates.updates.toFixed(0)}
          />
          <DetailRow label={t('console.rdpConnectionPanel.transport')} value={transport} />
        </div>
        <SessionRows
          negotiated={negotiated}
          settings={settings}
          guestFacts={guestFacts}
          duration={duration}
          machineName={machineName}
        />
        <div className="border-top pt-2 mb-2">
          <div className="text-muted small fw-bold mb-1">
            {t('console.rdpConnectionPanel.history15Min')}
          </div>
          <HistorySparkline history={history} />
        </div>
        <button
          type="button"
          className="btn btn-sm btn-outline-secondary w-100"
          onClick={handleCopyReport}
          disabled={!connected}
          data-action="rdp-copy-report"
        >
          <FaCopy className="me-2" aria-hidden="true" />
          <span>{t('console.rdpConnectionPanel.copyReport')}</span>
        </button>
      </Dropdown.Menu>
    </Dropdown>
  );
};

RdpConnectionPanel.propTypes = {
  uiRef: PropTypes.object.isRequired,
  connected: PropTypes.bool.isRequired,
  id: PropTypes.string.isRequired,
  machineName: PropTypes.string.isRequired,
  settings: PropTypes.shape({
    colorDepth: PropTypes.number,
    lossy: PropTypes.bool,
    audio: PropTypes.bool,
  }).isRequired,
  guestFacts: guestFactsShape,
};

export default RdpConnectionPanel;
