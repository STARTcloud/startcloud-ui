import PropTypes from 'prop-types';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  FaChevronDown,
  FaChevronRight,
  FaDatabase,
  FaEnvelope,
  FaGear,
  FaGears,
  FaShieldHalved,
} from 'react-icons/fa6';

import { fieldOf, valueAt } from '../../features/admin/utils/schemaSections';
import { formRulesShape } from '../../hooks/useFormRules';
import { isVisible, scopesFor } from '../../utils/validation';

import ConfigField, { configFieldShape } from './ConfigField';

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
  fields: PropTypes.arrayOf(configFieldShape).isRequired,
  subsections: PropTypes.arrayOf(subsectionShape).isRequired,
});

const drawingShape = {
  config: PropTypes.object.isRequired,
  rules: formRulesShape.isRequired,
  nameFor: PropTypes.func.isRequired,
  onChange: PropTypes.func.isRequired,
  onUpload: PropTypes.func,
  renderMap: PropTypes.func,
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

const wideField = field => field.type === 'array' || field.type === 'object';

const SectionIcon = ({ sectionKey }) => {
  const Icon = SECTION_ICONS[sectionKey] || FaGear;
  return <Icon className="me-2" />;
};

SectionIcon.propTypes = {
  sectionKey: PropTypes.string.isRequired,
};

const FieldCell = ({ field, config, rules, nameFor, onChange, onUpload = null }) => {
  const name = nameFor(field.pointer);
  return (
    <div className={wideField(field) ? 'col-12' : 'col-md-6'}>
      <ConfigField
        field={field}
        id={rules.idFor(name)}
        value={valueAt(config, field.pointer)}
        error={rules.errors[name] || ''}
        onChange={value => onChange(field.pointer, value)}
        onBlur={() => rules.onBlur(name)}
        onUpload={onUpload && field.upload ? file => onUpload(field.pointer, file) : null}
      />
    </div>
  );
};

FieldCell.propTypes = {
  field: configFieldShape.isRequired,
  config: PropTypes.object.isRequired,
  rules: formRulesShape.isRequired,
  nameFor: PropTypes.func.isRequired,
  onChange: PropTypes.func.isRequired,
  onUpload: PropTypes.func,
};

const MapFields = ({ field, config, rules, nameFor, onChange }) => {
  const entries = valueAt(config, field.pointer);
  return Object.keys(entries && typeof entries === 'object' ? entries : {}).map(key => {
    const pointer = `${field.pointer}/${key}`;
    const entry = fieldOf({ pointer, key, property: field.additionalProperties, required: false });
    return (
      <FieldCell
        key={pointer}
        field={entry}
        config={config}
        rules={rules}
        nameFor={nameFor}
        onChange={onChange}
      />
    );
  });
};

MapFields.propTypes = {
  field: configFieldShape.isRequired,
  config: PropTypes.object.isRequired,
  rules: formRulesShape.isRequired,
  nameFor: PropTypes.func.isRequired,
  onChange: PropTypes.func.isRequired,
};

const ConfigFields = ({
  fields,
  config,
  rules,
  nameFor,
  onChange,
  onUpload = null,
  renderMap = null,
}) => (
  <div className="row">
    {fields
      .filter(field => isVisible(field, scopesFor(config, field.pointer)))
      .map(field => {
        if (!field.additionalProperties) {
          return (
            <FieldCell
              key={field.pointer}
              field={field}
              config={config}
              rules={rules}
              nameFor={nameFor}
              onChange={onChange}
              onUpload={onUpload}
            />
          );
        }
        const custom = renderMap ? renderMap(field) : null;
        return (
          custom || (
            <MapFields
              key={field.pointer}
              field={field}
              config={config}
              rules={rules}
              nameFor={nameFor}
              onChange={onChange}
            />
          )
        );
      })}
  </div>
);

ConfigFields.propTypes = {
  ...drawingShape,
  fields: PropTypes.arrayOf(configFieldShape).isRequired,
};

const Subsection = ({ sectionKey, subsection, ...drawing }) => {
  const { t } = useTranslation();
  const [collapsed, setCollapsed] = useState(false);
  const shown = subsection.fields.filter(field =>
    isVisible(field, scopesFor(drawing.config, field.pointer))
  );
  return (
    <div className="card mb-4">
      <button
        type="button"
        className="card-header text-start w-100 border-0"
        onClick={() => setCollapsed(current => !current)}
        aria-expanded={!collapsed}
      >
        <h6 className="mb-0">
          {collapsed ? <FaChevronRight className="me-2" /> : <FaChevronDown className="me-2" />}
          <SectionIcon sectionKey={sectionKey} />
          {subsection.title || t(`configManager.subsections.${subsection.key}`)}
          <span className="badge bg-light text-dark ms-2">
            {t('configManager.settingsCount', { count: scalarCount(shown) })}
          </span>
        </h6>
      </button>
      {!collapsed && (
        <div className="card-body">
          <ConfigFields fields={subsection.fields} {...drawing} />
        </div>
      )}
    </div>
  );
};

Subsection.propTypes = {
  ...drawingShape,
  sectionKey: PropTypes.string.isRequired,
  subsection: subsectionShape.isRequired,
};

const Section = ({ section, ...drawing }) => {
  const { t } = useTranslation();
  return (
    <div>
      {section.fields.length > 0 && (
        <div className="card mb-4">
          <div className="card-header">
            <h5 className="mb-0">
              <SectionIcon sectionKey={section.key} />
              {section.title || t(`configManager.sections.${section.key}`)}
              <span className="badge bg-light text-dark ms-2">
                {t('configManager.settingsCount', { count: scalarCount(section.fields) })}
              </span>
            </h5>
          </div>
          <div className="card-body">
            <ConfigFields fields={section.fields} {...drawing} />
          </div>
        </div>
      )}
      {section.subsections.map(subsection => (
        <Subsection
          key={subsection.key}
          sectionKey={section.key}
          subsection={subsection}
          {...drawing}
        />
      ))}
    </div>
  );
};

Section.propTypes = { ...drawingShape, section: sectionShape.isRequired };

/**
 * The sections and foldable subsections of one configuration file, every
 * field drawn through `ConfigField` with the value the pointer names in
 * `config`, the error `rules` holds under `nameFor(pointer)`, and a field
 * hidden by `dependsOn`/`showWhen` folded away; a map field
 * (`additionalProperties`) is drawn as one field per entry unless
 * `renderMap(field)` answers an element for it.
 */
const ConfigSections = ({ sections, ...drawing }) =>
  sections.map(section => <Section key={section.key} section={section} {...drawing} />);

ConfigSections.propTypes = {
  ...drawingShape,
  sections: PropTypes.arrayOf(sectionShape).isRequired,
};

export default ConfigSections;
