/**
 * The route segments the organization console answers under
 * `/org-console/:tab`, the list the router checks a tab against and the
 * page component maps to its tabs; kept apart from the component so the
 * router reads the names without loading the page.
 */
export const ORG_CONSOLE_SEGMENTS = ['members', 'requests'];
