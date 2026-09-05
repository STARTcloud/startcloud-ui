const IP_PATTERN =
  /^(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
const FQDN_PATTERN = /^(?!:\/\/)(?=.{1,255}$)(?:(?:.{1,63}\.){1,127}(?![0-9]*$)[a-z0-9-]+\.?)$/i;
const EMAIL_PATTERN = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/;

const validateUrl = (value, t) => {
  try {
    new URL(value);
    return null;
  } catch {
    return t('setup.validation.invalidUrl');
  }
};

const validateHost = (value, t) => {
  if (value === 'localhost' || value === '127.0.0.1') {
    return null;
  }
  return IP_PATTERN.test(value) || FQDN_PATTERN.test(value)
    ? null
    : t('setup.validation.invalidHost');
};

const TYPE_VALIDATORS = {
  url: validateUrl,
  host: validateHost,
  integer: (value, t) =>
    Number.isInteger(Number(value)) ? null : t('setup.validation.integerRequired'),
  boolean: (value, t) =>
    typeof value === 'boolean' ? null : t('setup.validation.booleanRequired'),
  password: (value, t) => (value.length >= 6 ? null : t('setup.validation.passwordLength')),
  email: (value, t) => (EMAIL_PATTERN.test(value) ? null : t('setup.validation.invalidEmail')),
  port: (value, t) => {
    const port = Number(value);
    return port >= 1 && port <= 65535 ? null : t('setup.validation.portRange');
  },
  string: (value, t) => (value.trim() !== '' ? null : t('setup.validation.valueRequired')),
};

/**
 * Validate one configuration value by its declared type.
 * @param {string} type - The field type
 * @param {*} value - The value to check
 * @param {Function} t - The translator for the message
 * @returns {string|null} The message, or null when valid
 */
export const validateConfigValue = (type, value, t) => {
  const validator = TYPE_VALIDATORS[type];
  return validator ? validator(value, t) : null;
};
