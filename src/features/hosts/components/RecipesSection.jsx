import PropTypes from 'prop-types';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaBolt, FaFlask, FaPenToSquare, FaPlus, FaStar, FaTrash } from 'react-icons/fa6';

import ConfirmModal from '../../../components/common/ConfirmModal';
import { useNotify } from '../../../contexts/NoticeContext';
import { useStatus } from '../../../contexts/StatusContext';
import { createRecipe, deleteRecipe, testRecipe, updateRecipe } from '../api/provisioning';
import { useHostMachines } from '../hooks/useHostMachines';
import { useManageSend } from '../hooks/useHostManage';
import { recipeTestBody } from '../utils/manageCatalog';

import ManageTable from './ManageTable';
import RecipeEditModal, { VariableRowsEditor } from './RecipeEditModal';
import ToolFormDialog from './ToolFormDialog';

const rowKey = row => String(row.id ?? row.name);

/**
 * The columns of the recipes table, hyperweaver-ui's: the name with the
 * default badge, the family, the brand, the count of steps and the
 * description.
 */
export const RECIPE_COLUMNS = [
  {
    key: 'name',
    kind: 'name',
    labelKey: 'host.recipesManagement.colName',
    value: row => row.name || '',
    render: (row, ctx) => (
      <span>
        <code className="small">{row.name}</code>{' '}
        {row.is_default ? (
          <span className="badge text-bg-success" data-note="recipe-default">
            {ctx.t('host.recipesManagement.default')}
          </span>
        ) : null}
      </span>
    ),
  },
  {
    key: 'os_family',
    kind: 'word',
    labelKey: 'host.recipesManagement.colOsFamily',
    value: row => row.os_family || '',
  },
  {
    key: 'brand',
    kind: 'word',
    labelKey: 'host.recipesManagement.colBrand',
    value: row => row.brand || '',
  },
  {
    key: 'steps',
    kind: 'count',
    labelKey: 'host.recipesManagement.colSteps',
    value: row => (Array.isArray(row.steps) ? row.steps.length : 0),
    render: row => (Array.isArray(row.steps) ? row.steps.length : '-'),
  },
  {
    key: 'description',
    kind: 'text',
    labelKey: 'host.recipesManagement.colDescription',
    priority: 5,
    prose: true,
    value: row => row.description || '',
    render: row => <span className="small">{row.description || '-'}</span>,
  },
];

const ACTIONS = [
  ['edit', FaPenToSquare, 'secondary', 'host.recipesManagement.edit'],
  ['test', FaFlask, 'info', 'host.recipesManagement.testTitle'],
  ['default', FaStar, 'success', 'host.recipesManagement.makeDefaultTitle'],
  ['delete', FaTrash, 'danger', 'host.recipesManagement.delete'],
];

const RecipeRowActions = ({ row, busy, onAction }) => {
  const { t } = useTranslation();
  return (
    <span className="d-inline-flex align-items-center gap-1" data-recipe={row.name}>
      {ACTIONS.filter(([action]) => action !== 'default' || !row.is_default).map(
        ([action, Icon, tone, labelKey]) => (
          <button
            key={action}
            type="button"
            className={`btn btn-sm btn-outline-${tone}`}
            title={t(labelKey)}
            aria-label={t(labelKey)}
            data-action={action}
            disabled={busy}
            onClick={() => onAction(action, row)}
          >
            <Icon aria-hidden="true" />
          </button>
        )
      )}
    </span>
  );
};

RecipeRowActions.propTypes = {
  row: PropTypes.shape({ name: PropTypes.string, is_default: PropTypes.bool }).isRequired,
  busy: PropTypes.bool.isRequired,
  onAction: PropTypes.func.isRequired,
};

const TestRecipeModal = ({ id, recipe, onClose }) => {
  const { t } = useTranslation();
  const status = useStatus();
  const notify = useNotify();
  const { machines } = useHostMachines(id);
  const [machineName, setMachineName] = useState('');
  const [variableRows, setVariableRows] = useState([]);
  const [result, setResult] = useState(null);
  const [running, setRunning] = useState(false);
  const [problem, setProblem] = useState('');

  const run = async dryRun => {
    if (!machineName) {
      setProblem('host.recipesManagement.pickMachine');
      return;
    }
    setProblem('');
    setRunning(true);
    setResult(null);
    try {
      const data = await testRecipe(
        status,
        id,
        recipe.id,
        recipeTestBody({ machineName, variableRows, dryRun })
      );
      setResult({ dryRun, data: data || {} });
    } catch (error) {
      notify('danger', t('hosts.manage.recipes.testFailed', { message: error.message }));
    } finally {
      setRunning(false);
    }
  };

  const resolved = Array.isArray(result?.data?.resolved_steps) ? result.data.resolved_steps : [];
  const unresolved = Array.isArray(result?.data?.unresolved_variables)
    ? result.data.unresolved_variables
    : [];

  return (
    <ToolFormDialog
      dialog="recipe-test"
      title={t('host.recipesManagement.testRecipeTitle', { name: recipe.name || '' })}
      submitKey="host.recipesManagement.dryRun"
      problemKey={problem}
      busy={running}
      onClose={onClose}
      onSubmit={() => run(true)}
    >
      <div className="row g-3">
        <div className="col-12 col-md-6">
          <label className="form-label" htmlFor="recipe-test-machine">
            {t('host.recipesManagement.machine')}
          </label>
          <select
            id="recipe-test-machine"
            className="form-select"
            value={machineName}
            onChange={event => setMachineName(event.target.value)}
            disabled={running}
          >
            <option value="">{t('host.recipesManagement.select')}</option>
            {machines.map(row => (
              <option key={row.name} value={row.name}>
                {row.name}
                {String(row.status || '').toLowerCase() === 'running' ? '' : ` (${row.status})`}
              </option>
            ))}
          </select>
          <span className="form-text text-muted">{t('host.recipesManagement.testHelp')}</span>
        </div>
        <div className="col-12 col-md-6">
          <span className="form-label d-block">
            {t('host.recipesManagement.callTimeVariables')}
          </span>
          <VariableRowsEditor
            rows={variableRows}
            onRowsChange={setVariableRows}
            idPrefix="recipe-test"
            disabled={running}
          />
        </div>
        <div className="col-12">
          <button
            type="button"
            className="btn btn-sm btn-danger"
            data-action="recipe-run-live"
            onClick={() => run(false)}
            disabled={running}
            title={t('host.recipesManagement.runLiveTitle')}
          >
            <FaBolt className="me-2" aria-hidden="true" />
            {t('host.recipesManagement.runLive')}
          </button>
        </div>
        {result?.dryRun ? (
          <div className="col-12" data-panel="recipe-dry-run">
            <h6 className="fw-bold">{t('host.recipesManagement.resolvedSteps')}</h6>
            {unresolved.length > 0 ? (
              <p className="mb-1">
                {t('host.recipesManagement.unresolvedVariables')}{' '}
                {unresolved.map(name => (
                  <span className="badge text-bg-warning me-1" key={name}>
                    {name}
                  </span>
                ))}
              </p>
            ) : null}
            <pre className="small mb-0">{JSON.stringify(resolved, null, 2)}</pre>
          </div>
        ) : null}
        {result && !result.dryRun ? (
          <div className="col-12" data-panel="recipe-live-run">
            <h6 className="fw-bold">{t('host.recipesManagement.liveRunResult')}</h6>
            <pre className="small mb-0">
              {JSON.stringify(
                { output: result.data.output, errors: result.data.errors, log: result.data.log },
                null,
                2
              )}
            </pre>
          </div>
        ) : null}
      </div>
    </ToolFormDialog>
  );
};

TestRecipeModal.propTypes = {
  id: PropTypes.string.isRequired,
  recipe: PropTypes.object.isRequired,
  onClose: PropTypes.func.isRequired,
};

/**
 * The zlogin recipes of a bhyve host, hyperweaver-ui's recipes
 * management as the body of the Manage page's Recipes section: the one
 * table over the rows the page's binding left, the family and the brand
 * as request filters in the navbar's panel, New recipe over it, and on
 * each row Edit, Test, Make default while it is not and Delete. The
 * create and the edit send `POST` and `PUT provisioning/recipes`, Make
 * default a `PUT` with `is_default`, Delete a `DELETE` behind the typed
 * confirmation, each one request and one notice and the recipes read
 * again on a success; Test sends `POST provisioning/recipes/{id}/test`
 * as a dry run or live and draws what it answered. Nothing polls.
 */
const RecipesSection = ({ id, ctx, table, reading, filtering }) => {
  const { t } = useTranslation();
  const status = useStatus();
  const { send, busy } = useManageSend(id);
  const [dialog, setDialog] = useState(null);

  const write = async ({ call, doneKey, values }) => {
    const { error } = await send({ call, doneKey, values, failKey: 'hosts.manage.recipes.failed' });
    if (!error) {
      setDialog(null);
      reading.refresh();
    }
  };

  const onAction = (action, row) => {
    if (action === 'default') {
      write({
        call: () => updateRecipe(status, id, row.id, { is_default: true }),
        doneKey: 'host.recipesManagement.setDefaultDone',
        values: { name: row.name, osFamily: row.os_family, brand: row.brand },
      });
      return;
    }
    setDialog({ kind: action, recipe: row });
  };

  const save = body => {
    const editing = dialog.recipe || null;
    write({
      call: () =>
        editing ? updateRecipe(status, id, editing.id, body) : createRecipe(status, id, body),
      doneKey: editing
        ? 'host.recipeEditModal.recipeUpdated'
        : 'host.recipeEditModal.recipeCreated',
      values: { name: body.name },
    });
  };

  return (
    <div data-panel="recipes-body">
      <div className="d-flex justify-content-end mb-3">
        <button
          type="button"
          className="btn btn-sm btn-primary"
          data-action="recipe-new"
          onClick={() => setDialog({ kind: 'new' })}
          disabled={busy}
        >
          <FaPlus className="me-1" aria-hidden="true" />
          {t('host.recipesManagement.newRecipe')}
        </button>
      </div>
      <ManageTable
        name="recipes"
        columns={RECIPE_COLUMNS}
        table={table}
        rowKey={rowKey}
        RowActions={RecipeRowActions}
        actionsProps={{ busy, onAction }}
        ctx={ctx}
        emptyKey="host.recipesManagement.emptyState"
        reading={reading}
        filtering={filtering}
      />
      {dialog?.kind === 'new' || dialog?.kind === 'edit' ? (
        <RecipeEditModal
          recipe={dialog.recipe || null}
          busy={busy}
          onClose={() => setDialog(null)}
          onSubmit={save}
        />
      ) : null}
      {dialog?.kind === 'test' ? (
        <TestRecipeModal id={id} recipe={dialog.recipe} onClose={() => setDialog(null)} />
      ) : null}
      <ConfirmModal
        show={dialog?.kind === 'delete'}
        handleClose={() => setDialog(null)}
        handleConfirm={() =>
          write({
            call: () => deleteRecipe(status, id, dialog.recipe.id),
            doneKey: 'host.recipesManagement.recipeDeleted',
            values: { name: dialog.recipe.name },
          })
        }
        title={t('host.recipesManagement.deleteRecipeTitle')}
        message={t('host.recipesManagement.deleteRecipeMessage', {
          name: dialog?.recipe?.name || '',
          osFamily: dialog?.recipe?.os_family || '',
          brand: dialog?.recipe?.brand || '',
        })}
        confirmText={t('host.recipesManagement.delete')}
      />
    </div>
  );
};

RecipesSection.propTypes = {
  id: PropTypes.string.isRequired,
  ctx: PropTypes.object.isRequired,
  table: PropTypes.object.isRequired,
  reading: PropTypes.shape({
    loaded: PropTypes.bool.isRequired,
    failed: PropTypes.bool.isRequired,
    refresh: PropTypes.func.isRequired,
  }).isRequired,
  filtering: PropTypes.bool.isRequired,
};

export default RecipesSection;
