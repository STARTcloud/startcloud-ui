export default {
  'GET /api/status': { status: 200, file: 'status.json' },
  'GET /api/machines': { status: 200, file: 'machines.json' },
  'GET /api/network/addresses': { status: 200, file: 'network-addresses.json' },
  'GET /api/network/vnics': { status: 200, file: 'vnics.json' },
  'POST /api/network/vnics': { status: 202, file: 'queued-vnic-create.json' },
  'GET /api/network/vlans': { status: 200, file: 'vlans.json' },
  'GET /api/network/etherstubs': { status: 200, file: 'etherstubs.json' },
  'GET /api/network/bridges': { status: 200, file: 'bridges.json' },
  'GET /api/network/aggregates': { status: 200, file: 'aggregates.json' },
  'GET /api/services': { status: 200, file: 'services-cdp.json' },
  'GET /api/network/hostname': { status: 200, file: 'hostname.json' },
  'GET /api/system/dns': { status: 200, file: 'dns.json' },
  'GET /api/tasks/b2000000-0000-4000-8000-000000000201': {
    status: 200,
    file: 'task-vnic-200.json',
  },
  'GET /api/tasks/b2000000-0000-4000-8000-000000000201/output': {
    status: 200,
    file: 'task-vnic-output-200.json',
  },
};
