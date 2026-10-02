import PropTypes from 'prop-types';

import RefreshButton from './RefreshButton';

/**
 * The actions of the devices page's heading, hyperweaver-ui's device
 * header: Refresh, which reads the four device reads again, the read a
 * person asks for.
 */
const DeviceHeader = ({ onRefresh }) => <RefreshButton onRefresh={onRefresh} />;

DeviceHeader.propTypes = {
  onRefresh: PropTypes.func.isRequired,
};

export default DeviceHeader;
