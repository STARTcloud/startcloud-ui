import PropTypes from 'prop-types';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import RecordRows from '../../../components/common/RecordRows';
import { editRepositoryBody, editRepositoryFormOf, repositoryType } from '../utils/repositories';

import { RepositoryOptions, RepositorySsl } from './RepositoryFormFields';
import ToolFormDialog from './ToolFormDialog';
import UrlListEditor from './UrlListEditor';

const SCOPE = 'host.editRepositoryModal';

const LISTS = [
  ['originsToAdd', 'addOrigins', 'addOrigin', 'https://pkg.omnios.org/repository/', 'info', false],
  ['originsToRemove', 'removeOrigins', 'removeOrigin', '', 'warning', true],
  [
    'mirrorsToAdd',
    'addMirrors',
    'addMirror',
    'https://mirror.example.com/repository/',
    'info',
    false,
  ],
  ['mirrorsToRemove', 'removeMirrors', 'removeMirror', '', 'warning', true],
];

/**
 * Edit a repository, hyperweaver-ui's dialog over the form dialog of the
 * pages contract: the repository's record, the origins and the mirrors
 * to add and to remove as four lists of URLs, the options with the
 * refresh switch and the SSL configuration; Update sends
 * `PUT system/repositories/{name}` with the body of
 * `editRepositoryBody`.
 */
const EditRepositoryModal = ({ repository, busy, onClose, onConfirm }) => {
  const { t } = useTranslation();
  const [form, setForm] = useState(() => editRepositoryFormOf(repository));
  const nextId = useRef(1);
  const set = (field, value) => setForm(current => ({ ...current, [field]: value }));
  const type = repositoryType(repository.type);

  const setEntry = (list, id, value) =>
    set(
      list,
      form[list].map(entry => (entry.id === id ? { ...entry, value } : entry))
    );

  const addEntry = list => {
    const id = nextId.current;
    nextId.current += 1;
    set(list, [...form[list], { id, value: '' }]);
  };

  const removeEntry = (list, id) => {
    if (form[list].length > 1) {
      set(
        list,
        form[list].filter(entry => entry.id !== id)
      );
    }
  };

  return (
    <ToolFormDialog
      dialog="repository-edit"
      title={t(`${SCOPE}.title`)}
      submitKey={`${SCOPE}.submit`}
      variant="success"
      busy={busy}
      onClose={onClose}
      onSubmit={() => onConfirm(editRepositoryBody(form))}
    >
      <h6 className="fw-bold">{t(`${SCOPE}.currentRepositoryInformation`)}</h6>
      <RecordRows
        rows={[
          {
            key: 'publisher',
            label: t(`${SCOPE}.publisher`),
            value: <code>{repository.name}</code>,
          },
          {
            key: 'type',
            label: t(`${SCOPE}.type`),
            value: (
              <span className={`badge text-bg-${type.tone}`}>
                {type.key ? t(type.key) : type.text}
              </span>
            ),
          },
          {
            key: 'location',
            label: t(`${SCOPE}.currentLocation`),
            value: <code className="small">{repository.location}</code>,
          },
        ]}
      />
      <hr />
      <h6 className="fw-bold">{t(`${SCOPE}.originsManagement`)}</h6>
      <div className="row g-3">
        {LISTS.slice(0, 2).map(([list, labelKey, addKey, placeholder, tone, removes]) => (
          <div key={list} className="col-md-6">
            <UrlListEditor
              id={list}
              label={t(`${SCOPE}.${labelKey}`)}
              entries={form[list]}
              placeholder={placeholder || t(`${SCOPE}.urlToRemove`)}
              onEntryChange={(id, value) => setEntry(list, id, value)}
              onAdd={() => addEntry(list)}
              onRemove={id => removeEntry(list, id)}
              addButtonText={t(`${SCOPE}.${addKey}`)}
              addButtonTone={tone}
              removes={removes}
            />
          </div>
        ))}
      </div>
      <hr />
      <h6 className="fw-bold">{t(`${SCOPE}.mirrorsManagement`)}</h6>
      <div className="row g-3">
        {LISTS.slice(2).map(([list, labelKey, addKey, placeholder, tone, removes]) => (
          <div key={list} className="col-md-6">
            <UrlListEditor
              id={list}
              label={t(`${SCOPE}.${labelKey}`)}
              entries={form[list]}
              placeholder={placeholder || t(`${SCOPE}.urlToRemove`)}
              onEntryChange={(id, value) => setEntry(list, id, value)}
              onAdd={() => addEntry(list)}
              onRemove={id => removeEntry(list, id)}
              addButtonText={t(`${SCOPE}.${addKey}`)}
              addButtonTone={tone}
              removes={removes}
            />
          </div>
        ))}
      </div>
      <hr />
      <RepositoryOptions scope={SCOPE} form={form} set={set} refresh />
      <hr />
      <RepositorySsl scope={SCOPE} form={form} set={set} />
    </ToolFormDialog>
  );
};

EditRepositoryModal.propTypes = {
  repository: PropTypes.shape({
    name: PropTypes.string.isRequired,
    type: PropTypes.string,
    location: PropTypes.string,
  }).isRequired,
  busy: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onConfirm: PropTypes.func.isRequired,
};

export default EditRepositoryModal;
