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
    And I see "Host actions"

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
    And the machine page draws no "machine-screenshot" panel
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

  Scenario: Machine page: the screen behind `machine-screenshot`, a running machine's frame is read once and again on the card's Refresh and the page's
    Given the host answers the agent fixture
    And the host answers the agent-machines fixture
    And the host answers a screenshot of "dev-1"
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/self/machines/dev-1"
    Then the machine page draws the "machine-screenshot" panel
    And the screenshot draws
    And the screenshot was read at "/api/machines/dev-1/vnc/screenshot" 1 times
    When I press the machine page's "screenshot" action
    Then the screenshot was read at "/api/machines/dev-1/vnc/screenshot" 2 times
    When I click "Refresh"
    Then the screenshot was read at "/api/machines/dev-1/vnc/screenshot" 3 times
    And the host was sent GET to "/api/machines/dev-1" 2 times
    And the host was sent GET to "/api/machines/dev-1/guest-properties" 2 times

  Scenario: Machine page: the screen behind `machine-screenshot`, a host that lists no machine-screenshot is asked for no frame
    Given the host answers the zones fixture
    And the host answers a screenshot of "web-1"
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/self/machines/web-1"
    Then the machine reads "running"
    And the machine page draws no "machine-screenshot" panel
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
