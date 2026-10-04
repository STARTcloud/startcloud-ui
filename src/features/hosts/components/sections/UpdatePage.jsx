import PropTypes from 'prop-types';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import UpdatePage from '../../../../components/common/UpdatePage';
import { useStatus } from '../../../../contexts/StatusContext';
import { applyAgentUpdate, checkAgentUpdate } from '../../api/agentSettings';
import { sectionTitle } from '../../pages';

const AGENT_CONFIRM = {
  titleKey: 'agentSettings.agentSettings.updateAgentTitle',
  messageKey: 'agentSettings.agentSettings.updateAgentMessage',
};

/**
 * The Update page of a host at `/hosts/{id}/agent/update`: the shared
 * `UpdatePage` over the pair bound to this host, `GET app/updates/check`
 * and `POST app/updates/apply` at the path the role fixes, headed by the
 * section's title and confirmed in the agent's words; Refresh calls
 * `onRefresh` beside the page's own read. Takes the host's `id` and row,
 * the `section` key and `onRefresh`; returns the page.
 */
const HostUpdatePage = ({ id, server, section, onRefresh }) => {
  const { t } = useTranslation();
  const status = useStatus();
  const update = useMemo(
    () => ({
      check: () => checkAgentUpdate(status, id),
      apply: () => applyAgentUpdate(status, id),
    }),
    [status, id]
  );
  return (
    <div className="list row" data-page="host-section" data-section={section}>
      <UpdatePage
        update={update}
        title={sectionTitle(section, server, '', t)}
        confirm={AGENT_CONFIRM}
        onRefresh={onRefresh}
      />
    </div>
  );
};

HostUpdatePage.propTypes = {
  id: PropTypes.string.isRequired,
  server: PropTypes.object.isRequired,
  section: PropTypes.string.isRequired,
  onRefresh: PropTypes.func.isRequired,
};

export default HostUpdatePage;
