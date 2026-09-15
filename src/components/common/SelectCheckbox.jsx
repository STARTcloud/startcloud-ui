import PropTypes from 'prop-types';
import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

export const selectionShape = PropTypes.shape({
  allSelected: PropTypes.bool.isRequired,
  someSelected: PropTypes.bool.isRequired,
  onToggleAll: PropTypes.func.isRequired,
  isSelected: PropTypes.func.isRequired,
  onToggleRow: PropTypes.func.isRequired,
  labelOf: PropTypes.func,
});

/**
 * The select-all checkbox of a table's select column header or a card
 * list's heading: a real checkbox, checked, unchecked or indeterminate,
 * never an icon glyph and never a button beside it saying the same thing.
 */
export const SelectAllCheckbox = ({ selection }) => {
  const { t } = useTranslation();
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current) {
      ref.current.indeterminate = selection.someSelected && !selection.allSelected;
    }
  }, [selection]);
  return (
    <input
      ref={ref}
      type="checkbox"
      className="form-check-input"
      checked={selection.allSelected}
      onChange={selection.onToggleAll}
      aria-label={t('pages.selectColumn')}
    />
  );
};

SelectAllCheckbox.propTypes = {
  selection: selectionShape.isRequired,
};

/**
 * One row's checkbox, the cell of the select column and the card's own
 * picker.
 */
export const RowCheckbox = ({ selection, row }) => (
  <input
    type="checkbox"
    className="form-check-input"
    checked={selection.isSelected(row)}
    onChange={() => selection.onToggleRow(row)}
    aria-label={selection.labelOf ? selection.labelOf(row) : undefined}
  />
);

RowCheckbox.propTypes = {
  selection: selectionShape.isRequired,
  row: PropTypes.object.isRequired,
};
