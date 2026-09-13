import PropTypes from 'prop-types';
import { useState } from 'react';
import { Dropdown } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { FaRightToBracket, FaSliders, FaTicket } from 'react-icons/fa6';

import { useUnread } from '../../contexts/UnreadContext';

import FavoriteApps from './FavoriteApps';
import IdentityCard, { localProfileShape } from './IdentityCard';
import LogoutItem from './LogoutItem';
import NotificationsItem from './NotificationsItem';
import { notificationsAdapterShape, pushAdapterShape } from './NotificationsModal';
import { OrgLogo, OrgSwitcherModal, organizationShape } from './OrgSwitcherModal';

export const SignInButton = ({ onSignIn = null, signInTo = '', LinkComponent = 'a' }) => {
  const { t } = useTranslation();
  const className = 'btn btn-primary sign-in d-inline-flex align-items-center gap-2';
  return (
    <li className="nav-item">
      {signInTo ? (
        <LinkComponent to={signInTo} className={className}>
          <FaRightToBracket />
          {t('navbar.signIn')}
        </LinkComponent>
      ) : (
        <button type="button" className={className} onClick={onSignIn}>
          <FaRightToBracket />
          {t('navbar.signIn')}
        </button>
      )}
    </li>
  );
};

SignInButton.propTypes = {
  onSignIn: PropTypes.func,
  signInTo: PropTypes.string,
  LinkComponent: PropTypes.elementType,
};

const PreferencesItem = ({ issuerUrl, preferencesTo, LinkComponent }) => {
  const { t } = useTranslation();
  if (preferencesTo) {
    return (
      <Dropdown.Item as={LinkComponent} to={preferencesTo}>
        <FaSliders className="me-2" />
        {t('navbar.preferences')}
      </Dropdown.Item>
    );
  }
  if (!issuerUrl) {
    return null;
  }
  return (
    <Dropdown.Item
      href={`${issuerUrl}/user/profile#preferences`}
      target="_blank"
      rel="noopener noreferrer"
    >
      <FaSliders className="me-2" />
      {t('navbar.preferences')}
    </Dropdown.Item>
  );
};

PreferencesItem.propTypes = {
  issuerUrl: PropTypes.string.isRequired,
  preferencesTo: PropTypes.string.isRequired,
  LinkComponent: PropTypes.elementType.isRequired,
};

/**
 * The account button's avatar with the unread count on its top right, the
 * same number the menu's Notifications row shows from the notifications
 * feature's one context, hidden at zero, in the sidebar Inbox badge's look.
 */
const AvatarBadge = ({ renderAvatar }) => {
  const { unread } = useUnread();
  return (
    <span className="user-menu-avatar">
      {renderAvatar(34)}
      {unread > 0 ? (
        <span className="badge rounded-pill bg-danger user-menu-badge">{unread}</span>
      ) : null}
    </span>
  );
};

AvatarBadge.propTypes = {
  renderAvatar: PropTypes.func.isRequired,
};

const UserMenu = ({
  displayName,
  email,
  renderAvatar,
  oidc,
  issuerUrl,
  localProfile,
  organizations,
  activeOrgUuid,
  onPickOrg,
  loadOrganizations,
  orgMark,
  favorites,
  appName,
  appVersion = '',
  appRows,
  showPreferences = true,
  preferencesTo = '',
  notifications,
  push,
  viewAllUrl,
  viewAllTo = '',
  LinkComponent = 'a',
  ticketUrl,
  onSignOut,
  onSignOutEverywhere,
}) => {
  const { t } = useTranslation();
  const [showOrgs, setShowOrgs] = useState(false);
  const [loadedOrgs, setLoadedOrgs] = useState(null);
  const [loadingOrgs, setLoadingOrgs] = useState(false);
  const [orgsFailed, setOrgsFailed] = useState(false);

  const activeOrg = organizations.find(org => org.uuid === activeOrgUuid) || null;
  const switcherOrgs = loadedOrgs || organizations;

  const openSwitcher = () => {
    setShowOrgs(true);
    if (!loadOrganizations) {
      return;
    }
    setLoadingOrgs(true);
    setOrgsFailed(false);
    loadOrganizations()
      .then(rows => setLoadedOrgs(rows))
      .catch(() => {
        setLoadedOrgs([]);
        setOrgsFailed(true);
      })
      .finally(() => setLoadingOrgs(false));
  };

  return (
    <>
      <Dropdown as="li" align="end" className="nav-item user-menu">
        <Dropdown.Toggle
          as="button"
          type="button"
          bsPrefix="nav-link"
          className="py-0 d-flex align-items-center gap-2 text-body"
          aria-label={t('navbar.accountMenu')}
        >
          <span className="fw-semibold">{displayName}</span>
          <AvatarBadge renderAvatar={renderAvatar} />
        </Dropdown.Toggle>
        <Dropdown.Menu>
          <IdentityCard
            displayName={displayName}
            email={email}
            avatar={renderAvatar(36)}
            issuerUrl={issuerUrl}
            localProfile={localProfile}
          />

          {organizations.length >= 2 && activeOrg ? (
            <Dropdown.Item
              as="button"
              type="button"
              onClick={openSwitcher}
              className="d-flex align-items-center"
            >
              <OrgLogo
                org={activeOrg}
                size={16}
                className="rounded-circle avatar-sm me-2"
                fallback={orgMark}
              />
              <span className="text-truncate">{activeOrg.name}</span>
            </Dropdown.Item>
          ) : null}

          {showPreferences ? (
            <PreferencesItem
              issuerUrl={issuerUrl}
              preferencesTo={preferencesTo}
              LinkComponent={LinkComponent}
            />
          ) : null}

          <FavoriteApps apps={favorites} />

          {appRows ? (
            <>
              <Dropdown.Divider />
              <Dropdown.Header className="py-0">
                {appName}
                {appVersion ? (
                  <span className="text-body-secondary ms-2">
                    {t('navbar.versionShort', { version: appVersion })}
                  </span>
                ) : null}
              </Dropdown.Header>
              {appRows}
            </>
          ) : null}

          {notifications || ticketUrl ? <Dropdown.Divider /> : null}
          {notifications && push ? (
            <NotificationsItem
              notifications={notifications}
              push={push}
              viewAllUrl={viewAllUrl}
              viewAllTo={viewAllTo}
              LinkComponent={LinkComponent}
            />
          ) : null}
          {ticketUrl ? (
            <Dropdown.Item href={ticketUrl} target="_blank" rel="noopener noreferrer">
              <FaTicket className="me-2" />
              {t('navbar.help')}
            </Dropdown.Item>
          ) : null}

          <Dropdown.Divider />
          <LogoutItem oidc={oidc} onSignOut={onSignOut} onSignOutEverywhere={onSignOutEverywhere} />
        </Dropdown.Menu>
      </Dropdown>

      <OrgSwitcherModal
        show={showOrgs}
        onHide={() => setShowOrgs(false)}
        organizations={switcherOrgs}
        activeUuid={activeOrgUuid}
        loading={loadingOrgs}
        loadFailed={orgsFailed}
        orgMark={orgMark}
        onPick={uuid => {
          setShowOrgs(false);
          onPickOrg(uuid);
        }}
      />
    </>
  );
};

UserMenu.propTypes = {
  displayName: PropTypes.string.isRequired,
  email: PropTypes.string.isRequired,
  renderAvatar: PropTypes.func.isRequired,
  oidc: PropTypes.bool.isRequired,
  issuerUrl: PropTypes.string.isRequired,
  localProfile: localProfileShape,
  organizations: PropTypes.arrayOf(organizationShape).isRequired,
  activeOrgUuid: PropTypes.string.isRequired,
  onPickOrg: PropTypes.func.isRequired,
  loadOrganizations: PropTypes.func,
  orgMark: PropTypes.node,
  favorites: PropTypes.array.isRequired,
  appName: PropTypes.string.isRequired,
  appVersion: PropTypes.string,
  appRows: PropTypes.node,
  showPreferences: PropTypes.bool,
  preferencesTo: PropTypes.string,
  notifications: notificationsAdapterShape,
  push: pushAdapterShape.isRequired,
  viewAllUrl: PropTypes.string.isRequired,
  viewAllTo: PropTypes.string,
  LinkComponent: PropTypes.elementType,
  ticketUrl: PropTypes.string.isRequired,
  onSignOut: PropTypes.func.isRequired,
  onSignOutEverywhere: PropTypes.func.isRequired,
};

export default UserMenu;
