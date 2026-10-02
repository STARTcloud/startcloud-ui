export default {
  'GET /api/status': { status: 200, file: 'status.json' },
  'GET /api/monitoring/storage/pools': { status: 200, file: 'pools.json' },
  'GET /api/monitoring/storage/datasets': { status: 200, file: 'datasets.json' },
  'GET /api/monitoring/storage/disks': { status: 200, file: 'disks.json' },
  'GET /api/monitoring/storage/disk-io': { status: 200, file: 'disk-io.json' },
  'GET /api/monitoring/storage/pool-io': { status: 200, file: 'pool-io.json' },
  'GET /api/monitoring/storage/arc': { status: 200, file: 'arc.json' },
  'GET /api/storage/pools': { status: 200, file: 'storage-pools.json' },
  'GET /api/storage/pools/rpool/status': { status: 200, file: 'pool-rpool-status.json' },
  'GET /api/storage/pools/tank/status': { status: 200, file: 'pool-tank-status.json' },
  'GET /api/storage/datasets': { status: 200, file: 'storage-datasets.json' },
};
