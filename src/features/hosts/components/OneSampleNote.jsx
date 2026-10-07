import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';

/**
 * The line under a chart saying it draws one sample and grows as samples
 * arrive, drawn while `single`.
 */
const OneSampleNote = ({ single }) => {
  const { t } = useTranslation();
  return single ? (
    <p className="small text-muted mt-2 mb-0" data-note="one-sample">
      {t('hosts.charts.oneSample')}
    </p>
  ) : null;
};

OneSampleNote.propTypes = {
  single: PropTypes.bool.isRequired,
};

export default OneSampleNote;
