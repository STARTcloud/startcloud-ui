import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';

import CopyButton from '../../../../components/common/CopyButton';

const LONG = 50;

const shortText = text => (text && text.length > LONG ? `${text.substring(0, LONG)}...` : text);

/**
 * The columns of the RBAC authorizations table, hyperweaver-ui's: the
 * authorization's name, the short description and the long one cut to
 * fifty characters, the whole its tooltip, its word where a row
 * carries none.
 */
export const AUTHORIZATION_COLUMNS = [
  {
    key: 'name',
    kind: 'name',
    labelKey: 'hostTools.AuthorizationsTab.headerAuthorization',
    value: row => row.name || '',
    render: row => <code className="small">{row.name}</code>,
  },
  {
    key: 'short',
    kind: 'text',
    labelKey: 'hostTools.AuthorizationsTab.headerShortDescription',
    prose: true,
    value: row => row.short_description || '',
    render: (row, ctx) => (
      <span className="small">
        {row.short_description || ctx.t('hostTools.AuthorizationsTab.naFallback')}
      </span>
    ),
  },
  {
    key: 'long',
    kind: 'text',
    labelKey: 'hostTools.AuthorizationsTab.headerLongDescription',
    prose: true,
    priority: 5,
    value: row => row.long_description || '',
    render: (row, ctx) => (
      <span className="small" title={row.long_description}>
        {shortText(row.long_description) || ctx.t('hostTools.AuthorizationsTab.naFallback')}
      </span>
    ),
  },
];

/**
 * The action of one row of an RBAC table, hyperweaver-ui's Copy to
 * clipboard over the one copy button, `labelKey` the tooltip's key.
 */
export const CopyNameAction = ({ row, labelKey }) => {
  const { t } = useTranslation();
  return (
    <span data-rbac={row.name}>
      <CopyButton
        text={row.name}
        label={t(labelKey)}
        className="btn btn-sm btn-outline-secondary"
      />
    </span>
  );
};

CopyNameAction.propTypes = {
  row: PropTypes.shape({ name: PropTypes.string.isRequired }).isRequired,
  labelKey: PropTypes.string.isRequired,
};
