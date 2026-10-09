Feature: networking writes

  Scenario: Network pages: each row and each section behind the tokens its read names, a zoneweaver-agent host draws the Links, the Hostname, the Hosts file and the DNS rows and no Spaces row, the link families on Links, the hostname on Hostname, the hosts file on Hosts file, the DNS on DNS, the addresses on Addresses
    Given the host answers the hosts fixture
    And the host answers the hosts-overview fixture
    And the host answers the hosts-networking fixture
    And the host answers the hosts-networking-writes fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/3/network/links"
    Then the section page "links" draws
    And the host column draws the "interfaces" row to "/hosts/3/network/interfaces"
    And the host column draws the "topology" row to "/hosts/3/network/topology"
    And the host column draws the "addresses" row to "/hosts/3/network/addresses"
    And the host column draws the "routes" row to "/hosts/3/network/routes"
    And the host column draws the "bandwidth" row to "/hosts/3/network/bandwidth"
    And the host column draws the "links" row to "/hosts/3/network/links"
    And the host column draws the "hostname" row to "/hosts/3/network/hostname"
    And the host column draws the "hosts-file" row to "/hosts/3/network/hosts-file"
    And the host column draws the "dns" row to "/hosts/3/network/dns"
    And the host column draws no "spaces" row
    And the networking page draws the "vnics" section
    And the networking page draws the "vlans" section
    And the networking page draws the "aggregates" section
    And the networking page draws the "bridges" section
    And the networking page draws the "etherstubs" section
    And the networking page draws no "spaces" section
    And the networking page draws no "hostname" section
    And the "vnics" section of the networking page lists 2 rows
    And the "vlans" section of the networking page lists 1 rows
    And the "bridges" section of the networking page lists 1 rows
    And the "etherstubs" section of the networking page lists 1 rows
    And the "aggregates" section of the networking page says "empty"
    And the host was sent GET to "/api/agents/3/network/vnics"
    And the host was not sent GET to "/api/agents/3/network/spaces"
    And the page draws no key of hyperweaver-ui in place of its text
    When I follow the host row "hostname"
    Then the section page "hostname" draws
    And the networking page draws the "hostname" section
    And the networking page draws no "vnics" section
    And the networking page draws no "hosts-file" section
    And the networking page draws no "dns" section
    When I follow the host row "hosts-file"
    Then the section page "hosts-file" draws
    And the networking page draws the "hosts-file" section
    And the networking page draws no "hostname" section
    And the host was sent GET to "/api/agents/3/system/hosts"
    When I follow the host row "dns"
    Then the section page "dns" draws
    And the networking page draws the "dns" section
    And the networking page draws no "hosts-file" section
    When I follow the host row "addresses"
    Then the networking page draws the "managed-addresses" section
    And the "managed-addresses" section of the networking page lists 3 rows
    And the host was sent GET to "/api/agents/3/network/addresses"

  Scenario: Network pages: a hyperweaver-agent host draws the Interfaces, Topology, Addresses, Bandwidth and Spaces rows alone, the addresses on Addresses, the spaces on Spaces, and asks for no link family
    Given the host answers the hosts fixture
    And the host answers the hosts-overview fixture
    And the host answers the hosts-networking fixture
    And the host answers the hosts-networking-writes fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/1/network/addresses"
    Then the networking page draws the "managed-addresses" section
    And the "managed-addresses" section of the networking page lists 4 rows
    And the host column draws the "interfaces" row to "/hosts/1/network/interfaces"
    And the host column draws the "topology" row to "/hosts/1/network/topology"
    And the host column draws the "addresses" row to "/hosts/1/network/addresses"
    And the host column draws the "bandwidth" row to "/hosts/1/network/bandwidth"
    And the host column draws the "spaces" row to "/hosts/1/network/spaces"
    And the host column draws no "routes" row
    And the host column draws no "links" row
    And the host column draws no "hostname" row
    And the host column draws no "hosts-file" row
    And the host column draws no "dns" row
    And the networking page draws no "vnics" section
    And the networking page draws no "spaces" section
    When I follow the host row "spaces"
    Then the section page "spaces" draws
    And the networking page draws the "spaces" section
    And the host was not sent GET to "/api/agents/1/network/vnics"
    And the host was not sent GET to "/api/agents/1/network/hostname"
    And the host was not sent GET to "/api/agents/1/system/dns"

  Scenario: Network pages: the one search narrows the page's lists with its read tables
    Given the host answers the hosts fixture
    And the host answers the hosts-overview fixture
    And the host answers the hosts-networking fixture
    And the host answers the hosts-networking-writes fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/3/network/links"
    Then the "vnics" section of the networking page lists 2 rows
    When I press "/"
    And I search the networking page for "vnic1"
    Then the "vnics" section of the networking page lists 1 rows
    And the "vlans" section of the networking page says "filtered"
    When I open "/hosts/3/network/addresses"
    Then the "managed-addresses" section of the networking page lists 3 rows
    When I press "/"
    And I search the networking page for "vnic1"
    Then the "managed-addresses" section of the networking page lists 1 rows

  Scenario: Links: a VNIC is created over POST network/vnics from the form dialog, the name suggested on the link, and deleted behind the typed confirmation
    Given the host answers the hosts fixture
    And the host answers the hosts-overview fixture
    And the host answers the hosts-networking fixture
    And the host answers the hosts-networking-writes fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/3/network/links"
    And I press the "vnics" section's "create-vnic" tool
    Then the "vnic-create" dialog is open
    When I send the open dialog
    Then the open dialog notes "problem"
    When I choose "igb0" in the field "vnic-create-link"
    And I type "vnic9" into the field "vnic-create-name"
    And I type "200" into the field "vnic-create-vlan"
    And I send the open dialog
    Then the host was sent POST to "/api/agents/3/network/vnics" carrying "name" as "vnic9"
    And the host was sent POST to "/api/agents/3/network/vnics" carrying "link" as "igb0"
    And the host was sent POST to "/api/agents/3/network/vnics" carrying "vlan_id" as "200"
    And the host was sent POST to "/api/agents/3/network/vnics" carrying "temporary" as "false"
    And the page raised 1 success notice
    And no dialog is open
    When I press "delete" on the "vnics" section row "vnic1"
    And I confirm the open dialog
    Then the host was sent DELETE to "/api/agents/3/network/vnics/vnic1"
    And the page raised 2 success notices

  Scenario: Links: a VNIC's details read GET network/vnics/{link} once and open the dialog
    Given the host answers the hosts fixture
    And the host answers the hosts-overview fixture
    And the host answers the hosts-networking fixture
    And the host answers the hosts-networking-writes fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/3/network/links"
    And I press "details" on the "vnics" section row "vnic0"
    Then the "vnic-details" dialog is open
    And the host was sent GET to "/api/agents/3/network/vnics/vnic0"
    And I see "Ethernet"

  Scenario: Links: a VLAN's name follows dladm's formula and the body carries no name while it matches
    Given the host answers the hosts fixture
    And the host answers the hosts-overview fixture
    And the host answers the hosts-networking fixture
    And the host answers the hosts-networking-writes fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/3/network/links"
    And I press the "vlans" section's "create-vlan" tool
    Then the "vlan-create" dialog is open
    When I type "200" into the field "vlan-create-vid"
    And I choose "igb0" in the field "vlan-create-link"
    Then the field "vlan-create-name" reads "igb200000"
    When I type "100" into the field "vlan-create-vid"
    Then the field "vlan-create-name" reads ""
    When I type "200" into the field "vlan-create-vid"
    And I send the open dialog
    Then the host was sent POST to "/api/agents/3/network/vlans" carrying "vid" as "200"
    And the host was sent POST to "/api/agents/3/network/vlans" carrying "link" as "igb0"
    And the host was sent POST to "/api/agents/3/network/vlans" carrying "name" as "undefined"
    And the page raised 1 success notice

  Scenario: Links: an etherstub is named the next free stub and created over POST network/etherstubs
    Given the host answers the hosts fixture
    And the host answers the hosts-overview fixture
    And the host answers the hosts-networking fixture
    And the host answers the hosts-networking-writes fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/3/network/links"
    And I press the "etherstubs" section's "create-etherstub" tool
    Then the "etherstub-create" dialog is open
    And the field "etherstub-name" reads "stub1"
    When I check the field "etherstub-temporary"
    And I send the open dialog
    Then the host was sent POST to "/api/agents/3/network/etherstubs" carrying "name" as "stub1"
    And the host was sent POST to "/api/agents/3/network/etherstubs" carrying "temporary" as "true"
    And the page raised 1 success notice

  Scenario: Links: a bridge carries the links picked one by one and is created over POST network/bridges
    Given the host answers the hosts fixture
    And the host answers the hosts-overview fixture
    And the host answers the hosts-networking fixture
    And the host answers the hosts-networking-writes fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/3/network/links"
    And I press the "bridges" section's "create-bridge" tool
    Then the "bridge-create" dialog is open
    When I type "bridge1" into the field "bridge-name"
    And I choose "igb0" in the field "bridge-link-select"
    And I press the open dialog's "add-link" tool
    And I choose "rstp" in the field "bridge-protection"
    And I send the open dialog
    Then the host was sent POST to "/api/agents/3/network/bridges" carrying "name" as "bridge1"
    And the host was sent POST to "/api/agents/3/network/bridges" carrying "protection" as "rstp"
    And the host was sent POST to "/api/agents/3/network/bridges" carrying "links" as "igb0"
    And the host was sent POST to "/api/agents/3/network/bridges" carrying "priority" as "32768"
    And the page raised 1 success notice

  Scenario: Links: an aggregate is refused while CDP runs and sent after the service is disabled through the one service action, its FMRI encoded
    Given the host answers the hosts fixture
    And the host answers the hosts-overview fixture
    And the host answers the hosts-networking fixture
    And the host answers the hosts-networking-writes fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/3/network/links"
    Then the networking page notes "cdp"
    And the host was sent GET to "/api/agents/3/services"
    When I press the "aggregates" section's "create-aggregate" tool
    Then the "aggregate-create" dialog is open
    And the field "aggregate-name" reads "aggr0"
    When I choose "igb0" in the field "aggregate-link-select"
    And I press the open dialog's "add-link" tool
    And I send the open dialog
    Then the open dialog notes "problem"
    And the host was not sent POST to "/api/agents/3/network/aggregates"
    When I check the field "aggregate-disable-cdp"
    And I choose "active" in the field "aggregate-lacp-mode"
    And I send the open dialog
    Then the host was sent POST to "/api/agents/3/services/action" carrying "action" as "disable"
    And the host was sent POST to "/api/agents/3/services/action" carrying "fmri" as "svc%3A%2Fnetwork%2Fcdp%3Adefault"
    And the host was sent POST to "/api/agents/3/network/aggregates" carrying "name" as "aggr0"
    And the host was sent POST to "/api/agents/3/network/aggregates" carrying "lacp_mode" as "active"
    And the host was sent POST to "/api/agents/3/network/aggregates" carrying "policy" as "L4"
    And the page raised 2 success notices

  Scenario: Addresses: an address is created over POST network/addresses with the address object named from the interface, enabled over its PUT and deleted behind the typed confirmation
    Given the host answers the hosts fixture
    And the host answers the hosts-overview fixture
    And the host answers the hosts-networking fixture
    And the host answers the hosts-networking-writes fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/3/network/addresses"
    Then the "managed-addresses" section row "vnic1/v4static" offers "enable"
    And the "managed-addresses" section row "vnic1/v4static" offers no "disable"
    And the "managed-addresses" section row "igb0/v4static" offers "disable"
    When I press the "managed-addresses" section's "create-address" tool
    Then the "address-create" dialog is open
    When I choose "vnic0" in the field "interface-select"
    Then the field "addrobj-input" reads "vnic0/v4static"
    When I type "10.0.0.50" into the field "address-input"
    And I choose "16" in the field "netmask-select"
    And I send the open dialog
    Then the host was sent POST to "/api/agents/3/network/addresses" carrying "addrobj" as "vnic0/v4static"
    And the host was sent POST to "/api/agents/3/network/addresses" carrying "address" as "10.0.0.50/16"
    And the host was sent POST to "/api/agents/3/network/addresses" carrying "interface" as "vnic0"
    And the host was sent POST to "/api/agents/3/network/addresses" carrying "type" as "static"
    And the page raised 1 success notice
    When I press "enable" on the "managed-addresses" section row "vnic1/v4static"
    Then the host was sent PUT to "/api/agents/3/network/addresses/vnic1%2Fv4static/enable"
    When I press "delete" on the "managed-addresses" section row "vnic1/v4static"
    And I confirm the open dialog
    Then the host was sent DELETE to "/api/agents/3/network/addresses/vnic1%2Fv4static"
    And the page raised 3 success notices

  Scenario: Addresses: on a VirtualBox host the disable of an address is behind its own confirmation and the delete of one of several under one object names the bare address
    Given the host answers the hosts fixture
    And the host answers the hosts-overview fixture
    And the host answers the hosts-networking fixture
    And the host answers the hosts-networking-writes fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    And the browser records its requests
    When I open "/hosts/1/network/addresses"
    Then the "managed-addresses" section of the networking page lists 4 rows
    When I press "disable" on the "managed-addresses" section row "10.0.0.11"
    Then the host was not sent PUT to "/api/agents/1/network/addresses/Ethernet%2Fv4/disable"
    When I confirm the open warning dialog
    Then the host was sent PUT to "/api/agents/1/network/addresses/Ethernet%2Fv4/disable"
    And the page raised 1 success notice
    And I see "taken down with it"
    When I press "delete" on the "managed-addresses" section row "10.0.0.12"
    And I confirm the open dialog
    Then the host was sent DELETE to "/api/agents/1/network/addresses/Ethernet%2Fv4"
    And the host was asked "/api/agents/1/network/addresses/Ethernet%2Fv4" with "address" as "10.0.0.12"
    And the host was asked "/api/agents/1/network/addresses/Ethernet%2Fv4" with "release" as "false"

  Scenario: Hostname: the hostname is written over PUT network/hostname with apply_immediately as the box says
    Given the host answers the hosts fixture
    And the host answers the hosts-overview fixture
    And the host answers the hosts-networking fixture
    And the host answers the hosts-networking-writes fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/3/network/hostname"
    Then the networking field "new-hostname-input" reads "zone-1"
    And I see "zone-1"
    When I fill the networking field "new-hostname-input" with "zone-9"
    And I press the "hostname" section's "change-hostname" tool
    Then the host was sent PUT to "/api/agents/3/network/hostname" carrying "hostname" as "zone-9"
    And the host was sent PUT to "/api/agents/3/network/hostname" carrying "apply_immediately" as "false"
    And the page raised 1 success notice
    And the host was sent GET to "/api/agents/3/network/hostname" 2 times

  Scenario: DNS: the DNS is written over PUT system/dns as the parsed members and, behind the switch, as the raw file
    Given the host answers the hosts fixture
    And the host answers the hosts-overview fixture
    And the host answers the hosts-networking fixture
    And the host answers the hosts-networking-writes fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/3/network/dns"
    Then the networking field "dns-domain" reads ""
    When I fill the networking field "dns-domain" with "lan"
    And I press the "dns" section's "save-dns" tool
    Then the host was sent PUT to "/api/agents/3/system/dns" carrying "domain" as "lan"
    And the host was sent PUT to "/api/agents/3/system/dns" carrying "nameservers" as "10.0.0.1,1.1.1.1"
    And the page raised 1 success notice
    When I switch the networking field "dns-raw-mode"
    And I fill the networking field "dns-raw" with "nameserver 9.9.9.9"
    And I press the "dns" section's "save-dns" tool
    Then the host was sent PUT to "/api/agents/3/system/dns" carrying "raw" as "nameserver 9.9.9.9"
    And the page raised 2 success notices

  Scenario: Hosts file: the hosts file lists its entries as rows and is written over PUT system/hosts as the raw file behind the switch
    Given the host answers the hosts fixture
    And the host answers the hosts-overview fixture
    And the host answers the hosts-networking fixture
    And the host answers the hosts-networking-writes fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/3/network/hosts-file"
    Then the "hosts-file" section of the networking page lists 2 rows
    And I see "/etc/inet/hosts"
    When I press the "hosts-file" section's "add-entry" tool
    Then the "hosts-file" section of the networking page lists 3 rows
    When I press "remove-entry" on row 3 of the "hosts-file" section
    Then the "hosts-file" section of the networking page lists 2 rows
    When I press the "hosts-file" section's "save-hosts" tool
    Then the host was sent PUT to "/api/agents/3/system/hosts" carrying "127.0.0.1" at "/entries/0/ip"
    And the host was sent PUT to "/api/agents/3/system/hosts" carrying "zone-1" at "/entries/1/hostnames/0"
    When I switch the networking field "hosts-raw-mode"
    And I fill the networking field "hosts-raw" with "127.0.0.1 localhost"
    And I press the "hosts-file" section's "save-hosts" tool
    Then the host was sent PUT to "/api/agents/3/system/hosts" carrying "raw" as "127.0.0.1 localhost"
    And the page raised 2 success notices

  Scenario: Spaces: the network spaces draw the families the platform carries, the NAT network is stopped, edited and the host-only interface deleted over their routes
    Given the host answers the hosts fixture
    And the host answers the hosts-overview fixture
    And the host answers the hosts-networking fixture
    And the host answers the hosts-networking-writes fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/1/network/spaces"
    Then the "spaces" section of the networking page lists 3 rows
    And the networking page notes "intnets"
    And the "spaces" section offers the "create-hostonly" tool
    And the "spaces" section offers the "create-natnetwork" tool
    And the "spaces" section offers no "create-hostonlynet" tool
    And the "spaces" section row "intnet" offers no "delete"
    When I press "stop" on the "spaces" section row "NatNetwork"
    Then the host was sent POST to "/api/agents/1/network/spaces/natnetwork/NatNetwork/stop"
    When I press "edit" on the "spaces" section row "NatNetwork"
    Then the "space-natnetwork" dialog is open
    And the field "hw-nat-cidr" reads "10.0.2.0/24"
    And I see "ssh"
    When I press the open dialog's "remove-forward" tool
    And I send the open dialog
    Then the host was sent PUT to "/api/agents/1/network/spaces/natnetwork/NatNetwork" carrying "cidr" as "10.0.2.0/24"
    And the host was sent PUT to "/api/agents/1/network/spaces/natnetwork/NatNetwork" carrying "remove_port_forwards" as "[object Object]"
    When I press "delete" on the "spaces" section row "vboxnet0"
    And I confirm the open dialog
    Then the host was sent DELETE to "/api/agents/1/network/spaces/hostonly/vboxnet0"
    And the page raised 3 success notices

  Scenario: Spaces: a host-only interface is created over POST network/spaces/hostonly with the address typed
    Given the host answers the hosts fixture
    And the host answers the hosts-overview fixture
    And the host answers the hosts-networking fixture
    And the host answers the hosts-networking-writes fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/1/network/spaces"
    And I press the "spaces" section's "create-hostonly" tool
    Then the "space-hostonly" dialog is open
    When I type "192.168.57.1" into the field "hw-hoif-ip"
    And I send the open dialog
    Then the host was sent POST to "/api/agents/1/network/spaces/hostonly" carrying "ip" as "192.168.57.1"
    And the host was sent POST to "/api/agents/1/network/spaces/hostonly" carrying "netmask" as "255.255.255.0"
    And the page raised 1 success notice
    And the host was sent GET to "/api/agents/1/network/spaces" 2 times

  Scenario: Spaces: a person who may not control hosts sees the spaces read only, the admin gate of every networking write
    Given the host answers the hosts fixture
    And the host answers the hosts-overview fixture
    And the host answers the hosts-networking fixture
    And the host answers the hosts-networking-writes fixture
    And the host answers the hosts-viewer fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"guest\",\"role\":\"viewer\",\"access_token\":\"t\"}"
    When I open "/hosts/1/network/spaces"
    Then the "spaces" section of the networking page lists 3 rows
    And the "spaces" section offers no "create-hostonly" tool
    And the "spaces" section row "NatNetwork" offers no "edit"
    When I open "/hosts/1/network/addresses"
    Then the "managed-addresses" section of the networking page lists 4 rows
    And the "managed-addresses" section offers no "create-address" tool
    And the "managed-addresses" section row "10.0.0.11" offers no "disable"

  Scenario: Network pages: the sections of Links fold under manage- and the fold is kept over a reload
    Given the host answers the hosts fixture
    And the host answers the hosts-overview fixture
    And the host answers the hosts-networking fixture
    And the host answers the hosts-networking-writes fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/3/network/links"
    Then the "vnics" section of the networking management is open
    When I fold the "vnics" section of the networking management
    Then the "vnics" section of the networking management is folded
    When I load the page again
    Then the "vnics" section of the networking management is folded
    When I fold the "vnics" section of the networking management
    Then the "vnics" section of the networking page lists 2 rows

  Scenario: Network pages: the section of Hostname folds under manage- and the fold is kept over a reload
    Given the host answers the hosts fixture
    And the host answers the hosts-overview fixture
    And the host answers the hosts-networking fixture
    And the host answers the hosts-networking-writes fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/3/network/hostname"
    Then the "hostname" section of the networking management is open
    When I fold the "hostname" section of the networking management
    Then the "hostname" section of the networking management is folded
    When I load the page again
    Then the "hostname" section of the networking management is folded

  Scenario: Network pages: the topology of Topology folds and the fold is kept over a reload
    Given the host answers the hosts fixture
    And the host answers the hosts-overview fixture
    And the host answers the hosts-networking fixture
    And the host answers the hosts-networking-writes fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/3/network/topology"
    Then the "topology" section of the networking management is open
    When I fold the "topology" section of the networking management
    And I load the page again
    Then the "topology" section of the networking management is folded

  Scenario: Networking topology: a zoneweaver-agent host draws its machines, its carriers and its networks from the copies the page holds, the feed pulse live from the usage series
    Given the host answers the hosts fixture
    And the host answers the hosts-overview fixture
    And the host answers the hosts-networking fixture
    And the host answers the hosts-networking-writes fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/3/network/topology"
    Then the networking page draws the "topology" section
    And the topology draws 3 consumers
    And the topology draws the consumer "web-1"
    And the topology draws the consumer "global"
    And the topology draws 2 carriers
    And the topology draws 2 networks
    And the topology draws the network "igb0|0"
    And the topology draws the network "igb0|100"
    And the topology draws 2 network chips
    And the topology pulse reads "live"
    And the topology offers the "scope-all" tool
    When I open the topology network "igb0|100"
    Then the topology drill panel is open
    When I press the topology's "close-drill" tool
    Then the topology drill panel is closed
    And the host was sent GET to "/api/agents/3/network/etherstubs" 1 times
    And the host was sent GET to "/api/agents/3/machines" 1 times

  Scenario: Networking topology: a VirtualBox host draws each machine's adapters from its detail against the spaces and reads the per-machine usage
    Given the host answers the hosts fixture
    And the host answers the hosts-overview fixture
    And the host answers the hosts-networking fixture
    And the host answers the hosts-networking-writes fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/1/network/topology"
    Then the topology draws 2 consumers
    And the topology draws 6 networks
    And the topology draws the network "bridged|Ethernet"
    And the topology draws the network "space|natnetwork|NatNetwork"
    And the topology draws the network "nat|shared"
    And the host was sent GET to "/api/agents/1/machines/dev-1"
    And the host was sent GET to "/api/agents/1/machines/dev-2"
    And the host was sent GET to "/api/agents/1/monitoring/machines/usage"

  Scenario: Links: a queued write's end on the tasks topic reads the networking answers again, never on a clock
    Given the host answers the hosts fixture
    And the host answers the hosts-overview fixture
    And the host answers the hosts-networking fixture
    And the host answers the hosts-networking-writes fixture
    And the host answers the hosts-overview-events fixture
    And the stream answers the networking vnic-created frames
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/3/network/links"
    Then the "vnics" section of the networking page lists 2 rows
    And the host was sent GET to "/api/agents/3/network/vnics" once more than to "/api/agents/3/services"

  Scenario: Network pages: on the zoneweaver-agent role the hostname is read at the agent's own path, a VNIC create is sent there and the notice opens the queued task
    Given the host answers the zones fixture
    And the host answers the zones-networking fixture
    And the host answers the zones-networking-writes fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/self/network/hostname"
    Then the networking page draws the "hostname" section
    And the networking page notes "mismatch"
    And the host was sent GET to "/api/network/hostname"
    When I follow the host row "links"
    Then the "vnics" section of the networking page lists 1 rows
    And the host was sent GET to "/api/network/vnics"
    And the host was not sent GET to "/api/agents/self/network/vnics"
    When I press the "vnics" section's "create-vnic" tool
    And I choose "igb0" in the field "vnic-create-link"
    And I type "vnic9" into the field "vnic-create-name"
    And I send the open dialog
    Then the host was sent POST to "/api/network/vnics" carrying "name" as "vnic9"
    And the page raised 1 success notice
    When I press the success notice's action
    Then the host was sent GET to "/api/tasks/b2000000-0000-4000-8000-000000000201"
    And I see "dladm create-vnic"
