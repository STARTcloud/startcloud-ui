import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { FaBars, FaCircleHalfStroke, FaCompass, FaMoon, FaSun, FaTicket } from 'react-icons/fa6';

import Crumbs, { crumbShape } from './Breadcrumbs';
import { LanguageButton } from './LanguageModal';
import { NoticeBanners } from './Notices';
import { NavbarSearchControl } from './Search';
import { NavbarSearchPanel } from './SearchPanel';
import UserMenu, { SignInButton } from './UserMenu';

const MODE_ICONS = { auto: FaCircleHalfStroke, light: FaSun, dark: FaMoon };

const Brand = ({ brand, LinkComponent }) => {
  const className = 'navbar-brand p-0 d-flex align-items-center';
  if (brand.to) {
    return (
      <LinkComponent to={brand.to} className={className}>
        {brand.logo}
        {brand.name}
      </LinkComponent>
    );
  }
  return (
    <a
      href={brand.href || '/'}
      className={className}
      onClick={
        brand.onClick
          ? event => {
              event.preventDefault();
              brand.onClick();
            }
          : undefined
      }
    >
      {brand.logo}
      {brand.name}
    </a>
  );
};

export const brandShape = PropTypes.shape({
  name: PropTypes.string.isRequired,
  logo: PropTypes.node.isRequired,
  href: PropTypes.string,
  to: PropTypes.string,
  onClick: PropTypes.func,
});

Brand.propTypes = {
  brand: brandShape.isRequired,
  LinkComponent: PropTypes.elementType.isRequired,
};

const CLUSTER_BUTTON = 'btn btn-link nav-link cluster-btn';

const DiscoverButton = ({ to, LinkComponent }) => {
  const { t } = useTranslation();
  return (
    <li className="nav-item">
      <LinkComponent
        to={to}
        className={CLUSTER_BUTTON}
        title={t('navbar.discover')}
        aria-label={t('navbar.discover')}
      >
        <FaCompass />
      </LinkComponent>
    </li>
  );
};

DiscoverButton.propTypes = {
  to: PropTypes.string.isRequired,
  LinkComponent: PropTypes.elementType.isRequired,
};

const TicketButton = ({ href }) => {
  const { t } = useTranslation();
  return (
    <li className="nav-item">
      <a
        href={href}
        className={CLUSTER_BUTTON}
        target="_blank"
        rel="noopener noreferrer"
        title={t('navbar.help')}
        aria-label={t('navbar.help')}
      >
        <FaTicket />
      </a>
    </li>
  );
};

TicketButton.propTypes = {
  href: PropTypes.string.isRequired,
};

const ModeButton = ({ mode }) => {
  const { t } = useTranslation();
  const ModeIcon = MODE_ICONS[mode.preference] || FaCircleHalfStroke;
  const modeLabel = t(`navbar.mode.${mode.preference}`, {
    resolved: t(`navbar.mode.name.${mode.resolved}`),
  });
  return (
    <li className="nav-item">
      <button
        key={mode.preference}
        type="button"
        className={CLUSTER_BUTTON}
        onClick={mode.onToggle}
        title={modeLabel}
        aria-label={modeLabel}
      >
        <ModeIcon />
      </button>
    </li>
  );
};

const modeShape = PropTypes.shape({
  preference: PropTypes.oneOf(['auto', 'light', 'dark']).isRequired,
  resolved: PropTypes.oneOf(['light', 'dark']).isRequired,
  onToggle: PropTypes.func.isRequired,
  onPick: PropTypes.func,
});

ModeButton.propTypes = {
  mode: modeShape.isRequired,
};

/**
 * The account cluster in one order for both states, search, Discover, the
 * ticket icon, the mode control (the cycling button over the mode alone,
 * the theme being the profile's Preferences page's to choose), language,
 * then the account menu or Sign in, each control drawn only in the state
 * it belongs to: search in both states while `searchOn`, the host listing
 * `search` off the auth paths, the menu signed in, the ticket icon and
 * Sign in signed out, the rest in both; a feature's `actionMenu`, when the
 * shell hands one, draws in the account slot before the user menu or in
 * its place while the shell moved the user menu to the sidebar's foot.
 */
const Cluster = ({
  signedIn,
  searchOn,
  discoverTo,
  ticketUrl,
  mode,
  language,
  userMenu,
  actionMenu,
  onSignIn,
  signInTo,
  LinkComponent,
}) => (
  <ul className="nav nav-pills ms-auto align-items-center">
    {searchOn ? <NavbarSearchControl /> : null}
    {discoverTo ? <DiscoverButton to={discoverTo} LinkComponent={LinkComponent} /> : null}
    {!signedIn && ticketUrl ? <TicketButton href={ticketUrl} /> : null}
    <ModeButton mode={mode} />
    <LanguageButton languages={language.languages} onPick={language.onPick} />
    {signedIn && actionMenu ? actionMenu : null}
    {signedIn && userMenu ? <UserMenu {...userMenu} /> : null}
    {!signedIn && (onSignIn || signInTo) ? (
      <SignInButton onSignIn={onSignIn} signInTo={signInTo} LinkComponent={LinkComponent} />
    ) : null}
  </ul>
);

const languageShape = PropTypes.shape({
  languages: PropTypes.arrayOf(PropTypes.string).isRequired,
  onPick: PropTypes.func.isRequired,
});

Cluster.propTypes = {
  signedIn: PropTypes.bool.isRequired,
  searchOn: PropTypes.bool.isRequired,
  discoverTo: PropTypes.string.isRequired,
  ticketUrl: PropTypes.string.isRequired,
  mode: modeShape.isRequired,
  language: languageShape.isRequired,
  userMenu: PropTypes.object,
  actionMenu: PropTypes.node,
  onSignIn: PropTypes.func,
  signInTo: PropTypes.string.isRequired,
  LinkComponent: PropTypes.elementType.isRequired,
};

const Header = ({
  brand = null,
  crumbs = [],
  LinkComponent = 'a',
  mode,
  language,
  signedIn,
  searchOn,
  onSignIn = null,
  signInTo = '',
  userMenu = null,
  actionMenu = null,
  onSidebarToggle = null,
  discoverTo = '',
  ticketUrl = '',
  readout = null,
}) => {
  const { t } = useTranslation();

  return (
    <nav className="navbar navbar-expand-lg shadow-sm bg-body-tertiary border-bottom">
      <div
        className="container-fluid"
        data-app={readout?.app}
        data-version={readout?.version}
        data-host={readout?.host}
      >
        {onSidebarToggle ? (
          <button
            type="button"
            className={`${CLUSTER_BUTTON} sidebar-toggle me-2`}
            onClick={onSidebarToggle}
            title={t('navbar.sidebar.toggle')}
            aria-label={t('navbar.sidebar.toggle')}
          >
            <FaBars />
          </button>
        ) : null}
        {brand ? <Brand brand={brand} LinkComponent={LinkComponent} /> : null}
        <ul className="nav nav-pills me-auto align-items-center">
          {signedIn ? (
            <Crumbs crumbs={crumbs} LinkComponent={LinkComponent} leading={Boolean(brand)} />
          ) : null}
        </ul>

        <Cluster
          signedIn={signedIn}
          searchOn={searchOn}
          discoverTo={discoverTo}
          ticketUrl={ticketUrl}
          mode={mode}
          language={language}
          userMenu={userMenu}
          actionMenu={actionMenu}
          onSignIn={onSignIn}
          signInTo={signInTo}
          LinkComponent={LinkComponent}
        />
      </div>
      <NoticeBanners LinkComponent={LinkComponent} />
      {searchOn ? <NavbarSearchPanel /> : null}
    </nav>
  );
};

Header.propTypes = {
  brand: brandShape,
  crumbs: PropTypes.arrayOf(crumbShape),
  LinkComponent: PropTypes.elementType,
  mode: modeShape.isRequired,
  language: languageShape.isRequired,
  signedIn: PropTypes.bool.isRequired,
  searchOn: PropTypes.bool.isRequired,
  onSignIn: PropTypes.func,
  signInTo: PropTypes.string,
  userMenu: PropTypes.object,
  actionMenu: PropTypes.node,
  onSidebarToggle: PropTypes.func,
  discoverTo: PropTypes.string,
  ticketUrl: PropTypes.string,
  readout: PropTypes.shape({
    app: PropTypes.string.isRequired,
    version: PropTypes.string.isRequired,
    host: PropTypes.string.isRequired,
  }),
};

export default Header;
