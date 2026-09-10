import PropTypes from 'prop-types';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useNotify } from '../../contexts/NoticeContext';

import ConfirmModal from './ConfirmModal';

const STEP_UP_REQUIRED = 'step_up_required';

export const actionShape = PropTypes.shape({
  kind: PropTypes.oneOf(['upload', 'test', 'run']).isRequired,
  route: PropTypes.string.isRequired,
  method: PropTypes.string.isRequired,
  body: PropTypes.oneOf(['file', 'form', 'none']).isRequired,
  step_up: PropTypes.bool,
});

const unguarded = call => call();

const bodyOf = ({ action, values, file, pointer }) => {
  if (action.body === 'file') {
    const form = new FormData();
    form.append('file', file);
    form.append('pointer', pointer);
    return form;
  }
  return action.body === 'form' ? values : undefined;
};

/**
 * One schema-declared action by its `kind`: `upload` is a file picker
 * beside the control posting multipart `file` and `pointer` to the route
 * and drawing the answer's `path` as a success line, the field's value
 * untouched; `test` sends the form values as the clause says and draws
 * `configManager.actions.testPassed` on 200; `run` opens a confirm dialog
 * titled by the property's or the section's `title` and draws
 * `configManager.actions.runStarted` on 202; every call runs through
 * `guard`, so a `403 step_up_required` opens the step-up dialog and
 * retries the same call unchanged; a 422 is handed to `onRefused` to paint
 * on the form and any other refusal is one danger card; the server's
 * `message` is never drawn.
 */
const ConfigAction = ({
  action,
  title,
  call,
  pointer = '',
  values = null,
  guard = unguarded,
  onRefused = null,
}) => {
  const { t } = useTranslation();
  const notify = useNotify();
  const [confirming, setConfirming] = useState(false);
  const [uploadedPath, setUploadedPath] = useState('');
  const [busy, setBusy] = useState(false);

  const refused = error => {
    if (error?.code === STEP_UP_REQUIRED) {
      return;
    }
    if (onRefused && onRefused(error)) {
      return;
    }
    notify('danger', t(error?.messageKey || 'errors.request'));
  };

  const send = (body, onAnswer) => {
    setBusy(true);
    guard(() => call(action.route, action.method, body))
      .then(onAnswer, refused)
      .finally(() => setBusy(false));
  };

  const upload = event => {
    const [file] = event.target.files;
    event.target.value = '';
    if (!file) {
      return;
    }
    send(bodyOf({ action, file, pointer }), data => setUploadedPath(data?.path || ''));
  };

  const test = () =>
    send(bodyOf({ action, values }), () =>
      notify('success', t('configManager.actions.testPassed'))
    );

  const run = () =>
    send(bodyOf({ action, values }), () =>
      notify('success', t('configManager.actions.runStarted'))
    );

  if (action.kind === 'upload') {
    return (
      <div className="mt-1">
        <label className={`btn btn-outline-secondary btn-sm${busy ? ' disabled' : ''}`}>
          {t('admin.buttons.upload')}
          <input type="file" hidden disabled={busy} onChange={upload} />
        </label>
        {uploadedPath ? (
          <div className="form-text text-success">
            {t('configManager.actions.uploaded', { path: uploadedPath })}
          </div>
        ) : null}
      </div>
    );
  }

  if (action.kind === 'test') {
    return (
      <button
        type="button"
        className="btn btn-outline-primary btn-sm mt-1"
        disabled={busy}
        onClick={test}
      >
        {t('configManager.actions.test')}
      </button>
    );
  }

  return (
    <>
      <button
        type="button"
        className="btn btn-outline-primary btn-sm mt-1"
        disabled={busy}
        onClick={() => setConfirming(true)}
      >
        {t('configManager.actions.run')}
      </button>
      <ConfirmModal
        show={confirming}
        handleClose={() => setConfirming(false)}
        handleConfirm={run}
        title={title}
        message={t('configManager.actions.runConfirm', {
          title,
          keyword: t('pages.confirm.keyword'),
        })}
      />
    </>
  );
};

ConfigAction.propTypes = {
  action: actionShape.isRequired,
  title: PropTypes.string.isRequired,
  call: PropTypes.func.isRequired,
  pointer: PropTypes.string,
  values: PropTypes.any,
  guard: PropTypes.func,
  onRefused: PropTypes.func,
};

export default ConfigAction;
