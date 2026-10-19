import PropTypes from 'prop-types';
import { useState } from 'react';
import { Spinner } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { FaFileSignature, FaStamp } from 'react-icons/fa6';

import FormErrorSummary from '../../../../components/common/FormErrorSummary';
import MethodList, { MethodRow } from '../../../../components/common/MethodList';
import SectionCard from '../../../../components/common/SectionCard';
import { useNotify } from '../../../../contexts/NoticeContext';
import { formRulesShape, useFormRules } from '../../../../hooks/useFormRules';
import { useEngine } from '../../hooks/useEngine';
import { useVault } from '../../hooks/useVault';
import { firstOf } from '../../utils/components';
import { downloadText } from '../../utils/download';
import { CERT_COMPONENT_KINDS, algorithmOf, nameOf, relationships } from '../../utils/records';
import { SIGN_LABELS, SIGN_SCHEMA } from '../../utils/schemas';
import { SelectField, SwitchField } from '../fields';
import InputZone from '../InputZone';
import SignatureSelect from '../SignatureSelect';

import { issuedFileName, issuedRecord } from './CertificateTab';
import IssueFields, { EMPTY_ISSUE, issueOf } from './IssueFields';
import Outcome from './Outcome';

const PEM = 'application/x-pem-file';

const EMPTY_DRAFT = {
  request_mode: '',
  request_id: '',
  request: null,
  authority_mode: '',
  authority_id: '',
  authority_cert: null,
  authority_key: null,
  signature: 'pkcs1',
  copy_extensions: true,
  ...EMPTY_ISSUE,
};

const modeOf = (chosen, options) => chosen || (options.length > 0 ? 'vault' : 'paste');

const withModes = (draft, requests, authorities) => ({
  ...draft,
  request_mode: modeOf(draft.request_mode, requests),
  authority_mode: modeOf(draft.authority_mode, authorities),
});

const Picker = ({
  prefix,
  options,
  draft,
  rules,
  onChange,
  pasteLabel,
  emptyHint,
  onDetected,
  note = '',
  children,
}) => {
  const { t } = useTranslation();
  const mode = `${prefix}_mode`;
  const id = `${prefix}_id`;
  const none = options.length === 0;
  return (
    <fieldset className="mb-3" data-panel={`${prefix}-pick`}>
      <legend className="form-label fs-6">{rules.labelFor(id)}</legend>
      <SwitchField
        name={mode}
        draft={{ [mode]: draft[mode] === 'paste' }}
        rules={rules}
        onChange={(name, on) => onChange(name, on ? 'paste' : 'vault')}
        disabled={none}
        hint={none ? emptyHint : ''}
      />
      {draft[mode] === 'vault' ? (
        <SelectField
          name={id}
          options={options.map(option => ({ value: option.id, label: nameOf(option) }))}
          blank={t('certs.generate.pickOne')}
          draft={draft}
          rules={rules}
          onChange={onChange}
        />
      ) : (
        <>
          <p className="form-label">{pasteLabel}</p>
          <InputZone idPrefix={`${prefix}-zone`} onDetected={onDetected} />
          {children}
        </>
      )}
      {note ? <p className="form-text mb-0 mt-2">{note}</p> : null}
    </fieldset>
  );
};

Picker.propTypes = {
  prefix: PropTypes.oneOf(['request', 'authority']).isRequired,
  options: PropTypes.array.isRequired,
  draft: PropTypes.object.isRequired,
  rules: formRulesShape.isRequired,
  onChange: PropTypes.func.isRequired,
  pasteLabel: PropTypes.string.isRequired,
  emptyHint: PropTypes.string.isRequired,
  onDetected: PropTypes.func.isRequired,
  note: PropTypes.string,
  children: PropTypes.node,
};

const PastedLine = ({ rules, names }) => {
  const { t } = useTranslation();
  return (
    <ul className="small text-body-secondary mb-0">
      {names.map(name => (
        <li key={name} className={rules.errors[name] ? 'text-danger' : ''}>
          {rules.errors[name] || t('certs.generate.pastedRead', { label: rules.labelFor(name) })}
        </li>
      ))}
    </ul>
  );
};

PastedLine.propTypes = {
  rules: formRulesShape.isRequired,
  names: PropTypes.arrayOf(PropTypes.string).isRequired,
};

const pendingOf = (requests, records) =>
  requests.filter(request => !records.some(record => record.links?.request_id === request.id));

const PendingRequests = ({ requests, onPick }) => {
  const { t } = useTranslation();
  return (
    <fieldset className="mb-3" data-panel="pending-requests">
      <legend className="form-label fs-6">
        {t('certs.generate.pending', { count: requests.length })}
      </legend>
      <MethodList empty={t('certs.generate.noPending')}>
        {requests.map(request => {
          const algorithm = algorithmOf(request);
          const pick = (
            <button
              type="button"
              className="btn btn-sm btn-outline-primary"
              data-action="pick-request"
              onClick={() => onPick(request)}
            >
              <FaStamp className="me-1" aria-hidden="true" />
              {t('certs.generate.sign')}
            </button>
          );
          return (
            <MethodRow
              key={request.id}
              icon={<FaFileSignature aria-hidden="true" />}
              label={nameOf(request)}
              subline={request.facts?.subject_dn || null}
              badges={algorithm ? <span className="badge bg-secondary">{algorithm}</span> : null}
              actions={pick}
            />
          );
        })}
      </MethodList>
    </fieldset>
  );
};

PendingRequests.propTypes = {
  requests: PropTypes.array.isRequired,
  onPick: PropTypes.func.isRequired,
};

const requestInput = (draft, requests) => {
  if (draft.request_mode === 'vault') {
    const record = requests.find(entry => entry.id === draft.request_id) || null;
    return record ? { der_b64: record.public_der_b64, record } : null;
  }
  return draft.request ? { der_b64: draft.request.der_b64, record: null } : null;
};

const authorityInput = (draft, authorities, records) => {
  if (draft.authority_mode === 'vault') {
    const record = authorities.find(entry => entry.id === draft.authority_id) || null;
    const key = record ? relationships(record, records).key : null;
    return record && key?.private_der_b64
      ? { cert_der_b64: record.public_der_b64, key_der_b64: key.private_der_b64, record, key }
      : null;
  }
  return draft.authority_cert && draft.authority_key
    ? {
        cert_der_b64: draft.authority_cert.der_b64,
        key_der_b64: draft.authority_key.der_b64,
        record: null,
        key: null,
      }
    : null;
};

const authorityIsRsa = (draft, authorities, records) => {
  const facts =
    draft.authority_mode === 'vault'
      ? authorityInput(draft, authorities, records)?.key?.facts
      : draft.authority_key?.facts;
  return facts?.algorithm === 'RSA';
};

/**
 * The Sign CSR tab of the Generate page: one line saying what it does,
 * the pending requests, the vault's requests no certificate of the vault
 * was issued from, one line each with Sign picking it as the request
 * below, then the request, the vault's select under the Paste instead
 * switch, off while the vault holds a request and on and disabled with
 * its hint otherwise, the paste zone while it is on, read from the
 * vault's records as they stand, then the signing authority the same
 * way, from the vault, one whose key the vault holds, or pasted as a
 * certificate and its key, one line under it saying so, each drop adding
 * what it carried so the two may come from two files, the signature
 * scheme while that key is
 * RSA, the validity, the Authority switch and Copy extensions, Sign
 * issuing the certificate through the engine once
 * the rules say what is held and what is missing, its glyph a spinner
 * while it runs, then Save to vault keeping it linked to the issuer, the
 * request and the request's key, and Download handing the browser the
 * PEM.
 */
const SignTab = ({ fold }) => {
  const { t } = useTranslation();
  const notify = useNotify();
  const vault = useVault();
  const engine = useEngine();
  const requests = vault.records.filter(record => record.kind === 'request');
  const authorities = vault.records.filter(
    record =>
      record.kind === 'authority' && relationships(record, vault.records).key?.private_der_b64
  );
  const [draft, setDraft] = useState(EMPTY_DRAFT);
  const [made, setMade] = useState(null);
  const [saved, setSaved] = useState(false);
  const values = withModes(draft, requests, authorities);
  const rules = useFormRules({
    schema: SIGN_SCHEMA,
    values,
    labels: SIGN_LABELS,
    idPrefix: 'certs-sign',
  });
  const set = (name, value) => setDraft(current => ({ ...current, [name]: value }));

  const pickRequest = request =>
    setDraft(current => ({ ...current, request_mode: 'vault', request_id: request.id }));

  const onRequest = detected =>
    set('request', firstOf(detected, ['csr']) || (detected ? draft.request : null));

  const onAuthority = detected => {
    if (!detected) {
      setDraft(current => ({ ...current, authority_cert: null, authority_key: null }));
      return;
    }
    const cert = firstOf(detected, CERT_COMPONENT_KINDS);
    const key = firstOf(detected, ['key']);
    setDraft(current => ({
      ...current,
      authority_cert: cert || current.authority_cert,
      authority_key: key || current.authority_key,
    }));
  };

  const sign = event => {
    event.preventDefault();
    if (!rules.validateAll()) {
      return;
    }
    const csr = requestInput(values, requests);
    const ca = authorityInput(values, authorities, vault.records);
    engine.run(held => {
      const issued = held.sign_csr({
        csr_der_b64: csr.der_b64,
        ca_cert_der_b64: ca.cert_der_b64,
        ca_key_der_b64: ca.key_der_b64,
        signature: values.signature,
        ...issueOf(values),
        copy_extensions: values.copy_extensions,
      });
      setMade({ ...issued, csr, ca });
      setSaved(false);
    });
  };

  const save = () =>
    vault
      .add(
        issuedRecord(made, {
          issuer_id: made.ca.record?.id || null,
          request_id: made.csr.record?.id || null,
          key_id: made.csr.record?.links?.key_id || null,
        })
      )
      .then(() => {
        setSaved(true);
        notify('success', t('certs.notice.saved'));
      });

  return (
    <SectionCard title={t('certs.generate.signTitle')} folded={fold.folded} onFold={fold.onFold}>
      <p className="text-body-secondary">{t('certs.generate.aboutSign')}</p>
      <PendingRequests requests={pendingOf(requests, vault.records)} onPick={pickRequest} />
      <form onSubmit={sign} noValidate>
        <FormErrorSummary errors={rules.summary} />
        <Picker
          prefix="request"
          options={requests}
          draft={values}
          rules={rules}
          onChange={set}
          pasteLabel={t('certs.generate.pasteRequest')}
          emptyHint={t('certs.generate.noVaultRequest')}
          onDetected={onRequest}
        >
          <PastedLine rules={rules} names={['request']} />
        </Picker>
        <Picker
          prefix="authority"
          options={authorities}
          draft={values}
          rules={rules}
          onChange={set}
          pasteLabel={t('certs.generate.pasteAuthority')}
          emptyHint={t('certs.generate.noVaultAuthority')}
          note={t('certs.generate.authorityQualifies')}
          onDetected={onAuthority}
        >
          <PastedLine rules={rules} names={['authority_cert', 'authority_key']} />
        </Picker>
        {authorityIsRsa(values, authorities, vault.records) ? (
          <SignatureSelect draft={values} rules={rules} onChange={set} />
        ) : null}
        <IssueFields draft={values} rules={rules} onChange={set} />
        <SwitchField name="copy_extensions" draft={values} rules={rules} onChange={set} />
        <button type="submit" className="btn btn-primary" data-action="sign" disabled={engine.busy}>
          {engine.busy ? (
            <Spinner animation="border" size="sm" role="status" className="me-1" />
          ) : (
            <FaStamp className="me-1" aria-hidden="true" />
          )}
          {t('certs.generate.sign')}
        </button>
      </form>
      {made ? (
        <Outcome
          title={t('certs.generate.certificateMade')}
          facts={made.facts}
          pem={made.pem}
          saved={saved}
          onSave={save}
          onDownload={() => downloadText(made.pem, PEM, issuedFileName(made))}
        />
      ) : null}
    </SectionCard>
  );
};

SignTab.propTypes = {
  fold: PropTypes.object.isRequired,
};

export default SignTab;
