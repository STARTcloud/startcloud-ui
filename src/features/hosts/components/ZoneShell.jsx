import PropTypes from 'prop-types';
import { memo, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { FaTerminal } from 'react-icons/fa6';
import { XTerm } from 'react-xtermjs';

import { useZoneTerminal } from '../hooks/useZoneTerminal';

/**
 * The terminal of one zone's zlogin session, hyperweaver-ui's zone
 * shell: an xterm over the addons and options the zone terminal context
 * holds for the zone, the socket attached through them, read-only or
 * interactive, fitted to its box as it mounts and on every resize of the
 * box; while the context holds no open socket for the zone the
 * connecting card draws in its place.
 */
const ZoneShell = memo(({ id, zoneName, readOnly = false, className = '' }) => {
  const { t } = useTranslation();
  const { getZoneAddons, getZoneOptions, fitZoneTerminal } = useZoneTerminal();
  const containerRef = useRef(null);
  const addons = getZoneAddons(id, zoneName, readOnly);
  const options = getZoneOptions(readOnly);
  const connected = Boolean(addons) && addons.length > 0;

  useEffect(() => {
    if (!connected) {
      return undefined;
    }
    fitZoneTerminal(id, zoneName);
    const observer = new ResizeObserver(() => fitZoneTerminal(id, zoneName));
    if (containerRef.current) {
      observer.observe(containerRef.current);
    }
    return () => observer.disconnect();
  }, [connected, id, zoneName, fitZoneTerminal]);

  if (!connected) {
    return (
      <div className={`hw-zone-shell-container ${className}`} data-note="zlogin-connecting">
        <div className="h-100 w-100 d-flex align-items-center justify-content-center text-white-50">
          <div className="text-center">
            <FaTerminal className="fs-2 mb-2" aria-hidden="true" />
            <p>{t('console.zoneShell.connectingToZone', { zoneName })}</p>
            <p className="small text-muted">
              {readOnly
                ? t('console.zoneShell.readOnlyMode')
                : t('console.zoneShell.interactiveMode')}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className={`hw-zone-shell-container ${className}`} data-viewer="zlogin">
      <XTerm className="hw-zone-shell-terminal h-100 w-100" addons={addons} options={options} />
    </div>
  );
});

ZoneShell.displayName = 'ZoneShell';

ZoneShell.propTypes = {
  id: PropTypes.string.isRequired,
  zoneName: PropTypes.string.isRequired,
  readOnly: PropTypes.bool,
  className: PropTypes.string,
};

export default ZoneShell;
