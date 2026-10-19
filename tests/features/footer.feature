Feature: footer pane

  Scenario: Footer pane: the tasks table's headers carry the resize handle, a drag setting the column's width
    Given the host answers the hosts fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/1"
    And I press the footer's "tasks" toggle
    Then the tasks pane lists 3 tasks
    When I drag the tasks header "operation" 60 wider
    Then the tasks header "operation" is sized

  Scenario: Footer pane: the tasks table folds the columns the pane has no room for and never scrolls sideways
    Given the host answers the hosts fixture
    And the window is 700 wide
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    And the browser holds "tasks_columns" as "[\"id\",\"operation\",\"machine_name\",\"status\",\"progress\",\"priority\",\"created_by\",\"created_at\",\"started_at\",\"completed_at\",\"error_message\"]"
    When I open "/hosts/1"
    And I press the footer's "tasks" toggle
    Then the tasks pane lists 3 tasks
    And the tasks pane folds the columns it has no room for
    And the tasks pane does not scroll sideways

  Scenario: Footer pane: the tasks table with room for its columns folds none and does not scroll sideways
    Given the host answers the hosts fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/1"
    And I press the footer's "tasks" toggle
    Then the tasks pane lists 3 tasks
    And the tasks pane does not scroll sideways

  Scenario: Footer heart: the popover draws the tools the agent answers with their versions, a missing one greyed, and the WSL beside VirtualBox caution with its triangle
    Given the host answers the agent fixture
    And the host answers the agent-health-tools fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/"
    And I hover the footer heart
    Then the heart's popover lists the tool "virtualbox" as "7.2.8"
    And the heart's popover names the host "cpus" as "16"
    And the heart's popover names the host "memory" as "64.0 GB"
    And the heart's popover lists the tool "scp" as present
    And the heart's popover lists the tool "ansible" as missing
    And the heart's popover notes "virtualbox_wsl"
    And the heart's popover draws no stream line

  Scenario: Consoles pane: the Consoles toggle opens on no console, and Open host shell of the host's Controls menu starts the session once, asks one unscoped ticket and draws the shell as the one tab
    Given the host answers the hosts fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    And the browser records its requests
    When I open "/hosts/1"
    And I press the footer's "consoles" toggle
    Then the footer pane draws no console
    And the host was not sent POST to "/api/agents/1/term/start"
    When I click "Host actions"
    And I press the Controls menu's "host-shell" row
    Then the host was sent POST to "/api/agents/1/term/start" 1 times
    And the host was sent GET to "/api/agents/1/ws-ticket" 1 times
    And the footer pane draws the "host_shell" console of "Desk"
    And the footer pane draws the "host_shell" viewer
    And the footer pane draws 0 tabs
    And the footer pane draws no commands bar
    And the stored "console_tabs" holds 1 entries
    When I click "Host actions"
    And I press the Controls menu's "host-shell" row
    Then the host was sent POST to "/api/agents/1/term/start" 2 times
    When I press the footer's "consoles" toggle
    And I press the footer drop-up's "restart" row
    Then the host was sent DELETE to "/api/agents/1/term/sessions/a1000000-0000-4000-8000-000000000001/stop" 1 times
    And the host was sent POST to "/api/agents/1/term/start" 3 times
    When I press the footer's "consoles" toggle
    And I press the footer drop-up's "close" row
    Then the footer pane draws no console
    And the host was sent DELETE to "/api/agents/1/term/sessions/a1000000-0000-4000-8000-000000000001/stop" 2 times
    And the stored "console_tabs" holds 0 entries

  Scenario: Consoles pane: a placement the browser holds re-attaches to the session the agent still lists, without a second start, and drops the one it no longer holds
    Given the host answers the hosts fixture
    And the host answers the hosts-consoles-live fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    And the browser holds "console_tabs" as "{\"a1000000-0000-4000-8000-000000000001\":{\"kind\":\"host_shell\",\"id\":\"1\",\"name\":\"\",\"target\":\"\",\"placed\":\"footer\",\"accepts\":true},\"a1000000-0000-4000-8000-000000000009\":{\"kind\":\"host_shell\",\"id\":\"1\",\"name\":\"\",\"target\":\"\",\"placed\":\"footer\",\"accepts\":false}}"
    When I open "/"
    Then the host was sent GET to "/api/agents/1/term/sessions" 1 times
    And the footer holds the "consoles" toggle
    And the footer pane draws the "host_shell" console of "Desk"
    And the host was not sent POST to "/api/agents/1/term/start"
    And the host was sent GET to "/api/agents/1/ws-ticket"
    And the stored "console_tabs" holds 1 entries

  Scenario: Consoles pane: a live session the person's own key started in another browser re-attaches in the footer with nothing stored, and another person's never does
    Given the host answers the hosts fixture
    And the host answers the hosts-consoles-owned fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/"
    Then the host was sent GET to "/api/agents/1/term/sessions" 1 times
    And the footer holds the "consoles" toggle
    And the footer pane draws the "host_shell" console of "Desk"
    And the footer pane draws 0 tabs
    And the host was not sent POST to "/api/agents/1/term/start"
    And the stored "console_tabs" holds 1 entries

  Scenario: Consoles pane: two live host shells of the person's own key re-attach as two tabs, the second numbered, with the Commands bar between them
    Given the host answers the hosts fixture
    And the host answers the hosts-consoles-two fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/"
    Then the host was sent GET to "/api/agents/1/term/sessions" 1 times
    And the footer pane draws the "host_shell" console of "Desk 2"
    And the footer tab "Desk 2" is active
    And the footer pane draws 2 tabs
    And the footer pane draws the commands bar
    And the commands bar says "0/2"
    And the host was not sent POST to "/api/agents/1/term/start"
    And the stored "console_tabs" holds 2 entries

  Scenario: Sidebar tree: a host node's right-click menu offers Open host shell on a host that lists host-terminal, starting the session once in the footer
    Given the host answers the hosts fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/1/machines/dev-1"
    And I right-click the tree node "Desk"
    Then the tree menu offers "host-shell"
    When I press the tree menu's "host-shell" row
    Then the host was sent POST to "/api/agents/1/term/start" 1 times
    And the footer pane draws the "host_shell" console of "Desk"

  Scenario: Consoles pane: with two tabs the Commands bar draws, Accept broadcasts on a tab's menu marks it, the sent string lands in the history and the newline is a Terminal preference on by default
    Given the host answers the hosts fixture
    And the host answers the hosts-machines fixture
    And the host answers the hosts-consoles fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/1"
    And I click "Host actions"
    And I press the Controls menu's "host-shell" row
    Then the footer pane draws the "host_shell" console of "Desk"
    When I click "dev-1"
    Then the path is "/hosts/1/machines/dev-1"
    When I click "Machine controls"
    Then the Controls menu's "console-ssh" row opens in the "footer"
    When I press the Controls menu's "console-ssh" row
    Then the host was sent POST to "/api/agents/1/machines/dev-1/ssh/start" 1 times
    And the footer pane draws 2 tabs
    And the footer tab "dev-1" is active
    And the footer pane draws the commands bar
    And the commands bar says "0/2"
    And the console panel says the "ssh" console is in the footer
    When I right-click the footer tab "dev-1"
    Then the footer tab menu offers "accept"
    And the footer tab menu offers "send-to-page"
    And the footer tab menu offers "restart"
    And the footer tab menu offers "close"
    When I press the footer tab menu's "accept" row
    Then the footer tab "dev-1" accepts broadcasts
    And the footer tab "Desk" accepts no broadcasts
    And the commands bar says "1/2"
    When I send the command "uptime"
    And I open the commands history
    Then the "console-history" dialog is open
    And the commands history lists "uptime"
    And the stored "console_history" holds 1 entries
    When I press "Escape"
    Then no dialog is open
    And I press the footer's "consoles" toggle
    And I press the footer drop-up's "preferences" row
    Then the terminal preferences switch "broadcast-newline" is on
    When I turn the terminal preferences switch "broadcast-newline" off
    And I send the open dialog
    Then the stored "terminal_prefs" carries "broadcastNewline" as "false"
