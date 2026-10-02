import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';

import SectionCard, { foldsShape } from '../../../components/common/SectionCard';

const FOLD = 'summary';

const capital = word => word.charAt(0).toUpperCase() + word.slice(1);

const pptCapableOf = (summary, categories) =>
  summary.ppt_capable ||
  Object.values(categories).reduce((total, category) => total + (category.ppt_capable || 0), 0);

/**
 * The device summary of the devices page, hyperweaver-ui's card, the
 * first section of the page: its title, the chevron that
 * folds it, the fold kept in the page's preferences, and its counts,
 * each a pair of badges, one a category and then the devices capable of
 * passthrough, the ones free for it and the ones assigned. Nothing
 * draws while the host answered no category.
 */
const DeviceSummary = ({ categories, summary, ppt, folds }) => {
  const { t } = useTranslation();
  const names = Object.keys(categories);
  if (names.length === 0) {
    return null;
  }
  const folded = folds.folded(FOLD);
  const title = t('host.deviceSummary.title');
  const counts = [
    ...names.map(name => ({
      key: name,
      label: capital(name),
      tone: 'info',
      count: categories[name].total || 0,
    })),
    {
      key: 'ppt-capable',
      label: t('host.deviceSummary.pptCapableLabel'),
      tone: 'success',
      count: pptCapableOf(summary, categories),
    },
    {
      key: 'ppt-available',
      label: t('host.deviceSummary.pptAvailableLabel'),
      tone: 'warning',
      count: ppt.summary?.available || 0,
    },
    {
      key: 'ppt-assigned',
      label: t('host.deviceSummary.pptAssignedLabel'),
      tone: 'danger',
      count: summary.ppt_assigned || 0,
    },
  ];
  return (
    <div data-panel="devices-summary" data-folded={folded}>
      <SectionCard
        title={title}
        folded={folded}
        onFold={() => folds.toggle(FOLD)}
        foldTitle={t(folded ? 'host.deviceSummary.expand' : 'host.deviceSummary.collapse')}
      >
        <div className="d-flex flex-wrap gap-2" data-counts="devices">
          {counts.map(({ key, label, tone, count }) => (
            <div key={key} className="d-flex align-items-center" data-count={key}>
              <span className="badge text-bg-secondary">{label}</span>
              <span className={`badge text-bg-${tone}`}>{count}</span>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
};

DeviceSummary.propTypes = {
  categories: PropTypes.object.isRequired,
  summary: PropTypes.object.isRequired,
  ppt: PropTypes.object.isRequired,
  folds: foldsShape.isRequired,
};

export default DeviceSummary;
