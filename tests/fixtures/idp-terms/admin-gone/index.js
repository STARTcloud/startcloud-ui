export default {
  'PATCH /api/admin/terms/hcl-mla': {
    status: 404,
    file: 'gone-404.json',
    refused: 'patch-422.json',
  },
  'DELETE /api/admin/terms/hcl-mla': { status: 404, file: 'gone-404.json' },
  'POST /api/admin/terms/hcl-mla/publish': {
    status: 404,
    file: 'gone-404.json',
    refused: 'publish-422.json',
  },
};
