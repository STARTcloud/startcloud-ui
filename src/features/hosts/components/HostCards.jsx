import PropTypes from 'prop-types';
import { Card, Col, Row } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { FaServer } from 'react-icons/fa6';
import { Link } from 'react-router-dom';

import EmptyState from '../../../components/common/EmptyState';
import { hostHasFeature } from '../utils/capabilities';
import { hostKey, hostLabel } from '../utils/hosts';

/**
 * The key of the machines word of a host's row: yes while the row lists
 * `machines`, no otherwise.
 *
 * @param {Object} server - The registry row, or the one serving agent's
 * @returns {string} The locale key
 */
export const machinesKeyOf = server =>
  hostHasFeature(server, 'machines') ? 'hosts.page.machinesYes' : 'hosts.page.machinesNo';

/**
 * The pick of the hosts page while a hand-off waits: `routeOf` answers
 * the landing route of a host that can take it and the empty string for
 * one that cannot, and `reasonKey` the one reason the held hosts read.
 */
export const pickShape = PropTypes.shape({
  routeOf: PropTypes.func.isRequired,
  reasonKey: PropTypes.string.isRequired,
});

const HostCard = ({ server, pick }) => {
  const { t } = useTranslation();
  const route = pick ? pick.routeOf(server) : '';
  const held = Boolean(pick) && !route;
  const hypervisors = server.capabilities?.hypervisors || [];
  const platform = server.capabilities?.platform || '';
  const version = server.capabilities?.version || '';
  return (
    <Col
      className={[held ? 'held' : '', route ? 'pick' : ''].filter(Boolean).join(' ') || undefined}
      data-host-card={hostKey(server)}
      data-pick={route ? 'press' : undefined}
      aria-disabled={held ? 'true' : undefined}
    >
      <Card className="h-100 shadow-sm host-card">
        <Card.Body className="d-flex flex-column gap-2">
          <div className="d-flex align-items-start gap-2">
            <span className="card-media">
              <FaServer aria-hidden="true" />
            </span>
            <div className="flex-grow-1 min-width-0">
              <Card.Title as="h3" className="h6 mb-0 text-break">
                {held ? (
                  hostLabel(server)
                ) : (
                  <Link
                    to={route || `/hosts/${hostKey(server)}`}
                    className="stretched-link text-decoration-none"
                  >
                    {hostLabel(server)}
                  </Link>
                )}
              </Card.Title>
              {server.hostname ? (
                <div className="small text-body-secondary">{server.hostname}</div>
              ) : null}
              {held ? (
                <div className="host-reason" data-note="held">
                  {t(pick.reasonKey)}
                </div>
              ) : null}
            </div>
          </div>
          <div className="d-flex flex-wrap gap-1">
            {hypervisors.map(hypervisor => (
              <span key={hypervisor} className="badge text-bg-secondary">
                {hypervisor}
              </span>
            ))}
            {platform ? <span className="badge text-bg-light">{platform}</span> : null}
            {version ? <span className="badge text-bg-light">v{version}</span> : null}
          </div>
          <div className="mt-auto small text-body-secondary">
            {t('hosts.page.machines')}: {t(machinesKeyOf(server))}
          </div>
        </Card.Body>
      </Card>
    </Col>
  );
};

HostCard.propTypes = {
  server: PropTypes.object.isRequired,
  pick: pickShape,
};

/**
 * The hosts page's cards, one card a host: the server glyph, the host's
 * name as the stretched link to its page, the hostname under it, the
 * hypervisors, the platform and the version as badges, and the machines
 * word in the foot; while a hand-off waits, `pick`, a host that can take
 * it has its whole card as one press to its landing route and a host that
 * cannot is greyed with its name as plain text and its one reason under
 * it; the empty placard titled `emptyText` while no row is left.
 */
const HostCards = ({ rows, pick = null, emptyText }) => {
  if (rows.length === 0) {
    return <EmptyState title={emptyText} />;
  }
  return (
    <Row xs={1} md={2} xl={4} className="g-3 mb-3 host-cards" data-list="host-cards">
      {rows.map(server => (
        <HostCard key={hostKey(server)} server={server} pick={pick} />
      ))}
    </Row>
  );
};

HostCards.propTypes = {
  rows: PropTypes.arrayOf(PropTypes.object).isRequired,
  pick: pickShape,
  emptyText: PropTypes.node.isRequired,
};

export default HostCards;
