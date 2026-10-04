import PropTypes from 'prop-types';
import { createContext, useContext, useMemo, useState } from 'react';

const CrumbContext = createContext({
  name: '',
  setName: () => undefined,
  noun: '',
  setNoun: () => undefined,
});

/**
 * Holds what the current page says of its data for the crumbs the shell
 * draws from the route: `name`, the name of the data the page shows, and
 * `noun`, the word the page's items go by (a host's Zones or Machines),
 * each empty while no page has set one, and their setters, which
 * `usePageName` calls.
 */
export const CrumbProvider = ({ children }) => {
  const [name, setName] = useState('');
  const [noun, setNoun] = useState('');
  const value = useMemo(() => ({ name, setName, noun, setNoun }), [name, noun]);
  return <CrumbContext.Provider value={value}>{children}</CrumbContext.Provider>;
};

CrumbProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

/**
 * The page name and noun the enclosing `CrumbProvider` holds and their
 * setters.
 *
 * @returns {{ name: string, setName: Function, noun: string, setNoun: Function }} The words and their setters
 */
export const useCrumb = () => useContext(CrumbContext);
