import PropTypes from 'prop-types';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useNotify } from '../../../contexts/NoticeContext';
import { setMachineDisplay } from '../api/machines';

import ToolFormDialog from './ToolFormDialog';

const PRESETS = ['1280x720', '1366x768', '1600x900', '1920x1080', '2560x1440', '3840x2160'];

/**
 * The body of `POST machines/{name}/display` from the dialog's fields,
 * the width and the height as numbers and the depth and the display
 * where given.
 *
 * @param {Object} form - The fields
 * @returns {Object} The body
 */
export const displayBody = ({ width, height, depth, display }) => ({
  width: Number(width),
  height: Number(height),
  ...(depth !== '' && { depth: Number(depth) }),
  ...(display !== '' && { display: Number(display) }),
});

/**
 * The Set display size dialog of a VirtualBox machine, hyperweaver-ui's:
 * the presets, the width and the height, the depth and the display, sent
 * as one request through `POST machines/{name}/display` and one notice;
 * a machine that is not running is warned, the agent answering.
 */
const DisplayResizeModal = ({ status, hostId, name, running, onClose }) => {
  const { t } = useTranslation();
  const notify = useNotify();
  const [form, setForm] = useState({ width: '1920', height: '1080', depth: '', display: '' });
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState('');

  const set = (key, value) => setForm(prev => ({ ...prev, [key]: value }));

  const applyPreset = preset => {
    const [width, height] = preset.split('x');
    setForm(prev => ({ ...prev, width, height }));
  };

  const submit = async () => {
    if (!form.width || !form.height) {
      setProblem(t('machine.displayResizeModal.dimensionsRequired'));
      return;
    }
    setBusy(true);
    setProblem('');
    try {
      const answer = await setMachineDisplay(status, hostId, name, displayBody(form));
      notify(
        'success',
        answer?.message ||
          t('machine.displayResizeModal.hintSentFallback', {
            width: form.width,
            height: form.height,
            machineName: name,
          })
      );
      onClose();
    } catch (error) {
      setProblem(error.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <ToolFormDialog
      dialog="display-resize"
      title={t('machine.displayResizeModal.title', { machineName: name })}
      submitKey="machine.displayResizeModal.submit"
      busy={busy}
      onClose={onClose}
      onSubmit={submit}
    >
      {!running ? (
        <div className="alert alert-warning py-2" role="status">
          {t('machine.displayResizeModal.notRunningWarning', { machineName: name })}
        </div>
      ) : null}
      {problem ? (
        <div className="alert alert-danger py-2" role="alert" data-note="problem">
          {problem}
        </div>
      ) : null}
      <div className="d-flex flex-wrap gap-1 mb-3">
        {PRESETS.map(preset => (
          <button
            type="button"
            className="btn btn-sm btn-outline-secondary"
            key={preset}
            data-preset={preset}
            onClick={() => applyPreset(preset)}
            disabled={busy}
          >
            {preset}
          </button>
        ))}
      </div>
      <div className="row g-3">
        <div className="col-6 col-md-3">
          <label className="form-label" htmlFor="display-width">
            {t('machine.displayResizeModal.widthLabel')} <span className="text-danger">*</span>
          </label>
          <input
            id="display-width"
            className="form-control"
            type="number"
            min="1"
            value={form.width}
            onChange={event => set('width', event.target.value)}
            disabled={busy}
          />
        </div>
        <div className="col-6 col-md-3">
          <label className="form-label" htmlFor="display-height">
            {t('machine.displayResizeModal.heightLabel')} <span className="text-danger">*</span>
          </label>
          <input
            id="display-height"
            className="form-control"
            type="number"
            min="1"
            value={form.height}
            onChange={event => set('height', event.target.value)}
            disabled={busy}
          />
        </div>
        <div className="col-6 col-md-3">
          <label className="form-label" htmlFor="display-depth">
            {t('machine.displayResizeModal.depthLabel')}
          </label>
          <input
            id="display-depth"
            className="form-control"
            type="number"
            placeholder={t('machine.displayResizeModal.depthPlaceholder')}
            value={form.depth}
            onChange={event => set('depth', event.target.value)}
            disabled={busy}
          />
        </div>
        <div className="col-6 col-md-3">
          <label className="form-label" htmlFor="display-index">
            {t('machine.displayResizeModal.displayIndexLabel')}
          </label>
          <input
            id="display-index"
            className="form-control"
            type="number"
            min="0"
            placeholder="0"
            value={form.display}
            onChange={event => set('display', event.target.value)}
            disabled={busy}
          />
        </div>
      </div>
      <p className="form-text text-muted mb-0 mt-2">{t('machine.displayResizeModal.hintNote')}</p>
    </ToolFormDialog>
  );
};

DisplayResizeModal.propTypes = {
  status: PropTypes.object.isRequired,
  hostId: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  running: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
};

export default DisplayResizeModal;
