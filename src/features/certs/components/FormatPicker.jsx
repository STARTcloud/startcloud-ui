import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';

import { formRulesShape } from '../../../hooks/useFormRules';
import { FORMATS, formatOf, formatsFor, slotsOf } from '../utils/formats';
import { describeComponent } from '../utils/reads';

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

const offeredOf = (kinds, format) => {
  const offered = kinds.length > 0 ? formatsFor(kinds) : FORMATS;
  return format && !offered.includes(format) ? [...offered, format] : offered;
};

const Slots = ({ format, components }) => {
  const { t, i18n } = useTranslation();
  const slots = slotsOf(format);
  if (slots.length === 0) {
    return null;
  }
  return (
    <ul className="list-unstyled small mb-3" data-list="certs-slots">
      {slots.map(slot => {
        const filler = components.find(component => slot.kinds.includes(component.kind));
        return (
          <li key={slot.id} data-slot={slot.id} data-slot-state={filler ? 'loaded' : 'needed'}>
            <span className="fw-semibold">{t(`certs.convert.slot.${slot.id}`)}</span>
            {' · '}
            <span className={filler ? '' : 'text-body-secondary'}>
              {filler ? describeComponent(filler, t, i18n.language) : t('certs.convert.slotNeeded')}
            </span>
          </li>
        );
      })}
    </ul>
  );
};

Slots.propTypes = {
  format: PropTypes.object,
  components: PropTypes.array.isRequired,
};

/**
 * The picker of a conversion's output over the form's rules: a select
 * of the formats that carry every picked component kind, every format
 * while nothing is picked so a person may start from the format, a hint
 * reading what the format carries and whether it takes a password, under
 * it, while `components` are given, one line a slot the format carries,
 * the certificate, the key, the public key or the request, reading
 * "needed · not loaded" until a picked component fills it and that
 * component's description after, the password while the format takes
 * one, required while it must, emptied on a change of format, the legacy
 * switch for a PKCS#12 that older readers open, and the friendly name for
 * the formats that carry one; `kinds` are the picked component kinds,
 * `components` the picked components, and `onChange(patch)` answers the
 * members that changed.
 */
const FormatPicker = ({ kinds, components = null, draft, rules, onChange }) => {
  const { t } = useTranslation();
  const format = formatOf(draft.to);
  const offered = offeredOf(kinds, format);
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
      {components ? <Slots format={format} components={components} /> : null}
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
  components: PropTypes.array,
  draft: outputShape.isRequired,
  rules: formRulesShape.isRequired,
  onChange: PropTypes.func.isRequired,
};

export default FormatPicker;
