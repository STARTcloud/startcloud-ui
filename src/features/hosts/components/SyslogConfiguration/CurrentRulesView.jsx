import PropTypes from 'prop-types';

import { getActionTypeDisplay, processRuleDisplay, ruleKey } from '../../utils/syslogUtils';
import ManageTable from '../ManageTable';

import SyslogGlyph from './syslogGlyphs';

const TARGET_LENGTH = 50;

const LINE_LENGTH = 80;

const cut = (text, length) => (text.length > length ? `${text.substring(0, length)}...` : text);

const ActionBadge = ({ rule, ctx }) => {
  const processed = processRuleDisplay(rule);
  const display = getActionTypeDisplay(processed.actionType, processed.isComplex);
  return (
    <span className="d-inline-flex align-items-center gap-1">
      <span className={`badge text-bg-${display.tone} d-inline-flex align-items-center gap-1`}>
        <SyslogGlyph name={display.icon} className="" />
        <span>{display.text}</span>
      </span>
      {processed.hasConditionals ? (
        <span className="badge text-bg-warning d-inline-flex align-items-center gap-1">
          <SyslogGlyph name="code" className="" />
          <span>{ctx.t('hostTime.syslogCurrentRules.badgeConditional')}</span>
        </span>
      ) : null}
    </span>
  );
};

ActionBadge.propTypes = {
  rule: PropTypes.object.isRequired,
  ctx: PropTypes.object.isRequired,
};

/**
 * The columns of the syslog rules table, hyperweaver-ui's: the line
 * number as a badge, the selector with the multi badge, the action type
 * as a badge in its tone with the conditional badge, the target cut to
 * fifty characters and the line cut to eighty, the whole in the tooltip.
 */
export const SYSLOG_RULE_COLUMNS = [
  {
    key: 'line',
    kind: 'count',
    labelKey: 'hostTime.syslogCurrentRules.columnLine',
    value: rule => Number(rule.line_number) || 0,
    render: rule => <span className="badge text-bg-secondary">{rule.line_number || '?'}</span>,
  },
  {
    key: 'selector',
    kind: 'name',
    labelKey: 'hostTime.syslogCurrentRules.columnFacilityLevel',
    value: rule => processRuleDisplay(rule).selector,
    render: (rule, ctx) => {
      const processed = processRuleDisplay(rule);
      return (
        <span>
          <span
            className={`font-monospace fw-semibold${processed.isMultiSelector ? ' text-info' : ''}`}
          >
            {processed.selector || ctx.t('hostTime.syslogCurrentRules.empty')}
          </span>
          {processed.isMultiSelector ? (
            <span className="badge text-bg-info ms-2">
              {ctx.t('hostTime.syslogCurrentRules.badgeMulti')}
            </span>
          ) : null}
        </span>
      );
    },
  },
  {
    key: 'action',
    kind: 'badge',
    labelKey: 'hostTime.syslogCurrentRules.columnActionType',
    value: rule => processRuleDisplay(rule).actionType,
    render: (rule, ctx) => <ActionBadge rule={rule} ctx={ctx} />,
  },
  {
    key: 'target',
    kind: 'text',
    labelKey: 'hostTime.syslogCurrentRules.columnTarget',
    priority: 4,
    value: rule => processRuleDisplay(rule).target,
    render: rule => {
      const processed = processRuleDisplay(rule);
      return (
        <span
          className={`font-monospace small${processed.hasConditionals ? ' text-warning' : ''}`}
          title={processed.target}
        >
          {cut(processed.target, TARGET_LENGTH)}
        </span>
      );
    },
  },
  {
    key: 'rule',
    kind: 'text',
    labelKey: 'hostTime.syslogCurrentRules.columnFullRule',
    priority: 5,
    value: rule => rule.full_line || '',
    render: (rule, ctx) => (
      <code
        className={`small${processRuleDisplay(rule).hasConditionals ? ' text-warning' : ''}`}
        title={rule.full_line}
      >
        {rule.full_line
          ? cut(rule.full_line, LINE_LENGTH)
          : ctx.t('hostTime.syslogCurrentRules.incompleteRule')}
      </code>
    ),
  },
];

/**
 * The current syslog rules, hyperweaver-ui's table as the one table
 * over the parsed rules the page's binding left, a malformed rule's row
 * tinted.
 */
const CurrentRulesView = ({ table, reading, filtering, ctx }) => (
  <ManageTable
    name="syslog-rules"
    columns={SYSLOG_RULE_COLUMNS}
    table={table}
    rowKey={ruleKey}
    ctx={ctx}
    emptyKey="hostTime.syslogCurrentRules.noRulesMessage"
    reading={reading}
    filtering={filtering}
  />
);

CurrentRulesView.propTypes = {
  table: PropTypes.object.isRequired,
  reading: PropTypes.shape({
    loaded: PropTypes.bool.isRequired,
    failed: PropTypes.bool.isRequired,
  }).isRequired,
  filtering: PropTypes.bool.isRequired,
  ctx: PropTypes.object.isRequired,
};

export default CurrentRulesView;
