import PropTypes from 'prop-types';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaRotate } from 'react-icons/fa6';

import Field from '../../../components/common/Field';
import SectionCard from '../../../components/common/SectionCard';
import { useNotify } from '../../../contexts/NoticeContext';
import { useStatus } from '../../../contexts/StatusContext';
import { useFolds } from '../../../hooks/useFolds';
import { pageContextShape } from '../../../utils/itemShape';
import { formatRelativeTime } from '../../../utils/relativeTime';
import { useVault } from '../hooks/useVault';
import { foldOf } from '../utils/folds';
import { KINDS } from '../utils/records';

const FOLD = 'sync';

const lastSyncedOf = (records, kind) =>
  records
    .filter(record => record.kind === kind && record.remote_id && record.synced_at)
    .map(record => record.synced_at)
    .sort()
    .at(-1) || '';

const KindSwitch = ({ kind, checked, lastSynced, onToggle }) => {
  const { t, i18n } = useTranslation();
  return (
    <Field
      id={`certs-sync/${kind}`}
      label={t(`certs.kind.${kind}`)}
      hint={
        lastSynced
          ? t('certs.sync.lastSynced', { when: formatRelativeTime(lastSynced, i18n.language) })
          : t('certs.sync.never')
      }
      className="mb-2"
    >
      {aria => (
        <div className="form-check form-switch">
          <input
            {...aria}
            type="checkbox"
            className="form-check-input"
            checked={checked}
            onChange={onToggle}
            data-kind={kind}
          />
        </div>
      )}
    </Field>
  );
};

KindSwitch.propTypes = {
  kind: PropTypes.string.isRequired,
  checked: PropTypes.bool.isRequired,
  lastSynced: PropTypes.string.isRequired,
  onToggle: PropTypes.func.isRequired,
};

const SyncForm = ({ held, records, brand, organization, onSave }) => {
  const { t } = useTranslation();
  const [draft, setDraft] = useState(() =>
    Object.fromEntries(KINDS.map(kind => [kind, Boolean(held[kind])]))
  );
  return (
    <form
      onSubmit={event => {
        event.preventDefault();
        onSave(draft);
      }}
      noValidate
    >
      <p className="text-body-secondary">
        {organization
          ? t('certs.sync.body', { name: brand, organization })
          : t('certs.sync.noOrganization', { name: brand })}
      </p>
      {KINDS.map(kind => (
        <KindSwitch
          key={kind}
          kind={kind}
          checked={draft[kind]}
          lastSynced={lastSyncedOf(records, kind)}
          onToggle={() => setDraft(current => ({ ...current, [kind]: !current[kind] }))}
        />
      ))}
      <button type="submit" className="btn btn-primary mt-2" disabled={!organization}>
        <FaRotate className="me-1" aria-hidden="true" />
        {t('certs.sync.save')}
      </button>
    </form>
  );
};

SyncForm.propTypes = {
  held: PropTypes.object.isRequired,
  records: PropTypes.array.isRequired,
  brand: PropTypes.string.isRequired,
  organization: PropTypes.string.isRequired,
  onSave: PropTypes.func.isRequired,
};

/**
 * The sync page at `/certs/sync`, drawn while the host lists
 * `certs-store` and a person is signed in: one card, Sync to the
 * backend's name, naming the organization the rows go to, the active
 * one or the primary membership under All organizations, with one
 * switch a kind and the last time the store answered a record of that
 * kind, Save writing the `sync` preference and sending every unsent
 * record of the kinds newly checked, one success notice while every send
 * went through and none while any was refused; Save is held while the
 * person belongs to no organization.
 */
const SyncPage = ({ context }) => {
  const { t } = useTranslation();
  const status = useStatus();
  const notify = useNotify();
  const vault = useVault();
  const folds = useFolds(`${context.prefsPrefix}_certs_sync`);
  const held = vault.preferences.sync || {};

  useEffect(() => {
    document.title = `${t('certs.sidebar.sync')} · ${context.appName}`;
  }, [context.appName, t]);

  const save = async draft => {
    const added = KINDS.filter(kind => draft[kind] && !held[kind]);
    await vault.setPreference('sync', draft);
    const refused = vault.sync && added.length > 0 ? await vault.sync.mirror(added) : 0;
    if (refused === 0) {
      notify('success', t('certs.notice.syncSaved'));
    }
  };

  return (
    <div className="list row" data-page="certs-sync">
      <SectionCard
        title={t('certs.sync.title', { name: status.brand.name })}
        {...foldOf(folds, FOLD)}
      >
        <SyncForm
          key={JSON.stringify(held)}
          held={held}
          records={vault.records}
          brand={status.brand.name}
          organization={vault.organization}
          onSave={save}
        />
      </SectionCard>
    </div>
  );
};

SyncPage.propTypes = {
  context: pageContextShape.isRequired,
};

export default SyncPage;
