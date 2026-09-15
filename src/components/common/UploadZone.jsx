import PropTypes from 'prop-types';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaUpload, FaXmark } from 'react-icons/fa6';

import { useCssVar } from '../../hooks/useCssVar';

const HOVER_DWELL_MS = 400;

/**
 * The one upload zone the estate's collections add a file through: a green
 * Add New that opens, on click or on a hover dwell, a full-width drop target
 * under the heading row with the caller's own fields above it, the progress
 * bar while a file is going up and a close control. The zone is relative to
 * the page it sits on: the caller decides where the file lands.
 *
 * @param {Object} props - The zone
 * @param {boolean} props.uploading - Whether a file is going up
 * @param {number} props.progress - The percentage uploaded
 * @param {string} [props.accept] - The file input's accept list
 * @param {string} props.dropText - The invitation drawn on the target
 * @param {string} props.uploadingText - The text drawn while uploading
 * @param {Function} props.onFile - Called with the picked or dropped file
 * @param {React.ReactNode} [props.children] - The caller's own fields
 * @returns {React.ReactNode} The zone
 */
const UploadZone = ({
  uploading,
  progress,
  dropText,
  uploadingText,
  onFile,
  accept = '',
  children = null,
}) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [over, setOver] = useState(false);
  const dwell = useRef(null);
  const inputRef = useRef(null);
  const bar = useRef(null);
  useCssVar(bar, '--progress-width', `${progress}%`);

  useEffect(() => () => clearTimeout(dwell.current), []);

  const startDwell = () => {
    clearTimeout(dwell.current);
    dwell.current = setTimeout(() => setOpen(true), HOVER_DWELL_MS);
  };

  const stopDwell = () => clearTimeout(dwell.current);

  const pick = file => {
    if (file) {
      onFile(file);
    }
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
        pick(event.dataTransfer.files[0]);
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
      <button
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
      <input
        ref={inputRef}
        type="file"
        hidden
        accept={accept || undefined}
        disabled={uploading}
        onChange={event => {
          pick(event.target.files[0]);
          event.target.value = '';
        }}
      />
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
  children: PropTypes.node,
};

export default UploadZone;
