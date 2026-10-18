import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';

import { formRulesShape } from '../../../hooks/useFormRules';
import { ALGORITHMS } from '../utils/schemas';

import { SelectField } from './fields';

/**
 * The select of a key's algorithm over the form's rules, the six words
 * the engine's `generate_key` takes: RSA 2048, 3072 and 4096, P-256,
 * P-384 and Ed25519.
 */
const KeyTypeSelect = ({ draft, rules, onChange, name = 'alg' }) => {
  const { t } = useTranslation();
  return (
    <SelectField
      name={name}
      options={ALGORITHMS.map(algorithm => ({
        value: algorithm,
        label: t(`certs.alg.${algorithm}`),
      }))}
      draft={draft}
      rules={rules}
      onChange={onChange}
    />
  );
};

KeyTypeSelect.propTypes = {
  draft: PropTypes.object.isRequired,
  rules: formRulesShape.isRequired,
  onChange: PropTypes.func.isRequired,
  name: PropTypes.string,
};

export { ALGORITHMS };

export default KeyTypeSelect;
