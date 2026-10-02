import PropTypes from 'prop-types';
import { Suspense, lazy, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useStatus } from '../../../contexts/StatusContext';
import { fetchHostsYml, saveHostsYml } from '../api/provisioning';
import { yamlProblemPosition, yamlProblemText } from '../utils/provisioning';

import ToolFormDialog from './ToolFormDialog';

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
 * The raw Hosts.yml dialog of a machine, hyperweaver-ui's emergency
 * hatch over our form dialog: the whole stored document as YAML, read by
 * `GET machines/{name}/hosts-yml` on open and saved verbatim by
 * `PUT machines/{name}/hosts-yml`, the editor lazy so CodeMirror
 * downloads when the dialog opens and never with the page; a refused
 * save draws the agent's own error and lands the cursor on the line it
 * names, a save with advisories keeps the dialog open and lists them,
 * and a 403 says the editor is the manager's alone.
 */
const HostsYmlModal = ({ id, name, onClose, onSaved }) => {
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
      onSaved(t('provisioning.hostsYmlModal.documentSaved', { machineName: name }));
      if (advisories.length > 0) {
        setHeld(previous => ({
          ...previous,
          loading: false,
          original: previous.yaml,
          warnings: advisories,
          savedNote: t('provisioning.hostsYmlModal.savedWithAdvisories'),
        }));
        return;
      }
      onClose();
    } catch (error) {
      setHeld(previous => ({ ...previous, loading: false, error: yamlProblemText(error, t) }));
      const position = yamlProblemPosition(error);
      if (position) {
        editorRef.current?.jumpTo(position.line, position.column);
      }
    }
  };

  return (
    <ToolFormDialog
      dialog="hosts-yml"
      title={t('provisioning.hostsYmlModal.modalTitle', { machineName: name })}
      submitKey="provisioning.hostsYmlModal.saveButton"
      busy={held.loading || held.forbidden}
      onClose={onClose}
      onSubmit={save}
    >
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
    </ToolFormDialog>
  );
};

HostsYmlModal.propTypes = {
  id: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  onClose: PropTypes.func.isRequired,
  onSaved: PropTypes.func.isRequired,
};

export default HostsYmlModal;
