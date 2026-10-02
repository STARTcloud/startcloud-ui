import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { FaChevronDown, FaChevronRight, FaGripVertical, FaXmark } from 'react-icons/fa6';

/**
 * One widget of the dashboard, hyperweaver-ui's shell: a slim title bar
 * with the drag grip, the collapse and the hide over the widget's body;
 * the grip is the HTML5 drag handle and a drop on another widget
 * reorders the layout.
 */
const DashboardWidget = ({
  id,
  title,
  collapsed = false,
  dragging = false,
  onDragStart,
  onDragEnd,
  onDropOn,
  onToggleCollapsed,
  onHide,
  children = null,
}) => {
  const { t } = useTranslation();
  return (
    <div
      className={`mb-3${dragging ? ' opacity-50' : ''}`}
      role="presentation"
      data-widget={id}
      data-collapsed={collapsed}
      onDragOver={event => event.preventDefault()}
      onDrop={event => {
        event.preventDefault();
        onDropOn(id);
      }}
    >
      <div className="d-flex align-items-center gap-2 bg-body-tertiary border rounded-top px-2 py-1">
        <button
          type="button"
          className="btn btn-sm btn-link p-0 text-muted hw-grip"
          draggable
          onDragStart={() => onDragStart(id)}
          onDragEnd={onDragEnd}
          aria-label={title}
          data-tool="grip"
        >
          <FaGripVertical aria-hidden="true" />
        </button>
        <span className="small fw-bold flex-grow-1">{title}</span>
        <button
          type="button"
          className="btn btn-sm btn-link p-0 text-body"
          onClick={() => onToggleCollapsed(id)}
          title={t(collapsed ? 'dashboard.widgets.expand' : 'dashboard.widgets.collapse')}
          data-tool="collapse"
        >
          {collapsed ? <FaChevronRight aria-hidden="true" /> : <FaChevronDown aria-hidden="true" />}
        </button>
        <button
          type="button"
          className="btn btn-sm btn-link p-0 text-body"
          onClick={() => onHide(id)}
          title={t('dashboard.widgets.hide')}
          data-tool="hide"
        >
          <FaXmark aria-hidden="true" />
        </button>
      </div>
      {collapsed ? null : <div className="border border-top-0 rounded-bottom p-2">{children}</div>}
    </div>
  );
};

DashboardWidget.propTypes = {
  id: PropTypes.string.isRequired,
  title: PropTypes.string.isRequired,
  collapsed: PropTypes.bool,
  dragging: PropTypes.bool,
  onDragStart: PropTypes.func.isRequired,
  onDragEnd: PropTypes.func.isRequired,
  onDropOn: PropTypes.func.isRequired,
  onToggleCollapsed: PropTypes.func.isRequired,
  onHide: PropTypes.func.isRequired,
  children: PropTypes.node,
};

export default DashboardWidget;
