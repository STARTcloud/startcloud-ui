import { FaUserShield } from 'react-icons/fa6';

/**
 * The columns of the RBAC roles table, hyperweaver-ui's: the role's
 * name with its glyph and its description, its word where a row
 * carries none.
 */
export const RBAC_ROLE_COLUMNS = [
  {
    key: 'name',
    kind: 'name',
    labelKey: 'hostTools.RolesTab.headerRoleName',
    value: row => row.name || '',
    render: row => (
      <span>
        <FaUserShield className="text-warning me-2" aria-hidden="true" />
        <strong>{row.name}</strong>
      </span>
    ),
  },
  {
    key: 'description',
    kind: 'text',
    labelKey: 'hostTools.RolesTab.headerDescription',
    prose: true,
    value: row => row.description || '',
    render: (row, ctx) => (
      <span className="small" title={row.description}>
        {row.description || ctx.t('hostTools.RolesTab.naFallback')}
      </span>
    ),
  },
];
