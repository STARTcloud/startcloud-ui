import PropTypes from 'prop-types';
import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';

import Avatar from '../../../components/common/Avatar';
import ConfirmModal from '../../../components/common/ConfirmModal';
import Field from '../../../components/common/Field';
import FormErrorSummary from '../../../components/common/FormErrorSummary';
import { useNotify } from '../../../contexts/NoticeContext';
import { useFormRules } from '../../../hooks/useFormRules';
import { useNavbarSearchBinding } from '../../../hooks/useSearchBinding';
import { log } from '../../../lib/logger';
import { returnToShape } from '../../../utils/auth';
import { responseMessage } from '../../../utils/responseMessage';

import ProfileTabs from './ProfileTabs';

/**
 * The app's side of the shared profile page: the calls behind the display
 * name, password, email, verification, memberships, join requests and
 * service accounts of the signed-in account.
 */
export const accountShape = PropTypes.shape({
  gravatarProfile: PropTypes.func.isRequired,
  changePassword: PropTypes.func.isRequired,
  changeEmail: PropTypes.func.isRequired,
  changeName: PropTypes.func.isRequired,
  remove: PropTypes.func.isRequired,
  verifyMail: PropTypes.func.isRequired,
  resendVerification: PropTypes.func.isRequired,
  organizations: PropTypes.func.isRequired,
  leave: PropTypes.func.isRequired,
  setPrimary: PropTypes.func.isRequired,
  requests: PropTypes.func.isRequired,
  cancelRequest: PropTypes.func.isRequired,
  serviceAccounts: PropTypes.shape({
    list: PropTypes.func.isRequired,
    organizations: PropTypes.func.isRequired,
    create: PropTypes.func.isRequired,
    remove: PropTypes.func.isRequired,
  }).isRequired,
});

const isAbort = error => error?.name?.includes('Cancel') || error?.name?.includes('Abort');

const ROLE_CLASSES = { owner: 'bg-danger', admin: 'bg-warning' };

const NO_FILTERS = [];
const clearNothing = () => undefined;

const SEARCH_PLACEHOLDER_KEYS = {
  organizations: 'profile.search.organizations',
  serviceAccounts: 'profile.search.serviceAccounts',
};

const includesTerm = (term, ...fields) =>
  !term || fields.some(field => typeof field === 'string' && field.toLowerCase().includes(term));

const PageSearch = ({ query, onQueryChange, placeholder, matched, total }) => {
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

PageSearch.propTypes = {
  query: PropTypes.string.isRequired,
  onQueryChange: PropTypes.func.isRequired,
  placeholder: PropTypes.string.isRequired,
  matched: PropTypes.number.isRequired,
  total: PropTypes.number.isRequired,
};

const NAME_SCHEMA = { properties: { name: { type: 'string' } } };
const NAME_LABELS = { name: 'profile.fields.displayName' };
const PASSWORD_SCHEMA = {
  required: ['newPassword', 'confirmPassword'],
  properties: {
    newPassword: { type: 'string' },
    confirmPassword: { type: 'string', equals: 'newPassword' },
  },
};
const PASSWORD_LABELS = {
  newPassword: 'profile.security.changePassword.newPasswordPlaceholder',
  confirmPassword: 'profile.security.changePassword.confirmPasswordPlaceholder',
};
const EMAIL_SCHEMA = {
  required: ['newEmail'],
  properties: { newEmail: { type: 'string' } },
};
const EMAIL_LABELS = { newEmail: 'profile.security.changeEmail.newEmailPlaceholder' };
const SERVICE_ACCOUNT_SCHEMA = {
  required: ['organization', 'description'],
  properties: {
    organization: { type: 'string' },
    description: { type: 'string' },
    expirationDays: { type: 'integer' },
  },
};
const SERVICE_ACCOUNT_LABELS = {
  organization: 'profile.serviceAccounts.organization',
  description: 'profile.serviceAccounts.descriptionPlaceholder',
  expirationDays: 'profile.serviceAccounts.expires',
};
const EMPTY_PASSWORD = { newPassword: '', confirmPassword: '' };
const EMPTY_EMAIL = { newEmail: '' };
const EXPIRATIONS = [30, 60, 90, 365];

const userOf = current => current?.user || null;

const nameOf = user => user?.name || '';

const groupByOrganization = (accounts, unknownLabel) => {
  const groups = new Map();
  accounts.forEach(entry => {
    const name = entry.organization?.name || unknownLabel;
    if (!groups.has(name)) {
      groups.set(name, { name, accounts: [] });
    }
    groups.get(name).accounts.push(entry);
  });
  return [...groups.values()].sort((a, b) => a.name.localeCompare(b.name));
};

const tabsFor = ({ showSecurity, oidc, issuerUrl }) => {
  const tabs = [
    { key: 'profile', labelKey: 'profile.tabs.profile' },
    { key: 'organizations', labelKey: 'profile.tabs.organizations' },
  ];
  if (showSecurity) {
    tabs.push({ key: 'security', labelKey: 'profile.tabs.security' });
  }
  if (oidc && issuerUrl) {
    tabs.push({
      key: 'manageAtIdp',
      labelKey: 'profile.manageAtIdp',
      href: `${issuerUrl}/user/profile`,
    });
  }
  tabs.push({ key: 'serviceAccounts', labelKey: 'profile.tabs.serviceAccounts' });
  return tabs;
};

/**
 * The profile page every estate app with accounts of its own draws the same
 * way: the avatar card with the verification notice, then Profile (display
 * name and the Gravatar facts), Organizations (memberships, make primary,
 * leave, pending join requests), Security (password, email, delete account,
 * only while the host advertises `local-accounts` and the account is not
 * signed in through the identity provider, whose accounts get a link to
 * manage themselves at the provider instead) and Service accounts
 * (create, the one-time token, select and delete), the Organizations and
 * Service accounts lists searched from the navbar, every call through the
 * app's `account` adapter and the session's own `reload` and
 * `signOutEverywhere`.
 */
const ProfilePage = ({
  session,
  events,
  returnTo,
  account,
  activeOrgUuid,
  localAccounts,
  issuerUrl,
}) => {
  const { t } = useTranslation();
  const notify = useNotify();
  useEffect(() => {
    document.title = t('profile.pageTitle');
  }, [t]);

  const [current, setCurrent] = useState(() => session.restore());
  const currentUser = userOf(current);
  const oidc = Boolean(current?.oidc);
  const showSecurity = localAccounts && !oidc;
  const tabs = tabsFor({ showSecurity, oidc, issuerUrl });
  const [gravatarProfile, setGravatarProfile] = useState({});
  const [passwordForm, setPasswordForm] = useState(EMPTY_PASSWORD);
  const [emailForm, setEmailForm] = useState(EMPTY_EMAIL);
  const [nameForm, setNameForm] = useState(() => ({ name: nameOf(currentUser) }));
  const [activeTab, setActiveTab] = useState('profile');
  const [searchTerm, setSearchTerm] = useState('');
  const [serviceAccounts, setServiceAccounts] = useState([]);
  const [serviceAccountOrgs, setServiceAccountOrgs] = useState([]);
  const [serviceAccountForm, setServiceAccountForm] = useState(() => ({
    organization: activeOrgUuid,
    description: '',
    expirationDays: 30,
  }));
  const [newServiceAccountToken, setNewServiceAccountToken] = useState(null);
  const nameRules = useFormRules({
    formKey: 'displayName',
    schema: NAME_SCHEMA,
    values: nameForm,
    labels: NAME_LABELS,
  });
  const passwordRules = useFormRules({
    formKey: 'password',
    schema: PASSWORD_SCHEMA,
    values: passwordForm,
    labels: PASSWORD_LABELS,
  });
  const emailRules = useFormRules({
    formKey: 'email',
    schema: EMAIL_SCHEMA,
    values: emailForm,
    labels: EMAIL_LABELS,
  });
  const serviceAccountRules = useFormRules({
    formKey: 'serviceAccount',
    schema: SERVICE_ACCOUNT_SCHEMA,
    values: serviceAccountForm,
    labels: SERVICE_ACCOUNT_LABELS,
  });
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [showDeleteSelectedModal, setShowDeleteSelectedModal] = useState(false);
  const [userOrganizations, setUserOrganizations] = useState([]);
  const [joinRequests, setJoinRequests] = useState([]);
  const [organizationsLoading, setOrganizationsLoading] = useState(false);

  const location = useLocation();
  const navigate = useNavigate();

  const handleLeaveOrganization = async orgName => {
    try {
      await account.leave(orgName);
      notify('success', t('profile.messages.leftOrganization', { orgName }));
      setUserOrganizations((await account.organizations()) || []);
    } catch (error) {
      log.api.error('Error leaving organization', {
        orgName,
        error: error.message,
      });
      notify('danger', t('profile.errors.leaveOrganization', { error: error.message }));
    }
  };

  const handleCancelJoinRequest = async requestId => {
    try {
      await account.cancelRequest(requestId);
      notify('success', t('profile.messages.requestCancelled'));
      setJoinRequests((await account.requests()) || []);
    } catch (error) {
      log.api.error('Error cancelling join request', {
        requestId,
        error: error.message,
      });
      notify('danger', t('profile.messages.cancelRequestError', { error: error.message }));
    }
  };

  const resetPasswordRules = passwordRules.reset;
  const resetEmailRules = emailRules.reset;
  const resetServiceAccountRules = serviceAccountRules.reset;

  const resetFormStates = useCallback(() => {
    setPasswordForm(EMPTY_PASSWORD);
    setEmailForm(EMPTY_EMAIL);
    resetPasswordRules();
    resetEmailRules();
  }, [resetPasswordRules, resetEmailRules]);

  const resetServiceAccountStates = useCallback(() => {
    setNewServiceAccountToken(null);
    setServiceAccountForm(previous => ({ ...previous, description: '', expirationDays: 30 }));
    resetServiceAccountRules();
  }, [resetServiceAccountRules]);

  const handleTabChange = useCallback(
    tab => {
      if (tab === 'serviceAccounts') {
        resetServiceAccountStates();
      } else {
        resetFormStates();
      }
      setSearchTerm('');
      setActiveTab(tab);
    },
    [resetFormStates, resetServiceAccountStates]
  );

  const handleDeleteAccount = async () => {
    try {
      await account.remove(currentUser.id);
      await session.signOutEverywhere();
    } catch (error) {
      log.auth.error('Error deleting account', {
        userId: currentUser.id,
        error: error.message,
      });
      notify('danger', responseMessage(error, t('profile.errors.deleteAccountFailed')));
    }
  };

  const openDeleteModal = () => setShowDeleteModal(true);
  const closeDeleteModal = () => setShowDeleteModal(false);

  const refreshUserData = useCallback(
    () =>
      session.reload().then(next => {
        if (next) {
          setCurrent(next);
          events.emit('login');
        }
      }),
    [events, session]
  );

  const handleSetPrimaryOrganization = async orgName => {
    try {
      await account.setPrimary(orgName);
      notify('success', t('profile.messages.primaryOrganizationSet', { orgName }));
      setUserOrganizations((await account.organizations()) || []);
      refreshUserData();
    } catch (error) {
      log.api.error('Error setting primary organization', {
        orgName,
        error: error.message,
      });
      notify('danger', t('profile.errors.setPrimaryOrganization', { error: error.message }));
    }
  };

  const checkEmailVerification = useCallback(() => {
    const searchParams = new URLSearchParams(location.search);
    const token = searchParams.get('token');

    if (token) {
      account
        .verifyMail(token)
        .then(data => {
          notify('success', data.message);
          refreshUserData();
        })
        .catch(error => {
          notify('danger', responseMessage(error, t('profile.errors.verificationFailed')));
        })
        .finally(() => {
          navigate('/profile', { replace: true });
        });
    }
  }, [account, location.search, navigate, notify, refreshUserData, t]);

  useEffect(() => {
    checkEmailVerification();
  }, [checkEmailVerification]);

  const loadGravatarProfile = useCallback(
    async (emailHash, signal) => {
      try {
        const profile = await account.gravatarProfile(emailHash, signal);
        if (profile) {
          setGravatarProfile(profile);
        }
      } catch (error) {
        if (!isAbort(error)) {
          log.api.error('Error loading Gravatar profile', {
            emailHash,
            error: error.message,
          });
        }
      }
    },
    [account]
  );

  useEffect(() => {
    let mounted = true;
    const controller = new AbortController();

    const loadUserData = async () => {
      if (currentUser) {
        const { emailHash } = currentUser;
        if (emailHash && mounted) {
          await loadGravatarProfile(emailHash, controller.signal);
        }
      } else {
        navigate(returnTo.signInTo('/profile'));
      }
    };

    loadUserData();

    return () => {
      mounted = false;
      controller.abort();
    };
  }, [currentUser, navigate, loadGravatarProfile, returnTo]);

  useEffect(() => {
    let mounted = true;
    const controller = new AbortController();

    const loadData = async () => {
      if (activeTab === 'serviceAccounts') {
        try {
          const [accounts, orgs] = await Promise.all([
            account.serviceAccounts.list(controller.signal),
            account.serviceAccounts.organizations(),
          ]);
          if (mounted) {
            setServiceAccounts(accounts);
            setServiceAccountOrgs(orgs || []);
          }
        } catch (error) {
          if (mounted && !isAbort(error)) {
            log.api.error('Error loading service accounts', {
              error: error.message,
            });
          }
        }
      } else if (activeTab === 'organizations') {
        setOrganizationsLoading(true);
        try {
          const [organizations, requests] = await Promise.all([
            account.organizations(),
            account.requests(),
          ]);
          if (mounted) {
            setUserOrganizations(organizations || []);
            setJoinRequests(requests || []);
          }
        } catch (error) {
          if (mounted && !isAbort(error)) {
            log.api.error('Error loading organizations', {
              error: error.message,
            });
          }
        } finally {
          if (mounted) {
            setOrganizationsLoading(false);
          }
        }
      }
    };

    if (activeTab === 'serviceAccounts' || activeTab === 'organizations') {
      loadData();
    }

    return () => {
      mounted = false;
      controller.abort();
    };
  }, [account, activeTab]);

  const loadServiceAccounts = async signal => {
    try {
      setServiceAccounts(await account.serviceAccounts.list(signal));
    } catch (error) {
      if (!isAbort(error)) {
        log.api.error('Error loading service accounts', {
          error: error.message,
        });
      }
    }
  };

  const handleCreateServiceAccount = async e => {
    e.preventDefault();
    if (!serviceAccountRules.validateAll()) {
      return;
    }
    const controller = new AbortController();
    try {
      const targetOrg = serviceAccountOrgs.find(
        org => org.name === serviceAccountForm.organization
      );

      if (!targetOrg) {
        notify('danger', t('profile.errors.activeOrgNotFound'));
        return;
      }

      const created = await account.serviceAccounts.create(
        serviceAccountForm.description,
        serviceAccountForm.expirationDays,
        targetOrg.id
      );
      await loadServiceAccounts(controller.signal);
      resetServiceAccountStates();
      setNewServiceAccountToken(created?.token || null);
      notify('success', t('profile.messages.serviceAccountCreated'));
    } catch (error) {
      if (!isAbort(error) && !serviceAccountRules.applyServerErrors(error)) {
        log.api.error('Error creating service account', {
          error: error.message,
        });
        notify(
          'danger',
          t('profile.errors.createServiceAccountFailed', {
            error: responseMessage(error, error.message),
          })
        );
      }
    }
    controller.abort();
  };

  const handleDeleteServiceAccount = async id => {
    const controller = new AbortController();
    try {
      await account.serviceAccounts.remove(id);
      await loadServiceAccounts(controller.signal);
    } catch (error) {
      if (!isAbort(error)) {
        log.api.error('Error deleting service account', {
          serviceAccountId: id,
          error: error.message,
        });
        notify(
          'danger',
          t('profile.errors.deleteServiceAccountsFailed', {
            error: responseMessage(error, error.message),
          })
        );
      }
    }
    controller.abort();
  };

  const selectedAccounts = serviceAccounts.filter(entry => selectedIds.has(entry.id));
  const allServiceAccountsSelected =
    serviceAccounts.length > 0 && selectedAccounts.length === serviceAccounts.length;

  const selectServiceAccount = (id, checked) => {
    setSelectedIds(previous => {
      const next = new Set(previous);
      if (checked) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  };

  const selectAllServiceAccounts = checked => {
    setSelectedIds(new Set(checked ? serviceAccounts.map(entry => entry.id) : []));
  };

  const handleDeleteSelectedServiceAccounts = async () => {
    const ids = selectedAccounts.map(entry => entry.id);
    const controller = new AbortController();
    try {
      await Promise.all(ids.map(id => account.serviceAccounts.remove(id)));
      notify('success', t('profile.messages.serviceAccountsDeleted'));
    } catch (error) {
      log.api.error('Error deleting service accounts', {
        serviceAccountIds: ids,
        error: error.message,
      });
      notify(
        'danger',
        t('profile.errors.deleteServiceAccountsFailed', {
          error: responseMessage(error, error.message),
        })
      );
    }
    setSelectedIds(new Set());
    await loadServiceAccounts(controller.signal);
    controller.abort();
  };

  const openDeleteSelectedModal = () => setShowDeleteSelectedModal(true);
  const closeDeleteSelectedModal = () => setShowDeleteSelectedModal(false);

  const handleResendVerificationMail = async () => {
    const controller = new AbortController();
    try {
      const data = await account.resendVerification(controller.signal);
      notify('success', data.message);
      await refreshUserData();
    } catch (error) {
      if (!isAbort(error)) {
        notify('danger', t('profile.errors.resendVerificationFailed', { error: error.message }));
      }
    }
    controller.abort();
  };

  const handlePasswordChange = async e => {
    e.preventDefault();
    if (!passwordRules.validateAll()) {
      return;
    }
    const controller = new AbortController();
    try {
      await account.changePassword(currentUser.id, passwordForm.newPassword, controller.signal);
      notify('success', t('profile.messages.passwordChanged'));
    } catch (error) {
      if (!isAbort(error) && !passwordRules.applyServerErrors(error)) {
        notify('danger', t('profile.errors.changePasswordFailed', { error: error.message }));
      }
    }
    controller.abort();
  };

  const handleEmailChange = async e => {
    e.preventDefault();
    if (!emailRules.validateAll()) {
      return;
    }
    const controller = new AbortController();
    try {
      await account.changeEmail(currentUser.id, emailForm.newEmail, controller.signal);
      notify('success', t('profile.messages.emailChanged'));
      await refreshUserData();
    } catch (error) {
      if (!isAbort(error) && !emailRules.applyServerErrors(error)) {
        notify('danger', t('profile.errors.changeEmailFailed', { error: error.message }));
      }
    }
    controller.abort();
  };

  const handleDisplayNameChange = async e => {
    e.preventDefault();
    if (!nameRules.validateAll()) {
      return;
    }
    const controller = new AbortController();
    try {
      await account.changeName(currentUser.id, nameForm.name, controller.signal);
      notify('success', t('profile.messages.nameChanged'));
      await refreshUserData();
    } catch (error) {
      if (!isAbort(error) && !nameRules.applyServerErrors(error)) {
        notify(
          'danger',
          responseMessage(error, t('profile.errors.changeNameFailed', { error: error.message }))
        );
      }
    }
    controller.abort();
  };

  const renderProfileTab = () => (
    <div className="tab-pane fade show active">
      <form onSubmit={handleDisplayNameChange} className="mb-4" noValidate>
        <div className="col-md-4">
          <FormErrorSummary errors={nameRules.summary} />
          <Field
            id={nameRules.idFor('name')}
            label={<strong>{t('profile.fields.displayName')}</strong>}
            hint={t('profile.fields.displayNameHint')}
            error={nameRules.errors.name || ''}
          >
            {aria => (
              <input
                {...aria}
                type="text"
                className="form-control"
                value={nameForm.name}
                onChange={event => setNameForm({ name: event.target.value })}
                onBlur={() => nameRules.onBlur('name')}
                placeholder={currentUser.username}
              />
            )}
          </Field>
          <button className="btn btn-primary" type="submit">
            {t('profile.buttons.save')}
          </button>
        </div>
      </form>
      <p>
        <strong>{t('profile.fields.fullName')}:</strong> {gravatarProfile.first_name}{' '}
        {gravatarProfile.last_name}
      </p>
      <p>
        <strong>{t('profile.fields.location')}:</strong>{' '}
        {gravatarProfile.location || t('profile.noLocation')}
      </p>
      <p>
        <strong>{t('profile.fields.email')}:</strong> {currentUser.email}
      </p>
      <p>
        <strong>{t('profile.fields.organization')}:</strong> {currentUser.organization}
      </p>
      <p>
        <strong>{t('profile.fields.roles')}:</strong>{' '}
        {currentUser.roles ? currentUser.roles.join(', ') : t('profile.noRoles')}
      </p>
      <p>
        <strong>{t('profile.fields.profileUrl')}:</strong>{' '}
        <a href={gravatarProfile.profile_url} target="_blank" rel="noopener noreferrer">
          {gravatarProfile.profile_url}
        </a>
      </p>
      <p>
        <strong>{t('profile.fields.verifiedAccounts')}:</strong>{' '}
        {gravatarProfile.number_verified_accounts}
      </p>
      <p>
        <strong>{t('profile.fields.registrationDate')}:</strong>{' '}
        {new Date(gravatarProfile.registration_date).toLocaleDateString()}
      </p>
      <p>
        <strong>{t('profile.fields.emailHash')}:</strong> {currentUser.emailHash}
      </p>
      <p>
        <strong>{t('profile.fields.userId')}:</strong> {currentUser.id}
      </p>
      {currentUser.accessToken ? (
        <p>
          <strong>{t('profile.fields.accessToken')}:</strong>{' '}
          {currentUser.accessToken.substring(0, 20)}...
        </p>
      ) : null}
    </div>
  );

  const renderSecurityTab = () => (
    <div className="tab-pane fade show active">
      <form onSubmit={handlePasswordChange} noValidate>
        <h5>{t('profile.security.changePassword.title')}</h5>
        <div className="col-md-3">
          <FormErrorSummary errors={passwordRules.summary} />
          <Field
            id={passwordRules.idFor('newPassword')}
            label={t('profile.security.changePassword.newPasswordPlaceholder')}
            error={passwordRules.errors.newPassword || ''}
          >
            {aria => (
              <input
                {...aria}
                type="password"
                className="form-control"
                autoComplete="new-password"
                value={passwordForm.newPassword}
                onChange={e => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                onBlur={() => passwordRules.onBlur('newPassword')}
              />
            )}
          </Field>
          <Field
            id={passwordRules.idFor('confirmPassword')}
            label={t('profile.security.changePassword.confirmPasswordPlaceholder')}
            error={passwordRules.errors.confirmPassword || ''}
          >
            {aria => (
              <input
                {...aria}
                type="password"
                className="form-control"
                autoComplete="new-password"
                value={passwordForm.confirmPassword}
                onChange={e =>
                  setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })
                }
                onBlur={() => passwordRules.onBlur('confirmPassword')}
              />
            )}
          </Field>
        </div>
        <button className="btn btn-primary mb-3" type="submit">
          {t('profile.security.changePassword.button')}
        </button>
      </form>
      <form onSubmit={handleEmailChange} noValidate>
        <h5>{t('profile.security.changeEmail.title')}</h5>
        <div className="col-md-3">
          <FormErrorSummary errors={emailRules.summary} />
          <Field
            id={emailRules.idFor('newEmail')}
            label={t('profile.security.changeEmail.newEmailPlaceholder')}
            error={emailRules.errors.newEmail || ''}
          >
            {aria => (
              <input
                {...aria}
                type="email"
                className="form-control"
                autoComplete="email"
                value={emailForm.newEmail}
                onChange={e => setEmailForm({ newEmail: e.target.value })}
                onBlur={() => emailRules.onBlur('newEmail')}
              />
            )}
          </Field>
        </div>
        <button className="btn btn-primary mb-3" type="submit">
          {t('profile.security.changeEmail.button')}
        </button>
      </form>
      <div className="mt-3">
        <h4>{t('profile.security.deleteAccount.title')}</h4>
        <p>{t('profile.security.deleteAccount.warning')}</p>
        <button type="button" className="btn btn-danger" onClick={openDeleteModal}>
          {t('profile.security.deleteAccount.button')}
        </button>
      </div>
    </div>
  );

  const term = searchTerm.toLowerCase();
  const filteredOrganizations = userOrganizations.filter(org =>
    includesTerm(
      term,
      org.name || org.organization?.name,
      org.description || org.organization?.description
    )
  );
  const filteredJoinRequests = joinRequests.filter(request =>
    includesTerm(term, request.organization.name)
  );
  const filteredServiceAccounts = serviceAccounts.filter(entry =>
    includesTerm(term, entry.username, entry.description, entry.organization?.name)
  );
  const searchCounts = {
    organizations: {
      matched: filteredOrganizations.length + filteredJoinRequests.length,
      total: userOrganizations.length + joinRequests.length,
    },
    serviceAccounts: {
      matched: filteredServiceAccounts.length,
      total: serviceAccounts.length,
    },
  }[activeTab];
  const emptyOrganizationsText = searchTerm
    ? t('pages.noMatches')
    : t('profile.organizations.noOrgs');

  const renderOrganizationsTab = () => (
    <div className="tab-pane fade show active">
      <h3>{t('profile.organizations.title')}</h3>

      {organizationsLoading ? (
        <div className="text-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">{t('loading')}</span>
          </div>
        </div>
      ) : (
        <>
          <div className="card mb-4">
            <div className="card-header">
              <h5>{t('profile.organizations.belongToTitle')}</h5>
            </div>
            <div className="card-body">
              {filteredOrganizations.length === 0 ? (
                <div className="alert alert-info">{emptyOrganizationsText}</div>
              ) : (
                <ul className="list-group">
                  {filteredOrganizations.map(org => {
                    const orgName = org.name || org.organization?.name;
                    const orgDesc = org.description || org.organization?.description;
                    const isPrimary = !!org.isPrimary;
                    const orgId = org.id || org.organization?.id;

                    return (
                      <li key={orgId} className="list-group-item">
                        <div className="d-flex justify-content-between align-items-center">
                          <div>
                            <div className="d-flex align-items-center">
                              <div>
                                <strong>{orgName}</strong>
                                {isPrimary && (
                                  <span className="badge bg-primary ms-2">
                                    {t('profile.organizations.primary')}
                                  </span>
                                )}
                                <br />
                                {orgDesc && <small className="text-muted">{orgDesc}</small>}
                                <br />
                                <small className="text-muted">
                                  {t('profile.organizations.joined')}:{' '}
                                  {new Date(org.joinedAt).toLocaleDateString()}
                                </small>
                              </div>
                            </div>
                          </div>
                          <div className="d-flex align-items-center">
                            <span
                              className={`badge ${ROLE_CLASSES[org.role] || 'bg-secondary'} me-3`}
                            >
                              {t(`roles.${org.role}`)}
                            </span>
                            {!isPrimary && !oidc && (
                              <button
                                type="button"
                                className="btn btn-outline-primary btn-sm me-2"
                                onClick={() => handleSetPrimaryOrganization(orgName)}
                              >
                                {t('profile.organizations.makePrimary')}
                              </button>
                            )}
                            {userOrganizations.length > 1 && (
                              <button
                                type="button"
                                className="btn btn-outline-danger btn-sm"
                                onClick={() => handleLeaveOrganization(orgName)}
                              >
                                {t('profile.buttons.leave')}
                              </button>
                            )}
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>

          {joinRequests.length > 0 && (
            <div className="card">
              <div className="card-header">
                <h5>{t('profile.organizations.pendingRequestsTitle')}</h5>
              </div>
              <div className="card-body">
                {filteredJoinRequests.length === 0 ? (
                  <div className="alert alert-info mb-0">{t('pages.noMatches')}</div>
                ) : (
                  <ul className="list-group">
                    {filteredJoinRequests.map(request => (
                      <li key={request.id} className="list-group-item">
                        <div className="d-flex justify-content-between align-items-center">
                          <div>
                            <strong>{request.organization.name}</strong>
                            <br />
                            {request.organization.description && (
                              <small className="text-muted">
                                {request.organization.description}
                              </small>
                            )}
                            <br />
                            <small className="text-muted">
                              {t('profile.organizations.requested')}:{' '}
                              {new Date(request.created_at).toLocaleDateString()}
                            </small>
                          </div>
                          <div>
                            <span className="badge bg-warning me-3">
                              {t('pages.status.pending')}
                            </span>
                            <button
                              type="button"
                              className="btn btn-outline-secondary btn-sm"
                              onClick={() => handleCancelJoinRequest(request.id)}
                            >
                              {t('profile.buttons.cancel')}
                            </button>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );

  const renderServiceAccountsTab = () => (
    <div className="tab-pane fade show active">
      <h3>{t('profile.serviceAccounts.title')}</h3>
      <form onSubmit={handleCreateServiceAccount} noValidate>
        <div className="col-md-3">
          <FormErrorSummary errors={serviceAccountRules.summary} />
          <Field
            id={serviceAccountRules.idFor('organization')}
            label={t('profile.serviceAccounts.organization')}
            error={serviceAccountRules.errors.organization || ''}
          >
            {aria => (
              <select
                {...aria}
                className="form-select"
                value={serviceAccountForm.organization}
                onChange={e =>
                  setServiceAccountForm({ ...serviceAccountForm, organization: e.target.value })
                }
                onBlur={() => serviceAccountRules.onBlur('organization')}
              >
                {serviceAccountOrgs.map(org => (
                  <option key={org.id} value={org.name}>
                    {org.name}
                  </option>
                ))}
              </select>
            )}
          </Field>
          <Field
            id={serviceAccountRules.idFor('description')}
            label={t('profile.serviceAccounts.descriptionPlaceholder')}
            error={serviceAccountRules.errors.description || ''}
          >
            {aria => (
              <input
                {...aria}
                type="text"
                className="form-control"
                value={serviceAccountForm.description}
                onChange={e =>
                  setServiceAccountForm({ ...serviceAccountForm, description: e.target.value })
                }
                onBlur={() => serviceAccountRules.onBlur('description')}
              />
            )}
          </Field>
          <Field
            id={serviceAccountRules.idFor('expirationDays')}
            label={t('profile.serviceAccounts.expires')}
            error={serviceAccountRules.errors.expirationDays || ''}
          >
            {aria => (
              <select
                {...aria}
                className="form-select"
                value={serviceAccountForm.expirationDays}
                onChange={e =>
                  setServiceAccountForm({
                    ...serviceAccountForm,
                    expirationDays: Number(e.target.value),
                  })
                }
                onBlur={() => serviceAccountRules.onBlur('expirationDays')}
              >
                {EXPIRATIONS.map(days => (
                  <option key={days} value={days}>
                    {t(`profile.serviceAccounts.expiration.${days}`)}
                  </option>
                ))}
              </select>
            )}
          </Field>
        </div>
        <button className="btn btn-primary mb-3" type="submit">
          {t('profile.serviceAccounts.createButton')}
        </button>
      </form>
      {newServiceAccountToken && (
        <div className="alert alert-warning" role="alert">
          <strong>{t('profile.serviceAccounts.token')}:</strong>{' '}
          <code>{newServiceAccountToken}</code>
          <br />
          <small>{t('profile.serviceAccounts.tokenShownOnce')}</small>
        </div>
      )}
      <div className="d-flex justify-content-between align-items-center mb-2">
        <div className="form-check">
          <input
            type="checkbox"
            className="form-check-input"
            id="selectAllServiceAccounts"
            checked={allServiceAccountsSelected}
            onChange={event => selectAllServiceAccounts(event.target.checked)}
          />
          <label className="form-check-label" htmlFor="selectAllServiceAccounts">
            {t('profile.serviceAccounts.selectAll')}
          </label>
        </div>
        <button
          type="button"
          className="btn btn-danger btn-sm"
          disabled={selectedAccounts.length === 0}
          onClick={openDeleteSelectedModal}
        >
          {t('profile.serviceAccounts.deleteSelected', { count: selectedAccounts.length })}
        </button>
      </div>
      {serviceAccounts.length > 0 && filteredServiceAccounts.length === 0 && (
        <div className="alert alert-info">{t('pages.noMatches')}</div>
      )}
      {groupByOrganization(filteredServiceAccounts, t('profile.unknown')).map(group => (
        <div key={group.name} className="card mb-3">
          <div className="card-header d-flex align-items-center gap-2">
            <h5 className="mb-0">{group.name}</h5>
            <span className="badge bg-secondary bg-opacity-50">{group.accounts.length}</span>
          </div>
          <ul className="list-group list-group-flush">
            {group.accounts.map(entry => (
              <li key={entry.id} className="list-group-item">
                <div className="d-flex justify-content-between align-items-center">
                  <input
                    type="checkbox"
                    className="form-check-input me-3"
                    checked={selectedIds.has(entry.id)}
                    onChange={event => selectServiceAccount(entry.id, event.target.checked)}
                    aria-label={entry.username}
                  />
                  <div className="flex-grow-1">
                    <strong>{entry.username}</strong> - {entry.description}
                    <br />
                    <small>
                      {t('profile.serviceAccounts.expires')}:{' '}
                      {new Date(entry.expiresAt).toLocaleDateString()}
                    </small>
                  </div>
                  <div>
                    <button
                      type="button"
                      className="btn btn-danger btn-sm"
                      onClick={() => handleDeleteServiceAccount(entry.id)}
                    >
                      {t('profile.buttons.delete')}
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );

  return (
    <div className="list row">
      {currentUser && (
        <div className="card mt-2 mb-2">
          <div className="card-header text-center">
            <Avatar
              picture={currentUser.avatarUrl || gravatarProfile.avatar_url || ''}
              size={100}
            />
            <h3 className="mt-3">{gravatarProfile.display_name || currentUser.username}</h3>
            <p className="text-muted">{gravatarProfile.job_title || t('profile.noJobTitle')}</p>
          </div>
          <div className="card-body">
            {!currentUser.verified && (
              <div className="alert alert-warning" role="alert">
                {t('profile.messages.emailNotVerified')}
                <button
                  type="button"
                  className="btn btn-link"
                  onClick={handleResendVerificationMail}
                >
                  {t('profile.buttons.resendVerification')}
                </button>
              </div>
            )}
            <ProfileTabs tabs={tabs} activeTab={activeTab} onChange={handleTabChange} />
            {searchCounts && (
              <PageSearch
                query={searchTerm}
                onQueryChange={setSearchTerm}
                placeholder={t(SEARCH_PLACEHOLDER_KEYS[activeTab])}
                matched={searchCounts.matched}
                total={searchCounts.total}
              />
            )}
            <div className="tab-content mt-3">
              {activeTab === 'profile' && renderProfileTab()}
              {activeTab === 'organizations' && renderOrganizationsTab()}
              {activeTab === 'security' && showSecurity && renderSecurityTab()}
              {activeTab === 'serviceAccounts' && renderServiceAccountsTab()}
            </div>
          </div>
        </div>
      )}
      <ConfirmModal
        show={showDeleteModal}
        handleClose={closeDeleteModal}
        handleConfirm={handleDeleteAccount}
        title={t('profile.deleteModal.title')}
        message={t('profile.deleteModal.message')}
      />
      <ConfirmModal
        show={showDeleteSelectedModal}
        handleClose={closeDeleteSelectedModal}
        handleConfirm={handleDeleteSelectedServiceAccounts}
        title={t('profile.serviceAccounts.deleteSelectedModal.title')}
        message={t('profile.serviceAccounts.deleteSelectedModal.message')}
      />
    </div>
  );
};

ProfilePage.propTypes = {
  session: PropTypes.object.isRequired,
  events: PropTypes.shape({ emit: PropTypes.func.isRequired }).isRequired,
  returnTo: returnToShape.isRequired,
  account: accountShape.isRequired,
  activeOrgUuid: PropTypes.string.isRequired,
  localAccounts: PropTypes.bool.isRequired,
  issuerUrl: PropTypes.string.isRequired,
};

export default ProfilePage;
