import PropTypes from 'prop-types';

import ArcConfigurationSection from './ArcConfigurationSection';
import BootEnvironmentsSection from './BootEnvironmentsSection';
import DatabaseSection from './DatabaseSection';
import FaultsSection from './FaultsSection';
import RepositoriesSection from './RepositoriesSection';
import SyslogSection from './SyslogSection';
import SystemLogsSection from './SystemLogsSection';

/**
 * The bodies of the syslog, the system logs, the ARC configuration, the
 * boot environments, the fault management, the database and the
 * repositories sections of the Manage page, each drawn by its section's
 * key over the reads `useManageSectionsData` holds and the tables the
 * page's one binding narrows; null for a key of another group.
 */
const ManageOwnSections = ({ section, id, ctx, search, sections, creating, onCreating }) => {
  switch (section.key) {
    case 'syslog':
      return (
        <SyslogSection
          id={id}
          ctx={ctx}
          table={search.syslogRules}
          reading={sections.reads.syslog}
          filtering={search.filtering}
        />
      );
    case 'system-logs':
      return (
        <SystemLogsSection
          id={id}
          ctx={ctx}
          table={search.logFiles}
          reading={sections.reads.logFiles}
          filtering={search.filtering}
        />
      );
    case 'arc-configuration':
      return <ArcConfigurationSection id={id} />;
    case 'boot-environments':
      return (
        <BootEnvironmentsSection
          id={id}
          ctx={ctx}
          table={search.bootEnvironments}
          reading={sections.reads.bootEnvironments}
          filtering={search.filtering}
          creating={creating === 'boot-environments'}
          onCreating={() => onCreating(null)}
        />
      );
    case 'fault-management':
      return (
        <FaultsSection
          id={id}
          ctx={ctx}
          tables={{ faults: search.faults, faultModules: search.faultModules }}
          readings={{ faults: sections.reads.faults, faultModules: sections.reads.faultModules }}
          rows={{ faultModules: sections.rows.faultModules }}
          filtering={search.filtering}
        />
      );
    case 'database':
      return (
        <DatabaseSection
          id={id}
          ctx={ctx}
          table={search.databases}
          reading={sections.reads.databases}
          filtering={search.filtering}
        />
      );
    case 'repositories':
      return (
        <RepositoriesSection
          id={id}
          ctx={ctx}
          table={search.repositories}
          reading={sections.reads.repositories}
          filtering={search.filtering}
          creating={creating === 'repositories'}
          onCreating={() => onCreating(null)}
        />
      );
    default:
      return null;
  }
};

ManageOwnSections.propTypes = {
  section: PropTypes.shape({ key: PropTypes.string.isRequired }).isRequired,
  id: PropTypes.string.isRequired,
  ctx: PropTypes.object.isRequired,
  search: PropTypes.object.isRequired,
  sections: PropTypes.object.isRequired,
  creating: PropTypes.string,
  onCreating: PropTypes.func.isRequired,
};

export default ManageOwnSections;
