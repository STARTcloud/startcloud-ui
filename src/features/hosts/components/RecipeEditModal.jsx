import PropTypes from 'prop-types';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaArrowDown, FaArrowUp, FaPlus, FaTrash } from 'react-icons/fa6';

import {
  BRANDS,
  OS_FAMILIES,
  STEP_TYPES,
  emptyStepRow,
  newRowKey,
  recipeBody,
  recipeFormOf,
  recipeProblem,
  seedStepRows,
  seedVariableRows,
} from '../utils/manageCatalog';

import ToolFormDialog from './ToolFormDialog';

/**
 * The key and value rows of a recipe's variables, hyperweaver-ui's
 * editor the test dialog shares: a name and a value a row with its
 * drop button, and the button that adds a row.
 */
export const VariableRowsEditor = ({ rows, onRowsChange, idPrefix, disabled = false }) => {
  const { t } = useTranslation();
  const patch = (key, changes) =>
    onRowsChange(rows.map(entry => (entry.key === key ? { ...entry, ...changes } : entry)));
  return (
    <div className="d-flex flex-column gap-1" data-field={`${idPrefix}-variables`}>
      {rows.map(row => (
        <div className="d-flex gap-1" key={row.key}>
          <input
            className="form-control form-control-sm"
            aria-label={t('host.recipeEditModal.variableName')}
            placeholder={t('host.recipeEditModal.namePlaceholder')}
            value={row.name}
            onChange={event => patch(row.key, { name: event.target.value })}
            disabled={disabled}
          />
          <input
            className="form-control form-control-sm"
            aria-label={t('host.recipeEditModal.variableValue')}
            placeholder={t('host.recipeEditModal.valuePlaceholder')}
            value={row.value}
            onChange={event => patch(row.key, { value: event.target.value })}
            disabled={disabled}
          />
          <button
            type="button"
            className="btn btn-sm btn-outline-danger"
            aria-label={t('host.recipeEditModal.dropVariable')}
            onClick={() => onRowsChange(rows.filter(entry => entry.key !== row.key))}
            disabled={disabled}
          >
            <FaTrash aria-hidden="true" />
          </button>
        </div>
      ))}
      <div>
        <button
          type="button"
          id={`${idPrefix}-add-variable`}
          className="btn btn-sm btn-outline-secondary"
          onClick={() => onRowsChange([...rows, { key: newRowKey(), name: '', value: '' }])}
          disabled={disabled}
        >
          <FaPlus className="me-1" aria-hidden="true" />
          {t('host.recipeEditModal.variable')}
        </button>
      </div>
    </div>
  );
};

VariableRowsEditor.propTypes = {
  rows: PropTypes.array.isRequired,
  onRowsChange: PropTypes.func.isRequired,
  idPrefix: PropTypes.string.isRequired,
  disabled: PropTypes.bool,
};

const StepFields = ({ row, onPatch, disabled }) => {
  const { t } = useTranslation();
  if (row.type === 'wait') {
    return (
      <input
        className="form-control form-control-sm"
        aria-label={t('host.recipeEditModal.patternToWaitFor')}
        placeholder={t('host.recipeEditModal.patternPlaceholder')}
        value={row.pattern}
        onChange={event => onPatch({ pattern: event.target.value })}
        disabled={disabled}
      />
    );
  }
  if (row.type === 'send' || row.type === 'command') {
    const send = row.type === 'send';
    return (
      <input
        className="form-control form-control-sm font-monospace"
        aria-label={t(
          send ? 'host.recipeEditModal.textToSend' : 'host.recipeEditModal.commandToRun'
        )}
        placeholder={t(
          send ? 'host.recipeEditModal.sendPlaceholder' : 'host.recipeEditModal.commandPlaceholder'
        )}
        value={row.value}
        onChange={event => onPatch({ value: event.target.value })}
        disabled={disabled}
      />
    );
  }
  if (row.type === 'template') {
    return (
      <>
        <textarea
          className="form-control form-control-sm font-monospace"
          aria-label={t('host.recipeEditModal.templateContent')}
          rows={4}
          placeholder={t('host.recipeEditModal.templateContentPlaceholder', {
            token: '{{variables}}',
          })}
          value={row.content}
          onChange={event => onPatch({ content: event.target.value })}
          disabled={disabled}
        />
        <input
          className="form-control form-control-sm font-monospace mt-1"
          aria-label={t('host.recipeEditModal.destPath')}
          placeholder={t('host.recipeEditModal.destPlaceholder')}
          value={row.dest}
          onChange={event => onPatch({ dest: event.target.value })}
          disabled={disabled}
        />
      </>
    );
  }
  return (
    <input
      className="form-control form-control-sm w-auto"
      aria-label={t('host.recipeEditModal.secondsToWait')}
      type="number"
      min="1"
      placeholder={t('host.recipeEditModal.secondsPlaceholder')}
      value={row.seconds}
      onChange={event => onPatch({ seconds: event.target.value })}
      disabled={disabled}
    />
  );
};

StepFields.propTypes = {
  row: PropTypes.object.isRequired,
  onPatch: PropTypes.func.isRequired,
  disabled: PropTypes.bool.isRequired,
};

const StepRow = ({ row, index, count, onPatch, onMove, onDrop, disabled }) => {
  const { t } = useTranslation();
  return (
    <div className="border rounded p-2" data-step={index + 1}>
      <div className="d-flex gap-1 align-items-center mb-1">
        <span className="badge text-bg-secondary">{index + 1}</span>
        <select
          className="form-select form-select-sm w-auto"
          aria-label={t('host.recipeEditModal.stepType')}
          value={row.type}
          onChange={event => onPatch({ type: event.target.value })}
          disabled={disabled}
        >
          {STEP_TYPES.map(type => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
        <span className="ms-auto d-inline-flex gap-1">
          <button
            type="button"
            className="btn btn-sm btn-outline-secondary py-0"
            aria-label={t('host.recipeEditModal.moveStepUp')}
            onClick={() => onMove(-1)}
            disabled={disabled || index === 0}
          >
            <FaArrowUp aria-hidden="true" />
          </button>
          <button
            type="button"
            className="btn btn-sm btn-outline-secondary py-0"
            aria-label={t('host.recipeEditModal.moveStepDown')}
            onClick={() => onMove(1)}
            disabled={disabled || index === count - 1}
          >
            <FaArrowDown aria-hidden="true" />
          </button>
          <button
            type="button"
            className="btn btn-sm btn-outline-danger py-0"
            aria-label={t('host.recipeEditModal.dropStep')}
            onClick={onDrop}
            disabled={disabled}
          >
            <FaTrash aria-hidden="true" />
          </button>
        </span>
      </div>
      <StepFields row={row} onPatch={onPatch} disabled={disabled} />
    </div>
  );
};

StepRow.propTypes = {
  row: PropTypes.object.isRequired,
  index: PropTypes.number.isRequired,
  count: PropTypes.number.isRequired,
  onPatch: PropTypes.func.isRequired,
  onMove: PropTypes.func.isRequired,
  onDrop: PropTypes.func.isRequired,
  disabled: PropTypes.bool.isRequired,
};

const Field = ({ id, labelKey, value, onChange, disabled, placeholder = '', type = 'text' }) => {
  const { t } = useTranslation();
  return (
    <>
      <label className="form-label" htmlFor={id}>
        {t(labelKey)}
      </label>
      <input
        id={id}
        className="form-control"
        type={type}
        min={type === 'number' ? '1' : undefined}
        placeholder={placeholder}
        value={value}
        onChange={event => onChange(event.target.value)}
        disabled={disabled}
      />
    </>
  );
};

Field.propTypes = {
  id: PropTypes.string.isRequired,
  labelKey: PropTypes.string.isRequired,
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  disabled: PropTypes.bool.isRequired,
  placeholder: PropTypes.string,
  type: PropTypes.string,
};

const Select = ({ id, labelKey, value, onChange, values, disabled }) => {
  const { t } = useTranslation();
  return (
    <>
      <label className="form-label" htmlFor={id}>
        {t(labelKey)}
      </label>
      <select
        id={id}
        className="form-select"
        value={value}
        onChange={event => onChange(event.target.value)}
        disabled={disabled}
      >
        {values.map(entry => (
          <option key={entry} value={entry}>
            {entry}
          </option>
        ))}
      </select>
    </>
  );
};

Select.propTypes = {
  id: PropTypes.string.isRequired,
  labelKey: PropTypes.string.isRequired,
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  values: PropTypes.arrayOf(PropTypes.string).isRequired,
  disabled: PropTypes.bool.isRequired,
};

/**
 * The recipe dialog, hyperweaver-ui's create and edit: the name, the
 * family, the brand, the description, the default switch, the boot
 * string, the prompts and the timeout, the variables and the steps in
 * order, each its type and the fields of that type, moved up and down
 * and dropped; the submit hands the body of `recipeBody` up, refused
 * while the name or a step is missing.
 */
const RecipeEditModal = ({ recipe, busy, onClose, onSubmit }) => {
  const { t } = useTranslation();
  const [form, setForm] = useState(() => recipeFormOf(recipe));
  const [variableRows, setVariableRows] = useState(() => seedVariableRows(recipe?.variables));
  const [stepRows, setStepRows] = useState(() => seedStepRows(recipe?.steps));
  const [problem, setProblem] = useState('');
  const patch = changes => setForm(current => ({ ...current, ...changes }));
  const patchStep = (key, changes) =>
    setStepRows(current => current.map(row => (row.key === key ? { ...row, ...changes } : row)));
  const moveStep = (index, delta) =>
    setStepRows(current => {
      const next = [...current];
      const [row] = next.splice(index, 1);
      next.splice(index + delta, 0, row);
      return next;
    });

  const submit = () => {
    const why = recipeProblem(form, stepRows);
    setProblem(why);
    if (!why) {
      onSubmit(recipeBody(form, stepRows, variableRows));
    }
  };

  return (
    <ToolFormDialog
      dialog="recipe-edit"
      title={
        recipe
          ? t('host.recipeEditModal.editRecipeTitle', { name: recipe.name })
          : t('host.recipeEditModal.newRecipe')
      }
      submitKey={recipe ? 'host.recipeEditModal.save' : 'host.recipeEditModal.create'}
      problemKey={problem}
      busy={busy}
      onClose={onClose}
      onSubmit={submit}
    >
      <div className="row g-3">
        <div className="col-12 col-md-4">
          <Field
            id="recipe-name"
            labelKey="host.recipeEditModal.name"
            value={form.name}
            onChange={name => patch({ name })}
            disabled={busy}
          />
        </div>
        <div className="col-6 col-md-4">
          <Select
            id="recipe-os-family"
            labelKey="host.recipeEditModal.osFamily"
            value={form.osFamily}
            onChange={osFamily => patch({ osFamily })}
            values={OS_FAMILIES}
            disabled={busy}
          />
        </div>
        <div className="col-6 col-md-4">
          <Select
            id="recipe-brand"
            labelKey="host.recipeEditModal.brand"
            value={form.brand}
            onChange={brand => patch({ brand })}
            values={BRANDS}
            disabled={busy}
          />
        </div>
        <div className="col-12">
          <Field
            id="recipe-description"
            labelKey="host.recipeEditModal.description"
            value={form.description}
            onChange={description => patch({ description })}
            disabled={busy}
          />
        </div>
        <div className="col-12">
          <div className="form-check form-switch">
            <input
              id="recipe-default"
              className="form-check-input"
              type="checkbox"
              role="switch"
              checked={form.isDefault}
              onChange={event => patch({ isDefault: event.target.checked })}
              disabled={busy}
            />
            <label className="form-check-label" htmlFor="recipe-default">
              {t('host.recipeEditModal.defaultRecipeBefore')} <code>zone_setup</code>{' '}
              {t('host.recipeEditModal.defaultRecipeAfter')}
            </label>
          </div>
        </div>
        <div className="col-6 col-md-3">
          <Field
            id="recipe-boot-string"
            labelKey="host.recipeEditModal.bootString"
            placeholder={t('host.recipeEditModal.bootStringPlaceholder')}
            value={form.bootString}
            onChange={bootString => patch({ bootString })}
            disabled={busy}
          />
        </div>
        <div className="col-6 col-md-3">
          <Field
            id="recipe-login-prompt"
            labelKey="host.recipeEditModal.loginPrompt"
            placeholder="login:"
            value={form.loginPrompt}
            onChange={loginPrompt => patch({ loginPrompt })}
            disabled={busy}
          />
        </div>
        <div className="col-6 col-md-3">
          <Field
            id="recipe-shell-prompt"
            labelKey="host.recipeEditModal.shellPrompt"
            placeholder=":~$"
            value={form.shellPrompt}
            onChange={shellPrompt => patch({ shellPrompt })}
            disabled={busy}
          />
        </div>
        <div className="col-6 col-md-3">
          <Field
            id="recipe-timeout"
            labelKey="host.recipeEditModal.timeoutSeconds"
            type="number"
            placeholder="300"
            value={form.timeoutSeconds}
            onChange={timeoutSeconds => patch({ timeoutSeconds })}
            disabled={busy}
          />
        </div>
        <div className="col-12">
          <span className="form-label d-block">{t('host.recipeEditModal.variables')}</span>
          <p className="form-text text-muted mt-0 mb-1">
            {t('host.recipeEditModal.variablesHelpBefore')} <code>{'{{name}}'}</code>{' '}
            {t('host.recipeEditModal.variablesHelpAfter')}
          </p>
          <VariableRowsEditor
            rows={variableRows}
            onRowsChange={setVariableRows}
            idPrefix="recipe-edit"
            disabled={busy}
          />
        </div>
        <div className="col-12">
          <span className="form-label d-block">{t('host.recipeEditModal.stepsRunInOrder')}</span>
          <div className="d-flex flex-column gap-2" data-field="recipe-steps">
            {stepRows.map((row, index) => (
              <StepRow
                key={row.key}
                row={row}
                index={index}
                count={stepRows.length}
                onPatch={changes => patchStep(row.key, changes)}
                onMove={delta => moveStep(index, delta)}
                onDrop={() =>
                  setStepRows(current => current.filter(entry => entry.key !== row.key))
                }
                disabled={busy}
              />
            ))}
            <div>
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary"
                data-action="recipe-add-step"
                onClick={() => setStepRows(current => [...current, emptyStepRow()])}
                disabled={busy}
              >
                <FaPlus className="me-1" aria-hidden="true" />
                {t('host.recipeEditModal.step')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </ToolFormDialog>
  );
};

RecipeEditModal.propTypes = {
  recipe: PropTypes.object,
  busy: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
};

export default RecipeEditModal;
