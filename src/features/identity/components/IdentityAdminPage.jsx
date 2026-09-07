import PropTypes from 'prop-types';

import { returnToShape } from '../../../utils/auth';
import { useAdminGate } from '../hooks/useAdminGate';
import { GuardProvider } from '../hooks/useGuard';

import BlockedIpsPage from './BlockedIpsPage';
import ClientHealthPage from './ClientHealthPage';
import DashboardPage from './DashboardPage';
import InsightsPage from './InsightsPage';
import LoginsPage from './LoginsPage';
import OrganizationsPage from './OrganizationsPage';
import RegistrationsPage from './RegistrationsPage';
import ServiceUsagePage from './ServiceUsagePage';
import SessionsPage from './SessionsPage';
import TermsPage from './TermsPage';
import UsersPage from './UsersPage';

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
  'brute-force': BlockedIpsPage,
  terms: TermsPage,
};

export const IDENTITY_ADMIN_PAGES = Object.keys(PAGES);

/**
 * One operator page per sidebar row of the identity contract's group 5,
 * the row's route naming the page: Dashboard, Users, All organizations,
 * Logins, Registrations, Sessions, Service usage, Insights, Client
 * health, Blocked IPs and Terms, each reading its own calls and drawing
 * in the scroll region beside the column; the sidebar rows are the one
 * navigation and no tab strip is drawn. A visitor is sent to sign in with
 * the page as the return path and a signed-in non-admin home, `allowed`
 * being the app's global-admin flag; `stepUp` arms the step-up window the
 * restart and the deletions need and `user` says whether the account has
 * a password for the dialog.
 */
const IdentityAdminPage = ({ session, returnTo, allowed, page, stepUp, user = null }) => {
  const open = useAdminGate({ session, returnTo, allowed });
  const Page = PAGES[page];
  if (!open) {
    return null;
  }
  return (
    <GuardProvider stepUp={stepUp} hasPassword={Boolean(user?.has_local_auth)}>
      <div className="list">
        <Page />
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
  user: PropTypes.shape({ has_local_auth: PropTypes.bool }),
};

export default IdentityAdminPage;
