import PropTypes from 'prop-types';
import { useEffect, useState } from 'react';
import { Dropdown } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { FaArrowUpRightFromSquare } from 'react-icons/fa6';

import { log } from '../../../lib/logger';
import { fetchApplications } from '../api/machines';
import { hostHasFeature } from '../utils/capabilities';

const NONE = { id: '', applications: [] };

/**
 * The Open in application rows of the machine Controls menu: one row per
 * external application the host is configured to open a machine in,
 * `GET applications`, asked for once as the rows draw and only of a host
 * whose row lists `host-launchers`; a row whose executable the host lacks
 * is drawn disabled with the missing path as its tooltip, and a row that
 * is pressed hands the application's name to `onLaunch`. Nothing draws
 * for a host without the token or without an application.
 */
const ApplicationRows = ({ status, id, server = null, busy, onLaunch }) => {
  const { t } = useTranslation();
  const offered = hostHasFeature(server, 'host-launchers');
  const [held, setHeld] = useState(NONE);

  useEffect(() => {
    if (!offered) {
      return undefined;
    }
    let live = true;
    fetchApplications(status, id)
      .then(applications => {
        if (live) {
          setHeld({ id, applications });
        }
      })
      .catch(error => {
        log.api.error('Error fetching applications', { id, error: error.message });
      });
    return () => {
      live = false;
    };
  }, [offered, status, id]);

  const applications = offered && held.id === id ? held.applications : [];

  if (applications.length === 0) {
    return null;
  }

  return (
    <>
      <Dropdown.Divider />
      <Dropdown.Header>{t('hosts.controls.openInApplication')}</Dropdown.Header>
      {applications.map(application => (
        <Dropdown.Item
          as="button"
          type="button"
          key={application.name}
          disabled={busy || !application.exists}
          title={
            application.exists
              ? application.path
              : t('hosts.controls.applicationMissing', { path: application.path })
          }
          onClick={() => onLaunch(application.name)}
        >
          <FaArrowUpRightFromSquare className="text-info me-2" />
          {application.name}
        </Dropdown.Item>
      ))}
    </>
  );
};

ApplicationRows.propTypes = {
  status: PropTypes.object.isRequired,
  id: PropTypes.string.isRequired,
  server: PropTypes.object,
  busy: PropTypes.bool.isRequired,
  onLaunch: PropTypes.func.isRequired,
};

export default ApplicationRows;
