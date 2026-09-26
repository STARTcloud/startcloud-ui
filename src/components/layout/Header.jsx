import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { FaBars, FaCircleHalfStroke, FaCompass, FaMoon, FaSun, FaTicket } from 'react-icons/fa6';

import Crumbs, { crumbShape } from './Breadcrumbs';
import { LanguageButton } from './LanguageModal';
import LookMenu, { lookShape } from './LookMenu';
import { NoticeBanners } from './Notices';
import { NavbarSearchControl } from './Search';
import { NavbarSearchPanel } from './SearchPanel';
import UserMenu, { SignInButton } from './UserMenu';

const THEME_ICONS = { auto: FaCircleHalfStroke, light: FaSun, dark: FaMoon };

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

const ThemeButton = ({ theme }) => {
  const { t } = useTranslation();
  const ThemeIcon = THEME_ICONS[theme.preference] || FaCircleHalfStroke;
  const themeLabel = theme.preference
    ? t(`theme.${theme.preference}`, { variant: t(`theme.name.${theme.resolved}`) })
    : t('theme.name.follow');
  if (theme.look?.packs.length > 0) {
    return <LookMenu theme={theme} className={CLUSTER_BUTTON} />;
  }
  return (
    <li className="nav-item">
      <button
        key={theme.preference}
        type="button"
        className={CLUSTER_BUTTON}
        onClick={theme.onToggle}
        title={themeLabel}
        aria-label={themeLabel}
      >
        <ThemeIcon />
      </button>
    </li>
  );
};

const themeShape = PropTypes.shape({
  preference: PropTypes.string.isRequired,
  siteVariant: PropTypes.string,
  resolved: PropTypes.oneOf(['light', 'dark']).isRequired,
  onToggle: PropTypes.func.isRequired,
  onPick: PropTypes.func,
  look: lookShape,
});

ThemeButton.propTypes = {
  theme: themeShape.isRequired,
};

/**
 * The account cluster in one order for both states, search, Discover, the
 * ticket icon, theme (the cycling button, or the variant-and-look menu
 * while the host offers packs), language, then the account menu or Sign
 * in, each control drawn only in the state it belongs to: search and the
 * menu signed in, the ticket icon and Sign in signed out, the rest in both.
 */
const Cluster = ({
  signedIn,
  discoverTo,
  ticketUrl,
  theme,
  language,
  userMenu,
  onSignIn,
  signInTo,
  LinkComponent,
}) => (
  <ul className="nav nav-pills ms-auto align-items-center">
    {signedIn ? <NavbarSearchControl /> : null}
    {discoverTo ? <DiscoverButton to={discoverTo} LinkComponent={LinkComponent} /> : null}
    {!signedIn && ticketUrl ? <TicketButton href={ticketUrl} /> : null}
    <ThemeButton theme={theme} />
    <LanguageButton languages={language.languages} onPick={language.onPick} />
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
  discoverTo: PropTypes.string.isRequired,
  ticketUrl: PropTypes.string.isRequired,
  theme: themeShape.isRequired,
  language: languageShape.isRequired,
  userMenu: PropTypes.object,
  onSignIn: PropTypes.func,
  signInTo: PropTypes.string.isRequired,
  LinkComponent: PropTypes.elementType.isRequired,
};

const Header = ({
  brand = null,
  crumbs = [],
  LinkComponent = 'a',
  theme,
  language,
  signedIn,
  onSignIn = null,
  signInTo = '',
  userMenu = null,
  onSidebarToggle = null,
  discoverTo = '',
  ticketUrl = '',
}) => {
  const { t } = useTranslation();

  return (
    <nav className="navbar navbar-expand-lg shadow-sm bg-body-tertiary border-bottom">
      <div className="container-fluid">
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
          discoverTo={discoverTo}
          ticketUrl={ticketUrl}
          theme={theme}
          language={language}
          userMenu={userMenu}
          onSignIn={onSignIn}
          signInTo={signInTo}
          LinkComponent={LinkComponent}
        />
      </div>
      <NoticeBanners LinkComponent={LinkComponent} />
      <NavbarSearchPanel />
    </nav>
  );
};

Header.propTypes = {
  brand: brandShape,
  crumbs: PropTypes.arrayOf(crumbShape),
  LinkComponent: PropTypes.elementType,
  theme: themeShape.isRequired,
  language: languageShape.isRequired,
  signedIn: PropTypes.bool.isRequired,
  onSignIn: PropTypes.func,
  signInTo: PropTypes.string,
  userMenu: PropTypes.object,
  onSidebarToggle: PropTypes.func,
  discoverTo: PropTypes.string,
  ticketUrl: PropTypes.string,
};

export default Header;
