import PropTypes from 'prop-types';
import { Suspense, lazy } from 'react';

const IntlTelInput = lazy(() =>
  Promise.all([
    import('@intl-tel-input/react'),
    import('intl-tel-input/dist/css/intlTelInput.css'),
  ]).then(([module]) => module)
);

const loadUtils = () => import('intl-tel-input/dist/js/utils.js');

/**
 * The phone field: intl-tel-input's official React component, loaded on
 * demand with its utils, a country picker beside the national number, the
 * value answered as E.164; `initialCountry` is the ISO code the page
 * resolved (the issuer's geo answer) and the plain `tel` input stands in
 * while the library loads.
 */
const PhoneInput = ({
  id,
  value,
  onChange,
  initialCountry = 'us',
  disabled = false,
  aria = {},
}) => {
  const fallback = (
    <div className="auth-input-wrap">
      <input {...aria} id={id} type="tel" autoComplete="tel" value={value} readOnly />
    </div>
  );
  return (
    <Suspense fallback={fallback}>
      <IntlTelInput
        value={value}
        onChangeNumber={onChange}
        initialCountry={initialCountry || 'us'}
        separateDialCode
        strictMode
        countrySearch
        loadUtils={loadUtils}
        disabled={disabled}
        inputProps={{ ...aria, id, autoComplete: 'tel', className: 'phone-input' }}
      />
    </Suspense>
  );
};

PhoneInput.propTypes = {
  id: PropTypes.string.isRequired,
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  initialCountry: PropTypes.string,
  disabled: PropTypes.bool,
  aria: PropTypes.object,
};

export default PhoneInput;
