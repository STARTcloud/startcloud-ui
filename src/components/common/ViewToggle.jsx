import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { FaList, FaTableCellsLarge } from 'react-icons/fa6';

const ViewToggle = ({ view, onChange }) => {
  const { t } = useTranslation();
  const options = [
    { key: 'table', icon: <FaList />, label: t('pages.view.table') },
    { key: 'cards', icon: <FaTableCellsLarge />, label: t('pages.view.cards') },
  ];
  return (
    <div className="btn-group btn-group-sm" role="group" aria-label={t('pages.view.label')}>
      {options.map(option => (
        <button
          key={option.key}
          type="button"
          className={`btn ${view === option.key ? 'btn-secondary' : 'btn-outline-secondary'}`}
          onClick={() => onChange(option.key)}
          title={option.label}
          aria-label={option.label}
          aria-pressed={view === option.key}
        >
          {option.icon}
        </button>
      ))}
    </div>
  );
};

ViewToggle.propTypes = {
  view: PropTypes.oneOf(['table', 'cards']).isRequired,
  onChange: PropTypes.func.isRequired,
};

export default ViewToggle;
