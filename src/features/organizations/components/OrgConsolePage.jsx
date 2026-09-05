import PropTypes from 'prop-types';
import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { FaArrowUpRightFromSquare, FaBuilding } from 'react-icons/fa6';

import ConfirmModal from '../../../components/common/ConfirmModal';
import Field from '../../../components/common/Field';
import FormErrorSummary from '../../../components/common/FormErrorSummary';
import UserCard from '../../../components/common/UserCard';
import { useNotify } from '../../../contexts/NoticeContext';
import { useStatus } from '../../../contexts/StatusContext';
import { useFormRules } from '../../../hooks/useFormRules';
import { useNavbarSearchBinding } from '../../../hooks/useSearchBinding';
import { log } from '../../../lib/logger';
import { hasFeature } from '../../../utils/capabilities';
import { isOwner } from '../../../utils/membership';
import { membershipsOf, organizationsShape } from '../../../utils/organizations';
import { responseMessage } from '../../../utils/responseMessage';

const NO_FILTERS = [];
const clearNothing = () => undefined;

const ORG_SCHEMA = {
  required: ['organization', 'email'],
  properties: {
    organization: { type: 'string' },
    email: { type: 'string' },
    description: { type: 'string' },
    accessMode: { type: 'string' },
    defaultRole: { type: 'string' },
  },
};
const ORG_LABELS = {
  organization: 'orgConsole.organization.name',
  email: 'orgConsole.organization.email',
  description: 'orgConsole.organization.description',
  accessMode: 'orgConsole.organization.accessMode',
  defaultRole: 'orgConsole.organization.defaultRole',
};
const EMPTY_ORG = {
  organization: '',
  email: '',
  description: '',
  accessMode: 'private',
  defaultRole: 'member',
};
const INVITE_SCHEMA = {
  required: ['email'],
  properties: { email: { type: 'string' }, inviteRole: { type: 'string' } },
};
const INVITE_LABELS = {
  email: 'orgConsole.invitation.email',
  inviteRole: 'orgConsole.invitation.assignRole',
};
const EMPTY_INVITE = { email: '', inviteRole: 'member' };

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
  const showJoinRequests = !isExternalOrg || orgAccessMode === 'request_to_join';
  const showInvitations = !isExternalOrg && invitationsEnabled;

  return (
    <ul className="nav nav-tabs">
      <li className="nav-item">
        <button
          type="button"
          className={`nav-link ${activeTab === 'organization' ? 'active' : ''}`}
          onClick={() => setActiveTab('organization')}
        >
          {t('orgConsole.tabs.organization')}
        </button>
      </li>
      {showJoinRequests && (
        <li className="nav-item">
          <button
            type="button"
            className={`nav-link ${activeTab === 'joinRequests' ? 'active' : ''}`}
            onClick={() => setActiveTab('joinRequests')}
          >
            {t('orgConsole.tabs.joinRequests')}
            {joinRequestCount > 0 && (
              <span className="badge bg-warning ms-2">{joinRequestCount}</span>
            )}
          </button>
        </li>
      )}
      {showInvitations && (
        <li className="nav-item">
          <button
            type="button"
            className={`nav-link ${activeTab === 'invitations' ? 'active' : ''}`}
            onClick={() => setActiveTab('invitations')}
          >
            {t('orgConsole.tabs.invitations')}
          </button>
        </li>
      )}
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
  if (tab === 'joinRequests' && orgAccessMode !== 'request_to_join') {
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
  emailHash: orgDetails.emailHash || '',
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

const OrgProfileRow = ({ row }) => {
  const { t } = useTranslation();

  return (
    <div className="row mb-1">
      <dt className="col-sm-3">{t(`orgConsole.organization.${row.key}`)}</dt>
      <dd className="col-sm-9 mb-1" style={row.multiline ? { whiteSpace: 'pre-line' } : undefined}>
        {row.link ? (
          <a href={row.value} target="_blank" rel="noopener noreferrer">
            {row.value}
          </a>
        ) : (
          row.value
        )}
      </dd>
    </div>
  );
};

OrgProfileRow.propTypes = {
  row: PropTypes.shape({
    key: PropTypes.string.isRequired,
    value: PropTypes.string.isRequired,
    link: PropTypes.bool,
    multiline: PropTypes.bool,
  }).isRequired,
};

const ACCESS_MODE_LABEL_KEYS = {
  private: 'orgConsole.organization.accessModes.private',
  invite_only: 'orgConsole.organization.accessModes.inviteOnly',
  request_to_join: 'orgConsole.organization.accessModes.requestToJoin',
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
          <img
            src={orgLogo}
            alt=""
            className="rounded-circle me-3"
            style={{ width: 64, height: 64, objectFit: 'cover' }}
          />
        ) : (
          <div
            className="rounded-circle bg-secondary d-flex align-items-center justify-content-center me-3"
            style={{ width: 64, height: 64 }}
          >
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
      {orgDescription && <p>{orgDescription}</p>}
      {rows.length > 0 && (
        <dl className="mb-3">
          {rows.map(row => (
            <OrgProfileRow key={row.key} row={row} />
          ))}
        </dl>
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

const InvitationLinkCell = ({ invitation, orgIdpLink }) => {
  const { t } = useTranslation();

  if (invitation.token) {
    return (
      <a
        href={`${window.location.origin}/invite/${encodeURIComponent(invitation.token)}`}
        target="_blank"
        rel="noopener noreferrer"
      >
        {t('orgConsole.invitation.linkText')}
      </a>
    );
  }

  if (orgIdpLink) {
    return (
      <a href={orgIdpLink} target="_blank" rel="noopener noreferrer">
        {t('orgConsole.organization.manageAtIdp')}
      </a>
    );
  }

  return <small className="text-body-secondary">{t('orgConsole.invitation.managedByIdp')}</small>;
};

InvitationLinkCell.propTypes = {
  invitation: PropTypes.shape({
    token: PropTypes.string,
  }).isRequired,
  orgIdpLink: PropTypes.string,
};

const JoinRequestsTab = ({ joinRequests, emptyText, onApprove, onDeny }) => {
  const { t } = useTranslation();

  return (
    <div className="card">
      <div className="card-header">
        <h4>{t('orgConsole.joinRequest.title')}</h4>
      </div>
      <div className="card-body">
        {joinRequests.length === 0 ? (
          <div className="alert alert-info">{emptyText}</div>
        ) : (
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>{t('orgConsole.joinRequest.user')}</th>
                  <th>{t('orgConsole.joinRequest.email')}</th>
                  <th>{t('orgConsole.joinRequest.message')}</th>
                  <th>{t('orgConsole.joinRequest.requested')}</th>
                  <th>{t('orgConsole.joinRequest.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {joinRequests.map(request => (
                  <tr key={request.id}>
                    <td>
                      <strong>{request.user.username}</strong>
                    </td>
                    <td>{request.user.email}</td>
                    <td>{request.message || t('orgConsole.joinRequest.noMessage')}</td>
                    <td>{new Date(request.created_at).toLocaleDateString()}</td>
                    <td>
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
                        <button
                          type="button"
                          className="btn btn-danger btn-sm"
                          onClick={() => onDeny(request.id)}
                        >
                          {t('orgConsole.joinRequest.deny')}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

JoinRequestsTab.propTypes = {
  joinRequests: PropTypes.array.isRequired,
  emptyText: PropTypes.string.isRequired,
  onApprove: PropTypes.func.isRequired,
  onDeny: PropTypes.func.isRequired,
};

const InvitationsTable = ({ invitations, emptyText, orgIdpLink, onDelete }) => {
  const { t } = useTranslation();

  if (invitations.length === 0) {
    return <div className="alert alert-info">{emptyText}</div>;
  }

  return (
    <div className="table-responsive">
      <table className="table">
        <thead>
          <tr>
            <th>{t('orgConsole.invitation.email')}</th>
            <th>{t('orgConsole.invitation.expires')}</th>
            <th>{t('orgConsole.invitation.accepted')}</th>
            <th>{t('orgConsole.invitation.expired')}</th>
            <th>{t('orgConsole.invitation.link')}</th>
            <th>{t('orgConsole.invitation.actions')}</th>
          </tr>
        </thead>
        <tbody>
          {invitations.map(invitation => (
            <tr key={invitation.id}>
              <td>{invitation.email}</td>
              <td>{new Date(invitation.expires).toLocaleString()}</td>
              <td>
                {invitation.accepted ? t('yes') : t('no')}
                {invitation.accepted_at && (
                  <small className="text-body-secondary d-block">
                    {new Date(invitation.accepted_at).toLocaleString()}
                  </small>
                )}
              </td>
              <td>{invitation.expired ? t('yes') : t('no')}</td>
              <td>
                <InvitationLinkCell invitation={invitation} orgIdpLink={orgIdpLink} />
              </td>
              <td>
                <button
                  type="button"
                  className="btn btn-danger btn-sm"
                  onClick={() => onDelete(invitation)}
                >
                  {t('orgConsole.buttons.delete')}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

InvitationsTable.propTypes = {
  invitations: PropTypes.array.isRequired,
  emptyText: PropTypes.string.isRequired,
  orgIdpLink: PropTypes.string,
  onDelete: PropTypes.func.isRequired,
};

/**
 * The console of the active organization for its owners and admins:
 * Organization (the editable record and access mode of a local
 * organization, the read-only profile and the provider link of an
 * IdP-managed one, the members with role and removal controls), Join
 * requests (approve as member or admin, deny) and Invitations (send, list,
 * delete, when the host advertises `invitations`), each tab's list
 * searched from the navbar, every call through the app's `organizations`
 * adapter; `admin` is the app's global-admin flag,
 * and a rename makes the new name the active organization under
 * `activeOrgKey` and refreshes the session.
 */
const OrgConsolePage = ({ session, activeOrgKey, organizations, org, admin }) => {
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
  const [activeTab, setActiveTab] = useState('organization');
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
          accessMode: details.accessMode,
          defaultRole: details.defaultRole,
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

  const handleUpdateOrganization = async e => {
    e.preventDefault();
    if (!orgRules.validateAll()) {
      return;
    }
    const { organization, email, description, accessMode, defaultRole } = orgForm;

    try {
      await organizations.update(org, { organization, email, description });

      if (organization !== org) {
        localStorage.setItem(activeOrgKey, organization);
        await session.refresh();
      }

      const accessChanged =
        accessMode !== loadedAccessRef.current.accessMode ||
        defaultRole !== loadedAccessRef.current.defaultRole;
      if (!isExternalOrg && accessChanged) {
        await organizations.accessMode(organization, accessMode, defaultRole);
        loadedAccessRef.current = { accessMode, defaultRole };
      }
      notify('success', t('orgConsole.orgUpdateSuccess'));
    } catch (error) {
      if (orgRules.applyServerErrors(error)) {
        return;
      }
      log.component.error('Error updating organization', {
        organization: org,
        error: error.message,
      });
      notify('danger', t('orgConsole.orgUpdateError'));
    }
  };

  const handleSetOrgRole = (userId, newRole) => {
    organizations
      .memberRole(org, userId, newRole)
      .then(() => {
        setUsers(prevUsers =>
          prevUsers.map(user => (user.id === userId ? { ...user, orgRole: newRole } : user))
        );
        notify('success', t('orgConsole.messages.operationSuccessful'));
      })
      .catch(error => {
        log.component.error('Error updating user org role', {
          userId,
          error: error.message,
        });
        notify('danger', t('orgConsole.messages.operationFailed'));
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
    const { email, inviteRole } = inviteForm;
    try {
      const sent = await organizations.invite({
        email,
        organizationName: org,
        inviteRole,
      });
      const invitationDetails = `${t('orgConsole.invitation.sent')}
        ${t('orgConsole.invitation.token')}: ${sent.invitationToken}
        ${t('orgConsole.invitation.expires')}: ${new Date(sent.invitationTokenExpires).toLocaleString()}
        ${t('orgConsole.invitation.orgId')}: ${sent.organizationId}
        ${t('orgConsole.invitation.link')}: ${sent.invitationLink}`;
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
      notify('danger', responseMessage(error, t('orgConsole.invitation.sendWarning')));
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
          notify('danger', t('orgConsole.messages.deleteFailed'));
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
          notify('danger', t('orgConsole.users.removeError'));
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
      notify('danger', t('orgConsole.joinRequest.approveError', { error: error.message }));
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
      notify('danger', t('orgConsole.joinRequest.denyError', { error: error.message }));
    }
  };

  const selectTab = tab => {
    setSearchTerm('');
    setActiveTab(tab);
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
  const currentTab = visibleTab(activeTab, isExternalOrg, orgForm.accessMode, invitationsEnabled);

  return (
    <div className="list row">
      <header>
        <h3 className="text-center">{t('orgConsole.title')}</h3>
      </header>

      <OrgConsoleTabs
        activeTab={currentTab}
        setActiveTab={selectTab}
        isExternalOrg={isExternalOrg}
        orgAccessMode={orgForm.accessMode}
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
              <div className="col-md-12 mb-4">
                <div className="card mt-2 mb-2">
                  <div className="card-header">
                    <h4>
                      {t('orgConsole.organization.title')}
                      {isExternalOrg && (
                        <span
                          className="badge bg-info ms-2"
                          title={t('orgConsole.organization.ssoManagedHint')}
                        >
                          {t('orgConsole.organization.ssoManaged')}
                        </span>
                      )}
                    </h4>
                  </div>
                  <div className="card-body">
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
                          orgAccessMode={orgForm.accessMode}
                          orgDefaultRole={orgForm.defaultRole}
                          orgIdpLink={orgIdpLink}
                        />
                      </>
                    )}
                    {!isExternalOrg && (
                      <form onSubmit={handleUpdateOrganization} noValidate>
                        <FormErrorSummary errors={orgRules.summary} />
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
                              id={orgRules.idFor('accessMode')}
                              label={t('orgConsole.organization.accessMode')}
                              hint={t('orgConsole.organization.accessModeHint')}
                              error={orgRules.errors.accessMode}
                            >
                              {aria => (
                                <select
                                  {...aria}
                                  className="form-select"
                                  value={orgForm.accessMode}
                                  onChange={e => setOrgField('accessMode', e.target.value)}
                                  onBlur={() => orgRules.onBlur('accessMode')}
                                >
                                  <option value="private">
                                    {t('orgConsole.organization.accessModes.private')}
                                  </option>
                                  <option value="invite_only">
                                    {t('orgConsole.organization.accessModes.inviteOnly')}
                                  </option>
                                  <option value="request_to_join">
                                    {t('orgConsole.organization.accessModes.requestToJoin')}
                                  </option>
                                </select>
                              )}
                            </Field>
                          </div>
                          <div className="col-md-6">
                            <Field
                              id={orgRules.idFor('defaultRole')}
                              label={t('orgConsole.organization.defaultRole')}
                              hint={t('orgConsole.organization.defaultRoleHint')}
                              error={orgRules.errors.defaultRole}
                            >
                              {aria => (
                                <select
                                  {...aria}
                                  className="form-select"
                                  value={orgForm.defaultRole}
                                  onChange={e => setOrgField('defaultRole', e.target.value)}
                                  onBlur={() => orgRules.onBlur('defaultRole')}
                                >
                                  <option value="member">{t('roles.member')}</option>
                                  <option value="admin">{t('roles.admin')}</option>
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
                  </div>
                </div>
              </div>
              <div className="col-md-12 mb-4">
                <div className="card mt-2 mb-2">
                  <div className="card-header">
                    <h4>
                      {t('orgConsole.users.title', {
                        organization: org,
                      })}
                    </h4>
                  </div>
                  <div className="card-body">
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
                          orgRole={user.orgRole}
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
                onApprove={handleApproveJoinRequest}
                onDeny={handleDenyJoinRequest}
              />
            </>
          )}

          {currentTab === 'invitations' && (
            <div className="card">
              <TabSearch
                query={searchTerm}
                onQueryChange={setSearchTerm}
                placeholder={t('orgConsole.search.invitations')}
                matched={filteredInvitations.length}
                total={activeInvitations.length}
              />
              <div className="card-header">
                <div className="d-flex justify-content-between align-items-center">
                  <h4>{t('orgConsole.invitation.manageTitle')}</h4>
                </div>
              </div>
              <div className="card-body">
                <div className="mb-4">
                  <h5>{t('orgConsole.invitation.sendTitle')}</h5>
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
                          id={inviteRules.idFor('inviteRole')}
                          label={t('orgConsole.invitation.assignRole')}
                          error={inviteRules.errors.inviteRole}
                        >
                          {aria => (
                            <select
                              {...aria}
                              className="form-select"
                              value={inviteForm.inviteRole}
                              onChange={e =>
                                setInviteForm(previous => ({
                                  ...previous,
                                  inviteRole: e.target.value,
                                }))
                              }
                              onBlur={() => inviteRules.onBlur('inviteRole')}
                            >
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
                </div>

                <h5>{t('orgConsole.invitation.activeTitle')}</h5>
                <InvitationsTable
                  invitations={filteredInvitations}
                  emptyText={emptyTextFor(t, searchTerm, 'orgConsole.invitation.noActive')}
                  orgIdpLink={orgIdpLink}
                  onDelete={handleDeleteClick}
                />
              </div>
            </div>
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

OrgConsolePage.propTypes = {
  session: PropTypes.object.isRequired,
  activeOrgKey: PropTypes.string.isRequired,
  organizations: organizationsShape.isRequired,
  org: PropTypes.string.isRequired,
  admin: PropTypes.bool.isRequired,
};

export default OrgConsolePage;
