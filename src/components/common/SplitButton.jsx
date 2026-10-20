import PropTypes from 'prop-types';
import { Dropdown } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';

/**
 * A split button of a heading pane or a dialog footer: the primary press,
 * `labelKey` its words, or its glyph alone with the words as its tooltip
 * and accessible name while `glyph` is set, and the toggle that opens the
 * menu of the other choices, each `{ action, labelKey, onClick, disabled,
 * tool }` drawn as a menu item carrying its `action` as `data-action`; the
 * toggle carries `menuAction` and every press is held while `busy`. A
 * pane whose controls are told by `data-tool` hands `tool` for the
 * primary, `menuTool` for the toggle and `tool` on each item.
 */
const SplitButton = ({
  action,
  labelKey,
  onClick,
  items,
  menuAction,
  menuLabelKey,
  icon: Icon = null,
  glyph = false,
  variant = 'primary',
  busy = false,
  tool = undefined,
  menuTool = undefined,
}) => {
  const { t } = useTranslation();
  const label = t(labelKey);
  return (
    <Dropdown as="div" className="btn-group" align="end">
      <button
        type="button"
        className={`btn btn-sm btn-${variant}`}
        data-action={action}
        data-tool={tool}
        title={glyph ? label : undefined}
        aria-label={glyph ? label : undefined}
        onClick={onClick}
        disabled={busy}
      >
        {Icon ? <Icon className={glyph ? '' : 'me-1'} aria-hidden="true" /> : null}
        {glyph ? null : label}
      </button>
      <Dropdown.Toggle
        split
        size="sm"
        variant={variant}
        data-action={menuAction}
        data-tool={menuTool}
        aria-label={t(menuLabelKey)}
        title={t(menuLabelKey)}
        disabled={busy}
      />
      <Dropdown.Menu>
        {items.map(item => (
          <Dropdown.Item
            key={item.action}
            as="button"
            type="button"
            data-action={item.action}
            data-tool={item.tool}
            onClick={item.onClick}
            disabled={busy || Boolean(item.disabled)}
          >
            {t(item.labelKey)}
          </Dropdown.Item>
        ))}
      </Dropdown.Menu>
    </Dropdown>
  );
};

SplitButton.propTypes = {
  action: PropTypes.string.isRequired,
  labelKey: PropTypes.string.isRequired,
  onClick: PropTypes.func.isRequired,
  items: PropTypes.arrayOf(
    PropTypes.shape({
      action: PropTypes.string.isRequired,
      labelKey: PropTypes.string.isRequired,
      onClick: PropTypes.func.isRequired,
      disabled: PropTypes.bool,
      tool: PropTypes.string,
    })
  ).isRequired,
  menuAction: PropTypes.string.isRequired,
  menuLabelKey: PropTypes.string.isRequired,
  icon: PropTypes.elementType,
  glyph: PropTypes.bool,
  variant: PropTypes.string,
  busy: PropTypes.bool,
  tool: PropTypes.string,
  menuTool: PropTypes.string,
};

export default SplitButton;
