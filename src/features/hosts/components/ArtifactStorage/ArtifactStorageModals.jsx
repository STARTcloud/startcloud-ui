import PropTypes from 'prop-types';

import ArtifactCopyModal from './ArtifactCopyModal';
import ArtifactDetailsModal from './ArtifactDetailsModal';
import ArtifactDownloadModal from './ArtifactDownloadModal';
import ArtifactMoveModal from './ArtifactMoveModal';
import ArtifactUploadModal from './ArtifactUploadModal';
import StoragePathCreateModal from './StoragePathCreateModal';
import StoragePathEditModal from './StoragePathEditModal';

/**
 * The dialogs of the artifacts section, the one `open` names: the
 * storage location's create and edit, the upload, the download from a
 * URL, an artifact's details, its move and its copy.
 */
const ArtifactStorageModals = ({
  id,
  server,
  open,
  storagePaths,
  busy,
  progress,
  onClose,
  onSend,
}) => {
  switch (open.kind) {
    case 'storage-path-create':
      return (
        <StoragePathCreateModal
          id={id}
          server={server}
          busy={busy}
          onClose={onClose}
          onSubmit={body => onSend('storage-path-create', body)}
        />
      );
    case 'storage-path-edit':
      return (
        <StoragePathEditModal
          storagePath={open.storagePath}
          busy={busy}
          onClose={onClose}
          onSubmit={body => onSend('storage-path-edit', body, open.storagePath)}
        />
      );
    case 'artifact-upload':
      return (
        <ArtifactUploadModal
          storagePaths={storagePaths}
          busy={busy}
          progress={progress}
          onClose={onClose}
          onSubmit={body => onSend('artifact-upload', body)}
        />
      );
    case 'artifact-download':
      return (
        <ArtifactDownloadModal
          storagePaths={storagePaths}
          busy={busy}
          onClose={onClose}
          onSubmit={body => onSend('artifact-download', body)}
        />
      );
    case 'artifact-details':
      return (
        <ArtifactDetailsModal
          id={id}
          artifact={open.artifact}
          details={open.details}
          onClose={onClose}
        />
      );
    case 'artifact-move':
      return (
        <ArtifactMoveModal
          artifact={open.artifact}
          storagePaths={storagePaths}
          busy={busy}
          onClose={onClose}
          onSubmit={destination => onSend('artifact-move', destination, open.artifact)}
        />
      );
    case 'artifact-copy':
      return (
        <ArtifactCopyModal
          artifact={open.artifact}
          storagePaths={storagePaths}
          busy={busy}
          onClose={onClose}
          onSubmit={destination => onSend('artifact-copy', destination, open.artifact)}
        />
      );
    default:
      return null;
  }
};

ArtifactStorageModals.propTypes = {
  id: PropTypes.string.isRequired,
  server: PropTypes.object,
  open: PropTypes.shape({
    kind: PropTypes.string.isRequired,
    storagePath: PropTypes.object,
    artifact: PropTypes.object,
    details: PropTypes.object,
  }).isRequired,
  storagePaths: PropTypes.array.isRequired,
  busy: PropTypes.bool.isRequired,
  progress: PropTypes.object.isRequired,
  onClose: PropTypes.func.isRequired,
  onSend: PropTypes.func.isRequired,
};

export default ArtifactStorageModals;
