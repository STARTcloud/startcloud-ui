import PropTypes from 'prop-types';
import { Card, Col, Row } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { FaDisplay } from 'react-icons/fa6';
import { Link } from 'react-router-dom';

import EmptyState from '../../../components/common/EmptyState';
import { machineRoute, provisionerOf, statusOf, statusTone, tagsOf } from '../utils/machines';

const MachineCard = ({ id, machine }) => {
  const { t } = useTranslation();
  const status = statusOf(machine);
  const provisioner = provisionerOf(machine);
  return (
    <Col data-machine-card={machine.name}>
      <Card className="h-100 shadow-sm host-card">
        <Card.Body className="d-flex flex-column gap-2">
          <div className="d-flex align-items-start gap-2">
            <span className="card-media">
              <FaDisplay aria-hidden="true" />
            </span>
            <div className="flex-grow-1 min-width-0">
              <Card.Title as="h3" className="h6 mb-0 text-break">
                <Link
                  to={machineRoute(id, machine.name)}
                  className="stretched-link text-decoration-none"
                >
                  {machine.name}
                </Link>
              </Card.Title>
            </div>
          </div>
          <div className="d-flex flex-wrap gap-1">
            <span className={`badge text-bg-${statusTone(status)} text-capitalize`}>{status}</span>
            {machine.hypervisor ? (
              <span className="badge text-bg-secondary">{machine.hypervisor}</span>
            ) : null}
            {tagsOf(machine).map(tag => (
              <span key={tag} className="badge text-bg-light">
                {tag}
              </span>
            ))}
          </div>
          {provisioner ? (
            <div className="mt-auto small text-body-secondary">
              {t('hosts.machines.column.provisioner')}: <code>{provisioner}</code>
            </div>
          ) : null}
        </Card.Body>
      </Card>
    </Col>
  );
};

MachineCard.propTypes = {
  id: PropTypes.string.isRequired,
  machine: PropTypes.object.isRequired,
};

/**
 * The machines page's cards, one card a machine in the hosts page's card
 * shape: the display glyph, the machine's name as the stretched link to
 * its page, the status badge in its tone, the hypervisor and the tags as
 * badges, and the provisioner in the foot; the empty placard titled
 * `emptyText` while no row is left.
 */
const MachineCards = ({ id, rows, emptyText }) => {
  if (rows.length === 0) {
    return <EmptyState title={emptyText} />;
  }
  return (
    <Row xs={1} md={2} xl={4} className="g-3 mb-3 host-cards" data-list="machine-cards">
      {rows.map(machine => (
        <MachineCard key={machine.name} id={id} machine={machine} />
      ))}
    </Row>
  );
};

MachineCards.propTypes = {
  id: PropTypes.string.isRequired,
  rows: PropTypes.arrayOf(PropTypes.object).isRequired,
  emptyText: PropTypes.node.isRequired,
};

export default MachineCards;
