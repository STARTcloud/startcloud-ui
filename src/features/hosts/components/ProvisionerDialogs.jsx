import PropTypes from 'prop-types';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import ConfirmModal from '../../../components/common/ConfirmModal';
import { useStatus } from '../../../contexts/StatusContext';
import { IMPORT_FORM, IMPORT_SOURCES, importBody, importProblem } from '../utils/manageCatalog';

import { PathInput } from './PathPicker';
import ToolFormDialog from './ToolFormDialog';

/**
 * The typed confirmation of a provisioner delete: of one version while
 * `dialog` names one, of the whole family otherwise; shown while `dialog`
 * is a delete, the confirm handed to `onConfirm`.
 */
export const DeleteProvisionerConfirm = ({ dialog, onClose, onConfirm }) => {
  const { t } = useTranslation();
  const version = dialog?.version || '';
  const name = dialog?.name || '';
  return (
    <ConfirmModal
      show={dialog?.kind === 'delete'}
      handleClose={onClose}
      handleConfirm={onConfirm}
      title={t(
        version
          ? 'host.provisionerManagement.deleteVersionTitle'
          : 'host.provisionerManagement.deleteFamilyTitle'
      )}
      message={
        version
          ? t('host.provisionerManagement.deleteVersionMessage', { name, version })
          : t('host.provisionerManagement.deleteFamilyMessage', { name })
      }
      confirmText={t('host.provisionerManagement.delete')}
    />
  );
};

DeleteProvisionerConfirm.propTypes = {
  dialog: PropTypes.shape({
    kind: PropTypes.string.isRequired,
    name: PropTypes.string,
    version: PropTypes.string,
  }),
  onClose: PropTypes.func.isRequired,
  onConfirm: PropTypes.func.isRequired,
};

/**
 * The Import dialog of the Provisioners page, hyperweaver-ui's: a family
 * from a folder or an archive on the agent host, or from a git repository
 * with a key among the secrets; the submit hands the body of `importBody`
 * up, a queued task.
 */
export const ImportModal = ({ id, server, gitKeyNames, busy, onClose, onSubmit }) => {
  const { t } = useTranslation();
  const status = useStatus();
  const [form, setForm] = useState(IMPORT_FORM);
  const [problem, setProblem] = useState('');
  const patch = changes => setForm(current => ({ ...current, ...changes }));
  const submit = () => {
    const why = importProblem(form);
    setProblem(why);
    if (!why) {
      onSubmit(importBody(form));
    }
  };
  return (
    <ToolFormDialog
      dialog="provisioner-import"
      title={t('host.provisionerManagement.importProvisioner')}
      submitKey="host.provisionerManagement.importSubmit"
      problemKey={problem}
      busy={busy}
      onClose={onClose}
      onSubmit={submit}
    >
      <div className="mb-3">
        <label className="form-label" htmlFor="import-source-type">
          {t('host.provisionerManagement.source')}
        </label>
        <select
          id="import-source-type"
          className="form-select"
          value={form.sourceType}
          onChange={event => patch({ sourceType: event.target.value })}
          disabled={busy}
        >
          {IMPORT_SOURCES.map(kind => (
            <option key={kind} value={kind}>
              {t(`host.provisionerManagement.source${kind[0].toUpperCase()}${kind.slice(1)}`)}
            </option>
          ))}
        </select>
      </div>
      {form.sourceType === 'git' ? (
        <>
          <div className="mb-3">
            <label className="form-label" htmlFor="import-url">
              {t('host.provisionerManagement.repositoryUrl')}
            </label>
            <input
              id="import-url"
              className="form-control"
              type="text"
              placeholder="https://…"
              value={form.url}
              onChange={event => patch({ url: event.target.value })}
              disabled={busy}
            />
          </div>
          <div className="mb-3">
            <label className="form-label" htmlFor="import-branch">
              {t('host.provisionerManagement.branch')}
            </label>
            <input
              id="import-branch"
              className="form-control"
              type="text"
              value={form.branch}
              onChange={event => patch({ branch: event.target.value })}
              disabled={busy}
            />
          </div>
          <div className="mb-3">
            <label className="form-label" htmlFor="import-token">
              {t('host.provisionerManagement.gitApiKey')}
            </label>
            {gitKeyNames ? (
              <select
                id="import-token"
                className="form-select"
                value={form.tokenName}
                onChange={event => patch({ tokenName: event.target.value })}
                disabled={busy}
              >
                <option value="">{t('host.provisionerManagement.nonePublicRepo')}</option>
                {gitKeyNames.map(name => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            ) : (
              <input
                id="import-token"
                className="form-control"
                type="text"
                placeholder={t('host.provisionerManagement.gitApiKeyPlaceholder')}
                value={form.tokenName}
                onChange={event => patch({ tokenName: event.target.value })}
                disabled={busy}
              />
            )}
            <p className="form-text text-muted mb-0">
              {t('host.provisionerManagement.gitApiKeyHelp')}
            </p>
          </div>
        </>
      ) : (
        <div className="mb-3">
          <label className="form-label" htmlFor="import-path">
            {t('host.provisionerManagement.pathOnAgentHost')}
          </label>
          <PathInput
            id="import-path"
            value={form.path}
            onChange={path => patch({ path })}
            status={status}
            hostId={id}
            server={server}
            mode={form.sourceType === 'archive' ? 'file' : 'directory'}
            disabled={busy}
          />
        </div>
      )}
    </ToolFormDialog>
  );
};

ImportModal.propTypes = {
  id: PropTypes.string.isRequired,
  server: PropTypes.object.isRequired,
  gitKeyNames: PropTypes.arrayOf(PropTypes.string),
  busy: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
};
