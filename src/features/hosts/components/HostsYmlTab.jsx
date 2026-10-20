import PropTypes from 'prop-types';
import { Suspense, lazy, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaCheck } from 'react-icons/fa6';

import { useStatus } from '../../../contexts/StatusContext';
import { fetchHostsYml, saveHostsYml } from '../api/provisioning';
import { yamlProblemPosition, yamlProblemText } from '../utils/provisioning';

const HostsYmlEditor = lazy(() => import('./HostsYmlEditor'));

const FORBIDDEN = 403;

const OPENING = {
  yaml: '',
  original: '',
  loading: true,
  error: '',
  forbidden: false,
  warnings: [],
  savedNote: '',
};

const EditorLoading = () => {
  const { t } = useTranslation();
  return (
    <div className="d-flex align-items-center justify-content-center py-5 text-muted">
      <span className="spinner-border spinner-border-sm me-2" aria-hidden="true" />
      <span>{t('provisioning.hostsYmlModal.loadingEditor')}</span>
    </div>
  );
};

/**
 * The Hosts.yml document of one machine while its tab is `open`: read by
 * `GET machines/{name}/hosts-yml` each time the tab opens, `save` sending
 * the text verbatim by `PUT machines/{name}/hosts-yml` and handing the
 * notice's sentence to `onSaved`, `discard` taking the text read back. A
 * refused save holds the agent's own error and lands the cursor of
 * `editorRef` on the line it names, a save with advisories holds them, and
 * a 403 marks the editor the manager's alone.
 *
 * @param {Object} options - The host, the machine, whether the tab is open and the saved callback
 * @returns {{ held: Object, dirty: boolean, edit: Function, save: Function, discard: Function, editorRef: Object }} The document and its writes
 */
export const useHostsYml = ({ id, name, open, onSaved }) => {
  const { t } = useTranslation();
  const status = useStatus();
  const [held, setHeld] = useState(OPENING);
  const editorRef = useRef(null);

  useEffect(() => {
    if (!open) {
      return undefined;
    }
    let live = true;
    setHeld(OPENING);
    fetchHostsYml(status, id, name)
      .then(answer => {
        if (live) {
          const text = answer?.yaml ?? '';
          setHeld({ ...OPENING, yaml: text, original: text, loading: false });
        }
      })
      .catch(error => {
        if (live) {
          setHeld({
            ...OPENING,
            loading: false,
            forbidden: error.status === FORBIDDEN,
            error:
              error.status === FORBIDDEN
                ? ''
                : t('provisioning.hostsYmlModal.failedToLoad', { message: error.message }),
          });
        }
      });
    return () => {
      live = false;
    };
  }, [status, id, name, t, open]);

  const save = async () => {
    if (held.forbidden || held.loading) {
      return;
    }
    setHeld(previous => ({ ...previous, loading: true, error: '', warnings: [], savedNote: '' }));
    try {
      const answer = await saveHostsYml(status, id, name, held.yaml);
      const advisories = Array.isArray(answer?.warnings) ? answer.warnings : [];
      setHeld(previous => ({
        ...previous,
        loading: false,
        original: previous.yaml,
        warnings: advisories,
        savedNote: advisories.length > 0 ? t('provisioning.hostsYmlModal.savedWithAdvisories') : '',
      }));
      onSaved(t('provisioning.hostsYmlModal.documentSaved', { machineName: name }));
    } catch (error) {
      setHeld(previous => ({ ...previous, loading: false, error: yamlProblemText(error, t) }));
      const position = yamlProblemPosition(error);
      if (position) {
        editorRef.current?.jumpTo(position.line, position.column);
      }
    }
  };

  const discard = () =>
    setHeld(previous => ({ ...previous, yaml: previous.original, error: '', savedNote: '' }));

  const edit = yaml => setHeld(previous => ({ ...previous, yaml }));

  return { held, dirty: held.yaml !== held.original, edit, save, discard, editorRef };
};

const ymlShape = PropTypes.shape({
  held: PropTypes.object.isRequired,
  dirty: PropTypes.bool.isRequired,
  edit: PropTypes.func.isRequired,
  save: PropTypes.func.isRequired,
  discard: PropTypes.func.isRequired,
  editorRef: PropTypes.object.isRequired,
});

/**
 * Save and Discard of the Hosts.yml tab, the controls the page's heading
 * pane draws while the tab is open: Save held while the document reads
 * or is forbidden, Discard held too while nothing differs from the text
 * read back.
 */
export const HostsYmlButtons = ({ yml }) => {
  const { t } = useTranslation();
  const { held, dirty, save, discard } = yml;
  return (
    <>
      <button
        type="button"
        className="btn btn-sm btn-primary"
        data-action="hosts-yml-save"
        onClick={save}
        disabled={held.loading || held.forbidden}
      >
        {held.loading ? (
          <span className="spinner-border spinner-border-sm me-2" aria-hidden="true" />
        ) : (
          <FaCheck className="me-2" aria-hidden="true" />
        )}
        {t('provisioning.hostsYmlModal.saveButton')}
      </button>
      <button
        type="button"
        className="btn btn-sm btn-outline-secondary"
        data-action="hosts-yml-discard"
        onClick={discard}
        disabled={held.loading || held.forbidden || !dirty}
      >
        {t('provisioning.provisioningEditor.discardEdits')}
      </button>
    </>
  );
};

HostsYmlButtons.propTypes = {
  yml: ymlShape.isRequired,
};

/**
 * The Hosts.yml tab of the provisioning editor, the whole stored document
 * of `useHostsYml` as YAML over CodeMirror, its Save and Discard in the
 * page's heading pane; the editor is lazy so CodeMirror downloads when
 * the tab opens and never with the page. A refused save draws the
 * agent's own error, a save with advisories lists them, and a 403 says
 * the editor is the manager's alone.
 */
const HostsYmlTab = ({ yml }) => {
  const { t } = useTranslation();
  const { held, dirty, edit, editorRef } = yml;

  return (
    <div data-tab-body="hosts-yml">
      {held.forbidden ? (
        <div className="alert alert-info py-2" role="status" data-note="hosts-yml-forbidden">
          {t('provisioning.hostsYmlModal.managerOnly')}
        </div>
      ) : null}
      {held.error ? (
        <div className="alert alert-danger py-2" role="alert" data-note="hosts-yml-problem">
          {held.error}
        </div>
      ) : null}
      {held.savedNote ? (
        <div className="alert alert-warning py-2" role="status" data-note="hosts-yml-advisories">
          {held.savedNote}
          <ul className="mb-0">
            {held.warnings.map(warning => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </div>
      ) : null}
      {dirty ? (
        <p className="mb-2">
          <span className="badge text-bg-warning" data-note="hosts-yml-dirty">
            {t('provisioning.hostsYmlModal.unsavedChanges')}
          </span>
        </p>
      ) : null}
      {held.forbidden ? null : (
        <>
          <div className="border rounded overflow-hidden">
            <Suspense fallback={<EditorLoading />}>
              <HostsYmlEditor
                ref={editorRef}
                value={held.yaml}
                onChange={edit}
                disabled={held.loading}
              />
            </Suspense>
          </div>
          <p className="form-text text-muted mb-0">
            {t('provisioning.hostsYmlModal.footerExplanation')}
          </p>
        </>
      )}
    </div>
  );
};

HostsYmlTab.propTypes = {
  yml: ymlShape.isRequired,
};

export default HostsYmlTab;
