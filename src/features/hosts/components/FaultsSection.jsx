import PropTypes from 'prop-types';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import TabStrip from '../../../components/common/TabStrip';

import FaultList from './FaultList';
import FaultManagerConfig from './FaultManagerConfig';

const TABS = [
  { key: 'faults', labelKey: 'host.faultManagement.tabCurrentFaults' },
  { key: 'config', labelKey: 'host.faultManagement.tabConfiguration' },
];

/**
 * The fault management of a host, hyperweaver-ui's `FaultManagement`
 * as the body of the Manage page's Fault management section: the
 * current faults and the fault manager's configuration on the one tab
 * strip, each over the one table the page's binding narrows; the system
 * logs and the syslog configuration hyperweaver-ui nested here are the
 * page's own sections behind their own tokens.
 */
const FaultsSection = ({ id, ctx, tables, readings, rows, filtering }) => {
  const { t } = useTranslation();
  const [active, setActive] = useState('faults');
  return (
    <div data-tabs="fault-management">
      <TabStrip
        tabs={TABS.map(tab => ({ key: tab.key, label: t(tab.labelKey) }))}
        active={active}
        onSelect={setActive}
        className="mb-3"
      />
      {active === 'faults' ? (
        <FaultList
          id={id}
          ctx={ctx}
          table={tables.faults}
          reading={readings.faults}
          filtering={filtering}
        />
      ) : (
        <FaultManagerConfig
          ctx={ctx}
          table={tables.faultModules}
          reading={readings.faultModules}
          filtering={filtering}
          modules={rows.faultModules}
        />
      )}
    </div>
  );
};

FaultsSection.propTypes = {
  id: PropTypes.string.isRequired,
  ctx: PropTypes.object.isRequired,
  tables: PropTypes.shape({
    faults: PropTypes.object.isRequired,
    faultModules: PropTypes.object.isRequired,
  }).isRequired,
  readings: PropTypes.shape({
    faults: PropTypes.object.isRequired,
    faultModules: PropTypes.object.isRequired,
  }).isRequired,
  rows: PropTypes.shape({ faultModules: PropTypes.array.isRequired }).isRequired,
  filtering: PropTypes.bool.isRequired,
};

export default FaultsSection;
