Feature: machines

  Scenario: Machine page: the machines list by the host's tokens, the rows of GET machines drawn from one read with the counts of all, running and stopped
    Given the host answers the hosts fixture
    And the host answers the hosts-machines fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/1/machines"
    Then the machines list draws 3 rows
    And the machines list counts 3 total
    And the machines list counts 2 running
    And the machines list counts 1 stopped
    And I see "dev-3"
    And the host was sent GET to "/api/agents/1/machines" 1 times
    And the host was sent GET to "/api/agents/1/stats" 1 times
    And the host controls toggle is "Host actions"

  Scenario: Machine page: the machines list by the host's tokens, a host whose row lists no machines is asked for none
    Given the host answers the hosts fixture
    And the host answers the hosts-machines fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/4/machines"
    Then the machines page asks nothing of the host
    And the host was not sent GET to "/api/agents/4/machines"

  Scenario: Machine page: the machines list by the host's tokens, a row's buttons by the machine's own status and the host's tokens and hypervisors
    Given the host answers the hosts fixture
    And the host answers the hosts-machines fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/1/machines"
    Then the row of "dev-1" offers "pause"
    And the row of "dev-1" offers "suspend"
    And the row of "dev-1" offers "shutdown"
    And the row of "dev-1" offers no "start"
    And the row of "dev-1" offers no "resume"
    And the row of "dev-2" offers "start"
    And the row of "dev-2" offers no "shutdown"
    And the row of "dev-2" offers no "pause"

  Scenario: Machine page: the machines list by the host's tokens, a row's action is one request through the runner and one notice, the stats and the rows read again once
    Given the host answers the hosts fixture
    And the host answers the hosts-machines fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/1/machines"
    And I press "start" on the row of "dev-2"
    Then the host was sent POST to "/api/agents/1/machines/dev-2/start" 1 times
    And I see "dev-2 is starting."
    And the host was sent GET to "/api/agents/1/machines" 2 times
    And the host was sent GET to "/api/agents/1/stats" 2 times

  Scenario: Machine page: the machines list by the host's tokens, a zone's row draws no Pause on a bhyve host and its columns are the ones zoneweaver-agent answers
    Given the host answers the zones fixture
    And the host answers the zones-machines fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/self/machines"
    Then the machines list draws 2 rows
    And the row of "web-1" offers "suspend"
    And the row of "web-1" offers "shutdown"
    And the row of "web-1" offers no "pause"
    And the row of "web-2" offers "start"
    And the machines list draws the "provisioner" column
    And the machines list draws no "hypervisor" column
    And the machines list draws no "backing" column
    And the host was sent GET to "/api/machines"
    And the host was not sent GET to "/api/agents/self/machines"

  Scenario: Machine page: the machines list by the host's tokens, on an agent role the rows are read at the agent's own /api path and carry what hyperweaver-agent answers
    Given the host answers the agent fixture
    And the host answers the agent-machines fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/self/machines"
    Then the machines list draws 2 rows
    And the machines list draws the "hypervisor" column
    And the machines list draws the "backing" column
    And the host was sent GET to "/api/machines" 1 times
    And the host was not sent GET to "/api/agents/self/machines"

  Scenario: Machine page: the machines list by the host's tokens, the rows narrow to the organization a person operates under, failing open
    Given the host answers the hosts fixture
    And the host answers the hosts-machines fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    And the browser holds "activeOrganization" as "0b7c1d52-6f0e-4c0a-9a54-3c1f6f2a9e11"
    When I open "/hosts/1/machines"
    Then the machines list draws 2 rows
    And the row of "dev-1" offers "shutdown"
    And the row of "dev-2" offers "start"

  Scenario: Machine page: the machines list by the host's tokens, View all on the host page opens it while the host lists machines
    Given the host answers the hosts fixture
    And the host answers the hosts-machines fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/1"
    And I follow the host page's machines link
    Then the path is "/hosts/1/machines"
    And the machines list draws 3 rows

  Scenario: Machine page: the read surfaces by what the agent answers, a hyperweaver-agent machine draws its information, hardware, guest agent and guest information from one read of each
    Given the host answers the hosts fixture
    And the host answers the hosts-machines fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/1/machines/dev-1"
    Then the machine page draws the "machine-info" panel
    And the machine page draws the "machine-tags-notes" panel
    And the machine page draws the "machine-hardware" panel
    And the machine page draws the "machine-guest-agent" panel
    And the machine page draws the "machine-guest-info" panel
    And the machine reads "running"
    And the machine belongs to 1 organization
    And the device tree lists 4 devices
    And the hardware lists 2 forwards
    And the guest information lists 2 addresses
    And I see "Debian GNU/Linux 13 (trixie)"
    And I see "192.168.1.50"
    And I see "SATA Controller"
    And the host was sent GET to "/api/agents/1/machines/dev-1" 1 times
    And the host was sent GET to "/api/agents/1/machines" 1 times
    And the host was sent GET to "/api/agents/1/machines/dev-1/guest-properties" 1 times
    And the host was sent GET to "/api/agents/1/machines/dev-1/guest/osinfo" 1 times

  Scenario: Machine page: the read surfaces by what the agent answers, a zone draws its facts, specifications and devices and asks for no guest properties
    Given the host answers the zones fixture
    And the host answers the zones-machines fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/self/machines/web-1"
    Then the machine page draws the "machine-info" panel
    And the machine page draws the "machine-hardware" panel
    And the machine page draws the "machine-guest-agent" panel
    And the machine page draws no "machine-guest-info" panel
    And the machine page names no organization
    And the machine reads "running"
    And the device tree lists 4 devices
    And I see "/rpool/zones/web-1"
    And I see "BHYVE_RELEASE_CSM"
    And I see "6001"
    And the host was sent GET to "/api/machines/web-1" 1 times
    And the host was sent GET to "/api/machines/web-1/guest/osinfo" 1 times
    And the host was not sent GET to "/api/machines/web-1/guest-properties"
    And the host was not sent GET to "/api/agents/self/machines/web-1"

  Scenario: Machine page: the read surfaces by what the agent answers, a machine that is off draws no guest agent and no screen
    Given the host answers the hosts fixture
    And the host answers the hosts-machines fixture
    And the host answers a screenshot of "dev-2"
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/1/machines/dev-2"
    Then the machine page draws the "machine-hardware" panel
    And the machine reads "stopped"
    And the machine page draws no "machine-guest-agent" panel
    And the screenshot was never read

  Scenario: Machine page: the read surfaces by what the agent answers, an agent that answers no detail leaves the information of the row and says so
    Given the host answers the hosts fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/1/machines/dev-1"
    Then the machine page draws the "machine-info" panel
    And the machine page says the details are not available
    And the machine reads "running"
    And the machine page draws no "machine-hardware" panel
    And the machine page draws no "machine-tags-notes" panel

  Scenario: Machine page: the read surfaces by what the agent answers, a machine the host does not have draws the placard saying so and no surface
    Given the host answers the hosts fixture
    And the host answers the hosts-machines fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/1/machines/ghost-9"
    Then the machine page says the machine is not found
    And the host was sent GET to "/api/agents/1/machines/ghost-9" 1 times
    And the host was sent GET to "/api/agents/1/machines" 1 times

  Scenario: Machine page: the held copies follow the `hosts` topic, a stats-updated event of the host has its machine rows and the machine's detail read again
    Given the host answers the hosts fixture
    And the host answers the hosts-machines fixture
    And the host answers the hosts-events fixture
    And the stream answers the stats-updated frames
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/1/machines/dev-1"
    Then the machine reads "running"
    And the host was sent GET to "/api/agents/1/machines/dev-1" at least 3 times
    And the host was sent GET to "/api/agents/1/machines" at least 3 times

  Scenario: Machine page: the screen behind `machine-screenshot`, the console's idle display draws a running machine's frame, read once and again on its Refresh screenshot and the page's Refresh
    Given the host answers the agent fixture
    And the host answers the agent-machines fixture
    And the host answers a screenshot of "dev-1"
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/self/machines/dev-1"
    Then the machine page draws the "machine-console" panel
    And the machine page draws no "machine-screenshot" panel
    And the console screenshot draws
    And the screenshot was read at "/api/machines/dev-1/vnc/screenshot" 1 times
    When I press the machine page's "console-screenshot" action
    Then the screenshot was read at "/api/machines/dev-1/vnc/screenshot" 2 times
    When I click "Refresh"
    Then the screenshot was read at "/api/machines/dev-1/vnc/screenshot" at least 3 times
    And the host was sent GET to "/api/machines/dev-1" 2 times
    And the host was sent GET to "/api/machines/dev-1/guest-properties" 2 times

  Scenario: Machine page: the screen behind `machine-screenshot`, a host that lists no machine-screenshot is asked for no frame
    Given the host answers the zones fixture
    And the host answers a screenshot of "web-1"
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/self/machines/web-1"
    Then the machine reads "running"
    And the screenshot was never read

  Scenario: Machine page: a write one request and one notice, the tags alone are sent when the tags alone changed and the held copies are read again once
    Given the host answers the hosts fixture
    And the host answers the hosts-machines fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/1/machines/dev-1"
    Then the machine's "save-tags-notes" action is held
    When I type "web, lab, critical" as the machine's tags
    And I press the machine page's "save-tags-notes" action
    Then the host was sent PUT to "/api/agents/1/machines/dev-1/tags" carrying "web,lab,critical" at "/tags"
    And the host was sent PUT to "/api/agents/1/machines/dev-1/tags" 1 times
    And the host was not sent PUT to "/api/agents/1/machines/dev-1/notes"
    And the host was sent GET to "/api/agents/1/machines/dev-1" 2 times
    And the host was sent GET to "/api/agents/1/machines" 2 times

  Scenario: Machine page: a write one request and one notice, emptied notes are sent as null on a zone
    Given the host answers the zones fixture
    And the host answers the zones-machines fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/self/machines/web-1"
    And I type "" as the machine's notes
    And I press the machine page's "save-tags-notes" action
    Then the host was sent PUT to "/api/machines/web-1/notes" carrying null at "/notes"
    And the host was not sent PUT to "/api/machines/web-1/tags"
    And the host was sent GET to "/api/machines/web-1" 2 times

  Scenario: Machine page: a write one request and one notice, Set up channel draws for a silent guest agent and the detail is read again once
    Given the host answers the hosts fixture
    And the host answers the hosts-machines fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/1/machines/dev-3"
    Then the machine page offers "guest-setup"
    And the machine page offers no "guest-network"
    When I press the machine page's "guest-setup" action
    Then the host was sent POST to "/api/agents/1/machines/dev-3/guest-agent/setup" 1 times
    And the host was sent GET to "/api/agents/1/machines/dev-3" 2 times
    And the host was not sent GET to "/api/agents/1/machines/dev-3/guest/osinfo"

  Scenario: Machine page: the read surfaces by what the agent answers, More reads the guest's live network once and lists its interfaces
    Given the host answers the hosts fixture
    And the host answers the hosts-machines fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/1/machines/dev-1"
    And I press the machine page's "guest-network" action
    Then the guest network dialog lists 3 interfaces
    And I see "enp0s8"
    And the host was sent GET to "/api/agents/1/machines/dev-1/guest/network" 1 times

  Scenario: Machine page: the read surfaces by what the agent answers, the guest agent's requests wait behind guest-agent on the host's own row
    Given the host answers the hosts fixture
    And the host answers the hosts-machines fixture
    And the host answers the hosts-orgs fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/1/machines/dev-1"
    Then the machine page draws the "machine-guest-agent" panel
    And the machine page offers no "guest-network"
    And the host was not sent GET to "/api/agents/1/machines/dev-1/guest/osinfo"

  Scenario: Machine page: the charts behind `monitoring` by the host's hypervisor, a running VirtualBox machine draws four charts from one read of the one sample the agent takes
    Given the host answers the hosts fixture
    And the host answers the hosts-machines fixture
    And the host answers the hosts-tools fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    And the browser records its requests
    When I open "/hosts/1/machines/dev-1"
    Then the machine page draws the "cpu" chart
    And the machine page draws the "memory" chart
    And the machine page draws the "network" chart
    And the machine page draws the "disk" chart
    And the machine page draws 4 charts
    And the "cpu" chart says it draws one sample
    And the host was sent GET to "/api/agents/1/monitoring/machines/usage" 1 times
    And the host was asked "/api/agents/1/monitoring/machines/usage" with "machine_name" as "dev-1"
    And the host was asked "/api/agents/1/monitoring/machines/usage" with "limit" as "1"
    And the host was not sent GET to "/api/agents/1/monitoring/zones/usage"
    When I refresh the machine's "cpu" chart
    Then the host was sent GET to "/api/agents/1/monitoring/machines/usage" 2 times
    When I click "Refresh"
    Then the host was sent GET to "/api/agents/1/monitoring/machines/usage" 3 times

  Scenario: Machine page: the charts behind `monitoring` by the host's hypervisor, a guest without the additions draws the note in the memory chart's place and no point for a rate the first sample carries as null
    Given the host answers the hosts fixture
    And the host answers the hosts-machines fixture
    And the host answers the hosts-tools fixture
    And the host answers the hosts-bare-guest fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/1/machines/dev-1"
    Then the machine page draws the "cpu" chart
    And the machine's memory chart says the guest additions are needed
    And the machine page draws 4 charts
    And the host was sent GET to "/api/agents/1/monitoring/machines/usage" 1 times

  Scenario: Machine page: the charts behind `monitoring` by the host's hypervisor, a VirtualBox machine that is off is asked for no sample
    Given the host answers the hosts fixture
    And the host answers the hosts-machines fixture
    And the host answers the hosts-tools fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/1/machines/dev-2"
    Then the machine reads "stopped"
    And the machine page draws no "cpu" chart
    And the host was not sent GET to "/api/agents/1/monitoring/machines/usage"

  Scenario: Machine page: the charts behind `monitoring` by the host's hypervisor, a zone draws its processors and memory, one chart a volume and one a link, each from one read
    Given the host answers the zones fixture
    And the host answers the zones-machines fixture
    And the host answers the zones-tools fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    And the browser records its requests
    When I open "/hosts/self/machines/web-1"
    Then the machine page draws the "cpu" chart
    And the machine page draws the "memory" chart
    And the machine page draws the "disk:rpool/zones/web-1/boot" chart
    And the machine page draws the "disk:tank/zones/web-1/data" chart
    And the machine page draws the "link:vnice3_1234_0" chart
    And the machine page draws 5 charts
    And the machine's "disk:tank/zones/web-1/data" chart names the dataset "tank/zones/web-1/data"
    And the host was sent GET to "/api/monitoring/zones/usage" 1 times
    And the host was sent GET to "/api/monitoring/zones/diskio" 1 times
    And the host was sent GET to "/api/monitoring/network/usage" 2 times
    And the host was asked "/api/monitoring/zones/usage" with "zone" as "web-1"
    And the host was asked "/api/monitoring/network/usage" with "link" as "vnice3_1234_0"
    And the host was not sent GET to "/api/monitoring/machines/usage"
    And the host was not sent GET to "/api/agents/self/monitoring/zones/usage"

  Scenario: Machine page: what asks nothing, a host whose row lists none of the tokens draws no chart, no snapshots and no policy and is asked for none
    Given the host answers the hosts fixture
    And the host answers the hosts-machines fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/1/machines/dev-1"
    Then the machine reads "running"
    And the machine column draws 2 page rows
    And the machine column draws no "snapshots" row
    And the machine page draws no "cpu" chart
    And the machine page draws no "machine-snapshots" panel
    And the machine page draws no "machine-snapshot-policy" panel
    And the host was not sent GET to "/api/agents/1/monitoring/machines/usage"
    And the host was not sent GET to "/api/agents/1/machines/dev-1/snapshots"
    When I click "Machine controls"
    Then the Controls menu offers no "tool-take"
    And the Controls menu offers no "tool-clone"
    And the Controls menu offers no "tool-template"

  Scenario: Machine page: the snapshots behind `machine-snapshots`, a VirtualBox machine draws the tree hyperweaver-agent answers from one read
    Given the host answers the hosts fixture
    And the host answers the hosts-machines fixture
    And the host answers the hosts-tools fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/1/machines/dev-1/snapshots"
    Then the machine page draws the "machine-snapshots" panel
    And the snapshots list draws 2 rows
    And the snapshots list draws the "current" column
    And the snapshots list draws the "description" column
    And the snapshots list draws no "created" column
    And the snapshots list draws no "used" column
    And the snapshots list draws no "holds" column
    And the snapshots list draws no "datasets" column
    And the snapshot "clean-install" sits 0 deep
    And the snapshot "before-upgrade" sits 1 deep
    And the snapshot "before-upgrade" offers "edit"
    And the snapshot "before-upgrade" offers no "export"
    And the snapshot "before-upgrade" offers no "publish"
    And the snapshot "before-upgrade" offers "delete"
    And the snapshot "before-upgrade" holds "restore" back
    And the snapshot "before-upgrade" holds "restore-start" back
    And the snapshots list offers no holds
    And the host was sent GET to "/api/agents/1/machines/dev-1/snapshots" 1 times

  Scenario: Machine page: the snapshots behind `machine-snapshots`, a zone draws the snapshots of its datasets as zoneweaver-agent answers them
    Given the host answers the zones fixture
    And the host answers the zones-machines fixture
    And the host answers the zones-tools fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/self/machines/web-1/snapshots"
    Then the machine page draws the "machine-snapshots" panel
    And the snapshots list draws 2 rows
    And the snapshots list draws the "created" column
    And the snapshots list draws the "used" column
    And the snapshots list draws the "holds" column
    And the snapshots list draws the "datasets" column
    And the snapshots list draws the "description" column
    And the snapshots list draws no "current" column
    And the snapshots list draws no "uuid" column
    And the snapshot "before-upgrade" sits 0 deep
    And the host was sent GET to "/api/machines/web-1/snapshots" 1 times
    And the host was not sent GET to "/api/agents/self/machines/web-1/snapshots"

  Scenario: Machine page: the snapshots behind `machine-snapshots`, a person who may not create machines reads the list and is offered no write
    Given the host answers the hosts fixture
    And the host answers the hosts-machines fixture
    And the host answers the hosts-tools fixture
    And the host answers the hosts-member fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"user\",\"access_token\":\"t\"}"
    When I open "/hosts/1/machines/dev-1/snapshots"
    Then the snapshots list draws 2 rows
    And the snapshots list offers no action
    And the snapshots page draws no "machine-snapshot-policy" panel
    When I open "/hosts/1/machines/dev-1"
    And I click "Machine controls"
    Then the Controls menu offers no "tool-take"
    And the Controls menu offers no "tool-move"

  Scenario: Machine page: the snapshots behind `machine-snapshots`, a machine on UTM is asked for no snapshots while it runs and draws no rename, no policy and no move
    Given the host answers the hosts fixture
    And the host answers the hosts-machines fixture
    And the host answers the hosts-tools fixture
    And the host answers the hosts-utm fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/1/machines/mac-1/snapshots"
    Then the snapshots say the machine must be off
    And the snapshots page draws no "machine-snapshot-policy" panel
    And the host was not sent GET to "/api/agents/1/machines/mac-1/snapshots"
    When I open "/hosts/1/machines/mac-1"
    Then the machine reads "running"
    And the machine page draws no "cpu" chart
    And the host was not sent GET to "/api/agents/1/monitoring/machines/usage"
    When I click "Machine controls"
    Then the Controls menu offers "tool-take"
    And the Controls menu offers no "tool-move"
    When I press the Controls menu's "tool-take" row
    Then the "snapshot-take" dialog is open
    And the open dialog notes "utm-stopped-only"
    And the open dialog draws no field "snapshot-quiesce"
    When I type "base" into the field "snapshot-name"
    And I send the open dialog
    Then the open dialog notes "problem"
    And the host was not sent POST to "/api/agents/1/machines/mac-1/snapshots"

  Scenario: Machine page: a write one request and one notice, Take snapshot sends the name alone, reads the held copies again once and opens the task
    Given the host answers the hosts fixture
    And the host answers the hosts-machines fixture
    And the host answers the hosts-tools fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/1/machines/dev-1/snapshots"
    And I press the machine page's "snapshot-take" action
    Then the "snapshot-take" dialog is open
    When I send the open dialog
    Then the open dialog notes "problem"
    And the host was not sent POST to "/api/agents/1/machines/dev-1/snapshots"
    When I type "before-patch" into the field "snapshot-name"
    And I send the open dialog
    Then the host was sent POST to "/api/agents/1/machines/dev-1/snapshots" carrying "before-patch" at "/name"
    And the host was sent POST to "/api/agents/1/machines/dev-1/snapshots" carrying nothing at "/prefix"
    And the host was sent POST to "/api/agents/1/machines/dev-1/snapshots" carrying nothing at "/live"
    And the host was sent POST to "/api/agents/1/machines/dev-1/snapshots" 1 times
    And the page raised 1 success notice
    And the host was sent GET to "/api/agents/1/machines/dev-1/snapshots" 2 times
    And the host was sent GET to "/api/agents/1/machines/dev-1" 2 times
    And the host was sent GET to "/api/agents/1/machines" 2 times
    And the host was sent GET to "/api/agents/1/stats" 2 times
    And the host was sent GET to "/api/agents/1/tasks/a1000000-0000-4000-8000-000000000001"

  Scenario: Machine page: a write one request and one notice, a dated snapshot sends its prefix, its retention and the options chosen of a machine that runs
    Given the host answers the hosts fixture
    And the host answers the hosts-machines fixture
    And the host answers the hosts-tools fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/1/machines/dev-1/snapshots"
    And I press the machine page's "snapshot-take" action
    And I pick the naming "prefix"
    And I type "daily" into the field "snapshot-prefix"
    And I type "7" into the field "snapshot-retention"
    And I type "Before the patch" into the field "snapshot-description"
    And I check the field "snapshot-quiesce"
    And I check the field "snapshot-live"
    And I send the open dialog
    Then the host was sent POST to "/api/agents/1/machines/dev-1/snapshots" carrying "daily" at "/prefix"
    And the host was sent POST to "/api/agents/1/machines/dev-1/snapshots" carrying "7" at "/retention"
    And the host was sent POST to "/api/agents/1/machines/dev-1/snapshots" carrying "Before the patch" at "/description"
    And the host was sent POST to "/api/agents/1/machines/dev-1/snapshots" carrying "true" at "/quiesce"
    And the host was sent POST to "/api/agents/1/machines/dev-1/snapshots" carrying "true" at "/live"
    And the host was sent POST to "/api/agents/1/machines/dev-1/snapshots" carrying nothing at "/name"

  Scenario: Machine page: a write one request and one notice, the edit of a snapshot sends the members that changed alone
    Given the host answers the hosts fixture
    And the host answers the hosts-machines fixture
    And the host answers the hosts-tools fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/1/machines/dev-1/snapshots"
    And I press "edit" on the snapshot "before-upgrade"
    Then the "snapshot-edit" dialog is open
    When I send the open dialog
    Then the open dialog notes "problem"
    And the host was not sent PUT to "/api/agents/1/machines/dev-1/snapshots/before-upgrade"
    When I type "after-upgrade" into the field "snapshot-edit-name"
    And I send the open dialog
    Then the host was sent PUT to "/api/agents/1/machines/dev-1/snapshots/before-upgrade" carrying "after-upgrade" at "/new_name"
    And the host was sent PUT to "/api/agents/1/machines/dev-1/snapshots/before-upgrade" carrying nothing at "/description"
    And the host was sent PUT to "/api/agents/1/machines/dev-1/snapshots/before-upgrade" 1 times
    And the page raised 1 success notice
    And the host was sent GET to "/api/agents/1/machines/dev-1/snapshots" 2 times

  Scenario: Machine page: a write one request and one notice, the delete of a snapshot waits behind the typed confirmation
    Given the host answers the hosts fixture
    And the host answers the hosts-machines fixture
    And the host answers the hosts-tools fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/1/machines/dev-1/snapshots"
    And I press "delete" on the snapshot "before-upgrade"
    Then the host was not sent DELETE to "/api/agents/1/machines/dev-1/snapshots/before-upgrade"
    When I confirm the open dialog
    Then the host was sent DELETE to "/api/agents/1/machines/dev-1/snapshots/before-upgrade" 1 times
    And the page raised 1 success notice
    And the host was sent GET to "/api/agents/1/machines/dev-1/snapshots" 2 times

  Scenario: Machine page: a write one request and one notice, the restore of a machine that is off waits behind the typed confirmation on a zone
    Given the host answers the zones fixture
    And the host answers the zones-machines fixture
    And the host answers the zones-tools fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/self/machines/web-2/snapshots"
    Then the snapshot "daily-20260926-0300" offers "restore"
    And the snapshot "daily-20260926-0300" offers "restore-start"
    When I press "restore" on the snapshot "daily-20260926-0300"
    Then the open dialog notes "restore-destroys-later"
    When I confirm the open dialog
    Then the host was sent POST to "/api/machines/web-2/snapshots/daily-20260926-0300/restore" 1 times
    And the page raised 1 success notice
    And the host was sent GET to "/api/machines/web-2/snapshots" 2 times

  Scenario: Machine page: a write one request and one notice, Restore and start sends the start when the `tasks` topic says the restore completed
    Given the host answers the hosts fixture
    And the host answers the hosts-machines fixture
    And the host answers the hosts-tools fixture
    And the host answers the hosts-events fixture
    And the stream answers the machine restored frames
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/1/machines/dev-2/snapshots"
    Then the snapshot "nightly" offers "restore-start"
    And the host was not sent POST to "/api/agents/1/machines/dev-2/start"
    When I press "restore-start" on the snapshot "nightly"
    Then the open dialog notes no "restore-destroys-later"
    When I confirm the open dialog
    Then the host was sent POST to "/api/agents/1/machines/dev-2/snapshots/nightly/restore" 1 times
    And the host was sent POST to "/api/agents/1/machines/dev-2/start" at least 1 times

  Scenario: Machine page: a write one request and one notice, the retention policy sends the numbers of its kind alone and Clear override sends null
    Given the host answers the hosts fixture
    And the host answers the hosts-machines fixture
    And the host answers the hosts-tools fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/1/machines/dev-1/snapshots"
    Then the machine page draws the "machine-snapshot-policy" panel
    And the machine's "policy-apply" action is held
    When I choose "simple" as the retention policy
    And I type "12" as the retention policy's "keep"
    And I press the machine page's "policy-apply" action
    Then the host was sent PUT to "/api/agents/1/machines/dev-1" carrying "simple" at "/snapshots/type"
    And the host was sent PUT to "/api/agents/1/machines/dev-1" carrying "12" at "/snapshots/keep"
    And the host was sent PUT to "/api/agents/1/machines/dev-1" carrying nothing at "/snapshots/tiers"
    And the host was sent PUT to "/api/agents/1/machines/dev-1" 1 times
    And the page raised 1 success notice
    And the host was sent GET to "/api/agents/1/machines/dev-1" 2 times
    When I press the machine page's "policy-clear" action
    Then the host was sent PUT to "/api/agents/1/machines/dev-1" carrying null at "/snapshots"
    And the host was sent PUT to "/api/agents/1/machines/dev-1" 2 times

  Scenario: Machine page: a write one request and one notice, the retention policy of a zone is written at the agent's own /api path
    Given the host answers the zones fixture
    And the host answers the zones-machines fixture
    And the host answers the zones-tools fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/self/machines/web-1/snapshots"
    And I choose "rotation" as the retention policy
    And I type "6" as the retention policy's "hourly"
    And I press the machine page's "policy-apply" action
    Then the host was sent PUT to "/api/machines/web-1" carrying "rotation" at "/snapshots/type"
    And the host was sent PUT to "/api/machines/web-1" carrying "6" at "/snapshots/tiers/hourly/keep"
    And the host was sent PUT to "/api/machines/web-1" carrying nothing at "/snapshots/tiers/daily"
    And the host was sent PUT to "/api/machines/web-1" 1 times

  Scenario: Machine page: the snapshots behind `machine-snapshots`, the holds of a snapshot open behind `zfs`, one read a dataset, and a hold is placed on every dataset
    Given the host answers the zones fixture
    And the host answers the zones-machines fixture
    And the host answers the zones-tools fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    And the browser records its requests
    When I open "/hosts/self/machines/web-1/snapshots"
    And I open the holds of the snapshot "before-upgrade"
    Then the "snapshot-holds" dialog is open
    And the holds dialog lists 3 datasets and 3 holds
    And the host was sent GET to "/api/storage/snapshot/holds" 3 times
    And the host was asked "/api/storage/snapshot/holds" with "name" as "rpool/zones/web-1/data@before-upgrade"
    When I type "audit" as the hold's tag
    And I press the open dialog's "hold-all" action
    Then the host was sent POST to "/api/storage/snapshot/holds" carrying "audit" at "/tag"
    And the host was sent POST to "/api/storage/snapshot/holds" 3 times
    And the page raised 1 success notice
    And the holds dialog notes "holds-refresh"
    And the host was sent GET to "/api/storage/snapshot/holds" 3 times
    When I press the open dialog's "holds-refresh" action
    Then the host was sent GET to "/api/storage/snapshot/holds" 6 times
    When I press the open dialog's "hold-release" action
    Then the host was sent DELETE to "/api/storage/snapshot/holds" 1 times
    And the host was asked "/api/storage/snapshot/holds" with "tag" as "keep"

  Scenario: Machine page: a write one request and one notice, a template made of a snapshot of a zone names the machine, the snapshot and the file
    Given the host answers the zones fixture
    And the host answers the zones-machines fixture
    And the host answers the zones-tools fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/self/machines/web-1/snapshots"
    And I press "export" on the snapshot "before-upgrade"
    Then the "snapshot-template-export" dialog is open
    When I type "base.box" into the field "template-filename"
    And I send the open dialog
    Then the host was sent POST to "/api/templates/export" carrying "web-1" at "/machine_name"
    And the host was sent POST to "/api/templates/export" carrying "before-upgrade" at "/snapshot_name"
    And the host was sent POST to "/api/templates/export" carrying "base.box" at "/filename"
    And the host was sent POST to "/api/templates/export" 1 times
    And the page raised 1 success notice

  Scenario: Machine page: a write one request and one notice, Publish of a zone's snapshot reads the registries once, opens on the host's default and sends nothing short of its four fields
    Given the host answers the zones fixture
    And the host answers the zones-machines fixture
    And the host answers the zones-tools fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/self/machines/web-1/snapshots"
    And I press "publish" on the snapshot "before-upgrade"
    Then the "snapshot-template-publish" dialog is open
    And the field "template-source" reads "boxvault"
    And the host was sent GET to "/api/templates/sources" 1 times
    When I send the open dialog
    Then the open dialog notes "problem"
    And the host was not sent POST to "/api/templates/publish"
    When I type "acme" into the field "template-organization"
    And I type "debian13" into the field "template-boxName"
    And I type "1.0.0" into the field "template-version"
    And I type "amd64" into the field "template-architecture"
    And I send the open dialog
    Then the host was sent POST to "/api/templates/publish" carrying "boxvault" at "/source_name"
    And the host was sent POST to "/api/templates/publish" carrying "web-1" at "/machine_name"
    And the host was sent POST to "/api/templates/publish" carrying "acme" at "/organization"
    And the host was sent POST to "/api/templates/publish" carrying "debian13" at "/box_name"
    And the host was sent POST to "/api/templates/publish" carrying "1.0.0" at "/version"
    And the host was sent POST to "/api/templates/publish" carrying "amd64" at "/architecture"
    And the host was sent POST to "/api/templates/publish" carrying "before-upgrade" at "/snapshot_name"
    And the host was sent POST to "/api/templates/publish" 1 times
    And the page raised 1 success notice

  Scenario: Controls menu: the tool rows by their tokens, Snapshot, Clone, Convert to template and Move draw on a VirtualBox host that lists them and Snapshot opens the take dialog
    Given the host answers the hosts fixture
    And the host answers the hosts-machines fixture
    And the host answers the hosts-tools fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/1/machines/dev-1"
    And I click "Machine controls"
    Then the Controls menu offers "tool-take"
    And the Controls menu offers "tool-clone"
    And the Controls menu offers "tool-template"
    And the Controls menu offers "tool-move"
    When I press the Controls menu's "tool-take" row
    Then the "snapshot-take" dialog is open
    And the open dialog draws the field "snapshot-live"

  Scenario: Controls menu: the tool rows by their tokens, Clone sends a fresh build with linked said, one request and one notice that carries the agent's warnings
    Given the host answers the hosts fixture
    And the host answers the hosts-machines fixture
    And the host answers the hosts-tools fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/1/machines/dev-1"
    And I click "Machine controls"
    And I press the Controls menu's "tool-clone" row
    Then the "machine-clone" dialog is open
    And the open dialog draws no field "clone-snapshot"
    When I send the open dialog
    Then the open dialog notes "problem"
    And the host was not sent POST to "/api/agents/1/machines/dev-1/clone"
    When I type "copy-1" into the field "clone-hostname"
    And I type "2G" into the field "clone-memory"
    And I send the open dialog
    Then the host was sent POST to "/api/agents/1/machines/dev-1/clone" carrying "template" at "/source"
    And the host was sent POST to "/api/agents/1/machines/dev-1/clone" carrying "copy-1" at "/settings/hostname"
    And the host was sent POST to "/api/agents/1/machines/dev-1/clone" carrying "2G" at "/overrides/memory"
    And the host was sent POST to "/api/agents/1/machines/dev-1/clone" carrying "false" at "/linked"
    And the host was sent POST to "/api/agents/1/machines/dev-1/clone" carrying nothing at "/snapshot"
    And the host was sent POST to "/api/agents/1/machines/dev-1/clone" carrying nothing at "/snapshot_name"
    And the host was sent POST to "/api/agents/1/machines/dev-1/clone" 1 times
    And the page raised 1 warning notice
    And no dialog is open
    And the host was sent GET to "/api/agents/1/machines" 2 times
    And the host was sent GET to "/api/agents/1/stats" 2 times

  Scenario: Controls menu: the tool rows by their tokens, a copy of a VirtualBox machine that runs needs a snapshot, sent as snapshot, and its linked clone opens unchecked
    Given the host answers the hosts fixture
    And the host answers the hosts-machines fixture
    And the host answers the hosts-tools fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/1/machines/dev-1"
    And I click "Machine controls"
    And I press the Controls menu's "tool-clone" row
    And I type "copy-1" into the field "clone-hostname"
    And I check the field "clone-source-current"
    Then the open dialog draws the field "clone-snapshot"
    And the field "clone-linked" is not checked
    And the open dialog notes "clone-linked-virtualbox"
    When I send the open dialog
    Then the open dialog notes "problem"
    And the host was not sent POST to "/api/agents/1/machines/dev-1/clone"
    When I choose "before-upgrade" in the field "clone-snapshot"
    And I check the field "clone-linked"
    And I send the open dialog
    Then the host was sent POST to "/api/agents/1/machines/dev-1/clone" carrying "current" at "/source"
    And the host was sent POST to "/api/agents/1/machines/dev-1/clone" carrying "before-upgrade" at "/snapshot"
    And the host was sent POST to "/api/agents/1/machines/dev-1/clone" carrying nothing at "/snapshot_name"
    And the host was sent POST to "/api/agents/1/machines/dev-1/clone" carrying "true" at "/linked"
    And the host was sent GET to "/api/agents/1/machines/dev-1/snapshots" 2 times

  Scenario: Controls menu: the tool rows by their tokens, an agent short of resources leaves the clone dialog open with one line a resource and raises no card beside it
    Given the host answers the hosts fixture
    And the host answers the hosts-machines fixture
    And the host answers the hosts-tools fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/1/machines/dev-2"
    And I click "Machine controls"
    And I press the Controls menu's "tool-clone" row
    And I type "copy-2" into the field "clone-hostname"
    And I send the open dialog
    Then the host was sent POST to "/api/agents/1/machines/dev-2/clone" 1 times
    And the "machine-clone" dialog is open
    And the open dialog lists 2 resource issues
    And the page raised 0 danger notices
    And the host was sent GET to "/api/agents/1/machines" 1 times

  Scenario: Controls menu: the tool rows by their tokens, a zone's clone says linked false at the agent's own /api path and a bhyve host draws no second Move
    Given the host answers the zones fixture
    And the host answers the zones-machines fixture
    And the host answers the zones-tools fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/self/machines/web-1"
    And I click "Zone controls"
    Then the Controls menu offers "tool-take"
    And the Controls menu offers "tool-clone"
    And the Controls menu offers no "tool-move"
    And I see "Move zonepath"
    When I press the Controls menu's "tool-clone" row
    And I type "copy-1" into the field "clone-hostname"
    And I send the open dialog
    Then the host was sent POST to "/api/machines/web-1/clone" carrying "false" at "/linked"
    And the host was sent POST to "/api/machines/web-1/clone" carrying "template" at "/source"
    And the host was sent POST to "/api/machines/web-1/clone" 1 times
    And the page raised 1 success notice
    And the host was not sent POST to "/api/agents/self/machines/web-1/clone"

  Scenario: Controls menu: the tool rows by their tokens, Convert to template on a VirtualBox host warns while the machine runs, offers no snapshot and names none
    Given the host answers the hosts fixture
    And the host answers the hosts-machines fixture
    And the host answers the hosts-tools fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/1/machines/dev-1"
    And I click "Machine controls"
    And I press the Controls menu's "tool-template" row
    Then the "machine-template" dialog is open
    And the open dialog notes "running"
    And the open dialog draws no field "machine-template-snapshot"
    When I send the open dialog
    Then the host was sent POST to "/api/agents/1/templates/export" carrying "dev-1" at "/machine_name"
    And the host was sent POST to "/api/agents/1/templates/export" carrying nothing at "/snapshot_name"
    And the host was sent POST to "/api/agents/1/templates/export" carrying nothing at "/filename"
    And the host was sent POST to "/api/agents/1/templates/export" 1 times
    And the page raised 1 success notice
    And the host was not sent GET to "/api/agents/1/machines/dev-1/snapshots"

  Scenario: Controls menu: the tool rows by their tokens, the VirtualBox Move collects the folder in a form dialog and sends it as target_path
    Given the host answers the hosts fixture
    And the host answers the hosts-machines fixture
    And the host answers the hosts-tools fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/1/machines/dev-2"
    And I click "Machine controls"
    And I press the Controls menu's "tool-move" row
    Then the "machine-move" dialog is open
    And the open dialog notes no "running"
    When I send the open dialog
    Then the open dialog notes "problem"
    And the host was not sent POST to "/api/agents/1/machines/dev-2/move"
    When I type "D:\\vms\\new-home" into the field "machine-move-path"
    And I send the open dialog
    Then the host was sent POST to "/api/agents/1/machines/dev-2/move" carrying "target_path" as "D:\\vms\\new-home"
    And the host was sent POST to "/api/agents/1/machines/dev-2/move" 1 times
    And the page raised 1 success notice
    And no dialog is open
    And the host was sent GET to "/api/agents/1/machines" 2 times

  Scenario: Sidebar tree: a machine node's menu draws Snapshot and Clone by the host's tokens and Clone opens the clone dialog on that machine
    Given the host answers the hosts fixture
    And the host answers the hosts-machines fixture
    And the host answers the hosts-tools fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/1/machines/dev-1"
    And I right-click the tree node "dev-2"
    Then the tree menu offers "snapshot"
    And the tree menu offers "clone"
    When I press the tree menu's "clone" row
    Then the "machine-clone" dialog is open
    When I type "copy-2" into the field "clone-hostname"
    And I send the open dialog
    Then the host was sent POST to "/api/agents/1/machines/dev-2/clone" 1 times
    And the host was not sent POST to "/api/agents/1/machines/dev-1/clone"

  Scenario: Sidebar tree: a machine node's menu draws no Snapshot and no Clone on a host whose row lists neither token
    Given the host answers the hosts fixture
    And the host answers the hosts-machines fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/1/machines/dev-1"
    And I right-click the tree node "dev-2"
    Then the tree menu offers no "snapshot"
    And the tree menu offers no "clone"

  Scenario: Machine page: the machines list by the host's tokens, Import draws on a host that names virtualbox and sends the appliance's path, one request and one notice
    Given the host answers the hosts fixture
    And the host answers the hosts-machines fixture
    And the host answers the hosts-tools fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/1/machines"
    Then the machines list offers "import"
    When I press the machines list's "import" action
    Then the "machine-import" dialog is open
    When I send the open dialog
    Then the open dialog notes "problem"
    And the host was not sent POST to "/api/agents/1/machines/import"
    When I type "D:\\appliances\\debian13.ova" into the field "machine-import-path"
    And I type "debian13" into the field "machine-import-name"
    And I send the open dialog
    Then the host was sent POST to "/api/agents/1/machines/import" carrying "path" as "D:\\appliances\\debian13.ova"
    And the host was sent POST to "/api/agents/1/machines/import" carrying "name" as "debian13"
    And the host was sent POST to "/api/agents/1/machines/import" 1 times
    And the page raised 1 success notice
    And the host was sent GET to "/api/agents/1/machines" 2 times
    And the host was sent GET to "/api/agents/1/stats" 2 times

  Scenario: Machine page: the machines list by the host's tokens, a bhyve host draws no Import and a row's More menu draws Clone behind machine-create
    Given the host answers the zones fixture
    And the host answers the zones-machines fixture
    And the host answers the zones-tools fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/self/machines"
    Then the machines list offers no "import"
    When I open the More menu of the row of "web-1"
    And I press "clone" on the row of "web-1"
    Then the "machine-clone" dialog is open
    And the host was not sent POST to "/api/machines/import"

  Scenario: Machine page: the machines list by the host's tokens, a row's More menu draws no Clone on a host that lists no machine-create
    Given the host answers the hosts fixture
    And the host answers the hosts-machines fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/1/machines"
    And I open the More menu of the row of "dev-1"
    Then the row of "dev-1" offers "restart"
    And the row of "dev-1" offers no "clone"

  Scenario: Machine page: a write one request and one notice, Take snapshot on a zone is sent at the agent's own /api path and opens its task
    Given the host answers the zones fixture
    And the host answers the zones-machines fixture
    And the host answers the zones-tools fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/self/machines/web-1/snapshots"
    And I press the machine page's "snapshot-take" action
    And I type "before-patch" into the field "snapshot-name"
    And I send the open dialog
    Then the host was sent POST to "/api/machines/web-1/snapshots" carrying "before-patch" at "/name"
    And the host was sent POST to "/api/machines/web-1/snapshots" 1 times
    And the page raised 1 success notice
    And the host was sent GET to "/api/machines/web-1/snapshots" 2 times
    And the host was sent GET to "/api/tasks/b2000000-0000-4000-8000-000000000001"
    And the host was not sent POST to "/api/agents/self/machines/web-1/snapshots"

  Scenario: Machine page: a write one request and one notice, the edit of a zone's snapshot sends the members that changed alone
    Given the host answers the zones fixture
    And the host answers the zones-machines fixture
    And the host answers the zones-tools fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/self/machines/web-1/snapshots"
    And I press "edit" on the snapshot "before-upgrade"
    Then the "snapshot-edit" dialog is open
    When I type "after-upgrade" into the field "snapshot-edit-name"
    And I send the open dialog
    Then the host was sent PUT to "/api/machines/web-1/snapshots/before-upgrade" carrying "after-upgrade" at "/new_name"
    And the host was sent PUT to "/api/machines/web-1/snapshots/before-upgrade" carrying nothing at "/description"
    And the host was sent PUT to "/api/machines/web-1/snapshots/before-upgrade" 1 times
    And the page raised 1 success notice
    And the host was sent GET to "/api/machines/web-1/snapshots" 2 times

  Scenario: Machine page: a write one request and one notice, the delete of a zone's snapshot waits behind the typed confirmation and warns of no rollback
    Given the host answers the zones fixture
    And the host answers the zones-machines fixture
    And the host answers the zones-tools fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/self/machines/web-1/snapshots"
    And I press "delete" on the snapshot "before-upgrade"
    Then the open dialog notes no "restore-destroys-later"
    And the host was not sent DELETE to "/api/machines/web-1/snapshots/before-upgrade"
    When I confirm the open dialog
    Then the host was sent DELETE to "/api/machines/web-1/snapshots/before-upgrade" 1 times
    And the page raised 1 success notice
    And the host was sent GET to "/api/machines/web-1/snapshots" 2 times

  Scenario: Controls menu: the tool rows by their tokens, Convert to template on a zone offers the snapshots and names the one chosen as snapshot_name
    Given the host answers the zones fixture
    And the host answers the zones-machines fixture
    And the host answers the zones-tools fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/self/machines/web-1"
    And I click "Zone controls"
    And I press the Controls menu's "tool-template" row
    Then the "machine-template" dialog is open
    And the open dialog notes "running"
    When I choose "before-upgrade" in the field "machine-template-snapshot"
    Then the open dialog notes no "running"
    When I send the open dialog
    Then the host was sent POST to "/api/templates/export" carrying "web-1" at "/machine_name"
    And the host was sent POST to "/api/templates/export" carrying "before-upgrade" at "/snapshot_name"
    And the host was sent POST to "/api/templates/export" carrying nothing at "/filename"
    And the host was sent POST to "/api/templates/export" 1 times
    And the page raised 1 success notice

  Scenario: Controls menu: the tool rows by their tokens, a copy of a zone that runs needs no snapshot, its linked clone opens checked and is sent as the box reads
    Given the host answers the zones fixture
    And the host answers the zones-machines fixture
    And the host answers the zones-tools fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/self/machines/web-1"
    And I click "Zone controls"
    And I press the Controls menu's "tool-clone" row
    And I type "copy-1" into the field "clone-hostname"
    And I check the field "clone-source-current"
    Then the open dialog draws the field "clone-snapshot"
    And the field "clone-linked" is checked
    And the open dialog notes "clone-linked-zfs"
    When I send the open dialog
    Then the host was sent POST to "/api/machines/web-1/clone" carrying "current" at "/source"
    And the host was sent POST to "/api/machines/web-1/clone" carrying "true" at "/linked"
    And the host was sent POST to "/api/machines/web-1/clone" carrying nothing at "/snapshot_name"
    And the host was sent POST to "/api/machines/web-1/clone" carrying nothing at "/snapshot"
    And the host was sent POST to "/api/machines/web-1/clone" 1 times

  Scenario: Controls menu: the tool rows by their tokens, a copy of a zone made of a snapshot names it as snapshot_name and a full copy says linked false
    Given the host answers the zones fixture
    And the host answers the zones-machines fixture
    And the host answers the zones-tools fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/self/machines/web-1"
    And I click "Zone controls"
    And I press the Controls menu's "tool-clone" row
    And I type "copy-1" into the field "clone-hostname"
    And I check the field "clone-source-current"
    And I choose "before-upgrade" in the field "clone-snapshot"
    And I uncheck the field "clone-linked"
    And I send the open dialog
    Then the host was sent POST to "/api/machines/web-1/clone" carrying "before-upgrade" at "/snapshot_name"
    And the host was sent POST to "/api/machines/web-1/clone" carrying nothing at "/snapshot"
    And the host was sent POST to "/api/machines/web-1/clone" carrying "false" at "/linked"

  Scenario: Machine page: the tools on the hyperweaver-agent role served directly, a snapshot is taken and a copy is made at the agent's own /api path
    Given the host answers the agent fixture
    And the host answers the agent-machines fixture
    And the host answers the agent-tools fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/self/machines/dev-1/snapshots"
    Then the machine page draws the "machine-snapshots" panel
    And the snapshots list draws 2 rows
    And the snapshot "before-upgrade" offers no "export"
    When I press the machine page's "snapshot-take" action
    And I type "before-patch" into the field "snapshot-name"
    And I send the open dialog
    Then the host was sent POST to "/api/machines/dev-1/snapshots" carrying "before-patch" at "/name"
    And the host was sent POST to "/api/machines/dev-1/snapshots" 1 times
    And the host was not sent POST to "/api/agents/self/machines/dev-1/snapshots"
    And the page raised 1 success notice
    When I press "Escape"
    And I open "/hosts/self/machines/dev-1"
    And I click "Machine controls"
    And I press the Controls menu's "tool-clone" row
    And I type "copy-1" into the field "clone-hostname"
    And I check the field "clone-source-current"
    And I choose "before-upgrade" in the field "clone-snapshot"
    And I send the open dialog
    Then the host was sent POST to "/api/machines/dev-1/clone" carrying "before-upgrade" at "/snapshot"
    And the host was sent POST to "/api/machines/dev-1/clone" carrying nothing at "/snapshot_name"
    And the host was sent POST to "/api/machines/dev-1/clone" carrying "false" at "/linked"

  Scenario: Machine page: the snapshots behind `machine-snapshots`, a host that lists machine-snapshots and no templates draws no template of a snapshot and no Convert to template
    Given the host answers the zones fixture
    And the host answers the zones-machines fixture
    And the host answers the zones-tools fixture
    And the host answers the zones-untemplated fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/self/machines/web-1/snapshots"
    Then the snapshots list draws 2 rows
    And the snapshot "before-upgrade" offers "edit"
    And the snapshot "before-upgrade" offers "delete"
    And the snapshot "before-upgrade" offers no "export"
    And the snapshot "before-upgrade" offers no "publish"
    When I open "/hosts/self/machines/web-1"
    And I click "Zone controls"
    Then the Controls menu offers "tool-take"
    And the Controls menu offers no "tool-template"
    And the host was not sent GET to "/api/templates/sources"

  Scenario: Machine page: the snapshots behind `machine-snapshots`, the holds are offered to every role that reads the snapshots
    Given the host answers the zones fixture
    And the host answers the zones-machines fixture
    And the host answers the zones-tools fixture
    And the host answers the hosts-member fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"user\",\"access_token\":\"t\"}"
    When I open "/hosts/self/machines/web-1/snapshots"
    Then the snapshots list draws 2 rows
    And the snapshots list offers no action
    When I open the holds of the snapshot "before-upgrade"
    Then the "snapshot-holds" dialog is open
    And the holds dialog lists 3 datasets and 3 holds
    When I type "audit" as the hold's tag
    And I press the open dialog's "hold-all" action
    Then the host was sent POST to "/api/storage/snapshot/holds" 3 times

  Scenario: Machine page: the snapshots behind `machine-snapshots`, a read of the holds that failed names the dataset it failed for
    Given the host answers the zones fixture
    And the host answers the zones-machines fixture
    And the host answers the zones-tools fixture
    And the host answers the zones-quiet fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/self/machines/web-1/snapshots"
    And I open the holds of the snapshot "before-upgrade"
    Then the "snapshot-holds" dialog is open
    And the holds dialog says its read failed for "rpool/zones/web-1"
    And the holds dialog lists 3 datasets and 0 holds

  Scenario: Machine page: a write one request and one notice, a read of the registries that failed says so in the publish dialog
    Given the host answers the zones fixture
    And the host answers the zones-machines fixture
    And the host answers the zones-tools fixture
    And the host answers the zones-quiet fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/self/machines/web-1/snapshots"
    And I press "publish" on the snapshot "before-upgrade"
    Then the "snapshot-template-publish" dialog is open
    And the open dialog notes "registries-failed"
    And the field "template-source" reads ""
    And the host was sent GET to "/api/templates/sources" 1 times

  Scenario: Machine page: a write one request and one notice, Restore and start on a host that streams no tasks tells the person and offers the start
    Given the host answers the zones fixture
    And the host answers the zones-machines fixture
    And the host answers the zones-tools fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/self/machines/web-2/snapshots"
    And I press "restore-start" on the snapshot "daily-20260926-0300"
    Then the open dialog notes "restore-destroys-later"
    When I confirm the open dialog
    Then the host was sent POST to "/api/machines/web-2/snapshots/daily-20260926-0300/restore" 1 times
    And the page raised 1 success notice
    And the page raised 1 warning notice
    And the host was not sent POST to "/api/machines/web-2/start"
    When I press "Escape"
    And I press the warning notice's action
    Then the host was sent POST to "/api/machines/web-2/start" 1 times

  Scenario: Machine page: a write one request and one notice, Restore and start sends the start when the restore's task had ended before the stream said so
    Given the host answers the hosts fixture
    And the host answers the hosts-machines fixture
    And the host answers the hosts-tools fixture
    And the host answers the hosts-events fixture
    And the host answers the hosts-restored fixture
    And the stream answers the ready frames
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/1/machines/dev-2/snapshots"
    And I press "restore-start" on the snapshot "nightly"
    And I confirm the open dialog
    Then the host was sent POST to "/api/agents/1/machines/dev-2/snapshots/nightly/restore" 1 times
    And the host was sent GET to "/api/agents/1/tasks/a1000000-0000-4000-8000-000000000002"
    And the host was sent POST to "/api/agents/1/machines/dev-2/start" at least 1 times
    And the page raised 0 warning notices

  Scenario: Controls menu: the tool rows by their tokens, a Move the agent refuses leaves the dialog open, raises one danger notice and reads nothing again
    Given the host answers the hosts fixture
    And the host answers the hosts-machines fixture
    And the host answers the hosts-tools fixture
    And the host answers the hosts-refusals fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/1/machines/dev-1"
    And I click "Machine controls"
    And I press the Controls menu's "tool-move" row
    Then the "machine-move" dialog is open
    And the open dialog notes "running"
    When I type "D:\\vms\\new-home" into the field "machine-move-path"
    And I send the open dialog
    Then the host was sent POST to "/api/agents/1/machines/dev-1/move" 1 times
    And the page raised 1 danger notice
    And the page raised 0 success notices
    And the "machine-move" dialog is open
    And the host was sent GET to "/api/agents/1/machines" 1 times

  Scenario: Machine page: the charts behind `monitoring` by the host's hypervisor, a link that holds no sample draws no chart and a read that failed says so under its chart
    Given the host answers the zones fixture
    And the host answers the zones-machines fixture
    And the host answers the zones-tools fixture
    And the host answers the zones-quiet fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/self/machines/web-1"
    Then the machine page draws the "disk:rpool/zones/web-1/boot" chart
    And the machine page draws the "disk:tank/zones/web-1/data" chart
    And the machine's "cpu" chart says its read failed
    And the machine's "memory" chart says its read failed
    And the machine page draws no "link:vnice3_1234_0" chart
    And the machine page draws 4 charts
    And the host was sent GET to "/api/monitoring/network/usage" 2 times

  Scenario: Machine page: the machines list draws the column of the host's pages beside it with Machines active
    Given the host answers the hosts fixture
    And the host answers the hosts-machines fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/1/machines"
    Then the machines list draws 3 rows
    And the host column draws the rows "overview, machines, orchestration, api-keys, database, update"
    And the host column draws the "machines" row to "/hosts/1/machines"
    And the host row "machines" is the active one
    When I follow the host row "overview"
    Then the path is "/hosts/1"

  Scenario: Machine page: the column of the machine's pages, Overview, Settings behind machine-modify for an admin, Snapshots behind machine-snapshots and Provisioning always, the snapshots a row at their own route with the row active
    Given the host answers the hosts fixture
    And the host answers the hosts-machines fixture
    And the host answers the hosts-tools fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/1/machines/dev-1"
    Then the machine column draws 4 page rows
    And the machine column draws the "overview" row to "/hosts/1/machines/dev-1"
    And the machine column draws the "settings" row to "/hosts/1/machines/dev-1/settings"
    And the machine column draws the "snapshots" row to "/hosts/1/machines/dev-1/snapshots"
    And the machine column draws the "provisioning" row to "/hosts/1/machines/dev-1/provisioning"
    And the machine row "overview" is the active one
    And the machine page draws no "machine-snapshots" panel
    And the host was not sent GET to "/api/agents/1/machines/dev-1/snapshots"
    And the page draws no key of hyperweaver-ui in place of its text
    When I follow the machine row "snapshots"
    Then the path is "/hosts/1/machines/dev-1/snapshots"
    And the machine row "snapshots" is the active one
    And the machine page draws the "machine-snapshots" panel
    And the machine page draws the "machine-snapshot-policy" panel
    And the snapshots page draws no "machine-info" panel
    And the host was sent GET to "/api/agents/1/machines/dev-1/snapshots" 1 times
    And the host was sent GET to "/api/agents/1/machines/dev-1" 1 times
    When I follow the machine row "overview"
    Then the path is "/hosts/1/machines/dev-1"
    And the machine row "overview" is the active one
    And the machine page draws the "machine-info" panel
    And the host was sent GET to "/api/agents/1/machines/dev-1" 1 times
