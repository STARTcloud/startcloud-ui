import PropTypes from 'prop-types';
import { useState } from 'react';
import { Modal, Button, Form } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';

const VARIANTS = {
  delete: { keys: 'pages.confirm', button: 'danger' },
  restart: { keys: 'pages.confirm.restart', button: 'warning' },
};

const ConfirmModal = ({
  show,
  handleClose,
  handleConfirm,
  title = '',
  message = '',
  variant = 'delete',
  keyword: ownKeyword = '',
  confirmText = '',
}) => {
  const { t } = useTranslation();
  const [inputValue, setInputValue] = useState('');
  const [error, setError] = useState('');
  const { keys, button } = VARIANTS[variant];
  const keyword = ownKeyword || t(`${keys}.keyword`);

  const handleInputChange = event => {
    setInputValue(event.target.value);
    setError('');
  };

  const handleModalClose = () => {
    setInputValue('');
    setError('');
    handleClose();
  };

  const handleConfirmClick = () => {
    if (inputValue.toLowerCase() === keyword) {
      handleConfirm();
      setInputValue('');
      setError('');
      handleClose();
    } else {
      setError(t('pages.confirm.typeToConfirm', { keyword }));
    }
  };

  return (
    <Modal show={show} onHide={handleModalClose} dialogClassName="list-modal" scrollable>
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
};

export default ConfirmModal;
