import PropTypes from 'prop-types';
import { Modal } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';

import RecordRows from '../../../components/common/RecordRows';
import { packageDetailRows } from '../utils/manageCatalog';

const FLAG_ROWS = [
  ['frozen', 'host.packageDetailsModal.frozen'],
  ['manually_installed', 'host.packageDetailsModal.manuallyInstalled'],
  ['obsolete', 'host.packageDetailsModal.obsolete'],
  ['renamed', 'host.packageDetailsModal.renamed'],
];

const statusRows = (pkg, t) => [
  {
    key: 'installation',
    label: t('host.packageDetailsModal.installationStatus'),
    value: t(
      pkg.installed ? 'host.packageDetailsModal.installed' : 'host.packageDetailsModal.notInstalled'
    ),
  },
  ...FLAG_ROWS.filter(([member]) => pkg[member]).map(([member, labelKey]) => ({
    key: member,
    label: t(labelKey),
    value: t('host.packageDetailsModal.yes'),
  })),
];

/**
 * The dialog of one package's detail, hyperweaver-ui's: the basic
 * information, the status and the detailed information the agent
 * answered, a line at a time, each block a list of rows.
 */
const PackageDetailsModal = ({ pkg, onClose }) => {
  const { t } = useTranslation();
  const details = packageDetailRows(pkg.details);
  const basic = [
    {
      key: 'name',
      label: t('host.packageDetailsModal.packageName'),
      value: <span className="font-monospace">{pkg.name}</span>,
    },
    {
      key: 'publisher',
      label: t('host.packageDetailsModal.publisher'),
      value: (
        <span className="badge text-bg-info">
          {pkg.publisher || t('host.packageDetailsModal.unknown')}
        </span>
      ),
    },
    {
      key: 'version',
      label: t('host.packageDetailsModal.version'),
      value: (
        <span className="font-monospace">
          {pkg.version || t('host.packageDetailsModal.notAvailable')}
        </span>
      ),
    },
    {
      key: 'flags',
      label: t('host.packageDetailsModal.flags'),
      value: (
        <span className="font-monospace">
          {pkg.flags || t('host.packageDetailsModal.notAvailable')}
        </span>
      ),
    },
  ];
  return (
    <Modal show onHide={onClose} dialogClassName="list-modal" scrollable>
      <Modal.Header closeButton>
        <Modal.Title as="h5">{t('host.packageDetailsModal.packageDetails')}</Modal.Title>
      </Modal.Header>
      <Modal.Body data-dialog="package-details">
        <h6 className="fw-bold">{t('host.packageDetailsModal.basicInformation')}</h6>
        <RecordRows rows={basic} />
        <h6 className="fw-bold">{t('host.packageDetailsModal.packageStatus')}</h6>
        <RecordRows rows={statusRows(pkg, t)} />
        {details.length > 0 ? (
          <>
            <h6 className="fw-bold">{t('host.packageDetailsModal.detailedInformation')}</h6>
            <RecordRows
              rows={details.map((detail, position) => ({
                key: `${detail.label}-${position}`,
                label: detail.label,
                value: detail.value.includes('\n') ? (
                  <pre className="small bg-body-tertiary p-2 mb-0">{detail.value}</pre>
                ) : (
                  <span className="font-monospace small">{detail.value}</span>
                ),
              }))}
            />
          </>
        ) : (
          <div className="alert alert-info mb-0" role="note">
            {t('host.packageDetailsModal.noDetailedInformation')}
          </div>
        )}
      </Modal.Body>
    </Modal>
  );
};

PackageDetailsModal.propTypes = {
  pkg: PropTypes.shape({
    name: PropTypes.string,
    publisher: PropTypes.string,
    version: PropTypes.string,
    flags: PropTypes.string,
    installed: PropTypes.bool,
    frozen: PropTypes.bool,
    manually_installed: PropTypes.bool,
    obsolete: PropTypes.bool,
    renamed: PropTypes.bool,
    details: PropTypes.oneOfType([PropTypes.string, PropTypes.object]),
  }).isRequired,
  onClose: PropTypes.func.isRequired,
};

export default PackageDetailsModal;
