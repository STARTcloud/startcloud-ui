import PropTypes from 'prop-types';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaCheck } from 'react-icons/fa6';

import TabStrip from '../../../components/common/TabStrip';
import { useNotify } from '../../../contexts/NoticeContext';
import { useStatus } from '../../../contexts/StatusContext';
import { useNavbarSearchBinding } from '../../../hooks/useSearchBinding';
import {
  fetchArtifacts,
  fetchMissingArtifact,
  fetchProvisionerVersion,
  fetchProvisioners,
  saveProvisionerDocument,
} from '../api/provisioning';
import { useTaskFollow } from '../hooks/useHostManage';
import { useHostRow } from '../hooks/useHostRow';
import { readSecretRowsOf } from '../hooks/useHostSecrets';
import { hostHasFeature } from '../utils/capabilities';
import { queuedTaskOf } from '../utils/machineTools';
import {
  dslConfiguration,
  hypervisorRowsOf,
  seedSecretAnswers,
} from '../utils/provisionerFieldDsl';
import {
  clean,
  invalidNameProblems,
  manifestRolesOf,
  playbookListsOf,
  roleHintsOf,
  roleSearchCounts,
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

const NO_VERSION = { specs: null, hints: null, manifest: [], candidates: null, config: null };

const NO_DOWNLOADS = {};

const NO_VARS = {};

const NO_GROUPS = [];

const clearNothing = () => undefined;

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

const useRegistry = ({ status, id, offered, cached, provName, provVersion }) => {
  const [packages, setPackages] = useState({ key: '', rows: null });
  const [version, setVersion] = useState({ key: '', ...NO_VERSION });
  const [artifacts, setArtifacts] = useState({ key: '', rows: null });
  const packagesKey = offered ? String(id) : '';
  const versionKey = offered && provName && provVersion ? `${id}|${provName}|${provVersion}` : '';
  const artifactsKey = cached ? String(id) : '';

  const loadArtifacts = useCallback(() => {
    if (!artifactsKey) {
      return Promise.resolve(null);
    }
    return fetchArtifacts(status, id).then(
      answer => setArtifacts({ key: artifactsKey, rows: listOf(answer?.artifacts) }),
      () => setArtifacts({ key: artifactsKey, rows: null })
    );
  }, [status, id, artifactsKey]);

  useEffect(() => {
    loadArtifacts();
  }, [loadArtifacts]);

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
            hints: roleHintsOf(answer?.metadata),
            manifest: manifestRolesOf(answer?.metadata),
            candidates: Array.isArray(answer?.playbook_candidates)
              ? answer.playbook_candidates
              : null,
            config: dslConfiguration(answer?.metadata),
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
    manifest: held.manifest,
    candidates: held.candidates,
    config: held.config,
    artifacts: artifactsKey && artifacts.key === artifactsKey ? artifacts.rows : null,
    loadArtifacts,
  };
};

const useDownloads = ({ status, id, onLanded }) => {
  const { t } = useTranslation();
  const notify = useNotify();
  const [queued, setQueued] = useState(NO_DOWNLOADS);
  const follow = useTaskFollow({
    id,
    onEnd: row => {
      setQueued(current =>
        Object.fromEntries(
          Object.entries(current).filter(([, entry]) => String(entry.task_id) !== String(row.id))
        )
      );
      if (row.status === 'completed') {
        onLanded();
        return;
      }
      notify(
        'danger',
        t('provisioning.provisioningRolesTab.downloadFailed', {
          message: row.error_message || row.status,
        })
      );
    },
  });
  const fetch = useCallback(
    (artifact, key) =>
      fetchMissingArtifact(status, id, artifact.id).then(
        answer => {
          const row = queuedTaskOf(answer, '');
          setQueued(current => ({
            ...current,
            [key]: {
              task_id: String(row?.id || answer?.task_id || ''),
              artifact_id: String(artifact.id),
            },
          }));
          follow(answer);
          notify(
            'success',
            t('provisioning.provisioningRolesTab.downloadQueuedNotice', {
              filename: artifact.filename,
            })
          );
        },
        error =>
          notify(
            'danger',
            t('provisioning.provisioningRolesTab.downloadFailed', { message: error.message })
          )
      ),
    [status, id, follow, notify, t]
  );
  return { queued, fetch };
};

const SearchedRolesTab = ({ roles, specs = null, manifest, ...rest }) => {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const { matched, total } = roleSearchCounts({
    specs,
    roles,
    manifest,
    needle: query.trim().toLowerCase(),
  });

  useNavbarSearchBinding({
    query,
    onQueryChange: setQuery,
    placeholder: t('provisioning.provisioningRolesTab.searchRolesPlaceholder'),
    matched,
    total,
    groups: NO_GROUPS,
    onClearFilters: clearNothing,
  });

  return (
    <ProvisioningRolesTab roles={roles} specs={specs} manifest={manifest} {...rest} query={query} />
  );
};

SearchedRolesTab.propTypes = {
  roles: PropTypes.array.isRequired,
  specs: PropTypes.object,
  manifest: PropTypes.array.isRequired,
};

const EditorTab = ({ tab, doc, busy, registry, edit, downloads, fields, onRun }) => {
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
        onRun={onRun}
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
        onRun={onRun}
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
      <SearchedRolesTab
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
        manifest={registry.manifest}
        artifacts={registry.artifacts}
        queued={downloads.queued}
        onFetch={downloads.fetch}
        fieldConfig={registry.config}
        answers={doc.vars || NO_VARS}
        onAnswerChange={(name, value) =>
          edit.update({ ...doc, vars: { ...(doc.vars || NO_VARS), [name]: value } })
        }
        inventory={fields.inventory}
        onArtifactsReload={registry.loadArtifacts}
        host={fields.host}
        onRun={onRun}
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
    manifest: PropTypes.array.isRequired,
    candidates: PropTypes.array,
    config: PropTypes.object,
    artifacts: PropTypes.array,
    loadArtifacts: PropTypes.func.isRequired,
  }).isRequired,
  edit: PropTypes.shape({
    update: PropTypes.func.isRequired,
    provisioning: PropTypes.func.isRequired,
    settings: PropTypes.func.isRequired,
    pickPackage: PropTypes.func.isRequired,
  }).isRequired,
  downloads: PropTypes.shape({
    queued: PropTypes.object.isRequired,
    fetch: PropTypes.func.isRequired,
  }).isRequired,
  fields: PropTypes.shape({
    inventory: PropTypes.object.isRequired,
    host: PropTypes.object.isRequired,
  }).isRequired,
  onRun: PropTypes.func,
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
 * riding untouched; the Roles tab is the one roles editor the create
 * wizard draws, its catalog, the manifest's roles, their defaults and
 * their argument specs read from the package registry while the host
 * lists `provisioner-registry`, the host's artifact rows read while it
 * lists `artifacts` and read again when a queued download of a missing
 * file ends, the package's role-attached field groups drawn in each
 * card over the document's `vars`, a `file` field picked through the
 * artifact pick dialog, a `secret` field through the secret pick dialog
 * and preselected into `vars` as the package's detail answers, through
 * `seedSecretAnswers` over one read of the host's store a kind, a var
 * the document holds never overwritten; Store sends the one request, `PUT machines/{name}` with
 * `provisioner`, refusing only unapplied JSON and names that would break
 * the run, and hands the agent's message to `onSaved`; Discard reseeds
 * from the stored document, which the editor takes again whenever the
 * store's content changes. While the Roles tab draws, the navbar search
 * narrows its catalog and its run by name and description. Where `onRun`
 * is given each role, script and playbook card draws the play glyph that
 * hands `onRun` the narrowing of one run, `{ roles: [name] }`,
 * `{ scripts: [path] }` or `{ playbook: path }`.
 */
const ProvisioningEditor = ({ id, name, document = null, onSaved, onRun = null }) => {
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
    cached: hostHasFeature(server, 'artifacts'),
    provName: typeof doc.provisioner_name === 'string' ? doc.provisioner_name : '',
    provVersion: typeof doc.provisioner_version === 'string' ? doc.provisioner_version : '',
  });
  const downloads = useDownloads({ status, id, onLanded: registry.loadArtifacts });
  const docRef = useRef(doc);

  useEffect(() => {
    docRef.current = doc;
  }, [doc]);

  const update = next => {
    setDoc(next);
    setJsonText(jsonOf(next));
  };

  const { config } = registry;

  useEffect(() => {
    if (!config) {
      return undefined;
    }
    let live = true;
    readSecretRowsOf(status, id, config).then(rows => {
      if (!live) {
        return;
      }
      const seeded = seedSecretAnswers(config, rows);
      if (Object.keys(seeded).length === 0) {
        return;
      }
      const held = docRef.current;
      const next = { ...held, vars: { ...seeded, ...(held.vars || NO_VARS) } };
      setDoc(next);
      setJsonText(jsonOf(next));
    });
    return () => {
      live = false;
    };
  }, [config, status, id]);

  const fields = {
    inventory: { hypervisor: hypervisorRowsOf(server?.capabilities?.hypervisors) },
    host: { status, hostId: id, server },
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
        <EditorTab
          tab={tab}
          doc={doc}
          busy={busy}
          registry={registry}
          edit={edit}
          downloads={downloads}
          fields={fields}
          onRun={onRun}
        />
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
  onRun: PropTypes.func,
};

export default ProvisioningEditor;
