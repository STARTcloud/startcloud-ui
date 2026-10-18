import PropTypes from 'prop-types';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaDownload, FaRightLeft, FaVault } from 'react-icons/fa6';
import { useSearchParams } from 'react-router-dom';

import FormErrorSummary from '../../../components/common/FormErrorSummary';
import ScopeList from '../../../components/common/ScopeList';
import SectionCard from '../../../components/common/SectionCard';
import { useNotify } from '../../../contexts/NoticeContext';
import { useFolds } from '../../../hooks/useFolds';
import { useFormRules } from '../../../hooks/useFormRules';
import { pageContextShape } from '../../../utils/itemShape';
import { useEngine } from '../hooks/useEngine';
import { useVault } from '../hooks/useVault';
import { componentsOf, recordsOf } from '../utils/components';
import { foldOf } from '../utils/folds';
import { carriedBy, fileStemOf } from '../utils/formats';
import { EMPTY_READ, describeComponent, idOf, pickable, withRead } from '../utils/reads';
import {
  CERT_COMPONENT_KINDS,
  derOf,
  holdsDer,
  kindOf,
  nameOf,
  relationships,
  stemOf,
} from '../utils/records';
import { CONVERT_LABELS, CONVERT_SCHEMA } from '../utils/schemas';

import FormatPicker, { EMPTY_OUTPUT } from './FormatPicker';
import InputZone from './InputZone';

const FOLDS = ['input', 'components', 'output'];

const EMPTY_DRAFT = { ...EMPTY_OUTPUT, picked: [] };

const vaultComponents = (record, records) => {
  const related = relationships(record, records);
  const keyFacts = record.kind === 'key' ? record.facts : related.key?.facts || null;
  return componentsOf(record, related.key, kindOf, derOf).map(component => ({
    ...component,
    source: nameOf(record),
    facts: component.kind === 'key' ? keyFacts : record.facts,
  }));
};

const scopesOf = (components, t, language) =>
  components.map(component => ({
    id: idOf(component),
    label: t(`certs.component.${component.kind}`),
    description: describeComponent(component, t, language),
  }));

const chosenOf = (components, picked) =>
  components
    .filter(component => picked.includes(idOf(component)))
    .map(component => ({ kind: component.kind, der_b64: component.der_b64 }));

const Components = ({ components, picked, rules, read, onToggle }) => {
  const { t, i18n } = useTranslation();
  if (components.length === 0) {
    return (
      <p className="text-body-secondary mb-0">
        {t(read ? 'certs.decode.nothing' : 'certs.convert.noComponents')}
      </p>
    );
  }
  return (
    <ScopeList
      id={rules.idFor('picked')}
      scopes={scopesOf(components, t, i18n.language)}
      checked={picked}
      disabled={components.filter(component => !pickable(component)).map(idOf)}
      onToggle={onToggle}
      name="component"
    />
  );
};

Components.propTypes = {
  components: PropTypes.array.isRequired,
  picked: PropTypes.arrayOf(PropTypes.string).isRequired,
  rules: PropTypes.object.isRequired,
  read: PropTypes.bool.isRequired,
  onToggle: PropTypes.func.isRequired,
};

const Downloads = ({ chosen, busy, onConvert, onSave }) => {
  const { t } = useTranslation();
  const hasCert = chosen.some(component => CERT_COMPONENT_KINDS.includes(component.kind));
  const hasKey = chosen.some(component => component.kind === 'key');
  return (
    <div className="d-flex flex-wrap gap-2">
      <button type="submit" className="btn btn-primary" disabled={busy}>
        <FaRightLeft className="me-1" aria-hidden="true" />
        {t('certs.convert.convert')}
      </button>
      {hasCert && hasKey ? (
        <>
          <button
            type="button"
            className="btn btn-outline-secondary"
            disabled={busy}
            onClick={() => onConvert('fullchain')}
          >
            <FaDownload className="me-1" aria-hidden="true" />
            {t('certs.convert.fullchain')}
          </button>
          <button
            type="button"
            className="btn btn-outline-secondary"
            disabled={busy}
            onClick={() => onConvert('combined')}
          >
            <FaDownload className="me-1" aria-hidden="true" />
            {t('certs.convert.combined')}
          </button>
        </>
      ) : null}
      <button type="button" className="btn btn-outline-success" disabled={busy} onClick={onSave}>
        <FaVault className="me-1" aria-hidden="true" />
        {t('certs.convert.saveToVault')}
      </button>
    </div>
  );
};

Downloads.propTypes = {
  chosen: PropTypes.array.isRequired,
  busy: PropTypes.bool.isRequired,
  onConvert: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
};

const toggled = (picked, id) =>
  picked.includes(id) ? picked.filter(entry => entry !== id) : [...picked, id];

const ConvertBody = ({ record, folds, onClear }) => {
  const { t } = useTranslation();
  const notify = useNotify();
  const vault = useVault();
  const engine = useEngine();
  const [own, setOwn] = useState(() =>
    record
      ? { components: vaultComponents(record, vault.records), name: nameOf(record), read: true }
      : EMPTY_READ
  );
  const [draft, setDraft] = useState(() => ({
    ...EMPTY_DRAFT,
    picked: record ? vaultComponents(record, vault.records).filter(pickable).map(idOf) : [],
  }));
  const rules = useFormRules({
    schema: CONVERT_SCHEMA,
    values: draft,
    labels: CONVERT_LABELS,
    idPrefix: 'certs-convert',
  });
  const chosen = chosenOf(own.components, draft.picked);
  const stem = record ? stemOf(record) : fileStemOf(own.name);

  const detected = (answer, { name }) => {
    if (!answer) {
      setOwn(EMPTY_READ);
      setDraft(EMPTY_DRAFT);
      onClear();
      return;
    }
    const next = withRead(own, answer, name);
    const added = next.components
      .filter(component => pickable(component) && !own.components.includes(component))
      .map(idOf);
    setOwn(next);
    setDraft(held => ({ ...held, picked: [...new Set([...held.picked, ...added])] }));
  };

  const convert = to =>
    engine.run(held => {
      const answer = held.convert({
        components: carriedBy(chosen, to),
        to,
        password: draft.password,
        legacy: draft.legacy,
        friendly_name: draft.friendly_name,
      });
      engine.save(answer, draft.friendly_name || stem, to);
    });

  const submit = event => {
    event.preventDefault();
    if (rules.validateAll()) {
      convert(draft.to);
    }
  };

  const save = () =>
    engine.run(async held => {
      const picked = own.components.filter(component => draft.picked.includes(idOf(component)));
      const fresh = picked.filter(component => !holdsDer(vault.records, component.der_b64));
      const records = recordsOf(fresh, held, stem);
      await Promise.all(records.map(entry => vault.add(entry)));
      notify(
        records.length > 0 ? 'success' : 'info',
        t(records.length > 0 ? 'certs.notice.imported' : 'certs.notice.alreadyHeld', {
          count: records.length,
        })
      );
    });

  return (
    <form onSubmit={submit} noValidate>
      <SectionCard title={t('certs.convert.input')} {...foldOf(folds, FOLDS[0])}>
        {record ? (
          <p className="text-body-secondary">
            {t('certs.convert.fromVault', { name: nameOf(record) })}
          </p>
        ) : null}
        <InputZone onDetected={detected} />
      </SectionCard>
      <SectionCard title={t('certs.convert.components')} {...foldOf(folds, FOLDS[1])}>
        <Components
          components={own.components}
          picked={draft.picked}
          rules={rules}
          read={own.read}
          onToggle={id => setDraft(held => ({ ...held, picked: toggled(held.picked, id) }))}
        />
      </SectionCard>
      <SectionCard title={t('certs.convert.output')} {...foldOf(folds, FOLDS[2])}>
        <FormErrorSummary errors={rules.summary} />
        <FormatPicker
          kinds={[...new Set(chosen.map(component => component.kind))]}
          draft={draft}
          rules={rules}
          onChange={patch => setDraft(held => ({ ...held, ...patch }))}
        />
        <Downloads chosen={chosen} busy={engine.busy} onConvert={convert} onSave={save} />
      </SectionCard>
    </form>
  );
};

ConvertBody.propTypes = {
  record: PropTypes.object,
  folds: PropTypes.object.isRequired,
  onClear: PropTypes.func.isRequired,
};

/**
 * The Convert page at `/certs/convert`: the Input card, its zone open,
 * taking files, a paste and a password, every read adding its
 * components to the ones held so a certificate and its key from two
 * files meet, an unlocked read replacing the locked component of the
 * same file, Clear emptying them and the output; the Components card
 * listing what the engine detected as one scope list, a locked key
 * drawn disabled, the line reading that nothing was understood when a
 * read found no component; and the Output card picking a format that
 * carries every picked kind, its password required where the format
 * cannot be written without one and emptied on a change of format, the
 * legacy switch and the friendly name, Convert handing the browser the
 * file once the rules pass, Download fullchain and Download combined
 * beside it while a certificate and a key are picked, and Save to vault
 * keeping the picked components the vault does not already hold as
 * records, a lone key named by its file; opened with `?record=` the
 * vault record and its key stand in for the first read.
 */
const ConvertPage = ({ context }) => {
  const { t } = useTranslation();
  const vault = useVault();
  const folds = useFolds(`${context.prefsPrefix}_certs_convert`);
  const [params, setParams] = useSearchParams();
  const recordId = params.get('record') || '';
  const record = vault.records.find(entry => entry.id === recordId) || null;

  useEffect(() => {
    document.title = `${t('certs.sidebar.convert')} · ${context.appName}`;
  }, [context.appName, t]);

  return (
    <div className="list row" data-page="certs-convert">
      <ConvertBody
        key={recordId}
        record={record}
        folds={folds}
        onClear={() => setParams({}, { replace: true })}
      />
    </div>
  );
};

ConvertPage.propTypes = {
  context: pageContextShape.isRequired,
};

export default ConvertPage;
