import PropTypes from 'prop-types';

const ICON_URL = /^(?:https:\/\/|\/(?![/\\]))/;

const hideBrokenIcon = event => {
  event.target.classList.add('d-none');
};

const TILES_FROM = 3;

const ProviderIcon = ({ method }) =>
  ICON_URL.test(method.icon_url || '') ? (
    <img
      src={method.icon_url}
      className="auth-provider-icon"
      alt=""
      referrerPolicy="no-referrer"
      onError={hideBrokenIcon}
    />
  ) : null;

ProviderIcon.propTypes = {
  method: PropTypes.shape({ icon_url: PropTypes.string }).isRequired,
};

const ProviderButton = ({ method, primary, loading, loadingProvider, onSelect }) => {
  const providerName = method.id.replace('oidc-', '');
  const variant = primary ? 'auth-btn-primary' : 'auth-btn-secondary';
  const busy = loadingProvider === providerName;
  return (
    <button
      type="button"
      className={`auth-btn auth-btn-block ${variant}${busy ? ' is-loading' : ''}`}
      disabled={loading || Boolean(loadingProvider)}
      onClick={() => onSelect(providerName)}
    >
      <ProviderIcon method={method} />
      <span>{method.name}</span>
    </button>
  );
};

const providerShape = PropTypes.shape({
  id: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  icon_url: PropTypes.string,
});

ProviderButton.propTypes = {
  method: providerShape.isRequired,
  primary: PropTypes.bool.isRequired,
  loading: PropTypes.bool.isRequired,
  loadingProvider: PropTypes.string,
  onSelect: PropTypes.func.isRequired,
};

const ProviderTiles = ({ methods, loading, loadingProvider, onSelect }) => (
  <div className="auth-tiles">
    {methods.map(method => {
      const providerName = method.id.replace('oidc-', '');
      return (
        <button
          key={method.id}
          type="button"
          className={`auth-tile${loadingProvider === providerName ? ' is-loading' : ''}`}
          disabled={loading || Boolean(loadingProvider)}
          onClick={() => onSelect(providerName)}
        >
          <ProviderIcon method={method} />
          <span>{method.name}</span>
        </button>
      );
    })}
  </div>
);

ProviderTiles.propTypes = {
  methods: PropTypes.arrayOf(providerShape).isRequired,
  loading: PropTypes.bool.isRequired,
  loadingProvider: PropTypes.string,
  onSelect: PropTypes.func.isRequired,
};

/**
 * The identity providers of a sign-in or registration page: the default
 * provider as the one filled full-width button (a lone provider is filled
 * too), the others as full-width secondary buttons while they are fewer
 * than three, and as a three-column grid of tiles, the mark above the
 * name, from three on, so a page with many providers grows by a third of
 * a row per provider instead of a row.
 */
const ProviderButtons = ({
  methods,
  defaultProvider,
  loading,
  loadingProvider = null,
  onSelect,
}) => {
  const primary = methods.find(method => method.id === `oidc-${defaultProvider}`) || null;
  const rest = methods.filter(method => method !== primary);
  const action = { loading, loadingProvider, onSelect };
  return (
    <div className="auth-form">
      {primary ? <ProviderButton method={primary} primary {...action} /> : null}
      {rest.length >= TILES_FROM ? (
        <ProviderTiles methods={rest} {...action} />
      ) : (
        rest.map(method => (
          <ProviderButton
            key={method.id}
            method={method}
            primary={methods.length === 1}
            {...action}
          />
        ))
      )}
    </div>
  );
};

ProviderButtons.propTypes = {
  methods: PropTypes.arrayOf(providerShape).isRequired,
  defaultProvider: PropTypes.string,
  loading: PropTypes.bool.isRequired,
  loadingProvider: PropTypes.string,
  onSelect: PropTypes.func.isRequired,
};

export default ProviderButtons;
