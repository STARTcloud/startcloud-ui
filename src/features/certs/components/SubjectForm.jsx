import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { FaPlus, FaXmark } from 'react-icons/fa6';

import ScopeList from '../../../components/common/ScopeList';
import { formRulesShape } from '../../../hooks/useFormRules';
import { newId } from '../utils/records';
import { EKUS, SAN_KINDS } from '../utils/schemas';

import { SelectField, TextField } from './fields';

const FIELDS = ['CN', 'O', 'OU', 'L', 'ST', 'C', 'emailAddress'];

const sanShape = PropTypes.shape({
  id: PropTypes.string.isRequired,
  kind: PropTypes.string.isRequired,
  value: PropTypes.string.isRequired,
});

export const subjectDraftShape = PropTypes.shape({
  CN: PropTypes.string.isRequired,
  sans: PropTypes.arrayOf(sanShape).isRequired,
  ext_key_usage: PropTypes.arrayOf(PropTypes.string).isRequired,
});

/**
 * The subject alternative names the engine takes, each a kind and a
 * value, the rows with no value dropped.
 *
 * @param {Array<Object>} sans - The form's rows
 * @returns {Array<{ kind: string, value: string }>} The names
 */
export const sansOf = sans =>
  sans.filter(san => san.value.trim()).map(san => ({ kind: san.kind, value: san.value.trim() }));

/**
 * The subject members a request or a certificate starts from: every
 * field empty, no names, no usages.
 */
export const EMPTY_SUBJECT = {
  ...Object.fromEntries(FIELDS.map(field => [field, ''])),
  sans: [],
  ext_key_usage: [],
};

/**
 * The subject the engine takes: every field with text, in the form's
 * order.
 *
 * @param {Object} draft - The form's draft
 * @returns {Object} The name map
 */
export const subjectOf = draft =>
  Object.fromEntries(
    FIELDS.filter(field => draft[field]?.trim()).map(field => [field, draft[field].trim()])
  );

/**
 * The subject members a template's subject stands for in a draft.
 *
 * @param {Object} subject - The template's name map
 * @returns {Object} The fields
 */
export const fieldsOfSubject = subject =>
  Object.fromEntries(FIELDS.map(field => [field, subject?.[field] || '']));

const SanRow = ({ index, draft, rules, onChange, onRemove }) => {
  const { t } = useTranslation();
  return (
    <div className="row g-2 align-items-start mb-2">
      <div className="col-sm-3">
        <SelectField
          name={`sans/${index}/kind`}
          options={SAN_KINDS.map(kind => ({ value: kind, label: t(`certs.subject.san.${kind}`) }))}
          draft={draft}
          rules={rules}
          onChange={onChange}
          className="mb-0"
        />
      </div>
      <div className="col">
        <TextField
          name={`sans/${index}/value`}
          draft={draft}
          rules={rules}
          onChange={onChange}
          className="mb-0"
        />
      </div>
      <div className="col-auto pt-4 mt-2">
        <button
          type="button"
          className="btn btn-outline-secondary"
          aria-label={t('certs.subject.removeSan')}
          title={t('certs.subject.removeSan')}
          onClick={onRemove}
        >
          <FaXmark aria-hidden="true" />
        </button>
      </div>
    </div>
  );
};

SanRow.propTypes = {
  index: PropTypes.number.isRequired,
  draft: PropTypes.object.isRequired,
  rules: formRulesShape.isRequired,
  onChange: PropTypes.func.isRequired,
  onRemove: PropTypes.func.isRequired,
};

const withSan = (draft, index, name, value) => ({
  ...draft,
  sans: draft.sans.map((san, at) => (at === index ? { ...san, [name]: value } : san)),
});

/**
 * The subject form a request and a certificate share over the form's
 * rules: the common name, organization, unit, locality, state, country
 * and email fields, the subject alternative names as rows of a kind and
 * a value with a remove control and an add control under them, and the
 * extended key usages as one scope list in a wrapping row, server,
 * client, code signing and email; `onChange(draft)` answers the whole
 * draft.
 */
const SubjectForm = ({ draft, rules, onChange }) => {
  const { t } = useTranslation();
  const set = (name, value) => onChange({ ...draft, [name]: value });
  const setSan = (name, value) => {
    const [, index, member] = name.split('/');
    onChange(withSan(draft, Number(index), member, value));
  };
  const toggleEku = eku =>
    onChange({
      ...draft,
      ext_key_usage: draft.ext_key_usage.includes(eku)
        ? draft.ext_key_usage.filter(entry => entry !== eku)
        : [...draft.ext_key_usage, eku],
    });
  return (
    <div data-panel="certs-subject">
      <div className="row g-3">
        {FIELDS.map(field => (
          <div key={field} className={field === 'CN' ? 'col-12' : 'col-md-6 col-xl-4'}>
            <TextField name={field} draft={draft} rules={rules} onChange={set} className="mb-0" />
          </div>
        ))}
      </div>
      <fieldset className="my-3">
        <legend className="form-label fs-6">{rules.labelFor('sans')}</legend>
        {draft.sans.map((san, index) => (
          <SanRow
            key={san.id}
            index={index}
            draft={draft}
            rules={rules}
            onChange={setSan}
            onRemove={() =>
              set(
                'sans',
                draft.sans.filter(entry => entry.id !== san.id)
              )
            }
          />
        ))}
        <button
          type="button"
          className="btn btn-sm btn-outline-secondary"
          data-action="add-san"
          onClick={() => set('sans', [...draft.sans, { id: newId(), kind: 'dns', value: '' }])}
        >
          <FaPlus className="me-1" aria-hidden="true" />
          {t('certs.subject.addSan')}
        </button>
      </fieldset>
      <fieldset className="mb-3">
        <legend className="form-label fs-6">{rules.labelFor('ext_key_usage')}</legend>
        <ScopeList
          id={rules.idFor('ext_key_usage')}
          scopes={EKUS.map(eku => ({ id: eku, label: t(`certs.subject.ekuOf.${eku}`) }))}
          checked={draft.ext_key_usage}
          onToggle={toggleEku}
          name="eku"
          inline
        />
      </fieldset>
    </div>
  );
};

SubjectForm.propTypes = {
  draft: subjectDraftShape.isRequired,
  rules: formRulesShape.isRequired,
  onChange: PropTypes.func.isRequired,
};

export default SubjectForm;
