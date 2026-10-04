import PropTypes from 'prop-types';
import { useMemo } from 'react';

import ConfigPage from '../../../../components/common/ConfigPage';
import { useStatus } from '../../../../contexts/StatusContext';
import { hostConfig } from '../../api/agentSettings';
import { configNamesOf } from '../../utils/configNodes';

/**
 * One configuration file of a host at `/hosts/{id}/agent/config/<name>`:
 * the shared `ConfigPage` over `hostConfig`, the adapter bound to this
 * host, with the names of the row's `capabilities.config` and `name` the
 * file drawn; the file's root title is the page's heading, so the page
 * draws none of its own. Takes the host's `id` and row, the `section`
 * key and the file's `name`; returns the page.
 */
const ConfigSectionPage = ({ id, server, section, name }) => {
  const status = useStatus();
  const config = useMemo(() => hostConfig(status, id), [status, id]);
  return (
    <div className="list row" data-page="host-section" data-section={section} data-config={name}>
      <ConfigPage config={config} names={configNamesOf(server)} name={name} />
    </div>
  );
};

ConfigSectionPage.propTypes = {
  id: PropTypes.string.isRequired,
  server: PropTypes.object.isRequired,
  section: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
};

export default ConfigSectionPage;
