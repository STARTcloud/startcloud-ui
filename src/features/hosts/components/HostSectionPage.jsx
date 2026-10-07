import PropTypes from 'prop-types';
import { Suspense, lazy, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import NotAvailableStub from '../../../components/common/NotAvailableStub';
import PageHeader from '../../../components/common/PageHeader';
import { useStatus } from '../../../contexts/StatusContext';
import { usePageName } from '../../../hooks/usePageName';
import { pageContextShape } from '../../../utils/itemShape';
import { ManageRefreshContext } from '../hooks/useHostManage';
import { useHostRow } from '../hooks/useHostRow';
import { useHostStats } from '../hooks/useHostStats';
import { useServers } from '../hooks/useServers';
import { sectionOffered, sectionTitle, sectionTokens } from '../pages';
import { hostLabel, isServerRole } from '../utils/hosts';
import { canControlHosts, canManageSettings } from '../utils/permissions';

import HostNav from './HostNav';
import RefreshButton from './RefreshButton';

const ADMIN = 'admin';

const SUPER_ADMIN = 'super-admin';

const ROLE_GATES = {
  [ADMIN]: canControlHosts,
  [SUPER_ADMIN]: canManageSettings,
};

const DENIED_KEYS = {
  [ADMIN]: 'pages.hostManage.adminRequired',
  [SUPER_ADMIN]: 'agentSettings.agentSettings.accessDenied',
};

const DENIED_NOTES = {
  [ADMIN]: 'admin-required',
  [SUPER_ADMIN]: 'access-denied',
};

/**
 * The least role each section page draws for: `admin` for the system,
 * updates, provisioning, files, boot environments and database pages,
 * `super-admin` for the agent's configuration, secrets, API keys and
 * update; a section absent here draws for every signed-in role.
 */
const ROLES = {
  'boot-environments': ADMIN,
  services: ADMIN,
  processes: ADMIN,
  users: ADMIN,
  time: ADMIN,
  runlevel: ADMIN,
  logs: ADMIN,
  faults: ADMIN,
  packages: ADMIN,
  'system-updates': ADMIN,
  repositories: ADMIN,
  recipes: ADMIN,
  templates: ADMIN,
  provisioners: ADMIN,
  'provisioner-catalog': ADMIN,
  'provisioning-network': ADMIN,
  installers: ADMIN,
  orchestration: ADMIN,
  files: ADMIN,
  database: ADMIN,
  config: SUPER_ADMIN,
  secrets: SUPER_ADMIN,
  'api-keys': SUPER_ADMIN,
  update: SUPER_ADMIN,
};

const sectionAllowed = (section, role) => {
  const gate = ROLE_GATES[ROLES[section]];
  return gate ? gate(role) : true;
};

const PAGES = {
  interfaces: lazy(() => import('./sections/InterfacesPage')),
  topology: lazy(() => import('./sections/TopologyPage')),
  addresses: lazy(() => import('./sections/AddressesPage')),
  routes: lazy(() => import('./sections/RoutesPage')),
  bandwidth: lazy(() => import('./sections/BandwidthPage')),
  links: lazy(() => import('./sections/LinksPage')),
  spaces: lazy(() => import('./sections/SpacesPage')),
  hostname: lazy(() => import('./sections/HostnamePage')),
  'hosts-file': lazy(() => import('./sections/HostsFilePage')),
  dns: lazy(() => import('./sections/DnsPage')),
  pools: lazy(() => import('./sections/PoolsPage')),
  snapshots: lazy(() => import('./sections/SnapshotsPage')),
  arc: lazy(() => import('./sections/ArcPage')),
  disks: lazy(() => import('./sections/DisksPage')),
  media: lazy(() => import('./sections/MediaPage')),
  'boot-environments': lazy(() => import('./sections/BootEnvironmentsPage')),
  devices: lazy(() => import('./sections/DevicesSectionPage')),
  services: lazy(() => import('./sections/ServicesPage')),
  processes: lazy(() => import('./sections/ProcessesPage')),
  users: lazy(() => import('./sections/UsersPage')),
  time: lazy(() => import('./sections/TimePage')),
  runlevel: lazy(() => import('./sections/RunlevelPage')),
  logs: lazy(() => import('./sections/LogsPage')),
  faults: lazy(() => import('./sections/FaultsPage')),
  packages: lazy(() => import('./sections/PackagesPage')),
  'system-updates': lazy(() => import('./sections/SystemUpdatesPage')),
  repositories: lazy(() => import('./sections/RepositoriesPage')),
  recipes: lazy(() => import('./sections/RecipesPage')),
  templates: lazy(() => import('./sections/TemplatesPage')),
  provisioners: lazy(() => import('./sections/ProvisionersPage')),
  'provisioner-catalog': lazy(() => import('./sections/ProvisionerCatalogPage')),
  'provisioning-network': lazy(() => import('./sections/ProvisioningNetworkPage')),
  installers: lazy(() => import('./sections/InstallersPage')),
  orchestration: lazy(() => import('./sections/OrchestrationPage')),
  files: lazy(() => import('./sections/FilesPage')),
  config: lazy(() => import('./sections/ConfigSectionPage')),
  secrets: lazy(() => import('./sections/SecretsPage')),
  'api-keys': lazy(() => import('./sections/ApiKeysPage')),
  database: lazy(() => import('./sections/DatabasePage')),
  update: lazy(() => import('./sections/UpdatePage')),
};

const labelOf = ({ status, server, id, stats }) => {
  if (isServerRole(status)) {
    return server ? hostLabel(server) : String(id);
  }
  return stats?.hostname || String(id);
};

const Loading = () => {
  const { t } = useTranslation();
  return (
    <div className="list row">
      <div>{t('pages.loading')}</div>
    </div>
  );
};

/**
 * What a section route draws for a host the list of servers does not
 * hold, what the host page draws for such an id: the heading with the
 * id or the hostname the stats answered, and the danger alert when the
 * host's stats failed, the loading line until they answered.
 */
const UnknownHost = ({ id, section, name }) => {
  const { t } = useTranslation();
  const status = useStatus();
  const { refresh: refreshServers } = useServers();
  const { stats, loaded, failed, refresh: refreshStats } = useHostStats(id);

  if (!loaded) {
    return <Loading />;
  }

  const refresh = () => {
    refreshServers();
    refreshStats();
  };

  return (
    <div className="list row" data-page="host-section-unknown" data-section={section}>
      <PageHeader
        title={sectionTitle(section, null, name, t)}
        subtitle={labelOf({ status, server: null, id, stats })}
        actions={<RefreshButton onRefresh={refresh} />}
      />
      {failed ? (
        <div className="alert alert-danger" role="alert">
          {t('hosts.host.loadError')}
        </div>
      ) : null}
    </div>
  );
};

UnknownHost.propTypes = {
  id: PropTypes.string.isRequired,
  section: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
};

const Denied = ({ server, section, name }) => {
  const { t } = useTranslation();
  const role = ROLES[section];
  return (
    <div className="list row" data-page="host-section-denied" data-section={section}>
      <PageHeader title={sectionTitle(section, server, name, t)} subtitle={hostLabel(server)} />
      <div className="alert alert-danger" role="alert" data-note={DENIED_NOTES[role]}>
        {t(DENIED_KEYS[role])}
      </div>
    </div>
  );
};

Denied.propTypes = {
  server: PropTypes.object.isRequired,
  section: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
};

/**
 * The body of one section page: it names the host's label for the
 * crumbs through `usePageName`, sets the document title, provides the
 * count of Refresh presses to every read under it, and draws the
 * section's lazily loaded page with the host's row, its label and
 * `onRefresh`, which reads the list of servers and the host's stats
 * again before the page's own reads.
 */
const SectionBody = ({ id, server, context, section, name }) => {
  const { t } = useTranslation();
  const status = useStatus();
  const { refresh: refreshServers } = useServers();
  const { stats, refresh: refreshStats } = useHostStats(id);
  const [presses, setPresses] = useState(0);
  const label = labelOf({ status, server, id, stats });
  const hostname = server.hostname || label;
  const title = sectionTitle(section, server, name, t);
  const Page = PAGES[section];

  usePageName(label);

  useEffect(() => {
    document.title = `${title} · ${label}`;
  }, [title, label]);

  const onRefresh = () => {
    refreshServers();
    refreshStats();
    setPresses(current => current + 1);
  };

  return (
    <ManageRefreshContext.Provider value={presses}>
      <div data-refreshes={presses}>
        <Suspense fallback={<Loading />}>
          <Page
            id={id}
            server={server}
            context={context}
            section={section}
            name={name}
            host={{ label, hostname }}
            onRefresh={onRefresh}
          />
        </Suspense>
      </div>
    </ManageRefreshContext.Provider>
  );
};

SectionBody.propTypes = {
  id: PropTypes.string.isRequired,
  server: PropTypes.object.isRequired,
  context: pageContextShape.isRequired,
  section: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
};

const bodyOf = ({ id, server, context, section, name, t }) => {
  if (!server) {
    return <UnknownHost id={id} section={section} name={name} />;
  }
  if (!sectionOffered(section, server, name)) {
    return (
      <NotAvailableStub
        title={sectionTitle(section, server, name, t)}
        tokenLabel={sectionTokens(section, server, name)}
      />
    );
  }
  if (!sectionAllowed(section, context.user?.role)) {
    return <Denied server={server} section={section} name={name} />;
  }
  return <SectionBody id={id} server={server} context={context} section={section} name={name} />;
};

/**
 * One section page of a host at the route its row in `HOST_PAGES`
 * fixes: `HostNav` around the loading line while the list of servers
 * has not answered, `UnknownHost` for an id the list does not hold, the
 * not-available stub naming the page's `sectionTokens` for a host whose row does not
 * offer the section, the denied line for a role `ROLES` refuses, and
 * otherwise `SectionBody`.
 *
 * @param {Object} props
 * @param {string} props.id - The registry id, or `self` on an agent role
 * @param {Object} props.context - The page context
 * @param {string} props.section - The section's key, a key of `PAGES`
 * @param {string} [props.name] - The agent configuration file, empty elsewhere
 */
const HostSectionPage = ({ id, context, section, name = '' }) => {
  const { t } = useTranslation();
  const { loaded: listed } = useServers();
  const server = useHostRow(id);

  if (!listed) {
    return <Loading />;
  }

  return <HostNav id={id}>{bodyOf({ id, server, context, section, name, t })}</HostNav>;
};

HostSectionPage.propTypes = {
  id: PropTypes.string.isRequired,
  context: pageContextShape.isRequired,
  section: PropTypes.oneOf(Object.keys(PAGES)).isRequired,
  name: PropTypes.string,
};

export default HostSectionPage;
