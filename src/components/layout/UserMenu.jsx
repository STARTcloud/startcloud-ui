import PropTypes from 'prop-types';
import { useState } from 'react';
import { Dropdown } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { FaKeyboard, FaLayerGroup, FaRightToBracket, FaSliders, FaTicket } from 'react-icons/fa6';

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
 * feature's one context, hidden at zero, in the look of the sidebar's
 * Notifications badge.
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

/**
 * The identity beside the avatar at the sidebar's foot, the person's
 * name over the email line, each cut with an ellipsis at the column's
 * width.
 */
const FootIdentity = ({ displayName, email }) => (
  <span className="user-menu-id">
    <span className="fw-semibold text-truncate">{displayName}</span>
    {email ? <small className="text-body-secondary text-truncate">{email}</small> : null}
  </span>
);

FootIdentity.propTypes = {
  displayName: PropTypes.string.isRequired,
  email: PropTypes.string.isRequired,
};

/**
 * The menu's toggle. In the header, the person's name then the badged
 * avatar. At the sidebar's foot, `foot`, the avatar first, on the left,
 * then the name over the email line, as hyperweaver-ui's foot draws it,
 * and the avatar alone while the sidebar is the rail.
 */
const MenuToggle = ({ displayName, email, renderAvatar, foot, rail }) => {
  const { t } = useTranslation();
  const identity = rail ? null : <FootIdentity displayName={displayName} email={email} />;
  return (
    <Dropdown.Toggle
      as="button"
      type="button"
      bsPrefix="nav-link"
      className="py-0 d-flex align-items-center gap-2 text-body"
      aria-label={t('navbar.accountMenu')}
    >
      {foot ? null : <span className="fw-semibold">{displayName}</span>}
      <AvatarBadge renderAvatar={renderAvatar} />
      {foot ? identity : null}
    </Dropdown.Toggle>
  );
};

MenuToggle.propTypes = {
  displayName: PropTypes.string.isRequired,
  email: PropTypes.string.isRequired,
  renderAvatar: PropTypes.func.isRequired,
  foot: PropTypes.bool.isRequired,
  rail: PropTypes.bool.isRequired,
};

/**
 * The row of the All organizations choice, opening the switcher: the
 * layers glyph and the words, drawn on a host that narrows by
 * organization while the choice is All.
 */
const AllOrgsItem = ({ onOpen }) => {
  const { t } = useTranslation();
  return (
    <Dropdown.Item as="button" type="button" onClick={onOpen} className="d-flex align-items-center">
      <FaLayerGroup className="me-2" />
      <span className="text-truncate">{t('orgSwitcher.allOrganizations')}</span>
    </Dropdown.Item>
  );
};

AllOrgsItem.propTypes = {
  onOpen: PropTypes.func.isRequired,
};

/**
 * The active organization's row, opening the switcher, drawn only while
 * the person belongs to two or more organizations; with
 * `allOrganizations`, on a host that narrows by organization, drawn from
 * one membership on, All organizations being a second choice beside it,
 * and reading All organizations while that is the choice.
 */
const ActiveOrgItem = ({ organizations, activeOrg, allOrganizations, orgMark, onOpen }) => {
  if (organizations.length < (allOrganizations ? 1 : 2)) {
    return null;
  }
  if (!activeOrg) {
    return allOrganizations ? <AllOrgsItem onOpen={onOpen} /> : null;
  }
  return (
    <Dropdown.Item as="button" type="button" onClick={onOpen} className="d-flex align-items-center">
      <OrgLogo
        org={activeOrg}
        size={16}
        className="rounded-circle avatar-sm me-2"
        fallback={orgMark}
      />
      <span className="text-truncate">{activeOrg.displayName || activeOrg.name}</span>
    </Dropdown.Item>
  );
};

ActiveOrgItem.propTypes = {
  organizations: PropTypes.arrayOf(organizationShape).isRequired,
  activeOrg: organizationShape,
  allOrganizations: PropTypes.bool.isRequired,
  orgMark: PropTypes.node,
  onOpen: PropTypes.func.isRequired,
};

const dropProps = drop => ({ align: drop === 'up' ? 'start' : 'end', drop });

/**
 * The rows under the app section: Notifications while an adapter and the
 * push adapter are given, Help while a ticket URL is, and Keyboard
 * shortcuts while `onShortcuts` is, under one divider while any draws.
 */
const SupportRows = ({
  notifications,
  push,
  viewAllUrl,
  viewAllTo,
  LinkComponent,
  ticketUrl,
  onShortcuts,
}) => {
  const { t } = useTranslation();
  if (!notifications && !ticketUrl && !onShortcuts) {
    return null;
  }
  return (
    <>
      <Dropdown.Divider />
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
      {onShortcuts ? (
        <Dropdown.Item as="button" type="button" data-tool="shortcuts" onClick={onShortcuts}>
          <FaKeyboard className="me-2" />
          {t('navbar.shortcuts.menu')}
        </Dropdown.Item>
      ) : null}
    </>
  );
};

SupportRows.propTypes = {
  notifications: notificationsAdapterShape,
  push: pushAdapterShape.isRequired,
  viewAllUrl: PropTypes.string.isRequired,
  viewAllTo: PropTypes.string.isRequired,
  LinkComponent: PropTypes.elementType.isRequired,
  ticketUrl: PropTypes.string.isRequired,
  onShortcuts: PropTypes.func,
};

/**
 * The user menu of the navbar contract's User menu section, the identity
 * card, the organization row, Preferences, the favorites, the app
 * section, Notifications, Help, Keyboard shortcuts (the row `onShortcuts`
 * opens the modal of) and Logout under one toggle of the
 * person's name and avatar; `allOrganizations`, on a host that narrows
 * by organization, draws the organization row from one membership on and
 * the All organizations row first in the switcher; `drop` opens it
 * upward at the sidebar's foot
 * while a feature's action menu holds the header's account slot, the
 * toggle there the avatar on the left and the name over the email, and
 * `rail` draws the avatar alone as the toggle while the sidebar is the
 * rail.
 */
const UserMenu = ({
  displayName,
  email,
  renderAvatar,
  oidc,
  issuerUrl,
  localProfile,
  organizations,
  activeOrgUuid,
  allOrganizations = false,
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
  onShortcuts = null,
  onSignOut,
  onSignOutEverywhere,
  drop = 'down',
  rail = false,
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
      <Dropdown as="li" {...dropProps(drop)} className="nav-item user-menu">
        <MenuToggle
          displayName={displayName}
          email={email}
          renderAvatar={renderAvatar}
          foot={drop === 'up'}
          rail={rail}
        />
        <Dropdown.Menu>
          <IdentityCard
            displayName={displayName}
            email={email}
            avatar={renderAvatar(36)}
            issuerUrl={issuerUrl}
            localProfile={localProfile}
          />

          <ActiveOrgItem
            organizations={organizations}
            activeOrg={activeOrg}
            allOrganizations={allOrganizations}
            orgMark={orgMark}
            onOpen={openSwitcher}
          />

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

          <SupportRows
            notifications={notifications}
            push={push}
            viewAllUrl={viewAllUrl}
            viewAllTo={viewAllTo}
            LinkComponent={LinkComponent}
            ticketUrl={ticketUrl}
            onShortcuts={onShortcuts}
          />

          <Dropdown.Divider />
          <LogoutItem oidc={oidc} onSignOut={onSignOut} onSignOutEverywhere={onSignOutEverywhere} />
        </Dropdown.Menu>
      </Dropdown>

      <OrgSwitcherModal
        show={showOrgs}
        onHide={() => setShowOrgs(false)}
        organizations={switcherOrgs}
        activeUuid={activeOrgUuid}
        allOrganizations={allOrganizations}
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
  allOrganizations: PropTypes.bool,
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
  onShortcuts: PropTypes.func,
  onSignOut: PropTypes.func.isRequired,
  onSignOutEverywhere: PropTypes.func.isRequired,
  drop: PropTypes.oneOf(['down', 'up']),
  rail: PropTypes.bool,
};

export default UserMenu;
