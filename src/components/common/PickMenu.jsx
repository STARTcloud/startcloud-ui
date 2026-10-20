import PropTypes from 'prop-types';
import { useState } from 'react';
import { Dropdown } from 'react-bootstrap';

const FIXED = { strategy: 'fixed' };

/**
 * The trailing button of a pick-or-type input and its menu, drawn inside
 * a react-bootstrap `InputGroup` after the input it fills, the input
 * staying free to type: the toggle carries `action` as `data-action` and
 * `label` as its tooltip and accessible name, and is drawn always, held
 * while `disabled` or while `rows` is empty; the menu carries `list` as
 * `data-list` and draws one row a `{ value, label, source }` in the order
 * given, the value with its label muted beside it, each row carrying
 * `data-source` and `data-value`. A row's press closes the menu and hands
 * its value to `onPick`. Returns the toggle and the menu.
 */
const PickMenu = ({ rows, onPick, action, label, list, disabled = false }) => {
  const [show, setShow] = useState(false);
  return (
    <Dropdown align="end" show={show} onToggle={setShow}>
      <Dropdown.Toggle
        variant="outline-secondary"
        data-action={action}
        title={label}
        aria-label={label}
        disabled={disabled || rows.length === 0}
      />
      <Dropdown.Menu data-list={list} popperConfig={FIXED}>
        {rows.map(row => (
          <Dropdown.Item
            key={`${row.source}:${row.value}`}
            as="button"
            type="button"
            className="d-flex align-items-center"
            data-source={row.source}
            data-value={row.value}
            onClick={() => {
              setShow(false);
              onPick(row.value);
            }}
          >
            <span className="flex-grow-1">{row.value}</span>
            <span className="text-muted small ms-3">{row.label}</span>
          </Dropdown.Item>
        ))}
      </Dropdown.Menu>
    </Dropdown>
  );
};

PickMenu.propTypes = {
  rows: PropTypes.arrayOf(
    PropTypes.shape({
      value: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
      source: PropTypes.string.isRequired,
    })
  ).isRequired,
  onPick: PropTypes.func.isRequired,
  action: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired,
  list: PropTypes.string.isRequired,
  disabled: PropTypes.bool,
};

export default PickMenu;
