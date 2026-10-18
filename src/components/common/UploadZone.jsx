import PropTypes from 'prop-types';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaUpload, FaXmark } from 'react-icons/fa6';

import { useCssVar } from '../../hooks/useCssVar';

import UploadProgress from './UploadProgress';

const HOVER_DWELL_MS = 400;

/**
 * The one upload zone the estate's collections add a file through: a green
 * Add New that opens, on click or on a hover dwell, a full-width drop target
 * under the heading row with the caller's own fields above it, the caller's
 * `aside` beside the target in one row that wraps under 900px, the shared
 * `UploadProgress` block while a file is going up and a close control. The
 * zone is relative to the page it sits on: the caller decides where the
 * file lands.
 *
 * @param {Object} props - The zone
 * @param {boolean} props.uploading - Whether a file is going up
 * @param {number} props.progress - The percentage uploaded
 * @param {string} [props.accept] - The file input's accept list
 * @param {boolean} [props.multiple] - Whether one pick or drop may carry several files, `onFile` called once per file
 * @param {string} props.dropText - The invitation drawn on the target
 * @param {string} props.uploadingText - The text drawn while uploading
 * @param {Function} props.onFile - Called with the picked or dropped file
 * @param {{ size: number }} [props.file] - The file the caller last picked
 * @param {string} [props.error] - The failure of the last send, translated
 * @param {boolean} [props.defaultOpen] - Whether the target is open from the first draw, a tool page's way
 * @param {React.ReactNode} [props.children] - The caller's own fields
 * @param {React.ReactNode} [props.aside] - The caller's other way in, drawn beside the drop target
 * @returns {React.ReactNode} The zone
 */
const UploadZone = ({
  uploading,
  progress,
  dropText,
  uploadingText,
  onFile,
  accept = '',
  multiple = false,
  file = null,
  error = '',
  defaultOpen = false,
  children = null,
  aside = null,
}) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(defaultOpen);
  const [over, setOver] = useState(false);
  const dwell = useRef(null);
  const inputRef = useRef(null);
  const targetRef = useRef(null);
  const bar = useRef(null);
  useCssVar(bar, '--progress-width', `${progress}%`);

  useEffect(() => () => clearTimeout(dwell.current), []);

  useEffect(() => {
    if (open && !defaultOpen) {
      targetRef.current?.focus();
    }
  }, [open, defaultOpen]);

  const startDwell = () => {
    clearTimeout(dwell.current);
    dwell.current = setTimeout(() => setOpen(true), HOVER_DWELL_MS);
  };

  const stopDwell = () => clearTimeout(dwell.current);

  const pick = files => {
    const picked = multiple ? [...files] : [files[0]];
    picked.filter(Boolean).forEach(onFile);
  };

  if (!open) {
    return (
      <button
        type="button"
        className="btn btn-sm btn-outline-success"
        onClick={() => setOpen(true)}
        onMouseEnter={startDwell}
        onMouseLeave={stopDwell}
      >
        {t('pages.addNew')}
      </button>
    );
  }

  return (
    <div
      role="presentation"
      className={`upload-zone w-100 order-last${over ? ' over' : ''}`}
      onDragOver={event => {
        event.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={event => {
        event.preventDefault();
        setOver(false);
        pick(event.dataTransfer.files);
      }}
    >
      <button
        type="button"
        className="navbar-search-tool upload-zone-close"
        onClick={() => setOpen(false)}
        disabled={uploading}
        title={t('boxes.buttons.close')}
        aria-label={t('boxes.buttons.close')}
      >
        <FaXmark />
      </button>
      {children}
      <div className="upload-zone-row">
        <button
          ref={targetRef}
          type="button"
          className="upload-zone-target"
          onClick={() => inputRef.current?.click()}
          onKeyDown={event => {
            if (event.key === 'Escape' && !uploading) {
              setOpen(false);
            }
          }}
          disabled={uploading}
        >
          <FaUpload className="upload-zone-icon" aria-hidden />
          <span>{uploading ? uploadingText : dropText}</span>
        </button>
        {aside ? <div className="upload-zone-aside">{aside}</div> : null}
      </div>
      <input
        ref={inputRef}
        type="file"
        hidden
        accept={accept || undefined}
        multiple={multiple}
        disabled={uploading}
        onChange={event => {
          pick(event.target.files);
          event.target.value = '';
        }}
      />
      {file ? (
        <UploadProgress file={file} progress={progress} error={error} />
      ) : (
        <>
          {uploading ? (
            <div className="progress upload-zone-progress">
              <div
                ref={bar}
                className="progress-bar progress-fill progress-bar-striped progress-bar-animated"
                role="progressbar"
                aria-valuenow={progress}
                aria-valuemin="0"
                aria-valuemax="100"
              />
            </div>
          ) : null}
          {error ? (
            <small className="text-danger d-block mt-1" role="alert">
              {error}
            </small>
          ) : null}
        </>
      )}
    </div>
  );
};

UploadZone.propTypes = {
  uploading: PropTypes.bool.isRequired,
  progress: PropTypes.number.isRequired,
  dropText: PropTypes.string.isRequired,
  uploadingText: PropTypes.string.isRequired,
  onFile: PropTypes.func.isRequired,
  accept: PropTypes.string,
  multiple: PropTypes.bool,
  file: PropTypes.shape({ size: PropTypes.number.isRequired }),
  error: PropTypes.string,
  defaultOpen: PropTypes.bool,
  children: PropTypes.node,
  aside: PropTypes.node,
};

export default UploadZone;
