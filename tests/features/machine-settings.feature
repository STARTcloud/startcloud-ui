Feature: machine settings

  Scenario: Machine page: the Settings page behind machine-modify, a VirtualBox machine draws the tabs its host's hypervisor offers and reads the feeds once
    Given the host answers the hosts fixture
    And the host answers the hosts-machines fixture
    And the host answers the hosts-tools fixture
    And the host answers the hosts-settings fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/1/machines/dev-1/settings"
    Then the settings page draws
    And the machine tab "settings" is the active one
    And the settings tabs offer "general"
    And the settings tabs offer "storage"
    And the settings tabs offer "nics"
    And the settings tabs offer "usb"
    And the settings tabs offer "ports"
    And the settings tabs offer "advanced"
    And the settings tabs offer no "filesystems"
    And the settings tabs offer no "resources"
    And the settings tabs offer no "utm"
    And the host was sent GET to "/api/agents/1/machines/dev-1" 1 times
    And the host was sent GET to "/api/agents/1/machines/defaults" 1 times
    And the host was sent GET to "/api/agents/1/machines/ostypes" 1 times
    And the host was sent GET to "/api/agents/1/artifacts/iso" 1 times
    And the host was sent GET to "/api/agents/1/provisioning/bridged-interfaces" 1 times
    And the host was not sent GET to "/api/agents/1/storage/pools"
    And the host was not sent GET to "/api/agents/1/network/vnics"
    And the page draws no key of hyperweaver-ui in place of its text
    When I pick the settings tab "usb"
    Then the host was sent GET to "/api/agents/1/system/usb" 1 times
    And the host was sent GET to "/api/agents/1/machines/dev-1/usb/filters" 1 times

  Scenario: Machine page: a write one request and one notice, a change on a machine that runs asks and Apply at next power cycle sends the changed member alone
    Given the host answers the hosts fixture
    And the host answers the hosts-machines fixture
    And the host answers the hosts-tools fixture
    And the host answers the hosts-settings fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/1/machines/dev-1/settings"
    And I press the settings page's "apply-settings" action
    Then the page raised 1 warning notice
    And the host was not sent PUT to "/api/agents/1/machines/dev-1"
    When I type "8" into the settings field "machine-edit-vcpus"
    And I press the settings page's "apply-settings" action
    Then the settings page notes "running-choice"
    And the host was not sent PUT to "/api/agents/1/machines/dev-1"
    When I press the settings page's "apply-next-cycle" action
    Then the host was sent PUT to "/api/agents/1/machines/dev-1" carrying "8" at "/vcpus"
    And the host was sent PUT to "/api/agents/1/machines/dev-1" carrying nothing at "/ram"
    And the host was sent PUT to "/api/agents/1/machines/dev-1" carrying nothing at "/snapshots"
    And the host was sent PUT to "/api/agents/1/machines/dev-1" 1 times
    And the page raised 2 warning notices
    And the host was sent GET to "/api/agents/1/machines/dev-1" 2 times
    And the host was sent GET to "/api/agents/1/machines" 2 times

  Scenario: Machine page: a write one request and one notice, Stop, apply and start sends the stop and waits on the hosts topic, never on a clock
    Given the host answers the hosts fixture
    And the host answers the hosts-machines fixture
    And the host answers the hosts-tools fixture
    And the host answers the hosts-settings fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/1/machines/dev-1/settings"
    And I type "8" into the settings field "machine-edit-vcpus"
    And I press the settings page's "apply-settings" action
    And I press the settings page's "stop-apply-start" action
    Then the host was sent POST to "/api/agents/1/machines/dev-1/stop" 1 times
    And the page raised 1 info notice
    And the host was not sent PUT to "/api/agents/1/machines/dev-1"

  Scenario: Machine page: a write one request and one notice, a machine that is off queues the modify task and the notice carries View task
    Given the host answers the hosts fixture
    And the host answers the hosts-machines fixture
    And the host answers the hosts-tools fixture
    And the host answers the hosts-settings fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/1/machines/dev-2/settings"
    And I type "8" into the settings field "machine-edit-vcpus"
    And I press the settings page's "apply-settings" action
    Then the host was sent PUT to "/api/agents/1/machines/dev-2" carrying "8" at "/vcpus"
    And the host was sent PUT to "/api/agents/1/machines/dev-2" 1 times
    And the settings page notes no "running-choice"
    And the page raised 1 success notice
    And the host was sent GET to "/api/agents/1/machines/dev-2" 2 times
    When I press the success notice's action
    Then the host was sent GET to "/api/agents/1/tasks/a1000000-0000-4000-8000-0000000000a1"

  Scenario: Machine page: a write one request and one notice, an agent short of resources leaves the issues over the form and reads nothing again
    Given the host answers the hosts fixture
    And the host answers the hosts-machines fixture
    And the host answers the hosts-tools fixture
    And the host answers the hosts-settings fixture
    And the host answers the hosts-settings-refused fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/1/machines/dev-2/settings"
    And I type "65536" into the settings field "machine-edit-ram"
    And I press the settings page's "apply-settings" action
    Then the host was sent PUT to "/api/agents/1/machines/dev-2" carrying "65536" at "/ram"
    And the settings page lists 1 resource issue
    And the page raised 1 danger notice
    And the page raised 0 success notices
    And the host was sent GET to "/api/agents/1/machines/dev-2" 1 times

  Scenario: Controls menu: Run in guest sends the command through the Guest Additions on a VirtualBox host that lists no guest-agent and draws the output
    Given the host answers the hosts fixture
    And the host answers the hosts-machines fixture
    And the host answers the hosts-tools fixture
    And the host answers the hosts-settings fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/1/machines/dev-1"
    And I click "Machine controls"
    Then the Controls menu offers "guest-exec"
    And the Controls menu offers "display-resize"
    When I press the Controls menu's "guest-exec" row
    Then the "guest-exec" dialog is open
    When I send the open dialog
    Then the open dialog notes "problem"
    And the host was not sent POST to "/api/agents/1/machines/dev-1/guestcontrol/run"
    When I type "/usr/bin/uname" into the field "guest-exec-path"
    And I type "-a" into the field "guest-exec-args"
    And I type "root" into the field "guest-exec-username"
    And I type "secret" into the field "guest-exec-password"
    And I send the open dialog
    Then the host was sent POST to "/api/agents/1/machines/dev-1/guestcontrol/run" carrying "/usr/bin/uname" at "/path"
    And the host was sent POST to "/api/agents/1/machines/dev-1/guestcontrol/run" carrying "-a" at "/args/0"
    And the host was sent POST to "/api/agents/1/machines/dev-1/guestcontrol/run" carrying "root" at "/username"
    And the host was sent POST to "/api/agents/1/machines/dev-1/guestcontrol/run" 1 times
    And the host was not sent POST to "/api/agents/1/machines/dev-1/guest/exec"
    And the guest output reads exit 0
    And I see "6.12.38+deb13-amd64"

  Scenario: Controls menu: Set display size sends the width and the height of the preset picked, one request and one notice
    Given the host answers the hosts fixture
    And the host answers the hosts-machines fixture
    And the host answers the hosts-tools fixture
    And the host answers the hosts-settings fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/1/machines/dev-1"
    And I click "Machine controls"
    And I press the Controls menu's "display-resize" row
    Then the "display-resize" dialog is open
    When I press the preset "1280x720"
    And I send the open dialog
    Then the host was sent POST to "/api/agents/1/machines/dev-1/display" carrying "1280" at "/width"
    And the host was sent POST to "/api/agents/1/machines/dev-1/display" carrying "720" at "/height"
    And the host was sent POST to "/api/agents/1/machines/dev-1/display" carrying nothing at "/depth"
    And the host was sent POST to "/api/agents/1/machines/dev-1/display" 1 times
    And the page raised 1 success notice
    And no dialog is open

  Scenario: Machine page: the machines list by the host's tokens, a running machine's More menu draws Run in guest and Set display size and a stopped one draws neither
    Given the host answers the hosts fixture
    And the host answers the hosts-machines fixture
    And the host answers the hosts-tools fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/1/machines"
    And I open the More menu of the row of "dev-1"
    Then the row of "dev-1" offers "exec"
    And the row of "dev-1" offers "display"
    When I press "Escape"
    And I open the More menu of the row of "dev-2"
    Then the row of "dev-2" offers no "exec"
    And the row of "dev-2" offers no "display"

  Scenario: Machine page: the organization access on the server role reads the assignment and the organizations once and sends every uuid
    Given the host answers the hosts fixture
    And the host answers the hosts-machines fixture
    And the host answers the hosts-tools fixture
    And the host answers the hosts-settings fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/1/machines/dev-1"
    Then the machine page offers "org-access"
    When I press the machine page's "org-access" action
    Then the "org-assignment" dialog is open
    And the host was sent GET to "/api/servers/1/machines/dev-1/orgs" 1 times
    And the host was sent GET to "/api/organizations" 1 times
    And the host was sent GET to "/api/userinfo/claims" 1 times
    And the field "org-0b7c1d52-6f0e-4c0a-9a54-3c1f6f2a9e11" is checked
    And the field "org-5e0e6a0c-2b55-4f0b-8d1c-91a7c3f4b622" is not checked
    When I check the field "org-5e0e6a0c-2b55-4f0b-8d1c-91a7c3f4b622"
    And I send the open dialog
    Then the host was sent PUT to "/api/servers/1/machines/dev-1/orgs" carrying "0b7c1d52-6f0e-4c0a-9a54-3c1f6f2a9e11" at "/orgs/0"
    And the host was sent PUT to "/api/servers/1/machines/dev-1/orgs" carrying "5e0e6a0c-2b55-4f0b-8d1c-91a7c3f4b622" at "/orgs/1"
    And the host was sent PUT to "/api/servers/1/machines/dev-1/orgs" 1 times
    And the page raised 1 success notice
    And no dialog is open
    And the host was sent GET to "/api/agents/1/machines" 2 times

  Scenario: Machine page: the Settings page of a zone draws the bhyve tabs, reads the pools and the VNICs, and the zvol manager reads the dataset once and snapshots it
    Given the host answers the zones fixture
    And the host answers the zones-machines fixture
    And the host answers the zones-settings fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    And the browser records its requests
    When I open "/hosts/self/machines/web-1/settings"
    Then the settings page draws
    And the settings tabs offer "filesystems"
    And the settings tabs offer "resources"
    And the settings tabs offer no "usb"
    And the settings tabs offer no "advanced"
    And the host was sent GET to "/api/storage/pools" 1 times
    And the host was sent GET to "/api/network/vnics" 1 times
    And the host was not sent GET to "/api/agents/self/machines/defaults"
    When I pick the settings tab "storage"
    Then the storage editor lists 2 zone disks
    When I press "manage-zvol" on the zone disk "disk0"
    Then the "zvol-manage" dialog is open
    And the host was sent GET to "/api/storage/dataset" 1 times
    And the host was asked "/api/storage/dataset" with "name" as "rpool/zones/web-1/data"
    When I type "before-resize" into the field "zvol-snapshot-name"
    And I press the open dialog's "snapshot" action
    Then the host was sent POST to "/api/storage/dataset/snapshots" carrying "before-resize" at "/snapshot_name"
    And the host was asked "/api/storage/dataset/snapshots" with "name" as "rpool/zones/web-1/data"
    And the page raised 1 success notice

  Scenario: Machine page: a write one request and one notice, a zone's change is sent at the agent's own /api path and accrues while the zone runs
    Given the host answers the zones fixture
    And the host answers the zones-machines fixture
    And the host answers the zones-settings fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/self/machines/web-1/settings"
    And I type "8G" into the settings field "machine-edit-ram"
    And I press the settings page's "apply-settings" action
    Then the settings page notes "running-choice"
    When I press the settings page's "apply-next-cycle" action
    Then the host was sent PUT to "/api/machines/web-1" carrying "8G" at "/ram"
    And the host was sent PUT to "/api/machines/web-1" 1 times
    And the host was not sent PUT to "/api/agents/self/machines/web-1"
    And the page raised 1 warning notice
    And the host was sent GET to "/api/machines/web-1" 2 times

  Scenario: Machine page: the Settings page on the hyperweaver-agent role served directly is written at the agent's own /api path
    Given the host answers the agent fixture
    And the host answers the agent-machines fixture
    And the host answers the agent-settings fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/self/machines/dev-2/settings"
    Then the settings page draws
    And the host was sent GET to "/api/machines/defaults" 1 times
    When I type "4096" into the settings field "machine-edit-ram"
    And I press the settings page's "apply-settings" action
    Then the host was sent PUT to "/api/machines/dev-2" carrying "4096" at "/ram"
    And the host was sent PUT to "/api/machines/dev-2" 1 times
    And the host was not sent PUT to "/api/agents/self/machines/dev-2"
    And the page raised 1 success notice
    And the host was sent GET to "/api/machines/dev-2" 2 times

  Scenario: Machine page: the Settings page draws for nobody short of creating machines and its tab is not offered
    Given the host answers the hosts fixture
    And the host answers the hosts-machines fixture
    And the host answers the hosts-tools fixture
    And the host answers the hosts-settings fixture
    And the host answers the hosts-member fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"user\",\"access_token\":\"t\"}"
    When I open "/hosts/1/machines/dev-1/settings"
    Then the machine tab row draws no "settings" tab
    And the page draws no settings view
    And the host was not sent GET to "/api/agents/1/machines/defaults"
