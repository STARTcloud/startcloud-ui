import PropTypes from 'prop-types';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, Modal } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { FaBuilding } from 'react-icons/fa6';

import AddressFields, { EMPTY_ADDRESS } from '../../../components/common/AddressFields';
import ConfirmModal from '../../../components/common/ConfirmModal';
import Field from '../../../components/common/Field';
import FormErrorSummary from '../../../components/common/FormErrorSummary';
import MethodList, { MethodRow, httpsUrl } from '../../../components/common/MethodList';
import { errorKeys } from '../../../components/common/StepUpDialog';
import { useNotify } from '../../../contexts/NoticeContext';
import { useStatus } from '../../../contexts/StatusContext';
import { useFormRules } from '../../../hooks/useFormRules';
import { log } from '../../../lib/logger';
import { hasFeature } from '../../../utils/capabilities';
import { NON_BLANK } from '../../../utils/validation';
import { issuerOrganizationsShape } from '../api/issuer';

const ROLES = ['MEMBER', 'ADMIN', 'OWNER'];
const ACCESS_MODES = ['private', 'invite_only', 'request_to_join'];
const ACCESS_MODE_KEYS = {
  private: 'orgConsole.organization.accessModes.private',
  invite_only: 'orgConsole.organization.accessModes.inviteOnly',
  request_to_join: 'orgConsole.organization.accessModes.requestToJoin',
};
const RECORD_FIELDS = [
  'name',
  'email',
  'description',
  'website_url',
  'logo_url',
  'locale',
  'timezone',
  'telephone',
  'access_mode',
  'default_role',
];
const RECORD_SCHEMA = {
  required: ['name'],
  properties: {
    name: NON_BLANK,
    email: { type: 'string' },
    description: { type: 'string' },
    website_url: { type: 'string' },
    logo_url: { type: 'string' },
    locale: { type: 'string' },
    timezone: { type: 'string' },
    telephone: { type: 'string' },
    access_mode: { type: 'string' },
    default_role: { type: 'string' },
  },
};
const RECORD_LABELS = {
  name: 'orgConsole.organization.name',
  email: 'orgConsole.organization.email',
  description: 'orgConsole.organization.description',
  website_url: 'orgConsole.website',
  logo_url: 'orgConsole.logoUrl',
  locale: 'orgConsole.locale',
  timezone: 'orgConsole.timezone',
  telephone: 'orgConsole.telephone',
  access_mode: 'orgConsole.organization.accessMode',
  default_role: 'orgConsole.organization.defaultRole',
};
const INVITE_SCHEMA = {
  required: ['email', 'role'],
  properties: { email: NON_BLANK, role: NON_BLANK },
};
const INVITE_LABELS = {
  email: 'orgConsole.invitation.email',
  role: 'orgConsole.invitation.assignRole',
};
const CONVERT_SCHEMA = { required: ['name'], properties: { name: NON_BLANK } };
const CONVERT_LABELS = { name: 'orgConsole.convertName' };
const EMPTY_INVITE = { email: '', role: 'MEMBER' };

const timeZones = () => {
  try {
    return Intl.supportedValuesOf('timeZone');
  } catch {
    return [];
  }
};

const recordOf = org => ({
  ...Object.fromEntries(RECORD_FIELDS.map(field => [field, org?.[field] || ''])),
  access_mode: org?.access_mode || 'private',
  default_role: org?.default_role || 'MEMBER',
});

const changedFields = (record, org) =>
  Object.fromEntries(
    Object.entries(record).filter(([field, value]) => value !== (org?.[field] || ''))
  );

const ownerCount = members => members.filter(member => member.role === 'OWNER').length;

const confirmMessage = t => t('pages.confirm.message', { keyword: t('pages.confirm.keyword') });

const RecordTab = ({ org, organizations, onSaved, placesKey }) => {
  const { t } = useTranslation();
  const notify = useNotify();
  const [record, setRecord] = useState(() => recordOf(org));
  const [address, setAddress] = useState(() => ({ ...EMPTY_ADDRESS, ...(org.address || {}) }));
  const rules = useFormRules({
    schema: RECORD_SCHEMA,
    values: record,
    labels: RECORD_LABELS,
    idPrefix: 'org-record',
  });
  const zones = useMemo(() => timeZones(), []);

  const set = (field, value) => setRecord(previous => ({ ...previous, [field]: value }));

  const save = async event => {
    event.preventDefault();
    if (!rules.validateAll()) {
      return;
    }
    try {
      await organizations.update(org.uuid, { ...changedFields(record, org), address });
      notify('success', t('orgConsole.orgUpdateSuccess'));
      await onSaved();
    } catch (error) {
      if (!rules.applyServerErrors(error)) {
        notify('danger', t(errorKeys(error)));
      }
    }
  };

  const textField = (field, type = 'text', span = 'col-md-6') => (
    <div className={span} key={field}>
      <Field
        id={rules.idFor(field)}
        label={t(RECORD_LABELS[field])}
        error={rules.errors[field] || ''}
      >
        {aria => (
          <input
            {...aria}
            type={type}
            className="form-control"
            value={record[field]}
            readOnly={!org.can_rename}
            onChange={event => set(field, event.target.value)}
            onBlur={() => rules.onBlur(field)}
          />
        )}
      </Field>
    </div>
  );

  const selectField = (field, options, labelOf, enabled) => (
    <div className="col-md-6" key={field}>
      <Field
        id={rules.idFor(field)}
        label={t(RECORD_LABELS[field])}
        error={rules.errors[field] || ''}
      >
        {aria => (
          <select
            {...aria}
            className="form-select"
            value={record[field]}
            disabled={!enabled}
            onChange={event => set(field, event.target.value)}
            onBlur={() => rules.onBlur(field)}
          >
            {options.map(option => (
              <option key={option} value={option}>
                {labelOf(option)}
              </option>
            ))}
          </select>
        )}
      </Field>
    </div>
  );

  return (
    <form onSubmit={save} noValidate>
      <FormErrorSummary errors={rules.summary} />
      <div className="row">
        {textField('name', 'text', 'col-12')}
        {textField('email', 'email')}
        {textField('website_url', 'url')}
        {textField('logo_url', 'url')}
        {textField('description')}
        {textField('locale')}
        {selectField(
          'timezone',
          ['', ...zones],
          zone => zone || t('orgConsole.timezoneNone'),
          org.can_rename
        )}
        {textField('telephone', 'tel')}
        {selectField(
          'access_mode',
          ACCESS_MODES,
          mode => t(ACCESS_MODE_KEYS[mode]),
          org.can_manage
        )}
        {selectField(
          'default_role',
          ROLES.slice(0, 2),
          role => t(`roles.${role.toLowerCase()}`),
          org.is_owner
        )}
      </div>
      <h5 className="mt-2">{t('orgConsole.organization.address')}</h5>
      <fieldset disabled={!org.can_rename}>
        <AddressFields
          value={address}
          onChange={setAddress}
          idPrefix="org-address"
          placesKey={placesKey}
        />
      </fieldset>
      {org.can_rename || org.can_manage || org.is_owner ? (
        <button type="submit" className="btn btn-primary">
          {t('orgConsole.organization.updateButton')}
        </button>
      ) : null}
    </form>
  );
};

RecordTab.propTypes = {
  org: PropTypes.object.isRequired,
  organizations: issuerOrganizationsShape.isRequired,
  onSaved: PropTypes.func.isRequired,
  placesKey: PropTypes.string.isRequired,
};

const RoleControl = ({ member, org, self, lastOwner, onRole }) => {
  const { t } = useTranslation();
  if (!org.is_owner) {
    return (
      <span className="badge bg-secondary">{t(`roles.${String(member.role).toLowerCase()}`)}</span>
    );
  }
  return (
    <select
      className="form-select form-select-sm w-auto"
      value={member.role}
      disabled={lastOwner && self}
      title={lastOwner && self ? t('orgConsole.lastOwner') : undefined}
      aria-label={t('orgConsole.users.roles')}
      onChange={event => onRole(member, event.target.value)}
    >
      {ROLES.map(role => (
        <option key={role} value={role}>
          {t(`roles.${role.toLowerCase()}`)}
        </option>
      ))}
    </select>
  );
};

RoleControl.propTypes = {
  member: PropTypes.shape({ role: PropTypes.string }).isRequired,
  org: PropTypes.shape({ is_owner: PropTypes.bool }).isRequired,
  self: PropTypes.bool.isRequired,
  lastOwner: PropTypes.bool.isRequired,
  onRole: PropTypes.func.isRequired,
};

const MemberRow = ({ member, org, currentUserId, owners, onRole, onRemove }) => {
  const { t } = useTranslation();
  const self = String(member.user_id) === String(currentUserId);
  const lastOwner = member.role === 'OWNER' && owners === 1;
  const badges = member.managed_by ? (
    <span className="badge bg-info text-dark">
      {t('orgConsole.managedBy', { source: member.managed_by })}
    </span>
  ) : null;
  const actions = member.managed_by ? null : (
    <>
      <RoleControl member={member} org={org} self={self} lastOwner={lastOwner} onRole={onRole} />
      {org.can_manage && !self ? (
        <button
          type="button"
          className="btn btn-sm btn-outline-danger"
          onClick={() => onRemove(member)}
        >
          {t('orgConsole.buttons.removeFromOrg')}
        </button>
      ) : null}
    </>
  );
  return (
    <MethodRow
      label={member.name || member.email}
      subline={member.name ? member.email : null}
      badges={badges}
      actions={actions}
    />
  );
};

MemberRow.propTypes = {
  member: PropTypes.shape({
    user_id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    email: PropTypes.string,
    name: PropTypes.string,
    role: PropTypes.string,
    managed_by: PropTypes.string,
  }).isRequired,
  org: PropTypes.object.isRequired,
  currentUserId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  owners: PropTypes.number.isRequired,
  onRole: PropTypes.func.isRequired,
  onRemove: PropTypes.func.isRequired,
};

const InviteForm = ({ org, organizations, onChanged }) => {
  const { t } = useTranslation();
  const notify = useNotify();
  const [form, setForm] = useState(EMPTY_INVITE);
  const rules = useFormRules({
    formKey: 'invitation',
    schema: INVITE_SCHEMA,
    values: form,
    labels: INVITE_LABELS,
    idPrefix: 'org-invite',
  });

  const send = async event => {
    event.preventDefault();
    if (!rules.validateAll()) {
      return;
    }
    try {
      await organizations.invite(org.uuid, form.email, form.role);
      notify('success', t('orgConsole.invitation.sent'));
      setForm(EMPTY_INVITE);
      rules.reset();
      await onChanged();
    } catch (error) {
      if (!rules.applyServerErrors(error)) {
        notify('danger', t(errorKeys(error)));
      }
    }
  };

  return (
    <form onSubmit={send} noValidate className="mb-4">
      <h5>{t('orgConsole.invitation.sendTitle')}</h5>
      <FormErrorSummary errors={rules.summary} />
      <div className="row">
        <div className="col-md-8">
          <Field
            id={rules.idFor('email')}
            label={t('orgConsole.invitation.email')}
            error={rules.errors.email || ''}
          >
            {aria => (
              <input
                {...aria}
                type="email"
                className="form-control"
                value={form.email}
                onChange={event =>
                  setForm(previous => ({ ...previous, email: event.target.value }))
                }
                onBlur={() => rules.onBlur('email')}
              />
            )}
          </Field>
        </div>
        <div className="col-md-4">
          <Field
            id={rules.idFor('role')}
            label={t('orgConsole.invitation.assignRole')}
            error={rules.errors.role || ''}
          >
            {aria => (
              <select
                {...aria}
                className="form-select"
                value={form.role}
                onChange={event => setForm(previous => ({ ...previous, role: event.target.value }))}
                onBlur={() => rules.onBlur('role')}
              >
                <option value="MEMBER">{t('roles.member')}</option>
                {org.is_owner ? <option value="ADMIN">{t('roles.admin')}</option> : null}
              </select>
            )}
          </Field>
        </div>
      </div>
      <button type="submit" className="btn btn-primary">
        {t('orgConsole.invitation.sendButton')}
      </button>
    </form>
  );
};

InviteForm.propTypes = {
  org: PropTypes.object.isRequired,
  organizations: issuerOrganizationsShape.isRequired,
  onChanged: PropTypes.func.isRequired,
};

const RevokeButton = ({ invite, onRevoke }) => {
  const { t } = useTranslation();
  return (
    <button
      type="button"
      className="btn btn-sm btn-outline-danger"
      onClick={() => onRevoke(invite)}
    >
      {t('orgConsole.revokeInvite')}
    </button>
  );
};

RevokeButton.propTypes = {
  invite: PropTypes.object.isRequired,
  onRevoke: PropTypes.func.isRequired,
};

const InvitationsTab = ({ org, organizations, onChanged, onRevoke }) => {
  const { t } = useTranslation();
  const invites = Array.isArray(org.pending_invites) ? org.pending_invites : [];
  return (
    <>
      {org.can_manage ? (
        <InviteForm org={org} organizations={organizations} onChanged={onChanged} />
      ) : null}
      <h5>
        {t('orgConsole.invitation.activeTitle')}{' '}
        <span className="badge bg-secondary">{invites.length}</span>
      </h5>
      <MethodList empty={t('orgConsole.invitation.noActive')}>
        {invites.map(invite => (
          <MethodRow
            key={invite.id}
            label={invite.email}
            subline={t(`roles.${String(invite.role || 'MEMBER').toLowerCase()}`)}
            actions={org.can_manage ? <RevokeButton invite={invite} onRevoke={onRevoke} /> : null}
          />
        ))}
      </MethodList>
    </>
  );
};

InvitationsTab.propTypes = {
  org: PropTypes.object.isRequired,
  organizations: issuerOrganizationsShape.isRequired,
  onChanged: PropTypes.func.isRequired,
  onRevoke: PropTypes.func.isRequired,
};

const ConvertDialog = ({ show, org, organizations, onHide, onDone }) => {
  const { t } = useTranslation();
  const notify = useNotify();
  const [form, setForm] = useState({ name: '' });
  const rules = useFormRules({
    schema: CONVERT_SCHEMA,
    values: form,
    labels: CONVERT_LABELS,
    idPrefix: 'org-convert',
  });

  const convert = async event => {
    event.preventDefault();
    if (!rules.validateAll()) {
      return;
    }
    try {
      await organizations.convert(org.uuid, form.name);
      notify('success', t('orgConsole.converted'));
      setForm({ name: '' });
      rules.reset();
      onHide();
      await onDone();
    } catch (error) {
      if (!rules.applyServerErrors(error)) {
        notify('danger', t(errorKeys(error)));
      }
    }
  };

  return (
    <Modal show={show} onHide={onHide} centered>
      <form onSubmit={convert} noValidate>
        <Modal.Header closeButton>
          <Modal.Title as="h5">{t('orgConsole.convert')}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <FormErrorSummary errors={rules.summary} />
          <Field
            id={rules.idFor('name')}
            label={t('orgConsole.convertName')}
            error={rules.errors.name || ''}
            className="mb-0"
          >
            {aria => (
              <input
                {...aria}
                type="text"
                className="form-control"
                value={form.name}
                onChange={event => setForm({ name: event.target.value })}
                onBlur={() => rules.onBlur('name')}
              />
            )}
          </Field>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={onHide}>
            {t('pages.confirm.cancel')}
          </Button>
          <Button variant="primary" type="submit">
            {t('orgConsole.convert')}
          </Button>
        </Modal.Footer>
      </form>
    </Modal>
  );
};

ConvertDialog.propTypes = {
  show: PropTypes.bool.isRequired,
  org: PropTypes.object.isRequired,
  organizations: issuerOrganizationsShape.isRequired,
  onHide: PropTypes.func.isRequired,
  onDone: PropTypes.func.isRequired,
};

const ConsoleHeader = ({ org, owners, onRegenerate, onConvert, onLeave, onDelete }) => {
  const { t } = useTranslation();
  const logo = httpsUrl(org.logo_url);
  const soloOwner = org.is_owner && owners === 1 && !org.personal;
  return (
    <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3">
      <div className="d-flex align-items-center gap-3">
        {logo ? (
          <img
            src={logo}
            alt=""
            width={40}
            height={40}
            className="rounded"
            referrerPolicy="no-referrer"
          />
        ) : (
          <FaBuilding className="fs-3 text-body-secondary" aria-hidden />
        )}
        <div>
          <h4 className="mb-0">
            {org.name}{' '}
            <span className="badge bg-secondary">
              {org.personal ? t('organizations.personal') : t('orgConsole.team')}
            </span>{' '}
            {org.primary ? (
              <span className="badge bg-primary">{t('organizations.primary')}</span>
            ) : null}
          </h4>
          <small className="text-body-secondary">
            {t('organizations.yourRole', { role: org.my_role || '' })}
            {org.can_manage && org.invite_code ? (
              <>
                {' · '}
                {t('organizations.inviteCode')} <code>{org.invite_code}</code>{' '}
                <button
                  type="button"
                  className="btn btn-link btn-sm p-0 align-baseline"
                  onClick={onRegenerate}
                >
                  {t('organizations.regenerate')}
                </button>
              </>
            ) : null}
          </small>
        </div>
      </div>
      <div className="d-flex gap-2">
        {org.personal && org.is_owner ? (
          <button type="button" className="btn btn-sm btn-outline-primary" onClick={onConvert}>
            {t('orgConsole.convert')}
          </button>
        ) : null}
        {soloOwner ? null : (
          <button type="button" className="btn btn-sm btn-outline-secondary" onClick={onLeave}>
            {t('orgConsole.leave')}
          </button>
        )}
        {org.is_owner ? (
          <button type="button" className="btn btn-sm btn-outline-danger" onClick={onDelete}>
            {t('orgConsole.delete')}
          </button>
        ) : null}
      </div>
    </div>
  );
};

ConsoleHeader.propTypes = {
  org: PropTypes.object.isRequired,
  owners: PropTypes.number.isRequired,
  onRegenerate: PropTypes.func.isRequired,
  onConvert: PropTypes.func.isRequired,
  onLeave: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
};

const usePlacesKey = places => {
  const [key, setKey] = useState('');
  useEffect(() => {
    if (!places) {
      return undefined;
    }
    let mounted = true;
    places()
      .then(data => {
        if (mounted && typeof data?.key === 'string') {
          setKey(data.key);
        }
      })
      .catch(() => null);
    return () => {
      mounted = false;
    };
  }, [places]);
  return key;
};

const tabsFor = invitationsEnabled => {
  const tabs = [
    { key: 'organization', labelKey: 'orgConsole.tabs.organization' },
    { key: 'members', labelKey: 'orgConsole.tabs.members' },
  ];
  if (invitationsEnabled) {
    tabs.push({ key: 'invitations', labelKey: 'orgConsole.tabs.invitations' });
  }
  return tabs;
};

const ConsoleTabs = ({ tabs, currentTab, onPick }) => {
  const { t } = useTranslation();
  if (tabs.length < 2) {
    return null;
  }
  return (
    <ul className="nav nav-tabs">
      {tabs.map(entry => (
        <li key={entry.key} className="nav-item">
          <button
            type="button"
            className={`nav-link ${currentTab === entry.key ? 'active' : ''}`}
            onClick={() => onPick(entry.key)}
          >
            {t(entry.labelKey)}
          </button>
        </li>
      ))}
    </ul>
  );
};

ConsoleTabs.propTypes = {
  tabs: PropTypes.arrayOf(
    PropTypes.shape({ key: PropTypes.string.isRequired, labelKey: PropTypes.string.isRequired })
  ).isRequired,
  currentTab: PropTypes.string.isRequired,
  onPick: PropTypes.func.isRequired,
};

const useMemberships = organizations => {
  const { t } = useTranslation();
  const notify = useNotify();
  const [state, setState] = useState({ memberships: null, version: 0 });

  const load = useCallback(
    () =>
      organizations
        .list()
        .then(data =>
          setState(previous => ({
            memberships: Array.isArray(data?.organizations) ? data.organizations : [],
            version: previous.version + 1,
          }))
        )
        .catch(error => {
          log.api.error('Error loading organizations', { error: error.message });
          setState(previous => ({ memberships: [], version: previous.version + 1 }));
          notify('danger', t(error.messageKey || 'errors.request'));
        }),
    [notify, organizations, t]
  );

  useEffect(() => {
    load();
  }, [load]);

  return { ...state, load };
};

/**
 * The organization console in its identity-provider form over the active
 * organization's record from `GET /api/user/organizations`: the shared
 * record grown by the issuer's fields and the address block (editable
 * while `can_rename`, the access mode while `can_manage`, the default role
 * while `is_owner`), Convert to a team on a personal organization, Leave
 * and Delete, the members with the owner's role select (disabled on the
 * last owner's own row) and Remove while `can_manage`, a managed row's
 * source in place of its controls, and the invitations while the host
 * advertises `invitations`; no tab strip while the tabs number one;
 * every action re-fetches the record.
 */
const IssuerOrgConsole = ({ session, events, organizations, org, activeOrgKey, places = null }) => {
  const { t } = useTranslation();
  const notify = useNotify();
  const status = useStatus();
  const { memberships, version, load } = useMemberships(organizations);
  const [tab, setTab] = useState('organization');
  const [pending, setPending] = useState(null);
  const [showConvert, setShowConvert] = useState(false);
  const placesKey = usePlacesKey(places);
  const currentUserId = session.restore()?.user?.id;

  useEffect(() => {
    document.title = t('orgConsole.pageTitle');
  }, [t]);

  const current = memberships?.find(entry => entry.uuid === org) || null;
  const tabs = tabsFor(hasFeature(status, 'invitations') && Boolean(current?.can_manage));
  const members = Array.isArray(current?.members) ? current.members : [];
  const owners = ownerCount(members);
  const currentTab = tabs.some(entry => entry.key === tab) ? tab : 'organization';

  const reloadSession = async () => {
    await session.reload();
    events.emit('login');
  };

  const leftOrganization = async () => {
    localStorage.removeItem(activeOrgKey);
    await reloadSession();
    await load();
  };

  const act = async (call, done, afterward = load) => {
    try {
      await call();
      if (done) {
        notify('success', t(done));
      }
      await afterward();
    } catch (error) {
      notify('danger', t(errorKeys(error)));
    }
  };

  const confirm = (title, message, run) => setPending({ title, message, run });

  const setRole = (member, role) =>
    act(
      () => organizations.memberRole(org, member.user_id, role),
      'orgConsole.messages.operationSuccessful'
    );

  const removeMember = member =>
    confirm(t('orgConsole.buttons.removeFromOrg'), confirmMessage(t), () =>
      act(() => organizations.removeMember(org, member.user_id), 'orgConsole.users.removeSuccess')
    );

  const revokeInvite = invite =>
    confirm(t('orgConsole.revokeInvite'), confirmMessage(t), () =>
      act(
        () => organizations.removeInvitation(org, invite.id),
        'orgConsole.messages.operationSuccessful'
      )
    );

  const leave = () =>
    confirm(
      t('orgConsole.leave'),
      t('orgConsole.leaveBody', { name: current?.name || '', keyword: t('pages.confirm.keyword') }),
      () => act(() => organizations.leave(org), 'orgConsole.left', leftOrganization)
    );

  const remove = () =>
    confirm(
      t('orgConsole.delete'),
      t('orgConsole.deleteBody', {
        name: current?.name || '',
        keyword: t('pages.confirm.keyword'),
      }),
      () => act(() => organizations.remove(org), 'orgConsole.deleted', leftOrganization)
    );

  const regenerate = () =>
    act(() => organizations.regenerateInviteCode(org), 'organizations.regenerated');

  if (memberships === null) {
    return <p>{t('loading')}</p>;
  }

  if (!current) {
    return (
      <div className="list row">
        <div className="alert alert-warning mt-3" role="alert">
          {t('orgConsole.noActiveOrganization')}
        </div>
      </div>
    );
  }

  return (
    <div className="list row">
      <ConsoleHeader
        org={current}
        owners={owners}
        onRegenerate={regenerate}
        onConvert={() => setShowConvert(true)}
        onLeave={leave}
        onDelete={remove}
      />

      <ConsoleTabs tabs={tabs} currentTab={currentTab} onPick={setTab} />

      <div className="tab-content mt-3">
        {currentTab === 'organization' ? (
          <RecordTab
            key={version}
            org={current}
            organizations={organizations}
            onSaved={load}
            placesKey={placesKey}
          />
        ) : null}
        {currentTab === 'members' ? (
          <>
            <h5>
              {t('orgConsole.tabs.members')}{' '}
              <span className="badge bg-secondary">{members.length}</span>
            </h5>
            <MethodList empty={t('orgConsole.noMembers')}>
              {members.map(member => (
                <MemberRow
                  key={member.user_id}
                  member={member}
                  org={current}
                  currentUserId={currentUserId}
                  owners={owners}
                  onRole={setRole}
                  onRemove={removeMember}
                />
              ))}
            </MethodList>
          </>
        ) : null}
        {currentTab === 'invitations' ? (
          <InvitationsTab
            org={current}
            organizations={organizations}
            onChanged={load}
            onRevoke={revokeInvite}
          />
        ) : null}
      </div>

      <ConfirmModal
        show={pending !== null}
        handleClose={() => setPending(null)}
        handleConfirm={() => pending?.run()}
        title={pending?.title || ''}
        message={pending?.message || ''}
      />
      <ConvertDialog
        show={showConvert}
        org={current}
        organizations={organizations}
        onHide={() => setShowConvert(false)}
        onDone={async () => {
          await reloadSession();
          await load();
        }}
      />
    </div>
  );
};

IssuerOrgConsole.propTypes = {
  session: PropTypes.shape({
    restore: PropTypes.func.isRequired,
    reload: PropTypes.func.isRequired,
  }).isRequired,
  events: PropTypes.shape({ emit: PropTypes.func.isRequired }).isRequired,
  organizations: issuerOrganizationsShape.isRequired,
  org: PropTypes.string.isRequired,
  activeOrgKey: PropTypes.string.isRequired,
  places: PropTypes.func,
};

export default IssuerOrgConsole;
