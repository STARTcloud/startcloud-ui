import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';

import { formRulesShape } from '../../../hooks/useFormRules';
import { formatOf, formatsFor } from '../utils/formats';

import { SecretField, SelectField, SwitchField, TextField } from './fields';

const NAMED = ['pkcs12', 'openssh', 'openssh_public', 'ppk'];

export const outputShape = PropTypes.shape({
  to: PropTypes.string.isRequired,
  password: PropTypes.string.isRequired,
  legacy: PropTypes.bool.isRequired,
  friendly_name: PropTypes.string.isRequired,
});

/**
 * The output a conversion starts from: no format, no password, the
 * modern PKCS#12 ciphers and no friendly name.
 */
export const EMPTY_OUTPUT = { to: '', password: '', legacy: false, friendly_name: '' };

const passwordKey = format => {
  if (format.needsPassword) {
    return 'certs.convert.passwordRequired';
  }
  return format.takesPassword ? 'certs.convert.passwordOptional' : 'certs.convert.passwordNone';
};

const hintOf = (format, t) =>
  format
    ? [
        t('certs.convert.carries', {
          kinds: format.carries.map(kind => t(`certs.component.${kind}`)).join(', '),
        }),
        t(passwordKey(format)),
        t(format.binary ? 'certs.convert.binary' : 'certs.convert.text'),
      ].join(' · ')
    : '';

/**
 * The picker of a conversion's output over the form's rules: a select
 * of the formats that carry every picked component kind, a hint reading
 * what the format carries and whether it takes a password, the password
 * while it does, required while it must, emptied on a change of format,
 * the legacy switch for a PKCS#12 that older readers open, and the
 * friendly name for the formats that carry one; `onChange(patch)`
 * answers the members that changed.
 */
const FormatPicker = ({ kinds, draft, rules, onChange }) => {
  const { t } = useTranslation();
  const offered = formatsFor(kinds);
  const format = formatOf(draft.to);
  const set = (name, value) =>
    onChange(name === 'to' ? { to: value, password: '' } : { [name]: value });
  return (
    <div data-panel="certs-format">
      <SelectField
        name="to"
        options={offered.map(entry => ({ value: entry.id, label: t(entry.labelKey) }))}
        blank={t('certs.convert.pickFormat')}
        draft={draft}
        rules={rules}
        onChange={set}
        hint={hintOf(format, t)}
      />
      {format?.takesPassword ? (
        <SecretField name="password" draft={draft} rules={rules} onChange={set} />
      ) : null}
      {format?.id === 'pkcs12' ? (
        <SwitchField
          name="legacy"
          draft={draft}
          rules={rules}
          onChange={set}
          hint={t('certs.convert.legacyHint')}
        />
      ) : null}
      {format && NAMED.includes(format.id) ? (
        <TextField name="friendly_name" draft={draft} rules={rules} onChange={set} />
      ) : null}
    </div>
  );
};

FormatPicker.propTypes = {
  kinds: PropTypes.arrayOf(PropTypes.string).isRequired,
  draft: outputShape.isRequired,
  rules: formRulesShape.isRequired,
  onChange: PropTypes.func.isRequired,
};

export default FormatPicker;
