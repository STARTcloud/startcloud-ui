import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';

import { fleetSummary, ratioColor } from '../utils/vmStatus';

const scoreText = value => (value % 1 === 0 ? String(value) : value.toFixed(1));

const StatusCard = ({ label, description, count, denominator, ratio, state, onClick }) => (
  <div className="col">
    <button
      type="button"
      className={`card fleet-card h-100 w-100 text-center ${state}`}
      onClick={onClick}
      aria-pressed={state === 'include'}
    >
      <div className="card-body">
        <div className="display-6 fw-bold" style={{ color: ratioColor(ratio) }}>
          {count}/{denominator}
        </div>
        <div className="small text-body-secondary fleet-card-label">{label}</div>
        <div className="small text-body-tertiary mt-1">{description}</div>
      </div>
    </button>
  </div>
);

StatusCard.propTypes = {
  label: PropTypes.string.isRequired,
  description: PropTypes.string.isRequired,
  count: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
  denominator: PropTypes.number.isRequired,
  ratio: PropTypes.number.isRequired,
  state: PropTypes.oneOf(['', 'include', 'exclude']).isRequired,
  onClick: PropTypes.func.isRequired,
};

const ratioOf = (value, denominator, inverted = false) => {
  if (!denominator) {
    return 1;
  }
  return inverted ? 1 - value / denominator : value / denominator;
};

/**
 * The five status cards: Healthy over the checked-in VMs, CIFS broken and
 * Icons missing over the VMs with a session, Stale (the agent score) over
 * the checked-in VMs, and VDIs without a user session over every VM with
 * its cache-level breakdown; the number is coloured by its ratio and a
 * click cycles the Status filter through include, exclude and off.
 */
const StatusCards = ({ vms, now, filterState, onCycle }) => {
  const { t } = useTranslation();
  const summary = fleetSummary(vms, now);
  const { counts, sessionCount, staleScore, total, totalWithStandby, noUserBreakdown } = summary;
  const breakdown = noUserBreakdown
    .map(entry =>
      t('vdi.cards.no_user.part', { n: entry.count, level: t(`vdi.cache.${entry.key}`) })
    )
    .join(' · ');
  const cards = [
    {
      key: 'healthy',
      count: counts.healthy,
      denominator: total,
      ratio: ratioOf(counts.healthy, total),
      description: t('vdi.cards.healthy.description'),
    },
    {
      key: 'cifs_broken',
      count: counts.cifs_broken,
      denominator: sessionCount,
      ratio: ratioOf(counts.cifs_broken, sessionCount, true),
      description: t('vdi.cards.cifs_broken.description'),
    },
    {
      key: 'icons_missing',
      count: counts.icons_missing,
      denominator: sessionCount,
      ratio: ratioOf(counts.icons_missing, sessionCount, true),
      description: t('vdi.cards.icons_missing.description'),
    },
    {
      key: 'stale',
      count: scoreText(staleScore),
      denominator: total,
      ratio: ratioOf(staleScore, total, true),
      description: t('vdi.cards.stale.description'),
    },
    {
      key: 'no_user',
      count: counts.no_user,
      denominator: totalWithStandby,
      ratio: ratioOf(counts.no_user, totalWithStandby),
      description: breakdown || t('vdi.cards.no_user.empty'),
    },
  ];
  return (
    <div className="row row-cols-1 row-cols-md-3 row-cols-xl-5 g-3 mb-3">
      {cards.map(card => (
        <StatusCard
          key={card.key}
          label={t(`vdi.cards.${card.key}.label`)}
          description={card.description}
          count={card.count}
          denominator={card.denominator}
          ratio={card.ratio}
          state={filterState('status', card.key)}
          onClick={() => onCycle('status', card.key)}
        />
      ))}
    </div>
  );
};

StatusCards.propTypes = {
  vms: PropTypes.array.isRequired,
  now: PropTypes.number.isRequired,
  filterState: PropTypes.func.isRequired,
  onCycle: PropTypes.func.isRequired,
};

export default StatusCards;
