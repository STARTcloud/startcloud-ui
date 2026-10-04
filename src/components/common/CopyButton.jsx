import PropTypes from 'prop-types';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { copyToClipboard } from '../../lib/clipboard';

/**
 * Copy `text` to the clipboard: the label flips to "Copied!" and back
 * when focus leaves the button; a refused clipboard leaves the label as
 * it was. On a page without the async clipboard API the copy goes through
 * a hidden selection instead.
 */
const CopyButton = ({ text, label = '', className = 'auth-btn auth-btn-secondary' }) => {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  const copy = () =>
    copyToClipboard(text)
      .then(() => setCopied(true))
      .catch(() => null);

  return (
    <button
      type="button"
      className={className}
      onClick={copy}
      onBlur={() => setCopied(false)}
      aria-live="polite"
    >
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
