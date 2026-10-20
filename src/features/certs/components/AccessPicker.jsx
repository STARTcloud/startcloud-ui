import PropTypes from 'prop-types';

import { StatusMenu, VisibilityMenu, pickedOf } from '../../../components/common/VisibilityPicker';
import { STATUS_VERBS, VISIBILITY_VERBS } from '../../collections/bulkActions';
import { patchOfVerbs } from '../utils/sync';

/**
 * One picker of a bulk pane over store rows: the Visibility or the
 * Status menu `action.picker` names, `count` the rows it acts on, a pick
 * answered to `onAccess` as the access words the pick's wire verbs set.
 */
const AccessPicker = ({ action, count, onAccess }) => {
  const className = `btn btn-sm ${action.variant}`;
  if (action.picker === 'visibility') {
    return (
      <VisibilityMenu
        count={count}
        className={className}
        onPick={body => onAccess(patchOfVerbs(VISIBILITY_VERBS[pickedOf(body)]))}
      />
    );
  }
  return (
    <StatusMenu
      count={count}
      className={className}
      onPick={body =>
        onAccess(patchOfVerbs(STATUS_VERBS[body.published ? 'publish' : 'unpublish']))
      }
    />
  );
};

AccessPicker.propTypes = {
  action: PropTypes.shape({
    picker: PropTypes.string.isRequired,
    variant: PropTypes.string.isRequired,
  }).isRequired,
  count: PropTypes.number.isRequired,
  onAccess: PropTypes.func.isRequired,
};

export default AccessPicker;
