import PropTypes from 'prop-types';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { useStatus } from '../../../contexts/StatusContext';
import { pageContextShape } from '../../../utils/itemShape';
import { useMachineRow } from '../hooks/useHostMachines';
import { useHostRow } from '../hooks/useHostRow';
import { useHostStats } from '../hooks/useHostStats';
import { useMachineDetail } from '../hooks/useMachineDetail';
import { hostHasFeature } from '../utils/capabilities';
import { isRunning } from '../utils/hosts';
import { configurationOf } from '../utils/machines';
import { canCreateMachines } from '../utils/permissions';

import MachineSettings from './MachineSettings';

/**
 * The Settings page of one machine as one unit, hyperweaver-ui's Settings
 * tab at `/hosts/{id}/machines/{name}/settings`: the host's own row, the
 * machine's own row, its running state and its detail are the copies the
 * hosts feature's hooks hold, handed to `MachineSettings`, and after a
 * write the machine's row, its detail and the host's stats are read
 * again once. It draws behind `machine-modify` for a person who may
 * create machines, once the detail answered.
 */
const MachineSettingsView = ({ id, name, context }) => {
  const { t } = useTranslation();
  const status = useStatus();
  const server = useHostRow(id);
  const { stats, refresh: refreshStats } = useHostStats(id);
  const row = useMachineRow(id, name);
  const answer = useMachineDetail(id, name);
  const offered = hostHasFeature(server, 'machine-modify') && canCreateMachines(context.user?.role);
  const { detail } = answer;
  const configuration = useMemo(() => configurationOf(detail), [detail]);

  if (!offered) {
    return null;
  }
  if (!detail) {
    return answer.loaded ? null : <div data-view="machine-settings">{t('pages.loading')}</div>;
  }

  const reread = () => {
    row.refresh();
    answer.refresh();
    refreshStats();
  };

  return (
    <div data-view="machine-settings">
      <MachineSettings
        status={status}
        id={id}
        server={server}
        name={name}
        hypervisor={detail.machine_info?.hypervisor || row.machine?.hypervisor || ''}
        configuration={configuration}
        knobCurrent={detail.knob_current || null}
        pendingChanges={detail.pending_changes || null}
        rawDetails={detail}
        running={isRunning(stats, name)}
        onDone={reread}
      />
    </div>
  );
};

MachineSettingsView.propTypes = {
  id: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  context: pageContextShape.isRequired,
};

export default MachineSettingsView;
