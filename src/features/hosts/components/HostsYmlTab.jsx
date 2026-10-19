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
 * The Hosts.yml tab of the provisioning editor, the whole stored document
 * as YAML over CodeMirror: read by `GET machines/{name}/hosts-yml` each
 * time the tab opens and saved verbatim by `PUT machines/{name}/hosts-yml`
 * with the tab's own Save, Discard taking the text read back; the editor
 * is lazy so CodeMirror downloads when the tab opens and never with the
 * page. A refused save draws the agent's own error and lands the cursor on
 * the line it names, a save with advisories lists them, and a 403 says
 * the editor is the manager's alone. `onSaved` is handed the notice's
 * sentence after a save.
 */
const HostsYmlTab = ({ id, name, onSaved }) => {
  const { t } = useTranslation();
  const status = useStatus();
  const [held, setHeld] = useState(OPENING);
  const editorRef = useRef(null);

  useEffect(() => {
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
  }, [status, id, name, t]);

  const dirty = held.yaml !== held.original;

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
                onChange={yaml => setHeld(previous => ({ ...previous, yaml }))}
                disabled={held.loading}
              />
            </Suspense>
          </div>
          <p className="form-text text-muted mb-0">
            {t('provisioning.hostsYmlModal.footerExplanation')}
          </p>
        </>
      )}
      <div className="d-flex gap-2 mt-3 border-top pt-3">
        <button
          type="button"
          className="btn btn-primary"
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
          className="btn btn-outline-secondary"
          data-action="hosts-yml-discard"
          onClick={discard}
          disabled={held.loading || held.forbidden || !dirty}
        >
          {t('provisioning.provisioningEditor.discardEdits')}
        </button>
      </div>
    </div>
  );
};

HostsYmlTab.propTypes = {
  id: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  onSaved: PropTypes.func.isRequired,
};

export default HostsYmlTab;
