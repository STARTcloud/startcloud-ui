import PropTypes from 'prop-types';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaGripVertical } from 'react-icons/fa6';

const moved = (items, from, to) => {
  if (from === to || from < 0 || to < 0 || to >= items.length) {
    return items;
  }
  const next = [...items];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
};

const SortableRow = ({ item, index, count, keyOf, renderItem, onMove, drag }) => {
  const { t } = useTranslation();
  const key = keyOf(item);
  const onKeyDown = event => {
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      onMove(index, index - 1);
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      onMove(index, index + 1);
    }
  };
  const handle = (
    <button
      type="button"
      className="btn btn-sm btn-link text-body-secondary px-1 draggable-item"
      aria-label={t('sortable.handle', { label: key })}
      title={t('sortable.handle', { label: key })}
      onKeyDown={onKeyDown}
    >
      <FaGripVertical aria-hidden />
      <span className="visually-hidden">{t('sortable.position', { index: index + 1, count })}</span>
    </button>
  );
  return (
    <li
      className={`list-group-item d-flex align-items-center gap-2${drag.from === index ? ' dragging' : ''}`}
      draggable
      onDragStart={() => drag.start(index)}
      onDragOver={event => event.preventDefault()}
      onDrop={() => drag.drop(index)}
      onDragEnd={drag.end}
    >
      {renderItem(item, handle)}
    </li>
  );
};

SortableRow.propTypes = {
  item: PropTypes.object.isRequired,
  index: PropTypes.number.isRequired,
  count: PropTypes.number.isRequired,
  keyOf: PropTypes.func.isRequired,
  renderItem: PropTypes.func.isRequired,
  onMove: PropTypes.func.isRequired,
  drag: PropTypes.shape({
    from: PropTypes.number.isRequired,
    start: PropTypes.func.isRequired,
    drop: PropTypes.func.isRequired,
    end: PropTypes.func.isRequired,
  }).isRequired,
};

/**
 * Drag-to-reorder over a keyed list: every row carries a grip the pointer
 * drags and the arrow keys move, and `onReorder` receives the whole list
 * in its new order after each move; `renderItem(item, handle)` draws the
 * row around the handle it is handed.
 */
const SortableList = ({ items, keyOf, renderItem, onReorder, className = '' }) => {
  const [from, setFrom] = useState(-1);

  const onMove = (source, target) => {
    const next = moved(items, source, target);
    if (next !== items) {
      onReorder(next);
    }
  };

  const drag = {
    from,
    start: index => setFrom(index),
    drop: index => {
      onMove(from, index);
      setFrom(-1);
    },
    end: () => setFrom(-1),
  };

  return (
    <ul className={`list-group ${className}`}>
      {items.map((item, index) => (
        <SortableRow
          key={keyOf(item)}
          item={item}
          index={index}
          count={items.length}
          keyOf={keyOf}
          renderItem={renderItem}
          onMove={onMove}
          drag={drag}
        />
      ))}
    </ul>
  );
};

SortableList.propTypes = {
  items: PropTypes.arrayOf(PropTypes.object).isRequired,
  keyOf: PropTypes.func.isRequired,
  renderItem: PropTypes.func.isRequired,
  onReorder: PropTypes.func.isRequired,
  className: PropTypes.string,
};

export default SortableList;
