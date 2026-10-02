import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { FaPlus, FaTrash } from 'react-icons/fa6';

const ADD_FIELDS = [
  { key: 'special', col: 'col-6 col-md-3', labelKey: 'machineEdit.filesystemsEditor.hostDir' },
  { key: 'dir', col: 'col-6 col-md-3', labelKey: 'machineEdit.filesystemsEditor.mountPoint' },
  {
    key: 'type',
    col: 'col-4 col-md-2',
    labelKey: 'machineEdit.filesystemsEditor.type',
    placeholder: 'lofs',
  },
  {
    key: 'options',
    col: 'col-6 col-md-3',
    labelKey: 'machineEdit.filesystemsEditor.options',
    placeholder: 'e.g. ro',
  },
];

const newRow = () => ({ key: `fs-${Date.now()}`, special: '', dir: '', type: '', options: '' });

/**
 * The host directory mounts of a zone, hyperweaver-ui's filesystems
 * editor: the current mounts each with a mark that removes it, the mounts
 * to add as rows of host directory, mount point, type and options; the
 * marks and the rows ride the modify wire as `remove_filesystems` and
 * `add_filesystems`.
 */
const FilesystemsEditor = ({
  currentFilesystems,
  addFilesystems,
  onAddChange,
  removeFilesystems,
  onRemoveChange,
  disabled = false,
}) => {
  const { t } = useTranslation();
  const setRow = (index, patch) =>
    onAddChange(addFilesystems.map((row, at) => (at === index ? { ...row, ...patch } : row)));

  const toggleRemove = (dir, marked) =>
    onRemoveChange(marked ? [...removeFilesystems, dir] : removeFilesystems.filter(d => d !== dir));

  return (
    <div className="d-flex flex-column gap-2" data-editor="filesystems">
      <p className="form-text text-muted mt-0">
        {t('machineEdit.filesystemsEditor.mountsIntro1')}
        <code>special</code>
        {t('machineEdit.filesystemsEditor.mountsIntro2')} <code>dir</code>
        {t('machineEdit.filesystemsEditor.mountsIntro3')}
      </p>
      {currentFilesystems.length > 0 ? (
        <h6 className="fw-bold">{t('machineEdit.filesystemsEditor.current')}</h6>
      ) : null}
      {currentFilesystems.map(fs => {
        const isMarked = removeFilesystems.includes(fs.dir);
        return (
          <div
            className={`border rounded p-2 ${isMarked ? 'border-danger' : ''}`}
            key={fs.dir}
            data-filesystem={fs.dir}
          >
            <div className="d-flex justify-content-between align-items-center">
              <span className="small">
                <code>{fs.special}</code> → <code>{fs.dir}</code>
                {fs.type ? <span className="text-muted"> ({fs.type})</span> : null}
                {fs.options ? <span className="text-muted"> [{fs.options}]</span> : null}
              </span>
              <div className="form-check">
                <input
                  id={`fs-remove-${fs.dir}`}
                  className="form-check-input"
                  type="checkbox"
                  checked={isMarked}
                  onChange={event => toggleRemove(fs.dir, event.target.checked)}
                  disabled={disabled}
                />
                <label
                  className="form-check-label small text-danger"
                  htmlFor={`fs-remove-${fs.dir}`}
                >
                  {t('machineEdit.filesystemsEditor.remove')}
                </label>
              </div>
            </div>
          </div>
        );
      })}
      <h6 className="fw-bold mt-2">{t('machineEdit.filesystemsEditor.addMount')}</h6>
      {addFilesystems.map((row, index) => (
        <div className="row g-2 align-items-end" key={row.key}>
          {ADD_FIELDS.map(field => (
            <div className={field.col} key={field.key}>
              <label className="form-label small mb-1" htmlFor={`fs-${field.key}-${row.key}`}>
                {t(field.labelKey)}
              </label>
              <input
                id={`fs-${field.key}-${row.key}`}
                className="form-control form-control-sm"
                placeholder={field.placeholder}
                value={row[field.key]}
                onChange={event => setRow(index, { [field.key]: event.target.value })}
                disabled={disabled}
              />
            </div>
          ))}
          <div className="col-auto">
            <button
              type="button"
              className="btn btn-sm btn-outline-danger"
              aria-label={t('machineEdit.filesystemsEditor.removeRow')}
              onClick={() => onAddChange(addFilesystems.filter(entry => entry.key !== row.key))}
              disabled={disabled}
            >
              <FaTrash aria-hidden="true" />
            </button>
          </div>
        </div>
      ))}
      <div>
        <button
          type="button"
          className="btn btn-sm btn-outline-secondary"
          data-action="add-filesystem"
          onClick={() => onAddChange([...addFilesystems, newRow()])}
          disabled={disabled}
        >
          <FaPlus className="me-2" aria-hidden="true" />
          {t('machineEdit.filesystemsEditor.addMount')}
        </button>
      </div>
    </div>
  );
};

FilesystemsEditor.propTypes = {
  currentFilesystems: PropTypes.array.isRequired,
  addFilesystems: PropTypes.array.isRequired,
  onAddChange: PropTypes.func.isRequired,
  removeFilesystems: PropTypes.array.isRequired,
  onRemoveChange: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
};

export default FilesystemsEditor;
