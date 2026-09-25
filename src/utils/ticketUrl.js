/**
 * The support-ticket link: the host's ticket base URL with the request
 * type, customer and context appended as query parameters, the user and
 * email beside them only while a person is signed in, empty when the host
 * has no ticket base URL; a customer, user, email or context the host
 * answers as null or empty is left out of the query rather than sent as
 * the word null, which the ticket system takes as a customer that does
 * not exist.
 *
 * @param {Object} options - The resolved ticket inputs
 * @param {string} options.baseUrl - The ticket system URL, already carrying its own query string
 * @param {string} options.reqType - The request type, e.g. 'sso'
 * @param {string} [options.customerId] - The customer code of the active organization or the site
 * @param {string} [options.user] - The signed-in user's display name
 * @param {string} [options.email] - The signed-in user's email
 * @param {string} [options.context] - The app and version, or the repository, the ticket is raised from
 * @returns {string} The ticket URL, or '' when `baseUrl` is empty
 */
export const ticketUrl = ({
  baseUrl,
  reqType,
  customerId = '',
  user = '',
  email = '',
  context = '',
}) => {
  if (!baseUrl) {
    return '';
  }
  const params = new URLSearchParams({ req: reqType });
  const members = { customerId, user, email, context };
  Object.entries(members).forEach(([key, value]) => {
    if (value) {
      params.set(key, value);
    }
  });
  return `${baseUrl}&${params.toString()}`;
};
