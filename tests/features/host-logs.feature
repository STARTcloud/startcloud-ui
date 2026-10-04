Feature: host-logs

  Scenario: Logs: the row behind fault-management with syslog or log-streaming, a host that lists fault-management alone draws the Faults row and no Logs row, the not-available stub on the route, and is asked for nothing
    Given the host answers the hosts fixture
    And the host answers the hosts-logs fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/1/system/logs"
    Then the section page draws the not-available stub
    And the host column draws the "faults" row to "/hosts/1/system/faults"
    And the host column draws no "logs" row
    And the host was not sent GET to "/api/agents/1/system/syslog/config"
    And the host was not sent GET to "/api/agents/1/system/logs/list"

  Scenario: Logs: the syslog status and the current rules over the one table, the editor's validate, apply and reload each one request with the configuration read again
    Given the host answers the hosts fixture
    And the host answers the hosts-logs fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/3/system/logs"
    Then the section page "logs" draws
    And the host row "logs" is the active one
    And the section page draws the "syslog-status" panel
    And I see "/etc/syslog.conf"
    And the "syslog-rules" table of the section page lists 6 rows
    And the "syslog-rules" table of the section page draws the "action" column
    And the host was sent GET to "/api/agents/3/system/syslog/config" 1 times
    And the host was sent GET to "/api/agents/3/system/syslog/facilities" 1 times
    And the section page's "syslog-switch-syslog" action is held
    And the section page offers "syslog-switch-rsyslog"
    When I pick the tab "editor" of the section page
    Then the section page draws the "syslog-editor" panel
    And the section field "syslog-config-editor" contains "/var/adm/messages"
    When I type "*.emerg   *" into the section field "syslog-config-editor"
    And I press the section page's "syslog-validate" action
    Then the host was sent POST to "/api/agents/3/system/syslog/validate" carrying "config_content" as "*.emerg   *"
    And the section page notes "syslog-validation"
    And the page raised 1 success notice
    When I press the section page's "syslog-apply" action
    Then the host was sent PUT to "/api/agents/3/system/syslog/config" carrying "backup_existing" as "true"
    And the page raised 2 success notices
    And the host was sent GET to "/api/agents/3/system/syslog/config" 2 times
    When I press the section page's "syslog-reload" action
    Then the host was sent POST to "/api/agents/3/system/syslog/reload" 1 times
    And the page raised 3 success notices

  Scenario: Logs: the switch of the logging service behind the typed confirmation
    Given the host answers the hosts fixture
    And the host answers the hosts-logs fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/3/system/logs"
    And I press the section page's "syslog-switch-rsyslog" action
    Then the "syslog-switch" dialog is open
    When I confirm the open dialog with "switch"
    Then the host was sent POST to "/api/agents/3/system/syslog/switch" carrying "target" as "rsyslog"
    And the page raised 1 success notice
    And the host was sent GET to "/api/agents/3/system/syslog/config" 2 times

  Scenario: Logs: the rule builder appends its line to the editor and the preview follows the action type
    Given the host answers the hosts fixture
    And the host answers the hosts-logs fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/3/system/logs"
    And I pick the tab "builder" of the section page
    Then the section page draws the "syslog-builder" panel
    And the section page notes "syslog-preview"
    When I choose "remote_host" in the section field "rule-action-type"
    And I type "loghost2" into the section field "rule-remote-host"
    And I press the section page's "syslog-add-rule" action
    And I pick the tab "editor" of the section page
    Then the section field "syslog-config-editor" contains "@loghost2"

  Scenario: Logs: the log files over the one table with the fault manager logs among them, a row's Open reading its content, the filters and Refresh reading again, the stream one session started and stopped
    Given the host answers the hosts fixture
    And the host answers the hosts-logs fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/3/system/logs"
    Then the "log-files" table of the section page lists 7 rows
    And the "log-files" table of the section page draws the "type" column
    And the section page notes "no-log-selected"
    And the host was sent GET to "/api/agents/3/system/logs/list" 1 times
    And the host was not sent GET to "/api/agents/3/system/logs/messages"
    When I press "log-open" on the row "messages" of the "log-files" table of the section page
    Then the host was sent GET to "/api/agents/3/system/logs/messages" 1 times
    And the section page draws the "log-viewer" panel
    And the section page draws the "log-controls" panel
    And I see "Accepted publickey for mark"
    When I type "ssh" into the section field "log-grep"
    Then the host was sent GET to "/api/agents/3/system/logs/messages" 2 times
    When I press the section page's "log-refresh" action
    Then the host was sent GET to "/api/agents/3/system/logs/messages" 3 times
    When I press the section page's "log-stream" action
    Then the host was sent POST to "/api/agents/3/system/logs/messages/stream/start" carrying "grep_pattern" as "ssh"
    And the host was sent GET to "/api/agents/3/ws-ticket" 1 times
    When I press "log-open" on the row "Faults" of the "log-files" table of the section page
    Then the host was sent DELETE to "/api/agents/3/system/logs/stream/log-1759050000000/stop" 1 times
    And the host was sent GET to "/api/agents/3/system/logs/fault-manager/faults" 1 times
    And the section page's "log-stream" action is held

  Scenario: Logs: Refresh reads the configuration and the log list again
    Given the host answers the hosts fixture
    And the host answers the hosts-logs fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/3/system/logs"
    Then the host was sent GET to "/api/agents/3/system/syslog/config" 1 times
    And the host was sent GET to "/api/agents/3/system/logs/list" 1 times
    When I click "Refresh"
    Then the host was sent GET to "/api/agents/3/system/syslog/config" 2 times
    And the host was sent GET to "/api/agents/3/system/logs/list" 2 times
