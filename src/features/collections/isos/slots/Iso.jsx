import PropTypes from 'prop-types';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaCheck, FaGlobe, FaLock, FaPen, FaTrash, FaXmark } from 'react-icons/fa6';
import { Link, useNavigate } from 'react-router-dom';

import ConfirmModal from '../../../../components/common/ConfirmModal';
import { log } from '../../../../lib/logger';
import { session } from '../../../../lib/runtime';
import { responseMessage } from '../../../../utils/responseMessage';
import { itemShape, versionShape } from '../../../catalog/utils/itemShape';
import { joinAsAdmin } from '../../../organizations/api/organizations';
import { isGlobalAdmin, isOrgManager, isOrgMember } from '../../boxes';
import { deleteVersionCascade } from '../adapter';
import { api } from '../api';

const NAME_RE = /^[0-9a-zA-Z-._]+$/;
const EMPTY_ISO = { name: '', description: '', isPublic: false };
const EMPTY_VERSION = { versionNumber: '', description: '' };

const CreateIsoForm = ({ org, draft, nameError, onChange }) => {
  const { t } = useTranslation();
  return (
    <div className="create-form mt-2 mb-3 w-100 order-last">
      <h4>{t('boxes.iso.createTitle')}</h4>
      <form>
        <div className="form-group">
          <label htmlFor="isoName">
            <strong>{t('boxes.iso.name')}:</strong>
          </label>
          <div className="form-group row align-items-center">
            <div className="col-auto pe-0">
              <input type="text" className="form-control" id="organization" value={org} disabled />
            </div>
            <div className="col-auto px-1">
              <span className="font-size-xl font-weight-bolder">/</span>
            </div>
            <div className="col-auto ps-0">
              <input
                type="text"
                className="form-control"
                id="isoName"
                name="name"
                value={draft.name}
                onChange={onChange}
                required
              />
            </div>
          </div>
          {nameError ? <div className="text-danger">{nameError}</div> : null}
        </div>
        <div className="form-group mt-2">
          <label htmlFor="description">
            <strong>{t('boxes.box.description')}:</strong>
          </label>
          <textarea
            className="form-control"
            id="description"
            name="description"
            value={draft.description}
            onChange={onChange}
            rows="3"
          />
        </div>
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
  nameError: PropTypes.string.isRequired,
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
  const [nameError, setNameError] = useState('');

  if (!org || !user) {
    return null;
  }

  const onChange = event => {
    const { name, value } = event.target;
    setDraft(current => ({ ...current, [name]: name === 'isPublic' ? value === 'true' : value }));
    if (name === 'name') {
      setNameError(NAME_RE.test(value) ? '' : t('boxes.validation.invalidName'));
    }
  };

  const cancel = () => {
    setCreating(false);
    setDraft(EMPTY_ISO);
    setNameError('');
  };

  const create = () => {
    if (!creating) {
      setCreating(true);
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
          <button
            type="button"
            className="btn btn-sm btn-outline-success"
            onClick={create}
            disabled={creating && (!draft.name || Boolean(nameError))}
          >
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
        <CreateIsoForm org={org} draft={draft} nameError={nameError} onChange={onChange} />
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
  const [name, setName] = useState(iso.name);
  const save = () => {
    const next = name.trim();
    if (!next || !NAME_RE.test(next)) {
      notify('danger', t('boxes.validation.invalidName'));
      return;
    }
    api.isos
      .update(org, iso.name, { name: next })
      .then(() => {
        notify('success', t('boxes.messages.operationSuccessful'));
        onSaved(next);
      })
      .catch(error => {
        log.api.error('Error updating ISO name', { error: error.message });
        notify('danger', responseMessage(error, t('boxes.messages.operationFailed')));
      });
  };
  return (
    <span className="d-inline-flex align-items-center gap-1 me-2">
      <input
        type="text"
        className="form-control form-control-sm w-auto"
        value={name}
        onChange={event => setName(event.target.value)}
        aria-label={t('boxes.buttons.rename')}
      />
      <button
        type="button"
        className="btn btn-sm btn-success"
        onClick={save}
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

const AddVersionForm = ({ draft, error, onChange }) => {
  const { t } = useTranslation();
  return (
    <form>
      <div className="form-group col-md-3">
        <label htmlFor="versionNumber">{t('boxes.version.number')}</label>
        <input
          type="text"
          className="form-control"
          id="versionNumber"
          name="versionNumber"
          value={draft.versionNumber}
          onChange={onChange}
          required
        />
        {error ? <div className="text-danger">{error}</div> : null}
      </div>
      <div className="form-group">
        <label htmlFor="versionDescription">{t('boxes.provider.description')}</label>
        <textarea
          className="form-control"
          id="versionDescription"
          name="description"
          value={draft.description}
          onChange={onChange}
          rows="3"
        />
      </div>
    </form>
  );
};

AddVersionForm.propTypes = {
  draft: PropTypes.shape({
    versionNumber: PropTypes.string.isRequired,
    description: PropTypes.string.isRequired,
  }).isRequired,
  error: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
};

export const IsoVersionsActions = ({ item, ctx }) => {
  const { t } = useTranslation();
  const { user, org, reload, notify, setForm } = ctx;
  const manage = isOrgManager(user, org);
  const [show, setShow] = useState(false);
  const [draft, setDraft] = useState(EMPTY_VERSION);
  const [error, setError] = useState('');

  const onChange = useCallback(
    event => {
      const { name, value } = event.target;
      setDraft(current => ({ ...current, [name]: value }));
      if (name === 'versionNumber') {
        setError(NAME_RE.test(value) ? '' : t('boxes.validation.invalidName'));
      }
    },
    [t]
  );

  useEffect(() => {
    if (!show) {
      return undefined;
    }
    setForm(<AddVersionForm draft={draft} error={error} onChange={onChange} />);
    return () => setForm(null);
  }, [show, draft, error, onChange, setForm]);

  if (!manage) {
    return null;
  }

  const save = () => {
    if (!draft.versionNumber || error) {
      notify('danger', error || t('boxes.validation.required'));
      return;
    }
    if ((item.versions || []).some(version => version.version === draft.versionNumber)) {
      notify('danger', t('boxes.version.exists'));
      return;
    }
    api.versions
      .create(org, item.name, draft)
      .then(() => {
        notify('success', t('boxes.version.added'));
        setShow(false);
        setDraft(EMPTY_VERSION);
        reload();
      })
      .catch(requestError => {
        notify('danger', responseMessage(requestError, t('boxes.version.addError')));
      });
  };

  return (
    <div>
      <button
        type="button"
        className={`btn ${show ? 'btn-secondary' : 'btn-outline-success'} me-2`}
        onClick={() => setShow(current => !current)}
      >
        {show ? t('boxes.buttons.cancel') : t('boxes.version.add')}
      </button>
      {show ? (
        <button
          type="button"
          className="btn btn-success"
          onClick={save}
          disabled={!draft.versionNumber || Boolean(error)}
        >
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
