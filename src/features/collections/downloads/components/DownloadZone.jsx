import PropTypes from 'prop-types';
import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';

import UploadZone from '../../../../components/common/UploadZone';
import { log } from '../../../../lib/logger';

const UPLOAD_KEY = 'download-upload';

/**
 * The upload state one downloads page holds: whether a file is going up, how
 * far it has gone, the visibility the new file is born with, and the runner
 * that sends a picked file through the call the page names and reloads the
 * page when it lands.
 *
 * @param {Object} options - The page's side
 * @param {Function} options.notify - The chrome's notice function
 * @param {Function} options.reload - Reloads the page's data
 * @returns {Object} `uploading`, `progress`, `isPublic`, `setIsPublic`, `upload`
 */
export const useUpload = ({ notify, reload }) => {
  const { t } = useTranslation();
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isPublic, setIsPublic] = useState(false);

  const upload = send => file => {
    setUploading(true);
    setProgress(0);
    notify('', '', { key: UPLOAD_KEY });
    send({
      file,
      isPublic,
      onUploadProgress: event => setProgress(event.progress ?? 0),
    })
      .then(() => {
        notify('success', t('downloads.upload.done'), { key: UPLOAD_KEY });
        reload();
      })
      .catch(error => {
        log.file.error('Error uploading a download file', {
          fileName: file.name,
          error: error.message,
        });
        notify('danger', t(error.messageKey || 'errors.request'), { key: UPLOAD_KEY });
      })
      .finally(() => setUploading(false));
  };

  return { uploading, progress, isPublic, setIsPublic, upload };
};

/**
 * The one Add New of every downloads page: the shared upload zone with the
 * file and the Public / Private switch and nothing else in it, relative to
 * the page it sits on.
 */
const DownloadZone = ({ uploading, progress, isPublic, onVisibility, onFile }) => {
  const { t } = useTranslation();
  const switchId = useId();
  return (
    <UploadZone
      uploading={uploading}
      progress={progress}
      dropText={t('downloads.upload.drop')}
      uploadingText={t('downloads.upload.uploading', { percent: progress })}
      onFile={onFile}
    >
      <div className="form-check form-switch">
        <input
          className="form-check-input"
          type="checkbox"
          id={switchId}
          checked={isPublic}
          disabled={uploading}
          onChange={event => onVisibility(event.target.checked)}
        />
        <label className="form-check-label" htmlFor={switchId}>
          {t(isPublic ? 'downloads.visibility.public' : 'downloads.visibility.private')}
        </label>
      </div>
    </UploadZone>
  );
};

DownloadZone.propTypes = {
  uploading: PropTypes.bool.isRequired,
  progress: PropTypes.number.isRequired,
  isPublic: PropTypes.bool.isRequired,
  onVisibility: PropTypes.func.isRequired,
  onFile: PropTypes.func.isRequired,
};

export default DownloadZone;
