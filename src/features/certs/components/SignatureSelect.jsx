import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';

import { formRulesShape } from '../../../hooks/useFormRules';
import { SIGNATURES } from '../utils/schemas';

import { SelectField } from './fields';

/**
 * The select of the signature scheme an RSA key signs with, over the
 * form's rules, the two words the engine's `make_csr`, `self_sign` and
 * `sign_csr` take: PKCS#1 v1.5 and RSASSA-PSS.
 */
const SignatureSelect = ({ draft, rules, onChange }) => {
  const { t } = useTranslation();
  return (
    <SelectField
      name="signature"
      options={SIGNATURES.map(scheme => ({
        value: scheme,
        label: t(`certs.generate.signatureScheme.${scheme}`),
      }))}
      draft={draft}
      rules={rules}
      onChange={onChange}
    />
  );
};

SignatureSelect.propTypes = {
  draft: PropTypes.object.isRequired,
  rules: formRulesShape.isRequired,
  onChange: PropTypes.func.isRequired,
};

export default SignatureSelect;
