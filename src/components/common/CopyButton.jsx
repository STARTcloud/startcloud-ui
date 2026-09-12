import PropTypes from 'prop-types';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

const COPIED_MS = 2000;

const writeClipboard = text => {
  if (navigator.clipboard?.writeText) {
    return navigator.clipboard.writeText(text);
  }
  const area = document.createElement('textarea');
  area.value = text;
  area.setAttribute('readonly', '');
  area.className = 'visually-hidden';
  document.body.appendChild(area);
  area.select();
  const done = document.execCommand('copy');
  area.remove();
  return done ? Promise.resolve() : Promise.reject(new Error('copy refused'));
};

/**
 * Copy `text` to the clipboard: the label flips to "Copied!" for two
 * seconds and back; a refused clipboard leaves the label as it was. On a
 * page without the async clipboard API the copy goes through a hidden
 * selection instead.
 */
const CopyButton = ({ text, label = '', className = 'auth-btn auth-btn-secondary' }) => {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const timer = useRef(null);

  useEffect(() => () => clearTimeout(timer.current), []);

  const copy = () =>
    writeClipboard(text)
      .then(() => {
        setCopied(true);
        clearTimeout(timer.current);
        timer.current = setTimeout(() => setCopied(false), COPIED_MS);
      })
      .catch(() => null);

  return (
    <button type="button" className={className} onClick={copy} aria-live="polite">
      {copied ? t('copyButton.copied') : label || t('copyButton.copy')}
    </button>
  );
};

CopyButton.propTypes = {
  text: PropTypes.string.isRequired,
  label: PropTypes.string,
  className: PropTypes.string,
};

export default CopyButton;
