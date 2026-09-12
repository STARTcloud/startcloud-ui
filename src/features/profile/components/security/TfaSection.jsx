import PropTypes from 'prop-types';
import { useCallback, useEffect, useState } from 'react';
import { Button, Modal } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { FaCommentSms, FaMobileScreen } from 'react-icons/fa6';

import CodeInput from '../../../../components/common/CodeInput';
import CopyButton from '../../../../components/common/CopyButton';
import Field from '../../../../components/common/Field';
import MethodList, { MethodRow } from '../../../../components/common/MethodList';
import PhoneInput from '../../../../components/common/PhoneInput';
import { errorKeys } from '../../../../components/common/StepUpDialog';
import { useNotify } from '../../../../contexts/NoticeContext';

const METHOD_ICONS = { SMS: FaCommentSms, APP: FaMobileScreen };

const isStepUp = error => error?.code === 'step_up_required';

const tfaRows = methods =>
  (Array.isArray(methods) ? methods : []).filter(method => method.type !== 'PASSKEY');

const LabelField = ({ id, value, onChange }) => {
  const { t } = useTranslation();
  return (
    <Field id={id} label={t('profile.security.tfa.label')} className="mb-2">
      {aria => (
        <input
          {...aria}
          type="text"
          className="form-control"
          value={value}
          onChange={event => onChange(event.target.value)}
        />
      )}
    </Field>
  );
};

LabelField.propTypes = {
  id: PropTypes.string.isRequired,
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
};

const AddPhone = ({ account, guard, onDone, onFail }) => {
  const { t } = useTranslation();
  const notify = useNotify();
  const [number, setNumber] = useState('');
  const [sent, setSent] = useState('');
  const [code, setCode] = useState('');
  const [label, setLabel] = useState('');

  const send = async () => {
    try {
      await account.tfa.sms.send(number);
      setSent(number);
      setCode('');
      notify('success', t('profile.details.codeSent'));
    } catch (error) {
      onFail(error);
    }
  };

  const verify = async () => {
    try {
      await guard(
        () => account.tfa.sms.verify({ mobile_number: sent, code, label }),
        t('profile.security.tfa.enrollReason')
      );
      notify('success', t('profile.security.tfa.enrolled'));
      await onDone();
    } catch (error) {
      onFail(error);
    }
  };

  return (
    <div className="border rounded p-3 mb-3">
      <h6>{t('profile.security.tfa.addPhone')}</h6>
      <div className="mb-3">
        <label className="form-label" htmlFor="profile-tfa-phone">
          {t('profile.details.mobile')}
        </label>
        <PhoneInput id="profile-tfa-phone" value={number} onChange={setNumber} />
      </div>
      <button
        type="button"
        className="btn btn-sm btn-outline-primary"
        onClick={send}
        disabled={!number}
      >
        {t('profile.details.sendCode')}
      </button>
      {sent ? (
        <div className="mt-3">
          <CodeInput
            id="profile-tfa-phone-code"
            label={t('profile.details.code')}
            value={code}
            onChange={setCode}
            onComplete={setCode}
          />
          <LabelField id="profile-tfa-phone-label" value={label} onChange={setLabel} />
          <button
            type="button"
            className="btn btn-sm btn-primary"
            onClick={verify}
            disabled={sent !== number || code.length < 6}
          >
            {t('profile.details.verify')}
          </button>
        </div>
      ) : null}
    </div>
  );
};

AddPhone.propTypes = {
  account: PropTypes.object.isRequired,
  guard: PropTypes.func.isRequired,
  onDone: PropTypes.func.isRequired,
  onFail: PropTypes.func.isRequired,
};

const AddApp = ({ account, guard, onDone, onFail, onClose }) => {
  const { t } = useTranslation();
  const notify = useNotify();
  const [enrollment, setEnrollment] = useState(null);
  const [code, setCode] = useState('');
  const [label, setLabel] = useState('');

  useEffect(() => {
    let mounted = true;
    guard(() => account.tfa.enroll(), t('profile.security.tfa.enrollReason'))
      .then(data => {
        if (mounted) {
          setEnrollment(data);
        }
      })
      .catch(error => {
        onFail(error);
        if (mounted) {
          onClose();
        }
      });
    return () => {
      mounted = false;
    };
  }, [account, guard, onClose, onFail, t]);

  const verify = async () => {
    try {
      await guard(
        () => account.tfa.app.verify({ code, label }),
        t('profile.security.tfa.enrollReason')
      );
      notify('success', t('profile.security.tfa.enrolled'));
      await onDone();
    } catch (error) {
      onFail(error);
    }
  };

  if (!enrollment) {
    return <p>{t('loading')}</p>;
  }

  return (
    <div className="border rounded p-3 mb-3">
      <h6>{t('profile.security.tfa.addApp')}</h6>
      <p className="small text-body-secondary">{t('profile.security.tfa.scan')}</p>
      <img
        src={enrollment.qr}
        alt={t('profile.security.tfa.qrAlt')}
        width={160}
        height={160}
        className="d-block mb-3"
      />
      <div className="mb-3">
        <label className="form-label" htmlFor="profile-tfa-secret">
          {t('profile.security.tfa.setupKey')}
        </label>
        <div className="d-flex gap-2">
          <input
            id="profile-tfa-secret"
            type="text"
            className="form-control font-monospace"
            value={enrollment.secret}
            readOnly
          />
          <CopyButton
            text={enrollment.secret}
            label={t('profile.security.tfa.copyKey')}
            className="btn btn-outline-secondary text-nowrap"
          />
        </div>
      </div>
      <CodeInput
        id="profile-tfa-app-code"
        label={t('profile.security.tfa.appCode')}
        value={code}
        onChange={setCode}
        onComplete={setCode}
      />
      <LabelField id="profile-tfa-app-label" value={label} onChange={setLabel} />
      <button
        type="button"
        className="btn btn-sm btn-primary"
        onClick={verify}
        disabled={code.length < 6}
      >
        {t('profile.details.verify')}
      </button>
    </div>
  );
};

AddApp.propTypes = {
  account: PropTypes.object.isRequired,
  guard: PropTypes.func.isRequired,
  onDone: PropTypes.func.isRequired,
  onFail: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
};

const DisableDialog = ({ show, onHide, onConfirm }) => {
  const { t } = useTranslation();
  return (
    <Modal show={show} onHide={onHide} centered dialogClassName="form-modal" scrollable>
      <Modal.Header closeButton className="bg-danger-subtle">
        <Modal.Title as="h5">{t('profile.security.tfa.disableTitle')}</Modal.Title>
      </Modal.Header>
      <Modal.Body>{t('profile.security.tfa.disableBody')}</Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>
          {t('pages.confirm.cancel')}
        </Button>
        <Button variant="danger" onClick={onConfirm}>
          {t('profile.security.tfa.disable')}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

DisableDialog.propTypes = {
  show: PropTypes.bool.isRequired,
  onHide: PropTypes.func.isRequired,
  onConfirm: PropTypes.func.isRequired,
};

const MethodActions = ({ method, last, onPrefer, onRemove }) => {
  const { t } = useTranslation();
  return (
    <>
      {method.preferred ? null : (
        <button
          type="button"
          className="btn btn-sm btn-outline-secondary"
          onClick={() => onPrefer(method)}
        >
          {t('profile.security.tfa.setPreferred')}
        </button>
      )}
      <span title={last ? t('profile.security.tfa.lastMethod') : undefined}>
        <button
          type="button"
          className="btn btn-sm btn-outline-danger"
          disabled={last}
          onClick={() => onRemove(method)}
        >
          {t('profile.security.tfa.remove')}
        </button>
      </span>
    </>
  );
};

MethodActions.propTypes = {
  method: PropTypes.shape({ preferred: PropTypes.bool }).isRequired,
  last: PropTypes.bool.isRequired,
  onPrefer: PropTypes.func.isRequired,
  onRemove: PropTypes.func.isRequired,
};

const ToggleButton = ({ enabled, count, onEnable, onDisable }) => {
  const { t } = useTranslation();
  if (enabled) {
    return (
      <button type="button" className="btn btn-sm btn-outline-danger" onClick={onDisable}>
        {t('profile.security.tfa.disable')}
      </button>
    );
  }
  return (
    <span title={count === 0 ? t('errors.no_methods') : undefined}>
      <button
        type="button"
        className="btn btn-sm btn-primary"
        disabled={count === 0}
        onClick={onEnable}
      >
        {t('profile.security.tfa.enable')}
      </button>
    </span>
  );
};

ToggleButton.propTypes = {
  enabled: PropTypes.bool.isRequired,
  count: PropTypes.number.isRequired,
  onEnable: PropTypes.func.isRequired,
  onDisable: PropTypes.func.isRequired,
};

/**
 * The Two-factor section of the Security tab: the enrolled methods with
 * the Preferred badge, Set preferred and Remove (the last method's Remove
 * disabled with a tooltip), the locked-method notices with Re-enroll now,
 * the SMS risk notice, Add phone number and Add authenticator app inline,
 * and Enable or Disable two-factor, the disable dialog stepping up; every
 * change is stepped up and re-reads the methods.
 */
const TfaSection = ({ account, profile, guard, onSaved }) => {
  const { t } = useTranslation();
  const notify = useNotify();
  const [methods, setMethods] = useState([]);
  const [adding, setAdding] = useState('');
  const [showDisable, setShowDisable] = useState(false);
  const tfa = profile.tfa || {};
  const locked = Array.isArray(tfa.locked) ? tfa.locked : [];
  const rows = tfaRows(methods);

  const load = useCallback(
    () =>
      account.tfa
        .methods()
        .then(list => setMethods(Array.isArray(list) ? list : []))
        .catch(error => notify('danger', t(error.messageKey || 'errors.request'))),
    [account, notify, t]
  );

  useEffect(() => {
    load();
  }, [load]);

  const fail = useCallback(
    error => {
      if (!isStepUp(error)) {
        notify('danger', t(errorKeys(error)));
      }
    },
    [notify, t]
  );

  const run = async (call, reason, done) => {
    try {
      await guard(call, reason);
      notify('success', t(done));
      await load();
      await onSaved();
    } catch (error) {
      fail(error);
    }
  };

  const closeAdding = useCallback(() => setAdding(''), []);

  const finishAdding = async () => {
    setAdding('');
    await load();
    await onSaved();
  };

  const prefer = method =>
    run(
      () => account.tfa.prefer({ authenticator_id: method.id }),
      t('profile.security.tfa.preferReason'),
      'profile.security.tfa.preferred'
    );

  const remove = method =>
    run(
      () => account.tfa.remove(method.id),
      t('profile.security.tfa.removeReason', { method: method.display || method.label }),
      'profile.security.tfa.removed'
    );

  const toggle = enabled =>
    run(
      () => account.tfa.set({ enabled }),
      t(enabled ? 'profile.security.tfa.enableReason' : 'profile.security.tfa.disableReason'),
      enabled ? 'profile.security.tfa.enabledDone' : 'profile.security.tfa.disabledDone'
    );

  const labelOf = method =>
    method.type === 'SMS' ? t('profile.security.tfa.sms') : t('profile.security.tfa.app');

  return (
    <div className="mb-4">
      <h5>
        {t('profile.security.tfa.title')}{' '}
        <span className={`badge ${tfa.enabled ? 'bg-success' : 'bg-secondary'}`}>
          {tfa.enabled ? t('profile.security.tfa.on') : t('profile.security.tfa.off')}
        </span>
      </h5>
      {locked.map(method => (
        <div
          key={method}
          className="alert alert-warning d-flex align-items-center gap-2"
          role="status"
        >
          <span className="flex-grow-1">{t('profile.security.tfa.locked', { method })}</span>
          <button
            type="button"
            className="btn btn-sm btn-outline-secondary"
            onClick={() => setAdding(method === 'SMS' ? 'phone' : 'app')}
          >
            {t('profile.security.tfa.reenroll')}
          </button>
        </div>
      ))}
      {rows.some(method => method.type === 'SMS') ? (
        <p className="small text-body-secondary">{t('profile.security.tfa.smsRisk')}</p>
      ) : null}
      <MethodList empty={t('profile.security.tfa.noMethods')} className="mb-3">
        {rows.map(method => {
          const Icon = METHOD_ICONS[method.type] || FaMobileScreen;
          const actions = (
            <MethodActions
              method={method}
              last={rows.length === 1}
              onPrefer={prefer}
              onRemove={remove}
            />
          );
          return (
            <MethodRow
              key={method.id}
              icon={<Icon aria-hidden />}
              label={labelOf(method)}
              badges={
                method.preferred ? (
                  <span className="badge bg-primary">
                    {t('profile.security.tfa.preferredBadge')}
                  </span>
                ) : null
              }
              subline={method.display || method.label}
              actions={actions}
            />
          );
        })}
      </MethodList>
      <div className="d-flex flex-wrap gap-2 mb-3">
        <button
          type="button"
          className="btn btn-sm btn-outline-secondary"
          onClick={() => setAdding('phone')}
        >
          {t('profile.security.tfa.addPhone')}
        </button>
        <button
          type="button"
          className="btn btn-sm btn-outline-secondary"
          onClick={() => setAdding('app')}
        >
          {t('profile.security.tfa.addApp')}
        </button>
        <ToggleButton
          enabled={Boolean(tfa.enabled)}
          count={rows.length}
          onEnable={() => toggle(true)}
          onDisable={() => setShowDisable(true)}
        />
      </div>
      {adding === 'phone' ? (
        <AddPhone account={account} guard={guard} onDone={finishAdding} onFail={fail} />
      ) : null}
      {adding === 'app' ? (
        <AddApp
          account={account}
          guard={guard}
          onDone={finishAdding}
          onFail={fail}
          onClose={closeAdding}
        />
      ) : null}
      <DisableDialog
        show={showDisable}
        onHide={() => setShowDisable(false)}
        onConfirm={() => {
          setShowDisable(false);
          toggle(false);
        }}
      />
    </div>
  );
};

TfaSection.propTypes = {
  account: PropTypes.shape({ tfa: PropTypes.object.isRequired }).isRequired,
  profile: PropTypes.shape({
    tfa: PropTypes.shape({
      enabled: PropTypes.bool,
      locked: PropTypes.array,
    }),
  }).isRequired,
  guard: PropTypes.func.isRequired,
  onSaved: PropTypes.func.isRequired,
};

export default TfaSection;
