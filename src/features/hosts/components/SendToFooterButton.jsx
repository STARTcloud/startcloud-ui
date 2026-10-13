import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { FaWindowMaximize } from 'react-icons/fa6';

/**
 * Send to footer, the button every live console header of the machine
 * page carries beside its switch buttons: the console leaves the page
 * for the footer's Consoles view as a tab, its session kept, a terminal
 * taking its socket with it and a VNC or RDP viewer connecting again
 * there.
 */
const SendToFooterButton = ({ onSend, disabled = false }) => {
  const { t } = useTranslation();
  const label = t('footer.console.sendToFooter');
  return (
    <button
      type="button"
      className="btn btn-sm btn-secondary"
      onClick={onSend}
      disabled={disabled}
      title={label}
      aria-label={label}
      data-action="send-to-footer"
    >
      <FaWindowMaximize aria-hidden="true" />
    </button>
  );
};

SendToFooterButton.propTypes = {
  onSend: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
};

export default SendToFooterButton;
