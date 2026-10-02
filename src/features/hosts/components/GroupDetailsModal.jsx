import PropTypes from 'prop-types';
import { Modal } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { FaUser } from 'react-icons/fa6';

import RecordRows from '../../../components/common/RecordRows';
import { isSystemGroup } from '../utils/manage';

/**
 * The details of one group, hyperweaver-ui's dialog as a list dialog
 * of the pages contract: the name, the gid, the type and the member
 * count, the members as badges or the no members tip, the membership
 * notes, and the warning of a system group.
 */
const GroupDetailsModal = ({ group, onClose }) => {
  const { t } = useTranslation();
  const system = isSystemGroup(group);
  const members = Array.isArray(group.members) ? group.members : [];
  return (
    <Modal
      show
      onHide={onClose}
      dialogClassName="list-modal"
      scrollable
      data-dialog="group-details"
    >
      <Modal.Header closeButton>
        <Modal.Title as="h5">
          {t('host.groupDetailsModal.title', { groupname: group.groupname })}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <h6 className="fw-bold">{t('host.groupDetailsModal.basicInfo')}</h6>
        <RecordRows
          rows={[
            {
              key: 'name',
              label: t('host.groupDetailsModal.groupName'),
              value: <code>{group.groupname}</code>,
            },
            {
              key: 'gid',
              label: t('host.groupDetailsModal.groupId'),
              value: <code>{group.gid}</code>,
            },
            {
              key: 'type',
              label: t('host.groupDetailsModal.groupType'),
              value: (
                <span className={`badge text-bg-${system ? 'info' : 'success'}`}>
                  {t(
                    system
                      ? 'host.groupDetailsModal.systemGroup'
                      : 'host.groupDetailsModal.regularGroup'
                  )}
                </span>
              ),
            },
            {
              key: 'count',
              label: t('host.groupDetailsModal.memberCount'),
              value: (
                <span className="badge text-bg-secondary">
                  {t('host.groupDetailsModal.memberCountDisplay', { count: members.length })}
                </span>
              ),
            },
          ]}
        />
        <h6 className="fw-bold">{t('host.groupDetailsModal.groupMembers')}</h6>
        {members.length > 0 ? (
          <div className="d-flex flex-wrap gap-1 mb-3">
            {members.map(member => (
              <span key={member} className="badge text-bg-secondary">
                <FaUser className="me-1" aria-hidden="true" />
                {member}
              </span>
            ))}
          </div>
        ) : (
          <div className="alert alert-info" role="status">
            <p className="mb-1">{t('host.groupDetailsModal.noMembers')}</p>
            <p className="mb-0">
              <strong>{t('host.groupDetailsModal.tip')}:</strong>{' '}
              {t('host.groupDetailsModal.tipText')}
            </p>
          </div>
        )}
        <h6 className="fw-bold">{t('host.groupDetailsModal.groupManagement')}</h6>
        <div className="alert alert-secondary" role="note">
          <p className="mb-1">
            <strong>{t('host.groupDetailsModal.managingMembership')}:</strong>
          </p>
          <ul className="mb-0">
            <li>{t('host.groupDetailsModal.addUsersText')}</li>
            <li>{t('host.groupDetailsModal.removeUsersText')}</li>
            <li>{t('host.groupDetailsModal.primaryGroupText')}</li>
          </ul>
        </div>
        {system ? (
          <div className="alert alert-warning mb-0" role="alert">
            <p className="mb-1">
              <strong>{t('host.groupDetailsModal.systemGroupWarning')}:</strong>
            </p>
            <p className="mb-0">{t('host.groupDetailsModal.systemGroupWarningText')}</p>
          </div>
        ) : null}
      </Modal.Body>
    </Modal>
  );
};

GroupDetailsModal.propTypes = {
  group: PropTypes.shape({
    groupname: PropTypes.string.isRequired,
    gid: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    members: PropTypes.arrayOf(PropTypes.string),
  }).isRequired,
  onClose: PropTypes.func.isRequired,
};

export default GroupDetailsModal;
