import PropTypes from 'prop-types';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import Field from '../../../../components/common/Field';
import FormErrorSummary from '../../../../components/common/FormErrorSummary';
import VisibilityPicker from '../../../../components/common/VisibilityPicker';
import { useStatus } from '../../../../contexts/StatusContext';
import { formRulesShape, useFormRules } from '../../../../hooks/useFormRules';
import { log } from '../../../../lib/logger';
import { joinOrganizationAsAdmin } from '../../../../lib/organizations';
import { session } from '../../../../lib/runtime';
import { hasFeature } from '../../../../utils/capabilities';
import { BOX_LABELS, BOX_SCHEMA } from '../../../../utils/forms';
import { isGlobalAdmin, isOrgGuest, isOrgMember } from '../../../../utils/permissions';
import { api } from '../api/boxes';

const EMPTY_BOX = { name: '', description: '', is_public: false, guest_access: false };

const CreateBoxForm = ({ org, draft, rules, onChange, onVisibility, onSubmit }) => {
  const { t } = useTranslation();
  return (
    <div className="create-form mt-2 mb-3 w-100 order-last">
      <h4>{t('boxes.box.organization.headers.createNewBox')}</h4>
      <form onSubmit={onSubmit} noValidate>
        <FormErrorSummary errors={rules.summary} />
        <Field
          id={rules.idFor('name')}
          label={<strong>{t('boxes.box.name')}:</strong>}
          hint={t('boxes.box.nameHint')}
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
        <VisibilityPicker
          idPrefix={rules.idFor('visibility')}
          value={draft}
          onChange={onVisibility}
          hint={t('boxes.box.visibilityHint')}
          className="mt-2"
        />
      </form>
    </div>
  );
};

CreateBoxForm.propTypes = {
  org: PropTypes.string.isRequired,
  draft: PropTypes.shape({
    name: PropTypes.string.isRequired,
    description: PropTypes.string.isRequired,
    is_public: PropTypes.bool.isRequired,
    guest_access: PropTypes.bool.isRequired,
  }).isRequired,
  rules: formRulesShape.isRequired,
  onChange: PropTypes.func.isRequired,
  onVisibility: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
};

const JoinAsOwner = ({ org, notify }) => {
  const { t } = useTranslation();
  const join = () => {
    joinOrganizationAsAdmin(org)
      .then(async () => {
        await session.reload();
        window.location.reload();
      })
      .catch(error => {
        log.api.error('Error joining organization as admin', { org, error: error.message });
        notify('danger', t(error.messageKey || 'errors.request'));
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

export const BoxListActions = ({ ctx }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const status = useStatus();
  const { user, org, notify } = ctx;
  const uploads = hasFeature(status, 'uploads');
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
    setDraft(current => ({ ...current, [name]: value }));
  };

  const onVisibility = next => setDraft(current => ({ ...current, ...next }));

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
        notify('danger', t(error.messageKey || 'errors.request'));
      });
  };

  const submit = event => {
    event.preventDefault();
    create();
  };

  return (
    <>
      {isGlobalAdmin(user) && !isOrgMember(user, org) ? (
        <JoinAsOwner org={org} notify={notify} />
      ) : null}
      {uploads && isOrgMember(user, org) && !isOrgGuest(user, org) ? (
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
      {creating ? (
        <CreateBoxForm
          org={org}
          draft={draft}
          rules={rules}
          onChange={onChange}
          onVisibility={onVisibility}
          onSubmit={submit}
        />
      ) : null}
    </>
  );
};

BoxListActions.propTypes = {
  ctx: PropTypes.shape({
    user: PropTypes.object,
    org: PropTypes.string.isRequired,
    notify: PropTypes.func.isRequired,
  }).isRequired,
};
