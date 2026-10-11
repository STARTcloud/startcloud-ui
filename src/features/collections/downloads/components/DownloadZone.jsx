import PropTypes from 'prop-types';
import { useCallback, useId, useState } from 'react';
import { useTranslation } from 'react-i18next';

import FormErrorSummary from '../../../../components/common/FormErrorSummary';
import UploadZone from '../../../../components/common/UploadZone';
import VisibilityPicker, { visibilityShape } from '../../../../components/common/VisibilityPicker';
import { useFormRules } from '../../../../hooks/useFormRules';
import { log } from '../../../../lib/logger';
import {
  CHECKSUM_TYPES,
  DOWNLOAD_FILE_LABELS,
  DOWNLOAD_FILE_SCHEMA,
} from '../../../../utils/forms';
import { isVisible } from '../../../../utils/validation';

import { SelectField, TextField } from './fields';

const UPLOAD_KEY = 'download-upload';

const PRIVATE = { is_public: false, guest_access: false };

const REFUSED = 422;

/**
 * The page schema and label keys of the Add from link form, the client
 * side of `useFormRules` without a host form: `url` required and a URL,
 * the checksum pair as the file form carries it.
 */
export const FETCH_SCHEMA = {
  required: ['url'],
  properties: {
    url: { type: 'string', format: 'uri', minLength: 1 },
    file_name: { type: 'string' },
    checksum_type: DOWNLOAD_FILE_SCHEMA.properties.checksum_type,
    checksum: DOWNLOAD_FILE_SCHEMA.properties.checksum,
  },
};

export const FETCH_LABELS = {
  url: 'downloads.fetch.url',
  file_name: DOWNLOAD_FILE_LABELS.file_name,
  checksum_type: DOWNLOAD_FILE_LABELS.checksum_type,
  checksum: DOWNLOAD_FILE_LABELS.checksum,
};

const EMPTY_LINK = { url: '', file_name: '', checksum_type: 'NULL', checksum: '' };

/**
 * The body the fetch sends for one link draft: `url` always, `file_name`
 * while given, and the checksum with its type while an algorithm is picked.
 *
 * @param {Object} draft - The link form's draft
 * @returns {Object} The body
 */
export const fetchBody = draft => ({
  url: draft.url,
  ...(draft.file_name ? { file_name: draft.file_name } : {}),
  ...(draft.checksum_type && draft.checksum_type !== 'NULL'
    ? { checksum: draft.checksum, checksum_type: draft.checksum_type }
    : {}),
});

/**
 * The upload state one downloads page holds: whether a file is going up or
 * being fetched from a link, how far an upload has gone, the visibility the
 * new file is born with as the wire's `is_public` and `guest_access` pair
 * (held for the placing form, which sends it in the place body; the pending
 * upload takes the bytes alone), the runner that sends a picked file to the
 * organization's pending store, the runner that asks the server to fetch a
 * URL into it, and the pending upload either answered, which the placing
 * form is drawn from. `fetchLink` resolves once the pending upload is held
 * and rejects with the `ApiError` of a 422 alone, for the form to paint;
 * every other failure is raised as the notice here.
 *
 * @param {Object} options - The page's side
 * @param {Function} options.notify - The chrome's notice function
 * @returns {Object} `uploading`, `fetching`, `progress`, `file`, `error`, `visibility`,
 * `setVisibility`, `upload`, `fetchLink`, `pending`, `clear`
 */
export const useUpload = ({ notify }) => {
  const { t } = useTranslation();
  const [uploading, setUploading] = useState(false);
  const [fetching, setFetching] = useState(false);
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

  const fetchLink = send => body => {
    setFetching(true);
    setFailure('');
    setPending(null);
    notify('', '', { key: UPLOAD_KEY });
    return send(body)
      .then(answer => {
        notify('success', t('downloads.upload.done'), { key: UPLOAD_KEY });
        setPending(answer || null);
      })
      .catch(error => {
        log.file.error('Error fetching a download file from a link', {
          url: body.url,
          error: error.message,
        });
        if (error.status === REFUSED && error.fieldErrors?.length > 0) {
          throw error;
        }
        notify('danger', t(error.messageKey || 'errors.request'), { key: UPLOAD_KEY });
      })
      .finally(() => setFetching(false));
  };

  return {
    uploading,
    fetching,
    progress,
    file: picked,
    error: failure,
    visibility,
    setVisibility,
    upload,
    fetchLink,
    pending,
    clear: () => setPending(null),
  };
};

/**
 * The Add from link form of the upload zone: the URL, the file name the
 * server would otherwise read off the URL's last segment, the checksum
 * type and, while an algorithm is picked, the checksum, then the one
 * button, busy while the server fetches; a 422 paints at the fields.
 */
const LinkForm = ({ onLink, busy }) => {
  const { t } = useTranslation();
  const [draft, setDraft] = useState(EMPTY_LINK);
  const rules = useFormRules({
    schema: FETCH_SCHEMA,
    values: draft,
    labels: FETCH_LABELS,
    idPrefix: 'download-fetch',
  });

  const onChange = useCallback(event => {
    const { name, value } = event.target;
    setDraft(current => ({ ...current, [name]: value }));
  }, []);

  const submit = event => {
    event.preventDefault();
    if (busy || !rules.validateAll()) {
      return;
    }
    onLink(fetchBody(draft)).catch(error => rules.applyServerErrors(error));
  };

  return (
    <form onSubmit={submit} noValidate>
      <FormErrorSummary errors={rules.summary} />
      <fieldset disabled={busy}>
        <TextField name="url" type="url" draft={draft} rules={rules} onChange={onChange} />
        <div className="row g-2">
          <TextField
            name="file_name"
            draft={draft}
            rules={rules}
            onChange={onChange}
            className="col-sm-7 mb-2"
          />
          <SelectField
            name="checksum_type"
            group="checksum"
            options={CHECKSUM_TYPES}
            draft={draft}
            rules={rules}
            onChange={onChange}
            className="col-sm-5 mb-2"
          />
        </div>
        {isVisible(FETCH_SCHEMA.properties.checksum, [draft]) ? (
          <TextField name="checksum" draft={draft} rules={rules} onChange={onChange} />
        ) : null}
        <button
          type="submit"
          className="btn btn-sm btn-outline-success"
          data-action="download-fetch"
          disabled={busy}
        >
          {busy ? (
            <span className="spinner-border spinner-border-sm me-2" aria-hidden="true" />
          ) : null}
          {t('downloads.upload.fromLink')}
        </button>
      </fieldset>
    </form>
  );
};

LinkForm.propTypes = {
  onLink: PropTypes.func.isRequired,
  busy: PropTypes.bool.isRequired,
};

/**
 * The one Add New of every downloads page: the shared upload zone with the
 * visibility picker over the file drop and the Add from link form beside
 * it, relative to the page it sits on, the box architecture upload's own
 * progress block and failure line drawn under them once a file is picked;
 * the zone is busy while a file goes up or the server fetches a link.
 */
const DownloadZone = ({
  uploading,
  fetching,
  progress,
  visibility,
  onVisibility,
  onFile,
  onLink,
  file = null,
  error = '',
}) => {
  const { t } = useTranslation();
  const idPrefix = useId();
  const busy = uploading || fetching;
  return (
    <UploadZone
      uploading={busy}
      progress={progress}
      dropText={t('downloads.upload.drop')}
      uploadingText={
        fetching
          ? t('downloads.upload.fetching')
          : t('downloads.upload.uploading', { percent: progress })
      }
      onFile={onFile}
      file={file}
      error={error}
      aside={<LinkForm onLink={onLink} busy={busy} />}
    >
      <VisibilityPicker
        idPrefix={idPrefix}
        value={visibility}
        onChange={onVisibility}
        disabled={busy}
        className="mb-2"
      />
    </UploadZone>
  );
};

DownloadZone.propTypes = {
  uploading: PropTypes.bool.isRequired,
  fetching: PropTypes.bool.isRequired,
  progress: PropTypes.number.isRequired,
  visibility: visibilityShape.isRequired,
  onVisibility: PropTypes.func.isRequired,
  onFile: PropTypes.func.isRequired,
  onLink: PropTypes.func.isRequired,
  file: PropTypes.shape({ size: PropTypes.number.isRequired }),
  error: PropTypes.string,
};

export default DownloadZone;
