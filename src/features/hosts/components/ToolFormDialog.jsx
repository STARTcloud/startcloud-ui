import PropTypes from 'prop-types';
import { useRef, useState } from 'react';
import { Modal } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';

import DiscardPrompt, { useDiscardGuard } from '../../../components/common/DiscardPrompt';

const FIRST_FIELD = 'input:not([disabled]), select:not([disabled]), textarea:not([disabled])';

/**
 * The form dialog of the machine's tools, the pages contract's form
 * dialog: the title, the fields as its body, the first of them focused
 * on open unless a person has already put the focus in one of them
 * while the dialog was still fading in, and in the footer Cancel and
 * the primary action, `submitKey`
 * its own word, both held while a request is in flight, Cancel alone
 * while `submitKey` is empty; `problemKey`,
 * where given, is the sentence that says why the form cannot be sent,
 * drawn over the fields. The form carries `dialog` as `data-dialog`;
 * `variant` is the primary action's Bootstrap variant, `danger` on a
 * dialog that destroys, and `disabled` holds the action while the form
 * is not yet complete; while the draft is dirty, a backdrop click,
 * Escape, the close button and Cancel ask the discard prompt before
 * `onClose`. The draft is dirty from the first change or input event
 * inside the form until a submit, unless the caller passes `dirty`,
 * which then decides alone.
 */
const ToolFormDialog = ({
  dialog,
  title,
  submitKey = '',
  problemKey = '',
  variant = 'primary',
  disabled = false,
  dirty = null,
  busy,
  onClose,
  onSubmit,
  children,
}) => {
  const { t } = useTranslation();
  const formRef = useRef(null);
  const [touched, setTouched] = useState(false);
  const guard = useDiscardGuard(dirty ?? touched, onClose);

  const touch = () => {
    if (!touched) {
      setTouched(true);
    }
  };

  const focusFirst = () => {
    const form = formRef.current;
    if (form && !form.contains(document.activeElement)) {
      form.querySelector(FIRST_FIELD)?.focus();
    }
  };

  const submit = event => {
    event.preventDefault();
    setTouched(false);
    onSubmit();
  };

  return (
    <>
      <Modal
        show
        onHide={guard.close}
        onEntered={focusFirst}
        dialogClassName="form-modal"
        scrollable
      >
        <form
          ref={formRef}
          onSubmit={submit}
          onChange={touch}
          onInput={touch}
          noValidate
          data-dialog={dialog}
        >
          <Modal.Header closeButton>
            <Modal.Title as="h5">{title}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {problemKey ? (
              <div className="alert alert-danger" role="alert" data-note="problem">
                {t(problemKey)}
              </div>
            ) : null}
            {children}
          </Modal.Body>
          <Modal.Footer>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={guard.close}
              disabled={busy}
            >
              {t('pages.confirm.cancel')}
            </button>
            {submitKey ? (
              <button
                type="submit"
                className={`btn btn-${variant}`}
                data-action="submit"
                disabled={busy || disabled}
              >
                {t(submitKey)}
              </button>
            ) : null}
          </Modal.Footer>
        </form>
      </Modal>
      <DiscardPrompt {...guard.prompt} />
    </>
  );
};

ToolFormDialog.propTypes = {
  dialog: PropTypes.string.isRequired,
  title: PropTypes.string.isRequired,
  submitKey: PropTypes.string,
  problemKey: PropTypes.string,
  variant: PropTypes.string,
  disabled: PropTypes.bool,
  dirty: PropTypes.bool,
  busy: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
  children: PropTypes.node.isRequired,
};

export default ToolFormDialog;
