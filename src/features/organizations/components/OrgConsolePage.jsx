import PropTypes from 'prop-types';
import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { FaArrowUpRightFromSquare, FaBuilding } from 'react-icons/fa6';

import ConfirmModal from '../../../components/common/ConfirmModal';
import Field from '../../../components/common/Field';
import FormErrorSummary from '../../../components/common/FormErrorSummary';
import MarkdownText from '../../../components/common/MarkdownText';
import RecordRows from '../../../components/common/RecordRows';
import SectionCard from '../../../components/common/SectionCard';
import SectionHeading from '../../../components/common/SectionHeading';
import SubTable from '../../../components/common/SubTable';
import UserCard from '../../../components/common/UserCard';
import { useNotify } from '../../../contexts/NoticeContext';
import { useStatus } from '../../../contexts/StatusContext';
import { useArrival } from '../../../hooks/useArrival';
import { useFolds } from '../../../hooks/useFolds';
import { useFormRules } from '../../../hooks/useFormRules';
import { useNavbarSearchBinding } from '../../../hooks/useSearchBinding';
import { useTablePrefs } from '../../../hooks/useTablePrefs';
import { log } from '../../../lib/logger';
import { hasFeature } from '../../../utils/capabilities';
import { isOwner } from '../../../utils/membership';
import { membershipsOf, organizationsShape } from '../../../utils/organizations';
import { sortItems } from '../../../utils/sort';
import { issuerOrganizationsShape } from '../api/issuer';
import { ORG_CONSOLE_SEGMENTS } from '../segments';

import IssuerOrgConsole from './IssuerOrgConsole';

const NO_FILTERS = [];
const clearNothing = () => undefined;
const PREFS_KEY = 'table_prefs_org_console';
const REQUESTS_PREFS_KEY = 'table_prefs_org_console_requests';
const INVITATIONS_PREFS_KEY = 'table_prefs_org_console_invitations';
const REQUESTS_DEFAULT_SORT = [{ column: 'requested', direction: 'desc' }];
const INVITATIONS_DEFAULT_SORT = [{ column: 'expires', direction: 'asc' }];

const localeDate = value => new Date(value).toLocaleDateString();
const localeTime = value => new Date(value).toLocaleString();
const timeOf = value => new Date(value || 0).getTime();
const yesNo = (flag, t) => t(flag ? 'yes' : 'no');

const JOIN_REQUEST_COLUMNS = [
  {
    key: 'user',
    kind: 'name',
    labelKey: 'orgConsole.joinRequest.user',
    value: request => request.user.username,
    render: request => <strong>{request.user.username}</strong>,
  },
  {
    key: 'email',
    kind: 'text',
    labelKey: 'orgConsole.joinRequest.email',
    value: request => request.user.email || '',
  },
  {
    key: 'message',
    kind: 'text',
    labelKey: 'orgConsole.joinRequest.message',
    value: (request, ctx) => request.message || ctx.t('orgConsole.joinRequest.noMessage'),
  },
  {
    key: 'requested',
    kind: 'date',
    labelKey: 'orgConsole.joinRequest.requested',
    value: request => timeOf(request.created_at),
    render: request => localeDate(request.created_at),
  },
];

const TAB_OF_SEGMENT = { members: 'organization', requests: 'joinRequests' };

const ORG_SCHEMA = {
  required: ['organization', 'email'],
  properties: {
    organization: { type: 'string' },
    email: { type: 'string' },
    description: { type: 'string' },
  },
};
const ORG_LABELS = {
  organization: 'orgConsole.organization.name',
  email: 'orgConsole.organization.email',
  description: 'orgConsole.organization.description',
};
const ACCESS_SCHEMA = {
  properties: { access_mode: { type: 'string' }, default_role: { type: 'string' } },
};
const ACCESS_LABELS = {
  access_mode: 'orgConsole.organization.accessMode',
  default_role: 'orgConsole.organization.defaultRole',
};
const EMPTY_ORG = {
  organization: '',
  email: '',
  description: '',
  access_mode: 'private',
  default_role: 'member',
};
const INVITE_SCHEMA = {
  required: ['email'],
  properties: { email: { type: 'string' }, invite_role: { type: 'string' } },
};
const INVITE_LABELS = {
  email: 'orgConsole.invitation.email',
  invite_role: 'orgConsole.invitation.assignRole',
};
const EMPTY_INVITE = { email: '', invite_role: 'member' };

const matchesTerm = (fields, term) =>
  fields.some(field => typeof field === 'string' && field.toLowerCase().includes(term));

const emptyTextFor = (t, query, key) => (query ? t('pages.noMatches') : t(key));

const TabSearch = ({ query, onQueryChange, placeholder, matched, total }) => {
  useNavbarSearchBinding({
    query,
    onQueryChange,
    placeholder,
    matched,
    total,
    groups: NO_FILTERS,
    onClearFilters: clearNothing,
  });
  return null;
};

TabSearch.propTypes = {
  query: PropTypes.string.isRequired,
  onQueryChange: PropTypes.func.isRequired,
  placeholder: PropTypes.string.isRequired,
  matched: PropTypes.number.isRequired,
  total: PropTypes.number.isRequired,
};

const OrgConsoleTabs = ({
  activeTab,
  setActiveTab,
  isExternalOrg,
  orgAccessMode,
  joinRequestCount,
  invitationsEnabled,
}) => {
  const { t } = useTranslation();
  const showJoinRequests = !isExternalOrg || orgAccessMode === 'request';
  const showInvitations = !isExternalOrg && invitationsEnabled;
  const tabs = [
    { key: 'organization', labelKey: 'orgConsole.tabs.organization', count: 0 },
    ...(showJoinRequests
      ? [{ key: 'joinRequests', labelKey: 'orgConsole.tabs.joinRequests', count: joinRequestCount }]
      : []),
    ...(showInvitations
      ? [{ key: 'invitations', labelKey: 'orgConsole.tabs.invitations', count: 0 }]
      : []),
  ];

  if (tabs.length < 2) {
    return null;
  }

  return (
    <ul className="nav nav-tabs">
      {tabs.map(tab => (
        <li key={tab.key} className="nav-item">
          <button
            type="button"
            className={`nav-link ${activeTab === tab.key ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {t(tab.labelKey)}
            {tab.count > 0 && <span className="badge bg-warning ms-2">{tab.count}</span>}
          </button>
        </li>
      ))}
    </ul>
  );
};

const visibleTab = (tab, isExternalOrg, orgAccessMode, invitationsEnabled) => {
  if (tab === 'invitations' && !invitationsEnabled) {
    return 'organization';
  }
  if (!isExternalOrg) {
    return tab;
  }
  if (tab === 'invitations') {
    return 'organization';
  }
  if (tab === 'joinRequests' && orgAccessMode !== 'request') {
    return 'organization';
  }
  return tab;
};

OrgConsoleTabs.propTypes = {
  activeTab: PropTypes.string.isRequired,
  setActiveTab: PropTypes.func.isRequired,
  isExternalOrg: PropTypes.bool.isRequired,
  orgAccessMode: PropTypes.string.isRequired,
  joinRequestCount: PropTypes.number.isRequired,
  invitationsEnabled: PropTypes.bool.isRequired,
};

const formatOrgAddress = address => {
  if (!address) {
    return '';
  }
  if (address.formatted) {
    return address.formatted;
  }
  return [
    address.streetAddress,
    address.locality,
    address.region,
    address.postalCode,
    address.country,
  ]
    .filter(Boolean)
    .join(', ');
};

const extractOrgDetailsState = orgDetails => ({
  name: orgDetails.name,
  isExternalOrg: !!orgDetails.external_issuer,
  idpLink:
    orgDetails.external_issuer && orgDetails.external_org_id
      ? `${orgDetails.external_issuer.replace(/\/+$/, '')}/user/organizations#${orgDetails.external_org_id}`
      : '',
  displayName: orgDetails.display_name || '',
  email: orgDetails.email || '',
  emailHash: orgDetails.email_hash || '',
  description: orgDetails.description || '',
  accessMode: orgDetails.access_mode || 'private',
  defaultRole: orgDetails.default_role || 'member',
  logo: orgDetails.logo || '',
  url: orgDetails.url || '',
  telephone: orgDetails.telephone || '',
  locale: orgDetails.locale || '',
  timezone: orgDetails.timezone || '',
  address: formatOrgAddress(orgDetails.address),
});

const profileValue = row => {
  if (row.link) {
    return (
      <a href={row.value} target="_blank" rel="noopener noreferrer">
        {row.value}
      </a>
    );
  }
  if (row.multiline) {
    return <span className="org-profile-multiline">{row.value}</span>;
  }
  return row.value;
};

const ACCESS_MODE_LABEL_KEYS = {
  private: 'orgConsole.organization.accessModes.private',
  invite: 'orgConsole.organization.accessModes.inviteOnly',
  request: 'orgConsole.organization.accessModes.requestToJoin',
};

const OrgProfileDisplay = ({
  orgName,
  orgDisplayName,
  orgLogo,
  orgEmail,
  orgDescription,
  orgUrl,
  orgTelephone,
  orgLocale,
  orgTimezone,
  orgAddress,
  orgAccessMode,
  orgDefaultRole,
  orgIdpLink,
}) => {
  const { t } = useTranslation();
  const isUnlisted = orgAccessMode === 'private';
  const rows = [
    { key: 'email', value: orgEmail },
    { key: 'url', value: orgUrl, link: true },
    { key: 'telephone', value: orgTelephone },
    { key: 'locale', value: orgLocale },
    { key: 'timezone', value: orgTimezone },
    { key: 'address', value: orgAddress, multiline: true },
    {
      key: 'accessMode',
      value: t(ACCESS_MODE_LABEL_KEYS[orgAccessMode] || 'unknown'),
    },
    { key: 'defaultRole', value: t(`roles.${orgDefaultRole}`) },
  ].filter(row => row.value);

  return (
    <div>
      <div className="d-flex align-items-center mb-3">
        {orgLogo ? (
          <img src={orgLogo} alt="" className="rounded-circle me-3 org-profile-logo" />
        ) : (
          <div className="rounded-circle bg-secondary d-flex align-items-center justify-content-center me-3 org-profile-logo">
            <FaBuilding className="text-white fs-3" />
          </div>
        )}
        <div>
          <h4 className="mb-0">{orgDisplayName || orgName}</h4>
          <small className="text-muted">/{orgName}</small>
          <div>
            <span className={`badge ${isUnlisted ? 'bg-secondary' : 'bg-success'} mt-1`}>
              {isUnlisted
                ? t('orgConsole.organization.unlisted')
                : t('orgConsole.organization.listed')}
            </span>
          </div>
        </div>
      </div>
      <MarkdownText text={orgDescription} />
      {rows.length > 0 && (
        <RecordRows
          rows={rows.map(row => ({
            key: row.key,
            label: t(`orgConsole.organization.${row.key}`),
            value: profileValue(row),
          }))}
        />
      )}
      {orgIdpLink && (
        <a href={orgIdpLink} target="_blank" rel="noopener noreferrer" className="btn btn-primary">
          <FaArrowUpRightFromSquare className="me-2" />
          {t('orgConsole.organization.manageAtIdp')}
        </a>
      )}
    </div>
  );
};

OrgProfileDisplay.propTypes = {
  orgName: PropTypes.string.isRequired,
  orgDisplayName: PropTypes.string.isRequired,
  orgLogo: PropTypes.string.isRequired,
  orgEmail: PropTypes.string.isRequired,
  orgDescription: PropTypes.string.isRequired,
  orgUrl: PropTypes.string.isRequired,
  orgTelephone: PropTypes.string.isRequired,
  orgLocale: PropTypes.string.isRequired,
  orgTimezone: PropTypes.string.isRequired,
  orgAddress: PropTypes.string.isRequired,
  orgAccessMode: PropTypes.string.isRequired,
  orgDefaultRole: PropTypes.string.isRequired,
  orgIdpLink: PropTypes.string.isRequired,
};

/**
 * The text the Link cell of an invitation shows: the invitation link's
 * text while the invitation carries a token, the provider link's while
 * the organization is managed there, else the managed-by-provider note.
 *
 * @param {Object} invitation - The invitation, its `token`
 * @param {string} orgIdpLink - The organization's provider link, empty for none
 * @param {Function} t - The translator
 * @returns {string} The cell's text
 */
const invitationLinkText = (invitation, orgIdpLink, t) => {
  if (invitation.token) {
    return t('orgConsole.invitation.linkText');
  }
  return orgIdpLink
    ? t('orgConsole.organization.manageAtIdp')
    : t('orgConsole.invitation.managedByIdp');
};

const InvitationLinkCell = ({ invitation, orgIdpLink }) => {
  const { t } = useTranslation();
  const text = invitationLinkText(invitation, orgIdpLink, t);

  if (invitation.token) {
    return (
      <a
        href={`${window.location.origin}/invite/${encodeURIComponent(invitation.token)}`}
        target="_blank"
        rel="noopener noreferrer"
      >
        {text}
      </a>
    );
  }

  if (orgIdpLink) {
    return (
      <a href={orgIdpLink} target="_blank" rel="noopener noreferrer">
        {text}
      </a>
    );
  }

  return <small className="text-body-secondary">{text}</small>;
};

InvitationLinkCell.propTypes = {
  invitation: PropTypes.shape({
    token: PropTypes.string,
  }).isRequired,
  orgIdpLink: PropTypes.string,
};

const INVITATION_COLUMNS = [
  {
    key: 'email',
    kind: 'name',
    labelKey: 'orgConsole.invitation.email',
    value: invitation => invitation.email,
  },
  {
    key: 'expires',
    kind: 'date',
    labelKey: 'orgConsole.invitation.expires',
    value: invitation => timeOf(invitation.expires),
    render: invitation => localeTime(invitation.expires),
  },
  {
    key: 'accepted',
    kind: 'word',
    labelKey: 'orgConsole.invitation.accepted',
    value: (invitation, ctx) => yesNo(invitation.accepted, ctx.t),
    render: (invitation, ctx) => (
      <>
        {yesNo(invitation.accepted, ctx.t)}
        {invitation.accepted_at ? (
          <small className="text-body-secondary d-block">
            {localeTime(invitation.accepted_at)}
          </small>
        ) : null}
      </>
    ),
  },
  {
    key: 'expired',
    kind: 'word',
    labelKey: 'orgConsole.invitation.expired',
    value: (invitation, ctx) => yesNo(invitation.expired, ctx.t),
  },
  {
    key: 'link',
    kind: 'link',
    labelKey: 'orgConsole.invitation.link',
    value: (invitation, ctx) => invitationLinkText(invitation, ctx.orgIdpLink, ctx.t),
    render: (invitation, ctx) => (
      <InvitationLinkCell invitation={invitation} orgIdpLink={ctx.orgIdpLink} />
    ),
  },
];

const JoinRequestActions = ({ request, onApprove, onDeny }) => {
  const { t } = useTranslation();
  return (
    <div className="btn-group" role="group">
      <button
        type="button"
        className="btn btn-success btn-sm"
        onClick={() => onApprove(request.id, 'member')}
      >
        {t('orgConsole.joinRequest.approveAsMember')}
      </button>
      <button
        type="button"
        className="btn btn-warning btn-sm"
        onClick={() => onApprove(request.id, 'admin')}
      >
        {t('orgConsole.joinRequest.approveAsAdmin')}
      </button>
      <button type="button" className="btn btn-danger btn-sm" onClick={() => onDeny(request.id)}>
        {t('orgConsole.joinRequest.deny')}
      </button>
    </div>
  );
};

JoinRequestActions.propTypes = {
  request: PropTypes.object.isRequired,
  onApprove: PropTypes.func.isRequired,
  onDeny: PropTypes.func.isRequired,
};

const InvitationActions = ({ invitation, onDelete }) => {
  const { t } = useTranslation();
  return (
    <button type="button" className="btn btn-danger btn-sm" onClick={() => onDelete(invitation)}>
      {t('orgConsole.buttons.delete')}
    </button>
  );
};

InvitationActions.propTypes = {
  invitation: PropTypes.object.isRequired,
  onDelete: PropTypes.func.isRequired,
};

const tablePrefsShape = PropTypes.shape({
  sort: PropTypes.array.isRequired,
  setSort: PropTypes.func.isRequired,
  hiddenColumns: PropTypes.instanceOf(Set).isRequired,
  widths: PropTypes.object.isRequired,
  setColumnWidth: PropTypes.func.isRequired,
});

/**
 * The Join requests tab's list: its `SectionHeading` and one `SubTable`
 * over the requests left by the navbar query, sorted by the header stack
 * of `prefs`, Approve as member, Approve as admin and Deny on every row,
 * each row registered with `rowRef`, the arrival's ref, so a hash naming a
 * request scrolls its row into view and focuses it.
 */
const JoinRequestsTab = ({ joinRequests, emptyText, prefs, onApprove, onDeny, rowRef }) => {
  const { t } = useTranslation();
  const ctx = { t };
  return (
    <>
      <SectionHeading title={t('orgConsole.joinRequest.title')} count={joinRequests.length} />
      <SubTable
        columns={JOIN_REQUEST_COLUMNS}
        rows={sortItems(joinRequests, prefs.sort, JOIN_REQUEST_COLUMNS, ctx)}
        rowKey={request => request.id}
        rowRef={rowRef}
        RowActions={JoinRequestActions}
        actionsProps={{ onApprove, onDeny }}
        rowProp="request"
        sort={prefs.sort}
        onSort={prefs.setSort}
        hiddenColumns={prefs.hiddenColumns}
        widths={prefs.widths}
        onResize={prefs.setColumnWidth}
        ctx={ctx}
        emptyText={emptyText}
      />
    </>
  );
};

JoinRequestsTab.propTypes = {
  joinRequests: PropTypes.array.isRequired,
  emptyText: PropTypes.string.isRequired,
  prefs: tablePrefsShape.isRequired,
  onApprove: PropTypes.func.isRequired,
  onDeny: PropTypes.func.isRequired,
  rowRef: PropTypes.func.isRequired,
};

/**
 * The active invitations as one `SubTable`, sorted by the header stack of
 * `prefs`, the link cell drawing the invitation link, the provider link or
 * the managed-by-provider note, and Delete on every row.
 */
const InvitationsTable = ({ invitations, emptyText, prefs, orgIdpLink, onDelete }) => {
  const { t } = useTranslation();
  const ctx = { t, orgIdpLink };
  return (
    <SubTable
      columns={INVITATION_COLUMNS}
      rows={sortItems(invitations, prefs.sort, INVITATION_COLUMNS, ctx)}
      rowKey={invitation => invitation.id}
      RowActions={InvitationActions}
      actionsProps={{ onDelete }}
      rowProp="invitation"
      sort={prefs.sort}
      onSort={prefs.setSort}
      hiddenColumns={prefs.hiddenColumns}
      widths={prefs.widths}
      onResize={prefs.setColumnWidth}
      ctx={ctx}
      emptyText={emptyText}
    />
  );
};

InvitationsTable.propTypes = {
  invitations: PropTypes.array.isRequired,
  emptyText: PropTypes.string.isRequired,
  prefs: tablePrefsShape.isRequired,
  orgIdpLink: PropTypes.string,
  onDelete: PropTypes.func.isRequired,
};

/**
 * The console of the active organization for its owners and admins:
 * Organization (the editable record and access mode of a local
 * organization, the read-only profile and the provider link of an
 * IdP-managed one, the members with role and removal controls), Join
 * requests (approve as member or admin, deny) and Invitations (send, list,
 * delete, when the host advertises `invitations`), no tab strip while the
 * tabs number one, the record form and the invitation form each a
 * `SectionCard` whose fold is kept under `table_prefs_org_console`, the
 * members, the join requests and the active invitations glass lists under
 * a `SectionHeading` (the pages contract's frame rule), the two lists
 * `SubTable`s whose sort and column widths persist under
 * `table_prefs_org_console_requests` and
 * `table_prefs_org_console_invitations`, a hash naming a join request
 * scrolling its row into view and focusing it once through `useArrival`,
 * each tab's list
 * searched from the navbar, every call through the app's `organizations`
 * adapter; `admin` is the app's global-admin flag,
 * and a rename makes the new name the active organization under
 * `activeOrgKey` and refreshes the session.
 */
const BackendOrgConsole = ({ session, activeOrgKey, organizations, org, admin, tab }) => {
  const { t } = useTranslation();
  const notify = useNotify();
  const status = useStatus();
  const invitationsEnabled = hasFeature(status, 'invitations');
  useEffect(() => {
    document.title = t('orgConsole.pageTitle');
  }, [t]);

  const [users, setUsers] = useState([]);
  const [orgForm, setOrgForm] = useState(EMPTY_ORG);
  const [loadedOrganization, setLoadedOrganization] = useState(null);
  const [inviteForm, setInviteForm] = useState(EMPTY_INVITE);
  const [activeInvitations, setActiveInvitations] = useState([]);
  const [joinRequests, setJoinRequests] = useState([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [orgEmailHash, setOrgEmailHash] = useState('');
  const [orgLogo, setOrgLogo] = useState('');
  const [orgUrl, setOrgUrl] = useState('');
  const [orgTelephone, setOrgTelephone] = useState('');
  const [orgLocale, setOrgLocale] = useState('');
  const [orgTimezone, setOrgTimezone] = useState('');
  const [orgAddress, setOrgAddress] = useState('');
  const [isExternalOrg, setIsExternalOrg] = useState(false);
  const [orgIdpLink, setOrgIdpLink] = useState('');
  const [orgDisplayName, setOrgDisplayName] = useState('');
  const [activeTab, setActiveTab] = useState(() => TAB_OF_SEGMENT[tab] || 'organization');
  const folds = useFolds(PREFS_KEY);
  const requestPrefs = useTablePrefs(
    REQUESTS_PREFS_KEY,
    JOIN_REQUEST_COLUMNS,
    REQUESTS_DEFAULT_SORT
  );
  const invitationPrefs = useTablePrefs(
    INVITATIONS_PREFS_KEY,
    INVITATION_COLUMNS,
    INVITATIONS_DEFAULT_SORT
  );
  const memberArrival = useArrival(users);
  const requestArrival = useArrival(joinRequests);
  const current = session.restore();
  const currentUser = current ? current.user : null;
  const canManageRoles = isOwner(membershipsOf(current), org, admin);
  const [searchTerm, setSearchTerm] = useState('');
  const loadedAccessRef = useRef({
    accessMode: 'private',
    defaultRole: 'member',
  });
  const orgRules = useFormRules({
    formKey: 'organization',
    schema: ORG_SCHEMA,
    values: orgForm,
    labels: ORG_LABELS,
  });
  const accessRules = useFormRules({
    formKey: 'accessMode',
    schema: ACCESS_SCHEMA,
    values: orgForm,
    labels: ACCESS_LABELS,
  });
  const inviteRules = useFormRules({
    formKey: 'invitation',
    schema: INVITE_SCHEMA,
    values: inviteForm,
    labels: INVITE_LABELS,
  });

  const setOrgField = (field, value) => setOrgForm(previous => ({ ...previous, [field]: value }));

  const loading = Boolean(org) && loadedOrganization !== org;

  useEffect(() => {
    if (!org) {
      return;
    }

    const loadData = async () => {
      const [orgUsersResult, invitationsResult, orgDetailsResult, joinRequestsResult] =
        await Promise.allSettled([
          organizations.users(org),
          organizations.invitations(org),
          organizations.get(org),
          organizations.requests(org),
        ]);

      const failures = [
        { name: 'orgUsers', result: orgUsersResult },
        { name: 'invitations', result: invitationsResult },
        { name: 'orgDetails', result: orgDetailsResult },
        { name: 'joinRequests', result: joinRequestsResult },
      ].filter(({ result }) => result.status === 'rejected');

      failures.forEach(({ name, result }) => {
        log.api.error('Error fetching org console data', {
          organization: org,
          call: name,
          error: result.reason?.message,
        });
      });

      if (orgUsersResult.status === 'fulfilled') {
        setUsers(orgUsersResult.value);
      }
      if (invitationsResult.status === 'fulfilled') {
        setActiveInvitations(invitationsResult.value);
      }
      if (joinRequestsResult.status === 'fulfilled') {
        setJoinRequests(joinRequestsResult.value || []);
      }
      if (orgDetailsResult.status === 'fulfilled') {
        const details = extractOrgDetailsState(orgDetailsResult.value);
        setOrgForm({
          organization: details.name,
          email: details.email,
          description: details.description,
          access_mode: details.accessMode,
          default_role: details.defaultRole,
        });
        setIsExternalOrg(details.isExternalOrg);
        setOrgIdpLink(details.idpLink);
        setOrgDisplayName(details.displayName);
        setOrgEmailHash(details.emailHash);
        loadedAccessRef.current = {
          accessMode: details.accessMode,
          defaultRole: details.defaultRole,
        };
        setOrgLogo(details.logo);
        setOrgUrl(details.url);
        setOrgTelephone(details.telephone);
        setOrgLocale(details.locale);
        setOrgTimezone(details.timezone);
        setOrgAddress(details.address);
      }

      setLoadedOrganization(org);
    };

    loadData();
  }, [org, organizations]);

  const reportUpdateFailure = (formRules, error) => {
    if (formRules.applyServerErrors(error)) {
      return;
    }
    log.component.error('Error updating organization', {
      organization: org,
      error: error.message,
    });
    notify('danger', t(error.messageKey || 'errors.request'));
  };

  const handleUpdateOrganization = async e => {
    e.preventDefault();
    if (![orgRules.validateAll(), accessRules.validateAll()].every(Boolean)) {
      return;
    }
    const {
      organization,
      email,
      description,
      access_mode: accessMode,
      default_role: defaultRole,
    } = orgForm;

    try {
      await organizations.update(org, { organization, email, description });
    } catch (error) {
      reportUpdateFailure(orgRules, error);
      return;
    }

    if (organization !== org) {
      localStorage.setItem(activeOrgKey, organization);
      await session.refresh();
    }

    const accessChanged =
      accessMode !== loadedAccessRef.current.accessMode ||
      defaultRole !== loadedAccessRef.current.defaultRole;
    if (!isExternalOrg && accessChanged) {
      try {
        await organizations.accessMode(organization, accessMode, defaultRole);
        loadedAccessRef.current = { accessMode, defaultRole };
      } catch (error) {
        reportUpdateFailure(accessRules, error);
        return;
      }
    }
    notify('success', t('orgConsole.orgUpdateSuccess'));
  };

  const handleSetOrgRole = (userId, newRole) => {
    organizations
      .memberRole(org, userId, newRole)
      .then(() => {
        setUsers(prevUsers =>
          prevUsers.map(user => (user.id === userId ? { ...user, org_role: newRole } : user))
        );
        notify('success', t('orgConsole.messages.operationSuccessful'));
      })
      .catch(error => {
        log.component.error('Error updating user org role', {
          userId,
          error: error.message,
        });
        notify('danger', t(error.messageKey || 'errors.request'));
      });
  };

  const handleRemoveUserFromOrg = userId => {
    setItemToDelete({ type: 'user_remove', id: userId });
    setShowDeleteModal(true);
  };

  const handleSendInvitation = async e => {
    e.preventDefault();
    if (!inviteRules.validateAll()) {
      return;
    }
    const { email, invite_role: inviteRole } = inviteForm;
    try {
      const sent = await organizations.invite({
        email,
        organization_name: org,
        invite_role: inviteRole,
      });
      const invitationDetails = `${t('orgConsole.invitation.sent')}
        ${t('orgConsole.invitation.token')}: ${sent.invitation_token}
        ${t('orgConsole.invitation.expires')}: ${new Date(sent.invitation_token_expires).toLocaleString()}
        ${t('orgConsole.invitation.orgId')}: ${sent.organization_id}
        ${t('orgConsole.invitation.link')}: ${sent.invitation_link}`;
      notify('success', <pre className="mb-0 small">{invitationDetails}</pre>, { sticky: true });
      setInviteForm(previous => ({ ...previous, email: '' }));
      inviteRules.reset();
    } catch (error) {
      if (inviteRules.applyServerErrors(error)) {
        return;
      }
      log.component.error('Error sending invitation', {
        email,
        organization: org,
        error: error.message,
      });
      notify('danger', t(error.messageKey || 'errors.request'));
    } finally {
      try {
        setActiveInvitations(await organizations.invitations(org));
      } catch (error) {
        log.component.error('Error refreshing invitations', {
          error: error.message,
        });
      }
    }
  };

  const handleDeleteClick = invitation => {
    setItemToDelete({ type: 'invitation', id: invitation.id });
    setShowDeleteModal(true);
  };

  const handleCloseDeleteModal = () => {
    setShowDeleteModal(false);
    setItemToDelete(null);
  };

  const handleConfirmDelete = () => {
    if (itemToDelete && itemToDelete.type === 'invitation') {
      organizations
        .removeInvitation(itemToDelete.id)
        .then(() => {
          setActiveInvitations(prevInvitations =>
            prevInvitations.filter(invitation => invitation.id !== itemToDelete.id)
          );
          handleCloseDeleteModal();
        })
        .catch(error => {
          log.component.error('Error deleting invitation', {
            invitationId: itemToDelete.id,
            error: error.message,
          });
          notify('danger', t(error.messageKey || 'errors.request'));
          handleCloseDeleteModal();
        });
    }

    if (itemToDelete && itemToDelete.type === 'user_remove') {
      organizations
        .removeMember(org, itemToDelete.id)
        .then(() => {
          setUsers(prevUsers => prevUsers.filter(user => user.id !== itemToDelete.id));
          notify('success', t('orgConsole.users.removeSuccess'));
          handleCloseDeleteModal();
        })
        .catch(error => {
          log.component.error('Error removing user from org', {
            userId: itemToDelete.id,
            organization: org,
            error: error.message,
          });
          notify('danger', t(error.messageKey || 'errors.request'));
          handleCloseDeleteModal();
        });
    }
  };

  const handleApproveJoinRequest = async (requestId, assignedRole = 'member') => {
    try {
      await organizations.approveRequest(org, requestId, assignedRole);
      notify('success', t('orgConsole.joinRequest.approved'));
      setJoinRequests((await organizations.requests(org)) || []);
    } catch (error) {
      log.component.error('Error approving join request', {
        requestId,
        error: error.message,
      });
      notify('danger', t(error.messageKey || 'errors.request'));
    }
  };

  const handleDenyJoinRequest = async requestId => {
    try {
      await organizations.denyRequest(org, requestId);
      notify('success', t('orgConsole.joinRequest.denied'));
      setJoinRequests((await organizations.requests(org)) || []);
    } catch (error) {
      log.component.error('Error denying join request', {
        requestId,
        error: error.message,
      });
      notify('danger', t(error.messageKey || 'errors.request'));
    }
  };

  const selectTab = next => {
    setSearchTerm('');
    setActiveTab(next);
  };

  const term = searchTerm.toLowerCase();
  const filteredUsers = users.filter(user =>
    matchesTerm([user.name, user.username, user.email], term)
  );
  const filteredJoinRequests = joinRequests.filter(request =>
    matchesTerm([request.user.username, request.user.email, request.message], term)
  );
  const filteredInvitations = activeInvitations.filter(invitation =>
    matchesTerm([invitation.email], term)
  );

  const canManageMembership = canManageRoles && !isExternalOrg;
  const currentTab = visibleTab(activeTab, isExternalOrg, orgForm.access_mode, invitationsEnabled);

  return (
    <div className="list row">
      <OrgConsoleTabs
        activeTab={currentTab}
        setActiveTab={selectTab}
        isExternalOrg={isExternalOrg}
        orgAccessMode={orgForm.access_mode}
        joinRequestCount={joinRequests.length}
        invitationsEnabled={invitationsEnabled}
      />

      {!loading && !org && (
        <div className="alert alert-warning mt-3" role="alert">
          {t('orgConsole.noActiveOrganization')}
        </div>
      )}

      {loading ? (
        <p>{t('loading')}</p>
      ) : (
        <div className="tab-content mt-3">
          {currentTab === 'organization' && (
            <div className="row">
              <div className="col-md-12">
                <SectionCard
                  title={t('orgConsole.organization.title')}
                  badge={
                    isExternalOrg ? (
                      <span
                        className="badge bg-info"
                        title={t('orgConsole.organization.ssoManagedHint')}
                      >
                        {t('orgConsole.organization.ssoManaged')}
                      </span>
                    ) : null
                  }
                  className="mb-4"
                  folded={folds.folded('organization')}
                  onFold={() => folds.toggle('organization')}
                >
                  {isExternalOrg && (
                    <>
                      <div className="alert alert-info" role="status">
                        {t('orgConsole.organization.ssoManagedHint')}
                      </div>
                      <OrgProfileDisplay
                        orgName={orgForm.organization}
                        orgDisplayName={orgDisplayName}
                        orgLogo={orgLogo}
                        orgEmail={orgForm.email}
                        orgDescription={orgForm.description}
                        orgUrl={orgUrl}
                        orgTelephone={orgTelephone}
                        orgLocale={orgLocale}
                        orgTimezone={orgTimezone}
                        orgAddress={orgAddress}
                        orgAccessMode={orgForm.access_mode}
                        orgDefaultRole={orgForm.default_role}
                        orgIdpLink={orgIdpLink}
                      />
                    </>
                  )}
                  {!isExternalOrg && (
                    <form onSubmit={handleUpdateOrganization} noValidate>
                      <FormErrorSummary errors={[...orgRules.summary, ...accessRules.summary]} />
                      <Field
                        id={orgRules.idFor('organization')}
                        label={t('orgConsole.organization.name')}
                        error={orgRules.errors.organization}
                      >
                        {aria => (
                          <input
                            {...aria}
                            type="text"
                            className="form-control"
                            value={orgForm.organization}
                            onChange={e => setOrgField('organization', e.target.value)}
                            onBlur={() => orgRules.onBlur('organization')}
                          />
                        )}
                      </Field>
                      <Field
                        id={orgRules.idFor('email')}
                        label={t('orgConsole.organization.email')}
                        error={orgRules.errors.email}
                      >
                        {aria => (
                          <input
                            {...aria}
                            type="email"
                            className="form-control"
                            value={orgForm.email}
                            onChange={e => setOrgField('email', e.target.value)}
                            onBlur={() => orgRules.onBlur('email')}
                          />
                        )}
                      </Field>
                      <div className="mb-3">
                        <label className="form-label" htmlFor="orgEmailHash">
                          {t('orgConsole.organization.emailHash')}
                        </label>
                        <input
                          type="text"
                          className="form-control"
                          id="orgEmailHash"
                          value={orgEmailHash}
                          readOnly
                        />
                        <div className="form-text">
                          {t('orgConsole.organization.emailHashHint')}
                        </div>
                      </div>
                      <Field
                        id={orgRules.idFor('description')}
                        label={t('orgConsole.organization.description')}
                        error={orgRules.errors.description}
                      >
                        {aria => (
                          <textarea
                            {...aria}
                            className="form-control"
                            value={orgForm.description}
                            onChange={e => setOrgField('description', e.target.value)}
                            onBlur={() => orgRules.onBlur('description')}
                          />
                        )}
                      </Field>

                      <div className="row">
                        <div className="col-md-6">
                          <Field
                            id={accessRules.idFor('access_mode')}
                            label={t('orgConsole.organization.accessMode')}
                            hint={t('orgConsole.organization.accessModeHint')}
                            error={accessRules.errors.access_mode}
                          >
                            {aria => (
                              <select
                                {...aria}
                                className="form-select"
                                value={orgForm.access_mode}
                                onChange={e => setOrgField('access_mode', e.target.value)}
                                onBlur={() => accessRules.onBlur('access_mode')}
                              >
                                <option value="private">
                                  {t('orgConsole.organization.accessModes.private')}
                                </option>
                                <option value="invite">
                                  {t('orgConsole.organization.accessModes.inviteOnly')}
                                </option>
                                <option value="request">
                                  {t('orgConsole.organization.accessModes.requestToJoin')}
                                </option>
                              </select>
                            )}
                          </Field>
                        </div>
                        <div className="col-md-6">
                          <Field
                            id={accessRules.idFor('default_role')}
                            label={t('orgConsole.organization.defaultRole')}
                            hint={t('orgConsole.organization.defaultRoleHint')}
                            error={accessRules.errors.default_role}
                          >
                            {aria => (
                              <select
                                {...aria}
                                className="form-select"
                                value={orgForm.default_role}
                                onChange={e => setOrgField('default_role', e.target.value)}
                                onBlur={() => accessRules.onBlur('default_role')}
                              >
                                <option value="member">{t('roles.member')}</option>
                                <option value="admin">{t('roles.admin')}</option>
                                <option value="guest">{t('roles.guest')}</option>
                              </select>
                            )}
                          </Field>
                        </div>
                      </div>

                      <button type="submit" className="btn btn-primary mt-2">
                        {t('orgConsole.organization.updateButton')}
                      </button>
                    </form>
                  )}
                </SectionCard>
              </div>
              <div className="col-md-12 mb-4">
                <SectionHeading
                  title={t('orgConsole.users.title', {
                    organization: org,
                  })}
                  count={users.length}
                />
                <TabSearch
                  query={searchTerm}
                  onQueryChange={setSearchTerm}
                  placeholder={t('search.open')}
                  matched={filteredUsers.length}
                  total={users.length}
                />
                <div className="row">
                  {filteredUsers.map(user => (
                    <UserCard
                      key={user.id}
                      user={user}
                      currentUser={currentUser}
                      orgRole={user.org_role}
                      rowRef={memberArrival.ref(user.id)}
                      gravatarProfile={organizations.gravatarProfile}
                      onChangeRole={
                        canManageMembership
                          ? newRole => handleSetOrgRole(user.id, newRole)
                          : undefined
                      }
                      onRemoveFromOrg={
                        canManageMembership ? () => handleRemoveUserFromOrg(user.id) : undefined
                      }
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {currentTab === 'joinRequests' && (
            <>
              <TabSearch
                query={searchTerm}
                onQueryChange={setSearchTerm}
                placeholder={t('orgConsole.search.joinRequests')}
                matched={filteredJoinRequests.length}
                total={joinRequests.length}
              />
              <JoinRequestsTab
                joinRequests={filteredJoinRequests}
                emptyText={emptyTextFor(t, searchTerm, 'orgConsole.joinRequest.noRequests')}
                prefs={requestPrefs}
                onApprove={handleApproveJoinRequest}
                onDeny={handleDenyJoinRequest}
                rowRef={requestArrival.ref}
              />
            </>
          )}

          {currentTab === 'invitations' && (
            <>
              <TabSearch
                query={searchTerm}
                onQueryChange={setSearchTerm}
                placeholder={t('orgConsole.search.invitations')}
                matched={filteredInvitations.length}
                total={activeInvitations.length}
              />
              <SectionCard
                title={t('orgConsole.invitation.sendTitle')}
                className="mb-4"
                folded={folds.folded('invite')}
                onFold={() => folds.toggle('invite')}
              >
                <form onSubmit={handleSendInvitation} noValidate>
                  <FormErrorSummary errors={inviteRules.summary} />
                  <div className="row">
                    <div className="col-md-8">
                      <Field
                        id={inviteRules.idFor('email')}
                        label={t('orgConsole.invitation.email')}
                        error={inviteRules.errors.email}
                      >
                        {aria => (
                          <input
                            {...aria}
                            type="email"
                            className="form-control"
                            value={inviteForm.email}
                            onChange={e =>
                              setInviteForm(previous => ({ ...previous, email: e.target.value }))
                            }
                            onBlur={() => inviteRules.onBlur('email')}
                          />
                        )}
                      </Field>
                    </div>
                    <div className="col-md-4">
                      <Field
                        id={inviteRules.idFor('invite_role')}
                        label={t('orgConsole.invitation.assignRole')}
                        error={inviteRules.errors.invite_role}
                      >
                        {aria => (
                          <select
                            {...aria}
                            className="form-select"
                            value={inviteForm.invite_role}
                            onChange={e =>
                              setInviteForm(previous => ({
                                ...previous,
                                invite_role: e.target.value,
                              }))
                            }
                            onBlur={() => inviteRules.onBlur('invite_role')}
                          >
                            <option value="guest">{t('roles.guest')}</option>
                            <option value="member">{t('roles.member')}</option>
                            {canManageRoles && <option value="admin">{t('roles.admin')}</option>}
                          </select>
                        )}
                      </Field>
                    </div>
                  </div>
                  <button type="submit" className="btn btn-primary mt-2">
                    {t('orgConsole.invitation.sendButton')}
                  </button>
                </form>
              </SectionCard>
              <SectionHeading
                title={t('orgConsole.invitation.activeTitle')}
                count={activeInvitations.length}
              />
              <InvitationsTable
                invitations={filteredInvitations}
                emptyText={emptyTextFor(t, searchTerm, 'orgConsole.invitation.noActive')}
                prefs={invitationPrefs}
                orgIdpLink={orgIdpLink}
                onDelete={handleDeleteClick}
              />
            </>
          )}
        </div>
      )}

      <ConfirmModal
        show={showDeleteModal}
        handleClose={handleCloseDeleteModal}
        handleConfirm={handleConfirmDelete}
        title={
          itemToDelete?.type === 'user_remove' ? t('orgConsole.buttons.removeFromOrg') : undefined
        }
        message={
          itemToDelete?.type === 'user_remove'
            ? t('pages.confirm.message', { keyword: t('pages.confirm.keyword') })
            : undefined
        }
      />
    </div>
  );
};

BackendOrgConsole.propTypes = {
  session: PropTypes.object.isRequired,
  activeOrgKey: PropTypes.string.isRequired,
  organizations: organizationsShape.isRequired,
  org: PropTypes.string.isRequired,
  admin: PropTypes.bool.isRequired,
  tab: PropTypes.string.isRequired,
};

/**
 * The organization console of the active organization: the identity
 * provider's form over one membership record while the `organizations`
 * adapter carries `list` (the issuer's fields, the flags `can_manage`,
 * `can_rename` and `is_owner` gating every control, `events` and
 * `places` handed through), else the shared console of an app with
 * organizations of its own, unchanged.
 */
const OrgConsolePage = ({
  session,
  activeOrgKey,
  organizations,
  org,
  admin,
  events = null,
  places = null,
  tab = '',
}) => {
  if (organizations.list && events) {
    return (
      <IssuerOrgConsole
        session={session}
        events={events}
        organizations={organizations}
        org={org}
        activeOrgKey={activeOrgKey}
        places={places}
      />
    );
  }
  return (
    <BackendOrgConsole
      session={session}
      activeOrgKey={activeOrgKey}
      organizations={organizations}
      org={org}
      admin={admin}
      tab={tab}
    />
  );
};

OrgConsolePage.propTypes = {
  session: PropTypes.object.isRequired,
  activeOrgKey: PropTypes.string.isRequired,
  organizations: PropTypes.oneOfType([organizationsShape, issuerOrganizationsShape]).isRequired,
  org: PropTypes.string.isRequired,
  admin: PropTypes.bool.isRequired,
  events: PropTypes.shape({ emit: PropTypes.func.isRequired }),
  places: PropTypes.func,
  tab: PropTypes.oneOf(['', ...ORG_CONSOLE_SEGMENTS]),
};

export default OrgConsolePage;
