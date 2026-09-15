import PropTypes from 'prop-types';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';

import ConfirmModal from '../../../../components/common/ConfirmModal';
import FormErrorSummary from '../../../../components/common/FormErrorSummary';
import { useStatus } from '../../../../contexts/StatusContext';
import { formRulesShape, useFormRules } from '../../../../hooks/useFormRules';
import { log } from '../../../../lib/logger';
import { hasFeature } from '../../../../utils/capabilities';
import {
  CHECKSUM_TYPES,
  DOWNLOAD_FILE_LABELS,
  DOWNLOAD_FILE_SCHEMA,
  FILE_ARCHITECTURES,
  FILE_KINDS,
  FILE_PLATFORMS,
  PATCH_KINDS,
  PATCH_LABELS,
  PATCH_SCHEMA,
} from '../../../../utils/forms';
import { architectureShape, itemShape, providerShape } from '../../../../utils/itemShape';
import { isOrgManager } from '../../../../utils/permissions';
import { isVisible } from '../../../../utils/validation';
import { api } from '../api/downloads';

import DownloadZone, { useUpload } from './DownloadZone';
import { SelectField, TextField } from './fields';

const ctxShape = PropTypes.shape({
  user: PropTypes.object,
  org: PropTypes.string.isRequired,
  reload: PropTypes.func.isRequired,
  notify: PropTypes.func.isRequired,
  setEditor: PropTypes.func,
  setForm: PropTypes.func,
});

const slotShape = {
  item: itemShape.isRequired,
  version: PropTypes.string.isRequired,
  provider: providerShape.isRequired,
  ctx: ctxShape.isRequired,
};

const PatchEditForm = ({ draft, rules, onChange, onSubmit }) => {
  const { t } = useTranslation();
  return (
    <form onSubmit={onSubmit} noValidate>
      <FormErrorSummary errors={rules.summary} />
      <TextField
        name="name"
        draft={draft}
        rules={rules}
        onChange={onChange}
        hint={t('downloads.hints.identifier')}
      />
      <SelectField
        name="kind"
        group="kind"
        options={PATCH_KINDS}
        draft={draft}
        rules={rules}
        onChange={onChange}
      />
      <TextField name="released_at" type="date" draft={draft} rules={rules} onChange={onChange} />
      <TextField name="notes_url" type="url" draft={draft} rules={rules} onChange={onChange} />
    </form>
  );
};

PatchEditForm.propTypes = {
  draft: PropTypes.object.isRequired,
  rules: formRulesShape.isRequired,
  onChange: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
};

export const DownloadProviderActions = ({ item, version, provider, ctx }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const status = useStatus();
  const { user, org, reload, notify, setEditor } = ctx;
  const manage = hasFeature(status, 'uploads') && isOrgManager(user, org);
  const [editing, setEditing] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [draft, setDraft] = useState({
    name: provider.name,
    kind: provider.kind || PATCH_KINDS[0],
    released_at: provider.releasedAt ? provider.releasedAt.slice(0, 10) : '',
    notes_url: provider.notesUrl || '',
  });
  const rules = useFormRules({
    formKey: 'patch',
    schema: PATCH_SCHEMA,
    values: draft,
    labels: PATCH_LABELS,
    idPrefix: 'patch-edit',
  });

  const onChange = useCallback(event => {
    const { name, value } = event.target;
    setDraft(current => ({ ...current, [name]: value }));
  }, []);

  const save = () => {
    if (!rules.validateAll()) {
      return;
    }
    const renamed = draft.name !== provider.name;
    api.patches
      .update(org, item.name, version, provider.name, draft)
      .then(() => {
        notify('success', t('downloads.patch.updated'));
        setEditing(false);
        if (renamed) {
          navigate(`/${org}/downloads/${item.name}/${version}/${draft.name}`);
        } else {
          reload();
        }
      })
      .catch(error => {
        if (rules.applyServerErrors(error)) {
          return;
        }
        log.api.error('Error updating a patch', {
          patchName: provider.name,
          error: error.message,
        });
        notify('danger', t(error.messageKey || 'errors.request'));
      });
  };

  const saveRef = useRef(save);
  useEffect(() => {
    saveRef.current = save;
  });
  const submit = useCallback(event => {
    event.preventDefault();
    saveRef.current();
  }, []);

  useEffect(() => {
    if (!editing) {
      return undefined;
    }
    setEditor(<PatchEditForm draft={draft} rules={rules} onChange={onChange} onSubmit={submit} />);
    return () => setEditor(null);
  }, [editing, draft, rules, onChange, submit, setEditor]);

  const remove = () => {
    api.patches
      .remove(org, item.name, version, provider.name)
      .then(() => navigate(`/${org}/downloads/${item.name}/${version}`))
      .catch(error => {
        log.api.error('Error deleting a patch', {
          patchName: provider.name,
          error: error.message,
        });
        notify('danger', t(error.messageKey || 'errors.request'));
      });
  };

  const back = (
    <Link className="btn btn-dark me-2" to={`/${org}/downloads/${item.name}/${version}`}>
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
        <button
          type="button"
          className="btn btn-secondary me-2"
          onClick={() => {
            setEditing(false);
            rules.reset();
          }}
        >
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

DownloadProviderActions.propTypes = slotShape;

export const DownloadArchitecturesActions = ({ item, version, provider, ctx }) => {
  const status = useStatus();
  const { user, org, notify, reload } = ctx;
  const upload = useUpload({ notify, reload });

  if (!hasFeature(status, 'uploads') || !isOrgManager(user, org)) {
    return null;
  }

  return (
    <DownloadZone
      uploading={upload.uploading}
      progress={upload.progress}
      isPublic={upload.isPublic}
      onVisibility={upload.setIsPublic}
      onFile={upload.upload(options =>
        api.uploads.patch(org, item.name, version, provider.name, options)
      )}
    />
  );
};

DownloadArchitecturesActions.propTypes = slotShape;

const FileEditForm = ({ draft, rules, onChange, onSubmit }) => {
  const { t } = useTranslation();
  return (
    <form onSubmit={onSubmit} noValidate>
      <FormErrorSummary errors={rules.summary} />
      <TextField
        name="key"
        draft={draft}
        rules={rules}
        onChange={onChange}
        hint={t('downloads.hints.identifier')}
      />
      <TextField name="file_name" draft={draft} rules={rules} onChange={onChange} />
      <SelectField
        name="kind"
        group="kind"
        options={FILE_KINDS}
        draft={draft}
        rules={rules}
        onChange={onChange}
      />
      <SelectField
        name="platform"
        group="platform"
        options={FILE_PLATFORMS}
        draft={draft}
        rules={rules}
        onChange={onChange}
      />
      <SelectField
        name="architecture"
        group="architecture"
        options={FILE_ARCHITECTURES}
        draft={draft}
        rules={rules}
        onChange={onChange}
      />
      <TextField
        name="language"
        draft={draft}
        rules={rules}
        onChange={onChange}
        hint={t('downloads.hints.language')}
      />
      <TextField name="variant" draft={draft} rules={rules} onChange={onChange} />
      <SelectField
        name="checksum_type"
        options={CHECKSUM_TYPES}
        draft={draft}
        rules={rules}
        onChange={onChange}
      />
      {isVisible(DOWNLOAD_FILE_SCHEMA.properties.checksum, [draft]) ? (
        <TextField name="checksum" draft={draft} rules={rules} onChange={onChange} />
      ) : null}
    </form>
  );
};

FileEditForm.propTypes = {
  draft: PropTypes.object.isRequired,
  rules: formRulesShape.isRequired,
  onChange: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
};

const draftFrom = file => ({
  key: file.name,
  file_name: file.fileName || '',
  kind: file.kind || FILE_KINDS[0],
  platform: file.platform || 'any',
  architecture: file.architecture || 'any',
  language: file.language || 'any',
  variant: file.variant || '',
  checksum_type: file.checksumType || 'NULL',
  checksum: file.checksum || '',
});

export const DownloadArchitectureRowActions = ({ item, version, provider, architecture, ctx }) => {
  const { t } = useTranslation();
  const status = useStatus();
  const { user, org, reload, notify, setForm } = ctx;
  const [editing, setEditing] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [draft, setDraft] = useState(() => draftFrom(architecture));
  const rules = useFormRules({
    formKey: 'downloadFile',
    schema: DOWNLOAD_FILE_SCHEMA,
    values: draft,
    labels: DOWNLOAD_FILE_LABELS,
    idPrefix: 'download-file-edit',
  });

  const onChange = useCallback(event => {
    const { name, value } = event.target;
    setDraft(current => ({ ...current, [name]: value }));
  }, []);

  const save = () => {
    if (!rules.validateAll()) {
      return;
    }
    api.files
      .update(org, item.name, version, provider.name, architecture.name, draft)
      .then(() => {
        notify('success', t('downloads.file.updated'));
        setEditing(false);
        reload();
      })
      .catch(error => {
        if (rules.applyServerErrors(error)) {
          return;
        }
        log.api.error('Error updating a download file', {
          fileKey: architecture.name,
          error: error.message,
        });
        notify('danger', t(error.messageKey || 'errors.request'));
      });
  };

  const saveRef = useRef(save);
  useEffect(() => {
    saveRef.current = save;
  });
  const submit = useCallback(event => {
    event.preventDefault();
    saveRef.current();
  }, []);

  useEffect(() => {
    if (!editing) {
      return undefined;
    }
    setForm(<FileEditForm draft={draft} rules={rules} onChange={onChange} onSubmit={submit} />);
    return () => setForm(null);
  }, [editing, draft, rules, onChange, submit, setForm]);

  if (!hasFeature(status, 'uploads') || !isOrgManager(user, org)) {
    return null;
  }

  const remove = () => {
    api.files
      .remove(org, item.name, version, provider.name, architecture.name)
      .then(() => {
        notify('success', t('downloads.file.deleted'));
        reload();
      })
      .catch(error => {
        log.component.error('Error deleting a download file', {
          fileKey: architecture.name,
          error: error.message,
        });
        notify('danger', t(error.messageKey || 'errors.request'));
      });
  };

  if (editing) {
    return (
      <>
        <button type="button" className="btn btn-sm btn-success me-2" onClick={save}>
          {t('boxes.buttons.save')}
        </button>
        <button
          type="button"
          className="btn btn-sm btn-secondary"
          onClick={() => {
            setEditing(false);
            setDraft(draftFrom(architecture));
            rules.reset();
          }}
        >
          {t('boxes.buttons.cancel')}
        </button>
      </>
    );
  }

  return (
    <>
      <button
        type="button"
        className="btn btn-sm btn-primary me-2"
        onClick={() => setEditing(true)}
      >
        {t('boxes.buttons.edit')}
      </button>
      <button type="button" className="btn btn-sm btn-danger" onClick={() => setShowDelete(true)}>
        {t('boxes.buttons.delete')}
      </button>
      <ConfirmModal
        show={showDelete}
        handleClose={() => setShowDelete(false)}
        handleConfirm={remove}
      />
    </>
  );
};

DownloadArchitectureRowActions.propTypes = {
  ...slotShape,
  architecture: architectureShape.isRequired,
};
