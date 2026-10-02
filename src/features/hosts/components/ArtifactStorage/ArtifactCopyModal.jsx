import PropTypes from 'prop-types';

import { DestinationDialog } from './ArtifactMoveModal';

const COPY_WORDS = {
  title: 'artifacts.artifactCopyModal.title',
  submit: 'artifacts.artifactCopyModal.submitButton',
  problem: 'artifacts.artifactCopyModal.selectDestinationError',
  artifact: 'artifacts.artifactCopyModal.artifactLabel',
  current: 'artifacts.artifactCopyModal.currentLocationLabel',
  destination: 'artifacts.artifactCopyModal.destinationLocationLabel',
  select: 'artifacts.artifactCopyModal.selectDestination',
};

/**
 * The dialog that copies an artifact to another storage location,
 * `POST artifacts/{id}/copy` once.
 */
const ArtifactCopyModal = ({ artifact, storagePaths, busy, onClose, onSubmit }) => (
  <DestinationDialog
    dialog="artifact-copy"
    words={COPY_WORDS}
    artifact={artifact}
    storagePaths={storagePaths}
    busy={busy}
    onClose={onClose}
    onSubmit={onSubmit}
  />
);

ArtifactCopyModal.propTypes = {
  artifact: PropTypes.object.isRequired,
  storagePaths: PropTypes.array.isRequired,
  busy: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
};

export default ArtifactCopyModal;
