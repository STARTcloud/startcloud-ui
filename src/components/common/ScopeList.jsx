import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';

export const scopeShape = PropTypes.shape({
  id: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired,
  description: PropTypes.string,
});

export const authorizationDetailShape = PropTypes.shape({
  type: PropTypes.string.isRequired,
  description: PropTypes.string,
  locations: PropTypes.arrayOf(PropTypes.string),
  actions: PropTypes.arrayOf(PropTypes.string),
  datatypes: PropTypes.arrayOf(PropTypes.string),
  identifier: PropTypes.string,
  privileges: PropTypes.arrayOf(PropTypes.string),
});

/**
 * One scope row: the checkbox (a real input named `name` so a native form
 * carries it), the label and the description; a locked row is checked and
 * disabled with a hidden input so it still posts, a disabled row is
 * unchecked and disabled with no hidden input, and a read-only row draws
 * no control at all.
 */
export const ScopeRow = ({
  scope,
  checked,
  onToggle = null,
  locked = false,
  disabled = false,
  readOnly = false,
  name = 'scope',
}) => (
  <label className="scope-row">
    {readOnly ? null : (
      <input
        type="checkbox"
        name={name}
        value={scope.id}
        checked={checked && !disabled}
        disabled={locked || disabled}
        onChange={() => onToggle?.(scope.id)}
      />
    )}
    {locked && !readOnly ? <input type="hidden" name={name} value={scope.id} /> : null}
    <span>
      <span className="scope-row-label">{scope.label}</span>
      {scope.description ? <span className="scope-row-help">{scope.description}</span> : null}
    </span>
  </label>
);

ScopeRow.propTypes = {
  scope: scopeShape.isRequired,
  checked: PropTypes.bool.isRequired,
  onToggle: PropTypes.func,
  locked: PropTypes.bool,
  disabled: PropTypes.bool,
  readOnly: PropTypes.bool,
  name: PropTypes.string,
};

const DETAIL_LISTS = ['locations', 'actions', 'datatypes', 'privileges'];
const DETAIL_MEMBERS = new Set(['type', 'description', 'identifier', ...DETAIL_LISTS]);

const fieldText = value => {
  if (Array.isArray(value)) {
    return value.map(fieldText).join(', ');
  }
  return typeof value === 'object' && value !== null ? JSON.stringify(value) : String(value);
};

const detailFields = detail => Object.entries(detail).filter(([name]) => !DETAIL_MEMBERS.has(name));

/**
 * One authorization-details row: the description as the label with the
 * machine `type` in a tooltip, every other member the detail carries as
 * one labelled line, its label from `consent.detail.field.<name>` or the
 * member's own name, and the locations, actions, data types, identifier
 * and privileges each only when present; `large` draws the row as the
 * centre of a page, the values large and the labels muted.
 */
export const DetailRow = ({ detail, large = false }) => {
  const { t } = useTranslation(['auth']);
  return (
    <div className={large ? 'scope-row scope-row-large' : 'scope-row'}>
      <span>
        <span className="scope-row-label" title={detail.type}>
          {detail.description || detail.type}
        </span>
        {detailFields(detail).map(([name, value]) => (
          <span key={name} className="scope-row-field">
            <span className="scope-row-field-label">
              {t([`consent.detail.field.${name}`], { defaultValue: name })}
            </span>
            <span className="scope-row-value">{fieldText(value)}</span>
          </span>
        ))}
        {DETAIL_LISTS.filter(key => detail[key]?.length > 0).map(key => (
          <span key={key} className="scope-row-help">
            {t(`consent.detail.${key}`, { value: detail[key].join(', ') })}
          </span>
        ))}
        {detail.identifier ? (
          <span className="scope-row-help">
            {t('consent.detail.identifier', { value: detail.identifier })}
          </span>
        ) : null}
      </span>
    </div>
  );
};

DetailRow.propTypes = {
  detail: authorizationDetailShape.isRequired,
  large: PropTypes.bool,
};

/**
 * The list of scope rows the consent and CIBA pages draw, and a later
 * connected-applications list draws read-only: `checked` holds the ids
 * on, `locked` the ids that cannot be turned off, `disabled` the ids that
 * cannot be turned on; `id` names the list for a form summary's link;
 * `inline` lays the rows out in one wrapping row instead of a column.
 */
const ScopeList = ({
  scopes,
  checked,
  onToggle = null,
  locked = [],
  disabled = [],
  readOnly = false,
  name = 'scope',
  id = undefined,
  inline = false,
}) => (
  <div
    className={inline ? 'scope-list flex-row flex-wrap' : 'scope-list'}
    id={id}
    tabIndex={id ? -1 : undefined}
  >
    {scopes.map(scope => (
      <ScopeRow
        key={scope.id}
        scope={scope}
        checked={checked.includes(scope.id)}
        onToggle={onToggle}
        locked={locked.includes(scope.id)}
        disabled={disabled.includes(scope.id)}
        readOnly={readOnly}
        name={name}
      />
    ))}
  </div>
);

ScopeList.propTypes = {
  scopes: PropTypes.arrayOf(scopeShape).isRequired,
  checked: PropTypes.arrayOf(PropTypes.string).isRequired,
  onToggle: PropTypes.func,
  locked: PropTypes.arrayOf(PropTypes.string),
  disabled: PropTypes.arrayOf(PropTypes.string),
  readOnly: PropTypes.bool,
  name: PropTypes.string,
  id: PropTypes.string,
  inline: PropTypes.bool,
};

export default ScopeList;
