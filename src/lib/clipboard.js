/**
 * Copy `text` to the clipboard, using `navigator.clipboard.writeText` where
 * it exists and a hidden `<textarea>` with `document.execCommand('copy')`
 * on a page without the async clipboard API (a non-secure context).
 * @param {string} text - The text to copy
 * @returns {Promise<void>} Resolves once copied, rejects if the copy was refused
 */
export const copyToClipboard = text => {
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
