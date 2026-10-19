import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';

import { formRulesShape } from '../../../../hooks/useFormRules';
import { nameOf, newRecord } from '../../utils/records';
import { SelectField, SwitchField } from '../fields';
import KeyTypeSelect from '../KeyTypeSelect';
import SignatureSelect from '../SignatureSelect';

/**
 * The key source members a form starts from: a fresh RSA 2048 key
 * signing with PKCS#1 v1.5.
 */
export const EMPTY_KEY_SOURCE = { mode: 'generate', keyId: '', alg: 'rsa2048', signature: 'pkcs1' };

/**
 * Whether the key a source resolves to is RSA, the one algorithm with a
 * signature scheme to pick: the vault key's facts while one is picked,
 * the algorithm word otherwise.
 *
 * @param {{ mode: string, keyId: string, alg: string }} source - The key source members
 * @param {Array<Object>} keys - The vault's key records
 * @returns {boolean} True for an RSA key
 */
export const sourceIsRsa = (source, keys) =>
  source.mode === 'vault'
    ? keys.find(key => key.id === source.keyId)?.facts?.algorithm === 'RSA'
    : source.alg.startsWith('rsa');

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
 * rules: the Use a key of the vault switch, off by default and disabled
 * with its hint while the vault holds no key with its private half; off
 * draws the algorithm of the key generated as the form runs and saved
 * beside what it signed, on draws the vault's keys with their private
 * half, the pick required; the signature scheme under either while the
 * key is RSA.
 */
const KeySource = ({ draft, rules, onChange, keys }) => {
  const { t } = useTranslation();
  const held = keys.filter(key => key.private_der_b64);
  const none = held.length === 0;
  return (
    <fieldset className="mb-3" data-panel="key-source">
      <legend className="form-label fs-6">{t('certs.generate.keySource')}</legend>
      <SwitchField
        name="mode"
        draft={{ mode: draft.mode === 'vault' }}
        rules={rules}
        onChange={(name, on) => onChange(name, on ? 'vault' : 'generate')}
        disabled={none}
        hint={none ? t('certs.generate.noVaultKey') : ''}
      />
      {draft.mode === 'vault' ? (
        <SelectField
          name="keyId"
          options={held.map(key => ({ value: key.id, label: nameOf(key) }))}
          blank={t('certs.generate.pickKey')}
          draft={draft}
          rules={rules}
          onChange={onChange}
        />
      ) : (
        <KeyTypeSelect draft={draft} rules={rules} onChange={onChange} />
      )}
      {sourceIsRsa(draft, held) ? (
        <SignatureSelect draft={draft} rules={rules} onChange={onChange} />
      ) : null}
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
