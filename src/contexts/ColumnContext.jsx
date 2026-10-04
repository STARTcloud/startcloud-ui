import { createContext } from 'react';

/**
 * The element of the shell a page's column renders into, beside the one
 * scroll region and under the header, the way the sidebar stands beside
 * the stack; null until the shell has mounted it.
 */
export const ColumnContext = createContext(null);
