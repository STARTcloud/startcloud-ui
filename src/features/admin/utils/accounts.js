const roleNamesOf = user =>
  (Array.isArray(user.roles) ? user.roles : []).map(role =>
    typeof role === 'string' ? role : role.name
  );

const membershipOf = (org, member) => ({
  uuid: org.name,
  name: org.name,
  role: member.orgRole ? String(member.orgRole).toUpperCase() : undefined,
  primary: false,
});

const userRowOf = member => ({
  id: member.id,
  username: member.username || member.email || '',
  full_name: member.name || '',
  email: member.email || '',
  enabled: !member.suspended,
  roles: roleNamesOf(member),
  organizations: [],
});

/**
 * The users of an organizations-with-users answer in the shape the
 * identity feature's Users page draws: one row per account across every
 * organization, its memberships gathered, `enabled` the inverse of the
 * backend's `suspended`, the roles as names.
 *
 * @param {Array} organizations - The rows of `GET /api/organizations-with-users`
 * @returns {Array} The user rows
 */
export const usersOf = organizations => {
  const users = new Map();
  organizations.forEach(org => {
    (org.members || []).forEach(member => {
      const row = users.get(member.id) || userRowOf(member);
      row.organizations.push(membershipOf(org, member));
      users.set(member.id, row);
    });
  });
  return [...users.values()];
};

const matchesUser = (row, needle) =>
  [row.username, row.full_name, row.email].some(text => text.toLowerCase().includes(needle));

/**
 * One page of user rows in the paged shape the Users page reads, the
 * list's `search` and `enabled` parameters honoured over the rows in
 * hand and `page` and `size` slicing them.
 *
 * @param {Array} rows - Every user row
 * @param {Object} params - The list parameters the page sends
 * @returns {{ items: Array, page: number, size: number, total: number, total_pages: number }} The page
 */
export const pageOf = (rows, params) => {
  const needle = String(params.search || '').toLowerCase();
  const enabled = params.enabled ? String(params.enabled) : '';
  const shown = rows.filter(
    row => (!needle || matchesUser(row, needle)) && (!enabled || String(row.enabled) === enabled)
  );
  const size = Number(params.size) || shown.length || 1;
  const page = Number(params.page) || 0;
  return {
    items: shown.slice(page * size, (page + 1) * size),
    page,
    size,
    total: shown.length,
    total_pages: Math.ceil(shown.length / size),
  };
};

/**
 * One organization row in the shape the identity feature's All
 * organizations page draws, from the organizations-with-users row and the
 * record `GET /api/organization/{org}` answers: the name as the row's
 * id, since the backend keys its routes by name, `org_code` as the
 * customer id, `external_issuer` as `managed`, the members count and the
 * default role upper-cased as the dialog's select offers it.
 *
 * @param {Object} org - The organizations-with-users row
 * @param {Object} details - The organization record
 * @returns {Object} The row
 */
export const organizationRowOf = (org, details) => ({
  ...details,
  id: org.name,
  name: org.name,
  suspended: Boolean(org.suspended),
  managed: Boolean(org.external_issuer || details.external_issuer),
  customer_id: details.org_code || '',
  member_count: (org.members || []).length,
  default_role: String(details.default_role || 'member').toUpperCase(),
});

/**
 * The body of the backend's organization write from the dialog's patch:
 * the name as `organization`, the customer id as `org_code`, the email
 * and the description, absent members dropped.
 *
 * @param {string} name - The organization's current name
 * @param {Object} patch - The dialog's patch
 * @returns {Object} The body
 */
export const organizationBodyOf = (name, patch) =>
  Object.fromEntries(
    Object.entries({
      organization: patch.name || name,
      org_code: patch.customer_id,
      email: patch.email,
      description: patch.description,
    }).filter(([, value]) => value !== undefined)
  );
