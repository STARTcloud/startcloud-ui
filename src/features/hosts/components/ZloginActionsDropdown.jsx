import PropTypes from 'prop-types';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  FaAngleDown,
  FaCamera,
  FaEllipsisVertical,
  FaEye,
  FaPenToSquare,
  FaScrewdriverWrench,
  FaSkull,
} from 'react-icons/fa6';

/**
 * The zlogin actions menu, hyperweaver-ui's dropdown over the zone's
 * terminal, the VNC menu's shape: for an admin the switch between
 * read-only and interactive, Capture output, the terminal's text saved
 * as a file, and Kill session where the console offers it; opened by the
 * ellipsis button, or by the zlogin actions text in its default variant,
 * and closed by a click elsewhere.
 */
const ZloginActionsDropdown = ({
  variant = 'dropdown',
  onToggleReadOnly = null,
  onKillSession = null,
  onScreenshot = null,
  isReadOnly = true,
  isAdmin = false,
  disabled = false,
  className = '',
}) => {
  const { t } = useTranslation();
  const [isActive, setIsActive] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = event => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsActive(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleAction = action => {
    setIsActive(false);
    action();
  };

  const dropdownContent = (
    <div>
      {isAdmin && onToggleReadOnly ? (
        <>
          <button
            type="button"
            className="dropdown-item"
            data-action="zlogin-toggle-read-only"
            onClick={() => handleAction(onToggleReadOnly)}
            title={
              isReadOnly
                ? t('console.zloginActionsDropdown.enableInteractiveMode')
                : t('console.zloginActionsDropdown.enableReadOnlyMode')
            }
          >
            {isReadOnly ? (
              <FaPenToSquare className="me-2" aria-hidden="true" />
            ) : (
              <FaEye className="me-2" aria-hidden="true" />
            )}
            <span>
              {isReadOnly
                ? t('console.zloginActionsDropdown.enableInteractive')
                : t('console.zloginActionsDropdown.setReadOnly')}
            </span>
          </button>
          <hr className="dropdown-divider" />
        </>
      ) : null}
      <div className="dropdown-item fw-semibold text-secondary">
        <FaScrewdriverWrench className="me-2" aria-hidden="true" />
        <span>{t('console.zloginActionsDropdown.actions')}</span>
      </div>
      <hr className="dropdown-divider" />
      {onScreenshot ? (
        <button
          type="button"
          className="dropdown-item"
          data-action="zlogin-capture"
          onClick={() => handleAction(onScreenshot)}
          title={t('console.zloginActionsDropdown.captureOutputHint')}
        >
          <FaCamera className="me-2" aria-hidden="true" />
          <span>{t('console.zloginActionsDropdown.captureOutput')}</span>
        </button>
      ) : null}
      {onKillSession ? (
        <>
          <hr className="dropdown-divider" />
          <button
            type="button"
            className="dropdown-item text-danger"
            data-action="zlogin-kill"
            onClick={() => handleAction(onKillSession)}
            title={t('console.zloginActionsDropdown.terminateSession')}
          >
            <FaSkull className="me-2" aria-hidden="true" />
            <span>{t('console.zloginActionsDropdown.killSession')}</span>
          </button>
        </>
      ) : null}
    </div>
  );

  const menu = (
    <div
      className={`dropdown-menu dropdown-menu-end hw-console-menu ${isActive ? 'show' : ''}`}
      id="zlogin-dropdown-menu"
      role="menu"
    >
      {dropdownContent}
    </div>
  );

  if (variant === 'button') {
    return (
      <div className={`dropdown ${className}`} ref={dropdownRef} data-menu="zlogin-actions">
        <button
          type="button"
          className="btn btn-sm btn-light"
          aria-haspopup="true"
          aria-controls="zlogin-dropdown-menu"
          onClick={() => setIsActive(!isActive)}
          disabled={disabled}
          title={t('console.zloginActionsDropdown.consoleActions')}
          aria-label={t('console.zloginActionsDropdown.consoleActions')}
        >
          <FaEllipsisVertical aria-hidden="true" />
        </button>
        {menu}
      </div>
    );
  }

  return (
    <div className={`dropdown ${className}`} ref={dropdownRef} data-menu="zlogin-actions">
      <span
        className="text-primary small cursor-pointer"
        aria-haspopup="true"
        aria-controls="zlogin-dropdown-menu"
        onClick={() => !disabled && setIsActive(!isActive)}
        onKeyDown={event => {
          if (!disabled && (event.key === 'Enter' || event.key === ' ')) {
            event.preventDefault();
            setIsActive(!isActive);
          }
        }}
        role="button"
        tabIndex={disabled ? -1 : 0}
      >
        {t('console.zloginActionsDropdown.zloginActions')}
        <FaAngleDown className="ms-1" aria-hidden="true" />
      </span>
      {menu}
    </div>
  );
};

ZloginActionsDropdown.propTypes = {
  variant: PropTypes.string,
  onToggleReadOnly: PropTypes.func,
  onKillSession: PropTypes.func,
  onScreenshot: PropTypes.func,
  isReadOnly: PropTypes.bool,
  isAdmin: PropTypes.bool,
  disabled: PropTypes.bool,
  className: PropTypes.string,
};

export default ZloginActionsDropdown;
