import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';

import { CollapseButton } from '../../../components/common/GroupHeading';
import { CACHE_KEYS, cacheBadgeClass } from '../utils/cacheLevel';
import { ratioColor } from '../utils/vmStatus';

const CACHE_UDS = {
  in_use: { cache_level: 0, uds_in_use: true },
  assigned: { cache_level: 0, uds_in_use: false },
  available: { cache_level: 1 },
  standby: { cache_level: 2 },
};

const scoreText = value => (value % 1 === 0 ? String(value) : value.toFixed(1));

const PoolCard = ({ name, pool, state, onClick }) => {
  const { t } = useTranslation();
  const staticIp = pool.service_type === 'IPMachinesService';
  const health = pool.agent_health ?? pool.total;
  const publication =
    !staticIp && pool.current_pub_revision
      ? t('vdi.pools.publication', { revision: pool.current_pub_revision })
      : '';
  return (
    <div className="col">
      <button
        type="button"
        className={`card fleet-card h-100 w-100 text-center ${state}`}
        onClick={onClick}
        aria-pressed={state === 'include'}
      >
        <div className="card-body">
          <div className="display-6 fw-bold">{pool.total}</div>
          <div className="small text-body-secondary fleet-card-label">{name}</div>
          <div className="d-flex flex-wrap justify-content-center gap-1 mt-2">
            {CACHE_KEYS.filter(key => pool[key]).map(key => (
              <span key={key} className={`badge ${cacheBadgeClass(CACHE_UDS[key])}`}>
                {t(`vdi.pools.${key}`, { n: pool[key] })}
              </span>
            ))}
          </div>
          <div
            className="small mt-2"
            style={{ color: pool.total ? ratioColor(health / pool.total) : undefined }}
          >
            {t('vdi.pools.agentsHealthy', { healthy: scoreText(health), total: pool.total })}
            {publication ? ` · ${publication}` : ''}
          </div>
          {staticIp ? null : (
            <div className="small text-body-tertiary">
              {t('vdi.pools.capacity', { total: pool.total, max: pool.max_srvs || '?' })}
              {pool.stale ? (
                <span className="text-danger"> · {t('vdi.pools.stale', { n: pool.stale })}</span>
              ) : null}
            </div>
          )}
        </div>
      </button>
    </div>
  );
};

PoolCard.propTypes = {
  name: PropTypes.string.isRequired,
  pool: PropTypes.object.isRequired,
  state: PropTypes.oneOf(['', 'include', 'exclude']).isRequired,
  onClick: PropTypes.func.isRequired,
};

/**
 * One card per UDS pool under a foldable heading: the VM count, one badge
 * per cache level, the agents-healthy line coloured by its ratio with the
 * current publication, and the capacity line with the stale-image count
 * on a dynamic pool; a click cycles the Pool filter and the fold persists
 * with the page's other preferences. Nothing without pools.
 */
const PoolCards = ({ pools, collapsed, onToggle, filterState, onCycle }) => {
  const { t } = useTranslation();
  const names = Object.keys(pools).sort();
  if (names.length === 0) {
    return null;
  }
  return (
    <div className="mb-3">
      <div className="d-flex align-items-center gap-2 mb-2">
        <CollapseButton collapsed={collapsed} onToggle={onToggle} />
        <span className="navbar-search-group-label">{t('vdi.pools.title')}</span>
      </div>
      {collapsed ? null : (
        <div className="row row-cols-1 row-cols-md-3 row-cols-xl-5 g-3">
          {names.map(name => (
            <PoolCard
              key={name}
              name={name}
              pool={pools[name]}
              state={filterState('pool', name)}
              onClick={() => onCycle('pool', name)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

PoolCards.propTypes = {
  pools: PropTypes.object.isRequired,
  collapsed: PropTypes.bool.isRequired,
  onToggle: PropTypes.func.isRequired,
  filterState: PropTypes.func.isRequired,
  onCycle: PropTypes.func.isRequired,
};

export default PoolCards;
