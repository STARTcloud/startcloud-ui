import PropTypes from 'prop-types';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaEnvelope } from 'react-icons/fa6';

import { resultLineOf } from '../../../components/common/bulkResult';
import ConfirmModal from '../../../components/common/ConfirmModal';
import SectionHeading from '../../../components/common/SectionHeading';
import { errorKeys } from '../../../components/common/StepUpDialog';
import { useGuard } from '../../../contexts/GuardContext';
import { useNotify } from '../../../contexts/NoticeContext';
import { useClientFilters } from '../../../hooks/useClientFilters';
import { useNavbarSearchBinding } from '../../../hooks/useSearchBinding';
import { useSelection } from '../../../hooks/useSelection';
import { useUrlNarrowing } from '../../../hooks/useUrlNarrowing';
import {
  deleteEmailTemplate,
  emailArguments as readArguments,
  emailTemplates,
  emailTemplatesBulk,
  sitesConfig as readSitesConfig,
} from '../api/content';
import { useAdminRead } from '../hooks/useAdminRead';
import { EMAIL_ARGUMENTS, EMAIL_TEMPLATES, SITES_CONFIG } from '../utils/examples';

import AdminLoading from './AdminLoading';
import DateCell from './DateCell';
import {
  argumentShape,
  copyShape,
  EmailTemplateCopyDialog,
  EmailTemplateHistoryDialog,
  kindLabelOf,
  localeLabelOf,
  PreviewDialog,
  siteLabelOf,
  templateShape,
} from './EmailTemplateDialog';

const keyOf = template => template.kind;

const matches = (template, needle, t) =>
  [kindLabelOf(t, template.kind), template.kind].some(text => text.toLowerCase().includes(needle));

const FILTER_GROUPS = [
  {
    key: 'site',
    labelKey: 'admin.emailTemplates.filter.site',
    values: template => [...new Set(template.copies.map(copy => copy.site).filter(Boolean))],
    activeClass: 'bg-primary',
    labelFor: value => value,
  },
];
const FILTER_KEYS = FILTER_GROUPS.map(group => group.key);

const argumentsOf = (list, kind) => list.find(entry => entry.kind === kind)?.arguments || [];

const sitesOf = answer =>
  Object.entries(answer?.sites || {}).map(([id, entry]) => ({ id, name: entry?.name || id }));

const CopyRow = ({ copy, onPreview, onEdit, onHistory, onDelete }) => {
  const { t } = useTranslation();
  return (
    <li className="list-group-item d-flex flex-wrap align-items-center gap-2">
      <div className="d-flex flex-wrap align-items-center gap-2 flex-grow-1 min-width-0">
        <span className={`badge ${copy.site ? 'bg-primary' : 'bg-secondary'}`}>
          {siteLabelOf(t, copy.site)}
        </span>
        <span className="badge bg-secondary">{localeLabelOf(t, copy.locale)}</span>
        <span className="small text-muted">
          {t('admin.emailTemplates.version', { version: copy.version || '' })}{' '}
          {t('admin.emailTemplates.revision', { revision: copy.revision })}
          {copy.updated_at ? (
            <>
              {' · '}
              {t('admin.emailTemplates.updatedAt')} <DateCell value={copy.updated_at} />
            </>
          ) : null}
        </span>
      </div>
      <div className="d-flex flex-wrap gap-1">
        <button
          type="button"
          className="btn btn-sm btn-outline-secondary"
          onClick={() => onPreview(copy)}
        >
          {t('admin.emailTemplates.preview')}
        </button>
        <button
          type="button"
          className="btn btn-sm btn-outline-secondary"
          onClick={() => onEdit(copy)}
        >
          {t('admin.emailTemplates.edit')}
        </button>
        <button
          type="button"
          className="btn btn-sm btn-outline-secondary"
          onClick={() => onHistory(copy)}
        >
          {t('admin.emailTemplates.history')}
        </button>
        <button
          type="button"
          className="btn btn-sm btn-outline-danger"
          onClick={() => onDelete(copy)}
        >
          {t('admin.emailTemplates.delete')}
        </button>
      </div>
    </li>
  );
};

CopyRow.propTypes = {
  copy: copyShape.isRequired,
  onPreview: PropTypes.func.isRequired,
  onEdit: PropTypes.func.isRequired,
  onHistory: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
};

const TemplateCard = ({
  template,
  args,
  selected,
  onToggle,
  onAddCopy,
  onPreviewCopy,
  onEditCopy,
  onHistoryCopy,
  onDeleteCopy,
}) => {
  const { t } = useTranslation();
  const label = kindLabelOf(t, template.kind);
  return (
    <li className="list-group-item">
      <div className="d-flex flex-wrap align-items-center gap-2">
        <input
          type="checkbox"
          className="form-check-input flex-shrink-0"
          checked={selected}
          onChange={onToggle}
          aria-label={label}
        />
        <FaEnvelope aria-hidden="true" />
        <strong>{label}</strong>
        <code className="small">{template.kind}</code>
        <span className="small text-muted">
          {args.map(entry => `{${entry.index}} ${entry.name}`).join(' · ')}
        </span>
        <div className="d-flex flex-wrap gap-1 ms-auto">
          <button
            type="button"
            className="btn btn-sm btn-outline-secondary"
            onClick={() => onAddCopy(template)}
          >
            {t('admin.emailTemplates.addCopy')}
          </button>
        </div>
      </div>
      {template.copies.length === 0 ? (
        <div className="small text-muted mt-2 term-document-copies">
          {t('admin.emailTemplates.noCopies')}
        </div>
      ) : (
        <ul className="list-group list-group-flush mt-2 term-document-copies">
          {template.copies.map(copy => (
            <CopyRow
              key={copy.id}
              copy={copy}
              onPreview={onPreviewCopy}
              onEdit={onEditCopy}
              onHistory={onHistoryCopy}
              onDelete={onDeleteCopy}
            />
          ))}
        </ul>
      )}
    </li>
  );
};

TemplateCard.propTypes = {
  template: templateShape.isRequired,
  args: PropTypes.arrayOf(argumentShape).isRequired,
  selected: PropTypes.bool.isRequired,
  onToggle: PropTypes.func.isRequired,
  onAddCopy: PropTypes.func.isRequired,
  onPreviewCopy: PropTypes.func.isRequired,
  onEditCopy: PropTypes.func.isRequired,
  onHistoryCopy: PropTypes.func.isRequired,
  onDeleteCopy: PropTypes.func.isRequired,
};

const useArguments = () => {
  const [list, setList] = useState([]);
  useEffect(() => {
    let mounted = true;
    readArguments()
      .then(answer => {
        if (mounted) {
          setList(Array.isArray(answer) ? answer : []);
        }
      })
      .catch(error => {
        if (mounted && error.status === 404) {
          setList(EMAIL_ARGUMENTS);
        }
      });
    return () => {
      mounted = false;
    };
  }, []);
  return list;
};

const useSites = () => {
  const [list, setList] = useState([]);
  useEffect(() => {
    let mounted = true;
    readSitesConfig()
      .then(answer => {
        if (mounted) {
          setList(sitesOf(answer));
        }
      })
      .catch(error => {
        if (mounted && error.status === 404) {
          setList(sitesOf(SITES_CONFIG));
        }
      });
    return () => {
      mounted = false;
    };
  }, []);
  return list;
};

/**
 * The Email templates page's bulk action, drawn in the heading's action
 * pane while cards are picked: Delete over
 * `POST /api/admin/email-templates/bulk` with the picked kinds' copy ids,
 * behind the shared confirm and the step-up dialog, the result line
 * naming processed, skipped and each error's code translated
 * (decision 164).
 */
const EmailTemplatesBulkActions = ({ ids, onDone }) => {
  const { t } = useTranslation();
  const notify = useNotify();
  const guard = useGuard();
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);

  const run = () => {
    setBusy(true);
    guard(
      () => emailTemplatesBulk({ action: 'delete', ids }),
      t('admin.emailTemplates.bulk.stepUpReason')
    )
      .then(answer => {
        setResult(answer);
        onDone();
      })
      .catch(error => {
        if (error?.code !== 'step_up_required') {
          notify('danger', t(errorKeys(error)));
        }
      })
      .finally(() => {
        setBusy(false);
        setPending(false);
      });
  };

  const line = resultLineOf(t, 'admin.emailTemplates.bulk', result);

  return (
    <>
      <button
        type="button"
        className="btn btn-sm btn-outline-danger"
        disabled={busy || ids.length === 0}
        onClick={() => setPending(true)}
      >
        {t('admin.emailTemplates.bulk.delete')}
      </button>
      {line ? (
        <span className="small text-muted" role="status">
          {line}
        </span>
      ) : null}
      <ConfirmModal
        show={pending}
        handleClose={() => setPending(false)}
        handleConfirm={run}
        title={t('admin.emailTemplates.bulk.confirmTitle')}
        message={t('admin.emailTemplates.bulk.confirmBody', {
          count: ids.length,
          keyword: t('pages.confirm.keyword'),
        })}
      />
    </>
  );
};

EmailTemplatesBulkActions.propTypes = {
  ids: PropTypes.array.isRequired,
  onDone: PropTypes.func.isRequired,
};

/**
 * Messaging › Email templates: a `SectionHeading` over the cards, the
 * kind count as muted text after the title and no Create, the nine kinds
 * being fixed by the server; one card per kind from
 * `GET /api/admin/email-templates` with its argument list from
 * `GET /api/admin/email-templates/arguments` under the title, its copies
 * listed inside with their site ("Every site" for the default copy) and
 * language ("Every language" for the site's default) badges, version,
 * `r{{revision}}`, updated date and the per-copy actions Preview, Edit,
 * History and Delete, a kind with no copy saying it is sent from the
 * generic text; Add a copy on the card opening the copy dialog; History
 * opens a list dialog of the copy's versions and revisions, newest first,
 * each revision readable read-only; Edit draws the version read-only with
 * Save ("Save as a revision of {{version}}", a `PATCH`) and Publish (a
 * small dialog asking the new version, then the publish route); a
 * checkbox per card and the heading's select-all, the action pane
 * gaining, while cards are picked, "N selected", Clear selection and
 * Delete over `POST /api/admin/email-templates/bulk` with the picked
 * kinds' copy ids, behind the confirm and the step-up dialog; the navbar
 * search bound with a query over the cards by kind label and key and the
 * Site `toggle` group narrowing the cards client-side, the query and the
 * group's values in the URL as `search` and `site` through
 * `useUrlNarrowing` (decision 164).
 */
const EmailTemplatesPage = () => {
  const { t } = useTranslation();
  const notify = useNotify();
  const argumentList = useArguments();
  const sites = useSites();
  const { data, loading, reload } = useAdminRead({
    read: emailTemplates,
    example: EMAIL_TEMPLATES,
  });
  const templates = Array.isArray(data) ? data : [];
  const url = useUrlNarrowing({ queryKey: 'search', filterKeys: FILTER_KEYS });
  const needle = url.query.trim().toLowerCase();
  const searched = needle ? templates.filter(template => matches(template, needle, t)) : templates;
  const filters = useClientFilters({ specs: FILTER_GROUPS, rows: searched, bound: url });
  const shown = filters.rows;
  const narrowing = needle !== '' || filters.active;

  useNavbarSearchBinding({
    query: url.query,
    onQueryChange: url.setQuery,
    placeholder: t('admin.emailTemplates.search'),
    matched: shown.length,
    total: templates.length,
    groups: filters.groups,
    onClearFilters: filters.clear,
  });
  const selection = useSelection(shown, { keyOf });
  const [copyDialog, setCopyDialog] = useState(null);
  const [previewing, setPreviewing] = useState(null);
  const [viewingHistory, setViewingHistory] = useState(null);
  const [deleting, setDeleting] = useState(null);

  useEffect(() => {
    document.title = t('admin.emailTemplates.title');
  }, [t]);

  const fail = error => notify('danger', t(error.messageKey || 'errors.request'));

  const confirmDelete = () => {
    deleteEmailTemplate(
      deleting.template.kind,
      deleting.copy.site || '',
      deleting.copy.locale || ''
    )
      .then(() => {
        notify(
          'success',
          t('admin.emailTemplates.deleted', { name: kindLabelOf(t, deleting.template.kind) })
        );
        reload();
      })
      .catch(fail);
  };

  if (loading && !data) {
    return <AdminLoading />;
  }

  const pickedIds = [...selection.selected]
    .map(kind => shown.find(template => template.kind === kind))
    .filter(Boolean)
    .flatMap(template => template.copies.map(copy => copy.id));

  const headingActions = selection.someSelected ? (
    <>
      <strong>{t('admin.emailTemplates.bulk.selected', { count: selection.selected.size })}</strong>
      <button type="button" className="btn btn-sm btn-link" onClick={selection.clear}>
        {t('admin.emailTemplates.bulk.clearSelection')}
      </button>
      <EmailTemplatesBulkActions
        ids={pickedIds}
        onDone={() => {
          selection.clear();
          reload();
        }}
      />
    </>
  ) : null;

  return (
    <div>
      <SectionHeading
        title={t('admin.emailTemplates.title')}
        count={templates.length}
        actions={headingActions}
        selectAll={{
          allSelected: selection.allSelected,
          someSelected: selection.someSelected,
          onToggleAll: selection.toggleAll,
          label: t('pages.selectColumn'),
        }}
      />
      {shown.length === 0 ? (
        <div className="text-muted">{narrowing ? t('pages.noMatches') : t('pages.empty')}</div>
      ) : null}
      <ul className="list-group">
        {shown.map(template => (
          <TemplateCard
            key={keyOf(template)}
            template={template}
            args={argumentsOf(argumentList, template.kind)}
            selected={selection.selected.has(keyOf(template))}
            onToggle={() => selection.toggle(keyOf(template))}
            onAddCopy={entry => setCopyDialog({ template: entry, source: null, editing: false })}
            onPreviewCopy={copy => setPreviewing({ template, copy })}
            onEditCopy={copy => setCopyDialog({ template, source: copy, editing: true })}
            onHistoryCopy={copy => setViewingHistory({ template, copy })}
            onDeleteCopy={copy => setDeleting({ template, copy })}
          />
        ))}
      </ul>
      {copyDialog ? (
        <EmailTemplateCopyDialog
          template={copyDialog.template}
          source={copyDialog.source}
          editing={copyDialog.editing}
          args={argumentsOf(argumentList, copyDialog.template.kind)}
          sites={sites}
          onClose={() => setCopyDialog(null)}
          onSaved={reload}
        />
      ) : null}
      {previewing ? (
        <PreviewDialog
          copy={previewing.copy}
          args={argumentsOf(argumentList, previewing.template.kind)}
          onClose={() => setPreviewing(null)}
        />
      ) : null}
      {viewingHistory ? (
        <EmailTemplateHistoryDialog
          template={viewingHistory.template}
          source={viewingHistory.copy}
          args={argumentsOf(argumentList, viewingHistory.template.kind)}
          onClose={() => setViewingHistory(null)}
        />
      ) : null}
      <ConfirmModal
        show={Boolean(deleting)}
        handleClose={() => setDeleting(null)}
        handleConfirm={confirmDelete}
        title={t('admin.emailTemplates.deleteTitle')}
        message={t('admin.emailTemplates.deleteBody', {
          name: deleting ? kindLabelOf(t, deleting.template.kind) : '',
          keyword: t('pages.confirm.keyword'),
        })}
      />
    </div>
  );
};

export default EmailTemplatesPage;
