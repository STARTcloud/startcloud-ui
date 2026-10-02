import PropTypes from 'prop-types';
import { Modal } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';

import RecordRows from '../../../components/common/RecordRows';
import { serviceTone } from '../utils/manage';

import { DialogTable } from './ManageTable';

const LONG_VALUE = 100;

const textOf = value =>
  typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value);

const isLink = text => text.startsWith('http://') || text.startsWith('https://');

const PropertyValue = ({ text }) => {
  if (text.includes('\n') || text.length > LONG_VALUE) {
    return <pre className="small bg-body-tertiary p-2 mb-0">{text}</pre>;
  }
  if (isLink(text)) {
    return (
      <a href={text} target="_blank" rel="noopener noreferrer" className="small">
        {text}
      </a>
    );
  }
  return <span className="font-monospace small">{text}</span>;
};

PropertyValue.propTypes = {
  text: PropTypes.string.isRequired,
};

const PROPERTY_COLUMNS = [
  {
    key: 'property',
    kind: 'name',
    labelKey: 'host.servicePropertiesModal.property',
    value: row => row.property,
    render: row => <code className="small">{row.property}</code>,
  },
  {
    key: 'value',
    kind: 'text',
    labelKey: 'host.servicePropertiesModal.value',
    prose: true,
    value: row => row.value,
    render: row => <PropertyValue text={row.value} />,
  },
];

const propertyRows = properties =>
  Object.entries(properties || {}).map(([property, value]) => ({
    property,
    value: textOf(value),
  }));

/**
 * The properties of one service, hyperweaver-ui's dialog as a list
 * dialog of the pages contract: the FMRI and the state, then the
 * properties `GET services/{fmri}/properties` answered over the one
 * table, a long or multi-line value as a block and a URL as a link, and
 * the no properties line when it answered none.
 */
const ServicePropertiesModal = ({ service, ctx, onClose }) => {
  const { t } = useTranslation();
  const rows = propertyRows(service.properties);
  return (
    <Modal
      show
      onHide={onClose}
      dialogClassName="list-modal"
      scrollable
      data-dialog="service-properties"
    >
      <Modal.Header closeButton>
        <Modal.Title as="h5">{t('host.servicePropertiesModal.title')}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <h6 className="fw-bold">{t('host.servicePropertiesModal.serviceInfo')}</h6>
        <RecordRows
          rows={[
            {
              key: 'fmri',
              label: t('host.servicePropertiesModal.fmri'),
              value: <code>{service.fmri}</code>,
            },
            {
              key: 'state',
              label: t('host.servicePropertiesModal.currentState'),
              value: (
                <span className={`badge text-bg-${serviceTone(service.state)}`}>
                  {service.state}
                </span>
              ),
            },
          ]}
        />
        {rows.length > 0 ? (
          <>
            <h6 className="fw-bold">{t('host.servicePropertiesModal.configProps')}</h6>
            <p className="form-text text-muted">
              {t('host.servicePropertiesModal.configPropsHelp')}
            </p>
            <DialogTable
              name="service-properties"
              columns={PROPERTY_COLUMNS}
              rows={rows}
              rowKey={row => row.property}
              ctx={ctx}
              emptyText={t('host.servicePropertiesModal.noProps')}
            />
          </>
        ) : (
          <div className="alert alert-info mb-0" role="status">
            {t('host.servicePropertiesModal.noProps')}
          </div>
        )}
      </Modal.Body>
    </Modal>
  );
};

ServicePropertiesModal.propTypes = {
  service: PropTypes.shape({
    fmri: PropTypes.string,
    state: PropTypes.string,
    properties: PropTypes.object,
  }).isRequired,
  ctx: PropTypes.object.isRequired,
  onClose: PropTypes.func.isRequired,
};

export default ServicePropertiesModal;
