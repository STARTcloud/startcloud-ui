import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';

import { pillShape } from './chartShapes';

/**
 * The pills of a chart's header, one per group of its series: filled in
 * the group's tone while the group shows, outlined while it is hidden,
 * `aria-pressed` saying which, the tooltip offering to hide or show the
 * group; a click toggles it.
 */
const LinePills = ({ pills, visibility, onToggle }) => {
  const { t } = useTranslation();
  return (
    <span className="d-inline-flex flex-wrap gap-1">
      {pills.map(pill => {
        const shown = visibility[pill.key] !== false;
        return (
          <button
            key={pill.key}
            type="button"
            className={`btn line-pill line-pill-${pill.tone || 'neutral'}`}
            title={t(shown ? 'hosts.charts.hideLine' : 'hosts.charts.showLine', {
              label: pill.label,
            })}
            aria-pressed={shown}
            data-series={pill.key}
            onClick={() => onToggle(pill.key)}
          >
            {pill.label}
          </button>
        );
      })}
    </span>
  );
};

LinePills.propTypes = {
  pills: PropTypes.arrayOf(pillShape).isRequired,
  visibility: PropTypes.objectOf(PropTypes.bool).isRequired,
  onToggle: PropTypes.func.isRequired,
};

export default LinePills;
