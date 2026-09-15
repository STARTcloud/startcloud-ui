import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';

import Field from '../../../../components/common/Field';
import { formRulesShape } from '../../../../hooks/useFormRules';
import { listWord } from '../../../../utils/closedLists';

/**
 * One labelled text control of a downloads form, its label and its error
 * read from the form's rules.
 */
export const TextField = ({
  name,
  draft,
  rules,
  onChange,
  hint = '',
  type = 'text',
  className = 'mb-2',
  readOnly = false,
}) => (
  <Field
    id={rules.idFor(name)}
    label={rules.labelFor(name)}
    hint={hint}
    error={rules.errors[name] || ''}
    className={className}
  >
    {aria => (
      <input
        {...aria}
        type={type}
        className="form-control"
        name={name}
        value={draft[name] || ''}
        onChange={onChange}
        onBlur={() => rules.onBlur(name)}
        readOnly={readOnly}
      />
    )}
  </Field>
);

TextField.propTypes = {
  name: PropTypes.string.isRequired,
  draft: PropTypes.object.isRequired,
  rules: formRulesShape.isRequired,
  onChange: PropTypes.func.isRequired,
  hint: PropTypes.string,
  type: PropTypes.string,
  className: PropTypes.string,
  readOnly: PropTypes.bool,
};

/**
 * One labelled textarea of a downloads form.
 */
export const TextAreaField = ({ name, draft, rules, onChange, rows = '3' }) => (
  <Field
    id={rules.idFor(name)}
    label={rules.labelFor(name)}
    error={rules.errors[name] || ''}
    className="mb-2"
  >
    {aria => (
      <textarea
        {...aria}
        className="form-control"
        name={name}
        value={draft[name] || ''}
        onChange={onChange}
        onBlur={() => rules.onBlur(name)}
        rows={rows}
      />
    )}
  </Field>
);

TextAreaField.propTypes = {
  name: PropTypes.string.isRequired,
  draft: PropTypes.object.isRequired,
  rules: formRulesShape.isRequired,
  onChange: PropTypes.func.isRequired,
  rows: PropTypes.string,
};

/**
 * One labelled select of a downloads form over a closed list, each value
 * drawn as its own word.
 */
export const SelectField = ({ name, options, draft, rules, onChange, group = '' }) => {
  const { t } = useTranslation();
  return (
    <Field
      id={rules.idFor(name)}
      label={rules.labelFor(name)}
      error={rules.errors[name] || ''}
      className="mb-2"
    >
      {aria => (
        <select
          {...aria}
          className="form-select"
          name={name}
          value={draft[name] || ''}
          onChange={onChange}
          onBlur={() => rules.onBlur(name)}
        >
          {options.map(option => (
            <option key={option} value={option}>
              {group ? listWord(t, group, option) : option}
            </option>
          ))}
        </select>
      )}
    </Field>
  );
};

SelectField.propTypes = {
  name: PropTypes.string.isRequired,
  options: PropTypes.arrayOf(PropTypes.string).isRequired,
  draft: PropTypes.object.isRequired,
  rules: formRulesShape.isRequired,
  onChange: PropTypes.func.isRequired,
  group: PropTypes.string,
};

/**
 * The Public / Private pair a product's form carries, the shape an ISO's
 * form draws it in.
 */
export const VisibilityRadios = ({ draft, onChange }) => {
  const { t } = useTranslation();
  return (
    <div className="form-group mb-2">
      <span className="form-label d-block">{t('downloads.product.visibility')}</span>
      <div className="d-flex">
        <div className="form-check me-3">
          <input
            type="radio"
            className="form-check-input"
            id="downloadVisibilityPrivate"
            name="is_public"
            value="false"
            checked={!draft.is_public}
            onChange={onChange}
          />
          <label className="form-check-label" htmlFor="downloadVisibilityPrivate">
            {t('downloads.visibility.private')}
          </label>
        </div>
        <div className="form-check">
          <input
            type="radio"
            className="form-check-input"
            id="downloadVisibilityPublic"
            name="is_public"
            value="true"
            checked={Boolean(draft.is_public)}
            onChange={onChange}
          />
          <label className="form-check-label" htmlFor="downloadVisibilityPublic">
            {t('downloads.visibility.public')}
          </label>
        </div>
      </div>
    </div>
  );
};

VisibilityRadios.propTypes = {
  draft: PropTypes.object.isRequired,
  onChange: PropTypes.func.isRequired,
};
