import PropTypes from 'prop-types';
import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

export const summaryErrorShape = PropTypes.shape({
  id: PropTypes.string.isRequired,
  message: PropTypes.string.isRequired,
});

const jumpTo = (event, id) => {
  event.preventDefault();
  document.getElementById(id)?.focus();
};

/**
 * The list of a form's errors at its top: `role="alert"`, `tabindex="-1"`,
 * focused when it appears, one link per error that focuses the control,
 * in the same words as the inline errors; nothing while the list is empty.
 */
const FormErrorSummary = ({ errors }) => {
  const { t } = useTranslation();
  const ref = useRef(null);
  const previous = useRef(0);
  const count = errors.length;

  useEffect(() => {
    if (count > 0 && previous.current === 0) {
      ref.current?.focus();
    }
    previous.current = count;
  }, [count]);

  if (count === 0) {
    return null;
  }

  return (
    <div ref={ref} className="form-error-summary" role="alert" tabIndex={-1}>
      <h3>{t('validation.summaryTitle')}</h3>
      <ul className="mb-0">
        {errors.map(error => (
          <li key={`${error.id}:${error.message}`}>
            {error.id ? (
              <a href={`#${error.id}`} onClick={event => jumpTo(event, error.id)}>
                {error.message}
              </a>
            ) : (
              error.message
            )}
          </li>
        ))}
      </ul>
    </div>
  );
};

FormErrorSummary.propTypes = {
  errors: PropTypes.arrayOf(summaryErrorShape).isRequired,
};

export default FormErrorSummary;
