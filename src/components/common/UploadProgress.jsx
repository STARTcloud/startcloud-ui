import PropTypes from 'prop-types';
import { useRef } from 'react';
import { useTranslation } from 'react-i18next';

import { useCssVar } from '../../hooks/useCssVar';
import { formatFileSize } from '../../utils/formatFileSize';

/**
 * The one upload progress block of the estate: the striped bar with its
 * percentage, then the file's size, what has gone up and what is left, and
 * the failure line under it once a send has failed, so a person watching a
 * file go up reads the same three numbers wherever they started it.
 *
 * @param {Object} props - The block
 * @param {{ size: number }} props.file - The file going up
 * @param {number} props.progress - The percentage uploaded
 * @param {string} [props.error] - The failure, already translated
 * @returns {React.ReactNode} The block
 */
const UploadProgress = ({ file, progress, error = '' }) => {
  const { t } = useTranslation();
  const bar = useRef(null);
  useCssVar(bar, '--progress-width', `${progress}%`);
  return (
    <div>
      <div className="progress progress-lg mb-2">
        <div
          ref={bar}
          className="progress-bar progress-fill bg-success progress-bar-striped progress-bar-animated"
          role="progressbar"
          aria-valuenow={progress}
          aria-valuemin="0"
          aria-valuemax="100"
        >
          <span>{progress}%</span>
        </div>
      </div>
      <div className="text-muted upload-stats d-flex justify-content-between">
        <small>
          <strong>{t('boxes.architecture.fileSize')}:</strong> {formatFileSize(file.size)}
        </small>
        <small>
          <strong>{t('boxes.architecture.uploaded')}:</strong>{' '}
          {formatFileSize(Math.round((progress / 100) * file.size))} ({progress}%)
        </small>
        <small>
          <strong>{t('boxes.architecture.remaining')}:</strong>{' '}
          {formatFileSize(Math.round(((100 - progress) / 100) * file.size))}
        </small>
      </div>
      {error ? (
        <small className="text-danger d-block mt-1" role="alert">
          {error}
        </small>
      ) : null}
    </div>
  );
};

UploadProgress.propTypes = {
  file: PropTypes.shape({ size: PropTypes.number.isRequired }).isRequired,
  progress: PropTypes.number.isRequired,
  error: PropTypes.string,
};

export default UploadProgress;
