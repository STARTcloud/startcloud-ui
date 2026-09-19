import PropTypes from 'prop-types';
import { createContext, useContext, useMemo, useState } from 'react';

const CrumbContext = createContext({ name: '', setName: () => undefined });

/**
 * Holds the name of the data the current page shows, for the last crumb
 * of a page named by its data: `name`, empty while no page has set one,
 * and `setName`, the page's `usePageName` hook writing it.
 */
export const CrumbProvider = ({ children }) => {
  const [name, setName] = useState('');
  const value = useMemo(() => ({ name, setName }), [name]);
  return <CrumbContext.Provider value={value}>{children}</CrumbContext.Provider>;
};

CrumbProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

/**
 * The page name the enclosing `CrumbProvider` holds and its setter.
 *
 * @returns {{ name: string, setName: Function }} The name and its setter
 */
export const useCrumb = () => useContext(CrumbContext);
