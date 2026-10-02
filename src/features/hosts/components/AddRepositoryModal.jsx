import PropTypes from 'prop-types';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaPlus, FaTrash } from 'react-icons/fa6';

import {
  ADD_REPOSITORY_FORM,
  addRepositoryBody,
  addRepositoryProblem,
} from '../utils/repositories';

import { RepositoryOptions, RepositorySsl } from './RepositoryFormFields';
import ToolFormDialog from './ToolFormDialog';

const SCOPE = 'host.addRepositoryModal';

/**
 * Add a repository, hyperweaver-ui's dialog over the form dialog of the
 * pages contract: the publisher and the origin, the mirrors as a list of
 * URLs, the options and the SSL configuration; Add sends
 * `POST system/repositories` with the body of `addRepositoryBody`, held
 * by the name and the origin required.
 */
const AddRepositoryModal = ({ busy, onClose, onConfirm }) => {
  const { t } = useTranslation();
  const [form, setForm] = useState(ADD_REPOSITORY_FORM);
  const [problem, setProblem] = useState('');
  const nextId = useRef(1);
  const set = (field, value) => setForm(current => ({ ...current, [field]: value }));

  const setMirror = (id, url) =>
    set(
      'mirrors',
      form.mirrors.map(mirror => (mirror.id === id ? { ...mirror, url } : mirror))
    );

  const addMirror = () => {
    const id = nextId.current;
    nextId.current += 1;
    set('mirrors', [...form.mirrors, { id, url: '' }]);
  };

  const submit = () => {
    const why = addRepositoryProblem(form);
    setProblem(why);
    if (!why) {
      onConfirm(addRepositoryBody(form));
    }
  };

  return (
    <ToolFormDialog
      dialog="repository-add"
      title={t(`${SCOPE}.title`)}
      submitKey={`${SCOPE}.title`}
      problemKey={problem}
      variant="success"
      busy={busy}
      onClose={onClose}
      onSubmit={submit}
    >
      <h6 className="fw-bold">{t(`${SCOPE}.basicInformation`)}</h6>
      <div className="mb-3">
        <label className="form-label" htmlFor="repo-publisher-name">
          {t(`${SCOPE}.publisherNameLabel`)} <span className="text-danger">*</span>
        </label>
        <input
          id="repo-publisher-name"
          className="form-control"
          type="text"
          placeholder="e.g., omnios, extra.omnios"
          value={form.name}
          onChange={event => set('name', event.target.value)}
          required
        />
        <p className="form-text text-muted">{t(`${SCOPE}.publisherNameHelp`)}</p>
      </div>
      <div className="mb-3">
        <label className="form-label" htmlFor="repo-origin-url">
          {t(`${SCOPE}.originUrlLabel`)} <span className="text-danger">*</span>
        </label>
        <input
          id="repo-origin-url"
          className="form-control"
          type="url"
          placeholder="https://pkg.omnios.org/r151050/core/"
          value={form.origin}
          onChange={event => set('origin', event.target.value)}
          required
        />
        <p className="form-text text-muted">{t(`${SCOPE}.originUrlHelp`)}</p>
      </div>
      <hr />
      <h6 className="fw-bold">{t(`${SCOPE}.mirrorUrls`)}</h6>
      {form.mirrors.map(mirror => (
        <div key={mirror.id} className="input-group mb-2" data-mirror={mirror.id}>
          <input
            id={`repo-mirror-${mirror.id}`}
            className="form-control"
            type="url"
            aria-label={t(`${SCOPE}.mirrorUrls`)}
            placeholder="https://mirror.example.com/repository/"
            value={mirror.url}
            onChange={event => setMirror(mirror.id, event.target.value)}
          />
          <button
            type="button"
            className="btn btn-outline-danger"
            aria-label={`${t(`${SCOPE}.mirrorUrls`)} ${mirror.id}`}
            onClick={() =>
              set(
                'mirrors',
                form.mirrors.filter(entry => entry.id !== mirror.id)
              )
            }
            disabled={form.mirrors.length === 1}
          >
            <FaTrash aria-hidden="true" />
          </button>
        </div>
      ))}
      <div>
        <button
          type="button"
          className="btn btn-sm btn-outline-info"
          data-action="repository-mirror-add"
          onClick={addMirror}
        >
          <FaPlus className="me-1" aria-hidden="true" />
          {t(`${SCOPE}.addMirror`)}
        </button>
      </div>
      <hr />
      <RepositoryOptions scope={SCOPE} form={form} set={set} />
      <hr />
      <RepositorySsl scope={SCOPE} form={form} set={set} />
    </ToolFormDialog>
  );
};

AddRepositoryModal.propTypes = {
  busy: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onConfirm: PropTypes.func.isRequired,
};

export default AddRepositoryModal;
