import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import {
  FaCompactDisc,
  FaEthernet,
  FaHardDrive,
  FaNetworkWired,
  FaPlug,
  FaServer,
} from 'react-icons/fa6';

import { nicSummary, zoneNicSummary } from '../utils/machines';

const BOOT_PORT = 0;

const TRANSPORT_ADAPTER = 1;

const zoneShape = PropTypes.shape({
  disks: PropTypes.arrayOf(PropTypes.object).isRequired,
  cdroms: PropTypes.arrayOf(PropTypes.object).isRequired,
  nics: PropTypes.arrayOf(PropTypes.object).isRequired,
});

export const hardwareShape = PropTypes.shape({
  controllers: PropTypes.arrayOf(PropTypes.object).isRequired,
  attachments: PropTypes.arrayOf(PropTypes.object).isRequired,
  nics: PropTypes.arrayOf(PropTypes.object).isRequired,
  zone: zoneShape,
});

const GroupRow = ({ icon: Icon, label, badge = '' }) => (
  <div className="device-row device-group">
    <Icon className="text-muted" aria-hidden="true" />
    <span>{label}</span>
    {badge ? <span className="badge text-bg-secondary">{badge}</span> : null}
  </div>
);

GroupRow.propTypes = {
  icon: PropTypes.elementType.isRequired,
  label: PropTypes.string.isRequired,
  badge: PropTypes.string,
};

const ChildRow = ({ icon: Icon, name, value, badge = '', badgeTitle = '' }) => (
  <div className="device-row device-child">
    <Icon className="text-muted" aria-hidden="true" />
    <span className="device-meta">{name}</span>
    <span className="device-path" title={value}>
      {value}
    </span>
    {badge ? (
      <span className="badge text-bg-light ms-auto" title={badgeTitle}>
        {badge}
      </span>
    ) : null}
  </div>
);

ChildRow.propTypes = {
  icon: PropTypes.elementType.isRequired,
  name: PropTypes.string.isRequired,
  value: PropTypes.string.isRequired,
  badge: PropTypes.string,
  badgeTitle: PropTypes.string,
};

const ZoneDevices = ({ zone }) => {
  const { t } = useTranslation();
  return (
    <>
      {zone.disks.length > 0 ? (
        <GroupRow icon={FaHardDrive} label={t('machineEdit.currentHardware.disks')} />
      ) : null}
      {zone.disks.map(disk => (
        <ChildRow
          key={disk.name}
          icon={FaServer}
          name={disk.name}
          value={disk.value}
          badge={disk.boot ? t('machineEdit.currentHardware.boot') : ''}
          badgeTitle={t('machineEdit.currentHardware.zoneBootMediumTitle')}
        />
      ))}
      {zone.cdroms.length > 0 ? (
        <GroupRow icon={FaCompactDisc} label={t('machineEdit.currentHardware.cdDvd')} />
      ) : null}
      {zone.cdroms.map(cdrom => (
        <ChildRow key={cdrom.name} icon={FaCompactDisc} name={cdrom.name} value={cdrom.value} />
      ))}
      {zone.nics.length > 0 ? (
        <GroupRow icon={FaNetworkWired} label={t('machineEdit.currentHardware.network')} />
      ) : null}
      {zone.nics.map(nic => (
        <ChildRow key={nic.name} icon={FaEthernet} name={nic.name} value={zoneNicSummary(nic, t)} />
      ))}
    </>
  );
};

ZoneDevices.propTypes = {
  zone: zoneShape.isRequired,
};

const attachmentKey = entry => `${entry.controller}-${entry.port}-${entry.device}`;

const ControllerRows = ({ controller, attachments }) => {
  const { t } = useTranslation();
  return (
    <>
      <GroupRow icon={FaHardDrive} label={controller.name} badge={controller.type || ''} />
      {attachments.map(entry => (
        <ChildRow
          key={attachmentKey(entry)}
          icon={entry.kind === 'cdrom' ? FaCompactDisc : FaServer}
          name={t('machineEdit.currentHardware.portDev', {
            port: entry.port,
            device: entry.device,
          })}
          value={entry.path || t('machineEdit.currentHardware.emptyDrive')}
          badge={
            entry.port === BOOT_PORT && entry.kind === 'disk'
              ? t('machineEdit.currentHardware.boot')
              : ''
          }
          badgeTitle={t('machineEdit.currentHardware.bootMediumTitle')}
        />
      ))}
    </>
  );
};

ControllerRows.propTypes = {
  controller: PropTypes.shape({
    name: PropTypes.string.isRequired,
    type: PropTypes.string,
  }).isRequired,
  attachments: PropTypes.arrayOf(PropTypes.object).isRequired,
};

const AdapterRows = ({ nics }) => {
  const { t } = useTranslation();
  if (nics.length === 0) {
    return null;
  }
  return (
    <>
      <GroupRow icon={FaNetworkWired} label={t('machineEdit.currentHardware.networkAdapters')} />
      {nics.map(nic => (
        <ChildRow
          key={nic.adapter}
          icon={FaEthernet}
          name={t('machineEdit.currentHardware.adapter', { adapter: nic.adapter })}
          value={nicSummary(nic, t)}
          badge={
            nic.adapter === TRANSPORT_ADAPTER
              ? t('machineEdit.currentHardware.provisioningNat')
              : ''
          }
          badgeTitle={t('machineEdit.currentHardware.provisioningNatTitle')}
        />
      ))}
    </>
  );
};

AdapterRows.propTypes = {
  nics: PropTypes.arrayOf(PropTypes.object).isRequired,
};

/**
 * The devices of one machine as a read-only tree, hyperweaver-ui's
 * device tree: a zone draws its disks, the boot disk marked, its CD and
 * DVD drives and its network resources; a hyperweaver-agent machine
 * draws each storage controller with the media attached to it under it,
 * the disk on the first port marked as the boot medium and an empty
 * drive saying so, then its network adapters, the first marked as the
 * provisioning transport.
 */
const DeviceTree = ({ hardware }) => {
  const { t } = useTranslation();
  return (
    <div className="device-tree" data-tree="devices">
      <div className="device-tree-head">
        <FaPlug aria-hidden="true" />
        <span>{t('machineEdit.currentHardware.devices')}</span>
      </div>
      {hardware.zone ? (
        <ZoneDevices zone={hardware.zone} />
      ) : (
        <>
          {hardware.controllers.map(controller => (
            <ControllerRows
              key={controller.name}
              controller={controller}
              attachments={hardware.attachments.filter(
                entry => entry.controller === controller.name
              )}
            />
          ))}
          <AdapterRows nics={hardware.nics} />
        </>
      )}
    </div>
  );
};

DeviceTree.propTypes = {
  hardware: hardwareShape.isRequired,
};

export default DeviceTree;
