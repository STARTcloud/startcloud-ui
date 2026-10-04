import { useTranslation } from 'react-i18next';
import { FaArrowUpRightFromSquare } from 'react-icons/fa6';

import { useHostApplications } from '../hooks/useHostApplications';

/**
 * The Open in application commands of the machine's command list, one
 * per application the host opens a machine in, from the host's one held
 * copy of `GET applications`, asked once as the Controls menu or the
 * search box first opens on a host whose row lists `host-launchers`;
 * an application whose executable the host lacks is disabled with the
 * missing path as its tooltip.
 *
 * @param {Object} options
 * @param {string} options.id - The registry id, or `self` on an agent role
 * @param {boolean} options.busy - Whether an action is in flight
 * @param {boolean} options.wanted - Whether the menu or the search box is open
 * @param {Function} options.onLaunch - Called with the application's name
 * @returns {Array<Object>} The commands
 */
export const useApplicationCommands = ({ id, busy, wanted, onLaunch }) => {
  const { t } = useTranslation();
  const { applications } = useHostApplications(id, wanted);

  return applications.map(application => ({
    key: `application-${application.name}`,
    group: 'applications',
    header: 'hosts.controls.openInApplication',
    icon: FaArrowUpRightFromSquare,
    tone: 'text-info',
    label: application.name,
    title: application.exists
      ? application.path
      : t('hosts.controls.applicationMissing', { path: application.path }),
    disabled: busy || !application.exists,
    run: () => onLaunch(application.name),
  }));
};
