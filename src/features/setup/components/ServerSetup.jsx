import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';

import SectionCard from '../../../components/common/SectionCard';
import { useNotify } from '../../../contexts/NoticeContext';
import { useFolds } from '../../../hooks/useFolds';
import { pageContextShape } from '../../../utils/itemShape';
import { addServer, testServer } from '../../hosts/api/servers';
import { useServers } from '../../hosts/hooks/useServers';

const EMPTY = {
  hostname: '',
  port: '5001',
  protocol: 'https',
  entityName: 'Hyperweaver-Production',
};

const messageOf = error => error?.data?.message || error?.message || '';

const bodyOf = form => ({
  hostname: form.hostname,
  port: Number.parseInt(form.port, 10),
  protocol: form.protocol,
});

/**
 * The server setup of the hyperweaver-server role at `/setup/server`,
 * hyperweaver-ui's `ServerSetup`, behind `hosts`: the first agent's
 * protocol, hostname, port and entity name in one section card, Test
 * connection sending `POST /api/servers/test`, and Bootstrap sending
 * `POST /api/servers` then the same test, one notice each, the list of
 * servers read again and the home page opened on a verified bootstrap,
 * hyperweaver-ui's two-second wait not carried over; a visitor is told
 * to sign in first, with Sign in as the way.
 */
const ServerSetup = ({ context }) => {
  const { t } = useTranslation();
  const notify = useNotify();
  const navigate = useNavigate();
  const { refresh } = useServers();
  const folds = useFolds('table_prefs_setup');
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const signedIn = Boolean(context.user);

  useEffect(() => {
    document.title = t('auth.serverSetup.serverSetupTitle');
  }, [t]);

  const change = (member, value) => setForm(current => ({ ...current, [member]: value }));

  const complete = form.hostname && form.port && form.protocol;

  const test = async () => {
    if (!complete) {
      notify('warning', t('auth.serverSetup.fillFieldsFirst'));
      return false;
    }
    if (!signedIn) {
      notify('warning', t('auth.serverSetup.loginFirstTest'));
      return false;
    }
    setBusy(true);
    try {
      const answer = await testServer(bodyOf(form));
      if (answer?.success === false) {
        notify('danger', t('auth.serverSetup.testFailedCheckDetails'));
        return false;
      }
      notify('success', t('auth.serverSetup.testSuccessMsg'));
      return true;
    } catch (error) {
      notify('danger', messageOf(error) || t('auth.serverSetup.testFailedCheckDetails'));
      return false;
    } finally {
      setBusy(false);
    }
  };

  const bootstrap = async event => {
    event.preventDefault();
    if (!complete || !form.entityName) {
      notify('warning', t('auth.serverSetup.allFieldsRequired'));
      return;
    }
    if (!signedIn) {
      notify('warning', t('auth.serverSetup.loginFirstBootstrap'));
      return;
    }
    setBusy(true);
    try {
      await addServer({ ...bodyOf(form), entityName: form.entityName });
      notify('success', t('auth.serverSetup.bootstrapSuccessMsg'));
    } catch (error) {
      notify('danger', messageOf(error) || t('auth.serverSetup.unexpectedError'));
      setBusy(false);
      return;
    }
    setBusy(false);
    if (await test()) {
      notify('success', t('auth.serverSetup.bootstrapVerifiedMsg'));
      refresh();
      navigate('/');
    }
  };

  return (
    <div className="container mt-5" data-page="server-setup">
      <SectionCard
        title={t('auth.serverSetup.serverSetupTitle')}
        folded={folds.folded('server-setup')}
        onFold={() => folds.toggle('server-setup')}
      >
        <p className="text-muted mb-4">{t('auth.serverSetup.bootstrapNewServerDesc')}</p>
        {signedIn ? (
          <div className="alert alert-info" role="status">
            <p className="mb-1">
              <strong>
                {t('auth.serverSetup.welcomeMsg', { username: context.user.username })}
              </strong>
            </p>
            <p className="mb-0">{t('auth.serverSetup.canAddServersMsg')}</p>
          </div>
        ) : (
          <div className="alert alert-warning" role="status" data-note="sign-in-first">
            {t('auth.serverSetup.loginFirstBootstrap')}{' '}
            <button
              type="button"
              className="btn btn-link p-0 align-baseline"
              onClick={context.signIn}
            >
              {t('navbar.signIn')}
            </button>
          </div>
        )}
        <form onSubmit={bootstrap} data-form="server-setup">
          <div className="row">
            <div className="col-12 col-md-3">
              <div className="mb-3">
                <label className="form-label" htmlFor="protocol">
                  {t('auth.serverSetup.protocolLabel')}
                </label>
                <select
                  id="protocol"
                  className="form-select"
                  value={form.protocol}
                  onChange={event => change('protocol', event.target.value)}
                  disabled={busy}
                >
                  <option value="https">HTTPS</option>
                  <option value="http">HTTP</option>
                </select>
              </div>
            </div>
            <div className="col-12 col-md-6">
              <div className="mb-3">
                <label className="form-label" htmlFor="hostname">
                  {t('auth.serverSetup.hostnameLabel')}
                </label>
                <input
                  id="hostname"
                  type="text"
                  className="form-control"
                  placeholder={t('auth.serverSetup.hostnamePlaceholder')}
                  value={form.hostname}
                  onChange={event => change('hostname', event.target.value)}
                  disabled={busy}
                />
              </div>
            </div>
            <div className="col-12 col-md-3">
              <div className="mb-3">
                <label className="form-label" htmlFor="port">
                  {t('auth.serverSetup.portLabel')}
                </label>
                <input
                  id="port"
                  type="number"
                  className="form-control"
                  placeholder={t('auth.serverSetup.portPlaceholder')}
                  value={form.port}
                  onChange={event => change('port', event.target.value)}
                  disabled={busy}
                />
              </div>
            </div>
          </div>
          <div className="mb-3">
            <label className="form-label" htmlFor="entityName">
              {t('auth.serverSetup.entityNameLabel')}
            </label>
            <input
              id="entityName"
              type="text"
              className="form-control"
              placeholder={t('auth.serverSetup.entityNamePlaceholder')}
              value={form.entityName}
              onChange={event => change('entityName', event.target.value)}
              disabled={busy}
            />
            <div className="form-text text-muted">{t('auth.serverSetup.entityNameHelpText')}</div>
          </div>
          <div className="d-flex gap-2">
            <button
              type="button"
              className="btn btn-info flex-fill"
              data-action="server-test"
              onClick={test}
              disabled={busy}
            >
              {t('auth.serverSetup.testConnectionBtn')}
            </button>
            <button
              type="submit"
              className="btn btn-primary flex-fill"
              data-action="server-bootstrap"
              disabled={busy}
            >
              {t('auth.serverSetup.bootstrapServerBtn')}
            </button>
          </div>
          <p className="form-text text-muted text-center mt-4">
            <strong>{t('auth.serverSetup.bootstrapNote')}</strong>
          </p>
          <div className="text-center mt-3">
            <Link to="/" className="btn btn-link">
              {t('auth.serverSetup.skipSetupLink')}
            </Link>
          </div>
        </form>
      </SectionCard>
    </div>
  );
};

ServerSetup.propTypes = {
  context: pageContextShape.isRequired,
};

export default ServerSetup;
