import { randomBytes } from 'crypto';

import { notify } from './inbox.js';
import { ago, ahead, denied, missing, now, ok, taken } from './kit.js';
import {
  forgetOrganization,
  join,
  leave,
  manages,
  membersOf,
  membershipIn,
  membershipRows,
  membershipsOf,
  organizations,
  personById,
  renameMemberships,
} from './people.js';
import { refusedBy } from './rules.js';
import { publish } from './stream.js';

const DAY_MINUTES = 60 * 24;
const WEEK_MINUTES = DAY_MINUTES * 7;
const RECORD_MEMBERS = ['org_code', 'email', 'description'];
const REQUEST_SEEDS = [
  ['acme', 13, 'I run the lab machines Acme borrows, a membership would save the tickets.', 95],
  ['acme', 10, '', 600],
  ['acme', 12, 'The build robot needs to start machines on Desk.', 1500],
  ['prominic', 1, 'Asked for by Dana, for the datacenter move.', 240],
  ['prominic', 5, '', 3000],
];
const INVITATION_SEEDS = [
  ['acme', 'new.hire@example.com', 'member', 6, false],
  ['acme', 'contractor@example.com', 'guest', 2, false],
  ['acme', 'late@example.com', 'member', -3, false],
  ['acme', 'joined@example.com', 'admin', 5, true],
  ['hart-consulting', 'customer@example.com', 'guest', 4, false],
  ['nomad-field-team', 'field.engineer@example.com', 'member', 7, false],
];

const counter = { request: 100, invitation: 200 };

const nextOf = kind => {
  counter[kind] += 1;
  return counter[kind];
};

const requests = REQUEST_SEEDS.map(([org, user, message, minutes]) => ({
  id: nextOf('request'),
  org,
  user,
  message,
  status: 'pending',
  created_at: ago(minutes),
}));

const invitations = INVITATION_SEEDS.map(([org, email, role, days, accepted]) => ({
  id: nextOf('invitation'),
  org,
  email,
  role,
  token: randomBytes(16).toString('hex'),
  expires: ahead(DAY_MINUTES * days),
  accepted,
  accepted_at: accepted ? ago(DAY_MINUTES) : null,
  created_at: ago(WEEK_MINUTES - DAY_MINUTES * days),
}));

const orgOf = ctx => organizations.get(decodeURIComponent(ctx.params.org)) || null;

const NO_ORGANIZATION = 'No such organization.';
const NOT_MANAGER = 'Only an owner or an admin of the organization may do this.';
const MANAGED = 'The organization is managed at the identity provider.';

const found = handler => ctx => {
  const org = orgOf(ctx);
  return org ? handler({ ...ctx, org }) : missing(NO_ORGANIZATION);
};

const managed = handler =>
  found(ctx => {
    if (!manages(ctx.person, ctx.org.name)) {
      return denied(NOT_MANAGER);
    }
    return ctx.org.external_issuer ? denied(MANAGED) : handler(ctx);
  });

const readable = handler =>
  found(ctx => (manages(ctx.person, ctx.org.name) ? handler(ctx) : denied(NOT_MANAGER)));

const recordOf = org => ({ ...org, member_count: membersOf(org.name).length });

const memberRow = entry => {
  const person = personById(entry.user);
  return {
    id: person.id,
    username: person.username,
    name: person.name,
    email: person.email,
    email_hash: person.email_hash,
    avatar_url: person.avatar_url,
    suspended: person.suspended,
    roles: person.roles,
    org_role: entry.role,
    joined_at: entry.joined_at,
  };
};

const membersRows = name =>
  membersOf(name)
    .filter(entry => personById(entry.user))
    .map(memberRow);

const renamedTo = (org, next) => {
  const previous = org.name;
  organizations.delete(previous);
  org.name = next;
  organizations.set(next, org);
  renameMemberships(previous, next);
  [...requests, ...invitations].forEach(row => {
    if (row.org === previous) {
      row.org = next;
    }
  });
};

const codeHolder = (org, code) =>
  [...organizations.values()].find(row => row !== org && row.org_code === code) || null;

const updated = ctx => {
  const { org, body } = ctx;
  const refused = refusedBy('organization', body, ['organization']);
  if (refused) {
    return refused;
  }
  const next = String(body.organization);
  if (next !== org.name && organizations.has(next)) {
    return taken('/organization', 'global');
  }
  if (body.org_code && codeHolder(org, body.org_code)) {
    return taken('/org_code', 'global');
  }
  RECORD_MEMBERS.filter(member => member in body).forEach(member => {
    org[member] = body[member] ?? '';
  });
  if (next !== org.name) {
    renamedTo(org, next);
  }
  return ok(recordOf(org));
};

const accessChanged = ctx => {
  const { org, body } = ctx;
  const refused = refusedBy('accessMode', body);
  if (refused) {
    return refused;
  }
  org.access_mode = body.access_mode || org.access_mode;
  org.default_role = body.default_role || org.default_role;
  return ok(recordOf(org));
};

const suspension = suspended => ctx => {
  ctx.org.suspended = suspended;
  return ok({ message: suspended ? 'Suspended.' : 'Resumed.', name: ctx.org.name });
};

const removed = ctx => {
  organizations.delete(ctx.org.name);
  forgetOrganization(ctx.org.name);
  return ok({ message: `The organization ${ctx.org.name} is deleted.` });
};

const joinedAsAdmin = ctx => {
  const { org, person } = ctx;
  if (!membershipIn(person, org.name)) {
    join({ org: org.name, user: person.id, role: 'admin' });
  }
  return ok({ message: `You are an admin of ${org.name}.` });
};

const memberOf = ctx => {
  const person = personById(ctx.params.user);
  return person ? membershipIn(person, ctx.org.name) : null;
};

const roleChanged = ctx => {
  const entry = memberOf(ctx);
  if (!entry) {
    return missing('No such member.');
  }
  entry.role = String(ctx.body.role || entry.role);
  publish({ topic: 'profile', event: 'profile-updated', data: {}, to: entry.user });
  return ok({ message: 'The role is changed.', role: entry.role });
};

const memberRemoved = ctx => {
  const entry = memberOf(ctx);
  if (!entry) {
    return missing('No such member.');
  }
  leave(ctx.org.name, entry.user);
  publish({ topic: 'profile', event: 'profile-updated', data: {}, to: entry.user });
  return ok({ message: 'The member is removed.' });
};

const requestRow = row => {
  const person = personById(row.user);
  const org = organizations.get(row.org);
  return {
    id: row.id,
    message: row.message,
    status: row.status,
    created_at: row.created_at,
    user: { id: row.user, username: person?.username || '', email: person?.email || '' },
    organization: { name: row.org, description: org?.description || '' },
  };
};

const pendingOf = name =>
  requests.filter(row => row.org === name && row.status === 'pending').map(requestRow);

const ownRequests = ctx => {
  const own = requests.filter(row => row.user === ctx.person.id && row.status === 'pending');
  return ok(own.map(requestRow));
};

const dropRequest = id => {
  const index = requests.findIndex(row => String(row.id) === String(id));
  return index >= 0 ? requests.splice(index, 1)[0] : null;
};

const cancelledRequest = ctx => {
  const own = requests.find(row => String(row.id) === ctx.params.id);
  if (own?.user !== ctx.person.id) {
    return missing('No such request.');
  }
  dropRequest(own.id);
  return ok({ message: 'The request is cancelled.' });
};

const tellManagers = (org, entry) => {
  const managers = membersOf(org.name).filter(row => ['owner', 'admin'].includes(row.role));
  managers.forEach(row => {
    const person = personById(row.user);
    if (person) {
      notify(person, entry);
    }
  });
};

const requested = ctx => {
  const { org, person, body } = ctx;
  const refused = refusedBy('joinRequest', body);
  if (refused) {
    return refused;
  }
  if (org.access_mode !== 'request' || membershipIn(person, org.name)) {
    return denied('The organization takes no join request from you.');
  }
  const row = {
    id: nextOf('request'),
    org: org.name,
    user: person.id,
    message: String(body.message || ''),
    status: 'pending',
    created_at: now(),
  };
  requests.push(row);
  tellManagers(org, {
    title: `A person asks to join ${org.name}`,
    body: `${person.name} sent a join request.`,
    type: 'ADMIN',
    severity: 'INFO',
    navigate: `/org-console/requests#${row.id}`,
  });
  return ok(requestRow(row), 201);
};

const decided = approve => ctx => {
  const row = dropRequest(ctx.params.id);
  const person = row ? personById(row.user) : null;
  if (!person) {
    return missing('No such request.');
  }
  const role = String(ctx.body.assigned_role || 'member');
  if (approve) {
    join({ org: ctx.org.name, user: person.id, role });
  }
  notify(person, {
    title: approve ? `You are a ${role} of ${ctx.org.name}` : `${ctx.org.name} said no`,
    body: approve ? 'The organization is in your switcher now.' : 'The join request was denied.',
    type: 'ACCOUNT',
    severity: approve ? 'SUCCESS' : 'WARNING',
    navigate: '/profile/organizations',
  });
  publish({ topic: 'profile', event: 'profile-updated', data: {}, to: person.id });
  return ok({ message: approve ? 'Approved.' : 'Denied.' });
};

const discoverRow = org => ({
  id: org.id,
  name: org.name,
  display_name: org.display_name,
  description: org.description,
  logo: org.logo,
  email_hash: org.email_hash,
  access_mode: org.access_mode,
  member_count: membersOf(org.name).length,
});

const discovered = () => {
  const open = [...organizations.values()].filter(org => !org.suspended && !org.personal);
  return ok(open.map(discoverRow));
};

const invitationRow = row => ({
  id: row.id,
  email: row.email,
  invite_role: row.role,
  expires: row.expires,
  accepted: row.accepted,
  accepted_at: row.accepted_at,
  expired: Date.parse(row.expires) < Date.now(),
  token: row.token,
  created_at: row.created_at,
});

const invited = ctx => {
  const { body, person } = ctx;
  const refused = refusedBy('invitation', body, ['email']);
  if (refused) {
    return refused;
  }
  const org = organizations.get(String(body.organization_name));
  if (!org || !manages(person, org.name)) {
    return denied(NOT_MANAGER);
  }
  const row = {
    id: nextOf('invitation'),
    org: org.name,
    email: String(body.email),
    role: String(body.invite_role || org.default_role),
    token: randomBytes(16).toString('hex'),
    expires: ahead(WEEK_MINUTES),
    accepted: false,
    accepted_at: null,
    created_at: now(),
  };
  const answer = {
    message: `An invitation was sent to ${row.email}.`,
    invitation_token: row.token,
    invitation_token_expires: Date.parse(row.expires),
    organization_id: org.id,
    invitation_link: `/invite/${row.token}`,
  };
  invitations.push(row);
  return ok(answer, 201);
};

const activeInvitations = ctx => {
  const rows = invitations.filter(row => row.org === ctx.org.name);
  return ok(rows.map(invitationRow));
};

const invitationRemoved = ctx => {
  const index = invitations.findIndex(row => String(row.id) === ctx.params.id);
  const row = invitations[index];
  if (!row || !manages(ctx.person, row.org)) {
    return missing('No such invitation.');
  }
  invitations.splice(index, 1);
  return ok({ message: 'The invitation is deleted.' });
};

const usable = token => {
  const row = invitations.find(entry => entry.token === token);
  return row && !row.accepted && Date.parse(row.expires) > Date.now() ? row : null;
};

const validated = ctx => {
  const row = usable(ctx.params.token);
  if (!row) {
    return missing('The invitation is not known, was used or has expired.');
  }
  return ok({ organization_name: row.org, invited_role: row.role, email: row.email });
};

const accepted = ctx => {
  const row = usable(ctx.params.token);
  if (!row) {
    return missing('The invitation is not known, was used or has expired.');
  }
  row.accepted = true;
  row.accepted_at = now();
  if (!membershipIn(ctx.person, row.org)) {
    join({ org: row.org, user: ctx.person.id, role: row.role });
  }
  publish({ topic: 'profile', event: 'profile-updated', data: {}, to: ctx.person.id });
  return ok({ message: `You joined ${row.org}.`, organization: row.org });
};

const left = ctx => {
  const name = decodeURIComponent(ctx.params.org);
  if (!membershipIn(ctx.person, name)) {
    return missing(NO_ORGANIZATION);
  }
  leave(name, ctx.person.id);
  return ok({ message: `You left ${name}.` });
};

const madePrimary = ctx => {
  const name = decodeURIComponent(ctx.params.org);
  if (!membershipIn(ctx.person, name)) {
    return missing(NO_ORGANIZATION);
  }
  membershipsOf(ctx.person).forEach(entry => {
    entry.primary = entry.org === name;
  });
  return ok({ message: `${name} is your primary organization.` });
};

const withUsers = () => {
  const rows = [...organizations.values()].map(org => ({
    id: org.id,
    name: org.name,
    suspended: org.suspended,
    external_issuer: org.external_issuer,
    members: membersRows(org.name),
  }));
  return ok(rows);
};

const ownMemberships = ctx => ok(membershipRows(ctx.person));

const shown = found(ctx => ok(recordOf(ctx.org)));

const members = readable(ctx => ok(membersRows(ctx.org.name)));

const pending = readable(ctx => ok(pendingOf(ctx.org.name)));

const approved = readable(decided(true));

const refusedRequest = readable(decided(false));

/**
 * The organizations of a `backend` host: a person's memberships, the
 * record, the console's members, requests and invitations, the discovery
 * list, the invitation a link accepts, and the rows the admin's Users
 * and All organizations pages are built from.
 *
 * @param {Object} router - `publicRoute`, `sessionRoute` and `adminRoute`
 * @returns {void}
 */
export const mountOrgs = ({ publicRoute, sessionRoute, adminRoute }) => {
  publicRoute('GET', '/api/organizations/discover', discovered);
  publicRoute('GET', '/api/auth/validate-invitation/:token', validated);
  sessionRoute('POST', '/api/auth/invitations/:token/accept', accepted);
  sessionRoute('POST', '/api/auth/invite', invited);
  sessionRoute('GET', '/api/invitations/active/:org', readable(activeInvitations));
  sessionRoute('DELETE', '/api/invitations/:id', invitationRemoved);
  adminRoute('GET', '/api/organizations-with-users', withUsers);
  sessionRoute('GET', '/api/user/organizations', ownMemberships);
  sessionRoute('GET', '/api/user/requests', ownRequests);
  sessionRoute('DELETE', '/api/user/requests/:id', cancelledRequest);
  sessionRoute('POST', '/api/user/leave/:org', left);
  sessionRoute('PUT', '/api/user/primary-organization/:org', madePrimary);
  sessionRoute('GET', '/api/organization/:org', shown);
  sessionRoute('PUT', '/api/organization/:org', managed(updated));
  adminRoute('DELETE', '/api/organization/:org', found(removed));
  sessionRoute('PUT', '/api/organization/:org/access-mode', managed(accessChanged));
  adminRoute('PUT', '/api/organization/:org/suspend', found(suspension(true)));
  adminRoute('PUT', '/api/organization/:org/resume', found(suspension(false)));
  adminRoute('POST', '/api/organization/:org/join', found(joinedAsAdmin));
  sessionRoute('GET', '/api/organization/:org/users', members);
  sessionRoute('PUT', '/api/organization/:org/users/:user/role', managed(roleChanged));
  sessionRoute('DELETE', '/api/organization/:org/members/:user', managed(memberRemoved));
  sessionRoute('POST', '/api/organization/:org/requests', found(requested));
  sessionRoute('GET', '/api/organization/:org/requests', pending);
  sessionRoute('POST', '/api/organization/:org/requests/:id/approve', approved);
  sessionRoute('POST', '/api/organization/:org/requests/:id/deny', refusedRequest);
};
