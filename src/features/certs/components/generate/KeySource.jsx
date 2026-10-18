import PropTypes from 'prop-types';
import { useId } from 'react';
import { useTranslation } from 'react-i18next';

import OptionList, { Option } from '../../../../components/common/OptionList';
import { formRulesShape } from '../../../../hooks/useFormRules';
import { nameOf, newRecord } from '../../utils/records';
import { SelectField } from '../fields';
import KeyTypeSelect from '../KeyTypeSelect';

const MODES = ['generate', 'vault'];

/**
 * The key source members a form starts from: a fresh RSA 2048 key.
 */
export const EMPTY_KEY_SOURCE = { mode: 'generate', keyId: '', alg: 'rsa2048' };

/**
 * The key a form signs with, resolved from its draft: the vault's key
 * while one is picked, else a key the engine generates, named after
 * the subject it is made beside, answered as a record the form may
 * save; a vault key answers the record held.
 *
 * @param {Object} engine - The engine of `loadCerts`
 * @param {{ mode: string, keyId: string, alg: string }} source - The key source members
 * @param {Array<Object>} keys - The vault's key records
 * @param {string} name - The common name the key is made beside
 * @returns {{ record: Object, fresh: boolean }} The key's record and whether it was generated
 */
export const resolveKey = (engine, source, keys, name) => {
  if (source.mode === 'vault') {
    return { record: keys.find(key => key.id === source.keyId), fresh: false };
  }
  const generated = engine.generate_key(source.alg);
  return {
    record: newRecord({
      kind: 'key',
      name: `${name || source.alg} key`,
      facts: generated.facts,
      private_der_b64: generated.der_b64,
    }),
    fresh: true,
  };
};

/**
 * The key a request or a certificate is made with, over the form's
 * rules: two option cards, a new key of the algorithm picked, generated
 * as the form runs and saved beside what it signed, or a key of the
 * vault picked from the keys held with their private half, required
 * while that card is on.
 */
const KeySource = ({ draft, rules, onChange, keys }) => {
  const { t } = useTranslation();
  const name = useId();
  const held = keys.filter(key => key.private_der_b64);
  return (
    <fieldset className="mb-3" data-panel="key-source">
      <legend className="form-label fs-6">{rules.labelFor('mode')}</legend>
      <OptionList label={rules.labelFor('mode')}>
        {MODES.map(mode => (
          <Option
            key={mode}
            name={name}
            value={mode}
            checked={draft.mode === mode}
            disabled={mode === 'vault' && held.length === 0}
            onChange={value => onChange('mode', value)}
            label={t(`certs.generate.keyMode.${mode}`)}
          />
        ))}
      </OptionList>
      <div className="mt-3">
        {draft.mode === 'generate' ? (
          <KeyTypeSelect draft={draft} rules={rules} onChange={onChange} />
        ) : (
          <SelectField
            name="keyId"
            options={held.map(key => ({ value: key.id, label: nameOf(key) }))}
            blank={t('certs.generate.pickKey')}
            draft={draft}
            rules={rules}
            onChange={onChange}
          />
        )}
      </div>
    </fieldset>
  );
};

KeySource.propTypes = {
  draft: PropTypes.object.isRequired,
  rules: formRulesShape.isRequired,
  onChange: PropTypes.func.isRequired,
  keys: PropTypes.array.isRequired,
};

export default KeySource;
