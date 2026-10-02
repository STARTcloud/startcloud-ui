/**
 * The columns of the RBAC profiles table, hyperweaver-ui's: the
 * profile's name and its description, its word where a row carries
 * none.
 */
export const PROFILE_COLUMNS = [
  {
    key: 'name',
    kind: 'name',
    labelKey: 'hostTools.ProfilesTab.headerProfileName',
    value: row => row.name || '',
    render: row => <strong>{row.name}</strong>,
  },
  {
    key: 'description',
    kind: 'text',
    labelKey: 'hostTools.ProfilesTab.headerDescription',
    prose: true,
    value: row => row.description || '',
    render: (row, ctx) => (
      <span className="small" title={row.description}>
        {row.description || ctx.t('hostTools.ProfilesTab.naFallback')}
      </span>
    ),
  },
];
