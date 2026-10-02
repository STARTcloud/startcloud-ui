import PropTypes from 'prop-types';
import { Modal } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';

import RecordRows from '../../../components/common/RecordRows';
import { isSystemUser } from '../utils/manage';

const ACCOUNT_TONES = { active: 'success', locked: 'danger' };

const PASSWORD_TONES = { set: 'success', expired: 'warning' };

const Badges = ({ items, tone, mono = false }) => {
  const { t } = useTranslation();
  if (items.length === 0) {
    return <span className="text-muted">{t('host.userDetailsModal.none')}</span>;
  }
  if (mono) {
    return items.map(item => (
      <div key={item} className="font-monospace small">
        {item}
      </div>
    ));
  }
  return (
    <span className="d-flex flex-wrap gap-1">
      {items.map(item => (
        <span key={item} className={`badge text-bg-${tone}`}>
          {item}
        </span>
      ))}
    </span>
  );
};

Badges.propTypes = {
  items: PropTypes.arrayOf(PropTypes.string).isRequired,
  tone: PropTypes.string.isRequired,
  mono: PropTypes.bool,
};

const listRow = ({ key, labelKey, items, tone, mono, t }) =>
  items
    ? [{ key, label: t(labelKey), value: <Badges items={items} tone={tone} mono={mono} /> }]
    : [];

const wordRow = ({ key, labelKey, value, t, render = null }) =>
  value ? [{ key, label: t(labelKey), value: render ? render(value) : value }] : [];

const attributeRows = (attributes, t) => [
  ...listRow({
    key: 'groups',
    labelKey: 'host.userDetailsModal.secondaryGroups',
    items: attributes.groups,
    tone: 'secondary',
    t,
  }),
  ...listRow({
    key: 'authorizations',
    labelKey: 'host.userDetailsModal.authorizations',
    items: attributes.authorizations,
    tone: 'info',
    mono: true,
    t,
  }),
  ...listRow({
    key: 'profiles',
    labelKey: 'host.userDetailsModal.profiles',
    items: attributes.profiles,
    tone: 'primary',
    t,
  }),
  ...listRow({
    key: 'roles',
    labelKey: 'host.userDetailsModal.roles',
    items: attributes.roles,
    tone: 'warning',
    t,
  }),
  ...wordRow({
    key: 'project',
    labelKey: 'host.userDetailsModal.project',
    value: attributes.project,
    t,
    render: value => <code>{value}</code>,
  }),
  ...wordRow({
    key: 'account',
    labelKey: 'host.userDetailsModal.accountStatus',
    value: attributes.account_status,
    t,
    render: value => (
      <span className={`badge text-bg-${ACCOUNT_TONES[value] || 'warning'}`}>{value}</span>
    ),
  }),
  ...wordRow({
    key: 'password',
    labelKey: 'host.userDetailsModal.passwordStatus',
    value: attributes.password_status,
    t,
    render: value => (
      <span className={`badge text-bg-${PASSWORD_TONES[value] || 'secondary'}`}>{value}</span>
    ),
  }),
  ...wordRow({
    key: 'lastLogin',
    labelKey: 'host.userDetailsModal.lastLogin',
    value: attributes.last_login,
    t,
    render: value => <code>{value}</code>,
  }),
];

const orWord = (value, t) =>
  value || <span className="text-muted">{t('host.userDetailsModal.notAvailable')}</span>;

/**
 * The details of one user, hyperweaver-ui's dialog as a list dialog of
 * the pages contract: the basic information of the row, the account's
 * kind as a badge, then the RBAC attributes
 * `GET system/users/{name}/attributes` answered, the groups, the
 * authorizations, the profiles, the roles, the project, the account and
 * password status and the last login, each where the agent answered
 * it, and the raw attributes as a block.
 */
const UserDetailsModal = ({ user, onClose }) => {
  const { t } = useTranslation();
  const system = isSystemUser(user);
  const attributes = user.attributes || null;
  return (
    <Modal show onHide={onClose} dialogClassName="list-modal" scrollable data-dialog="user-details">
      <Modal.Header closeButton>
        <Modal.Title as="h5">
          {t('host.userDetailsModal.title', { username: user.username })}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <h6 className="fw-bold">{t('host.userDetailsModal.basicInformation')}</h6>
        <RecordRows
          rows={[
            {
              key: 'username',
              label: t('host.userDetailsModal.username'),
              value: <code>{user.username}</code>,
            },
            { key: 'uid', label: t('host.userDetailsModal.uid'), value: <code>{user.uid}</code> },
            { key: 'gid', label: t('host.userDetailsModal.gid'), value: <code>{user.gid}</code> },
            {
              key: 'type',
              label: t('host.userDetailsModal.userType'),
              value: (
                <span className={`badge text-bg-${system ? 'info' : 'success'}`}>
                  {t(
                    system
                      ? 'host.userDetailsModal.systemUser'
                      : 'host.userDetailsModal.regularUser'
                  )}
                </span>
              ),
            },
            {
              key: 'comment',
              label: t('host.userDetailsModal.comment'),
              value: orWord(user.comment, t),
            },
            {
              key: 'home',
              label: t('host.userDetailsModal.homeDirectory'),
              value: user.home ? <code>{user.home}</code> : orWord('', t),
            },
            {
              key: 'shell',
              label: t('host.userDetailsModal.shell'),
              value: user.shell ? <code>{user.shell}</code> : orWord('', t),
            },
          ]}
        />
        <h6 className="fw-bold">{t('host.userDetailsModal.rbacAttributes')}</h6>
        {attributes ? (
          <>
            <RecordRows rows={attributeRows(attributes, t)} />
            <h6 className="fw-bold">{t('host.userDetailsModal.rawAttributes')}</h6>
            <pre className="bg-body-tertiary p-3 small mb-0">
              {JSON.stringify(attributes, null, 2)}
            </pre>
          </>
        ) : (
          <div className="alert alert-info mb-0" role="status">
            {t('host.userDetailsModal.attributesNotLoaded')}
          </div>
        )}
      </Modal.Body>
    </Modal>
  );
};

UserDetailsModal.propTypes = {
  user: PropTypes.shape({
    username: PropTypes.string,
    uid: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    gid: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    comment: PropTypes.string,
    home: PropTypes.string,
    shell: PropTypes.string,
    attributes: PropTypes.shape({
      groups: PropTypes.arrayOf(PropTypes.string),
      authorizations: PropTypes.arrayOf(PropTypes.string),
      profiles: PropTypes.arrayOf(PropTypes.string),
      roles: PropTypes.arrayOf(PropTypes.string),
      project: PropTypes.string,
      account_status: PropTypes.string,
      password_status: PropTypes.string,
      last_login: PropTypes.string,
    }),
  }).isRequired,
  onClose: PropTypes.func.isRequired,
};

export default UserDetailsModal;
