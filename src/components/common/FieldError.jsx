import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';

/**
 * The inline error under a control: the element the control's
 * `aria-describedby` and `aria-errormessage` name, a visually hidden
 * "Error:" before the text, and the danger rule beside it.
 */
const FieldError = ({ id, message }) => {
  const { t } = useTranslation();
  return (
    <span className="field-error" id={id}>
      <span>
        <span className="visually-hidden">{t('validation.errorPrefix')} </span>
        {message}
      </span>
    </span>
  );
};

FieldError.propTypes = {
  id: PropTypes.string.isRequired,
  message: PropTypes.string.isRequired,
};

export default FieldError;
