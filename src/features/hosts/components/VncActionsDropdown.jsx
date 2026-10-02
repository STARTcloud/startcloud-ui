import PropTypes from 'prop-types';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaAngleDown, FaEllipsisVertical, FaSkull } from 'react-icons/fa6';

import VncActionsSubmenu from './VncActionsSubmenu';
import VncDisplaySettingsSubmenu from './VncDisplaySettingsSubmenu';
import VncKeyboardSubmenu from './VncKeyboardSubmenu';

const SUBMENU_MARGIN = 40;

const NO_MODIFIERS = { ctrl: false, alt: false, shift: false };

const onEnter = callback => event => {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    callback();
  }
};

const KillRow = ({ onKillSession = null, onClose }) => {
  const { t } = useTranslation();
  if (!onKillSession) {
    return null;
  }
  const kill = () => {
    onKillSession();
    onClose();
  };
  return (
    <>
      <hr className="dropdown-divider" />
      <div
        className="dropdown-item text-danger"
        onClick={kill}
        onKeyDown={onEnter(kill)}
        role="button"
        tabIndex={0}
        data-action="vnc-kill"
      >
        <FaSkull className="me-2" aria-hidden="true" />
        <span>{t('console.vncActionsDropdown.killSession')}</span>
      </div>
    </>
  );
};

KillRow.propTypes = {
  onKillSession: PropTypes.func,
  onClose: PropTypes.func.isRequired,
};

const MenuFrame = ({ isActive, children }) => (
  <div
    className={`dropdown-menu dropdown-menu-end hw-console-menu ${isActive ? 'show' : ''}`}
    id="vnc-dropdown-menu"
    role="menu"
  >
    {children}
  </div>
);

MenuFrame.propTypes = {
  isActive: PropTypes.bool.isRequired,
  children: PropTypes.node.isRequired,
};

/**
 * The VNC actions menu, hyperweaver-ui's hand-rolled dropdown over the
 * viewer: the Keyboard input, Display settings and Actions submenus and,
 * where the console offers it, Kill session; opened by the ellipsis
 * button, or by the VNC actions text in its default variant, and closed
 * by a click elsewhere. A submenu opens to the right of the menu, or to
 * the left when the console's container leaves no room there.
 */
const VncActionsDropdown = ({
  vncRef,
  onScreenshot = null,
  onFullScreen = null,
  onNewTab = null,
  onKillSession = null,
  onToggleReadOnly = null,
  isReadOnly,
  isAdmin = false,
  className = '',
  variant = 'default',
  quality = 6,
  compression = 2,
  resize = 'scale',
  showDot = true,
  onQualityChange = null,
  onCompressionChange = null,
  onResizeChange = null,
  onShowDotChange = null,
  onClipboardPaste = null,
}) => {
  const { t } = useTranslation();
  const [isActive, setIsActive] = useState(false);
  const [modifierKeys, setModifierKeys] = useState(NO_MODIFIERS);
  const dropdownRef = useRef(null);

  const calculateSubmenuPosition = (submenuWidth = 300) => {
    if (!dropdownRef.current) {
      return 'hw-dropdown-submenu-right';
    }
    const dropdownRect = dropdownRef.current.getBoundingClientRect();
    const containerRect =
      dropdownRef.current.closest('.hw-console-container')?.getBoundingClientRect() ||
      document.body.getBoundingClientRect();
    const rightSpace = Math.min(
      window.innerWidth - dropdownRect.right,
      containerRect.right - dropdownRect.right
    );
    return rightSpace < submenuWidth + SUBMENU_MARGIN
      ? 'hw-dropdown-submenu-left'
      : 'hw-dropdown-submenu-right';
  };

  useEffect(() => {
    const handleClickOutside = event => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsActive(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const close = () => setIsActive(false);

  const toggle = () => setIsActive(!isActive);

  const handleCtrlAltDel = () => {
    if (vncRef?.current?.sendCtrlAltDel) {
      vncRef.current.sendCtrlAltDel();
      close();
    }
  };

  const menu = (
    <MenuFrame isActive={isActive}>
      <div className="hw-dropdown-content">
        <VncKeyboardSubmenu
          vncRef={vncRef}
          modifierKeys={modifierKeys}
          setModifierKeys={setModifierKeys}
          calculateSubmenuPosition={calculateSubmenuPosition}
          onClose={close}
          handleCtrlAltDel={handleCtrlAltDel}
        />
        <VncDisplaySettingsSubmenu
          quality={quality}
          compression={compression}
          resize={resize}
          showDot={showDot}
          onQualityChange={onQualityChange}
          onCompressionChange={onCompressionChange}
          onResizeChange={onResizeChange}
          onShowDotChange={onShowDotChange}
          calculateSubmenuPosition={calculateSubmenuPosition}
        />
        <VncActionsSubmenu
          vncRef={vncRef}
          isAdmin={isAdmin}
          isReadOnly={isReadOnly}
          onToggleReadOnly={onToggleReadOnly}
          onClipboardPaste={onClipboardPaste}
          onScreenshot={onScreenshot}
          onFullScreen={onFullScreen}
          onNewTab={onNewTab}
          calculateSubmenuPosition={calculateSubmenuPosition}
          onClose={close}
        />
        <KillRow onKillSession={onKillSession} onClose={close} />
      </div>
    </MenuFrame>
  );

  if (variant === 'button') {
    return (
      <div className={`dropdown ${className}`} ref={dropdownRef} data-menu="vnc-actions">
        <button
          type="button"
          className="btn btn-sm btn-light"
          aria-haspopup="true"
          aria-controls="vnc-dropdown-menu"
          aria-label={t('console.vncActionsDropdown.vncActions')}
          title={t('console.vncActionsDropdown.vncActions')}
          onClick={toggle}
        >
          <FaEllipsisVertical aria-hidden="true" />
        </button>
        {menu}
      </div>
    );
  }

  return (
    <div className={`dropdown ${className}`} ref={dropdownRef} data-menu="vnc-actions">
      <span
        className="text-primary small cursor-pointer"
        aria-haspopup="true"
        aria-controls="vnc-dropdown-menu"
        onClick={toggle}
        onKeyDown={onEnter(toggle)}
        role="button"
        tabIndex={0}
      >
        {t('console.vncActionsDropdown.vncActions')}
        <FaAngleDown className="ms-1" aria-hidden="true" />
      </span>
      {menu}
    </div>
  );
};

VncActionsDropdown.propTypes = {
  vncRef: PropTypes.object,
  onScreenshot: PropTypes.func,
  onFullScreen: PropTypes.func,
  onNewTab: PropTypes.func,
  onKillSession: PropTypes.func,
  onToggleReadOnly: PropTypes.func,
  isReadOnly: PropTypes.bool.isRequired,
  isAdmin: PropTypes.bool,
  className: PropTypes.string,
  variant: PropTypes.string,
  quality: PropTypes.number,
  compression: PropTypes.number,
  resize: PropTypes.string,
  showDot: PropTypes.bool,
  onQualityChange: PropTypes.func,
  onCompressionChange: PropTypes.func,
  onResizeChange: PropTypes.func,
  onShowDotChange: PropTypes.func,
  onClipboardPaste: PropTypes.func,
};

export default VncActionsDropdown;
