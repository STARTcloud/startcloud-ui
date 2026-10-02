import PropTypes from 'prop-types';
import { Modal } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';

import RecordRows from '../../../components/common/RecordRows';
import { serviceTone } from '../utils/manage';

const labelOf = key => key.replace(/_/gu, ' ').replace(/\b\w/gu, letter => letter.toUpperCase());

const textOf = value =>
  typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value);

const detailRows = details =>
  Object.entries(details || {}).map(([key, value]) => {
    const text = textOf(value);
    return {
      key,
      label: labelOf(key),
      value: text.includes('\n') ? (
        <pre className="small p-2 mb-0">{text}</pre>
      ) : (
        <span className="font-monospace small">{text}</span>
      ),
    };
  });

/**
 * The details of one service, hyperweaver-ui's dialog as a list dialog
 * of the pages contract: the FMRI, the state as a badge and the start
 * time, then every member the agent answered of `GET services/{fmri}`,
 * a multi-line value as a block, and the no details line when it
 * answered none.
 */
const ServiceDetailsModal = ({ service, onClose }) => {
  const { t } = useTranslation();
  const rows = detailRows(service.details);
  return (
    <Modal
      show
      onHide={onClose}
      dialogClassName="list-modal"
      scrollable
      data-dialog="service-details"
    >
      <Modal.Header closeButton>
        <Modal.Title as="h5">{t('host.serviceDetailsModal.title')}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <h6 className="fw-bold">{t('host.serviceDetailsModal.basicInfo')}</h6>
        <RecordRows
          rows={[
            {
              key: 'fmri',
              label: t('host.serviceDetailsModal.fmri'),
              value: <code>{service.fmri}</code>,
            },
            {
              key: 'state',
              label: t('host.serviceDetailsModal.state'),
              value: (
                <span className={`badge text-bg-${serviceTone(service.state)}`}>
                  {service.state}
                </span>
              ),
            },
            {
              key: 'stime',
              label: t('host.serviceDetailsModal.startTime'),
              value: service.stime || t('host.serviceDetailsModal.notAvailable'),
            },
          ]}
        />
        {rows.length > 0 ? (
          <>
            <h6 className="fw-bold">{t('host.serviceDetailsModal.detailedInfo')}</h6>
            <RecordRows rows={rows} className="mb-0" />
          </>
        ) : (
          <div className="alert alert-info mb-0" role="status">
            {t('host.serviceDetailsModal.noDetails')}
          </div>
        )}
      </Modal.Body>
    </Modal>
  );
};

ServiceDetailsModal.propTypes = {
  service: PropTypes.shape({
    fmri: PropTypes.string,
    state: PropTypes.string,
    stime: PropTypes.string,
    details: PropTypes.object,
  }).isRequired,
  onClose: PropTypes.func.isRequired,
};

export default ServiceDetailsModal;
