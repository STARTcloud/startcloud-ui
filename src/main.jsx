import { probeStatus } from './chrome';

const apps = {
  boxvault: () => import('./apps/boxvault/main.jsx'),
  catalog: () => import('./apps/catalog/main.jsx'),
};

probeStatus()
  .then(status => {
    const load = apps[status.role];
    if (!load) {
      throw new Error(`unknown app role: ${status.role}`);
    }
    return load().then(({ boot }) => boot(status));
  })
  .catch(error => {
    document.getElementById('root').textContent = error.message;
  });
