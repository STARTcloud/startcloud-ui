import PropTypes from 'prop-types';
import { useState } from 'react';
import { Modal } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';

/**
 * The guard of a form dialog's draft: `close` calls `onClose` at once while
 * `dirty` is false and opens the discard prompt while it is true; the
 * dialog's `onHide`, which a backdrop click, Escape and the header's close
 * button all reach, and its Cancel both take `close`. `prompt` is the props
 * of `DiscardPrompt`: Discard closes the prompt and calls `onClose`, Keep
 * editing closes the prompt alone.
 *
 * @param {boolean} dirty - Whether the dialog holds a changed draft
 * @param {Function} onClose - The dialog's own close
 * @returns {{ close: Function, prompt: Object }} The guarded close and the prompt's props
 */
export const useDiscardGuard = (dirty, onClose) => {
  const [asking, setAsking] = useState(false);
  const close = () => (dirty ? setAsking(true) : onClose());
  return {
    close,
    prompt: {
      show: asking,
      onKeep: () => setAsking(false),
      onDiscard: () => {
        setAsking(false);
        onClose();
      },
    },
  };
};

/**
 * The list dialog a guarded form dialog opens over itself: "Discard
 * changes?", Keep editing, which Escape and a backdrop click take too, and
 * Discard; `data-dialog` is `discard-changes`.
 */
const DiscardPrompt = ({ show, onKeep, onDiscard }) => {
  const { t } = useTranslation();
  return (
    <Modal show={show} onHide={onKeep} dialogClassName="list-modal" centered>
      <div data-dialog="discard-changes">
        <Modal.Header closeButton>
          <Modal.Title as="h5">{t('pages.discard.title')}</Modal.Title>
        </Modal.Header>
        <Modal.Body>{t('pages.discard.message')}</Modal.Body>
        <Modal.Footer>
          <button
            type="button"
            className="btn btn-secondary"
            data-action="keep-editing"
            onClick={onKeep}
          >
            {t('pages.discard.keep')}
          </button>
          <button
            type="button"
            className="btn btn-danger"
            data-action="discard"
            onClick={onDiscard}
          >
            {t('pages.discard.discard')}
          </button>
        </Modal.Footer>
      </div>
    </Modal>
  );
};

DiscardPrompt.propTypes = {
  show: PropTypes.bool.isRequired,
  onKeep: PropTypes.func.isRequired,
  onDiscard: PropTypes.func.isRequired,
};

export default DiscardPrompt;
