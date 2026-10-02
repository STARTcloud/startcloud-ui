import PropTypes from 'prop-types';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaChevronRight, FaDesktop } from 'react-icons/fa6';

import { useCssVar } from '../../../hooks/useCssVar';

const LEVELS = { min: 0, max: 9 };

const SCALING = { scale: 'local', remote: 'remote' };

const RESIZE_OF = { local: 'scale', remote: 'remote', none: 'none' };

const stop = event => event.stopPropagation();

const LevelSlider = ({ id, tone, value, labelKey, hintKey, onChange }) => {
  const { t } = useTranslation();
  const slider = useRef(null);
  useCssVar(slider, '--hw-slider-fill', `${(value / LEVELS.max) * 100}%`);
  return (
    <div className="dropdown-item">
      <div className="mb-4">
        <label className="form-label" htmlFor={id}>
          {t(labelKey, { value })}
        </label>
        <div className="mt-5 mb-5">
          <input
            ref={slider}
            id={id}
            className={`hw-range-slider hw-range-slider-${tone}`}
            type="range"
            min={LEVELS.min}
            max={LEVELS.max}
            value={value}
            onChange={event => onChange?.(Number.parseInt(event.target.value, 10))}
            onClick={stop}
          />
        </div>
        <div className="form-text mt-2 mb-2">{t(hintKey)}</div>
      </div>
    </div>
  );
};

LevelSlider.propTypes = {
  id: PropTypes.string.isRequired,
  tone: PropTypes.string.isRequired,
  value: PropTypes.number.isRequired,
  labelKey: PropTypes.string.isRequired,
  hintKey: PropTypes.string.isRequired,
  onChange: PropTypes.func,
};

/**
 * The Display settings submenu of the VNC actions menu: the scaling
 * mode, none, local or remote, the quality and compression levels as
 * sliders from 0 to 9 and the cursor dot switch, each change handed to
 * the session's settings.
 */
const VncDisplaySettingsSubmenu = ({
  quality,
  compression,
  resize,
  showDot,
  onQualityChange = null,
  onCompressionChange = null,
  onResizeChange = null,
  onShowDotChange = null,
  calculateSubmenuPosition,
}) => {
  const { t } = useTranslation();
  const [showDisplaySettings, setShowDisplaySettings] = useState(false);

  return (
    <div
      className="dropdown-item position-relative d-flex justify-content-between align-items-center"
      onMouseEnter={() => setShowDisplaySettings(true)}
      onMouseLeave={() => setShowDisplaySettings(false)}
      role="button"
      tabIndex={0}
      data-submenu="display"
    >
      <div className="d-flex align-items-center">
        <FaDesktop className="me-2" aria-hidden="true" />
        <span>{t('console.vncDisplaySettingsSubmenu.displaySettings')}</span>
      </div>
      <FaChevronRight aria-hidden="true" />
      {showDisplaySettings ? (
        <div className={`dropdown-menu show ${calculateSubmenuPosition(350)}`}>
          <div>
            <div className="dropdown-item">
              <div className="mb-2">
                <label className="form-label" htmlFor="vnc-scaling-mode">
                  {t('console.vncDisplaySettingsSubmenu.scalingMode')}
                </label>
                <select
                  className="form-select form-select-sm"
                  id="vnc-scaling-mode"
                  value={SCALING[resize] || 'none'}
                  onChange={event => onResizeChange?.(RESIZE_OF[event.target.value] || 'none')}
                  onClick={stop}
                >
                  <option value="none">{t('console.vncDisplaySettingsSubmenu.scalingNone')}</option>
                  <option value="local">
                    {t('console.vncDisplaySettingsSubmenu.scalingLocal')}
                  </option>
                  <option value="remote">
                    {t('console.vncDisplaySettingsSubmenu.scalingRemote')}
                  </option>
                </select>
              </div>
            </div>
            <LevelSlider
              id="vnc-quality"
              tone="primary"
              value={quality}
              labelKey="console.vncDisplaySettingsSubmenu.qualityLevel"
              hintKey="console.vncDisplaySettingsSubmenu.qualityHint"
              onChange={onQualityChange}
            />
            <LevelSlider
              id="vnc-compression"
              tone="info"
              value={compression}
              labelKey="console.vncDisplaySettingsSubmenu.compressionLevel"
              hintKey="console.vncDisplaySettingsSubmenu.compressionHint"
              onChange={onCompressionChange}
            />
            <div className="dropdown-item">
              <div className="form-check">
                <input
                  className="form-check-input"
                  type="checkbox"
                  id="vnc-show-dot"
                  checked={showDot}
                  onChange={event => onShowDotChange?.(event.target.checked)}
                  onClick={stop}
                />
                <label className="form-check-label" htmlFor="vnc-show-dot">
                  {t('console.vncDisplaySettingsSubmenu.showCursorDot')}
                </label>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

VncDisplaySettingsSubmenu.propTypes = {
  quality: PropTypes.number.isRequired,
  compression: PropTypes.number.isRequired,
  resize: PropTypes.string.isRequired,
  showDot: PropTypes.bool.isRequired,
  onQualityChange: PropTypes.func,
  onCompressionChange: PropTypes.func,
  onResizeChange: PropTypes.func,
  onShowDotChange: PropTypes.func,
  calculateSubmenuPosition: PropTypes.func.isRequired,
};

export default VncDisplaySettingsSubmenu;
