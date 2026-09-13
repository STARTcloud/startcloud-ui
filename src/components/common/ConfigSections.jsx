import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { FaDatabase, FaEnvelope, FaGear, FaGears, FaShieldHalved } from 'react-icons/fa6';

import { useFolds } from '../../hooks/useFolds';
import { formRulesShape } from '../../hooks/useFormRules';
import { valueAt } from '../../utils/schemaSections';
import { isVisible, scopesFor } from '../../utils/validation';

import ConfigAction from './ConfigAction';
import ConfigField, { configFieldShape } from './ConfigField';
import ConfigMap from './ConfigMap';
import SectionCard, { foldsShape } from './SectionCard';

const SECTION_ICONS = {
  authentication: FaShieldHalved,
  database: FaDatabase,
  mail: FaEnvelope,
  application: FaGears,
};

const subsectionShape = PropTypes.shape({
  key: PropTypes.string.isRequired,
  title: PropTypes.string.isRequired,
  fields: PropTypes.arrayOf(configFieldShape).isRequired,
});

export const sectionShape = PropTypes.shape({
  key: PropTypes.string.isRequired,
  title: PropTypes.string.isRequired,
  action: PropTypes.object,
  fields: PropTypes.arrayOf(configFieldShape).isRequired,
  subsections: PropTypes.arrayOf(subsectionShape).isRequired,
});

const drawingShape = {
  config: PropTypes.object.isRequired,
  rules: formRulesShape.isRequired,
  nameFor: PropTypes.func.isRequired,
  onChange: PropTypes.func.isRequired,
  callAction: PropTypes.func,
  guard: PropTypes.func,
  Sections: PropTypes.elementType.isRequired,
};

const matchesField = (field, term) =>
  !term || field.title.toLowerCase().includes(term) || field.key.toLowerCase().includes(term);

/**
 * The sections whose fields match a search term by title or key, empty
 * sections and subsections dropped; a map field always matches.
 *
 * @param {Array<Object>} sections - From `schemaSections`
 * @param {string} term - The lower-cased search term
 * @returns {Array<Object>}
 */
export const filterSections = (sections, term) =>
  sections
    .map(section => ({
      ...section,
      fields: section.fields.filter(
        field => field.additionalProperties || matchesField(field, term)
      ),
      subsections: section.subsections
        .map(subsection => ({
          ...subsection,
          fields: subsection.fields.filter(
            field => field.additionalProperties || matchesField(field, term)
          ),
        }))
        .filter(subsection => subsection.fields.length > 0),
    }))
    .filter(section => section.fields.length > 0 || section.subsections.length > 0);

const scalarCount = fields => fields.filter(field => !field.additionalProperties).length;

/**
 * How many scalar fields the sections carry, map fields left out.
 *
 * @param {Array<Object>} sections - From `schemaSections`
 * @returns {number}
 */
export const countFields = sections =>
  sections.reduce(
    (count, section) =>
      count +
      scalarCount(section.fields) +
      section.subsections.reduce((sum, subsection) => sum + scalarCount(subsection.fields), 0),
    0
  );

const isSchema = value => value !== null && typeof value === 'object';

const entriesOf = value =>
  value && typeof value === 'object' && !Array.isArray(value) ? Object.values(value) : [];

const leavesOf = (node, value) => {
  if (isSchema(node.additionalProperties)) {
    return entriesOf(value).reduce(
      (sum, entry) => sum + leavesOf(node.additionalProperties, entry),
      0
    );
  }
  if (node.properties) {
    return Object.entries(node.properties).reduce(
      (sum, [key, property]) => sum + leavesOf(property, value?.[key]),
      0
    );
  }
  return node.type === 'object' ? 0 : 1;
};

const settingCount = (fields, config) =>
  fields.reduce((sum, field) => sum + leavesOf(field, valueAt(config, field.pointer)), 0);

const wideField = field => field.type === 'array' || field.type === 'object';

const parentOf = pointer => pointer.split('/').slice(0, -1).join('/');

const refusalOf = (error, base, nameFor) => ({
  fieldErrors: (error?.fieldErrors || []).map(entry => ({
    ...entry,
    pointer: `/${nameFor(`${base}${String(entry.pointer || '')}`)}`,
  })),
});

const sectionValues = (section, config) => {
  const keys = new Set(
    [...section.fields, ...section.subsections.flatMap(subsection => subsection.fields)].map(
      field => field.pointer.split('/')[1]
    )
  );
  return Object.fromEntries([...keys].map(key => [key, valueAt(config, `/${key}`)]));
};

const SectionIcon = ({ sectionKey }) => {
  const Icon = SECTION_ICONS[sectionKey] || FaGear;
  return <Icon aria-hidden />;
};

SectionIcon.propTypes = {
  sectionKey: PropTypes.string.isRequired,
};

const FieldCell = ({ field, config, rules, nameFor, onChange, callAction = null, guard }) => {
  const name = nameFor(field.pointer);
  const parent = parentOf(field.pointer);
  const action =
    field.action && callAction ? (
      <ConfigAction
        action={field.action}
        title={field.title}
        pointer={field.pointer}
        values={valueAt(config, parent)}
        call={callAction}
        guard={guard}
        onRefused={error => rules.applyServerErrors(refusalOf(error, parent, nameFor))}
      />
    ) : null;
  return (
    <div className={wideField(field) ? 'col-12' : 'col-md-6'}>
      <ConfigField
        field={field}
        id={rules.idFor(name)}
        value={valueAt(config, field.pointer)}
        error={rules.errors[name] || ''}
        onChange={value => onChange(field.pointer, value)}
        onBlur={() => rules.onBlur(name)}
        action={action}
      />
    </div>
  );
};

FieldCell.propTypes = {
  ...drawingShape,
  field: configFieldShape.isRequired,
};

const ConfigFields = ({
  fields,
  config,
  rules,
  nameFor,
  onChange,
  callAction = null,
  guard,
  Sections,
}) => (
  <div className="row">
    {fields
      .filter(field => isVisible(field, scopesFor(config, field.pointer)))
      .map(field =>
        field.additionalProperties ? (
          <div key={field.pointer} className="col-12">
            <ConfigMap
              pointer={field.pointer}
              title={field.title}
              item={field.additionalProperties}
              propertyNames={field.propertyNames}
              value={valueAt(config, field.pointer)}
              onChange={value => onChange(field.pointer, value)}
              rules={rules}
              nameFor={nameFor}
              Sections={Sections}
            />
          </div>
        ) : (
          <FieldCell
            key={field.pointer}
            field={field}
            config={config}
            rules={rules}
            nameFor={nameFor}
            onChange={onChange}
            callAction={callAction}
            guard={guard}
          />
        )
      )}
  </div>
);

ConfigFields.propTypes = {
  ...drawingShape,
  fields: PropTypes.arrayOf(configFieldShape).isRequired,
};

const SettingsBadge = ({ fields, config }) => {
  const { t } = useTranslation();
  const shown = fields.filter(field => isVisible(field, scopesFor(config, field.pointer)));
  return (
    <span className="badge bg-light text-dark">
      {t('configManager.settingsCount', { count: settingCount(shown, config) })}
    </span>
  );
};

SettingsBadge.propTypes = {
  fields: PropTypes.arrayOf(configFieldShape).isRequired,
  config: PropTypes.object.isRequired,
};

const Subsection = ({ sectionKey, subsection, folds, foldId, ...drawing }) => (
  <SectionCard
    icon={<SectionIcon sectionKey={sectionKey} />}
    title={subsection.title}
    badge={<SettingsBadge fields={subsection.fields} config={drawing.config} />}
    className="mb-4"
    folded={folds.folded(foldId)}
    onFold={() => folds.toggle(foldId)}
  >
    <ConfigFields fields={subsection.fields} {...drawing} />
  </SectionCard>
);

Subsection.propTypes = {
  ...drawingShape,
  sectionKey: PropTypes.string.isRequired,
  subsection: subsectionShape.isRequired,
  folds: foldsShape.isRequired,
  foldId: PropTypes.string.isRequired,
};

const Section = ({ section, folds, foldKey, ...drawing }) => {
  const foldId = `${foldKey}${section.key}`;
  const action =
    section.action && drawing.callAction ? (
      <ConfigAction
        action={section.action}
        title={section.title}
        values={sectionValues(section, drawing.config)}
        call={drawing.callAction}
        guard={drawing.guard}
        onRefused={error => drawing.rules.applyServerErrors(refusalOf(error, '', drawing.nameFor))}
      />
    ) : null;
  return (
    <div>
      {section.fields.length > 0 || action ? (
        <SectionCard
          icon={<SectionIcon sectionKey={section.key} />}
          title={section.title}
          badge={<SettingsBadge fields={section.fields} config={drawing.config} />}
          actions={action}
          className="mb-4"
          folded={folds.folded(foldId)}
          onFold={() => folds.toggle(foldId)}
        >
          <ConfigFields fields={section.fields} {...drawing} />
        </SectionCard>
      ) : null}
      {section.subsections.map(subsection => (
        <Subsection
          key={subsection.key}
          sectionKey={section.key}
          subsection={subsection}
          folds={folds}
          foldId={`${foldId}/${subsection.key}`}
          {...drawing}
        />
      ))}
    </div>
  );
};

Section.propTypes = {
  ...drawingShape,
  section: sectionShape.isRequired,
  folds: foldsShape.isRequired,
  foldKey: PropTypes.string.isRequired,
};

/**
 * The sections and foldable subsections of one configuration file, every
 * field drawn through `ConfigField` with the value the pointer names in
 * `config`, the error `rules` holds under `nameFor(pointer)`, and a field
 * hidden by `dependsOn`/`showWhen` folded away; every map field
 * (`additionalProperties`) through the generic `ConfigMap`, the section
 * and subsection heads each a `SectionCard` counting every leaf as a
 * setting, a map's leaves per entry, their folds kept under `prefsKey`
 * (in memory alone without one) with `foldKey` before each section key
 * so a page drawing several files keeps their folds apart; a
 * property-level `action` beside its control and a section-level `action`
 * at the section head, each calling `callAction(route, method, body)`
 * through `guard` and painting a 422's pointers on the form; every map
 * receives this component as `Sections` so its item dialog draws the
 * item schema's sections and subsections the way the page draws the file's.
 */
const ConfigSections = ({ sections, prefsKey = '', foldKey = '', ...drawing }) => {
  const folds = useFolds(prefsKey);
  return sections.map(section => (
    <Section
      key={section.key}
      section={section}
      folds={folds}
      foldKey={foldKey}
      Sections={ConfigSections}
      {...drawing}
    />
  ));
};

ConfigSections.propTypes = {
  config: PropTypes.object.isRequired,
  rules: formRulesShape.isRequired,
  nameFor: PropTypes.func.isRequired,
  onChange: PropTypes.func.isRequired,
  callAction: PropTypes.func,
  guard: PropTypes.func,
  sections: PropTypes.arrayOf(sectionShape).isRequired,
  prefsKey: PropTypes.string,
  foldKey: PropTypes.string,
};

export default ConfigSections;
