import PropTypes from 'prop-types';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaUpload, FaXmark } from 'react-icons/fa6';
import { Link, useNavigate } from 'react-router-dom';

import ConfirmModal from '../../../../components/common/ConfirmModal';
import { useStatus } from '../../../../contexts/StatusContext';
import { log } from '../../../../lib/logger';
import { hasFeature } from '../../../../utils/capabilities';
import { responseMessage } from '../../../../utils/responseMessage';
import { architectureShape, itemShape, versionShape } from '../../../catalog/utils/itemShape';
import { isOrgManager } from '../../boxes';
import { deleteVersionCascade } from '../adapter';
import { api } from '../api';

const NAME_RE = /^[0-9a-zA-Z-._]+$/;
const HOVER_DWELL_MS = 400;
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
  const [reason, setReason] = useState('');

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
    <div className="d-flex gap-2 align-items-start flex-wrap">
      <input
        type="text"
        className="form-control form-control-sm w-auto"
        value={reason}
        onChange={event => setReason(event.target.value)}
        placeholder={t('boxes.version.deprecationReason')}
      />
      <button
        type="button"
        className="btn btn-sm btn-danger"
        disabled={!reason.trim()}
        onClick={async () => {
          const ok = await onDeprecate(reason.trim());
          if (ok) {
            setAsking(false);
            setReason('');
          }
        }}
      >
        {t('boxes.version.deprecate')}
      </button>
      <button type="button" className="btn btn-sm btn-secondary" onClick={() => setAsking(false)}>
        {t('boxes.buttons.cancel')}
      </button>
    </div>
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

const UploadZone = ({ uploading, progress, onFile }) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [over, setOver] = useState(false);
  const [architecture, setArchitecture] = useState('');
  const dwell = useRef(null);
  const inputRef = useRef(null);
  const nameError =
    architecture && !NAME_RE.test(architecture) ? t('boxes.validation.invalidName') : '';

  useEffect(() => () => clearTimeout(dwell.current), []);

  const startDwell = () => {
    clearTimeout(dwell.current);
    dwell.current = setTimeout(() => setOpen(true), HOVER_DWELL_MS);
  };

  const stopDwell = () => clearTimeout(dwell.current);

  const pick = file => {
    if (file) {
      onFile(file, architecture.trim());
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
      <div className="form-group col-md-3">
        <label htmlFor="isoArchitecture">{t('boxes.architecture.name')}</label>
        <input
          type="text"
          className="form-control form-control-sm"
          id="isoArchitecture"
          value={architecture}
          disabled={uploading}
          onChange={event => setArchitecture(event.target.value)}
          required
        />
        {nameError ? <div className="text-danger">{nameError}</div> : null}
      </div>
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
  onFile: PropTypes.func.isRequired,
};

const uploadError = ({ architecture, version, t }) => {
  if (!architecture) {
    return t('boxes.architecture.enterName');
  }
  if (!NAME_RE.test(architecture)) {
    return t('boxes.validation.invalidName');
  }
  if ((version.artifacts || []).some(artifact => artifact.name === architecture)) {
    return t('boxes.iso.upload.exists');
  }
  return '';
};

export const IsoArtifactsActions = ({ item, version, ctx }) => {
  const { t } = useTranslation();
  const status = useStatus();
  const { user, org, reload, notify } = ctx;
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  if (!hasFeature(status, 'uploads') || !isOrgManager(user, org)) {
    return null;
  }

  const upload = (file, architecture) => {
    const error = uploadError({ architecture, version, t });
    if (error) {
      notify('danger', error);
      return;
    }
    setUploading(true);
    setProgress(0);
    notify('', '', { key: UPLOAD_KEY });
    api.files
      .upload(org, item.name, version.version, architecture, file, event => {
        setProgress(Math.round((100 * event.loaded) / event.total));
      })
      .then(() => {
        notify('success', t('boxes.messages.operationSuccessful'), { key: UPLOAD_KEY });
        reload();
      })
      .catch(requestError => {
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

  return <UploadZone uploading={uploading} progress={progress} onFile={upload} />;
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
