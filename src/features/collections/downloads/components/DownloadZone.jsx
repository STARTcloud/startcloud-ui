import PropTypes from 'prop-types';
import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';

import UploadZone from '../../../../components/common/UploadZone';
import VisibilityPicker, { visibilityShape } from '../../../../components/common/VisibilityPicker';
import { log } from '../../../../lib/logger';

const UPLOAD_KEY = 'download-upload';

const PRIVATE = { is_public: false, guest_access: false };

/**
 * The upload state one downloads page holds: whether a file is going up, how
 * far it has gone, the visibility the new file is born with as the wire's
 * `is_public` and `guest_access` pair (held for the placing form, which
 * sends it in the place body; the pending upload takes the bytes alone),
 * the runner that sends a picked file to the organization's pending store,
 * and the pending upload the last chunk answered, which the placing form is
 * drawn from.
 *
 * @param {Object} options - The page's side
 * @param {Function} options.notify - The chrome's notice function
 * @returns {Object} `uploading`, `progress`, `file`, `error`, `visibility`,
 * `setVisibility`, `upload`, `pending`, `clear`
 */
export const useUpload = ({ notify }) => {
  const { t } = useTranslation();
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [picked, setPicked] = useState(null);
  const [failure, setFailure] = useState('');
  const [visibility, setVisibility] = useState(PRIVATE);
  const [pending, setPending] = useState(null);

  const upload = send => file => {
    setUploading(true);
    setProgress(0);
    setPicked(file);
    setFailure('');
    setPending(null);
    notify('', '', { key: UPLOAD_KEY });
    send({
      file,
      onUploadProgress: event => setProgress(event.progress ?? 0),
    })
      .then(answer => {
        setPicked(null);
        notify('success', t('downloads.upload.done'), { key: UPLOAD_KEY });
        setPending(answer || null);
      })
      .catch(error => {
        log.file.error('Error uploading a download file', {
          fileName: file.name,
          error: error.message,
        });
        const text = t(error.messageKey || 'errors.request');
        setFailure(text);
        notify('danger', text, { key: UPLOAD_KEY });
      })
      .finally(() => setUploading(false));
  };

  return {
    uploading,
    progress,
    file: picked,
    error: failure,
    visibility,
    setVisibility,
    upload,
    pending,
    clear: () => setPending(null),
  };
};

/**
 * The one Add New of every downloads page: the shared upload zone with the
 * file and the visibility picker and nothing else in it, relative to the
 * page it sits on, the box architecture upload's own progress block and
 * failure line drawn under it once a file is picked.
 */
const DownloadZone = ({
  uploading,
  progress,
  visibility,
  onVisibility,
  onFile,
  file = null,
  error = '',
}) => {
  const { t } = useTranslation();
  const idPrefix = useId();
  return (
    <UploadZone
      uploading={uploading}
      progress={progress}
      dropText={t('downloads.upload.drop')}
      uploadingText={t('downloads.upload.uploading', { percent: progress })}
      onFile={onFile}
      file={file}
      error={error}
    >
      <VisibilityPicker
        idPrefix={idPrefix}
        value={visibility}
        onChange={onVisibility}
        disabled={uploading}
        className="mb-2"
      />
    </UploadZone>
  );
};

DownloadZone.propTypes = {
  uploading: PropTypes.bool.isRequired,
  progress: PropTypes.number.isRequired,
  visibility: visibilityShape.isRequired,
  onVisibility: PropTypes.func.isRequired,
  onFile: PropTypes.func.isRequired,
  file: PropTypes.shape({ size: PropTypes.number.isRequired }),
  error: PropTypes.string,
};

export default DownloadZone;
