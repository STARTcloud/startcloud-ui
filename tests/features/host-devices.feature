Feature: host devices

  Scenario: Devices: the page behind `devices`, a host whose row lists it not draws the not-available stub and is asked for no device read
    Given the host answers the hosts fixture
    And the host answers the hosts-devices fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/1/devices"
    Then the devices page draws the not-available stub
    And the host was not sent GET to "/api/agents/1/host/devices"
    And the host was not sent GET to "/api/agents/1/host/ppt-status"

  Scenario: Devices: a host the list of servers does not hold draws what the host page draws for it, never the token stub
    Given the host answers the hosts fixture
    And the host answers the hosts-devices fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/99/devices"
    Then the devices route draws the host that did not answer
    And the host was sent GET to "/api/agents/99/stats"
    And the host was not sent GET to "/api/agents/99/host/devices"

  Scenario: Devices: the four reads sent once as the page opens, the summary the first section with a count a category and the three passthrough counts
    Given the host answers the hosts fixture
    And the host answers the hosts-devices fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/3/devices"
    Then the device summary is the first section of the devices page
    And the device summary counts 7 pairs
    And the device summary counts "network" as 3
    And the device summary counts "ppt-capable" as 6
    And the device summary counts "ppt-available" as 1
    And the device summary counts "ppt-assigned" as 1
    And the host was sent GET to "/api/agents/3/host/devices" 1 times
    And the host was sent GET to "/api/agents/3/host/devices/categories" 1 times
    And the host was sent GET to "/api/agents/3/host/ppt-status" 1 times
    And the host was sent GET to "/api/agents/3/host/devices/available" 1 times
    And the page draws no key of hyperweaver-ui in place of its text

  Scenario: Devices: the devices table, hyperweaver-ui's inventory, every device with its category, its driver, its state and its passthrough state
    Given the host answers the hosts fixture
    And the host answers the hosts-devices fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/3/devices"
    Then the devices table lists 8 rows
    And the devices table draws the "name" column
    And the devices table draws the "pci" column
    And the devices table draws the "category" column
    And the devices table draws the "status" column
    And the devices table draws the "ppt" column
    And the devices table draws "0000:41:00.0" in its "pci" column
    And the devices table draws "igb" in its "driver" column
    And the devices table draws "web-1" in its "zones" column
    And the first row of the devices table reads "ASMedia"

  Scenario: Devices: the passthrough table over the ppt_devices of the passthrough status, drawn while the host answered one
    Given the host answers the hosts fixture
    And the host answers the hosts-devices fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/3/devices"
    Then the passthrough table lists 2 rows
    And the passthrough table draws "/dev/ppt0" in its "path" column
    And the passthrough table draws "web-1" in its "zones" column

  Scenario: Devices: the one search of the page narrows the devices table, the passthrough table left whole
    Given the host answers the hosts fixture
    And the host answers the hosts-devices fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/3/devices"
    Then the devices table lists 8 rows
    When I press "Control+f"
    And I search the devices page for "intel"
    Then the devices table lists 3 rows
    And the passthrough table lists 2 rows

  Scenario: Devices: the filter groups, hyperweaver-ui's three selects, narrow the devices table
    Given the host answers the hosts fixture
    And the host answers the hosts-devices fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/3/devices"
    Then the devices table lists 8 rows
    When I press "Control+f"
    And I open the filter panel
    And I toggle the filter pill "Storage"
    Then the devices table lists 3 rows
    When I toggle the filter pill "Network"
    Then the devices table lists 6 rows

  Scenario: Devices: a row's Details opens the device dialog with the zones it is assigned to
    Given the host answers the hosts fixture
    And the host answers the hosts-devices fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/3/devices"
    Then the devices table lists 8 rows
    When I open the details of the device "NVIDIA GA104GL"
    Then the device dialog draws
    And the device dialog lists the zone "web-1"
    And the device dialog reads "/dev/ppt0"

  Scenario: Devices: Discover devices asks the agent to discover again and reads the four at once, nothing waiting on a clock
    Given the host answers the hosts fixture
    And the host answers the hosts-devices fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/3/devices"
    Then the devices table lists 8 rows
    And the host was sent GET to "/api/agents/3/host/devices" 1 times
    When I press the devices action "discover"
    Then the host was sent POST to "/api/agents/3/host/devices/refresh" 1 times
    And the host was sent GET to "/api/agents/3/host/devices" 2 times
    And the host was sent GET to "/api/agents/3/host/ppt-status" 2 times

  Scenario: Devices: Refresh reads the four again
    Given the host answers the hosts fixture
    And the host answers the hosts-devices fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/3/devices"
    Then the devices table lists 8 rows
    And the host was sent GET to "/api/agents/3/host/devices" 1 times
    When I click "Refresh"
    Then the host was sent GET to "/api/agents/3/host/devices" 2 times
    And the host was sent GET to "/api/agents/3/host/devices/categories" 2 times
    And the host was not sent POST to "/api/agents/3/host/devices/refresh"

  Scenario: Devices: a read that failed names the agent's message and the other reads draw
    Given the host answers the hosts fixture
    And the host answers the hosts-devices fixture
    And the host answers the hosts-devices-failed fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/3/devices"
    Then the devices page says a read failed
    And the devices table lists 8 rows
    And the devices page draws no passthrough table

  Scenario: Devices: the sections fold and the fold is kept over a reload
    Given the host answers the hosts fixture
    And the host answers the hosts-devices fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/3/devices"
    Then the devices table lists 8 rows
    When I fold the "summary" section of the devices page
    And I fold the "inventory" section of the devices page
    And I fold the "ppt" section of the devices page
    Then the "summary" section of the devices page is folded
    And the "inventory" section of the devices page is folded
    And the "ppt" section of the devices page is folded
    When I load the page again
    Then the "inventory" section of the devices page is folded
    When I fold the "inventory" section of the devices page
    Then the devices table lists 8 rows

  Scenario: Devices: the Controls menu draws the host actions on the devices route
    Given the host answers the hosts fixture
    And the host answers the hosts-devices fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/3/devices"
    Then the devices page draws its frame
    And I see "Host actions"

  Scenario: Devices: on the zoneweaver-agent role the four reads are sent at the agent's own /api path
    Given the host answers the zones fixture
    And the host answers the zones-devices fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/self/devices"
    Then the devices table lists 8 rows
    And the passthrough table lists 2 rows
    And the host was sent GET to "/api/host/devices"
    And the host was sent GET to "/api/host/devices/categories"
    And the host was sent GET to "/api/host/ppt-status"
    And the host was sent GET to "/api/host/devices/available"
    And the host was not sent GET to "/api/agents/self/host/devices"
