import PropTypes from 'prop-types';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import ConfirmModal from '../../../../components/common/ConfirmModal';
import Field from '../../../../components/common/Field';
import FormErrorSummary from '../../../../components/common/FormErrorSummary';
import { formRulesShape, useFormRules } from '../../../../hooks/useFormRules';
import { log } from '../../../../lib/logger';
import { session } from '../../../../lib/runtime';
import { responseMessage } from '../../../../utils/responseMessage';
import { joinAsAdmin } from '../../../organizations/api/organizations';
import { api } from '../api';
import { BOX_LABELS, BOX_SCHEMA } from '../forms';
import { isGlobalAdmin, isOrgManager, isOrgMember } from '../permissions';

const EMPTY_BOX = { name: '', description: '', isPublic: false };

const CreateBoxForm = ({ org, draft, rules, onChange }) => {
  const { t } = useTranslation();
  return (
    <div className="create-form mt-2 mb-3 w-100 order-last">
      <h4>{t('boxes.box.organization.headers.createNewBox')}</h4>
      <form noValidate>
        <FormErrorSummary errors={rules.summary} />
        <Field
          id={rules.idFor('name')}
          label={<strong>{t('boxes.box.name')}:</strong>}
          hint={t('boxes.box.shortDescription')}
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
          <small className="form-text text-muted">{t('boxes.box.visibilityHint')}</small>
        </div>
      </form>
    </div>
  );
};

CreateBoxForm.propTypes = {
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
    api.boxes
      .removeAll(org)
      .then(() => {
        notify('success', t('boxes.box.organization.messages.removeAllSuccess'));
        reload();
      })
      .catch(error => {
        log.api.error('Error removing all boxes', { org, error: error.message });
        notify('danger', t('boxes.box.organization.errors.removeAll'));
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

export const BoxListActions = ({ ctx }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, org, reload, notify } = ctx;
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState(EMPTY_BOX);
  const rules = useFormRules({
    formKey: 'box',
    schema: BOX_SCHEMA,
    values: draft,
    labels: BOX_LABELS,
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
    setDraft(EMPTY_BOX);
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
    api.boxes
      .create(org, { ...draft, organization: org })
      .then(() => {
        notify('success', t('boxes.box.organization.messages.boxCreated'));
        cancel();
        navigate(`/${org}/${draft.name}`);
      })
      .catch(error => {
        if (rules.applyServerErrors(error)) {
          return;
        }
        log.api.error('Error creating box', { boxName: draft.name, error: error.message });
        notify('danger', responseMessage(error, t('boxes.box.organization.errors.boxCreate')));
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
            {creating ? t('boxes.box.organization.buttons.createBox') : t('pages.addNew')}
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
        <CreateBoxForm org={org} draft={draft} rules={rules} onChange={onChange} />
      ) : null}
    </>
  );
};

BoxListActions.propTypes = {
  ctx: PropTypes.shape({
    user: PropTypes.object,
    org: PropTypes.string.isRequired,
    reload: PropTypes.func.isRequired,
    notify: PropTypes.func.isRequired,
  }).isRequired,
};
