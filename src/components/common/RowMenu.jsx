import PropTypes from 'prop-types';
import { Dropdown } from 'react-bootstrap';

/**
 * A row's More menu: one shared `Dropdown` whose `Dropdown.Menu` opens over
 * the page with `popperConfig={{ strategy: 'fixed' }}`, escaping the table
 * wrap and the page's one scroll region rather than being clipped by
 * either's `overflow`.
 *
 * @param {Object} props
 * @param {import('react').ReactNode} props.label - The toggle's text
 * @param {string} [props.variant] - The toggle's Bootstrap variant
 * @param {string} [props.size] - The toggle's size
 * @param {import('react').ReactNode} props.children - The menu's items
 */
const RowMenu = ({ label, variant = 'outline-secondary', size = 'sm', children }) => (
  <Dropdown align="end">
    <Dropdown.Toggle variant={variant} size={size}>
      {label}
    </Dropdown.Toggle>
    <Dropdown.Menu popperConfig={{ strategy: 'fixed' }}>{children}</Dropdown.Menu>
  </Dropdown>
);

RowMenu.propTypes = {
  label: PropTypes.node.isRequired,
  variant: PropTypes.string,
  size: PropTypes.string,
  children: PropTypes.node.isRequired,
};

export default RowMenu;
