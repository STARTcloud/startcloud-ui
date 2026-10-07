Feature: network path

  Scenario: Network path: a VirtualBox machine draws its adapters in their order, the NAT adapter ending at its switch and the bridged one over the interface the agent joins it to, and no wire crosses another
    Given the host answers the hosts fixture
    And the host answers the hosts-network-path fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/1/machines/8617--switchboard.m4kr.net"
    Then the machine page draws the "machine-topology" panel
    And the network path lists the vNICs "adapter 1, adapter 2"
    And the network path draws the hop "switch:nat"
    And the network path draws the hop "uplink:Intel(R) 82599 10 Gigabit Dual Port Network Connection"
    And the network path ends 1 path at its switch
    And no wire of the network path crosses another
    And the host was sent GET to "/api/agents/1/monitoring/machines/usage"

  Scenario: Network path: the rail fits a narrow card at the smaller scale, the chips compact and nothing scrolling sideways
    Given the host answers the hosts fixture
    And the host answers the hosts-network-path fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/1/machines/8617--switchboard.m4kr.net"
    Then the machine page draws the "machine-topology" panel
    When the network path card is 360 wide
    Then the network path is drawn "small"
    And the network path draws 5 hops
    And no chip of the network path is wider than 276
    And the network path fits its card
    And the network path lists the vNICs "adapter 1, adapter 2"

  Scenario: Network path: the busiest uplink of a thirteen-net zone carries the warning ring and its percent, the other none, its twelve VLANs on neighbouring rows and its aggregate's members to its right, the down one dashed
    Given the host answers the hosts fixture
    And the host answers the hosts-network-path fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/3/machines/4001--fw-os-n1.home.m4kr.net"
    Then the machine page draws the "machine-topology" panel
    And the network path draws 30 hops
    And the hop "uplink:aggr0" carries the busiest ring
    And the hop "uplink:ixgbe0" carries no busiest ring
    And the network path draws the hop "member:aggr0:ixgbe1"
    And the network path draws the hop "member:aggr0:ixgbe2"
    And the network path draws the member wire "uplink:aggr0>member:aggr0:ixgbe2" down
    And no wire of the network path crosses another

  Scenario: Network path: a card about 800 wide with an aggregate's members turns compact to fit and nothing scrolls sideways
    Given the host answers the hosts fixture
    And the host answers the hosts-network-path fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/3/machines/4001--fw-os-n1.home.m4kr.net"
    Then the machine page draws the "machine-topology" panel
    When the network path card is 800 wide
    Then the network path is drawn "compact"
    And the network path draws the hop "member:aggr0:ixgbe1"
    And the network path fits its card

  Scenario: Network path: a narrow card folds an aggregate's members into its chip as their state dots
    Given the host answers the hosts fixture
    And the host answers the hosts-network-path fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/3/machines/4001--fw-os-n1.home.m4kr.net"
    Then the machine page draws the "machine-topology" panel
    When the network path card is 500 wide
    Then the network path is drawn "fold"
    And the hop "uplink:aggr0" shows its member dots
    And the network path hides the hop "member:aggr0:ixgbe1"
    And the network path fits its card

  Scenario: Network path: a click on a hop opens the expanded chart dialog over the series the page holds, its facts under the chart, Export offered and nothing asked of the host
    Given the host answers the hosts fixture
    And the host answers the hosts-network-path fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/3/machines/4001--fw-os-n1.home.m4kr.net"
    Then the network path draws the hop "uplink:aggr0"
    And the host was sent GET to "/api/agents/3/monitoring/network/usage"
    When I note the reads the host was sent
    And I open the hop "uplink:aggr0"
    Then the hop dialog draws the fact "speed"
    And the hop dialog draws the fact "mtu"
    And the expanded chart offers CSV and PNG export
    And the host was sent no GET to "/api/agents/3/monitoring/network/usage" since the note
    And the host was sent no GET to "/api/agents/3/network/vnics" since the note
    When I click the chart dialog's backdrop
    Then no chart dialog is open

  Scenario: Network path: a click on a vNIC pins its stream until the chip under the rail clears it
    Given the host answers the hosts fixture
    And the host answers the hosts-network-path fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/3/machines/4001--fw-os-n1.home.m4kr.net"
    And I open the hop "vnic:vnice3_4001_0"
    Then the network path shows "vnic:vnice3_4001_0" alone
    When I clear the pinned stream
    Then the network path shows every stream
