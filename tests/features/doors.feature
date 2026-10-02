Feature: doors

  Scenario: Host pages: the tab row under the heading draws one tab a page the host's row offers, the tab of the route active, on the server role
    Given the host answers the hosts fixture
    And the host answers the hosts-overview fixture
    And the host answers the hosts-networking fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/3"
    Then the host tab row draws 6 tabs
    And the host tab row draws the "overview" tab to "/hosts/3"
    And the host tab row draws the "machines" tab to "/hosts/3/machines"
    And the host tab row draws the "manage" tab to "/hosts/3/manage"
    And the host tab row draws the "networking" tab to "/hosts/3/networking"
    And the host tab "overview" is the active one
    And the page draws no key of hyperweaver-ui in place of its text
    When I follow the host tab "networking"
    Then the path is "/hosts/3/networking"
    And the networking page draws its frame
    And the host tab "networking" is the active one
    When I follow the host tab "overview"
    Then the path is "/hosts/3"
    And the host tab "overview" is the active one

  Scenario: Host pages: the tab row opens the machines of the host
    Given the host answers the hosts fixture
    And the host answers the hosts-overview fixture
    And the host answers the hosts-networking fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/1"
    Then the host tab row draws 5 tabs
    When I follow the host tab "machines"
    Then the path is "/hosts/1/machines"

  Scenario: Host pages: a host whose row lists no token of the networking page draws no tab, no tree row and no right-click row for it
    Given the host answers the hosts fixture
    And the host answers the hosts-overview fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/3"
    Then the host tab row draws 5 tabs
    And the host tab row draws no "networking" tab
    When I right-click the tree node "Zones"
    Then the tree menu offers "overview"
    And the tree menu offers "machines"
    And the tree menu offers no "networking"

  Scenario: Host pages: a host that offers the Overview alone draws no tab row, and its one right-click page row is the Overview's
    Given the host answers the hosts fixture
    And the host answers the hosts-doors fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/5"
    Then I see "Plain"
    And the page draws no host tab row
    When I right-click the tree node "Plain"
    Then the tree menu offers "overview"
    And the tree menu offers no "machines"
    And the tree menu offers no "networking"

  Scenario: Host pages: a host that lists a token of the networking page and no `monitoring` reaches the page by its tab, with no View all to lead there
    Given the host answers the hosts fixture
    And the host answers the hosts-overview fixture
    And the host answers the hosts-networking fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/4"
    Then I see "Bare"
    And the host page draws no "interfaces" panel
    And the host tab row draws the "networking" tab to "/hosts/4/networking"
    When I follow the host tab "networking"
    Then the path is "/hosts/4/networking"
    And the networking page draws its frame
    And the host tab "networking" is the active one

  Scenario: Host pages: the sidebar tree lists a host's machines alone under its node, hyperweaver-ui's shape, and the tab row opens each page
    Given the host answers the hosts fixture
    And the host answers the hosts-overview fixture
    And the host answers the hosts-networking fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/3/networking"
    Then the tree draws 0 page rows under the tree node "Zones"
    And the tree draws 2 machine rows under the tree node "Zones"
    When I follow the host tab "machines"
    Then the path is "/hosts/3/machines"
    When I follow the host tab "networking"
    Then the path is "/hosts/3/networking"
    When I follow the host tab "manage"
    Then the path is "/hosts/3/manage"
    When I follow the host tab "overview"
    Then the path is "/hosts/3"

  Scenario: Host pages: the host node's right-click menu draws one row a page and the row opens the page
    Given the host answers the hosts fixture
    And the host answers the hosts-overview fixture
    And the host answers the hosts-networking fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/1/machines/dev-1"
    And I right-click the tree node "Zones"
    Then the tree menu offers "overview"
    And the tree menu offers "machines"
    And the tree menu offers "manage"
    And the tree menu offers "networking"
    When I pick the tree menu row "networking"
    Then the path is "/hosts/3/networking"
    And the networking page draws its frame

  Scenario: Host pages: the Controls menu's View host details opens the host's Overview from another page of the host
    Given the host answers the hosts fixture
    And the host answers the hosts-overview fixture
    And the host answers the hosts-networking fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/3/networking"
    And I click "Host actions"
    Then the Controls menu opens the host overview at "/hosts/3"

  Scenario: Host pages: on the hyperweaver-agent role the three doors draw for the one serving agent
    Given the host answers the agent fixture
    And the host answers the agent-overview fixture
    And the host answers the agent-networking fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/self"
    Then the host tab row draws 5 tabs
    And the host tab row draws the "networking" tab to "/hosts/self/networking"
    And the host tab "overview" is the active one
    When I follow the host tab "networking"
    Then the path is "/hosts/self/networking"
    And the tree draws 0 page rows under the tree node "lab-1"
    When I right-click the tree node "lab-1"
    Then the tree menu offers "networking"
    When I pick the tree menu row "machines"
    Then the path is "/hosts/self/machines"

  Scenario: Host pages: on the hyperweaver-agent role a host that lists no token of the networking page draws no door to it
    Given the host answers the agent fixture
    And the host answers the agent-overview fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/self"
    Then the host tab row draws 4 tabs
    And the host tab row draws no "networking" tab
    When I right-click the tree node "lab-1"
    Then the tree menu offers "overview"
    And the tree menu offers no "networking"

  Scenario: Host pages: on the zoneweaver-agent role the three doors draw for the one serving agent
    Given the host answers the zones fixture
    And the host answers the zones-networking fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/self"
    Then the host tab row draws 5 tabs
    And the host tab row draws the "machines" tab to "/hosts/self/machines"
    And the host tab row draws the "networking" tab to "/hosts/self/networking"
    When I follow the host tab "networking"
    Then the path is "/hosts/self/networking"
    And the host tab "networking" is the active one
    And the tree draws 0 page rows under the tree node "zone-1"
    When I right-click the tree node "zone-1"
    Then the tree menu offers "networking"
    When I pick the tree menu row "overview"
    Then the path is "/hosts/self"

  Scenario: Host pages: on the zoneweaver-agent role a host that lists no token of the networking page draws no door to it
    Given the host answers the zones fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/self"
    Then the host tab row draws 4 tabs
    And the host tab row draws no "networking" tab
    When I right-click the tree node "zone-1"
    Then the tree menu offers "overview"
    And the tree menu offers no "networking"

  Scenario: Organization console: the tab strip draws as it did, a button a tab, the count of the join requests on its tab and the picked tab active
    Given the host answers the org-console fixture
    And the browser holds "user" as "{\"id\":42,\"username\":\"mark\",\"access_token\":\"t\",\"organizations\":[{\"name\":\"acme\",\"role\":\"admin\",\"is_primary\":true}]}"
    When I open "/org-console"
    Then the console tab strip draws 3 tabs as buttons
    And the console tab "organization" is the active one
    And the console tab "joinRequests" carries the count 2
    And the console tab "organization" carries no count
    And the console tab "invitations" carries no count
    When I pick the console tab "joinRequests"
    Then the console tab "joinRequests" is the active one
    And I see "ada"
