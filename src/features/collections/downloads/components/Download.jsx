import PropTypes from 'prop-types';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';

import { resultLineOf } from '../../../../components/common/bulkResult';
import ConfirmModal from '../../../../components/common/ConfirmModal';
import FormErrorSummary from '../../../../components/common/FormErrorSummary';
import VisibilityPicker, {
  CascadeCheck,
  PublishStep,
  VisibilityStep,
  opensVisibility,
} from '../../../../components/common/VisibilityPicker';
import { useStatus } from '../../../../contexts/StatusContext';
import { formRulesShape, useFormRules } from '../../../../hooks/useFormRules';
import { log } from '../../../../lib/logger';
import { hasFeature } from '../../../../utils/capabilities';
import { ACCESS_LABELS, DOWNLOAD_LABELS, DOWNLOAD_SCHEMA } from '../../../../utils/forms';
import { itemShape } from '../../../../utils/itemShape';
import { isOrgGuest, isOrgManager, isOrgMember } from '../../../../utils/permissions';
import { refusalMessage } from '../../../../utils/validation';
import { downloadsAdapter } from '../api/adapter';
import { api } from '../api/downloads';

import DownloadZone, { useUpload } from './DownloadZone';
import DuplicatesPane from './DuplicatesPane';
import { TextAreaField, TextField } from './fields';
import { PlacePane } from './PlaceForm';

const draftFrom = product => ({
  name: product.name ?? '',
  description: product.description ?? '',
  is_public: product.is_public ?? false,
  guest_access: product.guest_access ?? false,
  family: product.family ?? '',
  vendor: product.vendor ?? '',
  icon_url: product.icon_url ?? '',
  docs_url: product.docs_url ?? '',
  notes_url: product.notes_url ?? '',
});

/**
 * The cascade check of an edit form, drawn beside the visibility radios
 * while the picked pair opens the row wider than the pair it holds; a
 * ticked one puts `recursive: true` in the draft the PUT sends, so the
 * rows beneath follow the row to its new word.
 */
export const FormCascade = ({ draft, current, onChange }) =>
  opensVisibility(draft, current) ? (
    <CascadeCheck
      checked={Boolean(draft.recursive)}
      onChange={checked => onChange({ recursive: checked })}
    />
  ) : null;

FormCascade.propTypes = {
  draft: PropTypes.shape({
    is_public: PropTypes.bool.isRequired,
    guest_access: PropTypes.bool.isRequired,
    recursive: PropTypes.bool,
  }).isRequired,
  current: PropTypes.shape({
    is_public: PropTypes.bool.isRequired,
    guest_access: PropTypes.bool.isRequired,
  }).isRequired,
  onChange: PropTypes.func.isRequired,
};

/**
 * The one Reconcile visibility beneath action of a product, release or
 * patch page: one `reconcile` bulk call at the row's own level with the
 * row's name alone, the answer's result line raised as the notice, then
 * the page reloaded.
 */
export const ReconcileButton = ({ level, scope, name, ctx, className = 'btn me-2' }) => {
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);
  const reconcile = () => {
    setBusy(true);
    downloadsAdapter
      .bulk(level, 'reconcile', [name], scope)
      .then(answer => {
        ctx.notify('success', resultLineOf(t, 'pages.bulk', answer));
        ctx.reload();
      })
      .catch(error => ctx.notify('danger', refusalMessage({ error, t })))
      .finally(() => setBusy(false));
  };
  return (
    <button
      type="button"
      className={`${className} btn-outline-warning`}
      disabled={busy}
      onClick={reconcile}
    >
      {t('pages.bulk.reconcile')}
    </button>
  );
};

ReconcileButton.propTypes = {
  level: PropTypes.oneOf(['items', 'versions', 'providers']).isRequired,
  scope: PropTypes.object.isRequired,
  name: PropTypes.string.isRequired,
  ctx: PropTypes.shape({
    notify: PropTypes.func.isRequired,
    reload: PropTypes.func.isRequired,
  }).isRequired,
  className: PropTypes.string,
};

const slotCtxShape = PropTypes.shape({
  user: PropTypes.object,
  org: PropTypes.string.isRequired,
  reload: PropTypes.func.isRequired,
  notify: PropTypes.func.isRequired,
  setEditor: PropTypes.func,
  setForm: PropTypes.func,
});

/**
 * The action pane of an organization's downloads listing for a writing
 * member: the Add New zone with its placing form, and beside it the
 * Duplicates button that opens the Duplicates view under the heading row
 * in place of the zone until it is closed.
 */
export const DownloadListActions = ({ ctx }) => {
  const { t } = useTranslation();
  const status = useStatus();
  const { user, org, notify, reload } = ctx;
  const upload = useUpload({ notify });
  const [duplicates, setDuplicates] = useState(false);

  if (!org || !user || !hasFeature(status, 'uploads') || !isOrgMember(user, org)) {
    return null;
  }
  if (isOrgGuest(user, org)) {
    return null;
  }

  if (upload.pending) {
    return (
      <PlacePane
        org={org}
        pending={upload.pending}
        levels={{}}
        visibility={upload.visibility}
        notify={notify}
        reload={reload}
        onDone={upload.clear}
      />
    );
  }

  if (duplicates) {
    return <DuplicatesPane org={org} ctx={ctx} onClose={() => setDuplicates(false)} />;
  }

  return (
    <>
      <button
        type="button"
        className="btn btn-sm btn-outline-secondary"
        onClick={() => setDuplicates(true)}
      >
        {t('downloads.duplicates.button')}
      </button>
      <DownloadZone
        uploading={upload.uploading}
        progress={upload.progress}
        file={upload.file}
        error={upload.error}
        visibility={upload.visibility}
        onVisibility={upload.setVisibility}
        onFile={upload.upload(options => api.pending.upload(org, options))}
      />
    </>
  );
};

DownloadListActions.propTypes = { ctx: slotCtxShape.isRequired };

export const DownloadItemHeaderExtra = ({ item }) => {
  const { t } = useTranslation();
  const { docs, notes } = item.links || {};
  if (!docs && !notes) {
    return null;
  }
  return (
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
  );
};

DownloadItemHeaderExtra.propTypes = { item: itemShape.isRequired };

const ProductEditForm = ({ draft, current, rules, onChange, onVisibility, onSubmit }) => {
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
      <VisibilityPicker
        idPrefix={rules.idFor('visibility')}
        value={draft}
        onChange={onVisibility}
        className="mb-2"
      />
      <FormCascade draft={draft} current={current} onChange={onVisibility} />
    </form>
  );
};

ProductEditForm.propTypes = {
  draft: PropTypes.object.isRequired,
  current: PropTypes.object.isRequired,
  rules: formRulesShape.isRequired,
  onChange: PropTypes.func.isRequired,
  onVisibility: PropTypes.func.isRequired,
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
    setDraft(current => ({ ...current, [name]: value }));
  }, []);

  const onVisibility = useCallback(
    next => setDraft(current => ({ ...current, recursive: false, ...next })),
    []
  );

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
      <ProductEditForm
        draft={draft}
        current={draftFrom(product)}
        rules={rules}
        onChange={onChange}
        onVisibility={onVisibility}
        onSubmit={submit}
      />
    );
    return () => setEditor(null);
  }, [editing, draft, product, rules, onChange, onVisibility, submit, setEditor]);

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
        notify('danger', refusalMessage({ error, labels: ACCESS_LABELS, t }));
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
        notify('danger', refusalMessage({ error, t }));
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
      <VisibilityStep
        value={{ is_public: item.isPublic, guest_access: item.guestAccess }}
        onChange={pair => update(pair, 'Error updating download visibility')}
        className="btn btn-outline-secondary me-2"
      />
      <PublishStep
        published={Boolean(item.published)}
        onChange={fields => update(fields, 'Error updating download status')}
      />
      <ReconcileButton level="items" scope={{ org }} name={item.name} ctx={ctx} />
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
  const upload = useUpload({ notify });

  if (!hasFeature(status, 'uploads') || !isOrgManager(user, org)) {
    return null;
  }

  if (upload.pending) {
    return (
      <PlacePane
        org={org}
        pending={upload.pending}
        levels={{ product: item.name }}
        visibility={upload.visibility}
        notify={notify}
        reload={reload}
        onDone={upload.clear}
      />
    );
  }

  return (
    <DownloadZone
      uploading={upload.uploading}
      progress={upload.progress}
      file={upload.file}
      error={upload.error}
      visibility={upload.visibility}
      onVisibility={upload.setVisibility}
      onFile={upload.upload(options => api.pending.upload(org, options))}
    />
  );
};

DownloadVersionsActions.propTypes = { item: itemShape.isRequired, ctx: slotCtxShape.isRequired };
