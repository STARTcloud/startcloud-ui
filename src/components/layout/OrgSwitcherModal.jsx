import PropTypes from 'prop-types';
import { useEffect, useRef, useState } from 'react';
import { Modal } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { FaBuilding, FaCheck, FaCrown, FaLayerGroup } from 'react-icons/fa6';

import { useCssVar } from '../../hooks/useCssVar';
import { gravatarProfile } from '../../utils/gravatar';
import { isLive } from '../../utils/membership';
import MarkdownText from '../common/MarkdownText';

const ROLE_CLASSES = {
  OWNER: 'bg-danger',
  ADMIN: 'bg-warning',
  MEMBER: 'bg-secondary',
  GUEST: 'bg-secondary',
};

export const organizationShape = PropTypes.shape({
  uuid: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  displayName: PropTypes.string,
  description: PropTypes.string,
  roles: PropTypes.arrayOf(PropTypes.string),
  primary: PropTypes.bool,
  personal: PropTypes.bool,
  logo: PropTypes.string,
  emailHash: PropTypes.string,
  suspended: PropTypes.bool,
  membershipSuspended: PropTypes.bool,
});

const useOrgGravatar = (emailHash, wanted) => {
  const [gravatar, setGravatar] = useState(null);

  useEffect(() => {
    if (!wanted || !emailHash) {
      return undefined;
    }
    const controller = new AbortController();
    gravatarProfile(emailHash, controller.signal).then(profile => {
      setGravatar({ emailHash, url: profile?.avatar_url || '' });
    });
    return () => {
      controller.abort();
    };
  }, [emailHash, wanted]);

  return gravatar && gravatar.emailHash === emailHash ? gravatar.url : '';
};

export const OrgLogo = ({ org, size = 20, className = 'rounded-circle me-2', fallback = null }) => {
  const [failed, setFailed] = useState([]);
  const logo = org.logo && !failed.includes(org.logo) ? org.logo : '';
  const gravatar = useOrgGravatar(org.emailHash || '', !logo);
  const src = logo || (gravatar && !failed.includes(gravatar) ? gravatar : '');
  if (!src) {
    return fallback || <FaBuilding className="logo-md icon-with-margin" aria-hidden />;
  }
  return (
    <img
      src={src}
      alt=""
      width={size}
      height={size}
      className={className}
      onError={() => setFailed(previous => [...previous, src])}
    />
  );
};

OrgLogo.propTypes = {
  org: PropTypes.shape({ logo: PropTypes.string, emailHash: PropTypes.string }).isRequired,
  size: PropTypes.number,
  className: PropTypes.string,
  fallback: PropTypes.node,
};

/**
 * The organization's initial in a circle, the mark an organization with
 * no logo and no Gravatar draws where a host's own mark would say the
 * wrong name: the first letter of its display name or its name, upper
 * case, in a muted disc `size` pixels across, the size reaching the
 * stylesheet's `org-initial` class as `--org-initial-size`.
 */
export const OrgInitial = ({ org, size = 20, className = '' }) => {
  const disc = useRef(null);
  useCssVar(disc, '--org-initial-size', `${size}px`);
  return (
    <span
      ref={disc}
      className={className ? `org-initial ${className}` : 'org-initial'}
      aria-hidden="true"
      data-initial
    >
      {(org.displayName || org.name || '').charAt(0).toUpperCase()}
    </span>
  );
};

OrgInitial.propTypes = {
  org: PropTypes.shape({ name: PropTypes.string, displayName: PropTypes.string }).isRequired,
  size: PropTypes.number,
  className: PropTypes.string,
};

export const byPersonalLastThenName = (a, b) =>
  Number(Boolean(a.personal)) - Number(Boolean(b.personal)) ||
  (a.name || '').localeCompare(b.name || '');

const OrgRow = ({ org, active, orgMark, onPick }) => {
  const { t } = useTranslation();
  const live = isLive(org);
  return (
    <button
      type="button"
      className={`list-group-item list-group-item-action d-flex justify-content-between align-items-center ${
        active && live ? 'border-primary border-2' : ''
      }`}
      disabled={!live}
      onClick={() => onPick(org.uuid)}
    >
      <div className={live ? undefined : 'opacity-50'}>
        <div className="d-flex align-items-center">
          <OrgLogo org={org} fallback={orgMark} />
          <div>
            <div className="fw-bold">{org.displayName || org.name}</div>
            <MarkdownText text={org.description} className="small text-muted" />
          </div>
        </div>
      </div>
      <div className="d-flex align-items-center">
        {org.suspended ? (
          <span className="badge bg-warning text-dark me-2" data-badge="suspended">
            {t('admin.organizations.suspended')}
          </span>
        ) : null}
        {org.membershipSuspended ? (
          <span className="badge bg-warning text-dark me-2" data-badge="membership-suspended">
            {t('organizations.membershipSuspended')}
          </span>
        ) : null}
        {(org.roles || []).map(role => (
          <span key={role} className={`badge ${ROLE_CLASSES[role] || 'bg-secondary'} me-2`}>
            {t(`roles.${role.toLowerCase()}`, { defaultValue: role })}
          </span>
        ))}
        {org.primary ? (
          <FaCrown
            className="text-warning me-2"
            title={t('orgSwitcher.primaryOrg')}
            aria-label={t('orgSwitcher.primaryOrg')}
          />
        ) : null}
        {active && live ? <FaCheck className="text-success" /> : null}
      </div>
    </button>
  );
};

OrgRow.propTypes = {
  org: organizationShape.isRequired,
  active: PropTypes.bool.isRequired,
  orgMark: PropTypes.node,
  onPick: PropTypes.func.isRequired,
};

/**
 * The switcher's All organizations row, the first row on a host that
 * narrows by organization: the layers glyph and the words, the primary
 * border and the green check while the choice is All, picking it the
 * empty uuid.
 */
const AllRow = ({ active, onPick }) => {
  const { t } = useTranslation();
  return (
    <button
      type="button"
      className={`list-group-item list-group-item-action d-flex justify-content-between align-items-center ${
        active ? 'border-primary border-2' : ''
      }`}
      onClick={() => onPick('')}
    >
      <div className="d-flex align-items-center">
        <FaLayerGroup className="logo-md icon-with-margin" aria-hidden />
        <div className="fw-bold">{t('orgSwitcher.allOrganizations')}</div>
      </div>
      {active ? <FaCheck className="text-success" /> : null}
    </button>
  );
};

AllRow.propTypes = {
  active: PropTypes.bool.isRequired,
  onPick: PropTypes.func.isRequired,
};

/**
 * The frame every switcher modal of the navbar contract draws in: the
 * list dialog with its glyph and title, the spinner while `loading`, the
 * danger alert `loadError` while `loadFailed`, the info alert `emptyText`
 * while `empty` and nothing failed, and `children`, the rows, while
 * nothing loads and the list is not empty.
 */
export const SwitcherModal = ({
  show,
  onHide,
  icon,
  title,
  loading = false,
  loadFailed = false,
  loadError,
  empty = false,
  emptyText,
  children,
}) => {
  const { t } = useTranslation();
  return (
    <Modal show={show} onHide={onHide} dialogClassName="chrome-modal list-modal">
      <Modal.Header closeButton>
        <Modal.Title as="h5">
          {icon}
          {title}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {loading ? (
          <div className="text-center">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">{t('loading')}</span>
            </div>
          </div>
        ) : null}
        {!loading && loadFailed ? (
          <div className="alert alert-danger" role="alert">
            {loadError}
          </div>
        ) : null}
        {!loading && !loadFailed && empty ? (
          <div className="alert alert-info">{emptyText}</div>
        ) : null}
        {!loading && !empty ? children : null}
      </Modal.Body>
    </Modal>
  );
};

SwitcherModal.propTypes = {
  show: PropTypes.bool.isRequired,
  onHide: PropTypes.func.isRequired,
  icon: PropTypes.node.isRequired,
  title: PropTypes.string.isRequired,
  loading: PropTypes.bool,
  loadFailed: PropTypes.bool,
  loadError: PropTypes.string.isRequired,
  empty: PropTypes.bool,
  emptyText: PropTypes.string.isRequired,
  children: PropTypes.node.isRequired,
};

/**
 * The organization switcher modal of the navbar contract: one row per
 * membership, personal organizations last, each its logo, its display
 * name where the membership carries one and its name otherwise, its
 * description, role badges, the crown on the primary and the check on
 * the active one; a membership whose organization or whose own seat is
 * suspended is drawn dimmed with its Suspended or "Your membership is
 * suspended" badge, is disabled and is never the active one; with
 * `allOrganizations`, on a host that narrows by
 * organization, the All organizations row first, active while
 * `activeUuid` is empty. Picking a row answers `onPick` with its uuid,
 * the empty uuid for All, and never navigates.
 */
export const OrgSwitcherModal = ({
  show,
  onHide,
  organizations,
  activeUuid = '',
  allOrganizations = false,
  onPick,
  loading = false,
  loadFailed = false,
  orgMark = null,
}) => {
  const { t } = useTranslation();
  const rows = [...organizations].sort(byPersonalLastThenName);

  return (
    <SwitcherModal
      show={show}
      onHide={onHide}
      icon={<FaBuilding className="me-2" />}
      title={t('orgSwitcher.title')}
      loading={loading}
      loadFailed={loadFailed}
      loadError={t('orgSwitcher.loadError')}
      empty={rows.length === 0}
      emptyText={t('orgSwitcher.noOrgsFound')}
    >
      <div className="list-group">
        {allOrganizations ? <AllRow active={activeUuid === ''} onPick={onPick} /> : null}
        {rows.map(org => (
          <OrgRow
            key={org.uuid}
            org={org}
            active={org.uuid === activeUuid}
            orgMark={orgMark}
            onPick={onPick}
          />
        ))}
      </div>
    </SwitcherModal>
  );
};

OrgSwitcherModal.propTypes = {
  show: PropTypes.bool.isRequired,
  onHide: PropTypes.func.isRequired,
  organizations: PropTypes.arrayOf(organizationShape).isRequired,
  activeUuid: PropTypes.string,
  allOrganizations: PropTypes.bool,
  onPick: PropTypes.func.isRequired,
  loading: PropTypes.bool,
  loadFailed: PropTypes.bool,
  orgMark: PropTypes.node,
};
