import PropTypes from 'prop-types';
import { useEffect, useState } from 'react';
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

import { localeDate } from '../../../components/common/columns';
import ConfirmModal from '../../../components/common/ConfirmModal';
import CopyButton from '../../../components/common/CopyButton';
import EmptyState from '../../../components/common/EmptyState';
import FormErrorSummary from '../../../components/common/FormErrorSummary';
import PageHeader from '../../../components/common/PageHeader';
import RecordRows from '../../../components/common/RecordRows';
import SectionCard from '../../../components/common/SectionCard';
import SectionHeading from '../../../components/common/SectionHeading';
import StatusChips from '../../../components/common/StatusChips';
import { StatusMenu, VisibilityMenu, pickedOf } from '../../../components/common/VisibilityPicker';
import { useNotify } from '../../../contexts/NoticeContext';
import { useFolds } from '../../../hooks/useFolds';
import { useFormRules } from '../../../hooks/useFormRules';
import { usePageName } from '../../../hooks/usePageName';
import { pageContextShape } from '../../../utils/itemShape';
import { canManageRecord } from '../../../utils/permissions';
import { useBuiltChain } from '../hooks/useBuiltChain';
import { useRecordActions } from '../hooks/useRecordActions';
import { useStoreWrites } from '../hooks/useStoreWrites';
import { useVault } from '../hooks/useVault';
import { foldOf } from '../utils/folds';
import {
  PRIVATE_MEMBERS,
  SECRET_MEMBERS,
  algorithmOf,
  derOf,
  isSecretKind,
  kindOf,
  nameOf,
  notAfterOf,
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
import SecretRecordModal from './SecretRecordModal';
import StatusBadge from './StatusBadge';
import VaultTreeDialogs from './VaultTreeDialogs';

const MASK = '••••••••';

const CHAINED = ['certificate', 'authority'];

const FOLDS = { details: 'details', export: 'export' };

const PRE_CLASS = 'font-monospace small border rounded p-3 flex-grow-1 mb-0';

const recordLink = record => <Link to={recordPath(record)}>{nameOf(record)}</Link>;

const recordLinks = records =>
  records.map((record, index) => (
    <span key={record.id}>
      {index > 0 ? ', ' : ''}
      {recordLink(record)}
    </span>
  ));

const DetailsCard = ({ record, fold, onSave }) => {
  const { t } = useTranslation();
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
      tags: draft.tags
        .split(',')
        .map(tag => tag.trim())
        .filter(Boolean),
      notes: draft.notes,
    });
  };

  return (
    <SectionCard title={t('certs.record.details')} folded={fold.folded} onFold={fold.onFold}>
      <form onSubmit={submit} noValidate>
        <FormErrorSummary errors={rules.summary} />
        <TextField name="name" draft={draft} rules={rules} onChange={set} />
        <TextField name="tags" draft={draft} rules={rules} onChange={set} />
        <TextAreaField name="notes" draft={draft} rules={rules} onChange={set} />
        <button type="submit" className="btn btn-primary" data-action="save">
          {t('certs.record.save')}
        </button>
      </form>
    </SectionCard>
  );
};

DetailsCard.propTypes = {
  record: PropTypes.object.isRequired,
  fold: PropTypes.object.isRequired,
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

const SecretSection = ({ record, onSave }) => {
  const { t } = useTranslation();
  const [editing, setEditing] = useState(false);
  const edit = (
    <button
      type="button"
      className="btn btn-sm btn-outline-secondary"
      data-action="edit-secret"
      onClick={() => setEditing(true)}
    >
      <FaPenToSquare className="me-1" aria-hidden="true" />
      {t('certs.actions.edit')}
    </button>
  );
  return (
    <div className="mb-4" data-panel="record-secret">
      <SectionHeading title={t('certs.record.secret')} actions={edit} />
      <RecordRows rows={secretRows(record, t)} />
      {editing ? (
        <SecretRecordModal
          record={record}
          onSave={next => {
            onSave(next);
            setEditing(false);
          }}
          onClose={() => setEditing(false)}
        />
      ) : null}
    </div>
  );
};

SecretSection.propTypes = {
  record: PropTypes.object.isRequired,
  onSave: PropTypes.func.isRequired,
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

const ExportCard = ({ record, keyRecord, issuers, fold, actions }) => {
  const { t } = useTranslation();
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

  return (
    <SectionCard title={t('certs.record.export')} folded={fold.folded} onFold={fold.onFold}>
      <form onSubmit={submit} noValidate>
        <FormErrorSummary errors={rules.summary} />
        <FormatPicker
          kinds={kinds}
          draft={output}
          rules={rules}
          onChange={patch => setOutput(current => ({ ...current, ...patch }))}
        />
        <button type="submit" className="btn btn-primary" data-action="convert-download">
          <FaRightLeft className="me-1" aria-hidden="true" />
          {t('certs.record.convertDownload')}
        </button>
      </form>
    </SectionCard>
  );
};

ExportCard.propTypes = {
  record: PropTypes.object.isRequired,
  keyRecord: PropTypes.object,
  issuers: PropTypes.array.isRequired,
  fold: PropTypes.object.isRequired,
  actions: PropTypes.object.isRequired,
};

const Chips = ({ record, thresholdDays }) => {
  const { t, i18n } = useTranslation();
  const algorithm = algorithmOf(record);
  const expires = notAfterOf(record);
  return (
    <>
      <StatusBadge status={recordStatus(record, nowOf(), thresholdDays)} />
      {record.remote_id ? (
        <StatusChips
          status={record.published ? 'published' : 'pending'}
          visibility={pickedOf(record)}
        />
      ) : null}
      <span className="badge bg-secondary">{t(`certs.kind.${record.kind}`)}</span>
      {algorithm ? <span className="badge bg-secondary">{algorithm}</span> : null}
      {expires ? (
        <span className="badge bg-secondary">
          {t('certs.record.expires', { date: localeDate(expires, i18n.language) })}
        </span>
      ) : null}
    </>
  );
};

Chips.propTypes = {
  record: PropTypes.object.isRequired,
  thresholdDays: PropTypes.number.isRequired,
};

const managesSynced = (record, user) =>
  Boolean(record.remote_id) && canManageRecord(user, record.organization, record);

const accessOf = body =>
  Object.fromEntries(Object.entries(body).filter(([word]) => word !== 'recursive'));

const HeaderActions = ({ record, actions, manage, onDelete, onRemove, onAccess }) => {
  const { t } = useTranslation();
  return (
    <>
      {manage ? (
        <VisibilityMenu
          current={{
            is_public: Boolean(record.is_public),
            guest_access: Boolean(record.guest_access),
          }}
          className="btn btn-outline-secondary"
          onPick={body => onAccess(accessOf(body))}
        />
      ) : null}
      {manage ? (
        <StatusMenu
          published={Boolean(record.published)}
          className="btn btn-outline-secondary"
          onPick={body => onAccess(accessOf(body))}
        />
      ) : null}
      {isSecretKind(record.kind) ? null : (
        <>
          <button
            type="button"
            className="btn btn-outline-secondary"
            data-action="convert"
            onClick={() => actions.convert(record)}
          >
            <FaRightLeft className="me-1" aria-hidden="true" />
            {t('certs.actions.convert')}
          </button>
          <button
            type="button"
            className="btn btn-outline-secondary"
            data-action="download"
            onClick={() => actions.download(record)}
          >
            <FaDownload className="me-1" aria-hidden="true" />
            {t('certs.actions.download')}
          </button>
        </>
      )}
      <button type="button" className="btn btn-danger" data-action="delete" onClick={onDelete}>
        <FaTrash className="me-1" aria-hidden="true" />
        {t('certs.actions.delete')}
      </button>
      {manage ? (
        <button
          type="button"
          className="btn btn-outline-danger"
          data-action="remove-from"
          onClick={onRemove}
        >
          {t('certs.actions.removeFrom', { organization: record.organization })}
        </button>
      ) : null}
    </>
  );
};

HeaderActions.propTypes = {
  record: PropTypes.object.isRequired,
  actions: PropTypes.object.isRequired,
  manage: PropTypes.bool.isRequired,
  onDelete: PropTypes.func.isRequired,
  onRemove: PropTypes.func.isRequired,
  onAccess: PropTypes.func.isRequired,
};

const RecordSections = ({ record, context, related, authorities, built, actions, save }) => {
  const { t } = useTranslation();
  const vault = useVault();
  const prefsKey = `${context.prefsPrefix}_certs_record`;
  const folds = useFolds(prefsKey);
  const thresholdDays = vault.preferences.threshold_days;
  const chained = CHAINED.includes(record.kind) && Boolean(derOf(record));
  const secret = isSecretKind(record.kind);
  return (
    <>
      <DetailsCard
        key={record.updated_at}
        record={record}
        fold={foldOf(folds, FOLDS.details)}
        onSave={save}
      />
      {secret ? <SecretSection record={record} onSave={save} /> : null}
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
        <ExportCard
          record={record}
          keyRecord={related.key}
          issuers={built.issuers}
          fold={foldOf(folds, FOLDS.export)}
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
};

const RecordBody = ({ record, context }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const notify = useNotify();
  const vault = useVault();
  const actions = useRecordActions();
  const store = useStoreWrites();
  const [deleting, setDeleting] = useState(false);
  const [removing, setRemoving] = useState(false);
  const thresholdDays = vault.preferences.threshold_days;
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

  const headerActions = (
    <HeaderActions
      record={record}
      actions={actions}
      manage={managesSynced(record, context.user)}
      onDelete={() => setDeleting(true)}
      onRemove={() => setRemoving(true)}
      onAccess={patch => store.setAccess(record, patch)}
    />
  );

  return (
    <div className="list row" data-page="certs-record">
      <PageHeader
        title={nameOf(record)}
        subtitle={record.facts?.subject_dn || ''}
        chips={<Chips record={record} thresholdDays={thresholdDays} />}
        actions={headerActions}
      />
      <RecordSections
        record={record}
        context={context}
        related={related}
        authorities={authorities}
        built={built}
        actions={actions}
        save={save}
      />
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
 * One record at `/certs/{id}`: the name as the title over the subject
 * with the expiry status, the published and visibility chips while the
 * store holds the record, kind, algorithm and expiry chips, the header's
 * action pane carrying the visibility step and Publish / Unpublish while
 * the store holds the record and `canManageRecord` says the person may
 * change it, each one PUT, then Convert, Download, Delete behind the
 * typed confirmation (the browser's record alone, nothing sent, the
 * vault's heading focused on arrival) and
 * Remove from the organization behind its own typed confirmation under
 * the same predicate, that verb alone sending the DELETE and a refusal
 * keeping the record; then the details
 * card (name, tags, notes), a secret record's profile, members and extra
 * values with every private member masked and Edit opening the secret
 * record form, no Convert, Download or key section for it, a template's members, the facts, the related
 * records as links, the chain the engine builds over the vault's
 * authorities, the key held or missing with View, Copy and Download, the
 * versions held with Activate, Download and Delete, and the export card
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
