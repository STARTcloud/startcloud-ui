import PropTypes from 'prop-types';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';

import ConfirmModal from '../../../../components/common/ConfirmModal';
import Field from '../../../../components/common/Field';
import FormErrorSummary from '../../../../components/common/FormErrorSummary';
import { useStatus } from '../../../../contexts/StatusContext';
import { formRulesShape, useFormRules } from '../../../../hooks/useFormRules';
import { log } from '../../../../lib/logger';
import { hasFeature } from '../../../../utils/capabilities';
import { formatFileSize } from '../../../../utils/formatFileSize';
import { responseMessage } from '../../../../utils/responseMessage';
import { isVisible } from '../../../../utils/validation';
import { architectureShape, itemShape, providerShape } from '../../../catalog/utils/itemShape';
import { api } from '../api';
import {
  ARCHITECTURE_LABELS,
  ARCHITECTURE_SCHEMA,
  CHECKSUM_TYPES,
  PROVIDER_LABELS,
  PROVIDER_SCHEMA,
} from '../forms';
import { canManageBox } from '../permissions';

const slotShape = {
  item: itemShape.isRequired,
  version: PropTypes.string.isRequired,
  provider: providerShape.isRequired,
  ctx: PropTypes.shape({
    user: PropTypes.object,
    org: PropTypes.string.isRequired,
    reload: PropTypes.func.isRequired,
    notify: PropTypes.func.isRequired,
    setEditor: PropTypes.func,
    setForm: PropTypes.func,
  }).isRequired,
};

const ProviderEditForm = ({ draft, rules, onChange }) => {
  const { t } = useTranslation();
  return (
    <form noValidate>
      <FormErrorSummary errors={rules.summary} />
      <Field
        id={rules.idFor('name')}
        label={t('boxes.provider.name')}
        error={rules.errors.name || ''}
        className="form-group col-md-3"
      >
        {aria => (
          <input
            {...aria}
            type="text"
            className="form-control"
            name="name"
            value={draft.name}
            onChange={onChange}
            onBlur={() => rules.onBlur('name')}
          />
        )}
      </Field>
      <Field
        id={rules.idFor('description')}
        label={t('boxes.provider.description')}
        error={rules.errors.description || ''}
        className="form-group"
      >
        {aria => (
          <textarea
            {...aria}
            className="form-control"
            name="description"
            value={draft.description}
            onChange={onChange}
            onBlur={() => rules.onBlur('description')}
          />
        )}
      </Field>
    </form>
  );
};

ProviderEditForm.propTypes = {
  draft: PropTypes.shape({
    name: PropTypes.string.isRequired,
    description: PropTypes.string.isRequired,
  }).isRequired,
  rules: formRulesShape.isRequired,
  onChange: PropTypes.func.isRequired,
};

export const BoxProviderActions = ({ item, version, provider, ctx }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, org, reload, notify, setEditor } = ctx;
  const manage = canManageBox(user, org, item.extras.raw);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({
    name: provider.name,
    description: provider.description || '',
  });
  const [showDelete, setShowDelete] = useState(false);
  const rules = useFormRules({
    formKey: 'provider',
    schema: PROVIDER_SCHEMA,
    values: draft,
    labels: PROVIDER_LABELS,
    idPrefix: 'provider-edit',
  });

  const onChange = useCallback(event => {
    const { name, value } = event.target;
    setDraft(current => ({ ...current, [name]: value }));
  }, []);

  useEffect(() => {
    if (!editing) {
      return undefined;
    }
    setEditor(<ProviderEditForm draft={draft} rules={rules} onChange={onChange} />);
    return () => setEditor(null);
  }, [editing, draft, rules, onChange, setEditor]);

  const cancel = () => {
    setEditing(false);
    rules.reset();
  };

  const save = () => {
    if (!rules.validateAll()) {
      return;
    }
    const renamed = draft.name !== provider.name;
    api.providers
      .update(org, item.name, version, provider.name, draft)
      .then(() => {
        notify('success', t('boxes.provider.updated'));
        setEditing(false);
        if (renamed) {
          navigate(`/${org}/${item.name}/${version}/${draft.name}`);
        } else {
          reload();
        }
      })
      .catch(requestError => {
        if (rules.applyServerErrors(requestError)) {
          return;
        }
        log.api.error('Error updating provider', {
          providerName: draft.name,
          error: requestError.message,
        });
        notify('danger', responseMessage(requestError, t('boxes.provider.updateError')));
      });
  };

  const remove = () => {
    api.providers
      .remove(org, item.name, version, provider.name)
      .then(() => navigate(`/${org}/${item.name}/${version}`))
      .catch(requestError => {
        log.api.error('Error deleting provider', {
          providerName: provider.name,
          error: requestError.message,
        });
        notify('danger', t('boxes.provider.deleteError'));
      });
  };

  const back = (
    <Link className="btn btn-dark me-2" to={`/${org}/${item.name}/${version}`}>
      {t('boxes.actions.back')}
    </Link>
  );

  if (!manage) {
    return back;
  }

  if (editing) {
    return (
      <>
        <button type="button" className="btn btn-success me-2" onClick={save}>
          {t('boxes.buttons.save')}
        </button>
        <button type="button" className="btn btn-secondary me-2" onClick={cancel}>
          {t('boxes.buttons.cancel')}
        </button>
        {back}
      </>
    );
  }

  return (
    <>
      <button type="button" className="btn btn-primary me-2" onClick={() => setEditing(true)}>
        {t('boxes.buttons.edit')}
      </button>
      <button type="button" className="btn btn-danger me-2" onClick={() => setShowDelete(true)}>
        {t('boxes.buttons.delete')}
      </button>
      {back}
      <ConfirmModal
        show={showDelete}
        handleClose={() => setShowDelete(false)}
        handleConfirm={remove}
      />
    </>
  );
};

BoxProviderActions.propTypes = slotShape;

const UploadProgress = ({ file, progress }) => {
  const { t } = useTranslation();
  return (
    <div>
      <div className="progress progress-lg mb-2">
        <div
          className="progress-bar bg-success progress-bar-striped progress-bar-animated"
          role="progressbar"
          aria-valuenow={progress}
          aria-valuemin="0"
          aria-valuemax="100"
          style={{ width: `${progress}%` }}
        >
          <span>{progress}%</span>
        </div>
      </div>
      <div className="text-muted upload-stats d-flex justify-content-between">
        <small>
          <strong>{t('boxes.architecture.fileSize')}:</strong> {formatFileSize(file.size)}
        </small>
        <small>
          <strong>{t('boxes.architecture.uploaded')}:</strong>{' '}
          {formatFileSize(Math.round((progress / 100) * file.size))} ({progress}%)
        </small>
        <small>
          <strong>{t('boxes.architecture.remaining')}:</strong>{' '}
          {formatFileSize(Math.round(((100 - progress) / 100) * file.size))}
        </small>
      </div>
    </div>
  );
};

UploadProgress.propTypes = {
  file: PropTypes.shape({ size: PropTypes.number.isRequired }).isRequired,
  progress: PropTypes.number.isRequired,
};

const AddArchitectureForm = ({ draft, rules, progress, onChange, onFile }) => {
  const { t } = useTranslation();
  const { file } = draft;
  return (
    <div className="add-architecture-form">
      <form noValidate>
        <FormErrorSummary errors={rules.summary} />
        <div className="form-check form-switch">
          <input
            className="form-check-input"
            type="checkbox"
            id={rules.idFor('defaultBox')}
            name="defaultBox"
            checked={draft.defaultBox}
            onChange={onChange}
          />
          <label className="form-check-label" htmlFor={rules.idFor('defaultBox')}>
            {t('boxes.architecture.defaultBox')}
          </label>
        </div>
        <Field
          id={rules.idFor('file')}
          label={t('boxes.architecture.file')}
          error={rules.errors.file || ''}
        >
          {aria => (
            <div>
              <label className="btn btn-outline-primary">
                <input
                  {...aria}
                  type="file"
                  onChange={onFile}
                  onBlur={() => rules.onBlur('file')}
                  className="d-none"
                  accept=".box,application/octet-stream"
                />
                {t('boxes.architecture.chooseFile')}
              </label>
              {file ? (
                <div className="mt-2">
                  <small className="text-muted">
                    {t('boxes.architecture.selected', {
                      name: file.name,
                      size: formatFileSize(file.size),
                    })}
                  </small>
                </div>
              ) : null}
            </div>
          )}
        </Field>
        {file ? <UploadProgress file={file} progress={progress} /> : null}
        <Field
          id={rules.idFor('name')}
          label={t('boxes.architecture.name')}
          error={rules.errors.name || ''}
          className="form-group col-md-3"
        >
          {aria => (
            <input
              {...aria}
              type="text"
              className="form-control"
              name="name"
              value={draft.name}
              onChange={onChange}
              onBlur={() => rules.onBlur('name')}
            />
          )}
        </Field>
        <Field
          id={rules.idFor('checksumType')}
          label={t('boxes.architecture.checksumType')}
          error={rules.errors.checksumType || ''}
          className="form-group col-md-3"
        >
          {aria => (
            <select
              {...aria}
              className="form-select"
              name="checksumType"
              value={draft.checksumType}
              onChange={onChange}
              onBlur={() => rules.onBlur('checksumType')}
            >
              {CHECKSUM_TYPES.map(type => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          )}
        </Field>
        {isVisible(ARCHITECTURE_SCHEMA.properties.checksum, [draft]) ? (
          <Field
            id={rules.idFor('checksum')}
            label={t('boxes.architecture.checksum')}
            error={rules.errors.checksum || ''}
            className="form-group"
          >
            {aria => (
              <input
                {...aria}
                type="text"
                className="form-control"
                name="checksum"
                value={draft.checksum}
                onChange={onChange}
                onBlur={() => rules.onBlur('checksum')}
              />
            )}
          </Field>
        ) : null}
      </form>
    </div>
  );
};

AddArchitectureForm.propTypes = {
  draft: PropTypes.shape({
    name: PropTypes.string.isRequired,
    defaultBox: PropTypes.bool.isRequired,
    checksumType: PropTypes.string.isRequired,
    checksum: PropTypes.string.isRequired,
    file: PropTypes.object,
  }).isRequired,
  rules: formRulesShape.isRequired,
  progress: PropTypes.number.isRequired,
  onChange: PropTypes.func.isRequired,
  onFile: PropTypes.func.isRequired,
};

const EMPTY_ARCHITECTURE = {
  name: '',
  defaultBox: false,
  checksumType: 'NULL',
  checksum: '',
  file: null,
};

export const BoxArchitecturesActions = ({ item, version, provider, ctx }) => {
  const { t } = useTranslation();
  const status = useStatus();
  const { user, org, reload, notify, setForm } = ctx;
  const [show, setShow] = useState(false);
  const [draft, setDraft] = useState(EMPTY_ARCHITECTURE);
  const [progress, setProgress] = useState(0);
  const rules = useFormRules({
    formKey: 'architecture',
    schema: ARCHITECTURE_SCHEMA,
    values: draft,
    labels: ARCHITECTURE_LABELS,
    idPrefix: 'architecture-add',
  });

  const onChange = useCallback(event => {
    const { name, value, type, checked } = event.target;
    const next = type === 'checkbox' ? checked : value;
    setDraft(current => ({ ...current, [name]: next }));
  }, []);

  const onFile = useCallback(event => {
    const file = event.target.files[0] || null;
    setDraft(current => ({ ...current, file }));
  }, []);

  useEffect(() => {
    if (!show) {
      return undefined;
    }
    setForm(
      <AddArchitectureForm
        draft={draft}
        rules={rules}
        progress={progress}
        onChange={onChange}
        onFile={onFile}
      />
    );
    return () => setForm(null);
  }, [show, draft, rules, progress, onChange, onFile, setForm]);

  if (!hasFeature(status, 'uploads') || !canManageBox(user, org, item.extras.raw)) {
    return null;
  }

  const onProgress = event => {
    if (event.status === 'assembling') {
      setProgress(100);
      notify('info', t('boxes.architecture.assembling'));
    } else if (event.status === 'complete') {
      setProgress(100);
      notify('success', t('boxes.architecture.uploadComplete'));
    } else if (event.progress !== undefined) {
      setProgress(event.progress);
    }
  };

  const toggle = () => {
    if (show) {
      setDraft(EMPTY_ARCHITECTURE);
      setProgress(0);
      rules.reset();
    }
    setShow(!show);
  };

  const save = async () => {
    if (!rules.validateAll()) {
      return;
    }
    const { file, ...fields } = draft;
    notify('info', t('boxes.architecture.uploadStarting'));
    setProgress(0);
    try {
      await api.architectures.create(org, item.name, version, provider.name, fields);
      const result = await api.files.upload(
        file,
        {
          organization: org,
          name: item.name,
          version,
          provider: provider.name,
          architecture: draft.name,
          checksum: draft.checksum,
          checksumType: draft.checksumType,
        },
        onProgress
      );
      if (result.details?.status === 'assembling') {
        notify('info', t('boxes.architecture.uploadAssembling'));
      }
      setShow(false);
      setDraft(EMPTY_ARCHITECTURE);
      setProgress(0);
      rules.reset();
      reload();
    } catch (error) {
      if (rules.applyServerErrors(error)) {
        return;
      }
      log.file.error('Upload failed', { error: error.message, stack: error.stack });
      notify('danger', responseMessage(error, t(error.message)));
    }
  };

  return (
    <div>
      <button
        type="button"
        className={`btn ${show ? 'btn-secondary' : 'btn-outline-success'} me-2`}
        onClick={toggle}
      >
        {show ? t('boxes.buttons.cancel') : t('boxes.architecture.add')}
      </button>
      {show ? (
        <button type="button" className="btn btn-success" onClick={save}>
          {t('boxes.buttons.save')}
        </button>
      ) : null}
    </div>
  );
};

BoxArchitecturesActions.propTypes = slotShape;

export const BoxArchitectureRowActions = ({ item, version, provider, architecture, ctx }) => {
  const { t } = useTranslation();
  const { user, org, reload, notify } = ctx;
  const [show, setShow] = useState(false);

  if (!canManageBox(user, org, item.extras.raw)) {
    return null;
  }

  const remove = () => {
    api.architectures
      .remove(org, item.name, version, provider.name, architecture.name)
      .then(() => {
        notify('success', t('boxes.architecture.deleted'));
        reload();
      })
      .catch(error => {
        log.component.error('Error deleting architecture', {
          architectureName: architecture.name,
          error: error.message,
        });
        notify('danger', responseMessage(error, t('boxes.architecture.deleteError')));
      });
  };

  return (
    <>
      <button type="button" className="btn btn-danger me-2" onClick={() => setShow(true)}>
        {t('boxes.buttons.delete')}
      </button>
      <ConfirmModal show={show} handleClose={() => setShow(false)} handleConfirm={remove} />
    </>
  );
};

BoxArchitectureRowActions.propTypes = { ...slotShape, architecture: architectureShape.isRequired };
