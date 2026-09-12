import PropTypes from 'prop-types';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaStar } from 'react-icons/fa6';

import MethodList, { MethodRow, httpsUrl } from '../../../components/common/MethodList';
import SortableList from '../../../components/common/SortableList';
import { errorKeys } from '../../../components/common/StepUpDialog';
import { useNotify } from '../../../contexts/NoticeContext';
import { useNavbarSearchBinding } from '../../../hooks/useSearchBinding';
import { log } from '../../../lib/logger';

const byOrder = (a, b) => (a.order || 0) - (b.order || 0);

const matches = (app, needle) =>
  [app.custom_label || '', app.client_name || '', app.client_id].some(text =>
    text.toLowerCase().includes(needle)
  );

const reorderWithin = (all, shown) => {
  const ids = new Set(shown.map(app => app.client_id));
  let index = 0;
  return all.map(app => {
    if (!ids.has(app.client_id)) {
      return app;
    }
    index += 1;
    return shown[index - 1];
  });
};

const iconChainOf = app => {
  const icon = httpsUrl(app.icon_url);
  const home = httpsUrl(app.home_url);
  const favicon = home ? `${new URL(home).origin}/favicon.ico` : '';
  return [...new Set([icon, favicon].filter(Boolean))];
};

const labelOf = app => app.custom_label || app.client_name || app.client_id;

const toBody = list =>
  list.map((app, index) => ({
    client_id: app.client_id,
    custom_label: app.custom_label || null,
    order: index,
  }));

const AppIcon = ({ app }) => {
  const [step, setStep] = useState(0);
  const iconUrl = iconChainOf(app)[step];
  if (!iconUrl) {
    return <FaStar className="text-warning" aria-hidden />;
  }
  return (
    <img
      key={iconUrl}
      src={iconUrl}
      alt=""
      width={24}
      height={24}
      referrerPolicy="no-referrer"
      onError={event => {
        event.currentTarget.classList.add('d-none');
        setStep(current => current + 1);
      }}
    />
  );
};

AppIcon.propTypes = {
  app: PropTypes.object.isRequired,
};

const FavoriteRow = ({ app, handle, onRemove }) => {
  const { t } = useTranslation();
  return (
    <>
      {handle}
      <span className="d-inline-flex justify-content-center flex-shrink-0 method-row-icon">
        <AppIcon app={app} />
      </span>
      <span className="flex-grow-1 fw-semibold text-truncate">{labelOf(app)}</span>
      <button
        type="button"
        className="btn btn-sm btn-outline-secondary"
        onClick={() => onRemove(app)}
      >
        {t('profile.favorites.remove')}
      </button>
    </>
  );
};

FavoriteRow.propTypes = {
  app: PropTypes.object.isRequired,
  handle: PropTypes.node.isRequired,
  onRemove: PropTypes.func.isRequired,
};

const AddButton = ({ app, onAdd }) => {
  const { t } = useTranslation();
  return (
    <button type="button" className="btn btn-sm btn-outline-primary" onClick={() => onAdd(app)}>
      <FaStar className="me-1" aria-hidden />
      {t('profile.favorites.add')}
    </button>
  );
};

AddButton.propTypes = {
  app: PropTypes.object.isRequired,
  onAdd: PropTypes.func.isRequired,
};

/**
 * The Favorites tab of the identity contract: the ordered favorites with
 * drag handles and Remove over `PUT /api/user/favorites`, then the
 * connected applications not yet favorited with Add; the icon chain is
 * `icon_url`, the favicon of `home_url`, the star, every URL drawn only
 * with the `https:` scheme; the navbar search bound with a query over the
 * favorites and the available applications by label and client id.
 */
const FavoritesTab = ({ account }) => {
  const { t } = useTranslation();
  const notify = useNotify();
  const [favorites, setFavorites] = useState([]);
  const [apps, setApps] = useState([]);
  const [query, setQuery] = useState('');

  const load = useCallback(
    () =>
      Promise.all([account.favorites.list(), account.favorites.apps()])
        .then(([list, connected]) => {
          setFavorites([...(Array.isArray(list) ? list : [])].sort(byOrder));
          setApps(Array.isArray(connected) ? connected : []);
        })
        .catch(error => {
          log.api.error('Error loading favorites', { error: error.message });
          notify('danger', t(error.messageKey || 'errors.request'));
        }),
    [account, notify, t]
  );

  useEffect(() => {
    load();
  }, [load]);

  const save = async next => {
    const previous = favorites;
    setFavorites(next);
    try {
      const saved = await account.favorites.save(toBody(next));
      setFavorites([...(Array.isArray(saved) ? saved : next)].sort(byOrder));
    } catch (error) {
      setFavorites(previous);
      notify('danger', t(errorKeys(error)));
    }
  };

  const remove = app => save(favorites.filter(entry => entry.client_id !== app.client_id));

  const add = app =>
    save([
      ...favorites,
      {
        client_id: app.client_id,
        client_name: app.client_name,
        icon_url: app.icon_url,
        order: favorites.length,
      },
    ]);

  const favoriteIds = new Set(favorites.map(app => app.client_id));
  const available = apps.filter(app => !favoriteIds.has(app.client_id));
  const needle = query.trim().toLowerCase();
  const shownFavorites = needle ? favorites.filter(app => matches(app, needle)) : favorites;
  const shownAvailable = needle ? available.filter(app => matches(app, needle)) : available;

  useNavbarSearchBinding({
    query,
    onQueryChange: setQuery,
    placeholder: t('profile.favorites.search'),
    matched: shownFavorites.length + shownAvailable.length,
    total: favorites.length + available.length,
    groups: [],
    onClearFilters: () => setQuery(''),
  });

  return (
    <div className="tab-pane fade show active">
      <h5>{t('profile.favorites.title')}</h5>
      {shownFavorites.length === 0 ? (
        <p className="text-body-secondary small">
          {needle ? t('pages.noMatches') : t('profile.favorites.none')}
        </p>
      ) : (
        <SortableList
          items={shownFavorites}
          keyOf={app => app.client_id}
          onReorder={next => save(reorderWithin(favorites, next))}
          className="mb-4"
          renderItem={(app, handle) => <FavoriteRow app={app} handle={handle} onRemove={remove} />}
        />
      )}
      <h5>{t('profile.favorites.available')}</h5>
      <MethodList empty={needle ? t('pages.noMatches') : t('profile.favorites.noneAvailable')}>
        {shownAvailable.map(app => (
          <MethodRow
            key={app.client_id}
            icon={<AppIcon app={app} />}
            label={app.client_name || app.client_id}
            actions={<AddButton app={app} onAdd={add} />}
          />
        ))}
      </MethodList>
    </div>
  );
};

FavoritesTab.propTypes = {
  account: PropTypes.shape({
    favorites: PropTypes.shape({
      list: PropTypes.func.isRequired,
      save: PropTypes.func.isRequired,
      apps: PropTypes.func.isRequired,
    }).isRequired,
  }).isRequired,
};

export default FavoritesTab;
