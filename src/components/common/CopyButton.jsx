import PropTypes from 'prop-types';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { copyToClipboard } from '../../lib/clipboard';

/**
 * Copy `text` to the clipboard, `text` a string or a function read at the
 * press: the label flips to "Copied!" and back when focus leaves the
 * button; a refused clipboard leaves the label as it was. With `glyph`
 * the button draws that icon alone, the label its title and its
 * accessible name. On a page without the async clipboard API the copy
 * goes through a hidden selection instead.
 */
const CopyButton = ({
  text,
  label = '',
  className = 'auth-btn auth-btn-secondary',
  glyph: Glyph = null,
}) => {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const shown = copied ? t('copyButton.copied') : label || t('copyButton.copy');

  const copy = () =>
    copyToClipboard(typeof text === 'function' ? text() : text)
      .then(() => setCopied(true))
      .catch(() => null);

  if (Glyph) {
    return (
      <button
        type="button"
        className={className}
        onClick={copy}
        onBlur={() => setCopied(false)}
        title={shown}
        aria-label={shown}
        aria-live="polite"
        data-tool="copy"
      >
        <Glyph aria-hidden="true" />
      </button>
    );
  }

  return (
    <button
      type="button"
      className={className}
      onClick={copy}
      onBlur={() => setCopied(false)}
      aria-live="polite"
    >
      {shown}
    </button>
  );
};

CopyButton.propTypes = {
  text: PropTypes.oneOfType([PropTypes.string, PropTypes.func]).isRequired,
  label: PropTypes.string,
  className: PropTypes.string,
  glyph: PropTypes.elementType,
};

export default CopyButton;
