import PropTypes from 'prop-types';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaKey } from 'react-icons/fa6';

import Field from '../../../../components/common/Field';
import MethodList, { MethodRow } from '../../../../components/common/MethodList';
import SectionCard, { foldsShape } from '../../../../components/common/SectionCard';
import { errorKeys } from '../../../../components/common/StepUpDialog';
import { useNotify } from '../../../../contexts/NoticeContext';
import { isSupported, register } from '../../../../lib/passkeys';
import { formatRelativeTime } from '../../../../utils/relativeTime';

const isStepUp = error => error?.code === 'step_up_required';

const dateOf = (value, language) => {
  const time = new Date(value);
  return Number.isNaN(time.getTime()) ? '' : time.toLocaleDateString(language);
};

const PasskeySubline = ({ passkey }) => {
  const { t, i18n } = useTranslation();
  return (
    <>
      {passkey.rp_id}
      {' · '}
      {t('profile.security.passkeys.addedOn', {
        date: dateOf(passkey.created_at, i18n.language),
      })}
      {passkey.last_used_at ? (
        <>
          {' · '}
          {t('profile.security.passkeys.lastUsed')}{' '}
          <span title={new Date(passkey.last_used_at).toLocaleString(i18n.language)}>
            {formatRelativeTime(passkey.last_used_at, i18n.language)}
          </span>
        </>
      ) : null}
    </>
  );
};

PasskeySubline.propTypes = {
  passkey: PropTypes.shape({
    rp_id: PropTypes.string,
    created_at: PropTypes.string,
    last_used_at: PropTypes.string,
  }).isRequired,
};

const PasskeyActions = ({ passkey, onRename, onRemove }) => {
  const { t } = useTranslation();
  return (
    <>
      <button
        type="button"
        className="btn btn-sm btn-outline-secondary"
        onClick={() => onRename(passkey)}
      >
        {t('profile.security.passkeys.rename')}
      </button>
      <button
        type="button"
        className="btn btn-sm btn-outline-danger"
        onClick={() => onRemove(passkey)}
      >
        {t('profile.security.passkeys.remove')}
      </button>
    </>
  );
};

PasskeyActions.propTypes = {
  passkey: PropTypes.object.isRequired,
  onRename: PropTypes.func.isRequired,
  onRemove: PropTypes.func.isRequired,
};

/**
 * The Passkeys section of the Security tab, its own section because a
 * passkey is a first factor too: the list with the rp id and dates,
 * Rename over `PATCH /api/user/passkeys/{id}`, Remove over the DELETE,
 * stepped up, and Add with a name through the shared WebAuthn calls,
 * stepped up.
 */
const PasskeysSection = ({ account, guard, onSaved, folds }) => {
  const { t } = useTranslation();
  const notify = useNotify();
  const [rows, setRows] = useState([]);
  const [name, setName] = useState('');
  const [renaming, setRenaming] = useState(null);
  const supported = isSupported();

  const load = useCallback(
    () =>
      account.passkeys
        .list()
        .then(list => setRows(Array.isArray(list) ? list : []))
        .catch(error => notify('danger', t(error.messageKey || 'errors.request'))),
    [account, notify, t]
  );

  useEffect(() => {
    load();
  }, [load]);

  const run = async (call, reason, done) => {
    try {
      await guard(call, reason);
      notify('success', t(done));
      await load();
      await onSaved();
    } catch (error) {
      if (!isStepUp(error)) {
        notify('danger', t(errorKeys(error)));
      }
    }
  };

  const add = async event => {
    event.preventDefault();
    await run(
      () =>
        register({
          creationOptions: account.passkeys.creationOptions,
          register: account.passkeys.register,
          label: name,
        }),
      t('profile.security.passkeys.addReason'),
      'profile.security.passkeys.added'
    );
    setName('');
  };

  const remove = passkey =>
    run(
      () => account.passkeys.remove(passkey.id),
      t('profile.security.passkeys.removeReason', { label: passkey.label }),
      'profile.security.passkeys.removed'
    );

  const startRename = passkey => setRenaming({ id: passkey.id, label: passkey.label || '' });

  const rename = async event => {
    event.preventDefault();
    try {
      await account.passkeys.rename(renaming.id, renaming.label);
      setRenaming(null);
      notify('success', t('profile.security.passkeys.renamed'));
      await load();
    } catch (error) {
      notify('danger', t(errorKeys(error)));
    }
  };

  return (
    <SectionCard
      icon={<FaKey aria-hidden />}
      title={t('profile.security.passkeys.title')}
      folded={folds.folded('passkeys')}
      onFold={() => folds.toggle('passkeys')}
    >
      <p className="small text-body-secondary">{t('profile.security.passkeys.intro')}</p>
      <MethodList empty={t('profile.security.passkeys.none')} className="mb-3">
        {rows.map(passkey => (
          <MethodRow
            key={passkey.id}
            icon={<FaKey aria-hidden />}
            label={passkey.label}
            subline={<PasskeySubline passkey={passkey} />}
            actions={<PasskeyActions passkey={passkey} onRename={startRename} onRemove={remove} />}
          />
        ))}
      </MethodList>
      {renaming ? (
        <form onSubmit={rename} noValidate className="mb-3">
          <Field
            id="profile-passkey-rename"
            label={t('profile.security.passkeys.name')}
            className="mb-2"
          >
            {aria => (
              <input
                {...aria}
                type="text"
                className="form-control"
                value={renaming.label}
                onChange={event =>
                  setRenaming(previous => ({ ...previous, label: event.target.value }))
                }
              />
            )}
          </Field>
          <div className="d-flex gap-2">
            <button type="submit" className="btn btn-sm btn-primary">
              {t('profile.buttons.save')}
            </button>
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary"
              onClick={() => setRenaming(null)}
            >
              {t('profile.buttons.cancel')}
            </button>
          </div>
        </form>
      ) : null}
      {supported ? (
        <form onSubmit={add} noValidate className="mt-3">
          <Field
            id="profile-passkey-name"
            label={t('profile.security.passkeys.name')}
            className="mb-0"
          >
            {aria => (
              <div className="input-group">
                <input
                  {...aria}
                  type="text"
                  className="form-control"
                  value={name}
                  onChange={event => setName(event.target.value)}
                />
                <button type="submit" className="btn btn-outline-primary" disabled={!name}>
                  {t('profile.security.passkeys.add')}
                </button>
              </div>
            )}
          </Field>
        </form>
      ) : (
        <p className="small text-body-secondary mb-0">
          {t('profile.security.passkeys.unsupported')}
        </p>
      )}
    </SectionCard>
  );
};

PasskeysSection.propTypes = {
  account: PropTypes.shape({
    passkeys: PropTypes.shape({
      list: PropTypes.func.isRequired,
      rename: PropTypes.func.isRequired,
      remove: PropTypes.func.isRequired,
      creationOptions: PropTypes.func.isRequired,
      register: PropTypes.func.isRequired,
    }).isRequired,
  }).isRequired,
  guard: PropTypes.func.isRequired,
  onSaved: PropTypes.func.isRequired,
  folds: foldsShape.isRequired,
};

export default PasskeysSection;
