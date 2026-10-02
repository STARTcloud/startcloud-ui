import PropTypes from 'prop-types';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaDatabase, FaFolderTree } from 'react-icons/fa6';

import TabStrip from '../../../components/common/TabStrip';
import { useStatus } from '../../../contexts/StatusContext';

import TaskDialog from './TaskDialog';
import ZfsDatasetsPanel from './ZfsDatasetsPanel';
import ZfsPoolsPanel from './ZfsPoolsPanel';

const PANELS = [
  { key: 'pools', labelKey: 'host.zfsPoolsPanel.poolsHeading', icon: FaDatabase },
  { key: 'datasets', labelKey: 'host.zfsDatasetsPanel.datasetsHeading', icon: FaFolderTree },
];

/**
 * The ZFS management of the storage page, hyperweaver-ui's storage
 * management with its two sub-tabs, ZFS Pools and ZFS Datasets, the
 * one `TabStrip` as buttons, the pools panel first, and the task dialog
 * a queued write opens through View task. hyperweaver-ui's ARC
 * configuration and its ISO and artifact tabs have no source in
 * hyperweaver-ui's tree and are not drawn.
 */
const StorageManagement = ({ id, turn, disks, tools }) => {
  const { t } = useTranslation();
  const status = useStatus();
  const [active, setActive] = useState('pools');
  const tabs = PANELS.map(panel => ({
    key: panel.key,
    label: t(panel.labelKey),
    icon: panel.icon,
  }));
  return (
    <div data-panel="storage-management" data-active={active}>
      <TabStrip tabs={tabs} active={active} onSelect={setActive} className="mb-3" />
      {active === 'pools' ? (
        <ZfsPoolsPanel id={id} turn={turn} disks={disks} tools={tools} />
      ) : null}
      {active === 'datasets' ? <ZfsDatasetsPanel id={id} turn={turn} tools={tools} /> : null}
      {tools.task ? (
        <TaskDialog status={status} id={id} task={tools.task} onHide={tools.closeTask} />
      ) : null}
    </div>
  );
};

StorageManagement.propTypes = {
  id: PropTypes.string.isRequired,
  turn: PropTypes.number.isRequired,
  disks: PropTypes.object.isRequired,
  tools: PropTypes.shape({
    send: PropTypes.func.isRequired,
    watch: PropTypes.func.isRequired,
    busy: PropTypes.bool.isRequired,
    task: PropTypes.object,
    closeTask: PropTypes.func.isRequired,
  }).isRequired,
};

export default StorageManagement;
