/**
 * A display label for a configuration key: snake_case words capitalised and
 * joined by spaces, so `jwt_secret` reads as `Jwt Secret`.
 * @param {string} fieldName - The configuration key
 * @returns {string} The label, or the input unchanged when it is not a string
 */
export const generateLabel = fieldName => {
  if (!fieldName || typeof fieldName !== 'string') {
    return fieldName || '';
  }
  return fieldName
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};
