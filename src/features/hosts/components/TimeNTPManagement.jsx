import PropTypes from 'prop-types';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import TabStrip from '../../../components/common/TabStrip';

import TimeSyncConfig from './TimeSync/Config';
import TimeSyncStatus from './TimeSync/Status';
import TimezoneSettings from './TimezoneSettings';

const TABS = [
  { key: 'status', labelKey: 'host.timeNTPManagement.timeSyncStatus' },
  { key: 'config', labelKey: 'host.timeNTPManagement.ntpConfiguration' },
  { key: 'timezone', labelKey: 'host.timeNTPManagement.timezone' },
];

/**
 * The time and NTP of a host, hyperweaver-ui's time management as the
 * body of the Manage page's Time and NTP section: its three tabs on
 * the one tab strip, the synchronization status with the peers over
 * the one table, the NTP configuration and the time zone.
 */
const TimeNTPManagement = ({ id, hostname, ctx, table, reading, filtering }) => {
  const { t } = useTranslation();
  const [active, setActive] = useState('status');
  return (
    <div data-tabs="time-ntp">
      <TabStrip
        tabs={TABS.map(tab => ({ key: tab.key, label: t(tab.labelKey) }))}
        active={active}
        onSelect={setActive}
        className="mb-3"
      />
      {active === 'status' ? (
        <TimeSyncStatus
          id={id}
          hostname={hostname}
          ctx={ctx}
          table={table}
          reading={reading}
          filtering={filtering}
        />
      ) : null}
      {active === 'config' ? (
        <TimeSyncConfig id={id} hostname={hostname} statusReading={reading} />
      ) : null}
      {active === 'timezone' ? <TimezoneSettings id={id} hostname={hostname} /> : null}
    </div>
  );
};

TimeNTPManagement.propTypes = {
  id: PropTypes.string.isRequired,
  hostname: PropTypes.string.isRequired,
  ctx: PropTypes.object.isRequired,
  table: PropTypes.object.isRequired,
  reading: PropTypes.shape({
    data: PropTypes.object,
    loaded: PropTypes.bool.isRequired,
    failed: PropTypes.bool.isRequired,
    refresh: PropTypes.func.isRequired,
  }).isRequired,
  filtering: PropTypes.bool.isRequired,
};

export default TimeNTPManagement;
