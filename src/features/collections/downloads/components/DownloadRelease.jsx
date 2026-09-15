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
import { RELEASE_LABELS, RELEASE_SCHEMA } from '../../../../utils/forms';
import { itemShape, providerShape, versionShape } from '../../../../utils/itemShape';
import { isOrgManager } from '../../../../utils/permissions';
import { api } from '../api/downloads';

import DownloadZone, { useUpload } from './DownloadZone';
import { TextAreaField, TextField } from './fields';

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
  version: versionShape.isRequired,
  ctx: ctxShape.isRequired,
};

const ReleaseEditForm = ({ draft, rules, onChange, onSubmit }) => {
  const { t } = useTranslation();
  return (
    <form onSubmit={onSubmit} noValidate>
      <FormErrorSummary errors={rules.summary} />
      <TextField
        name="version_number"
        draft={draft}
        rules={rules}
        onChange={onChange}
        hint={t('downloads.hints.identifier')}
      />
      <TextAreaField name="description" draft={draft} rules={rules} onChange={onChange} />
      <TextAreaField name="release_notes" draft={draft} rules={rules} onChange={onChange} />
    </form>
  );
};

ReleaseEditForm.propTypes = {
  draft: PropTypes.object.isRequired,
  rules: formRulesShape.isRequired,
  onChange: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
};

export const DownloadVersionActions = ({ item, version, ctx }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const status = useStatus();
  const { user, org, reload, notify, setEditor } = ctx;
  const manage = hasFeature(status, 'uploads') && isOrgManager(user, org);
  const [editing, setEditing] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [draft, setDraft] = useState({
    version_number: version.version,
    description: version.description || '',
    release_notes: version.releaseNotes || '',
  });
  const rules = useFormRules({
    formKey: 'release',
    schema: RELEASE_SCHEMA,
    values: draft,
    labels: RELEASE_LABELS,
    idPrefix: 'release-edit',
  });

  const onChange = useCallback(event => {
    const { name, value } = event.target;
    setDraft(current => ({ ...current, [name]: value }));
  }, []);

  const save = () => {
    if (!rules.validateAll()) {
      return;
    }
    const renamed = draft.version_number !== version.version;
    api.releases
      .update(org, item.name, version.version, draft)
      .then(() => {
        notify('success', t('downloads.release.updated'));
        setEditing(false);
        if (renamed) {
          navigate(`/${org}/downloads/${item.name}/${draft.version_number}`);
        } else {
          reload();
        }
      })
      .catch(error => {
        if (rules.applyServerErrors(error)) {
          return;
        }
        log.api.error('Error updating a release', {
          versionNumber: version.version,
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
    setEditor(
      <ReleaseEditForm draft={draft} rules={rules} onChange={onChange} onSubmit={submit} />
    );
    return () => setEditor(null);
  }, [editing, draft, rules, onChange, submit, setEditor]);

  const remove = () => {
    api.releases
      .remove(org, item.name, version.version)
      .then(() => navigate(`/${org}/downloads/${item.name}`))
      .catch(error => {
        log.api.error('Error deleting a release', {
          versionNumber: version.version,
          error: error.message,
        });
        notify('danger', t(error.messageKey || 'errors.request'));
      });
  };

  const back = (
    <Link className="btn btn-dark me-2" to={`/${org}/downloads/${item.name}`}>
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

DownloadVersionActions.propTypes = slotShape;

export const DownloadVersionRowActions = ({ item, version, ctx }) => {
  const { t } = useTranslation();
  const status = useStatus();
  const { user, org, reload, notify } = ctx;
  const [show, setShow] = useState(false);

  if (!hasFeature(status, 'uploads') || !isOrgManager(user, org)) {
    return null;
  }

  const remove = () => {
    api.releases
      .remove(org, item.name, version.version)
      .then(() => {
        notify('success', t('downloads.release.deleted'));
        reload();
      })
      .catch(error => {
        log.component.error('Error deleting a release', {
          versionNumber: version.version,
          error: error.message,
        });
        notify('danger', t(error.messageKey || 'errors.request'));
      });
  };

  return (
    <>
      <button type="button" className="btn btn-danger" onClick={() => setShow(true)}>
        {t('boxes.buttons.delete')}
      </button>
      <ConfirmModal show={show} handleClose={() => setShow(false)} handleConfirm={remove} />
    </>
  );
};

DownloadVersionRowActions.propTypes = slotShape;

export const DownloadProvidersActions = ({ item, version, ctx }) => {
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
        api.uploads.release(org, item.name, version.version, options)
      )}
    />
  );
};

DownloadProvidersActions.propTypes = slotShape;

export const DownloadProviderRowActions = ({ item, version, provider, ctx }) => {
  const { t } = useTranslation();
  const status = useStatus();
  const { user, org, reload, notify } = ctx;
  const [show, setShow] = useState(false);

  if (!hasFeature(status, 'uploads') || !isOrgManager(user, org)) {
    return null;
  }

  const remove = () => {
    api.patches
      .remove(org, item.name, version.version, provider.name)
      .then(() => {
        notify('success', t('downloads.patch.deleted'));
        reload();
      })
      .catch(error => {
        log.component.error('Error deleting a patch', {
          patchName: provider.name,
          error: error.message,
        });
        notify('danger', t(error.messageKey || 'errors.request'));
      });
  };

  return (
    <>
      <button type="button" className="btn btn-danger" onClick={() => setShow(true)}>
        {t('boxes.buttons.delete')}
      </button>
      <ConfirmModal show={show} handleClose={() => setShow(false)} handleConfirm={remove} />
    </>
  );
};

DownloadProviderRowActions.propTypes = { ...slotShape, provider: providerShape.isRequired };
