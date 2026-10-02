import PropTypes from 'prop-types';
import { Form } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';

import { RESOLUTIONS, WINDOWS } from '../utils/monitoring';

const capital = word => word.charAt(0).toUpperCase() + word.slice(1);

const KEYS = {
  hostHeader: {
    windowTitle: 'host.hostHeader.timeWindowTitle',
    resolutionTitle: 'host.hostHeader.resolutionTitle',
    window: key => `host.hostHeader.timeWindow${key}`,
    resolution: key => `host.hostHeader.resolution${capital(key)}`,
  },
  networkingHeader: {
    windowTitle: 'host.networkingHeader.timeWindowTitle',
    resolutionTitle: 'host.networkingHeader.resolutionTitle',
    window: key => `host.networkingHeader.tw${key}`,
    resolution: key => `host.networkingHeader.res${capital(key)}`,
  },
  storageHeader: {
    windowTitle: 'host.storageHeader.timeWindowTitle',
    resolutionTitle: 'host.storageHeader.resolutionTitle',
    window: key => `host.storageHeader.time${key}`,
    resolution: key => `host.storageHeader.resolution${capital(key)}`,
  },
};

/**
 * The two selects every chart of a host is read over, hyperweaver-ui's:
 * the time window, its ten values, and the resolution, its four, each a
 * change handing the member that changed to `onChange`, the words those
 * of the hyperweaver-ui header `scope` names, the host overview's or the
 * networking page's.
 */
const QuerySelects = ({ query, onChange, scope }) => {
  const { t } = useTranslation();
  const keys = KEYS[scope];
  return (
    <>
      <Form.Select
        size="sm"
        className="w-auto"
        name="window"
        value={query.window}
        title={t(keys.windowTitle)}
        aria-label={t(keys.windowTitle)}
        onChange={event => onChange({ window: event.target.value })}
      >
        {WINDOWS.map(entry => (
          <option key={entry.key} value={entry.key}>
            {t(keys.window(entry.key))}
          </option>
        ))}
      </Form.Select>
      <Form.Select
        size="sm"
        className="w-auto"
        name="resolution"
        value={query.resolution}
        title={t(keys.resolutionTitle)}
        aria-label={t(keys.resolutionTitle)}
        onChange={event => onChange({ resolution: event.target.value })}
      >
        {RESOLUTIONS.map(entry => (
          <option key={entry.key} value={entry.key}>
            {t(keys.resolution(entry.key))}
          </option>
        ))}
      </Form.Select>
    </>
  );
};

QuerySelects.propTypes = {
  query: PropTypes.shape({
    window: PropTypes.string.isRequired,
    resolution: PropTypes.string.isRequired,
  }).isRequired,
  onChange: PropTypes.func.isRequired,
  scope: PropTypes.oneOf(Object.keys(KEYS)).isRequired,
};

export default QuerySelects;
