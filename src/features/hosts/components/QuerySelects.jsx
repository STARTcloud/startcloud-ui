import PropTypes from 'prop-types';
import { Form } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';

import { WINDOWS } from '../utils/monitoring';

const KEYS = {
  hostHeader: {
    windowTitle: 'host.hostHeader.timeWindowTitle',
    window: key => `host.hostHeader.timeWindow${key}`,
  },
  networkingHeader: {
    windowTitle: 'host.networkingHeader.timeWindowTitle',
    window: key => `host.networkingHeader.tw${key}`,
  },
  storageHeader: {
    windowTitle: 'host.storageHeader.timeWindowTitle',
    window: key => `host.storageHeader.time${key}`,
  },
};

/**
 * The one select every chart of a host and its machines is read over,
 * the time window, its ten values, a change handing the member to
 * `onChange`, the words those of the hyperweaver-ui header `scope`
 * names, the host overview's, the networking page's or the storage
 * page's.
 */
const QuerySelects = ({ query, onChange, scope }) => {
  const { t } = useTranslation();
  const keys = KEYS[scope];
  return (
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
  );
};

QuerySelects.propTypes = {
  query: PropTypes.shape({
    window: PropTypes.string.isRequired,
  }).isRequired,
  onChange: PropTypes.func.isRequired,
  scope: PropTypes.oneOf(Object.keys(KEYS)).isRequired,
};

export default QuerySelects;
