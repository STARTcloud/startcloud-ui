import PropTypes from 'prop-types';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';

import EmptyState from '../../../components/common/EmptyState';
import RecordRows from '../../../components/common/RecordRows';
import SectionHeading from '../../../components/common/SectionHeading';
import { usePageName } from '../../../hooks/usePageName';
import { useAdminRead } from '../hooks/useAdminRead';

import AdminLoading from './AdminLoading';
import {
  RowActions,
  UserDialogs,
  statusBadge,
  useUserActions,
  userColumns,
  usersAdapterShape,
} from './UserActions';
import UserRecord from './UserRecord';
import { useRoleCatalog } from './UsersDialogs';

const LIST_PATH = '/admin/users';

const rowsOf = (row, ctx) =>
  userColumns(user => user.username)
    .filter(column => !column.when || column.when([row]))
    .map(column => ({
      key: column.key,
      label: ctx.t(column.labelKey),
      value: column.render ? column.render(row, ctx) : column.value(row, ctx),
    }));

/**
 * Accounts › Users › one account at `/admin/users/:id` over the same
 * `adapter` as the Users page: the record from the adapter's `get(id)`,
 * the page naming its crumb by the username through `usePageName` and
 * drawing a `SectionHeading` titled by the username with the status badge
 * and, in its action pane, the row actions the Users page draws, then the
 * record's rows from the table's own columns, each drawn only while the
 * row carries the field, a column's `render` or, without one, its `value`
 * as the row's value, then the editable `UserRecord` sections where
 * the adapter writes another account, remounted on every save; every
 * action re-reads the record, the delete returning to the list, and an
 * id the adapter answers not found with draws the shared empty state.
 */
const UserPage = ({ adapter, viewer = null }) => {
  const { t, i18n } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const catalog = useRoleCatalog(adapter.roles);
  const [version, setVersion] = useState(0);
  const { data, loading, reload } = useAdminRead({
    read: () => adapter.get(id),
    example: null,
    key: `${id}:${version}`,
  });
  const saved = () => setVersion(current => current + 1);
  const { open, close, onAction, confirmDelete } = useUserActions({
    adapter,
    reload,
    onRemoved: () => navigate(LIST_PATH),
  });
  usePageName(data?.username || '');

  useEffect(() => {
    document.title = data ? data.username : t('admin.users.title');
  }, [data, t]);

  if (loading && !data) {
    return <AdminLoading />;
  }
  if (!data) {
    return <EmptyState title={t('admin.users.notFound')} />;
  }
  const ctx = { t, language: i18n.language };
  return (
    <div className="page-column">
      <SectionHeading
        title={data.username}
        badge={statusBadge(data, t)}
        actions={<RowActions user={data} adapter={adapter} onAction={onAction} />}
      />
      <RecordRows rows={rowsOf(data, ctx)} />
      <UserRecord key={version} user={data} adapter={adapter} viewer={viewer} onSaved={saved} />
      <UserDialogs
        open={open}
        adapter={adapter}
        catalog={catalog}
        onClose={close}
        onSaved={reload}
        onConfirmDelete={confirmDelete}
      />
    </div>
  );
};

UserPage.propTypes = {
  adapter: usersAdapterShape.isRequired,
  viewer: PropTypes.shape({ email: PropTypes.string }),
};

export default UserPage;
