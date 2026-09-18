import PropTypes from 'prop-types';

import { GuardProvider } from '../../../contexts/GuardContext';
import { returnToShape } from '../../../utils/auth';
import { useAdminGate } from '../hooks/useAdminGate';

import BlockedIpsPage from './BlockedIpsPage';
import ClientHealthPage from './ClientHealthPage';
import DashboardPage from './DashboardPage';
import EmailTemplatesPage from './EmailTemplatesPage';
import InsightsPage from './InsightsPage';
import LoginsPage from './LoginsPage';
import OrganizationsPage, { organizationsAdapterShape } from './OrganizationsPage';
import ProviderHealthPage from './ProviderHealthPage';
import RegistrationsPage from './RegistrationsPage';
import ServiceUsagePage from './ServiceUsagePage';
import SessionsPage from './SessionsPage';
import TermsPage from './TermsPage';
import UsersPage, { usersAdapterShape } from './UsersPage';

const PAGES = {
  dashboard: DashboardPage,
  users: UsersPage,
  organizations: OrganizationsPage,
  logins: LoginsPage,
  registrations: RegistrationsPage,
  sessions: SessionsPage,
  'service-usage': ServiceUsagePage,
  insights: InsightsPage,
  'client-health': ClientHealthPage,
  'provider-health': ProviderHealthPage,
  'brute-force': BlockedIpsPage,
  terms: TermsPage,
  'email-templates': EmailTemplatesPage,
};

export const IDENTITY_ADMIN_PAGES = Object.keys(PAGES);

/**
 * The adapters the Users and All organizations pages read and act
 * through, the identity provider's own on a `cookie` host and a UI
 * backend's over its own accounts on a `backend` host.
 */
export const adminAdaptersShape = PropTypes.shape({
  users: usersAdapterShape,
  organizations: organizationsAdapterShape,
});

const pageProps = (page, adapters) => {
  if (page === 'users') {
    return { adapter: adapters.users };
  }
  if (page === 'organizations') {
    return { adapter: adapters.organizations };
  }
  return {};
};

/**
 * One operator page per sidebar row of the identity contract's group 5,
 * the row's route naming the page: Dashboard, Users, All organizations,
 * Logins, Registrations, Sessions, Service usage, Insights, Client
 * health, Provider health, Blocked IPs, Terms and Email templates, each
 * reading its own calls and drawing
 * in the scroll region beside the column; the sidebar rows are the one
 * navigation and no tab strip is drawn; the Users and All organizations
 * pages take their reads and actions from `adapters`, so a `backend`
 * host draws the same two pages over its own accounts. A visitor is sent
 * to sign in with the page as the return path and a signed-in non-admin
 * home, `allowed` being the app's global-admin flag; `stepUp` arms the
 * step-up window the restart and the deletions need and `user` says
 * whether the account has a password for the dialog.
 */
const IdentityAdminPage = ({ session, returnTo, allowed, page, stepUp, adapters, user = null }) => {
  const open = useAdminGate({ session, returnTo, allowed });
  const Page = PAGES[page];
  if (!open) {
    return null;
  }
  return (
    <GuardProvider stepUp={stepUp} hasPassword={Boolean(user?.has_local_auth)}>
      <div className="list">
        <Page {...pageProps(page, adapters)} />
      </div>
    </GuardProvider>
  );
};

IdentityAdminPage.propTypes = {
  session: PropTypes.object.isRequired,
  returnTo: returnToShape.isRequired,
  allowed: PropTypes.bool.isRequired,
  page: PropTypes.oneOf(IDENTITY_ADMIN_PAGES).isRequired,
  stepUp: PropTypes.func.isRequired,
  adapters: adminAdaptersShape.isRequired,
  user: PropTypes.shape({ has_local_auth: PropTypes.bool }),
};

export default IdentityAdminPage;
