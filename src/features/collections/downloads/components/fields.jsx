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
 * drawn as its own word; `blank`, where given, is the label of an empty
 * first option, the choice a bulk form makes to leave a member as it is.
 */
export const SelectField = ({
  name,
  options,
  draft,
  rules,
  onChange,
  group = '',
  className = 'mb-2',
  blank = '',
}) => {
  const { t } = useTranslation();
  return (
    <Field
      id={rules.idFor(name)}
      label={rules.labelFor(name)}
      error={rules.errors[name] || ''}
      className={className}
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
          {blank ? <option value="">{blank}</option> : null}
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
  className: PropTypes.string,
  blank: PropTypes.string,
};
