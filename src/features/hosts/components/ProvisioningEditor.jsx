import PropTypes from 'prop-types';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaCheck } from 'react-icons/fa6';

import TabStrip from '../../../components/common/TabStrip';
import { useStatus } from '../../../contexts/StatusContext';
import {
  fetchProvisionerVersion,
  fetchProvisioners,
  saveProvisionerDocument,
} from '../api/provisioning';
import { useHostRow } from '../hooks/useHostRow';
import { hostHasFeature } from '../utils/capabilities';
import {
  clean,
  invalidNameProblems,
  playbookListsOf,
  roleHintsOf,
  stripTag,
  tagRow,
  tagRows,
  withPlaybookLists,
} from '../utils/provisioning';

import ProvisioningFoldersTab from './ProvisioningFoldersTab';
import ProvisioningHooksTab from './ProvisioningHooksTab';
import ProvisioningPlaybooksTab from './ProvisioningPlaybooksTab';
import ProvisioningRolesTab from './ProvisioningRolesTab';
import ProvisioningScriptsTab from './ProvisioningScriptsTab';
import ProvisioningTransportTab from './ProvisioningTransportTab';
import { VarRowList } from './ProvisioningVarRows';

const TABS = [
  { key: 'folders', labelKey: 'provisioning.provisioningEditor.tabFolders' },
  { key: 'vars', labelKey: 'provisioning.provisioningEditor.tabVariables' },
  { key: 'scripts', labelKey: 'provisioning.provisioningEditor.tabScripts' },
  { key: 'playbooks', labelKey: 'provisioning.provisioningEditor.tabPlaybooks' },
  { key: 'roles', labelKey: 'provisioning.provisioningEditor.tabRoles' },
  { key: 'hooks', labelKey: 'provisioning.provisioningEditor.tabHooks' },
  { key: 'transport', labelKey: 'provisioning.provisioningEditor.tabTransport' },
  { key: 'json', labelKey: 'provisioning.provisioningEditor.tabRawJson' },
];

const JSON_ROWS = 16;

const NO_VERSION = { specs: null, hints: null, candidates: null };

const jsonOf = doc => JSON.stringify(clean(doc), null, 2);

const seedKeyOf = (name, document) => `${name}|${JSON.stringify(document ?? {})}`;

const withKey = (map, key, value) => {
  const next = { ...(map || {}) };
  if (value === undefined) {
    delete next[key];
  } else {
    next[key] = value;
  }
  return next;
};

const listOf = value => (Array.isArray(value) ? value : []);

const useRegistry = ({ status, id, offered, provName, provVersion }) => {
  const [packages, setPackages] = useState({ key: '', rows: null });
  const [version, setVersion] = useState({ key: '', ...NO_VERSION });
  const packagesKey = offered ? String(id) : '';
  const versionKey = offered && provName && provVersion ? `${id}|${provName}|${provVersion}` : '';

  useEffect(() => {
    if (!packagesKey) {
      return undefined;
    }
    let live = true;
    fetchProvisioners(status, id)
      .then(answer => {
        if (live) {
          setPackages({ key: packagesKey, rows: listOf(answer?.provisioners) });
        }
      })
      .catch(() => {
        if (live) {
          setPackages({ key: packagesKey, rows: null });
        }
      });
    return () => {
      live = false;
    };
  }, [status, id, packagesKey]);

  useEffect(() => {
    if (!versionKey) {
      return undefined;
    }
    let live = true;
    fetchProvisionerVersion(status, id, provName, provVersion)
      .then(answer => {
        if (live) {
          setVersion({
            key: versionKey,
            specs: answer?.role_specs?.roles || null,
            hints: roleHintsOf(answer),
            candidates: Array.isArray(answer?.playbook_candidates)
              ? answer.playbook_candidates
              : null,
          });
        }
      })
      .catch(() => {
        if (live) {
          setVersion({ key: versionKey, ...NO_VERSION });
        }
      });
    return () => {
      live = false;
    };
  }, [status, id, provName, provVersion, versionKey]);

  const held = versionKey && version.key === versionKey ? version : NO_VERSION;
  return {
    packages: packagesKey && packages.key === packagesKey ? packages.rows : null,
    specs: held.specs,
    hints: held.hints,
    candidates: held.candidates,
  };
};

const EditorTab = ({ tab, doc, busy, registry, edit }) => {
  const { t } = useTranslation();
  const provName = typeof doc.provisioner_name === 'string' ? doc.provisioner_name : undefined;
  const provVersion =
    typeof doc.provisioner_version === 'string' ? doc.provisioner_version : undefined;

  if (tab === 'folders') {
    return (
      <ProvisioningFoldersTab
        folders={listOf(doc.folders)}
        disabled={busy}
        onChange={next => edit.update({ ...doc, folders: next })}
        makeRow={() => tagRow({ map: '', to: '', type: 'rsync' })}
      />
    );
  }
  if (tab === 'scripts') {
    return (
      <ProvisioningScriptsTab
        shell={doc.provisioning?.shell}
        disabled={busy}
        onChange={next => edit.provisioning('shell', next)}
        makeRow={() => tagRow({ script: '' })}
      />
    );
  }
  if (tab === 'playbooks') {
    return (
      <ProvisioningPlaybooksTab
        playbookLists={playbookListsOf(doc)}
        pathOptions={registry.candidates}
        disabled={busy}
        onChange={next => edit.update(withPlaybookLists(doc, next))}
        makeRow={() => tagRow({ playbook: '', run: 'once' })}
      />
    );
  }
  if (tab === 'hooks') {
    return (
      <ProvisioningHooksTab
        preHooks={listOf(doc.provisioning?.pre)}
        postHooks={listOf(doc.provisioning?.post)}
        onPreChange={next => edit.provisioning('pre', next.length > 0 ? next : undefined)}
        onPostChange={next => edit.provisioning('post', next.length > 0 ? next : undefined)}
        makeRow={() => tagRow({ script: '', target: 'guest', on_failure: 'abort', run: 'always' })}
        disabled={busy}
      />
    );
  }
  if (tab === 'roles') {
    return (
      <ProvisioningRolesTab
        roles={listOf(doc.roles)}
        specs={registry.specs}
        hints={registry.hints}
        disabled={busy}
        onChange={next => edit.update({ ...doc, roles: next })}
        makeRow={(roleName, copyFrom) =>
          copyFrom ? tagRow(stripTag(copyFrom)) : tagRow({ name: roleName || '' })
        }
        packages={registry.packages}
        packageName={provName}
        packageVersion={provVersion}
        onPackagePicked={edit.pickPackage}
      />
    );
  }
  if (tab === 'transport') {
    return (
      <ProvisioningTransportTab settings={doc.settings} disabled={busy} onChange={edit.settings} />
    );
  }
  return (
    <div>
      <p className="form-text text-muted mt-0 mb-2">
        {t('provisioning.provisioningEditor.varsIntro1')} <code>{'{ }'}</code>{' '}
        {t('provisioning.provisioningEditor.varsIntro2')}
      </p>
      <VarRowList
        idPrefix="doc-vars"
        entries={doc.vars || {}}
        disabled={busy}
        onChange={next => edit.update({ ...doc, vars: next })}
        addLabel={t('provisioning.provisioningEditor.addVariable')}
      />
    </div>
  );
};

EditorTab.propTypes = {
  tab: PropTypes.string.isRequired,
  doc: PropTypes.object.isRequired,
  busy: PropTypes.bool.isRequired,
  registry: PropTypes.shape({
    packages: PropTypes.array,
    specs: PropTypes.object,
    hints: PropTypes.object,
    candidates: PropTypes.array,
  }).isRequired,
  edit: PropTypes.shape({
    update: PropTypes.func.isRequired,
    provisioning: PropTypes.func.isRequired,
    settings: PropTypes.func.isRequired,
    pickPackage: PropTypes.func.isRequired,
  }).isRequired,
};

const JsonTab = ({ text, busy, onChange, onApply }) => {
  const { t } = useTranslation();
  return (
    <>
      <textarea
        className="form-control font-monospace"
        rows={JSON_ROWS}
        value={text}
        onChange={event => onChange(event.target.value)}
        disabled={busy}
        aria-label={t('provisioning.provisioningEditor.rawJsonAriaLabel')}
        spellCheck={false}
      />
      <button
        type="button"
        className="btn btn-sm btn-outline-primary mt-2"
        data-action="json-apply"
        onClick={onApply}
      >
        {t('provisioning.provisioningEditor.applyJsonToForm')}
      </button>
    </>
  );
};

JsonTab.propTypes = {
  text: PropTypes.string.isRequired,
  busy: PropTypes.bool.isRequired,
  onChange: PropTypes.func.isRequired,
  onApply: PropTypes.func.isRequired,
};

/**
 * The provisioner document editor of a machine, hyperweaver-ui's inline
 * editor: the stored document, a Hosts.yml host entry, edited structured
 * across the Folders, Variables, Scripts, Playbooks, Roles, Hooks and
 * Transport tabs with Raw JSON the escape hatch, keys no tab covers
 * riding untouched; the Roles catalog reads the package registry while
 * the host lists `provisioner-registry`; Store sends the one request,
 * `PUT machines/{name}` with `provisioner`, refusing only unapplied JSON
 * and names that would break the run, and hands the agent's message to
 * `onSaved`; Discard reseeds from the stored document, which the editor
 * takes again whenever the store's content changes.
 */
const ProvisioningEditor = ({ id, name, document = null, onSaved }) => {
  const { t } = useTranslation();
  const status = useStatus();
  const server = useHostRow(id);
  const seedKey = seedKeyOf(name, document);
  const [seed, setSeed] = useState({ key: seedKey, machine: name });
  const [doc, setDoc] = useState(() => tagRows(document ?? {}));
  const [jsonText, setJsonText] = useState(() => jsonOf(tagRows(document ?? {})));
  const [tab, setTab] = useState('folders');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  if (seed.key !== seedKey) {
    const initial = tagRows(document ?? {});
    setSeed({ key: seedKey, machine: name });
    setDoc(initial);
    setJsonText(jsonOf(initial));
    setError('');
    if (seed.machine !== name) {
      setTab('folders');
    }
  }

  const registry = useRegistry({
    status,
    id,
    offered: hostHasFeature(server, 'provisioner-registry'),
    provName: typeof doc.provisioner_name === 'string' ? doc.provisioner_name : '',
    provVersion: typeof doc.provisioner_version === 'string' ? doc.provisioner_version : '',
  });

  const update = next => {
    setDoc(next);
    setJsonText(jsonOf(next));
  };

  const edit = {
    update,
    provisioning: (key, value) =>
      update({ ...doc, provisioning: withKey(doc.provisioning, key, value) }),
    settings: (key, value) => update({ ...doc, settings: withKey(doc.settings, key, value) }),
    pickPackage: (packageName, packageVersion) => {
      const next = { ...doc };
      if (packageName) {
        next.provisioner_name = packageName;
        next.provisioner_version = packageVersion;
      } else {
        delete next.provisioner_name;
        delete next.provisioner_version;
      }
      update(next);
    },
  };

  const applyJson = () => {
    try {
      update(tagRows(JSON.parse(jsonText)));
      setError('');
    } catch (problem) {
      setError(t('provisioning.provisioningEditor.notValidJson', { message: problem.message }));
    }
  };

  const discard = () => {
    update(tagRows(document ?? {}));
    setError('');
  };

  const store = async () => {
    if (tab === 'json' && jsonText !== jsonOf(doc)) {
      setError(t('provisioning.provisioningEditor.applyJsonFirst'));
      return;
    }
    const problems = invalidNameProblems(clean(doc), t);
    if (problems.length > 0) {
      setError(
        t('provisioning.provisioningEditor.fixInvalidNames', { problems: problems.join(', ') })
      );
      return;
    }
    setBusy(true);
    setError('');
    try {
      const answer = await saveProvisionerDocument(status, id, name, clean(doc));
      onSaved(answer?.message || t('provisioning.provisioningEditor.documentStored'));
    } catch (problem) {
      setError(problem.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div data-panel="provisioning-editor">
      {error ? (
        <div className="alert alert-danger py-2" role="alert" data-note="editor-problem">
          {error}
        </div>
      ) : null}

      <TabStrip
        className="mb-3"
        tabs={TABS.map(entry => ({ key: entry.key, label: t(entry.labelKey) }))}
        active={tab}
        onSelect={setTab}
      />

      {tab === 'json' ? (
        <JsonTab text={jsonText} busy={busy} onChange={setJsonText} onApply={applyJson} />
      ) : (
        <EditorTab tab={tab} doc={doc} busy={busy} registry={registry} edit={edit} />
      )}

      <div className="d-flex gap-2 mt-3 border-top pt-3">
        <button
          type="button"
          className="btn btn-primary"
          data-action="document-store"
          onClick={store}
          disabled={busy}
        >
          {busy ? (
            <span className="spinner-border spinner-border-sm me-2" aria-hidden="true" />
          ) : (
            <FaCheck className="me-2" aria-hidden="true" />
          )}
          {t('provisioning.provisioningEditor.storeDocument')}
        </button>
        <button
          type="button"
          className="btn btn-outline-secondary"
          data-action="document-discard"
          onClick={discard}
          disabled={busy}
        >
          {t('provisioning.provisioningEditor.discardEdits')}
        </button>
      </div>
    </div>
  );
};

ProvisioningEditor.propTypes = {
  id: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  document: PropTypes.object,
  onSaved: PropTypes.func.isRequired,
};

export default ProvisioningEditor;
