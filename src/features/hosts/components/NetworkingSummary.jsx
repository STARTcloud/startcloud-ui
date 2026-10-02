import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';

import SectionCard, { foldsShape } from '../../../components/common/SectionCard';
import { interfaceCounts } from '../utils/resources';

const FOLD = 'summary';

const COUNTS = [
  { key: 'total', tone: 'info', labelKey: 'host.networkSummary.totalInterfaces' },
  { key: 'physical', tone: 'primary', labelKey: 'host.networkSummary.physical' },
  { key: 'virtual', tone: 'info', labelKey: 'host.networkSummary.virtual' },
  { key: 'up', tone: 'success', labelKey: 'host.networkSummary.up' },
  { key: 'down', tone: 'danger', labelKey: 'host.networkSummary.down' },
];

/**
 * The network summary of the networking page, hyperweaver-ui's card,
 * the first section of the page: its title, the chevron that
 * folds it, the fold kept in the page's preferences, and its five
 * counts, each a pair of badges, the interfaces in all, the physical
 * ones, class `phys`, the virtual ones, class `vnic`, and the ones up
 * and down. Nothing draws while the host answered no interface.
 */
const NetworkingSummary = ({ interfaces, folds }) => {
  const { t } = useTranslation();
  if (interfaces.length === 0) {
    return null;
  }
  const counts = interfaceCounts(interfaces);
  const folded = folds.folded(FOLD);
  return (
    <div data-panel="networking-summary" data-folded={folded}>
      <SectionCard
        title={t('host.networkSummary.title')}
        folded={folded}
        onFold={() => folds.toggle(FOLD)}
        foldTitle={t(folded ? 'host.networkSummary.expand' : 'host.networkSummary.collapse')}
      >
        <div
          className="d-flex flex-wrap gap-2"
          data-counts="interfaces"
          data-total={counts.total}
          data-physical={counts.physical}
          data-virtual={counts.virtual}
          data-up={counts.up}
          data-down={counts.down}
        >
          {COUNTS.map(({ key, tone, labelKey }) => (
            <div key={key} className="d-flex align-items-center" data-count={key}>
              <span className="badge text-bg-secondary">{t(labelKey)}</span>
              <span className={`badge text-bg-${tone}`}>{counts[key]}</span>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
};

NetworkingSummary.propTypes = {
  interfaces: PropTypes.arrayOf(PropTypes.object).isRequired,
  folds: foldsShape.isRequired,
};

export default NetworkingSummary;
