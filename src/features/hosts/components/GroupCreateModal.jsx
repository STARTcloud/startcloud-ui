import PropTypes from 'prop-types';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { groupCreateBody } from '../utils/manage';

import ToolFormDialog from './ToolFormDialog';

const FORM = { groupname: '', gid: '' };

/**
 * Create a group, hyperweaver-ui's dialog over the form dialog of the
 * pages contract: the name and the gid where given, and Create group,
 * held by the name required, which sends `POST system/groups`.
 */
const GroupCreateModal = ({ busy, onClose, onConfirm }) => {
  const { t } = useTranslation();
  const [form, setForm] = useState(FORM);
  const [problem, setProblem] = useState('');
  const set = (field, value) => setForm(current => ({ ...current, [field]: value }));

  const submit = () => {
    if (!form.groupname.trim()) {
      setProblem('host.groupCreateModal.errors.nameRequired');
      return;
    }
    setProblem('');
    onConfirm(groupCreateBody(form));
  };

  return (
    <ToolFormDialog
      dialog="group-create"
      title={t('host.groupCreateModal.title')}
      submitKey="host.groupCreateModal.title"
      problemKey={problem}
      busy={busy}
      onClose={onClose}
      onSubmit={submit}
    >
      <div className="mb-3">
        <label className="form-label" htmlFor="group-name-input">
          {t('host.groupCreateModal.groupNameLabel')} <span className="text-danger">*</span>
        </label>
        <input
          id="group-name-input"
          className="form-control"
          type="text"
          value={form.groupname}
          onChange={event => set('groupname', event.target.value)}
          placeholder={t('host.groupCreateModal.groupNamePlaceholder')}
          required
        />
        <p className="form-text text-muted">{t('host.groupCreateModal.groupNameHelp')}</p>
      </div>
      <div className="mb-3">
        <label className="form-label" htmlFor="group-gid-input">
          {t('host.groupCreateModal.gidLabel')}
        </label>
        <input
          id="group-gid-input"
          className="form-control"
          type="number"
          min="100"
          value={form.gid}
          onChange={event => set('gid', event.target.value)}
          placeholder={t('host.groupCreateModal.gidPlaceholder')}
        />
        <p className="form-text text-muted">{t('host.groupCreateModal.gidHelp')}</p>
      </div>
      <div className="alert alert-info mb-0" role="note">
        <strong>{t('host.groupCreateModal.noteLabel')}</strong>{' '}
        {t('host.groupCreateModal.noteText')}
      </div>
    </ToolFormDialog>
  );
};

GroupCreateModal.propTypes = {
  busy: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onConfirm: PropTypes.func.isRequired,
};

export default GroupCreateModal;
