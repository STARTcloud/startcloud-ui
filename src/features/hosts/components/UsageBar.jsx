import PropTypes from 'prop-types';
import { useRef } from 'react';
import { useTranslation } from 'react-i18next';

import { useCssVar } from '../../../hooks/useCssVar';

const DIGITS = 1;

const Segment = ({ percent, tone, title = undefined }) => {
  const bar = useRef(null);
  useCssVar(bar, '--progress-width', `${percent}%`);
  return <span ref={bar} className={`progress-bar progress-fill bg-${tone}`} title={title} />;
};

Segment.propTypes = {
  percent: PropTypes.number.isRequired,
  tone: PropTypes.string.isRequired,
  title: PropTypes.string,
};

/**
 * One line of the host's resource utilization: the glyph and the label
 * with the muted summary after it, the percent at the trailing edge, to
 * one decimal, or the not available word while `percent` is null, and
 * under them the bar, its segments drawn side by side in their tones,
 * each width set through a custom property, so memory draws the ZFS ARC
 * as a second segment of the same bar.
 */
const UsageBar = ({ name, icon, label, summary = '', percent = null, segments }) => {
  const { t } = useTranslation();
  const known = percent !== null;
  return (
    <div className="mb-3" data-usage={name}>
      <div className="d-flex justify-content-between align-items-center gap-2 mb-1">
        <span>
          <span className="me-2" aria-hidden="true">
            {icon}
          </span>
          {label}
          {summary ? <span className="small text-muted ms-2">{summary}</span> : null}
        </span>
        <span>{known ? `${percent.toFixed(DIGITS)}%` : t('hosts.overview.notAvailable')}</span>
      </div>
      <div
        className="progress usage-bar"
        role="progressbar"
        aria-label={label}
        aria-valuenow={known ? Math.round(percent) : 0}
        aria-valuemin="0"
        aria-valuemax="100"
      >
        {segments.map(segment => (
          <Segment
            key={segment.key}
            percent={segment.percent}
            tone={segment.tone}
            title={segment.title}
          />
        ))}
      </div>
    </div>
  );
};

UsageBar.propTypes = {
  name: PropTypes.string.isRequired,
  icon: PropTypes.node.isRequired,
  label: PropTypes.string.isRequired,
  summary: PropTypes.string,
  percent: PropTypes.number,
  segments: PropTypes.arrayOf(
    PropTypes.shape({
      key: PropTypes.string.isRequired,
      percent: PropTypes.number.isRequired,
      tone: PropTypes.string.isRequired,
      title: PropTypes.string,
    })
  ).isRequired,
};

export default UsageBar;
