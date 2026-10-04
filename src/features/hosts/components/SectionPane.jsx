import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';

import SectionHeading from '../../../components/common/SectionHeading';
import { sectionTitle } from '../pages';

/**
 * The body column of one section page of a host: the heading row with
 * the section's title, the label of its row in `HOST_PAGES`, the count
 * or state as muted text after it and `actions` flush right, and the
 * section's body under it. `data-page` is `host-section` and
 * `data-section` the section's key.
 */
const SectionPane = ({ section, server, count = null, state = null, actions = null, children }) => {
  const { t } = useTranslation();
  return (
    <div className="list row" data-page="host-section" data-section={section}>
      <SectionHeading
        title={sectionTitle(section, server, '', t)}
        count={count}
        state={state}
        actions={actions}
      />
      {children}
    </div>
  );
};

SectionPane.propTypes = {
  section: PropTypes.string.isRequired,
  server: PropTypes.object.isRequired,
  count: PropTypes.node,
  state: PropTypes.oneOf(['success', 'warning']),
  actions: PropTypes.node,
  children: PropTypes.node.isRequired,
};

export default SectionPane;
