import PropTypes from 'prop-types';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { destinationsOf } from '../../utils/artifacts';
import ToolFormDialog from '../ToolFormDialog';

/**
 * The dialog that picks another storage location for an artifact, the
 * shape hyperweaver-ui's move and copy dialogs share: the artifact, its
 * current location, and the destination among the enabled locations
 * other than its own; `words` names the dialog's keys.
 */
export const DestinationDialog = ({
  dialog,
  words,
  artifact,
  storagePaths,
  busy,
  onClose,
  onSubmit,
}) => {
  const { t } = useTranslation();
  const [destination, setDestination] = useState('');
  const choices = destinationsOf(storagePaths, artifact);
  const problem = destination ? '' : words.problem;
  return (
    <ToolFormDialog
      dialog={dialog}
      title={t(words.title)}
      submitKey={words.submit}
      problemKey={problem}
      busy={busy}
      onClose={onClose}
      onSubmit={() => {
        if (!problem) {
          onSubmit(destination);
        }
      }}
    >
      <div>
        <label htmlFor={`${dialog}-artifact`} className="form-label">
          {t(words.artifact)}
        </label>
        <input
          id={`${dialog}-artifact`}
          className="form-control"
          type="text"
          value={artifact.filename}
          readOnly
        />
      </div>
      <div>
        <label htmlFor={`${dialog}-current`} className="form-label">
          {t(words.current)}
        </label>
        <input
          id={`${dialog}-current`}
          className="form-control"
          type="text"
          value={`${artifact.storage_location?.name || ''} (${artifact.storage_location?.path || ''})`}
          readOnly
        />
      </div>
      <div>
        <label htmlFor={`${dialog}-destination`} className="form-label">
          {t(words.destination)}
        </label>
        <select
          id={`${dialog}-destination`}
          className="form-select"
          value={destination}
          onChange={event => setDestination(event.target.value)}
          disabled={busy}
        >
          <option value="">{t(words.select)}</option>
          {choices.map(path => (
            <option key={path.id} value={path.id}>
              {path.name} ({path.path})
            </option>
          ))}
        </select>
      </div>
    </ToolFormDialog>
  );
};

DestinationDialog.propTypes = {
  dialog: PropTypes.string.isRequired,
  words: PropTypes.shape({
    title: PropTypes.string.isRequired,
    submit: PropTypes.string.isRequired,
    problem: PropTypes.string.isRequired,
    artifact: PropTypes.string.isRequired,
    current: PropTypes.string.isRequired,
    destination: PropTypes.string.isRequired,
    select: PropTypes.string.isRequired,
  }).isRequired,
  artifact: PropTypes.object.isRequired,
  storagePaths: PropTypes.array.isRequired,
  busy: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
};

const MOVE_WORDS = {
  title: 'artifacts.artifactMoveModal.title',
  submit: 'artifacts.artifactMoveModal.submitButton',
  problem: 'artifacts.artifactMoveModal.selectDestinationError',
  artifact: 'artifacts.artifactMoveModal.artifactLabel',
  current: 'artifacts.artifactMoveModal.currentLocationLabel',
  destination: 'artifacts.artifactMoveModal.destinationLocationLabel',
  select: 'artifacts.artifactMoveModal.selectDestination',
};

/**
 * The dialog that moves an artifact to another storage location,
 * `POST artifacts/{id}/move` once.
 */
const ArtifactMoveModal = ({ artifact, storagePaths, busy, onClose, onSubmit }) => (
  <DestinationDialog
    dialog="artifact-move"
    words={MOVE_WORDS}
    artifact={artifact}
    storagePaths={storagePaths}
    busy={busy}
    onClose={onClose}
    onSubmit={onSubmit}
  />
);

ArtifactMoveModal.propTypes = {
  artifact: PropTypes.object.isRequired,
  storagePaths: PropTypes.array.isRequired,
  busy: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
};

export default ArtifactMoveModal;
