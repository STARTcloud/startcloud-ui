import PropTypes from 'prop-types';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaFileImport, FaKey, FaPen, FaVault, FaWandMagicSparkles } from 'react-icons/fa6';

import { formRulesShape } from '../../../../hooks/useFormRules';
import { firstOf } from '../../utils/components';
import { textOf } from '../../utils/download';
import { algorithmOf, nameOf, newRecord, stemOf } from '../../utils/records';
import InputZone from '../InputZone';
import KeyTypeSelect from '../KeyTypeSelect';
import PickSecretModal from '../PickSecretModal';
import SignatureSelect from '../SignatureSelect';

/**
 * The key source members a form starts from: a fresh RSA 2048 key
 * signing with PKCS#1 v1.5, no vault key and no key file.
 */
export const EMPTY_KEY_SOURCE = {
  mode: 'generate',
  keyId: '',
  keyFile: null,
  alg: 'rsa2048',
  signature: 'pkcs1',
};

const KEY_KINDS = ['key'];

const MODES = [
  { mode: 'generate', labelKey: 'certs.generate.keyGenerate', icon: FaWandMagicSparkles },
  { mode: 'vault', labelKey: 'certs.generate.keyFromVault', icon: FaVault },
  { mode: 'file', labelKey: 'certs.generate.keyFromFile', icon: FaFileImport },
];

const factsOf = (source, keys) => {
  if (source.mode === 'vault') {
    return keys.find(key => key.id === source.keyId)?.facts || null;
  }
  return source.mode === 'file' ? source.keyFile?.facts || null : null;
};

/**
 * Whether the key a source resolves to is RSA, the one algorithm with a
 * signature scheme to pick: the vault key's or the read file's facts
 * while one is picked, the algorithm word while generating.
 *
 * @param {{ mode: string, keyId: string, keyFile: Object|null, alg: string }} source - The key source members
 * @param {Array<Object>} keys - The vault's key records
 * @returns {boolean} True for an RSA key
 */
export const sourceIsRsa = (source, keys) =>
  source.mode === 'generate'
    ? source.alg.startsWith('rsa')
    : factsOf(source, keys)?.algorithm === 'RSA';

/**
 * The key a form signs with, resolved from its draft: the vault's key
 * while one is picked, answered as the record held; else the read key
 * file or a key the engine generates, named after the subject it is made
 * beside, answered as a record the form may save.
 *
 * @param {Object} engine - The engine of `loadCerts`
 * @param {{ mode: string, keyId: string, keyFile: Object|null, alg: string }} source - The key source members
 * @param {Array<Object>} keys - The vault's key records
 * @param {string} name - The common name the key is made beside
 * @returns {{ record: Object, fresh: boolean }} The key's record and whether the form made it
 */
export const resolveKey = (engine, source, keys, name) => {
  if (source.mode === 'vault') {
    return { record: keys.find(key => key.id === source.keyId), fresh: false };
  }
  const made =
    source.mode === 'file'
      ? { facts: source.keyFile.facts, der_b64: source.keyFile.der_b64 }
      : engine.generate_key(source.alg);
  return {
    record: newRecord({
      kind: 'key',
      name: `${name || (source.mode === 'file' ? source.keyFile.name : source.alg)} key`,
      facts: made.facts,
      private_der_b64: made.der_b64,
    }),
    fresh: true,
  };
};

/**
 * The PKCS#8 PEM of a private key, written by the engine.
 *
 * @param {Object} engine - The engine of `loadCerts`
 * @param {string} der_b64 - The key's DER as base64
 * @returns {string} The PEM
 */
export const keyPemOf = (engine, der_b64) =>
  textOf(
    engine.convert({
      components: [{ kind: 'key', der_b64 }],
      to: 'pkcs8',
      password: '',
      legacy: false,
      friendly_name: '',
    }).bytes
  );

/**
 * What an outcome shows of the key a form made: its PEM and algorithm
 * while the form generated it or read it from a file, nothing for a
 * vault key.
 *
 * @param {Object} engine - The engine of `loadCerts`
 * @param {{ record: Object, fresh: boolean }} key - The resolved key
 * @returns {{ pem: string, alg: string }|null} The key shown
 */
export const shownKeyOf = (engine, key) =>
  key.fresh
    ? { pem: keyPemOf(engine, key.record.private_der_b64), alg: algorithmOf(key.record) }
    : null;

/**
 * The file name a made key downloads under beside what it signed.
 *
 * @param {string} name - The common name it was made beside
 * @returns {string} `<stem>.key.pem`
 */
export const keyFileNameOf = name => `${stemOf({ name: name || 'key' })}.key.pem`;

const pickedName = (draft, held) => {
  if (draft.mode === 'vault') {
    const key = held.find(entry => entry.id === draft.keyId);
    return key ? nameOf(key) : '';
  }
  return draft.mode === 'file' && draft.keyFile ? draft.keyFile.name : '';
};

/**
 * The key a request or a certificate is made with, over the form's
 * rules: one row of three buttons, Generate a key drawing the algorithm
 * of the key generated as the form runs, Pick a key from the Vault
 * opening the Pick secret dialog over the vault's keys with their
 * private half, disabled with its hint while the vault holds none, and
 * Load a key file drawing the input zone under the row, the private key
 * a read carries becoming the pick; a picked key's name draws in place
 * of the row with Change bringing the row back; the signature scheme
 * under it while the key is RSA.
 */
const KeySource = ({ draft, rules, onChange, keys }) => {
  const { t } = useTranslation();
  const [picking, setPicking] = useState(false);
  const held = keys.filter(key => key.private_der_b64);
  const none = held.length === 0;
  const picked = pickedName(draft, held);
  const error = rules.errors.keyId || rules.errors.keyFile || '';

  const choose = mode => {
    if (mode === 'vault') {
      setPicking(true);
      return;
    }
    onChange('mode', mode);
    onChange('keyId', '');
    onChange('keyFile', null);
  };

  const pick = record => {
    onChange('mode', 'vault');
    onChange('keyId', record.id);
    onChange('keyFile', null);
    setPicking(false);
  };

  const read = (detected, file) => {
    const key = firstOf(detected, KEY_KINDS);
    onChange('keyFile', key?.facts?.has_private ? { ...key, name: file.name } : null);
  };

  const idOf = mode => {
    if (mode === 'vault') {
      return rules.idFor('keyId');
    }
    return mode === 'file' ? rules.idFor('keyFile') : undefined;
  };

  return (
    <fieldset className="mb-3" data-panel="key-source">
      <legend className="form-label fs-6">{t('certs.generate.keySource')}</legend>
      {picked ? (
        <div className="d-flex align-items-center gap-2 mb-3" data-key-picked={draft.mode}>
          <FaKey aria-hidden="true" />
          <span className="fw-semibold">{picked}</span>
          <button
            type="button"
            className="btn btn-sm btn-link p-0 text-reset"
            data-action="key-change"
            aria-label={t('certs.generate.keyChange')}
            title={t('certs.generate.keyChange')}
            onClick={() => choose('generate')}
          >
            <FaPen aria-hidden="true" />
          </button>
        </div>
      ) : (
        <div className="mb-3">
          <div
            className="d-flex flex-wrap gap-2"
            role="group"
            aria-label={t('certs.generate.keySource')}
          >
            {MODES.map(({ mode, labelKey, icon: Icon }) => (
              <button
                key={mode}
                id={idOf(mode)}
                type="button"
                className={`btn btn-sm btn-outline-primary${draft.mode === mode ? ' active' : ''}`}
                aria-pressed={draft.mode === mode}
                data-action={`key-${mode}`}
                disabled={mode === 'vault' && none}
                onClick={() => choose(mode)}
              >
                <Icon className="me-1" aria-hidden="true" />
                {t(labelKey)}
              </button>
            ))}
          </div>
          {none ? <p className="form-text mb-0">{t('certs.generate.noVaultKey')}</p> : null}
          {error ? <p className="form-text text-danger mb-0">{error}</p> : null}
        </div>
      )}
      {draft.mode === 'generate' ? (
        <KeyTypeSelect draft={draft} rules={rules} onChange={onChange} />
      ) : null}
      {draft.mode === 'file' && !picked ? (
        <div className="mb-3">
          <InputZone idPrefix={rules.idFor('key-zone')} onDetected={read} />
        </div>
      ) : null}
      {sourceIsRsa(draft, held) ? (
        <SignatureSelect draft={draft} rules={rules} onChange={onChange} />
      ) : null}
      {picking ? (
        <PickSecretModal
          kinds={KEY_KINDS}
          title={t('certs.generate.keyFromVault')}
          accept={record => Boolean(record.private_der_b64)}
          onPick={pick}
          onCopy={record => record}
          onClose={() => setPicking(false)}
        />
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
