import PropTypes from 'prop-types';
import { Modal } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';

import RecordRows from '../../../components/common/RecordRows';
import { severityTone } from '../utils/FaultUtils';

const DETAIL_ROWS = [
  ['host', 'host', 'mono'],
  ['platform', 'platform', 'mono'],
  ['faultClass', 'faultClass', 'mono'],
  ['affects', 'affects', 'mono'],
  ['problemIn', 'problemIn', 'mono'],
  ['description', 'description', ''],
  ['response', 'response', 'muted'],
  ['impact', 'impact', 'danger'],
];

const styled = (text, style) => {
  if (style === 'mono') {
    return <span className="font-monospace">{text}</span>;
  }
  if (style === 'muted') {
    return <span className="small text-muted">{text}</span>;
  }
  if (style === 'danger') {
    return <span className="fw-semibold text-danger">{text}</span>;
  }
  return text;
};

const rowsOf = (fault, t) => [
  { key: 'uuid', label: t('host.faultDetailsModal.uuid'), value: <code>{fault.uuid}</code> },
  {
    key: 'msgId',
    label: t('host.faultDetailsModal.messageId'),
    value: <span className="font-monospace fw-semibold">{fault.msgId}</span>,
  },
  {
    key: 'severity',
    label: t('host.faultDetailsModal.severity'),
    value: (
      <span className={`badge text-bg-${severityTone(fault.severity)}`}>{fault.severity}</span>
    ),
  },
  {
    key: 'time',
    label: t('host.faultDetailsModal.time'),
    value: fault.time || t('host.faultDetailsModal.na'),
  },
  ...DETAIL_ROWS.filter(([member]) => fault.details?.[member]).map(([member, key, style]) => ({
    key: member,
    label: t(`host.faultDetailsModal.${key}`),
    value: styled(fault.details[member], style),
  })),
  ...(fault.details?.action
    ? [
        {
          key: 'action',
          label: t('host.faultDetailsModal.recommendedAction'),
          value: (
            <div className="alert alert-info mb-0" role="note">
              {fault.details.action}
            </div>
          ),
        },
      ]
    : []),
];

/**
 * The details of one fault, hyperweaver-ui's dialog as a list dialog of
 * the pages contract: the uuid, the message id, the severity, the time
 * and every detail the fault carries, the recommended action as a note,
 * the raw output in the terminal block, and the no details line when
 * the fault carries none.
 */
const FaultDetailsModal = ({ fault, onClose }) => {
  const { t } = useTranslation();
  return (
    <Modal
      show
      onHide={onClose}
      dialogClassName="list-modal"
      scrollable
      data-dialog="fault-details"
    >
      <Modal.Header closeButton>
        <Modal.Title as="h5">{t('host.faultDetailsModal.title')}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <h6 className="fw-bold">{t('host.faultDetailsModal.faultInfo')}</h6>
        <RecordRows rows={rowsOf(fault, t)} />
        {fault.raw_output ? (
          <>
            <h6 className="fw-bold">{t('host.faultDetailsModal.detailedOutput')}</h6>
            <pre className="task-output mb-0">{fault.raw_output}</pre>
          </>
        ) : null}
        {fault.details ? null : (
          <div className="alert alert-info mb-0" role="status">
            {t('host.faultDetailsModal.noDetails')}
          </div>
        )}
      </Modal.Body>
    </Modal>
  );
};

FaultDetailsModal.propTypes = {
  fault: PropTypes.object.isRequired,
  onClose: PropTypes.func.isRequired,
};

export default FaultDetailsModal;
