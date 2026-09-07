import PropTypes from 'prop-types';
import { useEffect, useState } from 'react';
import { Modal } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';

import Field from '../../../components/common/Field';
import FormErrorSummary from '../../../components/common/FormErrorSummary';
import { useNotify } from '../../../contexts/NoticeContext';
import { useFormRules } from '../../../hooks/useFormRules';
import { roles as readRoles, setRoles, updateUser } from '../api/accounts';
import { ROLES } from '../utils/examples';

export const adminUserShape = PropTypes.shape({
  id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  username: PropTypes.string.isRequired,
  full_name: PropTypes.string,
  customer_id: PropTypes.string,
  enabled: PropTypes.bool.isRequired,
  using_2fa: PropTypes.bool,
  roles: PropTypes.arrayOf(PropTypes.string).isRequired,
  organizations: PropTypes.arrayOf(
    PropTypes.shape({
      uuid: PropTypes.string.isRequired,
      name: PropTypes.string.isRequired,
      role: PropTypes.string,
      primary: PropTypes.bool,
      personal: PropTypes.bool,
    })
  ).isRequired,
});

const CUSTOMER_ID_SCHEMA = { properties: { customer_id: { $ref: '#/$defs/orgCode' } } };
const CUSTOMER_ID_LABELS = { customer_id: 'admin.users.customerId.label' };

/**
 * The catalogue of roles from `GET /api/admin/roles`, read once per
 * mount; the contract's example while the route answers 404.
 *
 * @returns {string[]} The role names
 */
export const useRoleCatalogue = () => {
  const [catalogue, setCatalogue] = useState([]);
  useEffect(() => {
    let mounted = true;
    readRoles()
      .then(list => {
        if (mounted) {
          setCatalogue(Array.isArray(list) ? list : []);
        }
      })
      .catch(error => {
        if (mounted && error.status === 404) {
          setCatalogue(ROLES);
        }
      });
    return () => {
      mounted = false;
    };
  }, []);
  return catalogue;
};

const DialogFooter = ({ busy, label, onClose }) => {
  const { t } = useTranslation();
  return (
    <Modal.Footer>
      <button type="button" className="btn btn-secondary" onClick={onClose} disabled={busy}>
        {t('admin.buttons.cancel')}
      </button>
      <button type="submit" className="btn btn-primary" disabled={busy}>
        {label}
      </button>
    </Modal.Footer>
  );
};

DialogFooter.propTypes = {
  busy: PropTypes.bool.isRequired,
  label: PropTypes.string.isRequired,
  onClose: PropTypes.func.isRequired,
};

/**
 * The Roles dialog of a Users row: one checkbox per role of the
 * catalogue, saved in one `PUT` with the whole set; mounted per user.
 */
export const RolesDialog = ({ user, catalogue, onClose, onSaved }) => {
  const { t } = useTranslation();
  const notify = useNotify();
  const [chosen, setChosen] = useState(() => new Set(user.roles));
  const [busy, setBusy] = useState(false);

  const toggle = role =>
    setChosen(current => {
      const next = new Set(current);
      if (next.has(role)) {
        next.delete(role);
      } else {
        next.add(role);
      }
      return next;
    });

  const save = event => {
    event.preventDefault();
    setBusy(true);
    setRoles(user.id, [...chosen])
      .then(() => {
        notify('success', t('admin.users.roles.saved'));
        onSaved();
        onClose();
      })
      .catch(error => notify('danger', t(error.messageKey || 'errors.request')))
      .finally(() => setBusy(false));
  };

  const names = [...new Set([...catalogue, ...user.roles])];

  return (
    <Modal show onHide={onClose}>
      <form onSubmit={save} noValidate>
        <Modal.Header closeButton>
          <Modal.Title as="h5">{t('admin.users.roles.title', { user: user.username })}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {names.map(role => (
            <div className="form-check" key={role}>
              <input
                className="form-check-input"
                type="checkbox"
                id={`role-${role}`}
                checked={chosen.has(role)}
                onChange={() => toggle(role)}
              />
              <label className="form-check-label" htmlFor={`role-${role}`}>
                {role}
              </label>
            </div>
          ))}
        </Modal.Body>
        <DialogFooter busy={busy} label={t('admin.buttons.save')} onClose={onClose} />
      </form>
    </Modal>
  );
};

RolesDialog.propTypes = {
  user: adminUserShape.isRequired,
  catalogue: PropTypes.arrayOf(PropTypes.string).isRequired,
  onClose: PropTypes.func.isRequired,
  onSaved: PropTypes.func.isRequired,
};

/**
 * The Set primary organization dialog of a Users row: a select over the
 * user's memberships and a confirm, one `PATCH` with the uuid; never a
 * click on a badge; mounted per user.
 */
export const PrimaryOrgDialog = ({ user, onClose, onSaved }) => {
  const { t } = useTranslation();
  const notify = useNotify();
  const [uuid, setUuid] = useState(
    () => user.organizations.find(org => org.primary)?.uuid || user.organizations[0]?.uuid || ''
  );
  const [busy, setBusy] = useState(false);

  const save = event => {
    event.preventDefault();
    setBusy(true);
    updateUser(user.id, { primary_organization: uuid })
      .then(() => {
        notify('success', t('admin.users.primaryOrg.saved'));
        onSaved();
        onClose();
      })
      .catch(error => notify('danger', t(error.messageKey || 'errors.request')))
      .finally(() => setBusy(false));
  };

  return (
    <Modal show onHide={onClose}>
      <form onSubmit={save} noValidate>
        <Modal.Header closeButton>
          <Modal.Title as="h5">{t('admin.users.primaryOrg.title')}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>{t('admin.users.primaryOrg.body', { user: user.username })}</p>
          <label className="form-label" htmlFor="primary-org">
            {t('admin.users.primaryOrg.label')}
          </label>
          <select
            id="primary-org"
            className="form-select"
            value={uuid}
            onChange={event => setUuid(event.target.value)}
          >
            {user.organizations.map(org => (
              <option key={org.uuid} value={org.uuid}>
                {org.name}
              </option>
            ))}
          </select>
        </Modal.Body>
        <DialogFooter
          busy={busy || !uuid}
          label={t('admin.users.primaryOrg.confirm')}
          onClose={onClose}
        />
      </form>
    </Modal>
  );
};

PrimaryOrgDialog.propTypes = {
  user: adminUserShape.isRequired,
  onClose: PropTypes.func.isRequired,
  onSaved: PropTypes.func.isRequired,
};

/**
 * The customer id dialog of a Users row or an organizations row: the six
 * hex characters validated through `useFormRules` against
 * `$defs.orgCode`, an empty value clearing it, one `PATCH` through
 * `save(customerId)`; mounted per record.
 */
export const CustomerIdDialog = ({ title, hint, initial, save, onClose, onSaved }) => {
  const { t } = useTranslation();
  const notify = useNotify();
  const [form, setForm] = useState({ customer_id: initial });
  const [busy, setBusy] = useState(false);
  const rules = useFormRules({
    schema: CUSTOMER_ID_SCHEMA,
    values: form,
    labels: CUSTOMER_ID_LABELS,
    idPrefix: 'customer-id',
  });

  const submit = event => {
    event.preventDefault();
    if (!rules.validateAll()) {
      return;
    }
    setBusy(true);
    save(form.customer_id)
      .then(() => {
        notify('success', t('admin.users.customerId.saved'));
        onSaved();
        onClose();
      })
      .catch(error => {
        if (!rules.applyServerErrors(error)) {
          notify('danger', t(error.messageKey || 'errors.request'));
        }
      })
      .finally(() => setBusy(false));
  };

  return (
    <Modal show onHide={onClose}>
      <form onSubmit={submit} noValidate>
        <Modal.Header closeButton>
          <Modal.Title as="h5">{title}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <FormErrorSummary errors={rules.summary} />
          <Field
            id={rules.idFor('customer_id')}
            label={t('admin.users.customerId.label')}
            hint={hint}
            error={rules.errors.customer_id || ''}
          >
            {aria => (
              <input
                {...aria}
                type="text"
                className="form-control"
                value={form.customer_id}
                onChange={event => setForm({ customer_id: event.target.value.toUpperCase() })}
                onBlur={() => rules.onBlur('customer_id')}
              />
            )}
          </Field>
        </Modal.Body>
        <DialogFooter busy={busy} label={t('admin.buttons.save')} onClose={onClose} />
      </form>
    </Modal>
  );
};

CustomerIdDialog.propTypes = {
  title: PropTypes.string.isRequired,
  hint: PropTypes.string.isRequired,
  initial: PropTypes.string.isRequired,
  save: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
  onSaved: PropTypes.func.isRequired,
};
