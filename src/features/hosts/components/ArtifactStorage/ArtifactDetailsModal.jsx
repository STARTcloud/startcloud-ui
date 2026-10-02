import PropTypes from 'prop-types';
import { useState } from 'react';
import { Modal } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import {
  FaArrowUpRightFromSquare,
  FaCircleCheck,
  FaCircleQuestion,
  FaCircleXmark,
  FaCompactDisc,
  FaDownload,
  FaHardDrive,
} from 'react-icons/fa6';

import RecordRows from '../../../../components/common/RecordRows';
import { useStatus } from '../../../../contexts/StatusContext';
import { formatFileSize } from '../../../../utils/formatFileSize';
import { downloadArtifactFile } from '../../api/artifacts';
import { saveBlob } from '../../hooks/useHostFiles';
import { artifactTypeOf, artifactTypeTone } from '../../utils/artifacts';

const VERIFICATION = {
  true: {
    Icon: FaCircleCheck,
    tone: 'text-success',
    key: 'artifacts.artifactDetailsModal.verifiedStatus',
  },
  false: {
    Icon: FaCircleXmark,
    tone: 'text-danger',
    key: 'artifacts.artifactDetailsModal.mismatchStatus',
  },
  none: {
    Icon: FaCircleQuestion,
    tone: 'text-muted',
    key: 'artifacts.artifactDetailsModal.notVerifiedStatus',
  },
};

const verificationOf = verified => {
  if (verified === true) {
    return VERIFICATION.true;
  }
  return verified === false ? VERIFICATION.false : VERIFICATION.none;
};

const fileRows = (data, t) => {
  const none = t('artifacts.artifactDetailsModal.notAvailable');
  return [
    {
      key: 'filename',
      label: t('artifacts.artifactDetailsModal.filenameLabel'),
      value: <code>{data.filename}</code>,
    },
    {
      key: 'type',
      label: t('artifacts.artifactDetailsModal.fileTypeLabel'),
      value: (
        <span
          className={`badge text-bg-${artifactTypeTone(artifactTypeOf(data.file_type, data.extension))}`}
        >
          {data.file_type
            ? String(data.file_type).toUpperCase()
            : t('artifacts.artifactDetailsModal.unknownType')}
        </span>
      ),
    },
    {
      key: 'extension',
      label: t('artifacts.artifactDetailsModal.extensionLabel'),
      value: <code>{data.extension || none}</code>,
    },
    {
      key: 'mime',
      label: t('artifacts.artifactDetailsModal.mimeTypeLabel'),
      value: <code>{data.mime_type || none}</code>,
    },
    {
      key: 'size',
      label: t('artifacts.artifactDetailsModal.fileSizeLabel'),
      value: (
        <span>
          <strong>{formatFileSize(data.size)}</strong>
          <span className="ms-2 text-muted small">
            ({Number(data.size || 0).toLocaleString()} bytes)
          </span>
        </span>
      ),
    },
    {
      key: 'path',
      label: t('artifacts.artifactDetailsModal.pathLabel'),
      value: <code className="small">{data.path}</code>,
    },
  ];
};

const storageRows = (data, t) => [
  ...(data.storage_location
    ? [
        {
          key: 'name',
          label: t('artifacts.artifactDetailsModal.storageNameLabel'),
          value: data.storage_location.name,
        },
        {
          key: 'path',
          label: t('artifacts.artifactDetailsModal.storagePathLabel'),
          value: <code className="small">{data.storage_location.path}</code>,
        },
        {
          key: 'type',
          label: t('artifacts.artifactDetailsModal.storageTypeLabel'),
          value: (
            <span className="badge text-bg-secondary">
              {String(data.storage_location.type || '').toUpperCase()}
            </span>
          ),
        },
      ]
    : []),
  {
    key: 'discovered',
    label: t('artifacts.artifactDetailsModal.discoveredLabel'),
    value: data.discovered_at
      ? new Date(data.discovered_at).toLocaleString()
      : t('artifacts.artifactDetailsModal.notAvailable'),
  },
  ...(data.source_url
    ? [
        {
          key: 'source',
          label: t('artifacts.artifactDetailsModal.sourceUrlLabel'),
          value: (
            <a href={data.source_url} target="_blank" rel="noopener noreferrer" className="small">
              {data.source_url}
              <FaArrowUpRightFromSquare className="ms-1" aria-hidden="true" />
            </a>
          ),
        },
      ]
    : []),
];

const Section = ({ title, children }) => (
  <div className="card mb-3">
    <div className="card-body">
      <h6 className="fw-bold">{title}</h6>
      {children}
    </div>
  </div>
);

Section.propTypes = {
  title: PropTypes.node.isRequired,
  children: PropTypes.node.isRequired,
};

/**
 * The details of one artifact, hyperweaver-ui's dialog as a list dialog
 * of the pages contract: the file's facts and its storage as record
 * rows, the checksum with its algorithm and its verification, Download
 * file through the client as a blob, the ids, and the note of an ISO
 * or of a disk image.
 */
const ArtifactDetailsModal = ({ id, artifact, details, onClose }) => {
  const { t } = useTranslation();
  const status = useStatus();
  const [failure, setFailure] = useState('');
  const data = details || artifact;
  const type = artifactTypeOf(data.file_type, data.extension);
  const verification = verificationOf(data.checksum_verified);
  const Glyph = type === 'iso' ? FaCompactDisc : FaHardDrive;
  const checksumTitle = t('artifacts.artifactDetailsModal.checksumInformationHeading');

  const download = () => {
    setFailure('');
    downloadArtifactFile(status, id, artifact.id).then(
      blob => saveBlob(blob, artifact.filename),
      error => setFailure(t('hosts.manage.artifacts.downloadFailed', { message: error.message }))
    );
  };

  return (
    <Modal
      show
      onHide={onClose}
      dialogClassName="list-modal"
      scrollable
      data-dialog="artifact-details"
    >
      <Modal.Header closeButton>
        <Modal.Title>
          <Glyph className="me-2" aria-hidden="true" />
          {artifact.filename}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Section title={t('artifacts.artifactDetailsModal.fileInformationHeading')}>
          <RecordRows rows={fileRows(data, t)} className="mb-0" />
        </Section>
        <Section title={t('artifacts.artifactDetailsModal.storageDetailsHeading')}>
          <RecordRows rows={storageRows(data, t)} className="mb-0" />
        </Section>
        <Section title={checksumTitle}>
          <label htmlFor="artifact-checksum" className="form-label">
            {t('artifacts.artifactDetailsModal.checksumLabel')}
          </label>
          <input
            id="artifact-checksum"
            className="form-control font-monospace small"
            type="text"
            value={data.checksum || t('artifacts.artifactDetailsModal.notCalculated')}
            readOnly
          />
          <div className="d-flex flex-wrap gap-4 mt-3">
            <div>
              <span className="form-label d-block">
                {t('artifacts.artifactDetailsModal.algorithmLabel')}
              </span>
              <span className="badge text-bg-info">
                {data.checksum_algorithm
                  ? String(data.checksum_algorithm).toUpperCase()
                  : t('artifacts.artifactDetailsModal.notAvailable')}
              </span>
            </div>
            <div>
              <span className="form-label d-block">
                {t('artifacts.artifactDetailsModal.verificationStatusLabel')}
              </span>
              <span
                className={`fw-semibold ${verification.tone}`}
                data-verified={String(data.checksum_verified)}
              >
                <verification.Icon className="me-1" aria-hidden="true" />
                {t(verification.key)}
              </span>
            </div>
          </div>
          {data.checksum_verified === false ? (
            <div className="alert alert-warning mt-3 mb-0" data-note="checksum-mismatch">
              {t('artifacts.artifactDetailsModal.checksumMismatchWarning')}
            </div>
          ) : null}
        </Section>
        <Section title={t('artifacts.artifactDetailsModal.actionsHeading')}>
          {failure ? (
            <div className="alert alert-danger" role="alert" data-note="download-failed">
              {failure}
            </div>
          ) : null}
          <button
            type="button"
            className="btn btn-primary btn-sm"
            data-action="download"
            onClick={download}
          >
            <FaDownload className="me-1" aria-hidden="true" />
            {t('artifacts.artifactDetailsModal.downloadFileButton')}
          </button>
        </Section>
        <Section title={t('artifacts.artifactDetailsModal.technicalDetailsHeading')}>
          <RecordRows
            className="mb-0"
            rows={[
              {
                key: 'id',
                label: t('artifacts.artifactDetailsModal.artifactIdLabel'),
                value: <code className="small">{data.id}</code>,
              },
              ...(data.storage_location
                ? [
                    {
                      key: 'location',
                      label: t('artifacts.artifactDetailsModal.storageLocationIdLabel'),
                      value: <code className="small">{data.storage_location.id}</code>,
                    },
                  ]
                : []),
            ]}
          />
        </Section>
        {type === 'iso' ? (
          <div className="alert alert-info mb-0" data-note="iso-info">
            <FaCompactDisc className="me-1" aria-hidden="true" />
            <strong>{t('artifacts.artifactDetailsModal.isoInformationHeading')}</strong>{' '}
            {t('artifacts.artifactDetailsModal.isoDescription')}
          </div>
        ) : null}
        {type === 'image' && data.extension !== '.img' ? (
          <div className="alert alert-warning mb-0" data-note="image-info">
            <FaHardDrive className="me-1" aria-hidden="true" />
            <strong>{t('artifacts.artifactDetailsModal.vmImageInformationHeading')}</strong>{' '}
            {t('artifacts.artifactDetailsModal.vmImageDescription')}
          </div>
        ) : null}
      </Modal.Body>
    </Modal>
  );
};

ArtifactDetailsModal.propTypes = {
  id: PropTypes.string.isRequired,
  artifact: PropTypes.object.isRequired,
  details: PropTypes.object,
  onClose: PropTypes.func.isRequired,
};

export default ArtifactDetailsModal;
