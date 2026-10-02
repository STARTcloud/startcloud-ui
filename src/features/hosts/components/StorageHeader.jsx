import PropTypes from 'prop-types';

import QuerySelects from './QuerySelects';
import RefreshButton from './RefreshButton';

/**
 * The actions of the storage page's heading, hyperweaver-ui's storage
 * header: the time window and the resolution the host's series are read
 * over, drawn while the host offers a series, and Refresh, which reads
 * again everything the page draws. hyperweaver-ui's refresh interval and
 * its Auto and Manual switch are not carried over, because the series
 * grow by the samples the `monitoring` topic pushes and nothing reads on
 * a clock.
 */
const StorageHeader = ({ query, onQuery, series, onRefresh }) => (
  <>
    {series ? <QuerySelects query={query} onChange={onQuery} scope="storageHeader" /> : null}
    <RefreshButton onRefresh={onRefresh} />
  </>
);

StorageHeader.propTypes = {
  query: PropTypes.shape({
    window: PropTypes.string.isRequired,
    resolution: PropTypes.string.isRequired,
  }).isRequired,
  onQuery: PropTypes.func.isRequired,
  series: PropTypes.bool.isRequired,
  onRefresh: PropTypes.func.isRequired,
};

export default StorageHeader;
