import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { FaWindowRestore } from 'react-icons/fa6';

const WORDS = {
  ssh: 'footer.console.ssh',
  zlogin: 'footer.console.zlogin',
  vnc: 'footer.console.vnc',
  rdp: 'footer.console.rdp',
};

/**
 * The consoles of this machine that sit in the footer's Consoles view,
 * one line each in the console section of the machine page, naming the
 * console's kind, with Send to this page, which brings the console back
 * to the page with its session.
 */
const FooterConsoleNotes = ({ consoles, onSendToPage }) => {
  const { t } = useTranslation();
  return (
    <div className="d-flex flex-column gap-2 mb-3" data-list="footer-consoles">
      {consoles.map(entry => (
        <div
          key={entry.key}
          className="alert alert-info d-flex align-items-center gap-3 mb-0 py-2"
          role="status"
          data-note="console-in-footer"
          data-console-kind={entry.kind}
        >
          <span className="flex-grow-1">
            {t('footer.console.inFooter', { kind: t(WORDS[entry.kind]) })}
          </span>
          <button
            type="button"
            className="btn btn-sm btn-outline-primary"
            data-action="send-to-page"
            onClick={() => onSendToPage(entry.key)}
          >
            <FaWindowRestore className="me-1" aria-hidden="true" />
            {t('footer.console.sendToThisPage')}
          </button>
        </div>
      ))}
    </div>
  );
};

FooterConsoleNotes.propTypes = {
  consoles: PropTypes.arrayOf(PropTypes.object).isRequired,
  onSendToPage: PropTypes.func.isRequired,
};

export default FooterConsoleNotes;
