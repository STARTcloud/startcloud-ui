import PropTypes from 'prop-types';
import { useState } from 'react';
import { Modal, Button, Form } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';

const VARIANTS = {
  delete: { keys: 'pages.confirm', button: 'danger' },
  restart: { keys: 'pages.confirm.restart', button: 'warning' },
};

/**
 * The typed confirmation of a destructive step: the keyword the person
 * types, Cancel and Confirm; `onConfirmed`, where given, is called once
 * the dialog has left the page after a confirm, the place a caller moves
 * focus to when the confirm removed the control that opened the dialog,
 * and the dialog then neither holds focus while it leaves nor hands it
 * back to that control.
 */
const ConfirmModal = ({
  show,
  handleClose,
  handleConfirm,
  title = '',
  message = '',
  variant = 'delete',
  keyword: ownKeyword = '',
  confirmText = '',
  onConfirmed = null,
}) => {
  const { t } = useTranslation();
  const [inputValue, setInputValue] = useState('');
  const [error, setError] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const { keys, button } = VARIANTS[variant];
  const keyword = ownKeyword || t(`${keys}.keyword`);
  const landing = confirmed && !show && Boolean(onConfirmed);

  const handleInputChange = event => {
    setInputValue(event.target.value);
    setError('');
  };

  const handleModalClose = () => {
    setConfirmed(false);
    setInputValue('');
    setError('');
    handleClose();
  };

  const handleConfirmClick = () => {
    if (inputValue.toLowerCase() === keyword) {
      setConfirmed(true);
      handleConfirm();
      setInputValue('');
      setError('');
      handleClose();
    } else {
      setError(t('pages.confirm.typeToConfirm', { keyword }));
    }
  };

  const handleExited = () => {
    if (landing) {
      onConfirmed();
    }
  };

  return (
    <Modal
      show={show}
      onHide={handleModalClose}
      onExited={handleExited}
      restoreFocus={!landing}
      enforceFocus={!landing}
      dialogClassName="list-modal"
      scrollable
    >
      <Modal.Header closeButton>
        <Modal.Title>{title || t(`${keys}.title`)}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <div className="mb-3">{message || t(`${keys}.message`, { keyword })}</div>
        <Form.Control
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          placeholder={t('pages.confirm.placeholder', { keyword })}
        />
        {error ? (
          <div className="alert alert-danger" role="alert">
            {error}
          </div>
        ) : null}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={handleModalClose}>
          {t('pages.confirm.cancel')}
        </Button>
        <Button variant={button} onClick={handleConfirmClick}>
          {confirmText || t(`${keys}.confirm`)}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

ConfirmModal.propTypes = {
  show: PropTypes.bool.isRequired,
  handleClose: PropTypes.func.isRequired,
  handleConfirm: PropTypes.func.isRequired,
  title: PropTypes.string,
  message: PropTypes.node,
  variant: PropTypes.oneOf(Object.keys(VARIANTS)),
  keyword: PropTypes.string,
  confirmText: PropTypes.string,
  onConfirmed: PropTypes.func,
};

export default ConfirmModal;
