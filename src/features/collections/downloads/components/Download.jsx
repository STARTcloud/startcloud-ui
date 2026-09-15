import PropTypes from 'prop-types';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaGlobe, FaLock } from 'react-icons/fa6';
import { Link, useNavigate } from 'react-router-dom';

import ConfirmModal from '../../../../components/common/ConfirmModal';
import FormErrorSummary from '../../../../components/common/FormErrorSummary';
import { useStatus } from '../../../../contexts/StatusContext';
import { formRulesShape, useFormRules } from '../../../../hooks/useFormRules';
import { log } from '../../../../lib/logger';
import { hasFeature } from '../../../../utils/capabilities';
import { DOWNLOAD_LABELS, DOWNLOAD_SCHEMA } from '../../../../utils/forms';
import { itemShape } from '../../../../utils/itemShape';
import { isOrgManager, isOrgMember } from '../../../../utils/permissions';
import { api } from '../api/downloads';

import DownloadZone, { useUpload } from './DownloadZone';
import { TextAreaField, TextField, VisibilityRadios } from './fields';

const draftFrom = product => ({
  name: product.name ?? '',
  description: product.description ?? '',
  is_public: product.isPublic ?? false,
  family: product.family ?? '',
  vendor: product.vendor ?? '',
  icon_url: product.iconUrl ?? '',
  docs_url: product.docsUrl ?? '',
  notes_url: product.notesUrl ?? '',
});

const slotCtxShape = PropTypes.shape({
  user: PropTypes.object,
  org: PropTypes.string.isRequired,
  reload: PropTypes.func.isRequired,
  notify: PropTypes.func.isRequired,
  setEditor: PropTypes.func,
  setForm: PropTypes.func,
});

export const DownloadListActions = ({ ctx }) => {
  const status = useStatus();
  const { user, org, notify, reload } = ctx;
  const upload = useUpload({ notify, reload });

  if (!org || !user || !hasFeature(status, 'uploads') || !isOrgMember(user, org)) {
    return null;
  }

  return (
    <DownloadZone
      uploading={upload.uploading}
      progress={upload.progress}
      isPublic={upload.isPublic}
      onVisibility={upload.setIsPublic}
      onFile={upload.upload(options => api.uploads.collection(org, options))}
    />
  );
};

DownloadListActions.propTypes = { ctx: slotCtxShape.isRequired };

export const DownloadItemHeaderExtra = ({ item }) => {
  const { t } = useTranslation();
  const { docs, notes } = item.links || {};
  if (!item.vendor && !docs && !notes) {
    return null;
  }
  return (
    <>
      {item.vendor ? <p className="mb-0 mt-1">{item.vendor}</p> : null}
      {docs || notes ? (
        <div className="d-flex align-items-center gap-3 mt-1 small">
          {docs ? (
            <a href={docs} target="_blank" rel="noopener noreferrer">
              {t('downloads.actions.docs')}
            </a>
          ) : null}
          {notes ? (
            <a href={notes} target="_blank" rel="noopener noreferrer">
              {t('downloads.actions.notes')}
            </a>
          ) : null}
        </div>
      ) : null}
    </>
  );
};

DownloadItemHeaderExtra.propTypes = { item: itemShape.isRequired };

const ProductEditForm = ({ draft, rules, onChange, onSubmit }) => {
  const { t } = useTranslation();
  return (
    <form onSubmit={onSubmit} noValidate>
      <FormErrorSummary errors={rules.summary} />
      <TextField
        name="name"
        draft={draft}
        rules={rules}
        onChange={onChange}
        hint={t('downloads.hints.slug')}
      />
      <TextAreaField name="description" draft={draft} rules={rules} onChange={onChange} />
      <TextField name="family" draft={draft} rules={rules} onChange={onChange} />
      <TextField name="vendor" draft={draft} rules={rules} onChange={onChange} />
      <TextField name="icon_url" type="url" draft={draft} rules={rules} onChange={onChange} />
      <TextField name="docs_url" type="url" draft={draft} rules={rules} onChange={onChange} />
      <TextField name="notes_url" type="url" draft={draft} rules={rules} onChange={onChange} />
      <VisibilityRadios draft={draft} onChange={onChange} />
    </form>
  );
};

ProductEditForm.propTypes = {
  draft: PropTypes.object.isRequired,
  rules: formRulesShape.isRequired,
  onChange: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
};

const useProductEditor = ({ org, product, ctx, onSaved }) => {
  const { t } = useTranslation();
  const { reload, notify, setEditor } = ctx;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(() => draftFrom(product));
  const rules = useFormRules({
    formKey: 'download',
    schema: DOWNLOAD_SCHEMA,
    values: draft,
    labels: DOWNLOAD_LABELS,
    idPrefix: 'download-edit',
  });

  const onChange = useCallback(event => {
    const { name, value } = event.target;
    setDraft(current => ({ ...current, [name]: name === 'is_public' ? value === 'true' : value }));
  }, []);

  const save = () => {
    if (!rules.validateAll()) {
      return;
    }
    api.downloads
      .update(org, product.name, draft)
      .then(() => {
        notify('success', t('downloads.product.updated'));
        setEditing(false);
        if (draft.name === product.name) {
          reload();
        } else {
          onSaved(draft.name);
        }
      })
      .catch(error => {
        if (rules.applyServerErrors(error)) {
          return;
        }
        log.api.error('Error updating a download product', {
          productName: product.name,
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
      <ProductEditForm draft={draft} rules={rules} onChange={onChange} onSubmit={submit} />
    );
    return () => setEditor(null);
  }, [editing, draft, rules, onChange, submit, setEditor]);

  const cancel = () => {
    setEditing(false);
    setDraft(draftFrom(product));
    rules.reset();
  };

  return { editing, open: () => setEditing(true), cancel, save };
};

export const DownloadItemActions = ({ item, ctx }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const status = useStatus();
  const { user, org, reload, notify } = ctx;
  const product = item.extras.raw;
  const manage = hasFeature(status, 'uploads') && isOrgManager(user, org);
  const [showDelete, setShowDelete] = useState(false);
  const editor = useProductEditor({
    org,
    product,
    ctx,
    onSaved: next => navigate(`/${org}/downloads/${next}`),
  });

  const update = (fields, message) => {
    api.downloads
      .update(org, product.name, fields)
      .then(reload)
      .catch(error => {
        log.api.error(message, { productName: product.name, error: error.message });
        notify('danger', t(error.messageKey || 'errors.request'));
      });
  };

  const remove = () => {
    api.downloads
      .remove(org, product.name)
      .then(() => navigate(`/${org}/downloads`))
      .catch(error => {
        log.api.error('Error deleting a download product', {
          productName: product.name,
          error: error.message,
        });
        notify('danger', t('boxes.messages.deleteFailed'));
      });
  };

  const back = (
    <Link className="btn btn-dark me-2" to={`/${org}/downloads`}>
      {t('boxes.buttons.back')}
    </Link>
  );

  if (!manage) {
    return back;
  }

  if (editor.editing) {
    return (
      <>
        <button type="button" className="btn btn-success me-2" onClick={editor.save}>
          {t('boxes.buttons.save')}
        </button>
        <button type="button" className="btn btn-secondary me-2" onClick={editor.cancel}>
          {t('boxes.buttons.cancel')}
        </button>
        {back}
      </>
    );
  }

  return (
    <>
      <button
        type="button"
        className="btn btn-outline-secondary me-2"
        onClick={() => update({ is_public: !item.isPublic }, 'Error updating download visibility')}
      >
        {item.isPublic ? <FaLock className="me-2" /> : <FaGlobe className="me-2" />}
        {t(item.isPublic ? 'downloads.actions.makePrivate' : 'downloads.actions.makePublic')}
      </button>
      <button
        type="button"
        className={`btn ${item.published ? 'btn-warning' : 'btn-outline-primary'} me-2`}
        onClick={() => update({ published: !item.published }, 'Error updating download status')}
      >
        {t(item.published ? 'downloads.actions.unpublish' : 'downloads.actions.publish')}
      </button>
      <button type="button" className="btn btn-primary me-2" onClick={editor.open}>
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

DownloadItemActions.propTypes = { item: itemShape.isRequired, ctx: slotCtxShape.isRequired };

export const DownloadVersionsActions = ({ item, ctx }) => {
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
      onFile={upload.upload(options => api.uploads.product(org, item.name, options))}
    />
  );
};

DownloadVersionsActions.propTypes = { item: itemShape.isRequired, ctx: slotCtxShape.isRequired };
