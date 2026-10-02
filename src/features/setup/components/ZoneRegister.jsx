import PropTypes from 'prop-types';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import SectionCard from '../../../components/common/SectionCard';
import { useFolds } from '../../../hooks/useFolds';
import { registerZone } from '../api/zoneRegister';

const EMPTY = {
  backendproto: 'http',
  backendhost: '',
  backendport: '',
  backendcode: '',
  frontendproto: '',
  frontendhost: '',
  frontendport: '3000',
  frontendcode: '',
};

const Text = ({ id, labelKey, form, onChange, type = 'text', placeholder = '', autoComplete }) => {
  const { t } = useTranslation();
  return (
    <div className="mb-3">
      <label className="form-label" htmlFor={id}>
        {t(labelKey)}
      </label>
      <input
        id={id}
        type={type}
        className="form-control"
        autoComplete={autoComplete}
        placeholder={placeholder ? t(placeholder) : undefined}
        value={form[id]}
        onChange={event => onChange(id, event.target.value)}
      />
    </div>
  );
};

Text.propTypes = {
  id: PropTypes.string.isRequired,
  labelKey: PropTypes.string.isRequired,
  form: PropTypes.object.isRequired,
  onChange: PropTypes.func.isRequired,
  type: PropTypes.string,
  placeholder: PropTypes.string,
  autoComplete: PropTypes.string,
};

/**
 * The zone register of a zoneweaver-agent at `/setup/zone`,
 * hyperweaver-ui's `ZoneRegister`, behind the `setup` token: the back
 * end's and the front end's protocol, host, port and security code in
 * one section card, sent as one `POST /api/setup`, the agent's own
 * message drawn on a refusal, and the register page opened on success.
 */
const ZoneRegister = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const folds = useFolds('table_prefs_setup');
  const [form, setForm] = useState(EMPTY);
  const [problem, setProblem] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    document.title = t('auth.zoneRegister.registerBtn');
  }, [t]);

  const change = (member, value) => setForm(current => ({ ...current, [member]: value }));

  const submit = async event => {
    event.preventDefault();
    setBusy(true);
    setProblem('');
    try {
      await registerZone(form);
      navigate('/register');
    } catch (error) {
      setProblem(error?.data?.msg || error?.data?.message || error.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="container mt-5" data-page="zone-register">
      <SectionCard
        title={t('auth.zoneRegister.registerBtn')}
        folded={folds.folded('zone-register')}
        onFold={() => folds.toggle('zone-register')}
      >
        <form onSubmit={submit} autoComplete="off" data-form="zone-register">
          <div className="row">
            <div className="col-12 col-md-6">
              <div className="mb-3">
                <label className="form-label" htmlFor="backendproto">
                  {t('auth.zoneRegister.backendProtocolLabel')}
                </label>
                <select
                  className="form-select"
                  id="backendproto"
                  value={form.backendproto}
                  onChange={event => change('backendproto', event.target.value)}
                >
                  <option value="http">http</option>
                  <option value="https">https</option>
                </select>
              </div>
              <Text
                id="backendhost"
                labelKey="auth.zoneRegister.backendAddressLabel"
                placeholder="auth.zoneRegister.backendHostPlaceholder"
                form={form}
                onChange={change}
              />
              <Text
                id="backendport"
                labelKey="auth.zoneRegister.portLabel"
                placeholder="auth.zoneRegister.portPlaceholder"
                autoComplete="off"
                form={form}
                onChange={change}
              />
              <Text
                id="backendcode"
                labelKey="auth.zoneRegister.backendSecurityCodeLabel"
                type="password"
                autoComplete="new-password"
                form={form}
                onChange={change}
              />
            </div>
            <div className="col-12 col-md-6">
              <Text
                id="frontendproto"
                labelKey="auth.zoneRegister.frontendProtocolLabel"
                placeholder="auth.zoneRegister.frontendProtocolPlaceholder"
                form={form}
                onChange={change}
              />
              <Text
                id="frontendhost"
                labelKey="auth.zoneRegister.frontendAddressLabel"
                placeholder="auth.zoneRegister.frontendHostPlaceholder"
                form={form}
                onChange={change}
              />
              <Text
                id="frontendport"
                labelKey="auth.zoneRegister.portLabel"
                placeholder="auth.zoneRegister.portPlaceholder"
                autoComplete="off"
                form={form}
                onChange={change}
              />
              <Text
                id="frontendcode"
                labelKey="auth.zoneRegister.frontendSecurityCodeLabel"
                type="password"
                autoComplete="new-password"
                form={form}
                onChange={change}
              />
            </div>
          </div>
          {problem ? (
            <div className="alert alert-danger" role="alert" data-note="problem">
              {problem}
            </div>
          ) : null}
          <div className="text-center mt-3">
            <button
              type="submit"
              className="btn btn-primary"
              data-action="register"
              disabled={busy}
            >
              {t('auth.zoneRegister.registerBtn')}
            </button>
          </div>
        </form>
      </SectionCard>
    </div>
  );
};

export default ZoneRegister;
