import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';

import { formatRelativeTime } from '../../../utils/relativeTime';
import { formatAbsolute } from '../utils/dates';

/**
 * One time in an admin table: the absolute time in the cell and the
 * relative time in its tooltip, the one format every table draws; a dash
 * for no value.
 */
const DateCell = ({ value }) => {
  const { i18n } = useTranslation();
  if (!value) {
    return <span>—</span>;
  }
  return (
    <span className="text-nowrap" title={formatRelativeTime(value, i18n.language)}>
      {formatAbsolute(value)}
    </span>
  );
};

DateCell.propTypes = {
  value: PropTypes.string,
};

export default DateCell;
