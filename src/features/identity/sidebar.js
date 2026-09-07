import {
  FaChartBar,
  FaChartPie,
  FaDesktop,
  FaFileContract,
  FaFolderTree,
  FaGauge,
  FaGear,
  FaHeartPulse,
  FaRightToBracket,
  FaShieldHalved,
  FaUserPlus,
  FaUsers,
} from 'react-icons/fa6';

import { hasFeature } from '../../utils/capabilities';

const isAdmin = account => Boolean(account?.user?.roles?.includes('ROLE_ADMIN'));

const section = (key, items) => ({ key, labelKey: `admin.sidebar.${key}`, items });

/**
 * The identity feature's operator export of the identity contract's
 * group 5: nothing unless the host advertises `admin` and the account's
 * roles hold `ROLE_ADMIN`, else one Admin group with the seven sections
 * Overview, Accounts, Activity, Health, Security, Content (while the host
 * also advertises `policies`) and System, the Dashboard row exact-match
 * and the Blocked IPs row carrying the `blockedCount` badge the shell
 * resolves from the `admin` topic; the Configuration row carries
 * `external: true` until the shared editor lands, a top-level navigation
 * into the issuer's own configuration page.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {Object} account - The session state from `useSession`
 * @returns {Array} The sidebar groups
 */
export const sidebar = (status, account) => {
  if (!hasFeature(status, 'admin') || !isAdmin(account)) {
    return [];
  }
  const sections = [
    section('overview', [
      {
        key: 'dashboard',
        icon: FaGauge,
        labelKey: 'admin.dashboard.title',
        to: '/admin',
        end: true,
      },
    ]),
    section('accounts', [
      { key: 'users', icon: FaUsers, labelKey: 'admin.users.title', to: '/admin/users' },
      {
        key: 'organizations',
        icon: FaFolderTree,
        labelKey: 'admin.organizations.all',
        to: '/admin/organizations',
      },
    ]),
    section('activity', [
      {
        key: 'logins',
        icon: FaRightToBracket,
        labelKey: 'admin.activity.logins.title',
        to: '/admin/logins',
      },
      {
        key: 'registrations',
        icon: FaUserPlus,
        labelKey: 'admin.activity.registrations.title',
        to: '/admin/registrations',
      },
      {
        key: 'sessions',
        icon: FaDesktop,
        labelKey: 'admin.activity.sessions.title',
        to: '/admin/sessions',
      },
    ]),
    section('health', [
      {
        key: 'usage',
        icon: FaChartBar,
        labelKey: 'admin.health.usage.title',
        to: '/admin/service-usage',
      },
      {
        key: 'insights',
        icon: FaChartPie,
        labelKey: 'admin.health.insights.title',
        to: '/admin/insights',
      },
      {
        key: 'clients',
        icon: FaHeartPulse,
        labelKey: 'admin.health.clients.title',
        to: '/admin/client-health',
      },
    ]),
    section('security', [
      {
        key: 'blocked',
        icon: FaShieldHalved,
        labelKey: 'admin.blocked.title',
        to: '/admin/brute-force',
        badge: 'blockedCount',
      },
    ]),
  ];
  if (hasFeature(status, 'policies')) {
    sections.push(
      section('content', [
        { key: 'terms', icon: FaFileContract, labelKey: 'admin.terms.title', to: '/admin/terms' },
      ])
    );
  }
  sections.push(
    section('system', [
      {
        key: 'config',
        icon: FaGear,
        labelKey: 'admin.tabs.configManagement',
        to: '/admin/config',
        external: true,
      },
    ])
  );
  return [{ key: 'admin', labelKey: 'admin.sidebar.title', sections }];
};
