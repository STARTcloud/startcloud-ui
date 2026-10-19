import PropTypes from 'prop-types';
import { useRef, useState } from 'react';
import { FaUpload } from 'react-icons/fa6';

const carriesFiles = event => [...(event.dataTransfer?.types || [])].includes('Files');

/**
 * The upload zone drawn inside a control rather than under an Add New:
 * the control the caller gives as `children` takes a dropped file and a
 * pasted file anywhere over it, and while `invite` is true the zone's
 * glyph, `dropText` and the browse button draw centered over the control,
 * a click or typing reaching the control through them and the button
 * opening the file picker; `error`, the last read's failure, draws under
 * the control.
 *
 * @param {Object} props - The zone
 * @param {boolean} props.invite - Whether the invitation draws over the control
 * @param {boolean} props.busy - Whether a file is being read
 * @param {string} props.dropText - The invitation
 * @param {string} props.busyText - The text drawn while busy
 * @param {string} props.browseText - The browse button's label
 * @param {Function} props.onFile - Called with each picked, dropped or pasted file
 * @param {string} [props.accept] - The file input's accept list
 * @param {boolean} [props.multiple] - Whether one pick or drop may carry several files
 * @param {string} [props.error] - The failure of the last read, translated
 * @param {React.ReactNode} props.children - The control
 * @returns {React.ReactNode} The zone
 */
const DropOverlay = ({
  invite,
  busy,
  dropText,
  busyText,
  browseText,
  onFile,
  accept = '',
  multiple = false,
  error = '',
  children,
}) => {
  const [over, setOver] = useState(false);
  const inputRef = useRef(null);

  const pick = files => {
    const picked = multiple ? [...files] : [files[0]];
    picked.filter(Boolean).forEach(onFile);
  };

  return (
    <>
      <div
        role="presentation"
        className={`upload-zone-inside${over ? ' over' : ''}`}
        onDragOver={event => {
          if (carriesFiles(event)) {
            event.preventDefault();
            setOver(true);
          }
        }}
        onDragLeave={() => setOver(false)}
        onDrop={event => {
          if (carriesFiles(event)) {
            event.preventDefault();
            setOver(false);
            pick(event.dataTransfer.files);
          }
        }}
        onPaste={event => {
          const files = event.clipboardData?.files;
          if (files?.length > 0) {
            event.preventDefault();
            pick(files);
          }
        }}
      >
        {children}
        {invite ? (
          <div className="upload-zone-overlay" data-overlay="drop">
            <FaUpload className="upload-zone-icon" aria-hidden />
            <span>{busy ? busyText : dropText}</span>
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary"
              data-action="browse"
              onClick={() => inputRef.current?.click()}
              disabled={busy}
            >
              {browseText}
            </button>
          </div>
        ) : null}
        <input
          ref={inputRef}
          type="file"
          hidden
          accept={accept || undefined}
          multiple={multiple}
          disabled={busy}
          onChange={event => {
            pick(event.target.files);
            event.target.value = '';
          }}
        />
      </div>
      {error ? (
        <small className="text-danger d-block mt-1" role="alert">
          {error}
        </small>
      ) : null}
    </>
  );
};

DropOverlay.propTypes = {
  invite: PropTypes.bool.isRequired,
  busy: PropTypes.bool.isRequired,
  dropText: PropTypes.string.isRequired,
  busyText: PropTypes.string.isRequired,
  browseText: PropTypes.string.isRequired,
  onFile: PropTypes.func.isRequired,
  accept: PropTypes.string,
  multiple: PropTypes.bool,
  error: PropTypes.string,
  children: PropTypes.node.isRequired,
};

export default DropOverlay;
