import PropTypes from 'prop-types';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaPlus, FaTrash } from 'react-icons/fa6';

import {
  BOOT_ENVIRONMENT_FORM,
  bootEnvironmentCreateBody,
  bootEnvironmentProblem,
} from '../utils/bootEnvironments';

import ToolFormDialog from './ToolFormDialog';

const TextField = ({
  id,
  labelKey,
  value,
  onChange,
  placeholderKey,
  helpKey = '',
  required = false,
}) => {
  const { t } = useTranslation();
  return (
    <div className="mb-3">
      <label className="form-label" htmlFor={id}>
        {t(labelKey)} {required ? <span className="text-danger">*</span> : null}
      </label>
      <input
        id={id}
        className="form-control"
        type="text"
        value={value}
        onChange={event => onChange(event.target.value)}
        placeholder={t(placeholderKey)}
        required={required}
      />
      {helpKey ? <p className="form-text text-muted">{t(helpKey)}</p> : null}
    </div>
  );
};

TextField.propTypes = {
  id: PropTypes.string.isRequired,
  labelKey: PropTypes.string.isRequired,
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  placeholderKey: PropTypes.string.isRequired,
  helpKey: PropTypes.string,
  required: PropTypes.bool,
};

/**
 * Create a boot environment, hyperweaver-ui's dialog over the form
 * dialog of the pages contract: the name and the description, the source
 * environment and snapshot, the activation switch and the pool, and the
 * custom properties as key and value rows; Create sends
 * `POST system/boot-environments` with the body of
 * `bootEnvironmentCreateBody`, held by the name required and valid.
 */
const CreateBEModal = ({ busy, onClose, onConfirm }) => {
  const { t } = useTranslation();
  const [form, setForm] = useState(BOOT_ENVIRONMENT_FORM);
  const [problem, setProblem] = useState('');
  const nextId = useRef(0);
  const set = (field, value) => setForm(current => ({ ...current, [field]: value }));

  const setProperty = (id, member, value) =>
    set(
      'properties',
      form.properties.map(property =>
        property.id === id ? { ...property, [member]: value } : property
      )
    );

  const addProperty = () => {
    const id = nextId.current;
    nextId.current += 1;
    set('properties', [...form.properties, { id, key: '', value: '' }]);
  };

  const submit = () => {
    const why = bootEnvironmentProblem(form);
    setProblem(why);
    if (!why) {
      onConfirm(bootEnvironmentCreateBody(form));
    }
  };

  return (
    <ToolFormDialog
      dialog="boot-environment-create"
      title={t('host.createBEModal.title')}
      submitKey="host.createBEModal.title"
      problemKey={problem}
      variant="success"
      busy={busy}
      onClose={onClose}
      onSubmit={submit}
    >
      <h6 className="fw-bold">{t('host.createBEModal.basicInformation')}</h6>
      <TextField
        id="be-name"
        labelKey="host.createBEModal.nameLabel"
        value={form.name}
        onChange={value => set('name', value)}
        placeholderKey="host.createBEModal.namePlaceholder"
        helpKey="host.createBEModal.nameHelp"
        required
      />
      <div className="mb-3">
        <label className="form-label" htmlFor="be-description">
          {t('host.createBEModal.descriptionLabel')}
        </label>
        <textarea
          id="be-description"
          className="form-control"
          rows="2"
          value={form.description}
          onChange={event => set('description', event.target.value)}
          placeholder={t('host.createBEModal.descriptionPlaceholder')}
        />
      </div>
      <hr />
      <h6 className="fw-bold">{t('host.createBEModal.sourceConfiguration')}</h6>
      <div className="row g-3">
        <div className="col-md-6">
          <TextField
            id="be-source"
            labelKey="host.createBEModal.sourceBELabel"
            value={form.sourceBE}
            onChange={value => set('sourceBE', value)}
            placeholderKey="host.createBEModal.sourceBEPlaceholder"
            helpKey="host.createBEModal.sourceBEHelp"
          />
        </div>
        <div className="col-md-6">
          <TextField
            id="be-snapshot"
            labelKey="host.createBEModal.sourceSnapshotLabel"
            value={form.snapshot}
            onChange={value => set('snapshot', value)}
            placeholderKey="host.createBEModal.sourceSnapshotPlaceholder"
            helpKey="host.createBEModal.sourceSnapshotHelp"
          />
        </div>
      </div>
      <hr />
      <h6 className="fw-bold">{t('host.createBEModal.advancedOptions')}</h6>
      <div className="mb-3">
        <div className="form-check">
          <input
            id="be-activate"
            className="form-check-input"
            type="checkbox"
            checked={form.activate}
            onChange={event => set('activate', event.target.checked)}
          />
          <label className="form-check-label" htmlFor="be-activate">
            <strong>{t('host.createBEModal.activateTitle')}</strong>{' '}
            {t('host.createBEModal.activateHelp')}
          </label>
        </div>
      </div>
      <TextField
        id="be-zpool"
        labelKey="host.createBEModal.zpoolLabel"
        value={form.zpool}
        onChange={value => set('zpool', value)}
        placeholderKey="host.createBEModal.zpoolPlaceholder"
        helpKey="host.createBEModal.zpoolHelp"
      />
      <hr />
      <h6 className="fw-bold">{t('host.createBEModal.customProperties')}</h6>
      {form.properties.map(property => (
        <div key={property.id} className="input-group mb-2" data-property={property.id}>
          <input
            className="form-control"
            type="text"
            aria-label={t('host.createBEModal.propertyNamePlaceholder')}
            placeholder={t('host.createBEModal.propertyNamePlaceholder')}
            value={property.key}
            onChange={event => setProperty(property.id, 'key', event.target.value)}
          />
          <input
            className="form-control"
            type="text"
            aria-label={t('host.createBEModal.propertyValuePlaceholder')}
            placeholder={t('host.createBEModal.propertyValuePlaceholder')}
            value={property.value}
            onChange={event => setProperty(property.id, 'value', event.target.value)}
          />
          <button
            type="button"
            className="btn btn-outline-danger"
            data-action="be-property-remove"
            aria-label={t('host.bootEnvironmentTable.labelDelete')}
            onClick={() =>
              set(
                'properties',
                form.properties.filter(entry => entry.id !== property.id)
              )
            }
          >
            <FaTrash aria-hidden="true" />
          </button>
        </div>
      ))}
      <div>
        <button
          type="button"
          className="btn btn-sm btn-outline-info"
          data-action="be-property-add"
          onClick={addProperty}
        >
          <FaPlus className="me-1" aria-hidden="true" />
          {t('host.createBEModal.addProperty')}
        </button>
        <p className="form-text text-muted">{t('host.createBEModal.customPropertiesHelp')}</p>
      </div>
    </ToolFormDialog>
  );
};

CreateBEModal.propTypes = {
  busy: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onConfirm: PropTypes.func.isRequired,
};

export default CreateBEModal;
