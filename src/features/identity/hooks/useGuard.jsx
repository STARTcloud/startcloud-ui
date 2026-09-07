import PropTypes from 'prop-types';
import { createContext, useContext } from 'react';

import { useStepUp } from '../../../components/common/StepUpDialog';

const GuardContext = createContext(null);

/**
 * The one step-up window of the operator pages: `guard(call, reason)` of
 * the shared `StepUpDialog`, created once around every page so the
 * restart, the user delete and the bulk delete open the same dialog,
 * mounted here once.
 */
export const GuardProvider = ({ stepUp, hasPassword, children }) => {
  const { guard, dialog } = useStepUp({ stepUp, hasPassword });
  return (
    <GuardContext.Provider value={guard}>
      {children}
      {dialog}
    </GuardContext.Provider>
  );
};

GuardProvider.propTypes = {
  stepUp: PropTypes.func.isRequired,
  hasPassword: PropTypes.bool.isRequired,
  children: PropTypes.node.isRequired,
};

/**
 * The `guard(call, reason)` of the enclosing `GuardProvider`: runs a
 * sensitive call and, on a `403 step_up_required`, opens the step-up
 * dialog and retries the same call unchanged.
 *
 * @returns {Function} The guard
 */
export const useGuard = () => useContext(GuardContext);
