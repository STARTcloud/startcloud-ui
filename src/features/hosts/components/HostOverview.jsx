import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';

import SectionCard, { foldsShape } from '../../../components/common/SectionCard';

import ResourceUtilization from './ResourceUtilization';
import SystemInfoPanel from './SystemInfoPanel';

/**
 * The host overview of the host page, hyperweaver-ui's first panel, one
 * section card of the pages contract that folds under `overview`: the
 * system information in the leading column and the resource utilization
 * in the trailing one, one under the other on a narrow page.
 */
const HostOverview = ({ id, stats, folds }) => {
  const { t } = useTranslation();
  return (
    <div>
      <SectionCard
        title={t('hosts.overview.title')}
        folded={folds.folded('overview')}
        onFold={() => folds.toggle('overview')}
      >
        <div className="row g-4">
          <div className="col-12 col-lg-6">
            <SystemInfoPanel id={id} stats={stats} />
          </div>
          <div className="col-12 col-lg-6">
            <ResourceUtilization id={id} stats={stats} />
          </div>
        </div>
      </SectionCard>
    </div>
  );
};

HostOverview.propTypes = {
  id: PropTypes.string.isRequired,
  stats: PropTypes.object.isRequired,
  folds: foldsShape.isRequired,
};

export default HostOverview;
