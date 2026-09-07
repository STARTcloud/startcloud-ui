import PropTypes from 'prop-types';

const ACTIONS = ['/oauth2/authorize', '/oauth2/device_verification'];
const XSRF_COOKIES = ['__Host-XSRF-TOKEN', 'XSRF-TOKEN'];

const cookieValue = name =>
  document.cookie
    .split('; ')
    .filter(entry => entry.startsWith(`${name}=`))
    .map(entry => decodeURIComponent(entry.slice(name.length + 1)))[0] || '';

const xsrfToken = () => XSRF_COOKIES.map(cookieValue).find(Boolean) || '';

const entriesOf = fields =>
  Object.entries(fields).flatMap(([name, value]) =>
    (Array.isArray(value) ? value : [value])
      .filter(entry => entry !== null && entry !== undefined && entry !== '')
      .map((entry, index) => ({ key: `${name}-${index}`, name, value: String(entry) }))
  );

/**
 * A real form post built from a JSON state, for the pages that must hand
 * the browser to a protocol endpoint: it always emits the `_csrf` field
 * from the `XSRF-TOKEN` cookie, posts only to a same-origin `action` that is
 * `/oauth2/authorize` or `/oauth2/device_verification` (anything else draws
 * nothing), carries `fields` as hidden inputs (an array as one input per
 * value) and the caller's own controls as `children`.
 */
const NativeForm = ({
  action,
  fields = {},
  onSubmit = null,
  className = 'auth-form',
  children,
}) => {
  if (!ACTIONS.includes(action)) {
    return null;
  }
  return (
    <form method="post" action={action} className={className} onSubmit={onSubmit}>
      <input type="hidden" name="_csrf" value={xsrfToken()} />
      {entriesOf(fields).map(entry => (
        <input key={entry.key} type="hidden" name={entry.name} value={entry.value} />
      ))}
      {children}
    </form>
  );
};

NativeForm.propTypes = {
  action: PropTypes.string.isRequired,
  fields: PropTypes.objectOf(
    PropTypes.oneOfType([PropTypes.string, PropTypes.arrayOf(PropTypes.string)])
  ),
  onSubmit: PropTypes.func,
  className: PropTypes.string,
  children: PropTypes.node.isRequired,
};

export default NativeForm;
