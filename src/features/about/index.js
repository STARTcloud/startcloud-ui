import { lazy } from 'react';

export { default as AboutPage } from './components/AboutPage';
export { hasAbout } from './hasAbout';

export const AboutRoute = lazy(() => import('./components/AboutRoute'));
