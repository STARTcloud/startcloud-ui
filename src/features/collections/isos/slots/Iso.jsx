import PropTypes from 'prop-types';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaCheck, FaGlobe, FaLock, FaPen, FaTrash, FaXmark } from 'react-icons/fa6';
import { Link, useNavigate } from 'react-router-dom';

import ConfirmModal from '../../../../components/common/ConfirmModal';
import Field from '../../../../components/common/Field';
import FormErrorSummary from '../../../../components/common/FormErrorSummary';
import { formRulesShape, useFormRules } from '../../../../hooks/useFormRules';
import { log } from '../../../../lib/logger';
import { session } from '../../../../lib/runtime';
import { responseMessage } from '../../../../utils/responseMessage';
import { itemShape, versionShape } from '../../../catalog/utils/itemShape';
import { joinAsAdmin } from '../../../organizations/api/organizations';
import { isGlobalAdmin, isOrgManager, isOrgMember } from '../../boxes';
import {
  ISO_LABELS,
  ISO_RENAME_SCHEMA,
  ISO_SCHEMA,
  VERSION_LABELS,
  VERSION_SCHEMA,
} from '../../boxes/forms';
import { deleteVersionCascade } from '../adapter';
import { api } from '../api';

const EMPTY_ISO = { name: '', description: '', isPublic: false };
const EMPTY_VERSION = { versionNumber: '', description: '' };

const CreateIsoForm = ({ org, draft, rules, onChange }) => {
  const { t } = useTranslation();
  return (
    <div className="create-form mt-2 mb-3 w-100 order-last">
      <h4>{t('boxes.iso.createTitle')}</h4>
      <form noValidate>
        <FormErrorSummary errors={rules.summary} />
        <Field
          id={rules.idFor('name')}
          label={<strong>{t('boxes.iso.name')}:</strong>}
          error={rules.errors.name || ''}
        >
          {aria => (
            <div className="row align-items-center g-0">
              <div className="col-auto pe-0">
                <input type="text" className="form-control" value={org} disabled />
              </div>
              <div className="col-auto px-1">
                <span className="font-size-xl font-weight-bolder">/</span>
              </div>
              <div className="col-auto ps-0">
                <input
                  {...aria}
                  type="text"
                  className="form-control"
                  name="name"
                  value={draft.name}
                  onChange={onChange}
                  onBlur={() => rules.onBlur('name')}
                />
              </div>
            </div>
          )}
        </Field>
        <Field
          id={rules.idFor('description')}
          label={<strong>{t('boxes.box.description')}:</strong>}
          error={rules.errors.description || ''}
        >
          {aria => (
            <textarea
              {...aria}
              className="form-control"
              name="description"
              value={draft.description}
              onChange={onChange}
              onBlur={() => rules.onBlur('description')}
              rows="3"
            />
          )}
        </Field>
        <div className="form-group mt-2">
          <label htmlFor="visibilityPrivate">
            <strong>{t('boxes.box.visibility')}:</strong>
          </label>
          <div>
            <div className="form-check">
              <input
                type="radio"
                className="form-check-input"
                id="visibilityPrivate"
                name="isPublic"
                value="false"
                checked={!draft.isPublic}
                onChange={onChange}
              />
              <label className="form-check-label" htmlFor="visibilityPrivate">
                {t('boxes.box.organization.visibility.private')}
              </label>
            </div>
            <div className="form-check">
              <input
                type="radio"
                className="form-check-input"
                id="visibilityPublic"
                name="isPublic"
                value="true"
                checked={draft.isPublic}
                onChange={onChange}
              />
              <label className="form-check-label" htmlFor="visibilityPublic">
                {t('boxes.box.organization.visibility.public')}
              </label>
            </div>
          </div>
          <small className="form-text text-muted">{t('boxes.iso.visibilityHint')}</small>
        </div>
      </form>
    </div>
  );
};

CreateIsoForm.propTypes = {
  org: PropTypes.string.isRequired,
  draft: PropTypes.shape({
    name: PropTypes.string.isRequired,
    description: PropTypes.string.isRequired,
    isPublic: PropTypes.bool.isRequired,
  }).isRequired,
  rules: formRulesShape.isRequired,
  onChange: PropTypes.func.isRequired,
};

const JoinAsOwner = ({ org, notify }) => {
  const { t } = useTranslation();
  const join = () => {
    joinAsAdmin(org)
      .then(async () => {
        await session.reload();
        window.location.reload();
      })
      .catch(error => {
        log.api.error('Error joining organization as admin', { org, error: error.message });
        notify('danger', responseMessage(error, t('boxes.messages.operationFailed')));
      });
  };
  return (
    <button type="button" className="btn btn-sm btn-outline-warning" onClick={join}>
      {t('boxes.box.organization.buttons.joinAsAdmin')}
    </button>
  );
};

JoinAsOwner.propTypes = {
  org: PropTypes.string.isRequired,
  notify: PropTypes.func.isRequired,
};

const RemoveAll = ({ org, reload, notify }) => {
  const { t } = useTranslation();
  const [show, setShow] = useState(false);
  const removeAll = () => {
    api.isos
      .removeAll(org)
      .then(() => {
        notify('success', t('boxes.messages.operationSuccessful'));
        reload();
      })
      .catch(error => {
        log.api.error('Error removing all ISOs', { org, error: error.message });
        notify('danger', t('boxes.messages.deleteFailed'));
      });
  };
  return (
    <>
      <button type="button" className="btn btn-sm btn-danger" onClick={() => setShow(true)}>
        {t('pages.removeAll')}
      </button>
      <ConfirmModal show={show} handleClose={() => setShow(false)} handleConfirm={removeAll} />
    </>
  );
};

RemoveAll.propTypes = {
  org: PropTypes.string.isRequired,
  reload: PropTypes.func.isRequired,
  notify: PropTypes.func.isRequired,
};

export const IsoListActions = ({ ctx }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, org, reload, notify } = ctx;
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState(EMPTY_ISO);
  const rules = useFormRules({
    formKey: 'iso',
    schema: ISO_SCHEMA,
    values: draft,
    labels: ISO_LABELS,
  });

  if (!org || !user) {
    return null;
  }

  const onChange = event => {
    const { name, value } = event.target;
    setDraft(current => ({ ...current, [name]: name === 'isPublic' ? value === 'true' : value }));
  };

  const cancel = () => {
    setCreating(false);
    setDraft(EMPTY_ISO);
    rules.reset();
  };

  const create = () => {
    if (!creating) {
      setCreating(true);
      return;
    }
    if (!rules.validateAll()) {
      return;
    }
    api.isos
      .create(org, draft)
      .then(() => {
        notify('success', t('boxes.iso.created'));
        cancel();
        navigate(`/${org}/isos/${draft.name}`);
      })
      .catch(error => {
        if (rules.applyServerErrors(error)) {
          return;
        }
        log.api.error('Error creating ISO', { isoName: draft.name, error: error.message });
        notify('danger', responseMessage(error, t('boxes.iso.createError')));
      });
  };

  return (
    <>
      {isGlobalAdmin(user) && !isOrgMember(user, org) ? (
        <JoinAsOwner org={org} notify={notify} />
      ) : null}
      {isOrgMember(user, org) ? (
        <>
          <button type="button" className="btn btn-sm btn-outline-success" onClick={create}>
            {creating ? t('boxes.iso.create') : t('pages.addNew')}
          </button>
          {creating ? (
            <button type="button" className="btn btn-sm btn-secondary" onClick={cancel}>
              {t('boxes.buttons.cancel')}
            </button>
          ) : null}
        </>
      ) : null}
      {isOrgManager(user, org) ? <RemoveAll org={org} reload={reload} notify={notify} /> : null}
      {creating ? (
        <CreateIsoForm org={org} draft={draft} rules={rules} onChange={onChange} />
      ) : null}
    </>
  );
};

IsoListActions.propTypes = {
  ctx: PropTypes.shape({
    user: PropTypes.object,
    org: PropTypes.string.isRequired,
    reload: PropTypes.func.isRequired,
    notify: PropTypes.func.isRequired,
  }).isRequired,
};

const RenameControls = ({ iso, org, notify, onDone, onSaved }) => {
  const { t } = useTranslation();
  const [form, setForm] = useState({ name: iso.name });
  const rules = useFormRules({
    formKey: 'iso',
    schema: ISO_RENAME_SCHEMA,
    values: form,
    labels: ISO_LABELS,
    idPrefix: 'iso-rename',
  });
  const save = event => {
    event.preventDefault();
    if (!rules.validateAll()) {
      return;
    }
    const next = form.name.trim();
    api.isos
      .update(org, iso.name, { name: next })
      .then(() => {
        notify('success', t('boxes.messages.operationSuccessful'));
        onSaved(next);
      })
      .catch(error => {
        if (rules.applyServerErrors(error)) {
          return;
        }
        log.api.error('Error updating ISO name', { error: error.message });
        notify('danger', responseMessage(error, t('boxes.messages.operationFailed')));
      });
  };
  return (
    <form className="d-inline-block me-2" onSubmit={save} noValidate>
      <FormErrorSummary errors={rules.summary} />
      <Field
        id={rules.idFor('name')}
        label={<span className="visually-hidden">{t('boxes.iso.name')}</span>}
        error={rules.errors.name || ''}
        className="mb-0"
      >
        {aria => (
          <span className="d-inline-flex align-items-center gap-1">
            <input
              {...aria}
              type="text"
              className="form-control form-control-sm w-auto"
              value={form.name}
              onChange={event => setForm({ name: event.target.value })}
              onBlur={() => rules.onBlur('name')}
            />
            <button
              type="submit"
              className="btn btn-sm btn-success"
              title={t('boxes.buttons.save')}
            >
              <FaCheck />
            </button>
            <button
              type="button"
              className="btn btn-sm btn-secondary"
              onClick={onDone}
              title={t('boxes.buttons.cancel')}
            >
              <FaXmark />
            </button>
          </span>
        )}
      </Field>
    </form>
  );
};

RenameControls.propTypes = {
  iso: PropTypes.shape({ name: PropTypes.string.isRequired }).isRequired,
  org: PropTypes.string.isRequired,
  notify: PropTypes.func.isRequired,
  onDone: PropTypes.func.isRequired,
  onSaved: PropTypes.func.isRequired,
};

export const IsoItemActions = ({ item, ctx }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, org, reload, notify } = ctx;
  const iso = item.extras.raw;
  const manage = isOrgManager(user, org);
  const [renaming, setRenaming] = useState(false);
  const [showDelete, setShowDelete] = useState(false);

  const update = (fields, message) => {
    api.isos
      .update(org, iso.name, fields)
      .then(reload)
      .catch(error => {
        log.api.error(message, { isoName: iso.name, error: error.message });
        notify('danger', responseMessage(error, t('boxes.messages.operationFailed')));
      });
  };

  const remove = () => {
    api.isos
      .remove(org, iso.name)
      .then(() => navigate(`/${org}/isos`))
      .catch(error => {
        log.api.error('Error deleting ISO', { isoName: iso.name, error: error.message });
        notify('danger', t('boxes.messages.deleteFailed'));
      });
  };

  const manageControls = () => {
    if (!manage) {
      return null;
    }
    if (renaming) {
      return (
        <RenameControls
          iso={iso}
          org={org}
          notify={notify}
          onDone={() => setRenaming(false)}
          onSaved={next => navigate(`/${org}/isos/${next}`)}
        />
      );
    }
    return (
      <>
        <button
          type="button"
          className="btn btn-outline-secondary me-2"
          onClick={() => update({ isPublic: !iso.isPublic }, 'Error updating ISO visibility')}
        >
          {iso.isPublic ? <FaLock className="me-2" /> : <FaGlobe className="me-2" />}
          {t(iso.isPublic ? 'boxes.iso.makePrivate' : 'boxes.iso.makePublic')}
        </button>
        <button
          type="button"
          className={`btn ${iso.published ? 'btn-warning' : 'btn-outline-primary'} me-2`}
          onClick={() => update({ published: !iso.published }, 'Error updating ISO release status')}
        >
          {t(iso.published ? 'boxes.iso.unpublish' : 'boxes.iso.publish')}
        </button>
        <button
          type="button"
          className="btn btn-outline-secondary me-2"
          onClick={() => setRenaming(true)}
        >
          <FaPen className="me-2" />
          {t('boxes.buttons.rename')}
        </button>
        <button type="button" className="btn btn-danger me-2" onClick={() => setShowDelete(true)}>
          <FaTrash className="me-2" />
          {t('boxes.buttons.delete')}
        </button>
      </>
    );
  };

  return (
    <>
      {manageControls()}
      <Link className="btn btn-dark me-2" to={`/${org}/isos`}>
        {t('boxes.buttons.back')}
      </Link>
      <ConfirmModal
        show={showDelete}
        handleClose={() => setShowDelete(false)}
        handleConfirm={remove}
        title={t('boxes.iso.deleteTitle')}
        message={t('boxes.iso.deleteMessage', { name: iso.name })}
      />
    </>
  );
};

IsoItemActions.propTypes = {
  item: itemShape.isRequired,
  ctx: PropTypes.shape({
    user: PropTypes.object,
    org: PropTypes.string.isRequired,
    reload: PropTypes.func.isRequired,
    notify: PropTypes.func.isRequired,
  }).isRequired,
};

const AddVersionForm = ({ draft, rules, onChange }) => {
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
            rows="3"
          />
        )}
      </Field>
    </form>
  );
};

AddVersionForm.propTypes = {
  draft: PropTypes.shape({
    versionNumber: PropTypes.string.isRequired,
    description: PropTypes.string.isRequired,
  }).isRequired,
  rules: formRulesShape.isRequired,
  onChange: PropTypes.func.isRequired,
};

export const IsoVersionsActions = ({ item, ctx }) => {
  const { t } = useTranslation();
  const { user, org, reload, notify, setForm } = ctx;
  const manage = isOrgManager(user, org);
  const [show, setShow] = useState(false);
  const [draft, setDraft] = useState(EMPTY_VERSION);
  const rules = useFormRules({
    formKey: 'version',
    schema: VERSION_SCHEMA,
    values: draft,
    labels: VERSION_LABELS,
    idPrefix: 'iso-version',
  });

  const onChange = useCallback(event => {
    const { name, value } = event.target;
    setDraft(current => ({ ...current, [name]: value }));
  }, []);

  useEffect(() => {
    if (!show) {
      return undefined;
    }
    setForm(<AddVersionForm draft={draft} rules={rules} onChange={onChange} />);
    return () => setForm(null);
  }, [show, draft, rules, onChange, setForm]);

  if (!manage) {
    return null;
  }

  const toggle = () => {
    if (show) {
      setDraft(EMPTY_VERSION);
      rules.reset();
    }
    setShow(!show);
  };

  const save = () => {
    if (!rules.validateAll()) {
      return;
    }
    api.versions
      .create(org, item.name, draft)
      .then(() => {
        notify('success', t('boxes.version.added'));
        setShow(false);
        setDraft(EMPTY_VERSION);
        rules.reset();
        reload();
      })
      .catch(requestError => {
        if (rules.applyServerErrors(requestError)) {
          return;
        }
        notify('danger', responseMessage(requestError, t('boxes.version.addError')));
      });
  };

  return (
    <div>
      <button
        type="button"
        className={`btn ${show ? 'btn-secondary' : 'btn-outline-success'} me-2`}
        onClick={toggle}
      >
        {show ? t('boxes.buttons.cancel') : t('boxes.version.add')}
      </button>
      {show ? (
        <button type="button" className="btn btn-success" onClick={save}>
          {t('boxes.buttons.save')}
        </button>
      ) : null}
    </div>
  );
};

IsoVersionsActions.propTypes = {
  item: itemShape.isRequired,
  ctx: PropTypes.shape({
    user: PropTypes.object,
    org: PropTypes.string.isRequired,
    reload: PropTypes.func.isRequired,
    notify: PropTypes.func.isRequired,
    setForm: PropTypes.func.isRequired,
  }).isRequired,
};

export const IsoVersionRowActions = ({ item, version, ctx }) => {
  const { t } = useTranslation();
  const { user, org, reload, notify } = ctx;
  const [show, setShow] = useState(false);

  if (!isOrgManager(user, org)) {
    return null;
  }

  const remove = () => {
    deleteVersionCascade(org, item.name, version.version)
      .then(() => {
        notify('success', t('boxes.version.deleted'));
        reload();
      })
      .catch(error => {
        log.component.error('Error deleting version', {
          versionNumber: version.version,
          error: error.message,
        });
        notify('danger', responseMessage(error, t('boxes.version.deleteError')));
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

IsoVersionRowActions.propTypes = {
  item: itemShape.isRequired,
  version: versionShape.isRequired,
  ctx: PropTypes.shape({
    user: PropTypes.object,
    org: PropTypes.string.isRequired,
    reload: PropTypes.func.isRequired,
    notify: PropTypes.func.isRequired,
  }).isRequired,
};
