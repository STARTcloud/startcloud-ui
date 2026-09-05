import PropTypes from 'prop-types';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';

import ConfirmModal from '../../../../components/common/ConfirmModal';
import Field from '../../../../components/common/Field';
import FormErrorSummary from '../../../../components/common/FormErrorSummary';
import { formRulesShape, useFormRules } from '../../../../hooks/useFormRules';
import { log } from '../../../../lib/logger';
import { responseMessage } from '../../../../utils/responseMessage';
import { itemShape, providerShape, versionShape } from '../../../catalog/utils/itemShape';
import { deleteProviderCascade, deleteVersionCascade } from '../adapter';
import { api } from '../api';
import {
  DEPRECATION_LABELS,
  DEPRECATION_SCHEMA,
  PROVIDER_LABELS,
  PROVIDER_SCHEMA,
  VERSION_LABELS,
  VERSION_SCHEMA,
} from '../forms';
import { canManageBox } from '../permissions';

const EMPTY_DEPRECATION = { deprecationReason: '' };

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

const VersionEditForm = ({ draft, rules, onChange }) => {
  const { t } = useTranslation();
  return (
    <form noValidate>
      <FormErrorSummary errors={rules.summary} />
      <Field
        id={rules.idFor('versionNumber')}
        label={t('boxes.version.number')}
        error={rules.errors.versionNumber || ''}
        className="form-group col-md-3"
      >
        {aria => (
          <input
            {...aria}
            type="text"
            className="form-control"
            name="versionNumber"
            value={draft.versionNumber}
            onChange={onChange}
            onBlur={() => rules.onBlur('versionNumber')}
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

VersionEditForm.propTypes = {
  draft: PropTypes.shape({
    versionNumber: PropTypes.string.isRequired,
    description: PropTypes.string.isRequired,
  }).isRequired,
  rules: formRulesShape.isRequired,
  onChange: PropTypes.func.isRequired,
};

export const BoxVersionActions = ({ item, version, ctx }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, org, reload, notify, setEditor } = ctx;
  const manage = canManageBox(user, org, item.extras.raw);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({
    versionNumber: version.version,
    description: version.description || '',
  });
  const [showDelete, setShowDelete] = useState(false);
  const rules = useFormRules({
    formKey: 'version',
    schema: VERSION_SCHEMA,
    values: draft,
    labels: VERSION_LABELS,
    idPrefix: 'version-edit',
  });

  const onChange = useCallback(event => {
    const { name, value } = event.target;
    setDraft(current => ({ ...current, [name]: value }));
  }, []);

  useEffect(() => {
    if (!editing) {
      return undefined;
    }
    setEditor(<VersionEditForm draft={draft} rules={rules} onChange={onChange} />);
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
    const renamed = draft.versionNumber !== version.version;
    api.versions
      .update(org, item.name, version.version, draft)
      .then(() => {
        notify('success', t('boxes.version.updated'));
        setEditing(false);
        if (renamed) {
          navigate(`/${org}/${item.name}/${draft.versionNumber}`);
        } else {
          reload();
        }
      })
      .catch(requestError => {
        if (rules.applyServerErrors(requestError)) {
          return;
        }
        notify('danger', responseMessage(requestError, t('boxes.version.updateError')));
      });
  };

  const remove = () => {
    deleteVersionCascade(org, item.name, version.version)
      .then(() => navigate(`/${org}/${item.name}`))
      .catch(requestError => {
        log.component.error('Error deleting version', {
          versionNumber: version.version,
          error: requestError.message,
        });
        notify('danger', responseMessage(requestError, t('boxes.version.deleteError')));
      });
  };

  const back = (
    <Link className="btn btn-dark me-2" to={`/${org}/${item.name}`}>
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

BoxVersionActions.propTypes = slotShape;

export const BoxVersionBannerActions = ({ item, version, ctx }) => {
  const { t } = useTranslation();
  const { user, org, reload, notify } = ctx;
  if (!canManageBox(user, org, item.extras.raw)) {
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
          fields: { deprecated: false, deprecation_reason: null },
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

BoxVersionBannerActions.propTypes = slotShape;

const DeprecateButton = ({ onDeprecate }) => {
  const { t } = useTranslation();
  const [asking, setAsking] = useState(false);
  const [draft, setDraft] = useState(EMPTY_DEPRECATION);
  const rules = useFormRules({
    formKey: 'version',
    schema: DEPRECATION_SCHEMA,
    values: draft,
    labels: DEPRECATION_LABELS,
    idPrefix: 'box-deprecate',
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

export const BoxVersionNotesActions = ({ item, version, ctx }) => {
  const { t } = useTranslation();
  const { user, org, reload, notify } = ctx;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(version.releaseNotes || '');

  if (!canManageBox(user, org, item.extras.raw)) {
    return null;
  }

  const save = () =>
    updateVersion({
      org,
      item,
      version,
      fields: { release_notes: draft },
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
              fields: { deprecated: true, deprecation_reason: reason },
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

BoxVersionNotesActions.propTypes = slotShape;

const AddProviderForm = ({ draft, rules, onChange }) => {
  const { t } = useTranslation();
  return (
    <form noValidate>
      <div className="add-provider-form">
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
      </div>
    </form>
  );
};

AddProviderForm.propTypes = {
  draft: PropTypes.shape({
    name: PropTypes.string.isRequired,
    description: PropTypes.string.isRequired,
  }).isRequired,
  rules: formRulesShape.isRequired,
  onChange: PropTypes.func.isRequired,
};

const EMPTY_PROVIDER = { name: '', description: '' };

export const BoxProvidersActions = ({ item, version, ctx }) => {
  const { t } = useTranslation();
  const { user, org, reload, notify, setForm } = ctx;
  const [show, setShow] = useState(false);
  const [draft, setDraft] = useState(EMPTY_PROVIDER);
  const rules = useFormRules({
    formKey: 'provider',
    schema: PROVIDER_SCHEMA,
    values: draft,
    labels: PROVIDER_LABELS,
    idPrefix: 'provider-add',
  });

  const onChange = useCallback(event => {
    const { name, value } = event.target;
    setDraft(current => ({ ...current, [name]: value }));
  }, []);

  useEffect(() => {
    if (!show) {
      return undefined;
    }
    setForm(<AddProviderForm draft={draft} rules={rules} onChange={onChange} />);
    return () => setForm(null);
  }, [show, draft, rules, onChange, setForm]);

  if (!canManageBox(user, org, item.extras.raw)) {
    return null;
  }

  const toggle = () => {
    if (show) {
      setDraft(EMPTY_PROVIDER);
      rules.reset();
    }
    setShow(!show);
  };

  const save = () => {
    if (!rules.validateAll()) {
      return;
    }
    api.providers
      .create(org, item.name, version.version, draft)
      .then(() => {
        notify('success', t('boxes.provider.created'));
        setShow(false);
        setDraft(EMPTY_PROVIDER);
        rules.reset();
        reload();
      })
      .catch(requestError => {
        if (rules.applyServerErrors(requestError)) {
          return;
        }
        notify('danger', responseMessage(requestError, t('boxes.provider.createError')));
      });
  };

  return (
    <div>
      <button
        type="button"
        className={`btn ${show ? 'btn-secondary' : 'btn-outline-success'} me-2`}
        onClick={toggle}
      >
        {show ? t('boxes.buttons.cancel') : t('boxes.provider.add')}
      </button>
      {show ? (
        <button type="button" className="btn btn-success me-2" onClick={save}>
          {t('boxes.buttons.save')}
        </button>
      ) : null}
    </div>
  );
};

BoxProvidersActions.propTypes = slotShape;

export const BoxProviderRowActions = ({ item, version, provider, ctx }) => {
  const { t } = useTranslation();
  const { user, org, reload, notify } = ctx;
  const [show, setShow] = useState(false);

  if (!canManageBox(user, org, item.extras.raw)) {
    return null;
  }

  const remove = () => {
    deleteProviderCascade(org, item.name, version.version, provider.name)
      .then(() => {
        notify('success', t('boxes.provider.deleted'));
        reload();
      })
      .catch(error => {
        log.component.error('Error deleting provider', {
          providerName: provider.name,
          error: error.message,
        });
        notify('danger', t('boxes.provider.deleteError'));
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

BoxProviderRowActions.propTypes = { ...slotShape, provider: providerShape.isRequired };
