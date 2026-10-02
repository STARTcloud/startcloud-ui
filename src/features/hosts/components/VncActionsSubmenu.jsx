import PropTypes from 'prop-types';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  FaArrowUpRightFromSquare,
  FaCamera,
  FaChevronRight,
  FaExpand,
  FaEye,
  FaPaste,
  FaPenToSquare,
  FaScrewdriverWrench,
} from 'react-icons/fa6';

import { log } from '../../../lib/logger';
import { captureFileName, saveBlob } from '../utils/consoles';

const onEnter = callback => event => {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    callback();
  }
};

const Row = ({ icon: Icon, label, title = undefined, action, onClick }) => (
  <div
    className="dropdown-item"
    onClick={onClick}
    onKeyDown={onEnter(onClick)}
    role="button"
    tabIndex={0}
    title={title}
    data-action={action}
  >
    <Icon className="me-2" aria-hidden="true" />
    <span>{label}</span>
  </div>
);

Row.propTypes = {
  icon: PropTypes.elementType.isRequired,
  label: PropTypes.string.isRequired,
  title: PropTypes.string,
  action: PropTypes.string.isRequired,
  onClick: PropTypes.func.isRequired,
};

/**
 * The Actions submenu of the VNC actions menu: for an admin the switch
 * between read-only and interactive, Paste from clipboard, which reads
 * the browser's clipboard and types it into the session, Take screenshot,
 * the viewer's canvas saved as a PNG, and Full screen and Open in new tab
 * where the console offers them.
 */
const VncActionsSubmenu = ({
  vncRef,
  isAdmin,
  isReadOnly,
  onToggleReadOnly = null,
  onClipboardPaste = null,
  onScreenshot = null,
  onFullScreen = null,
  onNewTab = null,
  calculateSubmenuPosition,
  onClose,
}) => {
  const { t } = useTranslation();
  const [showActions, setShowActions] = useState(false);

  const handleScreenshot = () => {
    if (onScreenshot) {
      onScreenshot();
    } else {
      const canvas = vncRef?.current?.getCanvas?.();
      canvas?.toBlob(blob => saveBlob(blob, captureFileName('vnc-screenshot', 'console', 'png')));
    }
    onClose();
  };

  const handlePaste = async () => {
    try {
      if (navigator.clipboard?.readText) {
        const text = await navigator.clipboard.readText();
        if (text) {
          if (vncRef?.current?.clipboardPaste) {
            vncRef.current.clipboardPaste(text);
          } else {
            onClipboardPaste?.(text);
          }
        }
      }
    } catch (error) {
      log.component.warn('Error reading the clipboard', { error: error.message });
    }
    onClose();
  };

  const after = callback => () => {
    callback();
    onClose();
  };

  return (
    <div
      className="dropdown-item position-relative d-flex justify-content-between align-items-center"
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
      role="button"
      tabIndex={0}
      aria-haspopup="true"
      aria-expanded={showActions}
      data-submenu="actions"
    >
      <div className="d-flex align-items-center">
        <FaScrewdriverWrench className="me-2" aria-hidden="true" />
        <span>{t('console.vncActionsSubmenu.actions')}</span>
      </div>
      <FaChevronRight aria-hidden="true" />
      {showActions ? (
        <div className={`dropdown-menu show ${calculateSubmenuPosition(300)}`}>
          <div>
            {isAdmin && onToggleReadOnly ? (
              <>
                <Row
                  icon={isReadOnly ? FaPenToSquare : FaEye}
                  label={
                    isReadOnly
                      ? t('console.vncActionsSubmenu.enableInteractive')
                      : t('console.vncActionsSubmenu.setReadOnly')
                  }
                  title={
                    isReadOnly
                      ? t('console.vncActionsSubmenu.enableInteractiveTitle')
                      : t('console.vncActionsSubmenu.enableReadOnlyTitle')
                  }
                  action="vnc-toggle-read-only"
                  onClick={after(onToggleReadOnly)}
                />
                <hr className="dropdown-divider" />
              </>
            ) : null}
            {onClipboardPaste || vncRef ? (
              <>
                <Row
                  icon={FaPaste}
                  label={t('console.vncActionsSubmenu.pasteFromClipboard')}
                  action="vnc-paste"
                  onClick={handlePaste}
                />
                <hr className="dropdown-divider" />
              </>
            ) : null}
            <Row
              icon={FaCamera}
              label={t('console.vncActionsSubmenu.takeScreenshot')}
              action="vnc-screenshot"
              onClick={handleScreenshot}
            />
            {onFullScreen ? (
              <Row
                icon={FaExpand}
                label={t('console.vncActionsSubmenu.fullScreen')}
                action="vnc-full-screen"
                onClick={after(onFullScreen)}
              />
            ) : null}
            {onNewTab ? (
              <Row
                icon={FaArrowUpRightFromSquare}
                label={t('console.vncActionsSubmenu.openInNewTab')}
                action="vnc-new-tab"
                onClick={after(onNewTab)}
              />
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
};

VncActionsSubmenu.propTypes = {
  vncRef: PropTypes.object,
  isAdmin: PropTypes.bool.isRequired,
  isReadOnly: PropTypes.bool.isRequired,
  onToggleReadOnly: PropTypes.func,
  onClipboardPaste: PropTypes.func,
  onScreenshot: PropTypes.func,
  onFullScreen: PropTypes.func,
  onNewTab: PropTypes.func,
  calculateSubmenuPosition: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
};

export default VncActionsSubmenu;
