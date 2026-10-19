import PropTypes from 'prop-types';
import { Button, Modal } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { FaCopy, FaReply } from 'react-icons/fa6';

import { useNotify } from '../../../contexts/NoticeContext';
import { copyToClipboard } from '../../../lib/clipboard';
import { clearConsoleHistory, useConsoleHistory } from '../hooks/useTerminal';
import { formatTaskDate } from '../utils/tasks';

/**
 * The broadcast history dialog, a list dialog of the pages contract over
 * the Commands bar's history: one row a string sent, newest first, with
 * the moment it was sent, the string itself, how many tabs took it and
 * their names, Use filling the Commands field with it again and Copy
 * putting it on the clipboard with a success notice; Clear history
 * forgets every row. The rows are the browser's own under
 * `console_history`, kept across reloads and sign-outs until cleared.
 */
const CommandsHistoryDialog = ({ show, onHide, onPick }) => {
  const { t } = useTranslation();
  const notify = useNotify();
  const history = useConsoleHistory();

  const pick = entry => {
    onPick(entry.text);
    onHide();
  };

  const copy = entry =>
    copyToClipboard(entry.text)
      .then(() => notify('success', t('footer.console.copied')))
      .catch(() => notify('danger', t('footer.console.copyFailed')));

  return (
    <Modal
      show={show}
      onHide={onHide}
      dialogClassName="list-modal"
      scrollable
      data-dialog="console-history"
    >
      <Modal.Header closeButton>
        <Modal.Title>{t('footer.console.sentBefore')}</Modal.Title>
      </Modal.Header>
      <Modal.Body className="p-0">
        {history.length === 0 ? (
          <p className="text-body-secondary small m-3" data-note="history-empty">
            {t('footer.console.nothingSent')}
          </p>
        ) : (
          <table className="table table-sm table-hover mb-0 console-history">
            <thead>
              <tr>
                <th>{t('footer.console.historyWhen')}</th>
                <th>{t('footer.console.historyCommand')}</th>
                <th>{t('footer.console.historySentTo')}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {history.map(entry => (
                <tr key={entry.text} data-sent={entry.text}>
                  <td className="text-nowrap text-body-secondary">{formatTaskDate(entry.at)}</td>
                  <td className="font-monospace console-history-text">{entry.text}</td>
                  <td className="text-body-secondary" title={(entry.targets || []).join(', ')}>
                    {t('footer.console.sentTo', { count: entry.took || 0 })}
                  </td>
                  <td className="text-nowrap text-end">
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-secondary btn-glyph me-1"
                      title={t('footer.console.copy')}
                      aria-label={t('footer.console.copy')}
                      data-action="history-copy"
                      onClick={() => copy(entry)}
                    >
                      <FaCopy />
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-primary btn-glyph"
                      title={t('footer.console.use')}
                      aria-label={t('footer.console.use')}
                      data-action="history-use"
                      onClick={() => pick(entry)}
                    >
                      <FaReply />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button
          variant="outline-danger"
          disabled={history.length === 0}
          data-action="history-clear"
          onClick={clearConsoleHistory}
        >
          {t('footer.console.clearHistory')}
        </Button>
        <Button variant="secondary" onClick={onHide}>
          {t('footer.console.close')}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

CommandsHistoryDialog.propTypes = {
  show: PropTypes.bool.isRequired,
  onHide: PropTypes.func.isRequired,
  onPick: PropTypes.func.isRequired,
};

export default CommandsHistoryDialog;
