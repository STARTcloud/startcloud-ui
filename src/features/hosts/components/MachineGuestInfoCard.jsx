import PropTypes from 'prop-types';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaRotate } from 'react-icons/fa6';

import RecordRows from '../../../components/common/RecordRows';
import SectionCard, { foldsShape } from '../../../components/common/SectionCard';
import { useStatus } from '../../../contexts/StatusContext';
import { log } from '../../../lib/logger';
import { fetchGuestProperties } from '../api/machines';
import { useHostRow } from '../hooks/useHostRow';
import { hostHasHypervisor } from '../utils/capabilities';
import { cloudInitSeeds, guestAddresses } from '../utils/machines';

const FOLD = 'machine-guest-info';

const NONE = { key: '', properties: [] };

const codeRows = rows =>
  rows.map(row => ({
    key: row.name,
    label: row.name,
    value: <code className="small">{String(row.value)}</code>,
  }));

/**
 * The guest properties of one machine, `GET
 * machines/{name}/guest-properties`, read once as the card draws while
 * `asked` and again when `turn` moves, the page's Refresh, the card's
 * own and the stream's fresh opening; none until the agent answers.
 *
 * @param {Object} options - The status, the host, the machine, whether to ask and the turn
 * @returns {Array<Object>} The rows, `[{ name, value, timestamp, flags }]`
 */
const useGuestProperties = ({ status, id, name, asked, turn }) => {
  const [held, setHeld] = useState(NONE);
  const key = `${id}|${name}|${turn}`;

  useEffect(() => {
    if (!asked) {
      return undefined;
    }
    let live = true;
    fetchGuestProperties(status, id, name)
      .then(properties => {
        if (live) {
          setHeld({ key, properties });
        }
      })
      .catch(error => {
        log.api.error('Error fetching guest properties', { id, name, error: error.message });
      });
    return () => {
      live = false;
    };
  }, [asked, status, id, name, key]);

  return asked && held.key.startsWith(`${id}|${name}|`) ? held.properties : NONE.properties;
};

const Seeds = ({ seeds }) => {
  const { t } = useTranslation();
  return (
    <details className="mb-2" data-list="cloud-init">
      <summary className="small fw-semibold">
        {t('hosts.machines.guest.cloudInit', { count: seeds.length })}
      </summary>
      <RecordRows rows={codeRows(seeds)} className="mb-0 small" />
    </details>
  );
};

Seeds.propTypes = {
  seeds: PropTypes.arrayOf(PropTypes.object).isRequired,
};

/**
 * The guest information of one machine, hyperweaver-ui's guest
 * properties card, a section card that folds under `machine-guest-info`:
 * what the guest additions report of a VirtualBox machine, the guest's
 * addresses, one a network adapter, first, the cloud-init values the
 * agent seeded behind a fold, and every property behind a second fold
 * in a box that scrolls; Refresh in the card's actions reads the
 * properties again. The properties are asked only of a host whose own
 * row names `virtualbox` and never of a UTM machine, because
 * zoneweaver-agent has no such route and hyperweaver-agent refuses it
 * for UTM, and the card draws nothing while the agent answers no
 * property.
 */
const MachineGuestInfoCard = ({ id, name, detail, turn, folds }) => {
  const { t } = useTranslation();
  const status = useStatus();
  const server = useHostRow(id);
  const [own, setOwn] = useState(0);
  const asked =
    hostHasHypervisor(server, 'virtualbox') && detail.machine_info?.hypervisor !== 'utm';
  const properties = useGuestProperties({ status, id, name, asked, turn: `${turn}-${own}` });

  if (properties.length === 0) {
    return null;
  }

  const addresses = guestAddresses(properties);
  const seeds = cloudInitSeeds(properties);
  const refresh = t('hosts.machines.guest.refreshProperties');
  const again = (
    <button
      type="button"
      className="btn btn-sm btn-outline-secondary"
      title={refresh}
      aria-label={refresh}
      data-action="guest-properties"
      onClick={() => setOwn(current => current + 1)}
    >
      <FaRotate aria-hidden="true" />
    </button>
  );

  return (
    <div className="col-12 col-lg-6 col-xxl-4" data-panel="machine-guest-info">
      <SectionCard
        title={t('hosts.machines.guest.infoTitle')}
        className="mb-0 h-100"
        actions={again}
        folded={folds.folded(FOLD)}
        onFold={() => folds.toggle(FOLD)}
      >
        {addresses.length > 0 ? (
          <div className="mb-2" data-list="guest-property-addresses">
            {addresses.map(entry => (
              <div key={entry.nic}>
                <span className="text-muted small me-2">
                  {t('hosts.machines.guest.nic', { nic: entry.nic })}
                </span>
                <code>{entry.ip}</code>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-muted small mb-2">{t('hosts.machines.guest.noGuestIps')}</p>
        )}
        {seeds.length > 0 ? <Seeds seeds={seeds} /> : null}
        <details data-list="guest-properties">
          <summary className="small text-muted">
            {t('hosts.machines.guest.allProperties', { count: properties.length })}
          </summary>
          <div className="guest-properties">
            <RecordRows rows={codeRows(properties)} className="mb-0 small" />
          </div>
        </details>
      </SectionCard>
    </div>
  );
};

MachineGuestInfoCard.propTypes = {
  id: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  detail: PropTypes.object.isRequired,
  turn: PropTypes.number.isRequired,
  folds: foldsShape.isRequired,
};

export default MachineGuestInfoCard;
