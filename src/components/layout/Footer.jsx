import PropTypes from 'prop-types';
import { useCallback, useEffect, useState } from 'react';
import { OverlayTrigger, Popover } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { FaCircle, FaHeartPulse } from 'react-icons/fa6';

import { useEventStream } from '../../hooks/useEventStream';

const HEALTH_POLL_MS = 60000;

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
    if (streamed) {
      return undefined;
    }
    const interval = setInterval(load, HEALTH_POLL_MS);
    return () => clearInterval(interval);
  }, [load, streamed]);

  useEventStream('ready', () => {
    if (streamed) {
      load();
    }
  });

  useEventStream('health', data => {
    if (streamed && data) {
      setHealth(data);
    }
  });

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
    <OverlayTrigger placement="top" delay={{ show: 250, hide: 400 }} overlay={popover}>
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

/**
 * The footer row of the navbar contract's Footer status section: the
 * app's name, year and version on the left as the repository link, the
 * changelog link or plain text; "Powered by" in the center; and the health
 * heart on the right while the app hands a `fetchHealth`, its state read
 * once on mount, then while `streamed` read again on every `ready` of
 * the tab's stream and kept by its `health` event, and by a 60-second
 * poll otherwise.
 */
const Footer = ({
  appName,
  version,
  repoUrl = '',
  poweredBy,
  fetchHealth = null,
  streamed = false,
}) => {
  const { t } = useTranslation(['shared', 'auth']);
  const line = (
    <>
      {appName} &copy; {new Date().getFullYear()} · v{version}
    </>
  );
  return (
    <footer className="footer mt-auto bg-body-tertiary border-top">
      <div className="container-fluid position-relative d-flex align-items-center">
        <div className="footer-edge-start">
          {repoUrl ? (
            <a
              href={repoUrl}
              target="_blank"
              rel="noreferrer"
              className="text-decoration-none text-body-secondary"
            >
              {line}
            </a>
          ) : (
            <span className="text-body-secondary">{line}</span>
          )}
        </div>
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
        <div className="footer-edge-end d-flex align-items-center">
          {fetchHealth ? <HealthIndicator fetchHealth={fetchHealth} streamed={streamed} /> : null}
        </div>
      </div>
    </footer>
  );
};

Footer.propTypes = {
  appName: PropTypes.string.isRequired,
  version: PropTypes.string.isRequired,
  repoUrl: PropTypes.string,
  poweredBy: PropTypes.shape({
    href: PropTypes.string.isRequired,
    logoSrc: PropTypes.string.isRequired,
  }).isRequired,
  fetchHealth: PropTypes.func,
  streamed: PropTypes.bool,
};

export default Footer;
