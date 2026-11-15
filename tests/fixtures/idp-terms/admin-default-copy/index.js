export default {
  'PATCH /api/admin/terms/hcl-mla': { status: 409, file: 'default-copy-409.json' },
  'PATCH /api/admin/terms/hcl-mla?locale=es': { status: 422, file: 'regions-422.json' },
  'DELETE /api/admin/terms/hcl-mla': { status: 409, file: 'default-copy-409.json' },
  'POST /api/admin/terms': { status: 422, file: 'create-422.json' },
  'POST /api/admin/terms/bulk': { status: 200, file: 'bulk-200.json' },
};
