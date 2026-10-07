import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { FaPause, FaPlay, FaRotate } from 'react-icons/fa6';

import { windowMs } from '../utils/monitoring';

import QuerySelects from './QuerySelects';

const PauseButton = ({ controls }) => {
  const { t } = useTranslation();
  const label = t(controls.paused ? 'hosts.charts.resume' : 'hosts.charts.pause');
  const Glyph = controls.paused ? FaPlay : FaPause;
  return (
    <button
      type="button"
      className={`btn btn-sm btn-glyph ${controls.paused ? 'btn-warning' : 'btn-outline-secondary'}`}
      title={label}
      aria-label={label}
      aria-pressed={controls.paused}
      data-tool="pause"
      onClick={controls.toggle}
    >
      <Glyph aria-hidden="true" />
    </button>
  );
};

PauseButton.propTypes = {
  controls: PropTypes.shape({
    paused: PropTypes.bool.isRequired,
    toggle: PropTypes.func.isRequired,
  }).isRequired,
};

/**
 * The actions of the heading row of a page that draws charts: the time
 * window the host's series are read over and, after Refresh, Pause and
 * Resume, both drawn while the host offers a series, and Refresh, a
 * glyph, which reads again everything the page draws. A change of the
 * window hands the member to `onQuery` and re-spans the range the
 * charts hold; Pause holds the drawn range of every chart on the page
 * while samples keep landing in the store, Resume follows live again.
 */
const ChartControls = ({ query, onQuery, scope, series, controls, onRefresh }) => {
  const { t } = useTranslation();
  const refresh = t('hosts.page.refresh');
  const change = patch => {
    onQuery(patch);
    controls.respan(windowMs(patch.window));
  };
  return (
    <>
      {series ? <QuerySelects query={query} onChange={change} scope={scope} /> : null}
      <button
        type="button"
        className="btn btn-sm btn-outline-secondary btn-glyph"
        title={refresh}
        aria-label={refresh}
        data-tool="refresh"
        onClick={onRefresh}
      >
        <FaRotate aria-hidden="true" />
      </button>
      {series ? <PauseButton controls={controls} /> : null}
    </>
  );
};

ChartControls.propTypes = {
  query: PropTypes.shape({
    window: PropTypes.string.isRequired,
  }).isRequired,
  onQuery: PropTypes.func.isRequired,
  scope: PropTypes.oneOf(['hostHeader', 'networkingHeader', 'storageHeader']).isRequired,
  series: PropTypes.bool.isRequired,
  controls: PropTypes.shape({
    paused: PropTypes.bool.isRequired,
    toggle: PropTypes.func.isRequired,
    respan: PropTypes.func.isRequired,
  }).isRequired,
  onRefresh: PropTypes.func.isRequired,
};

export default ChartControls;
