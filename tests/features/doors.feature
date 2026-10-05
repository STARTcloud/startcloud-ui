Feature: doors

  Scenario: Host pages: the column beside the page draws one row a page the host's row offers, grouped, the row of the route active, on the server role
    Given the host answers the hosts fixture
    And the host answers the hosts-overview fixture
    And the host answers the hosts-networking fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/3"
    Then the host column draws the groups "network, storage, provisioning, agent"
    And the host column draws the rows "overview, machines, interfaces, topology, addresses, routes, bandwidth, links, hostname, dns, pools, snapshots, arc, disks, recipes, provisioning-network, orchestration, api-keys, database, update"
    And the host column draws the "overview" row to "/hosts/3"
    And the host column draws the "machines" row to "/hosts/3/machines"
    And the host column draws the "interfaces" row to "/hosts/3/network/interfaces"
    And the host column draws the "links" row to "/hosts/3/network/links"
    And the host column draws the "pools" row to "/hosts/3/storage/pools"
    And the host column draws the "database" row to "/hosts/3/agent/database"
    And the host row "overview" is the active one
    And the host column draws no key of hyperweaver-ui in place of its text
    And the page draws no key of hyperweaver-ui in place of its text
    When I follow the host row "interfaces"
    Then the path is "/hosts/3/network/interfaces"
    And the networking page draws its frame
    And the host row "interfaces" is the active one
    When I follow the host row "overview"
    Then the path is "/hosts/3"
    And the host row "overview" is the active one

  Scenario: Host pages: the column's Machines row opens the machines of the host
    Given the host answers the hosts fixture
    And the host answers the hosts-overview fixture
    And the host answers the hosts-networking fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/1"
    Then the host column draws 12 page rows
    And the host column draws the groups "network, provisioning, agent"
    When I follow the host row "machines"
    Then the path is "/hosts/1/machines"
    And the host row "machines" is the active one

  Scenario: Host pages: a host whose row lists no token of the Links page draws no row, no tree row and no right-click row for it
    Given the host answers the hosts fixture
    And the host answers the hosts-overview fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/3"
    Then the host column draws the rows "overview, machines, interfaces, topology, addresses, bandwidth, pools, snapshots, arc, disks, recipes, provisioning-network, orchestration, api-keys, database, update"
    And the host column draws no "links" row
    And the host column draws no "system" group
    When I right-click the tree node "Zones"
    Then the tree menu offers "overview"
    And the tree menu offers "machines"
    And the tree menu offers "interfaces"
    And the tree menu offers no "links"

  Scenario: Host pages: a host that offers the Overview alone draws the column with the Overview alone, and its one right-click page row is the Overview's
    Given the host answers the hosts fixture
    And the host answers the hosts-doors fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/5"
    Then I see "Plain"
    And the host column draws 1 page rows
    And the host column draws the groups ""
    And the host row "overview" is the active one
    When I right-click the tree node "Plain"
    Then the tree menu offers "overview"
    And the tree menu offers no "machines"
    And the tree menu offers no "interfaces"
    And the tree menu offers no "database"

  Scenario: Host pages: a host that lists the address tokens and no `monitoring` reaches the Addresses page by its row, with no Interfaces row and no View all to lead there
    Given the host answers the hosts fixture
    And the host answers the hosts-overview fixture
    And the host answers the hosts-networking fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/4"
    Then I see "Bare"
    And the host page draws no "interfaces" panel
    And the host column draws no "interfaces" row
    And the host column draws the "addresses" row to "/hosts/4/network/addresses"
    And the host column draws no "storage" group
    When I follow the host row "addresses"
    Then the path is "/hosts/4/network/addresses"
    And the networking page draws its frame
    And the host row "addresses" is the active one

  Scenario: Host pages: the sidebar tree lists a host's machines alone under its node, hyperweaver-ui's shape, and the column opens each page
    Given the host answers the hosts fixture
    And the host answers the hosts-overview fixture
    And the host answers the hosts-networking fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/3/network/interfaces"
    Then the tree draws 0 page rows under the tree node "Zones"
    And the tree draws 2 machine rows under the tree node "Zones"
    When I follow the host row "machines"
    Then the path is "/hosts/3/machines"
    When I follow the host row "links"
    Then the path is "/hosts/3/network/links"
    And the section page "links" draws
    When I follow the host row "pools"
    Then the path is "/hosts/3/storage/pools"
    And the section page "pools" draws
    When I follow the host row "orchestration"
    Then the path is "/hosts/3/provisioning/orchestration"
    And the section page "orchestration" draws
    When I follow the host row "overview"
    Then the path is "/hosts/3"

  Scenario: Host pages: the host node's right-click menu draws one row a page from the grouped list and the row opens the page
    Given the host answers the hosts fixture
    And the host answers the hosts-overview fixture
    And the host answers the hosts-networking fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/1/machines/dev-1"
    And I right-click the tree node "Zones"
    Then the tree menu offers "overview"
    And the tree menu offers "machines"
    And the tree menu offers "interfaces"
    And the tree menu offers "links"
    And the tree menu offers "pools"
    And the tree menu offers "orchestration"
    And the tree menu offers "api-keys"
    And the tree menu offers no "services"
    When I pick the tree menu row "links"
    Then the path is "/hosts/3/network/links"
    And the section page "links" draws
    And the host row "links" is the active one

  Scenario: Host pages: the Controls menu's View host details opens the host's Overview from another page of the host
    Given the host answers the hosts fixture
    And the host answers the hosts-overview fixture
    And the host answers the hosts-networking fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/3/network/interfaces"
    And I click "Host actions"
    Then the Controls menu opens the host overview at "/hosts/3"

  Scenario: Host pages: a parent row folds with its caret, the fold is kept over a reload, and a deep link into a child opens its parent
    Given the host answers the hosts fixture
    And the host answers the hosts-overview fixture
    And the host answers the hosts-networking fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/3"
    Then the host group "storage" is open
    And the host column draws the "pools" row to "/hosts/3/storage/pools"
    When I fold the host group "storage"
    And I fold the host group "provisioning"
    Then the host group "storage" is folded
    And the host group "provisioning" is folded
    And the host column draws no "pools" row
    And the host column draws no "orchestration" row
    And the host group "network" is open
    When I load the page again
    Then the host group "storage" is folded
    And the host group "provisioning" is folded
    And the host group "network" is open
    When I open "/hosts/3/provisioning/orchestration"
    Then the host group "provisioning" is open
    And the host row "orchestration" is the active one
    And the host group "storage" is folded
    When I fold the host group "storage"
    Then the host group "storage" is open
    And the host column draws the "pools" row to "/hosts/3/storage/pools"

  Scenario: Host pages: the chevron in the column's top row folds it to a rail of glyphs, kept over a reload, and opens it again; the right edge resizes it
    Given the host answers the hosts fixture
    And the host answers the hosts-overview fixture
    And the host answers the hosts-networking fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/3"
    Then the host column is open
    And the host column draws its resize handle
    When I collapse the host column
    Then the host column is a rail
    And the host column draws 20 page rows
    And the host column draws the "links" row to "/hosts/3/network/links"
    When I load the page again
    Then the host column is a rail
    When I follow the host row "links"
    Then the path is "/hosts/3/network/links"
    And the host row "links" is the active one
    When I expand the host column
    Then the host column is open
    And the host group "network" is open
    And the host row "links" is the active one

  Scenario: Host pages: on the hyperweaver-agent role the column draws the one serving agent's rows
    Given the host answers the agent fixture
    And the host answers the agent-overview fixture
    And the host answers the agent-networking fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/self"
    Then the host column draws 12 page rows
    And the host column draws the "interfaces" row to "/hosts/self/network/interfaces"
    And the host column draws the "spaces" row to "/hosts/self/network/spaces"
    And the host column draws no "links" row
    And the host row "overview" is the active one
    When I follow the host row "interfaces"
    Then the path is "/hosts/self/network/interfaces"
    And the tree draws 0 page rows under the tree node "lab-1"
    When I right-click the tree node "lab-1"
    Then the tree menu offers "interfaces"
    And the tree menu offers "spaces"
    When I pick the tree menu row "machines"
    Then the path is "/hosts/self/machines"

  Scenario: Host pages: on the hyperweaver-agent role a host that lists no token of the Spaces page draws no door to it
    Given the host answers the agent fixture
    And the host answers the agent-overview fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/self"
    Then the host column draws 11 page rows
    And the host column draws no "spaces" row
    When I right-click the tree node "lab-1"
    Then the tree menu offers "overview"
    And the tree menu offers "interfaces"
    And the tree menu offers no "spaces"

  Scenario: Host pages: on the zoneweaver-agent role the column draws the one serving agent's rows
    Given the host answers the zones fixture
    And the host answers the zones-networking fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/self"
    Then the host column draws 15 page rows
    And the host column draws the "machines" row to "/hosts/self/machines"
    And the host column draws the "interfaces" row to "/hosts/self/network/interfaces"
    And the host column draws the "links" row to "/hosts/self/network/links"
    And the host column draws the "runlevel" row to "/hosts/self/system/runlevel"
    When I follow the host row "interfaces"
    Then the path is "/hosts/self/network/interfaces"
    And the host row "interfaces" is the active one
    And the tree draws 0 page rows under the tree node "zone-1"
    When I right-click the tree node "zone-1"
    Then the tree menu offers "links"
    When I pick the tree menu row "overview"
    Then the path is "/hosts/self"

  Scenario: Host pages: on the zoneweaver-agent role a host that lists no token of the Network pages draws no door to them
    Given the host answers the zones fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/self"
    Then the host column draws 7 page rows
    And the host column draws no "interfaces" row
    And the host column draws no "network" group
    When I right-click the tree node "zone-1"
    Then the tree menu offers "overview"
    And the tree menu offers no "interfaces"
    And the tree menu offers no "links"

  Scenario: Organization console: the tab strip draws as it did, a button a tab, the count of the join requests on its tab and the picked tab active
    Given the host answers the org-console fixture
    And the browser holds "user" as "{\"id\":42,\"username\":\"mark\",\"access_token\":\"t\",\"organizations\":[{\"uuid\":\"0d6b7e2a-1111-4c0a-9a1e-000000000001\",\"name\":\"acme\",\"display_name\":\"Acme\",\"roles\":[\"ADMIN\"],\"primary\":true,\"personal\":false,\"logo_url\":null,\"email_hash\":\"\"}]}"
    When I open "/org-console"
    Then the console tab strip draws 3 tabs as buttons
    And the console tab "organization" is the active one
    And the console tab "joinRequests" carries the count 2
    And the console tab "organization" carries no count
    And the console tab "invitations" carries no count
    When I pick the console tab "joinRequests"
    Then the console tab "joinRequests" is the active one
    And I see "ada"
