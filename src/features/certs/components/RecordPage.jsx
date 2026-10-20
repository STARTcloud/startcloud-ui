import PropTypes from 'prop-types';
import { useEffect, useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  FaDownload,
  FaEye,
  FaEyeSlash,
  FaPenToSquare,
  FaRightLeft,
  FaTrash,
} from 'react-icons/fa6';
import { Link, useNavigate } from 'react-router-dom';

import ConfirmModal from '../../../components/common/ConfirmModal';
import CopyButton from '../../../components/common/CopyButton';
import EmptyState from '../../../components/common/EmptyState';
import FormErrorSummary from '../../../components/common/FormErrorSummary';
import RecordRows from '../../../components/common/RecordRows';
import SectionHeading from '../../../components/common/SectionHeading';
import { StatusMenu, VisibilityMenu } from '../../../components/common/VisibilityPicker';
import { useNotify } from '../../../contexts/NoticeContext';
import { useFormRules } from '../../../hooks/useFormRules';
import { usePageName } from '../../../hooks/usePageName';
import { pageContextShape } from '../../../utils/itemShape';
import { canManageRecord } from '../../../utils/permissions';
import { useBuiltChain } from '../hooks/useBuiltChain';
import { useRecordActions } from '../hooks/useRecordActions';
import { useStoreWrites } from '../hooks/useStoreWrites';
import { useVault } from '../hooks/useVault';
import {
  PRIVATE_MEMBERS,
  SECRET_MEMBERS,
  derOf,
  isSecretKind,
  kindOf,
  nameOf,
  nowOf,
  recordPath,
  recordStatus,
  relationships,
} from '../utils/records';
import { DETAILS_LABELS, DETAILS_SCHEMA, OUTPUT_LABELS, OUTPUT_SCHEMA } from '../utils/schemas';

import CertFacts from './CertFacts';
import ChainView from './ChainView';
import { TextAreaField, TextField } from './fields';
import FormatPicker, { EMPTY_OUTPUT } from './FormatPicker';
import RecordHistory from './RecordHistory';
import SecretRecordModal, { tagsOfText } from './SecretRecordModal';
import VaultTreeDialogs from './VaultTreeDialogs';

const MASK = '••••••••';

const CHAINED = ['certificate', 'authority'];

const PANE_BUTTON = 'btn btn-sm btn-outline-secondary';

const PRE_CLASS = 'font-monospace small border rounded p-3 flex-grow-1 mb-0';

const recordLink = record => <Link to={recordPath(record)}>{nameOf(record)}</Link>;

const recordLinks = records =>
  records.map((record, index) => (
    <span key={record.id}>
      {index > 0 ? ', ' : ''}
      {recordLink(record)}
    </span>
  ));

const detailRows = (record, t) =>
  [
    { key: 'name', label: t('certs.record.name'), value: nameOf(record) },
    { key: 'tags', label: t('certs.record.tags'), value: (record.tags || []).join(', ') },
    { key: 'notes', label: t('certs.record.notes'), value: record.notes || '' },
  ].filter(row => row.value);

const DetailsForm = ({ record, formId, onSave }) => {
  const [draft, setDraft] = useState({
    name: record.name,
    tags: (record.tags || []).join(', '),
    notes: record.notes || '',
  });
  const rules = useFormRules({
    schema: DETAILS_SCHEMA,
    values: draft,
    labels: DETAILS_LABELS,
    idPrefix: 'certs-details',
  });
  const set = (name, value) => setDraft(current => ({ ...current, [name]: value }));

  const submit = event => {
    event.preventDefault();
    if (!rules.validateAll()) {
      return;
    }
    onSave({
      name: draft.name.trim(),
      tags: tagsOfText(draft.tags),
      notes: draft.notes,
    });
  };

  return (
    <form id={formId} onSubmit={submit} noValidate>
      <FormErrorSummary errors={rules.summary} />
      <TextField name="name" draft={draft} rules={rules} onChange={set} />
      <TextField name="tags" draft={draft} rules={rules} onChange={set} />
      <TextAreaField name="notes" draft={draft} rules={rules} onChange={set} />
    </form>
  );
};

DetailsForm.propTypes = {
  record: PropTypes.object.isRequired,
  formId: PropTypes.string.isRequired,
  onSave: PropTypes.func.isRequired,
};

const DetailsSection = ({ record, editing, formId, onSave }) => {
  const { t } = useTranslation();
  return (
    <div className="mb-4" data-panel="record-details">
      <SectionHeading title={t('certs.record.details')} />
      {editing ? (
        <DetailsForm record={record} formId={formId} onSave={onSave} />
      ) : (
        <RecordRows rows={detailRows(record, t)} />
      )}
    </div>
  );
};

DetailsSection.propTypes = {
  record: PropTypes.object.isRequired,
  editing: PropTypes.bool.isRequired,
  formId: PropTypes.string.isRequired,
  onSave: PropTypes.func.isRequired,
};

const templateRows = (template, t) => [
  {
    key: 'subject',
    label: t('certs.facts.subject'),
    value: Object.entries(template.subject || {})
      .map(([field, value]) => `${field}=${value}`)
      .join(', '),
  },
  {
    key: 'sans',
    label: t('certs.facts.sans'),
    value: (template.sans || []).map(san => `${san.kind}:${san.value}`).join(', '),
  },
  {
    key: 'eku',
    label: t('certs.facts.extKeyUsage'),
    value: (template.ext_key_usage || []).join(', '),
  },
  { key: 'days', label: t('certs.generate.days'), value: String(template.days || '') },
  {
    key: 'is_ca',
    label: t('certs.generate.authority'),
    value: t(template.is_ca ? 'certs.facts.yes' : 'certs.facts.no'),
  },
  { key: 'alg', label: t('certs.generate.algorithm'), value: template.alg || '' },
];

const TemplateSection = ({ record }) => {
  const { t } = useTranslation();
  return (
    <div className="mb-4" data-panel="record-template">
      <SectionHeading title={t('certs.record.template')} />
      <RecordRows rows={templateRows(record.template || {}, t).filter(row => row.value)} />
    </div>
  );
};

TemplateSection.propTypes = {
  record: PropTypes.object.isRequired,
};

const secretRows = (record, t) => {
  const members =
    record.kind === 'custom' ? Object.keys(record.secret || {}) : SECRET_MEMBERS[record.kind] || [];
  return [
    ...(record.profile
      ? [
          {
            key: 'profile',
            label: t('certs.secret.profile'),
            value: t(`certs.profile.${record.profile}.label`),
          },
        ]
      : []),
    ...members
      .filter(member => record.secret?.[member] !== undefined && record.secret?.[member] !== '')
      .map(member => ({
        key: member,
        label: record.kind === 'custom' ? member : t(`certs.secret.member.${member}`),
        value:
          record.kind === 'custom' || PRIVATE_MEMBERS.includes(member) ? (
            <code>{MASK}</code>
          ) : (
            String(record.secret[member])
          ),
      })),
    ...Object.entries(record.extra || {}).map(([name, value]) => ({
      key: `extra-${name}`,
      label: name,
      value: String(value),
    })),
  ];
};

const SecretSection = ({ record }) => {
  const { t } = useTranslation();
  return (
    <div className="mb-4" data-panel="record-secret">
      <SectionHeading title={t('certs.record.secret')} />
      <RecordRows rows={secretRows(record, t)} />
    </div>
  );
};

SecretSection.propTypes = {
  record: PropTypes.object.isRequired,
};

const relatedRows = (related, t) =>
  [
    ['issuer', 'certs.record.issuer', related.issuer ? recordLink(related.issuer) : null],
    ['request', 'certs.record.request', related.request ? recordLink(related.request) : null],
    ['key', 'certs.record.key', related.key ? recordLink(related.key) : null],
    ['issued', 'certs.record.issued', related.issued.length ? recordLinks(related.issued) : null],
    [
      'signedWith',
      'certs.record.signedWith',
      related.signedWith.length ? recordLinks(related.signedWith) : null,
    ],
  ]
    .filter(([, , value]) => value)
    .map(([key, labelKey, value]) => ({ key, label: t(labelKey), value }));

const RelatedSection = ({ related }) => {
  const { t } = useTranslation();
  const rows = relatedRows(related, t);
  if (rows.length === 0) {
    return null;
  }
  return (
    <div className="mb-4" data-panel="record-related">
      <SectionHeading title={t('certs.record.related')} />
      <RecordRows rows={rows} />
    </div>
  );
};

RelatedSection.propTypes = {
  related: PropTypes.object.isRequired,
};

const ChainSection = ({ record, authorities, chain }) => {
  const { t } = useTranslation();
  if (!chain) {
    return null;
  }
  const own = chain.order.filter(index => index === 0 || chain.hops.some(hop => hop.to === index));
  const records = [record, ...authorities];
  return (
    <div className="mb-4" data-panel="record-chain">
      <SectionHeading title={t('certs.record.chain')} />
      <ChainView
        chain={{ order: own, hops: chain.hops }}
        labels={records.map(nameOf)}
        paths={records.map(recordPath)}
      />
    </div>
  );
};

ChainSection.propTypes = {
  record: PropTypes.object.isRequired,
  authorities: PropTypes.array.isRequired,
  chain: PropTypes.object,
};

const KeySection = ({ record, keyRecord, actions }) => {
  const { t } = useTranslation();
  const notify = useNotify();
  const [pem, setPem] = useState('');
  const held = record.kind === 'key' ? record : keyRecord;
  const present = Boolean(held?.private_der_b64);

  const view = async () => {
    if (pem) {
      setPem('');
      return;
    }
    try {
      setPem(await actions.asText(held, { to: 'pkcs8' }));
    } catch (error) {
      notify('danger', t('certs.notice.engineFailed', { message: error.message }));
    }
  };

  return (
    <div className="mb-4" data-panel="record-key">
      <SectionHeading
        title={t('certs.record.key')}
        count={t(present ? 'certs.record.keyPresent' : 'certs.record.keyAbsent')}
        state={present ? 'success' : 'warning'}
        actions={
          present ? (
            <>
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary"
                data-action="view-key"
                onClick={view}
              >
                {pem ? (
                  <FaEyeSlash className="me-1" aria-hidden="true" />
                ) : (
                  <FaEye className="me-1" aria-hidden="true" />
                )}
                {t(pem ? 'certs.record.hideKey' : 'certs.record.viewKey')}
              </button>
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary"
                data-action="download-key"
                onClick={() => actions.convertTo(held, { to: 'pkcs8' })}
              >
                <FaDownload className="me-1" aria-hidden="true" />
                {t('certs.record.downloadPem')}
              </button>
            </>
          ) : null
        }
      />
      {pem ? (
        <div className="d-flex align-items-start gap-2">
          <pre className={PRE_CLASS}>{pem}</pre>
          <CopyButton text={pem} className="btn btn-sm btn-outline-secondary" />
        </div>
      ) : null}
    </div>
  );
};

KeySection.propTypes = {
  record: PropTypes.object.isRequired,
  keyRecord: PropTypes.object,
  actions: PropTypes.object.isRequired,
};

const ExportSection = ({ record, keyRecord, issuers, actions }) => {
  const { t } = useTranslation();
  const formId = useId();
  const [output, setOutput] = useState(EMPTY_OUTPUT);
  const rules = useFormRules({
    schema: OUTPUT_SCHEMA,
    values: output,
    labels: OUTPUT_LABELS,
    idPrefix: 'certs-export',
  });
  const kinds = [kindOf(record), ...(keyRecord?.private_der_b64 ? ['key'] : [])];

  const submit = event => {
    event.preventDefault();
    if (rules.validateAll()) {
      actions.convertTo(record, { ...output, key: keyRecord, issuers });
    }
  };

  const convert = (
    <button
      type="submit"
      form={formId}
      className="btn btn-sm btn-primary"
      data-action="convert-download"
    >
      <FaRightLeft className="me-1" aria-hidden="true" />
      {t('certs.record.convertDownload')}
    </button>
  );

  return (
    <div className="mb-4" data-panel="record-export">
      <SectionHeading title={t('certs.record.export')} actions={convert} />
      <form id={formId} onSubmit={submit} noValidate>
        <FormErrorSummary errors={rules.summary} />
        <FormatPicker
          kinds={kinds}
          draft={output}
          rules={rules}
          onChange={patch => setOutput(current => ({ ...current, ...patch }))}
        />
      </form>
    </div>
  );
};

ExportSection.propTypes = {
  record: PropTypes.object.isRequired,
  keyRecord: PropTypes.object,
  issuers: PropTypes.array.isRequired,
  actions: PropTypes.object.isRequired,
};

const headingCount = (record, thresholdDays, t) => {
  const status = recordStatus(record, nowOf(), thresholdDays);
  return [t(`certs.kind.${record.kind}`), status ? t(`certs.status.${status}`) : '']
    .filter(Boolean)
    .join(' · ');
};

const managesSynced = (record, user) =>
  Boolean(record.remote_id) && canManageRecord(user, record.organization, record);

const accessOf = body =>
  Object.fromEntries(Object.entries(body).filter(([word]) => word !== 'recursive'));

const EditActions = ({ editing, formId, onEdit, onCancel }) => {
  const { t } = useTranslation();
  if (!editing) {
    return (
      <button key="edit" type="button" className={PANE_BUTTON} data-action="edit" onClick={onEdit}>
        <FaPenToSquare className="me-1" aria-hidden="true" />
        {t('certs.actions.edit')}
      </button>
    );
  }
  return (
    <>
      <button
        key="save"
        type="submit"
        form={formId}
        className="btn btn-sm btn-primary"
        data-action="save"
      >
        {t('certs.record.save')}
      </button>
      <button type="button" className={PANE_BUTTON} data-action="cancel" onClick={onCancel}>
        {t('pages.confirm.cancel')}
      </button>
    </>
  );
};

EditActions.propTypes = {
  editing: PropTypes.bool.isRequired,
  formId: PropTypes.string.isRequired,
  onEdit: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
};

const PaneActions = ({ record, actions, manage, edit, onDelete, onRemove, onAccess }) => {
  const { t } = useTranslation();
  return (
    <>
      {edit}
      {manage ? (
        <VisibilityMenu
          current={{
            is_public: Boolean(record.is_public),
            guest_access: Boolean(record.guest_access),
          }}
          className={PANE_BUTTON}
          onPick={body => onAccess(accessOf(body))}
        />
      ) : null}
      {manage ? (
        <StatusMenu
          published={Boolean(record.published)}
          className={PANE_BUTTON}
          onPick={body => onAccess(accessOf(body))}
        />
      ) : null}
      {isSecretKind(record.kind) ? null : (
        <>
          <button
            type="button"
            className={PANE_BUTTON}
            data-action="download"
            onClick={() => actions.download(record)}
          >
            <FaDownload className="me-1" aria-hidden="true" />
            {t('certs.actions.download')}
          </button>
          <button
            type="button"
            className={PANE_BUTTON}
            data-action="convert"
            onClick={() => actions.convert(record)}
          >
            <FaRightLeft className="me-1" aria-hidden="true" />
            {t('certs.actions.convert')}
          </button>
        </>
      )}
      <button
        type="button"
        className="btn btn-sm btn-danger"
        data-action="delete"
        onClick={onDelete}
      >
        <FaTrash className="me-1" aria-hidden="true" />
        {t('certs.actions.delete')}
      </button>
      {manage ? (
        <button
          type="button"
          className="btn btn-sm btn-outline-danger"
          data-action="remove-from"
          onClick={onRemove}
        >
          {t('certs.actions.removeFrom', { organization: record.organization })}
        </button>
      ) : null}
    </>
  );
};

PaneActions.propTypes = {
  record: PropTypes.object.isRequired,
  actions: PropTypes.object.isRequired,
  manage: PropTypes.bool.isRequired,
  edit: PropTypes.node.isRequired,
  onDelete: PropTypes.func.isRequired,
  onRemove: PropTypes.func.isRequired,
  onAccess: PropTypes.func.isRequired,
};

const RecordSections = ({
  record,
  context,
  related,
  authorities,
  built,
  actions,
  save,
  saveDetails,
  editing,
  formId,
}) => {
  const { t } = useTranslation();
  const vault = useVault();
  const prefsKey = `${context.prefsPrefix}_certs_record`;
  const thresholdDays = vault.preferences.threshold_days;
  const chained = CHAINED.includes(record.kind) && Boolean(derOf(record));
  const secret = isSecretKind(record.kind);
  return (
    <>
      <DetailsSection
        key={record.updated_at}
        record={record}
        editing={editing && !secret}
        formId={formId}
        onSave={saveDetails}
      />
      {secret ? <SecretSection record={record} /> : null}
      {record.kind === 'template' ? <TemplateSection record={record} /> : null}
      {record.facts ? (
        <div className="mb-4" data-panel="record-facts">
          <SectionHeading title={t('certs.record.facts')} />
          <CertFacts facts={record.facts} />
        </div>
      ) : null}
      <RelatedSection related={related} />
      {chained ? (
        <ChainSection record={record} authorities={authorities} chain={built.chain} />
      ) : null}
      {record.kind !== 'template' && !secret ? (
        <KeySection record={record} keyRecord={related.key} actions={actions} />
      ) : null}
      {chained ? (
        <RecordHistory
          record={record}
          thresholdDays={thresholdDays}
          prefsKey={prefsKey}
          onUpdate={save}
        />
      ) : null}
      {derOf(record) ? (
        <ExportSection
          record={record}
          keyRecord={related.key}
          issuers={built.issuers}
          actions={actions}
        />
      ) : null}
    </>
  );
};

RecordSections.propTypes = {
  record: PropTypes.object.isRequired,
  context: pageContextShape.isRequired,
  related: PropTypes.object.isRequired,
  authorities: PropTypes.array.isRequired,
  built: PropTypes.object.isRequired,
  actions: PropTypes.object.isRequired,
  save: PropTypes.func.isRequired,
  saveDetails: PropTypes.func.isRequired,
  editing: PropTypes.bool.isRequired,
  formId: PropTypes.string.isRequired,
};

const RecordBody = ({ record, context }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const notify = useNotify();
  const vault = useVault();
  const actions = useRecordActions();
  const store = useStoreWrites();
  const formId = useId();
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [removing, setRemoving] = useState(false);
  const thresholdDays = vault.preferences.threshold_days;
  const secret = isSecretKind(record.kind);
  const related = relationships(record, vault.records);
  const authorities = vault.records.filter(
    entry => entry.kind === 'authority' && entry.id !== record.id && derOf(entry)
  );
  const built = useBuiltChain(record, authorities);
  usePageName(nameOf(record));

  useEffect(() => {
    document.title = `${nameOf(record)} · ${context.appName}`;
  }, [record, context.appName]);

  const save = patch =>
    vault.update(record, patch).then(() => notify('success', t('certs.notice.saved')));

  const saveEdit = patch => save(patch).then(() => setEditing(false));

  const edit = (
    <EditActions
      editing={editing && !secret}
      formId={formId}
      onEdit={() => setEditing(true)}
      onCancel={() => setEditing(false)}
    />
  );

  const pane = (
    <PaneActions
      record={record}
      actions={actions}
      manage={managesSynced(record, context.user)}
      edit={edit}
      onDelete={() => setDeleting(true)}
      onRemove={() => setRemoving(true)}
      onAccess={patch => store.setAccess(record, patch)}
    />
  );

  return (
    <div className="list row" data-page="certs-record">
      <SectionHeading
        title={nameOf(record)}
        count={headingCount(record, thresholdDays, t)}
        actions={pane}
      />
      <RecordSections
        record={record}
        context={context}
        related={related}
        authorities={authorities}
        built={built}
        actions={actions}
        save={save}
        saveDetails={saveEdit}
        editing={editing}
        formId={formId}
      />
      {editing && secret ? (
        <SecretRecordModal record={record} onSave={saveEdit} onClose={() => setEditing(false)} />
      ) : null}
      <VaultTreeDialogs
        target={deleting ? record : null}
        records={vault.records}
        onClose={() => setDeleting(false)}
        onRemove={() => {
          actions.remove(record).then(() => navigate('/certs', { state: { focusHeading: true } }));
        }}
      />
      <ConfirmModal
        show={removing}
        handleClose={() => setRemoving(false)}
        handleConfirm={() => store.removeFromStore(record)}
        title={t('certs.confirm.removeFromTitle', { organization: record.organization })}
        message={t('certs.confirm.removeFromMessage', {
          name: nameOf(record),
          organization: record.organization,
        })}
        keyword="remove"
        confirmText={t('certs.actions.removeFrom', { organization: record.organization })}
      />
    </div>
  );
};

RecordBody.propTypes = {
  record: PropTypes.object.isRequired,
  context: pageContextShape.isRequired,
};

const NotFound = ({ context }) => {
  const { t } = useTranslation();
  useEffect(() => {
    document.title = `${t('pages.notFound')} · ${context.appName}`;
  }, [context.appName, t]);
  return (
    <div className="list row">
      <EmptyState title={t('pages.notFound')} />
    </div>
  );
};

NotFound.propTypes = {
  context: pageContextShape.isRequired,
};

/**
 * One record at `/certs/{id}`, every kind alike: one heading, the name
 * as its title with the kind and the expiry status as the muted text
 * after it, its pane carrying Edit, Save and Cancel while editing, the
 * visibility step and Publish / Unpublish while the store holds the
 * record and `canManageRecord` says the person may change it, each one
 * PUT, then Download, Convert, Delete behind the typed confirmation (the
 * browser's record alone, nothing sent, the vault's heading focused on
 * arrival) and Remove from the organization behind its own typed
 * confirmation under the same predicate, that verb alone sending the
 * DELETE and a refusal keeping the record. Under it, glass sections that
 * never fold at the page's width: the details (name, tags, notes) as
 * record rows, Edit turning them into the fields Save writes, a secret
 * record's profile, members and extra values with every private member
 * masked, Edit opening the secret record form for it, no Convert,
 * Download or key section for it, a template's members, the facts, the
 * related records as links, the chain the engine builds over the vault's
 * authorities, the key held or missing with View, Copy and Download, the
 * versions held with Activate, Download and Delete, and the export
 * converting the record, its key and its chain into any format the
 * engine writes; the name named as the page's crumb, and a missing
 * record titled Not found.
 */
const RecordPage = ({ id, context }) => {
  const { t } = useTranslation();
  const vault = useVault();
  const record = vault.records.find(entry => entry.id === id) || null;
  if (!vault.loaded) {
    return (
      <div className="list row">
        <div>{t('pages.loading')}</div>
      </div>
    );
  }
  if (!record) {
    return <NotFound context={context} />;
  }
  return <RecordBody record={record} context={context} />;
};

RecordPage.propTypes = {
  id: PropTypes.string.isRequired,
  context: pageContextShape.isRequired,
};

export default RecordPage;
