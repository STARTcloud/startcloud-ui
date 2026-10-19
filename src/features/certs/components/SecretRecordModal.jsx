import PropTypes from 'prop-types';
import { useMemo, useState } from 'react';
import { Modal } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { FaPlus, FaXmark } from 'react-icons/fa6';

import DiscardPrompt, { useDiscardGuard } from '../../../components/common/DiscardPrompt';
import FormErrorSummary from '../../../components/common/FormErrorSummary';
import { useFormRules } from '../../../hooks/useFormRules';
import { PRIVATE_MEMBERS, SECRET_KINDS, SECRET_MEMBERS, newId, newRecord } from '../utils/records';
import { SECRET_LABELS, secretSchemaOf } from '../utils/schemas';
import { CUSTOM_SEEDS, profileOf, profilesOf } from '../utils/secretProfiles';

import { SecretField, SelectField, TextAreaField, TextField } from './fields';

const LONG_MEMBERS = ['private_key', 'public_key', 'bytes', 'scopes'];

const JSON_ROWS = 8;

const customTextOf = secret => (secret ? JSON.stringify(secret, null, 2) : '');

const extraRowsOf = extra =>
  Object.entries(extra || {}).map(([name, value]) => ({ id: newId(), name, value: String(value) }));

const withProfileExtras = (rows, profile) => {
  const held = new Set(rows.map(row => row.name));
  const added = (profile?.extras || [])
    .filter(extra => !held.has(extra.key))
    .map(extra => ({ id: newId(), name: extra.key, value: '' }));
  return [...rows, ...added];
};

/**
 * The form draft a secret record opens on: the record's members, or the
 * kind and the profile given with the profile's url and extras seeded.
 *
 * @param {Object|null} record - The record edited, null for a new one
 * @param {string} kind - The kind a new record opens on
 * @param {string} profileId - The profile a new record opens on
 * @returns {Object} The draft
 */
const membersOf = (record, kind, profile) => {
  const members = Object.fromEntries(
    (SECRET_MEMBERS[kind] || []).map(member => [member, String(record?.secret?.[member] ?? '')])
  );
  if (!record && profile?.url && 'url' in members) {
    members.url = profile.url;
  }
  return members;
};

const customOf = (record, kind, profile) =>
  kind === 'custom' ? customTextOf(record?.secret || CUSTOM_SEEDS[profile?.id]) : '';

export const secretDraftOf = (record, kind, profileId) => {
  const own = record?.kind || kind || SECRET_KINDS[0];
  const profile = profileOf(record?.profile || profileId);
  return {
    name: record?.name || '',
    kind: own,
    profile: profile?.id || '',
    notes: record?.notes || '',
    ...membersOf(record, own, profile),
    custom: customOf(record, own, profile),
    extra: withProfileExtras(extraRowsOf(record?.extra), record ? null : profile),
  };
};

const secretOf = draft => {
  if (draft.kind === 'custom') {
    return JSON.parse(draft.custom);
  }
  return Object.fromEntries(
    (SECRET_MEMBERS[draft.kind] || [])
      .filter(member => String(draft[member] || '').trim() !== '')
      .map(member => [member, draft[member]])
  );
};

/**
 * The record a secret draft stands for: the record edited with the
 * draft's members laid over it, or a new record of the draft's kind.
 *
 * @param {Object} draft - The form's draft
 * @param {Object|null} record - The record edited, null for a new one
 * @returns {Object} The record
 */
export const recordOfSecretDraft = (draft, record) => ({
  ...(record || newRecord({})),
  kind: draft.kind,
  name: draft.name.trim(),
  profile: draft.profile,
  notes: draft.notes,
  facts: null,
  secret: secretOf(draft),
  extra: Object.fromEntries(
    draft.extra
      .filter(row => row.name.trim() && row.value !== '')
      .map(row => [row.name.trim(), row.value])
  ),
  updated_at: new Date().toISOString(),
});

const readBase64 = file =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',').pop());
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

const MemberField = ({ member, draft, rules, onChange, hint }) => {
  const { t } = useTranslation();
  if (member === 'bytes') {
    return (
      <>
        <div className="mb-3">
          <label className="form-label" htmlFor={`${rules.idFor('bytes')}-file`}>
            {t('certs.secret.pickFile')}
          </label>
          <input
            id={`${rules.idFor('bytes')}-file`}
            className="form-control"
            type="file"
            onChange={event => {
              const file = event.target.files?.[0];
              if (file) {
                readBase64(file).then(bytes => {
                  onChange('bytes', bytes);
                  if (!draft.filename) {
                    onChange('filename', file.name);
                  }
                });
              }
            }}
          />
        </div>
        <TextAreaField
          name="bytes"
          draft={draft}
          rules={rules}
          onChange={onChange}
          rows={JSON_ROWS}
          monospace
        />
      </>
    );
  }
  if (LONG_MEMBERS.includes(member)) {
    return (
      <TextAreaField name={member} draft={draft} rules={rules} onChange={onChange} monospace />
    );
  }
  if (PRIVATE_MEMBERS.includes(member)) {
    return (
      <SecretField name={member} draft={draft} rules={rules} onChange={onChange} hint={hint} />
    );
  }
  return <TextField name={member} draft={draft} rules={rules} onChange={onChange} hint={hint} />;
};

MemberField.propTypes = {
  member: PropTypes.string.isRequired,
  draft: PropTypes.object.isRequired,
  rules: PropTypes.object.isRequired,
  onChange: PropTypes.func.isRequired,
  hint: PropTypes.string.isRequired,
};

const ExtraRows = ({ draft, rules, profile, onChange }) => {
  const { t } = useTranslation();
  const optionsOf = name => profile?.extras.find(extra => extra.key === name)?.options || null;
  const set = rows => onChange('extra', rows);
  const patchRow = row => (path, value) =>
    set(
      draft.extra.map(entry =>
        entry.id === row.id ? { ...entry, [path.split('/').pop()]: value } : entry
      )
    );
  return (
    <fieldset className="mb-3" data-panel="secret-extra">
      <legend className="form-label fs-6">{rules.labelFor('extra')}</legend>
      {draft.extra.map((row, index) => (
        <div className="row g-2 align-items-start mb-2" key={row.id} data-extra={row.name}>
          <div className="col-sm-5">
            <TextField
              name={`extra/${index}/name`}
              draft={draft}
              rules={rules}
              onChange={patchRow(row)}
              className="mb-0"
            />
          </div>
          <div className="col">
            {optionsOf(row.name) ? (
              <SelectField
                name={`extra/${index}/value`}
                options={optionsOf(row.name).map(option => ({ value: option, label: option }))}
                blank={t('certs.secret.pickValue')}
                draft={draft}
                rules={rules}
                onChange={patchRow(row)}
                className="mb-0"
              />
            ) : (
              <TextField
                name={`extra/${index}/value`}
                draft={draft}
                rules={rules}
                onChange={patchRow(row)}
                className="mb-0"
              />
            )}
          </div>
          <div className="col-auto pt-4 mt-2">
            <button
              type="button"
              className="btn btn-outline-secondary"
              data-action="extra-remove"
              aria-label={t('certs.secret.removeExtra')}
              title={t('certs.secret.removeExtra')}
              onClick={() => set(draft.extra.filter(entry => entry.id !== row.id))}
            >
              <FaXmark aria-hidden="true" />
            </button>
          </div>
        </div>
      ))}
      <button
        type="button"
        className="btn btn-sm btn-outline-secondary"
        data-action="extra-add"
        onClick={() => set([...draft.extra, { id: newId(), name: '', value: '' }])}
      >
        <FaPlus className="me-1" aria-hidden="true" />
        {t('certs.secret.addExtra')}
      </button>
    </fieldset>
  );
};

ExtraRows.propTypes = {
  draft: PropTypes.object.isRequired,
  rules: PropTypes.object.isRequired,
  profile: PropTypes.object,
  onChange: PropTypes.func.isRequired,
};

/**
 * The one form of a secret record, the dialog the Vault and a host's
 * Secrets page add and edit a secret through: the kind select over the
 * eight secret kinds, held while the caller fixes it, the profile select
 * narrowed to that kind, a pick seeding the url and drawing the
 * profile's extras, the kind's members with the first required, a
 * password, key or private half behind the reveal input, a key or a
 * file's bytes as a textarea and the bytes read from a picked file, a
 * `custom` row's map as JSON text, the notes, and the extra rows of
 * named values with Add and Remove; Save hands `onSave` the record once
 * the rules pass. While the draft differs from the one it opened on, a
 * backdrop click, Escape, the close button and Cancel ask the discard
 * prompt. `data-dialog` is `secret-record`.
 */
const SecretRecordModal = ({
  record = null,
  kind = '',
  profile: profileId = '',
  kinds = SECRET_KINDS,
  busy = false,
  idPrefix = 'secret-record',
  onSave,
  onClose,
}) => {
  const { t } = useTranslation();
  const [opened] = useState(() => secretDraftOf(record, kind, profileId));
  const [draft, setDraft] = useState(opened);
  const guard = useDiscardGuard(JSON.stringify(draft) !== JSON.stringify(opened), onClose);
  const schema = useMemo(() => secretSchemaOf(draft.kind), [draft.kind]);
  const rules = useFormRules({ schema, values: draft, labels: SECRET_LABELS, idPrefix });
  const profile = profileOf(draft.profile);
  const members = SECRET_MEMBERS[draft.kind] || [];

  const set = (name, value) => {
    if (name === 'kind') {
      setDraft(current => ({
        ...secretDraftOf(null, value, ''),
        name: current.name,
        notes: current.notes,
        extra: current.extra,
      }));
      return;
    }
    if (name === 'profile') {
      const picked = profileOf(value);
      setDraft(current => ({
        ...current,
        profile: value,
        ...(picked?.url && 'url' in current && !current.url ? { url: picked.url } : {}),
        ...(picked && current.kind === 'custom' && !current.custom
          ? { custom: customTextOf(CUSTOM_SEEDS[picked.id]) }
          : {}),
        extra: withProfileExtras(current.extra, picked),
      }));
      return;
    }
    setDraft(current => ({ ...current, [name]: value }));
  };

  const submit = event => {
    event.preventDefault();
    if (rules.validateAll()) {
      onSave(recordOfSecretDraft(draft, record));
    }
  };

  const hintOf = member => (profile?.help?.[member] ? t(profile.help[member]) : '');

  return (
    <>
      <Modal show onHide={guard.close} scrollable>
        <form onSubmit={submit} noValidate data-dialog="secret-record" data-kind={draft.kind}>
          <Modal.Header closeButton>
            <Modal.Title as="h5">
              {t(record ? 'certs.secret.editTitle' : 'certs.secret.addTitle')}
            </Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <FormErrorSummary errors={rules.summary} />
            <SelectField
              name="kind"
              options={kinds.map(entry => ({ value: entry, label: t(`certs.kind.${entry}`) }))}
              draft={draft}
              rules={rules}
              onChange={set}
              disabled={Boolean(record) || Boolean(kind)}
            />
            <SelectField
              name="profile"
              options={profilesOf(draft.kind).map(entry => ({
                value: entry.id,
                label: t(entry.labelKey),
              }))}
              blank={t('certs.profile.generic.label')}
              draft={draft}
              rules={rules}
              onChange={set}
            />
            <TextField name="name" draft={draft} rules={rules} onChange={set} />
            {members.map(member => (
              <MemberField
                key={member}
                member={member}
                draft={draft}
                rules={rules}
                onChange={set}
                hint={hintOf(member)}
              />
            ))}
            {draft.kind === 'custom' ? (
              <TextAreaField
                name="custom"
                draft={draft}
                rules={rules}
                onChange={set}
                rows={JSON_ROWS}
                monospace
              />
            ) : null}
            <ExtraRows draft={draft} rules={rules} profile={profile} onChange={set} />
            <TextAreaField name="notes" draft={draft} rules={rules} onChange={set} />
          </Modal.Body>
          <Modal.Footer>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={guard.close}
              disabled={busy}
            >
              {t('pages.confirm.cancel')}
            </button>
            <button type="submit" className="btn btn-primary" data-action="submit" disabled={busy}>
              {t('certs.record.save')}
            </button>
          </Modal.Footer>
        </form>
      </Modal>
      <DiscardPrompt {...guard.prompt} />
    </>
  );
};

SecretRecordModal.propTypes = {
  record: PropTypes.object,
  kind: PropTypes.string,
  profile: PropTypes.string,
  kinds: PropTypes.arrayOf(PropTypes.string),
  busy: PropTypes.bool,
  idPrefix: PropTypes.string,
  onSave: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
};

export default SecretRecordModal;
