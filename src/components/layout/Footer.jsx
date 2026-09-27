import PropTypes from 'prop-types';
import { useCallback, useEffect, useState } from 'react';
import { OverlayTrigger, Popover } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { FaCircle, FaHeartPulse } from 'react-icons/fa6';
import { Link } from 'react-router-dom';

import { useEventStream } from '../../hooks/useEventStream';
import { useFooterPane } from '../../hooks/useFooterPane';

import FooterPane, { FooterGrip, FooterHandles, FooterTools, sidebarSizeShape } from './FooterPane';

const GAME_SCRIPT = '//hi.kickassapp.com/kickass.js';
const GAME_VERSION = '2.0';
const GAME_CLICKS = 3;

const statusColor = status => {
  const lower = String(status).toLowerCase();
  if (lower === 'good' || lower.startsWith('ok')) {
    return 'text-success';
  }
  if (lower.includes('warn')) {
    return 'text-warning';
  }
  if (lower.includes('error') || lower.includes('bad')) {
    return 'text-danger';
  }
  return 'text-success';
};

const OVERALL_COLORS = { ok: 'text-success', warning: 'text-warning', error: 'text-danger' };

const HealthIndicator = ({ fetchHealth, streamed }) => {
  const { t } = useTranslation();
  const [health, setHealth] = useState({ status: 'loading', services: {} });

  const load = useCallback(() => {
    fetchHealth()
      .then(data => setHealth(data))
      .catch(() => setHealth({ status: 'error', services: {} }));
  }, [fetchHealth]);

  useEffect(() => {
    load();
  }, [load]);

  useEventStream('ready', (data, resumed) => {
    if (streamed && data && !resumed) {
      load();
    }
  });

  useEventStream('reset', () => {
    if (streamed) {
      load();
    }
  });

  useEventStream('health', data => {
    if (streamed && data) {
      setHealth(data);
    }
  });

  const onToggle = shown => {
    if (shown && !streamed) {
      load();
    }
  };

  const overall = health.status || 'error';

  const popover = props => (
    <Popover id="health-popover" {...props}>
      <Popover.Header as="h3">{t('footer.health.status')}</Popover.Header>
      <Popover.Body>
        <div className="mb-2">
          <FaCircle className={`me-2 ${statusColor(overall)}`} />
          {t(`footer.health.${overall}`, { defaultValue: overall })}
        </div>
        {Object.entries(health.services || {}).map(([service, status]) => (
          <div key={service} className="mb-1">
            <FaCircle className={`me-2 ${statusColor(status)}`} />
            {t(`footer.health.${service}`, {
              defaultValue: service.charAt(0).toUpperCase() + service.slice(1),
            })}
            : {status}
          </div>
        ))}
      </Popover.Body>
    </Popover>
  );

  return (
    <OverlayTrigger
      placement="top"
      delay={{ show: 250, hide: 400 }}
      overlay={popover}
      onToggle={onToggle}
    >
      <div className="d-flex align-items-center cursor-pointer">
        <FaHeartPulse className={OVERALL_COLORS[health.status] || 'text-muted'} />
      </div>
    </OverlayTrigger>
  );
};

HealthIndicator.propTypes = {
  fetchHealth: PropTypes.func.isRequired,
  streamed: PropTypes.bool.isRequired,
};

const loadGame = () => {
  window.KICKASSVERSION = GAME_VERSION;
  const script = document.createElement('script');
  script.type = 'text/javascript';
  script.src = GAME_SCRIPT;
  document.body.appendChild(script);
};

const VersionButton = ({ version }) => {
  const { t } = useTranslation();
  const [clicks, setClicks] = useState(0);

  const press = () => {
    if (clicks + 1 < GAME_CLICKS) {
      setClicks(clicks + 1);
      return;
    }
    setClicks(0);
    loadGame();
  };

  return (
    <button
      type="button"
      className="footer-version"
      title={t('footer.pane.versionSurprise')}
      onClick={press}
    >
      v{version}
    </button>
  );
};

VersionButton.propTypes = {
  version: PropTypes.string.isRequired,
};

const poweredByShape = PropTypes.shape({
  href: PropTypes.string.isRequired,
  logoSrc: PropTypes.string.isRequired,
});

const PoweredMark = ({ poweredBy }) => {
  const { t } = useTranslation(['shared', 'auth']);
  const label = `${t('auth:login.poweredBy')} ${t('auth:login.poweredByCompany')}`;
  return (
    <a
      href={poweredBy.href}
      target="_blank"
      rel="noreferrer"
      className="d-flex align-items-center me-2"
      title={label}
      aria-label={label}
    >
      <img
        src={poweredBy.logoSrc}
        alt=""
        height="20"
        onError={event => {
          event.currentTarget.parentElement.classList.add('d-none');
        }}
      />
    </a>
  );
};

PoweredMark.propTypes = {
  poweredBy: poweredByShape.isRequired,
};

const PoweredBy = ({ poweredBy }) => {
  const { t } = useTranslation(['shared', 'auth']);
  return (
    <div className="mx-auto d-flex align-items-center">
      <span className="text-muted me-2">{t('auth:login.poweredBy')}</span>
      <a
        href={poweredBy.href}
        target="_blank"
        rel="noreferrer"
        className="text-decoration-none d-flex align-items-center"
      >
        <img
          src={poweredBy.logoSrc}
          alt={t('auth:login.poweredByCompany')}
          height="20"
          className="me-2"
          onError={event => {
            event.currentTarget.classList.add('d-none');
          }}
        />
        <span className="text-muted">{t('auth:login.poweredByCompany')}</span>
      </a>
    </div>
  );
};

PoweredBy.propTypes = {
  poweredBy: poweredByShape.isRequired,
};

const FooterRow = ({
  appName,
  version,
  about,
  poweredBy,
  fetchHealth,
  streamed,
  grip = null,
  tools = null,
  handles = null,
}) => {
  const name = (
    <>
      {appName} &copy; {new Date().getFullYear()}
    </>
  );
  return (
    <footer className="footer mt-auto bg-body-tertiary border-top">
      {handles}
      <div className="container-fluid position-relative d-flex align-items-center">
        <div className="footer-edge-start d-flex align-items-center">
          {grip ? <PoweredMark poweredBy={poweredBy} /> : null}
          {about ? (
            <Link to="/about" className="text-decoration-none text-body-secondary">
              {name}
            </Link>
          ) : (
            <span className="text-body-secondary">{name}</span>
          )}
          <span className="text-body-secondary mx-1">·</span>
          <VersionButton version={version} />
        </div>
        {grip || <PoweredBy poweredBy={poweredBy} />}
        <div className="footer-edge-end d-flex align-items-center gap-2">
          {fetchHealth ? <HealthIndicator fetchHealth={fetchHealth} streamed={streamed} /> : null}
          {tools}
        </div>
      </div>
    </footer>
  );
};

FooterRow.propTypes = {
  appName: PropTypes.string.isRequired,
  version: PropTypes.string.isRequired,
  about: PropTypes.bool.isRequired,
  poweredBy: poweredByShape.isRequired,
  fetchHealth: PropTypes.func,
  streamed: PropTypes.bool.isRequired,
  grip: PropTypes.node,
  tools: PropTypes.node,
  handles: PropTypes.node,
};

const rowShape = PropTypes.shape({
  appName: PropTypes.string.isRequired,
  version: PropTypes.string.isRequired,
  about: PropTypes.bool.isRequired,
  poweredBy: poweredByShape.isRequired,
  fetchHealth: PropTypes.func,
  streamed: PropTypes.bool.isRequired,
});

const PanedFooter = ({ useViews, row, sidebar }) => {
  const views = useViews();
  const pane = useFooterPane(views);
  if (views.length === 0) {
    return <FooterRow {...row} />;
  }
  return (
    <>
      <FooterRow
        {...row}
        grip={<FooterGrip pane={pane} />}
        tools={<FooterTools pane={pane} views={views} />}
        handles={<FooterHandles pane={pane} sidebar={sidebar} />}
      />
      <FooterPane pane={pane} />
    </>
  );
};

PanedFooter.propTypes = {
  useViews: PropTypes.func.isRequired,
  row: rowShape.isRequired,
  sidebar: sidebarSizeShape,
};

/**
 * The footer of the navbar contract's Footer status section, one for
 * every UI backend: on the left the app's name and year, one in-router
 * link to `/about` while `about` says the role has About text and plain
 * text otherwise, then the version, a button whose third click loads the
 * game from `hi.kickassapp.com`, the click count held in state and reset
 * by no clock; "Powered by" in the center; and the health heart on the
 * right while the app hands a `fetchHealth`, its state read once as the
 * footer draws, then while `streamed` read again when the tab's stream
 * opens fresh or answers `reset` and kept by its `health` event, an
 * in-ring reconnect replaying what was missed, and while not `streamed`
 * read again when the person opens the heart; no timer runs. While the
 * app hands a `pane`, the views hook a mounted feature exported, and the
 * hook answers at least one view, the center is the grip, the one drag
 * area of the row, the STARTcloud mark moves to the far left before the
 * name with the Powered by words as its tooltip, the right cluster draws
 * the pane's toggles, the tools of the view that shows and the chevron
 * after the heart, and the pane draws under the row; with no view the
 * row is the one every other UI backend draws. With a view the row's top
 * edge is a handle the pointer drags to set the pane's height, and while
 * the shell hands `sidebar`, the sidebar's size, the corner where the
 * sidebar's edge meets that top edge is one handle for both, the pane's
 * height and the sidebar's width from one drag.
 */
const Footer = ({
  appName,
  version,
  about = false,
  poweredBy,
  fetchHealth = null,
  streamed = false,
  pane = null,
  sidebar = null,
}) => {
  const row = { appName, version, about, poweredBy, fetchHealth, streamed };
  return pane ? (
    <PanedFooter useViews={pane} row={row} sidebar={sidebar} />
  ) : (
    <FooterRow {...row} />
  );
};

Footer.propTypes = {
  appName: PropTypes.string.isRequired,
  version: PropTypes.string.isRequired,
  about: PropTypes.bool,
  poweredBy: poweredByShape.isRequired,
  fetchHealth: PropTypes.func,
  streamed: PropTypes.bool,
  pane: PropTypes.func,
  sidebar: sidebarSizeShape,
};

export default Footer;
