import {
  FaArrowsRotate,
  FaBurst,
  FaCircle,
  FaCircleCheck,
  FaCirclePlay,
  FaCirclePlus,
  FaCircleXmark,
  FaFolderPlus,
  FaLink,
  FaMoon,
  FaPlugCircleXmark,
  FaPowerOff,
  FaRightFromBracket,
  FaRightToBracket,
  FaTrash,
  FaTriangleExclamation,
  FaUserPen,
} from 'react-icons/fa6';

const CATEGORY_CLASSES = {
  session: 'text-primary',
  problem: 'text-danger',
  recovery: 'text-success',
  info: 'text-secondary',
  drive: 'text-warning',
  lifecycle: 'text-info',
};

export const EVT_CONFIG = {
  session_login: { Icon: FaRightToBracket, category: 'session' },
  session_logout: { Icon: FaRightFromBracket, category: 'session' },
  session_idle: { Icon: FaMoon, category: 'session' },
  session_active: { Icon: FaCirclePlay, category: 'session' },
  user_changed: { Icon: FaUserPen, category: 'session' },
  drive_failed: { Icon: FaBurst, category: 'problem' },
  drive_recovered: { Icon: FaCircleCheck, category: 'recovery' },
  drive_appeared: { Icon: FaFolderPlus, category: 'info' },
  drive_disappeared: { Icon: FaCircleXmark, category: 'problem' },
  icons_missing: { Icon: FaTriangleExclamation, category: 'problem' },
  icons_recovered: { Icon: FaCircleCheck, category: 'recovery' },
  status_changed: { Icon: FaArrowsRotate, category: 'info' },
  agent_first_seen: { Icon: FaCirclePlus, category: 'info' },
  vm_decommissioned: { Icon: FaTrash, category: 'info' },
  vm_rebooted: { Icon: FaPowerOff, category: 'info' },
  session_disconnected: { Icon: FaPlugCircleXmark, category: 'session' },
  session_reconnected: { Icon: FaLink, category: 'session' },
};

/**
 * The glyph, colour class and label of one state event type; an unknown
 * type gets a dot and its own name.
 * @param {string} type - The `event_type`
 * @param {Function} t - The translator
 * @returns {{ Icon: Function, className: string, label: string }} The display config
 */
export const eventDisplay = (type, t) => {
  const config = EVT_CONFIG[type];
  return {
    Icon: config ? config.Icon : FaCircle,
    className: CATEGORY_CLASSES[config ? config.category : 'info'],
    label: t(`vdi.events.${type}`, { defaultValue: type }),
  };
};
