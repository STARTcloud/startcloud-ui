import PropTypes from 'prop-types';

import FieldError from './FieldError';

const describedBy = ({ id, error, hint }) => {
  if (error) {
    return `${id}-error`;
  }
  return hint ? `${id}-hint` : undefined;
};

/**
 * One form field: the label, the control the caller renders through the
 * `children` render prop (spread its argument on the control for the id
 * and the ARIA wiring), the hint while there is no error and the
 * `FieldError` while there is; `aria-invalid` is set only while `error`
 * is, never on first render.
 */
const Field = ({
  id,
  label,
  hint = '',
  error = '',
  required = false,
  className = 'mb-3',
  children,
}) => {
  const errorId = `${id}-error`;
  const control = children({
    id,
    'aria-invalid': error ? true : undefined,
    'aria-describedby': describedBy({ id, error, hint }),
    'aria-errormessage': error ? errorId : undefined,
  });
  return (
    <div className={`field${error ? ' field-invalid' : ''} ${className}`}>
      <label className="form-label" htmlFor={id}>
        {label}
        {required ? (
          <span className="text-danger ms-1" aria-hidden>
            *
          </span>
        ) : null}
      </label>
      {control}
      {error ? <FieldError id={errorId} message={error} /> : null}
      {!error && hint ? (
        <div id={`${id}-hint`} className="form-text">
          {hint}
        </div>
      ) : null}
    </div>
  );
};

Field.propTypes = {
  id: PropTypes.string.isRequired,
  label: PropTypes.node.isRequired,
  hint: PropTypes.node,
  error: PropTypes.string,
  required: PropTypes.bool,
  className: PropTypes.string,
  children: PropTypes.func.isRequired,
};

export default Field;
