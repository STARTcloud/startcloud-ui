export default {
  'GET /api/status': { status: 200, file: 'status.json' },
  'GET /api/machines/defaults': { status: 200, file: 'defaults-200.json' },
  'GET /api/machines/ostypes': { status: 200, file: 'ostypes-200.json' },
  'GET /api/provisioning/bridged-interfaces': { status: 200, file: 'bridged-interfaces-200.json' },
  'GET /api/storage/pools': { status: 200, file: 'pools-200.json' },
  'GET /api/network/vnics': { status: 200, file: 'vnics-200.json' },
  'GET /api/network/vnics/vnice3_1234_0/properties': {
    status: 200,
    file: 'vnic-properties-200.json',
  },
  'GET /api/storage/dataset': { status: 200, file: 'dataset-200.json' },
  'POST /api/storage/dataset/snapshots': { status: 202, file: 'dataset-snapshot-202.json' },
  'PUT /api/machines/web-1': { status: 200, file: 'modify-accrued-200.json' },
  'PUT /api/machines/web-2': { status: 200, file: 'modify-queued-200.json' },
};
