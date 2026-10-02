/**
 * The tone of the validation alert, hyperweaver-ui's: danger while
 * errors are listed, warning while warnings are, success otherwise.
 *
 * @param {Array} errors - Validation errors
 * @param {Array} warnings - Validation warnings
 * @returns {string} The Bootstrap tone
 */
export const getValidationColor = (errors, warnings) => {
  if (errors && errors.length > 0) {
    return 'danger';
  }
  if (warnings && warnings.length > 0) {
    return 'warning';
  }
  return 'success';
};

/**
 * The tone of the service status badge, hyperweaver-ui's: success
 * online, danger offline, warning in maintenance, secondary otherwise.
 *
 * @param {Object} status - The `service_status` of the configuration
 * @returns {string} The Bootstrap tone
 */
export const getServiceStatusColor = status => {
  switch (status?.state?.toLowerCase()) {
    case 'online':
      return 'success';
    case 'offline':
      return 'danger';
    case 'maintenance':
      return 'warning';
    default:
      return 'secondary';
  }
};

/**
 * The service type from the configuration's FMRI, hyperweaver-ui's:
 * `rsyslog` while the FMRI names it, `syslog` while it names
 * `system-log`, `unknown` otherwise, each with its display name and the
 * key of its glyph.
 *
 * @param {Object} config - The syslog configuration
 * @returns {{ name: string, display: string, icon: string }} The service type
 */
export const getServiceType = config => {
  if (config?.service_fmri?.includes('rsyslog')) {
    return { name: 'rsyslog', display: 'rsyslog (Modern)', icon: 'gears' };
  } else if (config?.service_fmri?.includes('system-log')) {
    return { name: 'syslog', display: 'syslog (Traditional)', icon: 'file' };
  }
  return { name: 'unknown', display: 'Unknown', icon: 'question' };
};

const matchRsyslogDirective = fullLine => {
  if (fullLine.includes('module(load=')) {
    const moduleMatch = fullLine.match(/module\(load="(?<moduleName>[^"]+)"/u);
    return {
      isValid: true,
      selector: '(rsyslog module)',
      actionType: 'rsyslog_module',
      target: moduleMatch ? moduleMatch.groups.moduleName : 'unknown',
      isComplex: false,
      hasConditionals: false,
      isRsyslogDirective: true,
    };
  }

  if (fullLine.includes('global(')) {
    return {
      isValid: true,
      selector: '(rsyslog global)',
      actionType: 'rsyslog_global',
      target: 'Global configuration',
      isComplex: false,
      hasConditionals: false,
      isRsyslogDirective: true,
    };
  }

  if (fullLine.includes('include(')) {
    const includeMatch = fullLine.match(/include\(file="(?<filePath>[^"]+)"/u);
    return {
      isValid: true,
      selector: '(rsyslog include)',
      actionType: 'rsyslog_include',
      target: includeMatch ? includeMatch.groups.filePath : 'unknown',
      isComplex: false,
      hasConditionals: false,
      isRsyslogDirective: true,
    };
  }

  if (fullLine.includes('input(type=')) {
    const inputMatch = fullLine.match(/input\(type="(?<inputType>[^"]+)"/u);
    return {
      isValid: true,
      selector: '(rsyslog input)',
      actionType: 'rsyslog_input',
      target: inputMatch ? inputMatch.groups.inputType : 'unknown',
      isComplex: false,
      hasConditionals: false,
      isRsyslogDirective: true,
    };
  }

  return null;
};

const matchM4Construct = fullLine => {
  if (fullLine.trim() === ')' || fullLine.trim().startsWith(')')) {
    return {
      isValid: true,
      selector: '(m4 macro close)',
      actionType: 'm4_block_end',
      target: 'End ifdef block',
      isComplex: true,
      hasConditionals: true,
      isM4Construct: true,
    };
  }

  if (fullLine.includes('ifdef(') && fullLine.includes(', ,')) {
    return {
      isValid: true,
      selector: '(m4 macro start)',
      actionType: 'm4_block_start',
      target: 'Begin conditional block',
      isComplex: true,
      hasConditionals: true,
      isM4Construct: true,
    };
  }

  return null;
};

const matchSpecialTarget = (rule, target, fullLine, isMultiSelector) => {
  if (target.startsWith(':omusrmsg:')) {
    const username = target.replace(':omusrmsg:', '');
    return {
      isValid: true,
      selector: rule.selector || '',
      actionType: username === '*' ? 'all_users' : 'user',
      target: username,
      isComplex: isMultiSelector,
      hasConditionals: false,
      isRsyslogDirective: true,
      originalRule: rule,
    };
  }

  if (target.startsWith('-/')) {
    return {
      isValid: true,
      selector: rule.selector || '',
      actionType: 'file_async',
      target: target.substring(1),
      isComplex: isMultiSelector,
      hasConditionals: false,
      isRsyslogDirective: true,
      originalRule: rule,
    };
  }

  if (fullLine.includes('ifdef(') && target.includes(',')) {
    const ifdefMatch = target.match(
      /ifdef\(`(?<condition>[^']+)', (?<trueAction>[^,]+), (?<falseAction>[^)]+)\)/u
    );
    if (ifdefMatch) {
      const { condition, trueAction, falseAction } = ifdefMatch.groups;
      return {
        isValid: true,
        selector: rule.selector || '',
        actionType: 'conditional_choice',
        target: `IF ${condition}: ${trueAction.trim()} ELSE: ${falseAction.trim()}`,
        isComplex: true,
        hasConditionals: true,
        isM4Construct: true,
        originalRule: rule,
      };
    }
  }

  return null;
};

const detectActionType = target => {
  if (target.includes('ifdef(')) {
    return { actionType: 'conditional', target };
  }
  if (target.includes('/')) {
    return { actionType: 'file', target };
  }
  if (target.includes('@')) {
    return { actionType: 'remote_host', target: target.replace('@', '') };
  }
  if (target === '*') {
    return { actionType: 'all_users', target };
  }
  if (target.includes('`') && target.includes(',')) {
    return {
      actionType: 'multiple_users',
      target: target.replace(/`/gu, '').replace(/'/gu, ''),
    };
  }
  if (target.includes(',')) {
    return { actionType: 'multiple_users', target };
  }
  return { actionType: 'user', target };
};

const plainRuleDisplay = (rule, fullLine) => {
  const hasConditionals = Boolean(
    fullLine.includes('ifdef(') || fullLine.includes('`') || rule.action?.includes('ifdef(')
  );
  const isMultiSelector = Boolean(rule.selector?.includes(';') || rule.selector?.includes(','));
  let actionType = rule.parsed?.action_type || 'unknown';
  let target = String(rule.parsed?.action_target || rule.action || '');

  const specialMatch = matchSpecialTarget(rule, target, fullLine, isMultiSelector);
  if (specialMatch) {
    return specialMatch;
  }

  if (actionType === 'unknown' || actionType === 'specific_users') {
    ({ actionType, target } = detectActionType(target));
  }

  return {
    isValid: true,
    selector: rule.selector || '',
    actionType,
    target,
    isComplex: isMultiSelector || hasConditionals,
    hasConditionals,
    isMultiSelector,
    originalRule: rule,
  };
};

/**
 * One parsed rule as hyperweaver-ui drew it, both the syslog and the
 * rsyslog syntax read: the rsyslog directives, the m4 constructs, a
 * malformed line, the special targets and the action type detected from
 * the target where the agent named none.
 *
 * @param {Object} rule - A row of `parsed_rules`
 * @returns {Object} The display info
 */
export const processRuleDisplay = rule => {
  const fullLine = rule.full_line || '';

  const rsyslogMatch = matchRsyslogDirective(fullLine);
  if (rsyslogMatch) {
    return rsyslogMatch;
  }

  const m4Match = matchM4Construct(fullLine);
  if (m4Match) {
    return m4Match;
  }

  if (!rule.selector && !rule.action) {
    return {
      isValid: false,
      selector: '(empty)',
      actionType: 'malformed',
      target: '(incomplete)',
      isComplex: false,
      hasConditionals: false,
    };
  }

  return plainRuleDisplay(rule, fullLine);
};

const ACTION_DISPLAYS = {
  file: { tone: 'info', icon: 'file', text: 'File', dims: true },
  file_async: { tone: 'info', icon: 'file', text: 'Async File', dims: false },
  remote_host: { tone: 'warning', icon: 'server', text: 'Remote', dims: false },
  all_users: { tone: 'danger', icon: 'users', text: 'All Users', dims: true },
  user: { tone: 'primary', icon: 'user', text: 'User', dims: true },
  multiple_users: { tone: 'primary', icon: 'users', text: 'Multi-User', dims: true },
  conditional: { tone: 'warning', icon: 'code', text: 'Conditional', dims: false },
  conditional_choice: { tone: 'warning', icon: 'branch', text: 'If/Else', dims: false },
  m4_block_start: { tone: 'info', icon: 'play', text: 'Block Start', dims: false },
  m4_block_end: { tone: 'info', icon: 'stop', text: 'Block End', dims: false },
  rsyslog_module: { tone: 'success', icon: 'puzzle', text: 'Module', dims: false },
  rsyslog_global: { tone: 'success', icon: 'gears', text: 'Global', dims: false },
  rsyslog_include: { tone: 'success', icon: 'folder', text: 'Include', dims: false },
  rsyslog_input: { tone: 'success', icon: 'input', text: 'Input', dims: false },
  malformed: { tone: 'secondary', icon: 'question', text: 'Malformed', dims: false },
};

/**
 * How an action type draws, hyperweaver-ui's: the badge's tone, the key
 * of its glyph and its word; a complex file, user or all-users rule
 * draws in the warning tone.
 *
 * @param {string} actionType - The action type
 * @param {boolean} isComplex - Whether the rule is complex
 * @returns {{ tone: string, icon: string, text: string }} The display
 */
export const getActionTypeDisplay = (actionType, isComplex) => {
  const display = ACTION_DISPLAYS[actionType];
  if (!display) {
    return { tone: 'secondary', icon: 'question', text: actionType || 'Unknown' };
  }
  const { dims, ...rest } = display;
  return { ...rest, tone: dims && isComplex ? 'warning' : rest.tone };
};

/**
 * The rule builder as hyperweaver-ui opened it: every facility, the
 * info level, a file action to `/var/log/custom.log`.
 */
export const RULE_BUILDER = {
  facility: '*',
  level: 'info',
  action_type: 'file',
  action_target: '/var/log/custom.log',
  remote_protocol: 'udp',
  remote_port: '',
  multiple_users: false,
  user_list: '',
};

/**
 * The target the rule builder resets to on a change of action type,
 * hyperweaver-ui's defaults.
 */
export const DEFAULT_TARGETS = {
  file: '/var/log/custom.log',
  remote_host: 'loghost',
  all_users: '*',
  user: 'root',
};

/**
 * The action a rule builder's fields write, hyperweaver-ui's: the file,
 * `@host` for a remote host, `*` or rsyslog's `:omusrmsg:*` for every
 * user, the user or rsyslog's `:omusrmsg:user`.
 *
 * @param {Object} ruleBuilder - The builder's fields
 * @param {{ name: string }} serviceType - The service type of `getServiceType`
 * @returns {string} The action
 */
export const ruleAction = (ruleBuilder, serviceType) => {
  if (ruleBuilder.action_type === 'remote_host') {
    return `@${ruleBuilder.action_target}`;
  }
  if (ruleBuilder.action_type === 'all_users') {
    return serviceType.name === 'rsyslog' ? ':omusrmsg:*' : '*';
  }
  if (ruleBuilder.action_type === 'user') {
    return serviceType.name === 'rsyslog'
      ? `:omusrmsg:${ruleBuilder.action_target}`
      : ruleBuilder.action_target;
  }
  return ruleBuilder.action_target;
};

/**
 * The line a rule builder adds to the configuration, the selector, three
 * tabs and the action.
 *
 * @param {Object} ruleBuilder - The builder's fields
 * @param {{ name: string }} serviceType - The service type
 * @returns {string} The line
 */
export const ruleLine = (ruleBuilder, serviceType) =>
  `${ruleBuilder.facility}.${ruleBuilder.level}\t\t\t${ruleAction(ruleBuilder, serviceType)}`;

const lower = value => String(value ?? '').toLowerCase();

/**
 * Whether a parsed rule matches the page's query, by its selector, its
 * action, its target and its line.
 *
 * @param {Object} rule - A row of `parsed_rules`
 * @param {string} needle - The lower-cased query
 * @returns {boolean} True when it matches
 */
export const matchesSyslogRule = (rule, needle) => {
  const processed = processRuleDisplay(rule);
  return [rule.selector, rule.action, rule.full_line, processed.target, processed.actionType].some(
    text => lower(text).includes(needle)
  );
};

/**
 * The filter group of the rules table, the action type of each rule.
 */
export const SYSLOG_RULE_FILTERS = [
  {
    key: 'action',
    labelKey: 'hostTime.syslogCurrentRules.columnActionType',
    values: rule => [processRuleDisplay(rule).actionType],
    activeClass: 'bg-primary',
    labelFor: value => getActionTypeDisplay(value, false).text,
  },
];

/**
 * The key of one parsed rule, its line number or its line.
 *
 * @param {Object} rule - A row of `parsed_rules`
 * @returns {string} The key
 */
export const ruleKey = rule => String(rule.line_number ?? rule.full_line ?? '');
