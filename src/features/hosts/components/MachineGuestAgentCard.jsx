import PropTypes from 'prop-types';
import { useEffect, useMemo, useState } from 'react';
import { Modal } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { FaPlug } from 'react-icons/fa6';

import SectionCard, { foldsShape } from '../../../components/common/SectionCard';
import SubTable from '../../../components/common/SubTable';
import { useNotify } from '../../../contexts/NoticeContext';
import { useStatus } from '../../../contexts/StatusContext';
import { log } from '../../../lib/logger';
import { nextSort, sortItems } from '../../../utils/sort';
import { fetchGuestNetwork, fetchGuestOsInfo, setupGuestAgent } from '../api/machines';
import { useHostRow } from '../hooks/useHostRow';
import { hostHasFeature } from '../utils/capabilities';
import { configurationOf, guestSourceKey } from '../utils/machines';

const FOLD = 'machine-guest-agent';

const DEFAULT_SORT = [{ column: 'name', direction: 'asc' }];

const NO_HIDDEN = new Set();

const NO_OS = { key: '', osinfo: null };

const CLOSED = { open: false, loaded: false, failed: '', interfaces: [], ips: [] };

const addressesOf = row =>
  (Array.isArray(row['ip-addresses']) ? row['ip-addresses'] : []).map(
    entry => `${entry['ip-address']}/${entry.prefix}`
  );

const columns = [
  {
    key: 'name',
    kind: 'name',
    labelKey: 'machine.machineGuestAgent.nameHeader',
    value: row => row.name,
  },
  {
    key: 'mac',
    kind: 'text',
    labelKey: 'machine.machineGuestAgent.macHeader',
    priority: 2,
    value: row => row['hardware-address'] || '',
    render: row =>
      row['hardware-address'] ? <code className="small">{row['hardware-address']}</code> : null,
  },
  {
    key: 'addresses',
    kind: 'badges',
    labelKey: 'machine.machineGuestAgent.ipHeader',
    priority: 1,
    value: row => addressesOf(row).join(', '),
    render: row => (
      <span className="d-inline-flex flex-column">
        {addressesOf(row).map(address => (
          <code key={address} className="small">
            {address}
          </code>
        ))}
      </span>
    ),
  },
];

const Addresses = ({ ips, emptyKey }) => {
  const { t } = useTranslation();
  if (ips.length === 0) {
    return <p className="text-muted small mb-2">{t(emptyKey)}</p>;
  }
  return (
    <div className="mb-2" data-list="guest-addresses">
      {ips.map(ip => (
        <div key={ip}>
          <code>{ip}</code>
        </div>
      ))}
    </div>
  );
};

Addresses.propTypes = {
  ips: PropTypes.arrayOf(PropTypes.string).isRequired,
  emptyKey: PropTypes.string.isRequired,
};

const NetworkBody = ({ network, flat }) => {
  const { t, i18n } = useTranslation();
  const [sort, setSort] = useState(DEFAULT_SORT);
  const ctx = useMemo(() => ({ t, language: i18n.language }), [t, i18n.language]);
  if (!network.loaded) {
    return <p className="mb-0">{t('pages.loading')}</p>;
  }
  if (network.failed) {
    return (
      <div className="alert alert-warning mb-0" role="alert">
        {network.failed}
      </div>
    );
  }
  if (flat) {
    return <Addresses ips={network.ips} emptyKey="machine.machineGuestAgent.noAddresses" />;
  }
  return (
    <SubTable
      columns={columns}
      rows={sortItems(network.interfaces, sort, columns, ctx)}
      rowKey={row => row.name}
      sort={sort}
      onSort={(column, options) => setSort(current => nextSort(current, column, options))}
      hiddenColumns={NO_HIDDEN}
      ctx={ctx}
      emptyText={t('machine.machineGuestAgent.noAddresses')}
    />
  );
};

NetworkBody.propTypes = {
  network: PropTypes.shape({
    loaded: PropTypes.bool.isRequired,
    failed: PropTypes.string.isRequired,
    interfaces: PropTypes.arrayOf(PropTypes.object).isRequired,
    ips: PropTypes.arrayOf(PropTypes.string).isRequired,
  }).isRequired,
  flat: PropTypes.bool.isRequired,
};

const OsLine = ({ osinfo }) => {
  const { t } = useTranslation();
  return (
    <div className="mb-2" data-line="guest-os">
      <span className="text-muted small me-2">{t('machine.machineGuestAgent.osLabel')}</span>
      <span className="small">
        {osinfo['pretty-name'] || osinfo.name || t('machine.machineGuestAgent.unknownOs')}
      </span>
      {osinfo['kernel-release'] ? (
        <span className="text-muted small ms-2">({osinfo['kernel-release']})</span>
      ) : null}
    </div>
  );
};

OsLine.propTypes = {
  osinfo: PropTypes.object.isRequired,
};

/**
 * The operating system the guest names itself, `GET
 * machines/{name}/guest/osinfo`, read once as the card draws while
 * `asked` and again when `turn` moves, the page's Refresh and the
 * stream's fresh opening; null until the agent answers.
 *
 * @param {Object} options - The status, the host, the machine, whether to ask and the turn
 * @returns {Object|null} The `osinfo`
 */
const useGuestOs = ({ status, id, name, asked, turn }) => {
  const [held, setHeld] = useState(NO_OS);
  const key = `${id}|${name}|${turn}`;

  useEffect(() => {
    if (!asked) {
      return undefined;
    }
    let live = true;
    fetchGuestOsInfo(status, id, name)
      .then(osinfo => {
        if (live) {
          setHeld({ key, osinfo });
        }
      })
      .catch(error => {
        log.api.error('Error fetching guest os', { id, name, error: error.message });
      });
    return () => {
      live = false;
    };
  }, [asked, status, id, name, key]);

  return asked && held.key.startsWith(`${id}|${name}|`) ? held.osinfo : null;
};

/**
 * The guest agent of one machine, hyperweaver-ui's guest agent card, a
 * section card that folds under `machine-guest-agent`, drawn while the
 * machine's detail carries `configuration.guest_info`, which both agents
 * answer of a running machine: the time the agent was last asked; while
 * the channel answers, the guest's own word for its operating system,
 * the addresses the discovery found with the source that reported them,
 * and More, which reads the guest's live network once and draws it in a
 * list dialog, the interfaces in the one table and, for a UTM machine,
 * the flat addresses it answers in their place; while the channel is
 * silent, the line saying so and Set up channel, one request and one
 * notice, the agent's own message with the note that the machine must
 * be restarted where the answer says so, the detail read again once
 * after a success. The operating system, the network and the setup are
 * asked only of a host whose own row lists `guest-agent`, and the first
 * and the last never of a UTM machine, whose agent refuses both.
 */
const MachineGuestAgentCard = ({ id, name, detail, turn, onChanged, folds }) => {
  const { t } = useTranslation();
  const status = useStatus();
  const notify = useNotify();
  const server = useHostRow(id);
  const [network, setNetwork] = useState(CLOSED);
  const [busy, setBusy] = useState(false);
  const guest = configurationOf(detail).guest_info || null;
  const offered = hostHasFeature(server, 'guest-agent');
  const utm = detail.machine_info?.hypervisor === 'utm';
  const ready = Boolean(guest?.agent_responding);
  const osinfo = useGuestOs({ status, id, name, asked: ready && offered && !utm, turn });

  if (!guest) {
    return null;
  }

  const ips = Array.isArray(guest.ips) ? guest.ips : [];

  const setup = async () => {
    setBusy(true);
    try {
      const answer = await setupGuestAgent(status, id, name);
      const said = answer?.message || t('machine.machineGuestAgent.channelConfiguredFallback');
      const restart = answer?.requires_restart
        ? t('machine.machineGuestAgent.requiresRestartNote')
        : '';
      notify('success', [said, restart].filter(Boolean).join(' '));
      onChanged();
    } catch (error) {
      notify('danger', error.message || t('hosts.controls.failed'));
    } finally {
      setBusy(false);
    }
  };

  const more = async () => {
    setNetwork({ ...CLOSED, open: true });
    try {
      const answer = await fetchGuestNetwork(status, id, name);
      setNetwork({ ...CLOSED, ...answer, open: true, loaded: true });
    } catch (error) {
      const failed = error.message || t('hosts.machines.guest.networkFailed');
      setNetwork({ ...CLOSED, open: true, loaded: true, failed });
    }
  };

  const checked = guest.checked_at ? (
    <span className="text-muted small fw-normal">
      {t('machine.machineGuestAgent.checkedAt', {
        time: new Date(guest.checked_at).toLocaleTimeString(),
      })}
    </span>
  ) : null;

  return (
    <div className="col-12 col-lg-6 col-xxl-4" data-panel="machine-guest-agent">
      <SectionCard
        title={t('machine.machineGuestAgent.heading')}
        badge={checked}
        className="mb-0 h-100"
        folded={folds.folded(FOLD)}
        onFold={() => folds.toggle(FOLD)}
      >
        {ready ? (
          <>
            {osinfo ? <OsLine osinfo={osinfo} /> : null}
            <Addresses ips={ips} emptyKey="machine.machineGuestAgent.noAddresses" />
            {ips.length > 0 ? (
              <span className="d-block text-muted small mb-2">
                {t('machine.machineGuestAgent.viaSource', {
                  source: t(guestSourceKey(guest.source, 'machineGuestAgent')),
                })}
              </span>
            ) : null}
            {ips.length > 0 && offered ? (
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary"
                data-action="guest-network"
                onClick={more}
              >
                {t('machine.machineGuestAgent.moreButton')}
              </button>
            ) : null}
          </>
        ) : (
          <>
            <p className="text-muted small mb-2">
              {t('machine.machineGuestAgent.channelNotResponding')}
            </p>
            {offered && !utm ? (
              <button
                type="button"
                className="btn btn-sm btn-outline-primary"
                title={t('machine.machineGuestAgent.setupChannelTooltip')}
                data-action="guest-setup"
                disabled={busy}
                onClick={setup}
              >
                <FaPlug className="me-2" aria-hidden="true" />
                {t('machine.machineGuestAgent.setupChannelButton')}
              </button>
            ) : null}
          </>
        )}
      </SectionCard>
      <Modal
        show={network.open}
        onHide={() => setNetwork(CLOSED)}
        dialogClassName="list-modal"
        scrollable
      >
        <Modal.Header closeButton>
          <Modal.Title>{t('machine.machineGuestAgent.networkModalTitle')}</Modal.Title>
        </Modal.Header>
        <Modal.Body data-dialog="guest-network">
          <NetworkBody network={network} flat={utm} />
        </Modal.Body>
      </Modal>
    </div>
  );
};

MachineGuestAgentCard.propTypes = {
  id: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  detail: PropTypes.object.isRequired,
  turn: PropTypes.number.isRequired,
  onChanged: PropTypes.func.isRequired,
  folds: foldsShape.isRequired,
};

export default MachineGuestAgentCard;
