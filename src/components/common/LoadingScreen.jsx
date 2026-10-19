import PropTypes from 'prop-types';
import { Spinner } from 'react-bootstrap';

import BrandLogo from './BrandLogo';

/**
 * The screen the app draws while it has no page to draw yet, the setup
 * gate's check and the lazy loads of the shell: the brand mark over a
 * spinner and the loading word, centred in the window; `label` is the
 * word already translated, so the screen never suspends on a locale.
 */
const LoadingScreen = ({ label }) => (
  <div className="loading-screen" role="status">
    <BrandLogo className="loading-screen-mark" />
    <div className="d-flex align-items-center gap-2">
      <Spinner animation="border" size="sm" />
      <span>{label}</span>
    </div>
  </div>
);

LoadingScreen.propTypes = {
  label: PropTypes.string.isRequired,
};

export default LoadingScreen;
