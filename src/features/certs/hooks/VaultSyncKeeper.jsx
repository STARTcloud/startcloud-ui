import PropTypes from 'prop-types';
import { useEffect } from 'react';

import { useVaultSync } from './useVaultSync';

/**
 * The keeper of the shared store's mirror, drawn inside the vault's
 * provider while the host lists `certs-store` and a person is signed in:
 * it draws nothing, runs `useVaultSync` for the organization and the
 * destination given and hands the provider the mirror's `mirror` and
 * `pull` through `onApi`, null again as it leaves.
 */
const VaultSyncKeeper = ({ organization, user, destination, onApi }) => {
  const api = useVaultSync({ organization, user, destination });
  const { mirror, pull } = api;

  useEffect(() => {
    onApi({ mirror, pull });
    return () => onApi(null);
  }, [mirror, pull, onApi]);

  return null;
};

VaultSyncKeeper.propTypes = {
  organization: PropTypes.string.isRequired,
  user: PropTypes.object,
  destination: PropTypes.string.isRequired,
  onApi: PropTypes.func.isRequired,
};

export default VaultSyncKeeper;
