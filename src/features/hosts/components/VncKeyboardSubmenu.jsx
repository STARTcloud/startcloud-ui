import PropTypes from 'prop-types';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  FaChevronRight,
  FaHand,
  FaKeyboard,
  FaPowerOff,
  FaToggleOff,
  FaToggleOn,
  FaWindowRestore,
  FaXmark,
} from 'react-icons/fa6';

import { keyString, keysymMap, sendKeyWithModifiers } from '../utils/vncKeyUtils';

const MODIFIERS = ['ctrl', 'alt', 'shift'];

const FUNCTION_KEYS = [...Array(12).keys()].map(index => index + 1);

const MODIFIER_TONES = { ctrl: 'btn-primary', alt: 'btn-warning', shift: 'btn-info' };

const onEnter = callback => event => {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    callback();
  }
};

const MenuRow = ({ icon: Icon, labelKey, onClick }) => {
  const { t } = useTranslation();
  return (
    <div
      className="dropdown-item"
      onClick={onClick}
      onKeyDown={onEnter(onClick)}
      role="button"
      tabIndex={0}
    >
      <Icon className="me-2" aria-hidden="true" />
      <span>{t(labelKey)}</span>
    </div>
  );
};

MenuRow.propTypes = {
  icon: PropTypes.elementType.isRequired,
  labelKey: PropTypes.string.isRequired,
  onClick: PropTypes.func.isRequired,
};

const FunctionKeyRow = ({ keyCode, title, onSend }) => (
  <div
    className="dropdown-item"
    onClick={onSend}
    onKeyDown={onEnter(onSend)}
    role="button"
    tabIndex={0}
    title={title}
  >
    <FaKeyboard className="me-2" aria-hidden="true" />
    <span>{keyCode}</span>
  </div>
);

FunctionKeyRow.propTypes = {
  keyCode: PropTypes.string.isRequired,
  title: PropTypes.string.isRequired,
  onSend: PropTypes.func.isRequired,
};

/**
 * The Keyboard input submenu of the VNC actions menu: the common
 * shortcuts, Ctrl+Alt+Del, Alt+Tab and Alt+F4, the three modifier
 * toggles held for the next key, and the function keys F1 to F12, each
 * sent with the modifiers held through `sendKeyWithModifiers`.
 */
const VncKeyboardSubmenu = ({
  vncRef,
  modifierKeys,
  setModifierKeys,
  calculateSubmenuPosition,
  onClose,
  handleCtrlAltDel,
}) => {
  const { t } = useTranslation();
  const [showFunctionKeys, setShowFunctionKeys] = useState(false);
  const [showKeyboardInput, setShowKeyboardInput] = useState(false);
  const anyModifier = MODIFIERS.some(modifier => modifierKeys[modifier]);

  const toggleModifier = key => setModifierKeys(prev => ({ ...prev, [key]: !prev[key] }));

  const sendShortcut = (keyCode, keysym, withModifiers = true) => {
    if (!vncRef?.current?.sendKey) {
      return;
    }
    const held = withModifiers ? MODIFIERS.filter(modifier => modifierKeys[modifier]) : [];
    if (sendKeyWithModifiers(vncRef.current, keysym, keyCode, held)) {
      onClose();
    }
  };

  return (
    <div
      className="dropdown-item position-relative d-flex justify-content-between align-items-center"
      onMouseEnter={() => setShowKeyboardInput(true)}
      onMouseLeave={() => setShowKeyboardInput(false)}
      role="button"
      tabIndex={0}
      data-submenu="keyboard"
    >
      <div className="d-flex align-items-center">
        <FaKeyboard className="me-2" aria-hidden="true" />
        <span>{t('console.vncKeyboardSubmenu.keyboardInput')}</span>
      </div>
      <FaChevronRight aria-hidden="true" />
      {showKeyboardInput ? (
        <div
          className={`dropdown-menu show has-z-index-modal-high ${calculateSubmenuPosition(350)}`}
        >
          <div>
            <div className="dropdown-item fw-semibold text-secondary">
              <FaKeyboard className="me-2" aria-hidden="true" />
              <span>{t('console.vncKeyboardSubmenu.commonShortcuts')}</span>
            </div>
            <hr className="dropdown-divider" />
            <MenuRow
              icon={FaPowerOff}
              labelKey="console.vncKeyboardSubmenu.ctrlAltDel"
              onClick={handleCtrlAltDel}
            />
            <MenuRow
              icon={FaWindowRestore}
              labelKey="console.vncKeyboardSubmenu.altTab"
              onClick={() => sendShortcut('Alt+Tab', keysymMap.tab)}
            />
            <MenuRow
              icon={FaXmark}
              labelKey="console.vncKeyboardSubmenu.altF4"
              onClick={() => sendShortcut('Alt+F4', keysymMap.f4)}
            />
            <hr className="dropdown-divider" />
            <div className="dropdown-item fw-semibold text-secondary">
              <FaHand className="me-2" aria-hidden="true" />
              <span>{t('console.vncKeyboardSubmenu.modifierKeys')}</span>
            </div>
            <div className="dropdown-item px-3 py-2">
              <div className="d-flex gap-2">
                {MODIFIERS.map(modifier => (
                  <button
                    key={modifier}
                    type="button"
                    className={`btn btn-sm ${
                      modifierKeys[modifier] ? MODIFIER_TONES[modifier] : 'btn-light'
                    }`}
                    data-modifier={modifier}
                    onClick={event => {
                      event.stopPropagation();
                      toggleModifier(modifier);
                    }}
                    title={t('console.vncKeyboardSubmenu.modifierToggleTitle', {
                      mod: modifier.toUpperCase(),
                      state: modifierKeys[modifier]
                        ? t('console.vncKeyboardSubmenu.stateOn')
                        : t('console.vncKeyboardSubmenu.stateOff'),
                    })}
                  >
                    {modifierKeys[modifier] ? (
                      <FaToggleOn className="me-2" aria-hidden="true" />
                    ) : (
                      <FaToggleOff className="me-2" aria-hidden="true" />
                    )}
                    <span>{modifier.toUpperCase()}</span>
                  </button>
                ))}
              </div>
              {anyModifier ? (
                <div className="form-text mt-1">
                  {t('console.vncKeyboardSubmenu.activeModifiersHint')}
                </div>
              ) : null}
            </div>
            <hr className="dropdown-divider" />
            <div
              className="dropdown-item position-relative"
              onMouseEnter={() => setShowFunctionKeys(true)}
              onMouseLeave={() => setShowFunctionKeys(false)}
              role="button"
              tabIndex={0}
              data-submenu="function-keys"
            >
              <FaKeyboard className="me-2" aria-hidden="true" />
              <span>{t('console.vncKeyboardSubmenu.functionKeys')}</span>
              <FaChevronRight className="ms-auto" aria-hidden="true" />
              {showFunctionKeys ? (
                <div className="dropdown-menu show has-z-index-modal-top hw-dropdown-function-keys">
                  <div>
                    {FUNCTION_KEYS.map(number => (
                      <FunctionKeyRow
                        key={number}
                        keyCode={`F${number}`}
                        title={t('console.vncKeyboardSubmenu.sendToGuest', {
                          key: anyModifier ? keyString(`F${number}`, modifierKeys) : `F${number}`,
                        })}
                        onSend={() => sendShortcut(`F${number}`, keysymMap[`f${number}`])}
                      />
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

VncKeyboardSubmenu.propTypes = {
  vncRef: PropTypes.object,
  modifierKeys: PropTypes.object.isRequired,
  setModifierKeys: PropTypes.func.isRequired,
  calculateSubmenuPosition: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
  handleCtrlAltDel: PropTypes.func.isRequired,
};

export default VncKeyboardSubmenu;
