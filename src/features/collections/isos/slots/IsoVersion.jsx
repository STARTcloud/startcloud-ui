import PropTypes from 'prop-types';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaUpload, FaXmark } from 'react-icons/fa6';
import { Link, useNavigate } from 'react-router-dom';

import ConfirmModal from '../../../../components/common/ConfirmModal';
import Field from '../../../../components/common/Field';
import FormErrorSummary from '../../../../components/common/FormErrorSummary';
import { useStatus } from '../../../../contexts/StatusContext';
import { formRulesShape, useFormRules } from '../../../../hooks/useFormRules';
import { log } from '../../../../lib/logger';
import { hasFeature } from '../../../../utils/capabilities';
import { responseMessage } from '../../../../utils/responseMessage';
import { architectureShape, itemShape, versionShape } from '../../../catalog/utils/itemShape';
import { isOrgManager } from '../../boxes';
import {
  DEPRECATION_LABELS,
  DEPRECATION_SCHEMA,
  ISO_ARCHITECTURE_LABELS,
  ISO_ARCHITECTURE_SCHEMA,
} from '../../boxes/forms';
import { deleteVersionCascade } from '../adapter';
import { api } from '../api';

const HOVER_DWELL_MS = 400;
const EMPTY_ARCHITECTURE = { name: '' };
const EMPTY_DEPRECATION = { deprecationReason: '' };
const UPLOAD_KEY = 'iso-upload';

const slotShape = {
  item: itemShape.isRequired,
  version: versionShape.isRequired,
  ctx: PropTypes.shape({
    user: PropTypes.object,
    org: PropTypes.string.isRequired,
    reload: PropTypes.func.isRequired,
    notify: PropTypes.func.isRequired,
    setEditor: PropTypes.func,
    setForm: PropTypes.func,
  }).isRequired,
};

const updateVersion = ({ org, item, version, fields, t, notify, reload }) =>
  api.versions
    .update(org, item.name, version.version, fields)
    .then(() => {
      notify('success', t('boxes.version.updated'));
      reload();
      return true;
    })
    .catch(error => {
      log.api.error('Error updating version', {
        versionNumber: version.version,
        error: error.message,
      });
      notify('danger', responseMessage(error, t('boxes.version.updateError')));
      return false;
    });

const VersionEditForm = ({ draft, onChange }) => {
  const { t } = useTranslation();
  return (
    <form>
      <div className="form-group">
        <label htmlFor="description">{t('boxes.provider.description')}</label>
        <textarea
          className="form-control"
          id="description"
          name="description"
          value={draft.description}
          onChange={onChange}
        />
      </div>
    </form>
  );
};

VersionEditForm.propTypes = {
  draft: PropTypes.shape({ description: PropTypes.string.isRequired }).isRequired,
  onChange: PropTypes.func.isRequired,
};

export const IsoVersionActions = ({ item, version, ctx }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, org, reload, notify, setEditor } = ctx;
  const manage = isOrgManager(user, org);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({ description: version.description || '' });
  const [showDelete, setShowDelete] = useState(false);

  const onChange = useCallback(event => {
    const { name, value } = event.target;
    setDraft(current => ({ ...current, [name]: value }));
  }, []);

  useEffect(() => {
    if (!editing) {
      return undefined;
    }
    setEditor(<VersionEditForm draft={draft} onChange={onChange} />);
    return () => setEditor(null);
  }, [editing, draft, onChange, setEditor]);

  const save = () =>
    updateVersion({ org, item, version, fields: draft, t, notify, reload }).then(ok => {
      if (ok) {
        setEditing(false);
      }
    });

  const remove = () => {
    deleteVersionCascade(org, item.name, version.version)
      .then(() => navigate(`/${org}/isos/${item.name}`))
      .catch(requestError => {
        log.component.error('Error deleting version', {
          versionNumber: version.version,
          error: requestError.message,
        });
        notify('danger', responseMessage(requestError, t('boxes.version.deleteError')));
      });
  };

  const back = (
    <Link className="btn btn-dark me-2" to={`/${org}/isos/${item.name}`}>
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
        <button type="button" className="btn btn-secondary me-2" onClick={() => setEditing(false)}>
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

IsoVersionActions.propTypes = slotShape;

export const IsoVersionBannerActions = ({ item, version, ctx }) => {
  const { t } = useTranslation();
  const { user, org, reload, notify } = ctx;
  if (!isOrgManager(user, org)) {
    return null;
  }
  return (
    <button
      type="button"
      className="btn btn-sm btn-outline-success"
      onClick={() =>
        updateVersion({
          org,
          item,
          version,
          fields: { deprecated: false, deprecationReason: null },
          t,
          notify,
          reload,
        })
      }
    >
      {t('boxes.version.undeprecate')}
    </button>
  );
};

IsoVersionBannerActions.propTypes = slotShape;

const DeprecateButton = ({ onDeprecate }) => {
  const { t } = useTranslation();
  const [asking, setAsking] = useState(false);
  const [draft, setDraft] = useState(EMPTY_DEPRECATION);
  const rules = useFormRules({
    formKey: 'version',
    schema: DEPRECATION_SCHEMA,
    values: draft,
    labels: DEPRECATION_LABELS,
    idPrefix: 'iso-deprecate',
  });

  const close = () => {
    setAsking(false);
    setDraft(EMPTY_DEPRECATION);
    rules.reset();
  };

  const submit = async event => {
    event.preventDefault();
    if (!rules.validateAll()) {
      return;
    }
    const ok = await onDeprecate(draft.deprecationReason.trim());
    if (ok) {
      close();
    }
  };

  if (!asking) {
    return (
      <button
        type="button"
        className="btn btn-sm btn-outline-danger"
        onClick={() => setAsking(true)}
      >
        {t('boxes.version.deprecate')}
      </button>
    );
  }

  return (
    <form className="flex-grow-1" onSubmit={submit} noValidate>
      <FormErrorSummary errors={rules.summary} />
      <Field
        id={rules.idFor('deprecationReason')}
        label={t('boxes.version.deprecationReason')}
        error={rules.errors.deprecationReason || ''}
        className="mb-2"
      >
        {aria => (
          <input
            {...aria}
            type="text"
            className="form-control form-control-sm"
            value={draft.deprecationReason}
            onChange={event => setDraft({ deprecationReason: event.target.value })}
            onBlur={() => rules.onBlur('deprecationReason')}
          />
        )}
      </Field>
      <button type="submit" className="btn btn-sm btn-danger me-2">
        {t('boxes.version.deprecate')}
      </button>
      <button type="button" className="btn btn-sm btn-secondary" onClick={close}>
        {t('boxes.buttons.cancel')}
      </button>
    </form>
  );
};

DeprecateButton.propTypes = {
  onDeprecate: PropTypes.func.isRequired,
};

export const IsoVersionNotesActions = ({ item, version, ctx }) => {
  const { t } = useTranslation();
  const { user, org, reload, notify } = ctx;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(version.releaseNotes || '');

  if (!isOrgManager(user, org)) {
    return null;
  }

  const save = () =>
    updateVersion({
      org,
      item,
      version,
      fields: { releaseNotes: draft },
      t,
      notify,
      reload,
    }).then(ok => {
      if (ok) {
        setEditing(false);
      }
    });

  if (editing) {
    return (
      <div className="flex-grow-1">
        <textarea
          className="form-control mb-2"
          rows="4"
          value={draft}
          onChange={event => setDraft(event.target.value)}
          placeholder={t('boxes.version.releaseNotes')}
        />
        <button type="button" className="btn btn-sm btn-success me-2" onClick={save}>
          {t('boxes.buttons.save')}
        </button>
        <button
          type="button"
          className="btn btn-sm btn-secondary"
          onClick={() => setEditing(false)}
        >
          {t('boxes.buttons.cancel')}
        </button>
      </div>
    );
  }

  return (
    <div className="d-flex flex-wrap gap-2 align-items-start">
      <button
        type="button"
        className="btn btn-sm btn-outline-primary"
        onClick={() => setEditing(true)}
      >
        {t('boxes.version.editReleaseNotes')}
      </button>
      {version.deprecated ? null : (
        <DeprecateButton
          onDeprecate={reason =>
            updateVersion({
              org,
              item,
              version,
              fields: { deprecated: true, deprecationReason: reason },
              t,
              notify,
              reload,
            })
          }
        />
      )}
    </div>
  );
};

IsoVersionNotesActions.propTypes = slotShape;

const UploadZone = ({ uploading, progress, form, rules, onName, onFile }) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [over, setOver] = useState(false);
  const dwell = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => () => clearTimeout(dwell.current), []);

  const startDwell = () => {
    clearTimeout(dwell.current);
    dwell.current = setTimeout(() => setOpen(true), HOVER_DWELL_MS);
  };

  const stopDwell = () => clearTimeout(dwell.current);

  const pick = file => {
    if (file) {
      onFile(file);
    }
  };

  if (!open) {
    return (
      <button
        type="button"
        className="btn btn-sm btn-outline-success"
        onClick={() => setOpen(true)}
        onMouseEnter={startDwell}
        onMouseLeave={stopDwell}
      >
        {t('pages.addNew')}
      </button>
    );
  }

  return (
    <div
      role="presentation"
      className={`upload-zone w-100 order-last${over ? ' over' : ''}`}
      onDragOver={event => {
        event.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={event => {
        event.preventDefault();
        setOver(false);
        pick(event.dataTransfer.files[0]);
      }}
    >
      <button
        type="button"
        className="navbar-search-tool upload-zone-close"
        onClick={() => setOpen(false)}
        disabled={uploading}
        title={t('boxes.buttons.close')}
        aria-label={t('boxes.buttons.close')}
      >
        <FaXmark />
      </button>
      <FormErrorSummary errors={rules.summary} />
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
            className="form-control form-control-sm"
            value={form.name}
            disabled={uploading}
            onChange={event => onName(event.target.value)}
            onBlur={() => rules.onBlur('name')}
          />
        )}
      </Field>
      <button
        type="button"
        className="upload-zone-target"
        onClick={() => inputRef.current?.click()}
        onKeyDown={event => {
          if (event.key === 'Escape' && !uploading) {
            setOpen(false);
          }
        }}
        disabled={uploading}
      >
        <FaUpload className="upload-zone-icon" aria-hidden />
        <span>
          {uploading
            ? t('boxes.iso.upload.uploading', { percent: progress })
            : t('boxes.iso.upload.drop')}
        </span>
      </button>
      <input
        ref={inputRef}
        type="file"
        hidden
        accept=".iso"
        disabled={uploading}
        onChange={event => {
          pick(event.target.files[0]);
          event.target.value = '';
        }}
      />
      {uploading ? (
        <div className="progress upload-zone-progress">
          <div
            className="progress-bar progress-bar-striped progress-bar-animated"
            role="progressbar"
            style={{ width: `${progress}%` }}
            aria-valuenow={progress}
            aria-valuemin="0"
            aria-valuemax="100"
          />
        </div>
      ) : null}
    </div>
  );
};

UploadZone.propTypes = {
  uploading: PropTypes.bool.isRequired,
  progress: PropTypes.number.isRequired,
  form: PropTypes.shape({ name: PropTypes.string.isRequired }).isRequired,
  rules: formRulesShape.isRequired,
  onName: PropTypes.func.isRequired,
  onFile: PropTypes.func.isRequired,
};

export const IsoArtifactsActions = ({ item, version, ctx }) => {
  const { t } = useTranslation();
  const status = useStatus();
  const { user, org, reload, notify } = ctx;
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [form, setForm] = useState(EMPTY_ARCHITECTURE);
  const rules = useFormRules({
    formKey: 'architecture',
    schema: ISO_ARCHITECTURE_SCHEMA,
    values: form,
    labels: ISO_ARCHITECTURE_LABELS,
    idPrefix: 'iso-architecture',
  });

  if (!hasFeature(status, 'uploads') || !isOrgManager(user, org)) {
    return null;
  }

  const upload = file => {
    if (!rules.validateAll()) {
      return;
    }
    const architecture = form.name.trim();
    setUploading(true);
    setProgress(0);
    notify('', '', { key: UPLOAD_KEY });
    api.files
      .upload(org, item.name, version.version, architecture, file, event => {
        setProgress(Math.round((100 * event.loaded) / event.total));
      })
      .then(() => {
        notify('success', t('boxes.messages.operationSuccessful'), { key: UPLOAD_KEY });
        setForm(EMPTY_ARCHITECTURE);
        rules.reset();
        reload();
      })
      .catch(requestError => {
        if (rules.applyServerErrors(requestError)) {
          return;
        }
        log.api.error('Error uploading ISO file', {
          architectureName: architecture,
          error: requestError.message,
        });
        notify('danger', responseMessage(requestError, t('boxes.messages.uploadFailed')), {
          key: UPLOAD_KEY,
        });
      })
      .finally(() => setUploading(false));
  };

  return (
    <UploadZone
      uploading={uploading}
      progress={progress}
      form={form}
      rules={rules}
      onName={name => setForm({ name })}
      onFile={upload}
    />
  );
};

IsoArtifactsActions.propTypes = slotShape;

export const IsoArtifactRowActions = ({ item, version, artifact, ctx }) => {
  const { t } = useTranslation();
  const { user, org, reload, notify } = ctx;
  const [show, setShow] = useState(false);

  if (!isOrgManager(user, org)) {
    return null;
  }

  const remove = () => {
    api.files
      .remove(org, item.name, version.version, artifact.name)
      .then(() => {
        notify('success', t('boxes.iso.file.deleted'));
        reload();
      })
      .catch(error => {
        log.component.error('Error deleting ISO file', {
          architectureName: artifact.name,
          error: error.message,
        });
        notify('danger', responseMessage(error, t('boxes.iso.file.deleteError')));
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

IsoArtifactRowActions.propTypes = { ...slotShape, artifact: architectureShape.isRequired };
