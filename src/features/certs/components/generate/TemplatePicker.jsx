import PropTypes from 'prop-types';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaFloppyDisk } from 'react-icons/fa6';

import ConfirmModal from '../../../../components/common/ConfirmModal';
import Field from '../../../../components/common/Field';
import FormErrorSummary from '../../../../components/common/FormErrorSummary';
import { useFormRules } from '../../../../hooks/useFormRules';
import { TEMPLATE_LABELS, templateSchemaOf } from '../../utils/schemas';

const EMPTY_NAME = { name: '' };

/**
 * The templates of the vault beside a subject form: a select loading
 * one into the form with Delete behind the typed confirmation removing
 * the one picked, drawn only while the vault holds a template, and a
 * name with Save in its input group keeping the form as a new one, the
 * name required and refused while a template already carries it, the
 * refusal drawn under the name and in the summary over the picker on
 * Save; `idPrefix` heads every control id, one prefix a mount.
 */
const TemplatePicker = ({ idPrefix, templates, onLoad, onSave, onDelete }) => {
  const { t } = useTranslation();
  const selectId = `${idPrefix}/pick`;
  const [picked, setPicked] = useState('');
  const [draft, setDraft] = useState(EMPTY_NAME);
  const [deleting, setDeleting] = useState(false);
  const names = useMemo(() => templates.map(template => template.name), [templates]);
  const scope = t('certs.generate.templates');
  const schema = useMemo(() => templateSchemaOf(names, scope), [names, scope]);
  const rules = useFormRules({
    schema,
    values: draft,
    labels: TEMPLATE_LABELS,
    idPrefix,
  });
  const held = templates.find(template => template.id === picked) || null;

  const save = () => {
    if (!rules.validateAll()) {
      return;
    }
    onSave(draft.name.trim());
    setDraft(EMPTY_NAME);
    rules.reset();
  };

  return (
    <div data-panel="templates">
      <FormErrorSummary errors={rules.summary} />
      <div className="row g-3 align-items-start mb-3">
        {templates.length > 0 ? (
          <div className="col-md-6">
            <Field id={selectId} label={t('certs.generate.template')} className="mb-0">
              {aria => (
                <div className="input-group">
                  <select
                    {...aria}
                    className="form-select"
                    value={picked}
                    onChange={event => {
                      setPicked(event.target.value);
                      const template = templates.find(entry => entry.id === event.target.value);
                      if (template) {
                        onLoad(template);
                      }
                    }}
                  >
                    <option value="">{t('certs.generate.pickTemplate')}</option>
                    {templates.map(template => (
                      <option key={template.id} value={template.id}>
                        {template.name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="btn btn-outline-danger"
                    data-action="delete-template"
                    disabled={!held}
                    onClick={() => setDeleting(true)}
                  >
                    {t('certs.generate.deleteTemplate')}
                  </button>
                </div>
              )}
            </Field>
          </div>
        ) : null}
        <div className="col-md-6">
          <Field
            id={rules.idFor('name')}
            label={rules.labelFor('name')}
            error={rules.errors.name || ''}
            className="mb-0"
          >
            {aria => (
              <div className="input-group">
                <input
                  {...aria}
                  type="text"
                  className="form-control"
                  name="name"
                  value={draft.name}
                  onChange={event => setDraft({ name: event.target.value })}
                  onBlur={() => rules.onBlur('name')}
                />
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  data-action="save-template"
                  onClick={save}
                >
                  <FaFloppyDisk className="me-1" aria-hidden="true" />
                  {t('certs.generate.saveTemplate')}
                </button>
              </div>
            )}
          </Field>
        </div>
      </div>
      <ConfirmModal
        show={deleting}
        handleClose={() => setDeleting(false)}
        handleConfirm={() => {
          onDelete(picked);
          setPicked('');
        }}
        title={t('certs.generate.deleteTemplate')}
        message={t('certs.confirm.deleteMessage', { name: held?.name || '' })}
      />
    </div>
  );
};

TemplatePicker.propTypes = {
  idPrefix: PropTypes.string.isRequired,
  templates: PropTypes.array.isRequired,
  onLoad: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
};

export default TemplatePicker;
