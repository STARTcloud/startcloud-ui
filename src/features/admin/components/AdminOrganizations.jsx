import PropTypes from 'prop-types';
import { useState, useEffect } from 'react';
import { Modal } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

import ConfirmModal from '../../../components/common/ConfirmModal';
import Field from '../../../components/common/Field';
import FormErrorSummary from '../../../components/common/FormErrorSummary';
import UserCard from '../../../components/common/UserCard';
import { useNotify } from '../../../contexts/NoticeContext';
import { formRulesShape, useFormRules } from '../../../hooks/useFormRules';
import { useNavbarSearchBinding } from '../../../hooks/useSearchBinding';
import { responseMessage } from '../../../utils/responseMessage';
import { adminShape } from '../utils/adminShape';

const NO_FILTERS = [];
const clearNothing = () => undefined;

const RENAME_SCHEMA = {
  required: ['organization'],
  properties: { organization: { type: 'string' } },
};
const RENAME_LABELS = { organization: 'orgUserManager.rename.name' };
const EMPTY_RENAME = { organization: '' };

const EDIT_SCHEMA = {
  properties: {
    org_code: { type: 'string' },
    email: { type: 'string' },
    description: { type: 'string' },
    accessMode: { type: 'string' },
    defaultRole: { type: 'string' },
  },
};
const EDIT_LABELS = {
  org_code: 'orgUserManager.editModal.orgCode',
  email: 'orgUserManager.editModal.orgEmail',
  description: 'orgUserManager.editModal.description',
  accessMode: 'orgUserManager.editModal.accessMode',
  defaultRole: 'orgUserManager.editModal.defaultRole',
};
const EMPTY_EDIT = {
  org_code: '',
  email: '',
  description: '',
  accessMode: 'private',
  defaultRole: 'member',
};

const editOf = details => ({
  org_code: details.org_code || '',
  email: details.email || '',
  description: details.description || '',
  accessMode: details.access_mode || 'private',
  defaultRole: details.default_role || 'member',
});

const EditOrganizationModal = ({ organization, draft, rules, onChange, onClose, onSave }) => {
  const { t } = useTranslation();
  return (
    <Modal show={Boolean(organization)} onHide={onClose}>
      <form onSubmit={onSave} noValidate>
        <Modal.Header closeButton>
          <Modal.Title as="h5">
            {t('orgUserManager.editModal.title', { orgName: organization?.name || '' })}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <FormErrorSummary errors={rules.summary} />
          <Field
            id={rules.idFor('org_code')}
            label={t('orgUserManager.editModal.orgCode')}
            hint={t('orgUserManager.editModal.orgCodeHint')}
            error={rules.errors.org_code || ''}
          >
            {aria => (
              <input
                {...aria}
                type="text"
                className="form-control"
                value={draft.org_code}
                onChange={e => onChange('org_code', e.target.value.toUpperCase())}
                onBlur={() => rules.onBlur('org_code')}
              />
            )}
          </Field>
          <Field
            id={rules.idFor('email')}
            label={t('orgUserManager.editModal.orgEmail')}
            hint={t('orgUserManager.editModal.orgEmailHint')}
            error={rules.errors.email || ''}
          >
            {aria => (
              <input
                {...aria}
                type="email"
                className="form-control"
                value={draft.email}
                onChange={e => onChange('email', e.target.value)}
                onBlur={() => rules.onBlur('email')}
              />
            )}
          </Field>
          <Field
            id={rules.idFor('description')}
            label={t('orgUserManager.editModal.description')}
            error={rules.errors.description || ''}
          >
            {aria => (
              <textarea
                {...aria}
                className="form-control"
                value={draft.description}
                onChange={e => onChange('description', e.target.value)}
                onBlur={() => rules.onBlur('description')}
                rows="3"
              />
            )}
          </Field>
          <Field
            id={rules.idFor('accessMode')}
            label={t('orgUserManager.editModal.accessMode')}
            hint={t('orgUserManager.editModal.accessModeHint')}
            error={rules.errors.accessMode || ''}
          >
            {aria => (
              <select
                {...aria}
                className="form-select"
                value={draft.accessMode}
                onChange={e => onChange('accessMode', e.target.value)}
                onBlur={() => rules.onBlur('accessMode')}
              >
                <option value="private">{t('orgUserManager.editModal.accessModes.private')}</option>
                <option value="invite_only">
                  {t('orgUserManager.editModal.accessModes.inviteOnly')}
                </option>
                <option value="request_to_join">
                  {t('orgUserManager.editModal.accessModes.requestToJoin')}
                </option>
              </select>
            )}
          </Field>
          <Field
            id={rules.idFor('defaultRole')}
            label={t('orgUserManager.editModal.defaultRole')}
            hint={t('orgUserManager.editModal.defaultRoleHint')}
            error={rules.errors.defaultRole || ''}
          >
            {aria => (
              <select
                {...aria}
                className="form-select"
                value={draft.defaultRole}
                onChange={e => onChange('defaultRole', e.target.value)}
                onBlur={() => rules.onBlur('defaultRole')}
              >
                <option value="member">{t('roles.member')}</option>
                <option value="admin">{t('roles.admin')}</option>
              </select>
            )}
          </Field>
        </Modal.Body>
        <Modal.Footer>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            {t('admin.buttons.cancel')}
          </button>
          <button type="submit" className="btn btn-primary">
            {t('admin.buttons.save')}
          </button>
        </Modal.Footer>
      </form>
    </Modal>
  );
};

EditOrganizationModal.propTypes = {
  organization: PropTypes.shape({ name: PropTypes.string.isRequired }),
  draft: PropTypes.shape({
    org_code: PropTypes.string.isRequired,
    email: PropTypes.string.isRequired,
    description: PropTypes.string.isRequired,
    accessMode: PropTypes.string.isRequired,
    defaultRole: PropTypes.string.isRequired,
  }).isRequired,
  rules: formRulesShape.isRequired,
  onChange: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
};

const OrgTitle = ({ org, renaming, rename, rules, onNameChange, onRename, onCancel }) => {
  const { t } = useTranslation();
  if (renaming) {
    return (
      <form onSubmit={onRename} noValidate>
        <FormErrorSummary errors={rules.summary} />
        <Field
          id={rules.idFor('organization')}
          label={t('orgUserManager.rename.name')}
          error={rules.errors.organization || ''}
          className="mb-2"
        >
          {aria => (
            <input
              {...aria}
              type="text"
              className="form-control"
              value={rename.organization}
              onChange={e => onNameChange(e.target.value)}
              onBlur={() => rules.onBlur('organization')}
            />
          )}
        </Field>
        <button className="btn btn-success btn-sm" type="submit">
          {t('admin.buttons.save')}
        </button>
        <button className="btn btn-secondary btn-sm ms-2" type="button" onClick={onCancel}>
          {t('admin.buttons.cancel')}
        </button>
      </form>
    );
  }
  return (
    <Link to={`/${org.name}`} className="card-title">
      {org.org_code
        ? `${org.org_code} - ${org.display_name || org.name}`
        : org.display_name || org.name}
      {org.external_issuer && (
        <span className="badge bg-info ms-2" title={t('orgUserManager.ssoManagedHint')}>
          {t('orgUserManager.ssoManaged')}
        </span>
      )}
    </Link>
  );
};

OrgTitle.propTypes = {
  org: PropTypes.object.isRequired,
  renaming: PropTypes.bool.isRequired,
  rename: PropTypes.shape({ organization: PropTypes.string.isRequired }).isRequired,
  rules: formRulesShape.isRequired,
  onNameChange: PropTypes.func.isRequired,
  onRename: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
};

/**
 * The Organizations and users tab of the admin page: every organization
 * with its members as `UserCard` rows, searched from the navbar; edit,
 * rename, suspend, resume and delete on the organization, suspend, resume,
 * remove and delete on its members, every call through the app's `admin`
 * adapter, and a rename of the active organization stored under
 * `activeOrgKey` with the session refreshed.
 */
const AdminOrganizations = ({ session, activeOrgKey, admin }) => {
  const { t } = useTranslation();
  const notify = useNotify();
  const [organizations, setOrganizations] = useState([]);
  const [renamingId, setRenamingId] = useState(null);
  const [rename, setRename] = useState(EMPTY_RENAME);
  const [oldName, setOldName] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editingOrg, setEditingOrg] = useState(null);
  const [draft, setDraft] = useState(EMPTY_EDIT);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const current = session.restore();
  const currentUser = current ? current.user : null;
  const renameRules = useFormRules({
    formKey: 'organization',
    schema: RENAME_SCHEMA,
    values: rename,
    labels: RENAME_LABELS,
    idPrefix: 'rename',
  });
  const editRules = useFormRules({
    formKey: 'organization',
    schema: EDIT_SCHEMA,
    values: draft,
    labels: EDIT_LABELS,
    idPrefix: 'edit',
  });

  useEffect(() => {
    admin.organizationsWithUsers().then(setOrganizations, () => null);
  }, [admin]);

  const dropMember = (predicate, userId) =>
    setOrganizations(previous =>
      previous.map(org =>
        predicate(org) ? { ...org, members: org.members.filter(user => user.id !== userId) } : org
      )
    );

  const handleDeleteOrganization = organizationName => {
    admin
      .removeOrganization(organizationName)
      .then(() => {
        setOrganizations(previous => previous.filter(org => org.name !== organizationName));
      })
      .catch(() => notify('danger', t('admin.messages.deleteFailed')));
  };

  const handleDeleteUser = userId => {
    admin
      .removeUser(userId)
      .then(() => dropMember(() => true, userId))
      .catch(() => notify('danger', t('admin.messages.deleteFailed')));
  };

  const askDelete = item => {
    setItemToDelete(item);
    setShowDeleteModal(true);
  };

  const closeDelete = () => {
    setShowDeleteModal(false);
    setItemToDelete(null);
  };

  const confirmDelete = () => {
    if (!itemToDelete) {
      return;
    }
    if (itemToDelete.type === 'user') {
      handleDeleteUser(itemToDelete.id);
    } else if (itemToDelete.type === 'organization') {
      handleDeleteOrganization(itemToDelete.name);
    } else if (itemToDelete.type === 'user_remove') {
      admin
        .removeMember(itemToDelete.orgName, itemToDelete.id)
        .then(() => dropMember(org => org.name === itemToDelete.orgName, itemToDelete.id))
        .catch(() => notify('danger', t('orgConsole.users.removeError')));
    }
    closeDelete();
  };

  const handleSuspendOrResumeUser = (userId, isSuspended) => {
    const action = isSuspended ? admin.resumeUser(userId) : admin.suspendUser(userId);
    action
      .then(() => {
        setOrganizations(previous =>
          previous.map(org => ({
            ...org,
            members: org.members.map(user =>
              user.id === userId ? { ...user, suspended: !isSuspended } : user
            ),
          }))
        );
      })
      .catch(() => notify('danger', t('admin.messages.operationFailed')));
  };

  const handleSuspendOrResumeOrganization = (organizationName, isSuspended) => {
    const action = isSuspended
      ? admin.resumeOrganization(organizationName)
      : admin.suspendOrganization(organizationName);
    action
      .then(() => {
        setOrganizations(previous =>
          previous.map(org =>
            org.name === organizationName ? { ...org, suspended: !isSuspended } : org
          )
        );
      })
      .catch(() => notify('danger', t('admin.messages.operationFailed')));
  };

  const handleRenameOrganization = async e => {
    e.preventDefault();
    if (!renameRules.validateAll()) {
      return;
    }
    const newOrgName = rename.organization;

    try {
      await admin.updateOrganization(oldName, { organization: newOrgName });

      if (currentUser && currentUser.organization === oldName) {
        localStorage.setItem(activeOrgKey, newOrgName);
        await session.refresh();
      }

      setOrganizations(previous =>
        previous.map(org => (org.name === oldName ? { ...org, name: newOrgName } : org))
      );
      setRenamingId(null);
      setRename(EMPTY_RENAME);
      setOldName('');
      renameRules.reset();
      notify('success', t('orgUserManager.rename.success'));
    } catch (error) {
      if (!renameRules.applyServerErrors(error)) {
        notify('danger', t('orgUserManager.rename.error'));
      }
    }
  };

  const startRename = org => {
    setRenamingId(org.id);
    setRename({ organization: org.name });
    setOldName(org.name);
    renameRules.reset();
  };

  const openEdit = async org => {
    const details = await admin.organization(org.name);
    setEditingOrg(details);
    setDraft(editOf(details));
    editRules.reset();
  };

  const saveEdit = async e => {
    e.preventDefault();
    if (!editRules.validateAll()) {
      return;
    }
    try {
      await admin.updateOrganization(editingOrg.name, {
        organization: editingOrg.name,
        org_code: draft.org_code,
        email: draft.email,
        description: draft.description,
      });
      await admin.accessMode(editingOrg.name, draft.accessMode, draft.defaultRole);
      notify('success', t('orgUserManager.editModal.updateSuccess'));
      setEditingOrg(null);
    } catch (error) {
      if (!editRules.applyServerErrors(error)) {
        notify('danger', responseMessage(error, t('orgUserManager.editModal.updateError')));
      }
    }
  };

  const term = searchTerm.toLowerCase();
  const filteredOrganizations = organizations.filter(
    org =>
      !term ||
      org.name.toLowerCase().includes(term) ||
      (org.org_code && org.org_code.toLowerCase().includes(term))
  );

  useNavbarSearchBinding({
    query: searchTerm,
    onQueryChange: setSearchTerm,
    placeholder: t('orgUserManager.searchPlaceholder'),
    matched: filteredOrganizations.length,
    total: organizations.length,
    groups: NO_FILTERS,
    onClearFilters: clearNothing,
  });

  return (
    <>
      <div className="row">
        {filteredOrganizations.map(org => (
          <div className="col-md-6" key={org.id}>
            <div className="card mt-4">
              <div className="card-header d-flex justify-content-between align-items-center">
                <OrgTitle
                  org={org}
                  renaming={renamingId === org.id}
                  rename={rename}
                  rules={renameRules}
                  onNameChange={value => setRename({ organization: value })}
                  onRename={handleRenameOrganization}
                  onCancel={() => setRenamingId(null)}
                />
                <div>
                  <button
                    type="button"
                    className="btn btn-info btn-sm me-2"
                    onClick={() => openEdit(org)}
                  >
                    {t('admin.buttons.edit')}
                  </button>
                  {!org.external_issuer && (
                    <button
                      type="button"
                      className="btn btn-primary btn-sm me-2"
                      onClick={() => startRename(org)}
                    >
                      {t('admin.buttons.rename')}
                    </button>
                  )}
                  <button
                    type="button"
                    className={`btn btn-${org.suspended ? 'success' : 'warning'} btn-sm me-2`}
                    onClick={() => handleSuspendOrResumeOrganization(org.name, org.suspended)}
                  >
                    {org.suspended ? t('admin.buttons.resume') : t('admin.buttons.suspend')}
                  </button>
                  {!org.external_issuer && (
                    <button
                      type="button"
                      className="btn btn-danger btn-sm"
                      onClick={() => askDelete({ type: 'organization', name: org.name })}
                    >
                      {t('admin.buttons.delete')}
                    </button>
                  )}
                </div>
              </div>
              <div className="card-body">
                <p>{t('orgUserManager.totalBoxes', { count: org.totalBoxes })}</p>
                <div className="row">
                  {org.members.map(user => (
                    <UserCard
                      key={user.id}
                      user={user}
                      currentUser={currentUser}
                      orgRole={user.orgRole}
                      columnClass="col-12 col-xxl-6"
                      gravatarProfile={admin.gravatarProfile}
                      onSuspend={() => handleSuspendOrResumeUser(user.id, false)}
                      onResume={() => handleSuspendOrResumeUser(user.id, true)}
                      onRemoveFromOrg={
                        org.external_issuer
                          ? undefined
                          : () => askDelete({ type: 'user_remove', id: user.id, orgName: org.name })
                      }
                      onDelete={() => askDelete({ type: 'user', id: user.id })}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      <ConfirmModal
        show={showDeleteModal}
        handleClose={closeDelete}
        handleConfirm={confirmDelete}
      />
      <EditOrganizationModal
        organization={editingOrg}
        draft={draft}
        rules={editRules}
        onChange={(field, value) => setDraft(previous => ({ ...previous, [field]: value }))}
        onClose={() => setEditingOrg(null)}
        onSave={saveEdit}
      />
    </>
  );
};

AdminOrganizations.propTypes = {
  session: PropTypes.object.isRequired,
  activeOrgKey: PropTypes.string.isRequired,
  admin: adminShape.isRequired,
};

export default AdminOrganizations;
