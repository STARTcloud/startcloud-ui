Feature: networking

  Scenario: Interfaces: the page behind `monitoring`, a host whose row lists no network token draws the not-available stub and no network group and is asked for no network read
    Given the host answers the hosts fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/1/network/interfaces"
    Then the networking page draws the not-available stub
    And the host column draws no "network" group
    And the host was not sent GET to "/api/agents/1/monitoring/network/interfaces"
    And the host was not sent GET to "/api/agents/1/monitoring/network/usage"
    And the host was not sent GET to "/api/agents/1/monitoring/network/ipaddresses"
    And the host was not sent GET to "/api/agents/1/monitoring/network/routes"
    And the host was not sent GET to "/api/agents/1/network/addresses"

  Scenario: Interfaces: a host the list of servers does not hold draws what the host page draws for it, never the token stub
    Given the host answers the hosts fixture
    And the host answers the hosts-overview fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/99/network/interfaces"
    Then the networking route draws the host that did not answer
    And the host was sent GET to "/api/agents/99/stats"
    And the host was not sent GET to "/api/agents/99/monitoring/network/interfaces"

  Scenario: Addresses: every table behind the tokens of its read, a host that lists the address tokens and no `monitoring` draws the frame and asks for no monitoring read
    Given the host answers the hosts fixture
    And the host answers the hosts-overview fixture
    And the host answers the hosts-networking fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/4/network/addresses"
    Then the networking page draws its frame
    And I see "Bare"
    And the networking page draws no monitoring table and no chart
    And the networking page draws no network summary
    And the host was not sent GET to "/api/agents/4/monitoring/network/interfaces"
    And the host was not sent GET to "/api/agents/4/monitoring/network/usage"
    And the host was not sent GET to "/api/agents/4/monitoring/network/ipaddresses"
    And the host was not sent GET to "/api/agents/4/monitoring/network/routes"

  Scenario: Interfaces: the network summary, hyperweaver-ui's card, the first section of the page with its five counts
    Given the host answers the hosts fixture
    And the host answers the hosts-overview fixture
    And the host answers the hosts-networking fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/3/network/interfaces"
    Then the network summary is the first section of the networking page
    And the network summary counts 3 in all, 2 physical, 1 virtual, 2 up and 1 down
    And the page draws no key of hyperweaver-ui in place of its text

  Scenario: Interfaces: the network summary on hyperweaver-agent counts the interfaces its row answers
    Given the host answers the hosts fixture
    And the host answers the hosts-overview fixture
    And the host answers the hosts-networking fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/1/network/interfaces"
    Then the network summary counts 2 in all, 2 physical, 0 virtual, 1 up and 1 down
    And the page draws no key of hyperweaver-ui in place of its text

  Scenario: Addresses: the IP addresses on zoneweaver-agent, the newest row of each address object, the address read from `ip_address` and the prefix from `prefix_length`
    Given the host answers the hosts fixture
    And the host answers the hosts-overview fixture
    And the host answers the hosts-networking fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/3/network/addresses"
    Then the "addresses" table of the networking page lists 4 rows
    And the "addresses" table of the networking page draws the "address" column
    And the "addresses" table of the networking page draws the "prefix" column
    And the "addresses" table of the networking page draws "10.0.0.31" in its "address" column
    And the "addresses" table of the networking page draws "/8" in its "prefix" column
    And the "addresses" table of the networking page draws "/10" in its "prefix" column
    And the "addresses" table of the networking page draws no "10.0.0.30" in its "address" column
    And I see "tentative"
    And the host was sent GET to "/api/agents/3/monitoring/network/ipaddresses" 1 times

  Scenario: Addresses: the IP addresses on hyperweaver-agent, every live row drawn, two of one address object included, the address and the prefix read from the two parts of `addr`
    Given the host answers the hosts fixture
    And the host answers the hosts-overview fixture
    And the host answers the hosts-networking fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/1/network/addresses"
    Then the "addresses" table of the networking page lists 4 rows
    And the "addresses" table of the networking page draws the "version" column
    And the "addresses" table of the networking page draws the "address" column
    And the "addresses" table of the networking page draws the "prefix" column
    And the "addresses" table of the networking page draws "10.0.0.11" in its "address" column
    And the "addresses" table of the networking page draws "10.0.0.12" in its "address" column
    And the "addresses" table of the networking page draws "169.254.12.7" in its "address" column
    And the "addresses" table of the networking page draws "fe80::a00:27ff:fe4f:1a01" in its "address" column
    And the "addresses" table of the networking page draws "/16" in its "prefix" column
    And the "addresses" table of the networking page draws "/64" in its "prefix" column
    And the host was sent GET to "/api/agents/1/monitoring/network/ipaddresses" 1 times

  Scenario: Addresses: the one search finds an address on a hyperweaver-agent host, whose rows carry `addr` alone
    Given the host answers the hosts fixture
    And the host answers the hosts-overview fixture
    And the host answers the hosts-networking fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/1/network/addresses"
    Then the "addresses" table of the networking page lists 4 rows
    When I press "Control+k"
    And I search the networking page for "10.0.0.12"
    Then the "addresses" table of the networking page lists 1 rows
    And I see "10.0.0.12"

  Scenario: Routes: the routing table behind `monitoring` and `vnics`, zoneweaver-agent's routes drawn once each with the members a route carries
    Given the host answers the hosts fixture
    And the host answers the hosts-overview fixture
    And the host answers the hosts-networking fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/3/network/routes"
    Then the "routes" table of the networking page lists 3 rows
    And the "routes" table of the networking page draws the "interface" column
    And the "routes" table of the networking page draws the "destination" column
    And the "routes" table of the networking page draws the "gateway" column
    And the "routes" table of the networking page draws the "mask" column
    And the "routes" table of the networking page draws the "version" column
    And the "routes" table of the networking page draws the "default" column
    And the "routes" table of the networking page draws the "flags" column
    And the "routes" table of the networking page draws the "metric" column
    And the "routes" table of the networking page draws the "type" column
    And the "routes" table of the networking page draws "10.0.0.1" in its "gateway" column
    And the "routes" table of the networking page draws "255.255.255.255" in its "mask" column
    And the "routes" table of the networking page draws "UG" in its "flags" column
    And the host was sent GET to "/api/agents/3/monitoring/network/routes" 1 times

  Scenario: Routes: the routing table behind `monitoring` and `vnics`, a hyperweaver-agent host draws no Routes row, its route draws the not-available stub and it is not asked for its routes
    Given the host answers the hosts fixture
    And the host answers the hosts-overview fixture
    And the host answers the hosts-networking fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/1/network/addresses"
    Then the networking page draws the "addresses" table
    And the host column draws no "routes" row
    When I open "/hosts/1/network/interfaces"
    Then the networking page draws the "interfaces" table
    When I open "/hosts/1/network/routes"
    Then the networking page draws the not-available stub
    And the host was not sent GET to "/api/agents/1/monitoring/network/routes"

  Scenario: Network pages: a read that failed says so in its table and the other pages' tables draw
    Given the host answers the hosts fixture
    And the host answers the hosts-overview fixture
    And the host answers the hosts-networking fixture
    And the host answers the hosts-networking-failed fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/3/network/addresses"
    Then the "addresses" table of the networking page says "failed"
    When I open "/hosts/3/network/routes"
    Then the "routes" table of the networking page lists 3 rows
    When I open "/hosts/3/network/interfaces"
    Then the "interfaces" table of the networking page lists 3 rows

  Scenario: Routes: a table the host answered no row of draws its empty placard
    Given the host answers the hosts fixture
    And the host answers the hosts-overview fixture
    And the host answers the hosts-networking fixture
    And the host answers the hosts-networking-empty fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/3/network/routes"
    Then the "routes" table of the networking page says "empty"
    When I open "/hosts/3/network/addresses"
    Then the "addresses" table of the networking page lists 4 rows

  Scenario: Interfaces: the interfaces on zoneweaver-agent, the newest row of each, the speed and the zone drawn and no MAC address, the zone opening the machine's page
    Given the host answers the hosts fixture
    And the host answers the hosts-overview fixture
    And the host answers the hosts-networking fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/3/network/interfaces"
    Then the "interfaces" table of the networking page lists 3 rows
    And the "interfaces" table of the networking page draws the "speed" column
    And the "interfaces" table of the networking page draws the "mtu" column
    And the "interfaces" table of the networking page draws the "zone" column
    And the "interfaces" table of the networking page draws no "macaddress" column
    And the "interfaces" table of the networking page draws no "vid" column
    And the zone "web-1" of an interface opens "/hosts/3/machines/web-1"

  Scenario: Interfaces: the zone of an interface is plain text on a host whose row lists no `machines`
    Given the host answers the hosts fixture
    And the host answers the hosts-overview fixture
    And the host answers the hosts-networking fixture
    And the host answers the hosts-networking-plain fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/3/network/interfaces"
    Then the "interfaces" table of the networking page lists 3 rows
    And the "interfaces" table of the networking page draws the "zone" column
    And the zone "web-1" of an interface is plain text

  Scenario: Interfaces: every interface is listed once, the newest row of each where the agent answers the rows of several scans
    Given the host answers the hosts fixture
    And the host answers the hosts-overview fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/3/network/interfaces"
    Then I see "vnic0"
    And the "interfaces" table of the networking page lists 3 rows

  Scenario: Interfaces: the interfaces on hyperweaver-agent, the MAC address drawn and no speed, VLAN or zone while no row carries one
    Given the host answers the hosts fixture
    And the host answers the hosts-overview fixture
    And the host answers the hosts-networking fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/1/network/interfaces"
    Then the "interfaces" table of the networking page lists 2 rows
    And the "interfaces" table of the networking page draws the "macaddress" column
    And the "interfaces" table of the networking page draws no "speed" column
    And the "interfaces" table of the networking page draws no "vid" column
    And the "interfaces" table of the networking page draws no "zone" column
    And I see "Ethernet"
    And I see "08:00:27:4f:1a:01"

  Scenario: Interfaces: a header sorts its table and the heading's button drops the sort, hyperweaver-ui's reset
    Given the host answers the hosts fixture
    And the host answers the hosts-overview fixture
    And the host answers the hosts-networking fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/3/network/interfaces"
    Then the first row of the "interfaces" table of the networking page reads "igb0"
    When I sort the "interfaces" table of the networking page by "link"
    And I sort the "interfaces" table of the networking page by "link"
    Then the first row of the "interfaces" table of the networking page reads "vnic0"
    When I add "state" to the sort of the "interfaces" table of the networking page
    Then the "interfaces" table of the networking page marks a sort by several columns
    When I reset the sort of the "interfaces" table of the networking page
    Then the first row of the "interfaces" table of the networking page reads "igb0"

  Scenario: Bandwidth: the bandwidth opens on the busiest interface and its heading's button drops a sort a person chose
    Given the host answers the hosts fixture
    And the host answers the hosts-overview fixture
    And the host answers the hosts-networking fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/3/network/bandwidth"
    Then the first row of the "bandwidth" table of the networking page reads "vnic0"
    When I sort the "bandwidth" table of the networking page by "link"
    Then the first row of the "bandwidth" table of the networking page reads "igb0"
    When I reset the sort of the "bandwidth" table of the networking page
    Then the first row of the "bandwidth" table of the networking page reads "vnic0"

  Scenario: Bandwidth: the bandwidth, the newest sample held of each interface from the one read of the usage, the packets drawn where a sample carries the deltas
    Given the host answers the hosts fixture
    And the host answers the hosts-overview fixture
    And the host answers the hosts-networking fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/3/network/bandwidth"
    Then the "bandwidth" table of the networking page lists 2 rows
    And the "bandwidth" table of the networking page draws the "rxPackets" column
    And the "bandwidth" table of the networking page draws the "txPackets" column
    And I see "18.00 Mbps"
    And I see "32.40 Mbps"
    And the host was sent GET to "/api/agents/3/monitoring/network/usage" 1 times

  Scenario: Bandwidth: the bandwidth on hyperweaver-agent, no packets column while no sample carries the deltas
    Given the host answers the hosts fixture
    And the host answers the hosts-overview fixture
    And the host answers the hosts-networking fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/1/network/bandwidth"
    Then the "bandwidth" table of the networking page lists 2 rows
    And the "bandwidth" table of the networking page draws the "total" column
    And the "bandwidth" table of the networking page draws no "rxPackets" column
    And the "bandwidth" table of the networking page draws no "txPackets" column
    And I see "5.75 Mbps"
    And I see "0 bps"

  Scenario: Network pages: every section of each page folds and the fold is kept over a reload
    Given the host answers the hosts fixture
    And the host answers the hosts-overview fixture
    And the host answers the hosts-networking fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/3/network/interfaces"
    Then the "summary" section of the networking page is open
    When I fold the "summary" section of the networking page
    And I fold the "interfaces" section of the networking page
    Then the "summary" section of the networking page is folded
    And the "interfaces" section of the networking page is folded
    When I load the page again
    Then the "summary" section of the networking page is folded
    When I open "/hosts/3/network/addresses"
    Then the "addresses" table of the networking page lists 4 rows
    When I fold the "addresses" section of the networking page
    Then the "addresses" section of the networking page is folded
    When I load the page again
    Then the "addresses" section of the networking page is folded
    When I fold the "addresses" section of the networking page
    Then the "addresses" table of the networking page lists 4 rows
    When I open "/hosts/3/network/routes"
    And I fold the "routes" section of the networking page
    Then the "routes" section of the networking page is folded
    When I open "/hosts/3/network/bandwidth"
    And I fold the "bandwidth" section of the networking page
    And I fold the "charts" section of the networking page
    Then the "bandwidth" section of the networking page is folded
    And the "charts" section of the networking page is folded
    When I load the page again
    Then the "charts" section of the networking page is folded

  Scenario: Bandwidth: the charts, the three that draw every interface together and one an interface, all from the one read of the usage
    Given the host answers the hosts fixture
    And the host answers the hosts-overview fixture
    And the host answers the hosts-networking fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/3/network/bandwidth"
    Then the host page draws the "network-rx" chart
    And the host page draws the "network-tx" chart
    And the host page draws the "network-total" chart
    And the host page draws the "interface:igb0" chart
    And the host page draws the "interface:vnic0" chart
    And the networking page draws 2 interface charts
    And the "network-rx" chart says nothing of one sample
    And the host was sent GET to "/api/agents/3/monitoring/network/usage" 1 times

  Scenario: Bandwidth: the order of the interface charts, the busiest first until a person picks another, and nothing is read for it
    Given the host answers the hosts fixture
    And the host answers the hosts-overview fixture
    And the host answers the hosts-networking fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/3/network/bandwidth"
    Then the first interface chart is "vnic0"
    When I order the interface charts by "name"
    Then the first interface chart is "igb0"
    When I order the interface charts by "tx"
    Then the first interface chart is "vnic0"
    When I order the interface charts by "rx"
    Then the first interface chart is "igb0"
    And the host was sent GET to "/api/agents/3/monitoring/network/usage" 1 times

  Scenario: Bandwidth: the window of the host's series in the page's heading, every sample of the window, a change of the window reads the browser's store and asks the agent once for the span it lacks
    Given the host answers the hosts fixture
    And the host answers the hosts-overview fixture
    And the host answers the hosts-networking fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    And the browser records its requests
    When I open "/hosts/3/network/bandwidth"
    Then the host page draws the "network-total" chart
    And the host was asked "/api/agents/3/monitoring/network/usage" with "per_interface" as "true"
    When I pick the networking chart window "1hour"
    Then the host was sent GET to "/api/agents/3/monitoring/network/usage" 2 times

  Scenario: Bandwidth: the expand button opens a chart in the expanded dialog
    Given the host answers the hosts fixture
    And the host answers the hosts-overview fixture
    And the host answers the hosts-networking fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/3/network/bandwidth"
    Then the host page draws the "interface:igb0" chart
    When I expand the "interface:igb0" chart
    Then the expanded chart draws

  Scenario: Bandwidth: an agent that keeps no history draws the one sample it read and says so
    Given the host answers the hosts fixture
    And the host answers the hosts-overview fixture
    And the host answers the hosts-networking fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/1/network/bandwidth"
    Then the host page draws the "network-rx" chart
    And the "network-rx" chart says it draws one sample

  Scenario: Bandwidth: nothing reads on a clock, a network-sample event of the `monitoring` topic adds to the charts and to the bandwidth
    Given the host answers the hosts fixture
    And the host answers the hosts-overview fixture
    And the host answers the hosts-networking fixture
    And the host answers the hosts-overview-events fixture
    And the stream answers the networking network-sample frames
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/1/network/bandwidth"
    Then the host page draws the "network-rx" chart
    And the "network-rx" chart says nothing of one sample
    And I see "7.60 Mbps"

  Scenario: Interfaces: one copy per host, the overview reads no interfaces, its View all opens the page which reads them once, and the usage the overview read is not read again
    Given the host answers the hosts fixture
    And the host answers the hosts-overview fixture
    And the host answers the hosts-networking fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/3"
    Then the host page draws the "interfaces" panel
    And the host page draws the "network" chart
    And the host was sent GET to "/api/agents/3/monitoring/network/usage" 1 times
    And the host was not sent GET to "/api/agents/3/monitoring/network/interfaces"
    When I follow the overview's networking link
    Then the path is "/hosts/3/network/interfaces"
    And the host row "interfaces" is the active one
    And the "interfaces" table of the networking page lists 3 rows
    And the host was sent GET to "/api/agents/3/monitoring/network/interfaces" 1 times
    When I follow the host row "bandwidth"
    Then the "bandwidth" table of the networking page lists 2 rows
    And the host was sent GET to "/api/agents/3/monitoring/network/usage" 1 times

  Scenario: Interfaces: the overview's View all leads to the page the row offers, the row the column draws too, on a host that lists `monitoring` alone
    Given the host answers the hosts fixture
    And the host answers the hosts-overview fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/3"
    Then the host page draws the "interfaces" panel
    And the overview's networking link opens "/hosts/3/network/interfaces"
    And the host column draws the "interfaces" row to "/hosts/3/network/interfaces"
    And the host column draws no "links" row

  Scenario: Network pages: Refresh reads again every answer held of the host and the series the pages drew
    Given the host answers the hosts fixture
    And the host answers the hosts-overview fixture
    And the host answers the hosts-networking fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/3/network/addresses"
    Then the "addresses" table of the networking page lists 4 rows
    When I follow the host row "routes"
    Then the "routes" table of the networking page lists 3 rows
    When I follow the host row "interfaces"
    Then the "interfaces" table of the networking page lists 3 rows
    When I follow the host row "bandwidth"
    Then the "bandwidth" table of the networking page lists 2 rows
    And the host was sent GET to "/api/agents/3/monitoring/network/ipaddresses" 1 times
    And the host was sent GET to "/api/agents/3/monitoring/network/routes" 1 times
    And the host was sent GET to "/api/agents/3/monitoring/network/interfaces" 1 times
    And the host was sent GET to "/api/agents/3/monitoring/network/usage" 1 times
    When I click "Refresh"
    Then the host was sent GET to "/api/agents/3/monitoring/network/ipaddresses" 2 times
    And the host was sent GET to "/api/agents/3/monitoring/network/routes" 2 times
    And the host was sent GET to "/api/agents/3/monitoring/network/interfaces" 2 times
    And the host was sent GET to "/api/agents/3/monitoring/network/usage" 2 times

  Scenario: Network pages: the one search narrows the table of each page
    Given the host answers the hosts fixture
    And the host answers the hosts-overview fixture
    And the host answers the hosts-networking fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/3/network/interfaces"
    Then the "interfaces" table of the networking page lists 3 rows
    When I press "Control+k"
    And I search the networking page for "vnic0"
    Then the "interfaces" table of the networking page lists 1 rows
    When I open "/hosts/3/network/addresses"
    Then the "addresses" table of the networking page lists 4 rows
    When I press "Control+k"
    And I search the networking page for "vnic0"
    Then the "addresses" table of the networking page lists 1 rows

  Scenario: Network pages: the one search narrows the routes and the bandwidth tables
    Given the host answers the hosts fixture
    And the host answers the hosts-overview fixture
    And the host answers the hosts-networking fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/3/network/routes"
    Then the "routes" table of the networking page lists 3 rows
    When I press "Control+k"
    And I search the networking page for "vnic0"
    Then the "routes" table of the networking page lists 1 rows
    When I open "/hosts/3/network/bandwidth"
    Then the "bandwidth" table of the networking page lists 2 rows
    When I press "Control+k"
    And I search the networking page for "vnic0"
    Then the "bandwidth" table of the networking page lists 1 rows

  Scenario: Addresses: a filter group of one table narrows that table alone and a table it leaves no row of says so
    Given the host answers the hosts fixture
    And the host answers the hosts-overview fixture
    And the host answers the hosts-networking fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/3/network/addresses"
    Then the "addresses" table of the networking page lists 4 rows
    When I press "Control+k"
    And I open the filter panel
    And I toggle the filter pill "v6"
    Then the "addresses" table of the networking page lists 1 rows
    And I see "fe80::a00:27ff:fe4f:3c01"
    When I toggle the filter pill "tentative"
    Then the "addresses" table of the networking page says "filtered"
    When I open "/hosts/3/network/routes"
    Then the "routes" table of the networking page lists 3 rows
    When I open "/hosts/3/network/interfaces"
    Then the "interfaces" table of the networking page lists 3 rows

  Scenario: Addresses: a column hidden through its table's Columns group stays hidden over a reload
    Given the host answers the hosts fixture
    And the host answers the hosts-overview fixture
    And the host answers the hosts-networking fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/3/network/addresses"
    Then the "addresses" table of the networking page draws the "address" column
    When I press "Control+k"
    And I open the filter panel
    And I toggle column 2 of the Columns group of the "addresses" table
    Then the "addresses" table of the networking page draws no "address" column
    And the "addresses" table of the networking page draws the "prefix" column
    When I load the page again
    Then the "addresses" table of the networking page lists 4 rows
    And the "addresses" table of the networking page draws no "address" column
    When I open "/hosts/3/network/routes"
    Then the "routes" table of the networking page draws the "destination" column

  Scenario: Interfaces: the Controls menu draws the host actions on the Interfaces route
    Given the host answers the hosts fixture
    And the host answers the hosts-overview fixture
    And the host answers the hosts-networking fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/3/network/interfaces"
    Then the networking page draws its frame
    And the host controls toggle is "Host actions"

  Scenario: Network pages: on the hyperweaver-agent role every read is sent at the agent's own /api path, the address drawn from `addr`, and the routes are not asked for
    Given the host answers the agent fixture
    And the host answers the agent-overview fixture
    And the host answers the agent-networking fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/self/network/addresses"
    Then the "addresses" table of the networking page lists 3 rows
    And the "addresses" table of the networking page draws the "address" column
    And I see "10.0.0.21"
    And the host column draws no "routes" row
    When I follow the host row "interfaces"
    Then the "interfaces" table of the networking page lists 2 rows
    And I see "eth0"
    When I follow the host row "bandwidth"
    Then the "bandwidth" table of the networking page lists 1 rows
    When I open "/hosts/self/network/routes"
    Then the networking page draws the not-available stub
    And the host was sent GET to "/api/monitoring/network/ipaddresses"
    And the host was sent GET to "/api/monitoring/network/interfaces"
    And the host was sent GET to "/api/monitoring/network/usage"
    And the host was not sent GET to "/api/monitoring/network/routes"
    And the host was not sent GET to "/api/agents/self/monitoring/network/ipaddresses"

  Scenario: Network pages: on the zoneweaver-agent role the four reads are sent at the agent's own /api path
    Given the host answers the zones fixture
    And the host answers the zones-networking fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/self/network/addresses"
    Then the "addresses" table of the networking page lists 4 rows
    When I follow the host row "routes"
    Then the "routes" table of the networking page lists 3 rows
    When I follow the host row "bandwidth"
    Then the "bandwidth" table of the networking page lists 2 rows
    When I follow the host row "interfaces"
    Then the "interfaces" table of the networking page lists 3 rows
    And the zone "web-1" of an interface opens "/hosts/self/machines/web-1"
    And the host was sent GET to "/api/monitoring/network/ipaddresses"
    And the host was sent GET to "/api/monitoring/network/routes"
    And the host was not sent GET to "/api/agents/self/monitoring/network/routes"
