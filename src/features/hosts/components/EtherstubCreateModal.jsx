import PropTypes from 'prop-types';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { ETHERSTUB_FORM, etherstubProblem, nextIndexedName } from '../utils/networkingManagement';

import ToolFormDialog from './ToolFormDialog';

/**
 * The create dialog of an etherstub, hyperweaver-ui's: the name, the
 * next free `stub<n>` suggested, and the temporary flag, with
 * hyperweaver-ui's note on what an etherstub is. The body is
 * `etherstubBody`.
 */
const EtherstubCreateModal = ({ etherstubs, busy, onClose, onSubmit }) => {
  const { t } = useTranslation();
  const [form, setForm] = useState(() => ({
    ...ETHERSTUB_FORM,
    name: nextIndexedName(etherstubs, 'stub'),
  }));
  const [tried, setTried] = useState(false);
  const problem = etherstubProblem(form);

  const submit = () => {
    setTried(true);
    if (!problem) {
      onSubmit(form);
    }
  };

  return (
    <ToolFormDialog
      dialog="etherstub-create"
      title={t('host.etherstubCreateModal.title')}
      submitKey="host.etherstubCreateModal.title"
      problemKey={tried ? problem : ''}
      busy={busy}
      onClose={onClose}
      onSubmit={submit}
    >
      <div className="mb-3">
        <label htmlFor="etherstub-name" className="form-label">
          {t('host.etherstubCreateModal.etherstubNameLabel')} *
        </label>
        <input
          id="etherstub-name"
          className="form-control"
          type="text"
          placeholder="e.g., stub0"
          value={form.name}
          onChange={event => setForm(current => ({ ...current, name: event.target.value }))}
          disabled={busy}
          required
        />
        <p className="form-text text-muted">{t('host.etherstubCreateModal.nameHelp')}</p>
      </div>
      <div className="mb-3">
        <div className="form-check">
          <input
            id="etherstub-temporary"
            className="form-check-input"
            type="checkbox"
            checked={form.temporary}
            onChange={event =>
              setForm(current => ({ ...current, temporary: event.target.checked }))
            }
            disabled={busy}
          />
          <label className="form-check-label" htmlFor="etherstub-temporary">
            {t('host.etherstubCreateModal.temporary')}
          </label>
        </div>
        <p className="form-text text-muted">{t('host.etherstubCreateModal.temporaryHelp')}</p>
      </div>
      <div className="alert alert-info mt-4">
        <p>
          <strong>{t('host.etherstubCreateModal.aboutTitle')}</strong>
        </p>
        <p className="mb-0">{t('host.etherstubCreateModal.aboutBody')}</p>
      </div>
    </ToolFormDialog>
  );
};

EtherstubCreateModal.propTypes = {
  etherstubs: PropTypes.array.isRequired,
  busy: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
};

export default EtherstubCreateModal;
