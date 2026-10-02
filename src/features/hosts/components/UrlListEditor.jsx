import PropTypes from 'prop-types';
import { FaMinus, FaPlus, FaTrash } from 'react-icons/fa6';

/**
 * One list of URLs of the edit repository dialog, hyperweaver-ui's: the
 * label, one input a row with its remove button, held while the row is
 * the last, and the add button under them.
 */
const UrlListEditor = ({
  id,
  label,
  entries,
  placeholder,
  onEntryChange,
  onAdd,
  onRemove,
  addButtonText,
  addButtonTone,
  removes = false,
}) => {
  const AddIcon = removes ? FaMinus : FaPlus;
  return (
    <div data-list={id}>
      <span className="form-label">{label}</span>
      {entries.map(entry => (
        <div key={entry.id} className="input-group mb-2">
          <input
            id={`${id}-${entry.id}`}
            className="form-control"
            type="url"
            aria-label={label}
            placeholder={placeholder}
            value={entry.value}
            onChange={event => onEntryChange(entry.id, event.target.value)}
          />
          <button
            type="button"
            className="btn btn-outline-danger"
            aria-label={`${label} ${entry.id}`}
            onClick={() => onRemove(entry.id)}
            disabled={entries.length === 1}
          >
            <FaTrash aria-hidden="true" />
          </button>
        </div>
      ))}
      <button
        type="button"
        className={`btn btn-sm btn-outline-${addButtonTone}`}
        data-action={`${id}-add`}
        onClick={onAdd}
      >
        <AddIcon className="me-1" aria-hidden="true" />
        {addButtonText}
      </button>
    </div>
  );
};

UrlListEditor.propTypes = {
  id: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired,
  entries: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.number.isRequired,
      value: PropTypes.string.isRequired,
    })
  ).isRequired,
  placeholder: PropTypes.string.isRequired,
  onEntryChange: PropTypes.func.isRequired,
  onAdd: PropTypes.func.isRequired,
  onRemove: PropTypes.func.isRequired,
  addButtonText: PropTypes.string.isRequired,
  addButtonTone: PropTypes.string.isRequired,
  removes: PropTypes.bool,
};

export default UrlListEditor;
