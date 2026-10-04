import PropTypes from 'prop-types';
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import ConfigPage from '../../../components/common/ConfigPage';
import UpdatePage from '../../../components/common/UpdatePage';
import { log } from '../../../lib/logger';
import { returnToShape } from '../../../utils/auth';
import { adminShape } from '../utils/adminShape';

import AdminStorage from './AdminStorage';
import UpdateNotice from './UpdateNotice';

export const ADMIN_PAGES = ['config', 'system', 'update'];

/**
 * One admin page per sidebar entry of an app with configuration of its
 * own: the update notice while the adapter carries `updateStatus` and it
 * reports one, on every page but Update, then the page the route names, Configuration on every
 * host, its empty state when the adapter carries no `config` and reached
 * by URL alone, System while it carries `storage`, Update, the shared
 * `UpdatePage` over the adapter's `update`, while it carries `update`,
 * every call through the app's `admin` adapter; the Users and All
 * organizations pages of a host with accounts of its own are the
 * identity feature's, drawn by the router over the adapter's `users` and
 * `organizations`; the sidebar rows are the one navigation and no tab
 * strip is drawn; the page's own heading is drawn above System alone,
 * Configuration headed by the file's root `title` the shared `ConfigPage`
 * draws and Update by its own heading row; a visitor is sent to sign in
 * and a signed-in non-admin home, `allowed` being the app's global-admin
 * flag.
 */
const AdminPage = ({ session, returnTo, allowed, admin, updateCommand, page }) => {
  const { t } = useTranslation();
  useEffect(() => {
    document.title = t('admin.pageTitle');
  }, [t]);

  const navigate = useNavigate();
  const [updateInfo, setUpdateInfo] = useState(null);

  useEffect(() => {
    if (!session.restore()) {
      navigate(returnTo.signInTo('/admin'));
      return;
    }
    if (!allowed) {
      navigate('/');
      return;
    }
    if (!admin.updateStatus) {
      return;
    }
    admin
      .updateStatus()
      .then(status => {
        if (status.is_apt_managed && status.update_available) {
          setUpdateInfo(status);
        }
      })
      .catch(error => {
        log.api.error('Failed to check for updates', { error: error.message });
      });
  }, [admin, allowed, navigate, returnTo, session]);

  return (
    <div className="list row">
      {page === 'system' ? (
        <header>
          <h3 className="text-center">{t('admin.title')}</h3>
        </header>
      ) : null}
      {updateInfo && page !== 'update' ? (
        <UpdateNotice updateInfo={updateInfo} command={updateCommand} />
      ) : null}
      <div className="mt-2">
        {page === 'config' ? <ConfigPage config={admin.config || null} /> : null}
        {page === 'system' && admin.storage ? <AdminStorage storage={admin.storage} /> : null}
        {page === 'update' && admin.update && allowed ? (
          <UpdatePage update={admin.update} title={t('hosts.nav.update')} />
        ) : null}
      </div>
    </div>
  );
};

AdminPage.propTypes = {
  session: PropTypes.object.isRequired,
  returnTo: returnToShape.isRequired,
  allowed: PropTypes.bool.isRequired,
  admin: adminShape.isRequired,
  updateCommand: PropTypes.string.isRequired,
  page: PropTypes.oneOf(ADMIN_PAGES).isRequired,
};

export default AdminPage;
