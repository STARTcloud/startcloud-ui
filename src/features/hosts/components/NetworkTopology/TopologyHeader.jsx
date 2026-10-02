import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { FaBug, FaChartLine, FaCompress, FaExpand, FaFilterCircleXmark } from 'react-icons/fa6';

import { EFFECT_STYLES } from './TopologyFlow';

const EFFECT_LABEL_KEYS = {
  weathermap: 'hostTools.topology.effectWeathermap',
  wave: 'hostTools.topology.effectWave',
  bars: 'hostTools.topology.effectBars',
  comets: 'hostTools.topology.effectComets',
  rivers: 'hostTools.topology.effectRivers',
};

const LENSES = [
  { id: 'traffic', Icon: FaChartLine, labelKey: 'hostTools.topology.lensTraffic' },
  { id: 'debug', Icon: FaBug, labelKey: 'hostTools.topology.lensDebug' },
];

/**
 * The topology's controls, hyperweaver-ui's: the scope toggle where more
 * than one host offers networking, the two lenses, the effect select,
 * the clear of an isolation, the feed pulse naming the seconds the
 * newest sample spans, and fullscreen.
 */
const TopologyHeader = ({
  scope,
  onScopeChange,
  multiHostAvailable,
  lens = null,
  onLensChange,
  effectStyle,
  onEffectChange,
  isolatedNet = null,
  onClearIsolation,
  feedLive,
  seconds,
  isFullscreen,
  onToggleFullscreen,
}) => {
  const { t } = useTranslation();
  const pulseText = feedLive
    ? t('hostTools.topology.pulseLive', { seconds })
    : t('hostTools.topology.pulseNoFeed');

  return (
    <div className="hw-topo-header d-flex flex-wrap align-items-center gap-2">
      {multiHostAvailable ? (
        <div className="btn-group">
          <button
            type="button"
            className={`btn btn-sm ${scope === 'host' ? 'btn-primary' : 'btn-light'}`}
            onClick={() => onScopeChange('host')}
            data-tool="scope-host"
          >
            {t('hostTools.topology.scopeHost')}
          </button>
          <button
            type="button"
            className={`btn btn-sm ${scope === 'all' ? 'btn-primary' : 'btn-light'}`}
            onClick={() => onScopeChange('all')}
            data-tool="scope-all"
          >
            {t('hostTools.topology.scopeAll')}
          </button>
        </div>
      ) : null}
      <div className="btn-group">
        {LENSES.map(({ id, Icon, labelKey }) => (
          <button
            key={id}
            type="button"
            className={`btn btn-sm ${lens === id ? 'btn-primary' : 'btn-light'}`}
            onClick={() => onLensChange(lens === id ? null : id)}
            title={t(labelKey)}
            data-tool={`lens-${id}`}
          >
            <Icon className="me-2" aria-hidden="true" />
            <span>{t(labelKey)}</span>
          </button>
        ))}
      </div>
      <select
        className="form-select form-select-sm w-auto"
        value={effectStyle}
        onChange={event => onEffectChange(event.target.value)}
        aria-label={t('hostTools.topology.effectsLabel')}
        title={t('hostTools.topology.effectsLabel')}
        data-tool="effect"
      >
        {EFFECT_STYLES.map(style => (
          <option key={style} value={style}>
            {t(EFFECT_LABEL_KEYS[style])}
          </option>
        ))}
      </select>
      {isolatedNet ? (
        <button
          type="button"
          className="btn btn-sm btn-warning"
          onClick={onClearIsolation}
          data-tool="clear-isolation"
        >
          <FaFilterCircleXmark className="me-2" aria-hidden="true" />
          <span>{t('hostTools.topology.clearIsolation')}</span>
        </button>
      ) : null}
      <span
        className={`hw-topo-pulse ms-auto ${feedLive ? 'hw-topo-pulse-live' : ''}`}
        title={pulseText}
        data-pulse={feedLive ? 'live' : 'none'}
      >
        <span className="hw-topo-pulse-dot" />
        {pulseText}
      </span>
      <button
        type="button"
        className={`btn btn-sm ${isFullscreen ? 'btn-danger' : 'btn-light'}`}
        onClick={onToggleFullscreen}
        title={
          isFullscreen
            ? t('hostTools.topology.exitFullscreen')
            : t('hostTools.topology.enterFullscreen')
        }
        data-tool="fullscreen"
      >
        {isFullscreen ? <FaCompress aria-hidden="true" /> : <FaExpand aria-hidden="true" />}
      </button>
    </div>
  );
};

TopologyHeader.propTypes = {
  scope: PropTypes.string.isRequired,
  onScopeChange: PropTypes.func.isRequired,
  multiHostAvailable: PropTypes.bool.isRequired,
  lens: PropTypes.string,
  onLensChange: PropTypes.func.isRequired,
  effectStyle: PropTypes.string.isRequired,
  onEffectChange: PropTypes.func.isRequired,
  isolatedNet: PropTypes.string,
  onClearIsolation: PropTypes.func.isRequired,
  feedLive: PropTypes.bool.isRequired,
  seconds: PropTypes.number.isRequired,
  isFullscreen: PropTypes.bool.isRequired,
  onToggleFullscreen: PropTypes.func.isRequired,
};

export default TopologyHeader;
