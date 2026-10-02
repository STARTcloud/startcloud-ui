import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';

import SectionCard, { foldsShape } from '../../../components/common/SectionCard';

const FOLD = 'summary';

/**
 * The storage summary of the storage page, hyperweaver-ui's card, the
 * first section of the page: its title, the chevron that folds
 * it, the fold kept in the page's preferences, and its three counts,
 * each a pair of badges, the pools, the datasets and the physical disks.
 * Nothing draws while the host answered none of the three.
 */
const StorageSummary = ({ pools, datasets, disks, folds }) => {
  const { t } = useTranslation();
  if (pools + datasets + disks === 0) {
    return null;
  }
  const folded = folds.folded(FOLD);
  const counts = [
    { key: 'pools', labelKey: 'host.storageSummary.totalPools', count: pools },
    { key: 'datasets', labelKey: 'host.storageSummary.totalDatasets', count: datasets },
    { key: 'disks', labelKey: 'host.storageSummary.physicalDisks', count: disks },
  ];
  return (
    <div data-panel="storage-summary" data-folded={folded}>
      <SectionCard
        title={t('host.storageSummary.title')}
        folded={folded}
        onFold={() => folds.toggle(FOLD)}
        foldTitle={t(folded ? 'host.storageSummary.expand' : 'host.storageSummary.collapse')}
      >
        <div
          className="d-flex flex-wrap gap-2"
          data-counts="storage"
          data-pools={pools}
          data-datasets={datasets}
          data-disks={disks}
        >
          {counts.map(({ key, labelKey, count }) => (
            <div key={key} className="d-flex align-items-center" data-count={key}>
              <span className="badge text-bg-secondary">{t(labelKey)}</span>
              <span className="badge text-bg-info">{count}</span>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
};

StorageSummary.propTypes = {
  pools: PropTypes.number.isRequired,
  datasets: PropTypes.number.isRequired,
  disks: PropTypes.number.isRequired,
  folds: foldsShape.isRequired,
};

export default StorageSummary;
