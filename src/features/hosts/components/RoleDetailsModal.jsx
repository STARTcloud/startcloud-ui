import PropTypes from 'prop-types';
import { Modal } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';

import RecordRows from '../../../components/common/RecordRows';

const PROFILE_SHELL = '/bin/pfsh';

const listOf = value => (Array.isArray(value) ? value : []);

const Badges = ({ items, tone, t }) =>
  items.length > 0 ? (
    <span className="d-flex flex-wrap gap-1">
      {items.map(item => (
        <span key={item} className={`badge text-bg-${tone}`}>
          {item}
        </span>
      ))}
    </span>
  ) : (
    <span className="text-muted">{t('host.roleDetailsModal.none')}</span>
  );

Badges.propTypes = {
  items: PropTypes.arrayOf(PropTypes.string).isRequired,
  tone: PropTypes.string.isRequired,
  t: PropTypes.func.isRequired,
};

const orWord = (value, t) =>
  value || <span className="text-muted">{t('host.roleDetailsModal.notAvailable')}</span>;

/**
 * The details of one role, hyperweaver-ui's dialog as a list dialog of
 * the pages contract: the name, the comment, the shell and the home,
 * the authorizations and the profiles as badges, the notes on how
 * roles work and on assigning them, and the note on the shell, the
 * profile shell recommended.
 */
const RoleDetailsModal = ({ role, onClose }) => {
  const { t } = useTranslation();
  return (
    <Modal show onHide={onClose} dialogClassName="list-modal" scrollable data-dialog="role-details">
      <Modal.Header closeButton>
        <Modal.Title as="h5">
          {t('host.roleDetailsModal.title', { rolename: role.rolename })}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <h6 className="fw-bold">{t('host.roleDetailsModal.basicInformation')}</h6>
        <RecordRows
          rows={[
            {
              key: 'name',
              label: t('host.roleDetailsModal.roleName'),
              value: <code>{role.rolename}</code>,
            },
            {
              key: 'comment',
              label: t('host.roleDetailsModal.comment'),
              value: orWord(role.comment, t),
            },
            {
              key: 'shell',
              label: t('host.roleDetailsModal.shell'),
              value: role.shell ? <code>{role.shell}</code> : orWord('', t),
            },
            {
              key: 'home',
              label: t('host.roleDetailsModal.homeDirectory'),
              value: role.home ? <code>{role.home}</code> : orWord('', t),
            },
          ]}
        />
        <h6 className="fw-bold">{t('host.roleDetailsModal.rbacConfiguration')}</h6>
        <RecordRows
          rows={[
            {
              key: 'authorizations',
              label: t('host.roleDetailsModal.authorizations'),
              value: <Badges items={listOf(role.authorizations)} tone="info" t={t} />,
            },
            {
              key: 'profiles',
              label: t('host.roleDetailsModal.profiles'),
              value: <Badges items={listOf(role.profiles)} tone="primary" t={t} />,
            },
          ]}
        />
        <h6 className="fw-bold">{t('host.roleDetailsModal.roleUsage')}</h6>
        <div className="alert alert-secondary" role="note">
          <p className="mb-1">
            <strong>{t('host.roleDetailsModal.howRolesWork')}</strong>
          </p>
          <ul className="mb-0">
            <li>{t('host.roleDetailsModal.rolesAreSpecialAccounts')}</li>
            <li>{t('host.roleDetailsModal.usersCanBeGrantedAbility')}</li>
            <li>{t('host.roleDetailsModal.whenUserAssumesRole')}</li>
            <li>{t('host.roleDetailsModal.rolesTypicallyUseProfileShell')}</li>
            <li>{t('host.roleDetailsModal.usersMustBeExplicitlyGranted')}</li>
          </ul>
        </div>
        <div className="alert alert-info" role="note">
          <p className="mb-1">
            <strong>{t('host.roleDetailsModal.assigningRolesToUsers')}</strong>
          </p>
          <p className="mb-0">
            {t('host.roleDetailsModal.toAllowUsersToAssumeThisRole', { rolename: role.rolename })}
          </p>
        </div>
        {role.shell ? (
          <div className="alert alert-warning mb-0" role="note">
            <p className="mb-1">
              <strong>{t('host.roleDetailsModal.shellConfiguration')}</strong>
            </p>
            <p className="mb-0">
              {t('host.roleDetailsModal.thisRoleUses', { shell: role.shell })}{' '}
              {t(
                role.shell === PROFILE_SHELL
                  ? 'host.roleDetailsModal.recommendedProfileShell'
                  : 'host.roleDetailsModal.considerUsingProfileShell'
              )}
            </p>
          </div>
        ) : null}
      </Modal.Body>
    </Modal>
  );
};

RoleDetailsModal.propTypes = {
  role: PropTypes.shape({
    rolename: PropTypes.string.isRequired,
    comment: PropTypes.string,
    shell: PropTypes.string,
    home: PropTypes.string,
    authorizations: PropTypes.arrayOf(PropTypes.string),
    profiles: PropTypes.arrayOf(PropTypes.string),
  }).isRequired,
  onClose: PropTypes.func.isRequired,
};

export default RoleDetailsModal;
