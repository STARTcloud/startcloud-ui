Feature: agent-loop

  Scenario: Agent loop: a sign-out on the admin page after a tray sign-in lands once on the sign-in page, which stays, the claim of the page load answering it no more
    Given the host answers the agent-signins fixture
    And the page's navigations are watched
    When I open "/login#tray=tray-demo-token"
    Then the path is "/"
    And the chrome draws the account menu
    And the page navigated to "/login" 1 times
    When I open the account menu
    And I press the account menu's admin board
    Then the path is "/admin/config/app"
    When I sign out from the account menu
    Then the pathname is "/login"
    And the sign-in page draws the agent sign-ins
    And the browser holds no "apikey"
    And the page navigated to "/admin" 1 times
    And the page navigated to "/login" 2 times
    And the pathname is "/login"
    And the host was sent POST to "/api/auth/tray-claim" 1 times

  Scenario: Agent loop: a host that lists no favorites is never asked for them
    Given the host answers the agent-signins fixture
    And the browser holds "apikey" as "{\"key\":\"hw_seed_0001_initial\",\"profile\":{\"id\":12,\"name\":\"Mark\",\"role\":\"admin\"}}"
    When I open "/"
    Then the chrome draws the account menu
    And the host was sent GET to "/api/api-keys/info" 1 times
    And the host was not sent GET to "/api/user/favorites"

  Scenario: Agent loop: the hosts home and the host page send a visitor to sign in with the page as the return path and read nothing
    Given the host answers the agent-signins fixture
    When I open "/"
    Then the path is "/login?returnTo=%2F"
    And the sign-in page draws the agent sign-ins
    And the host was not sent GET to "/api/stats"
    When I open "/hosts/self"
    Then the path is "/login?returnTo=%2Fhosts%2Fself"
    And the host was not sent GET to "/api/stats"
    And the host was not sent GET to "/api/machines"

  Scenario: Agent loop: a sign-out on the dashboard sends the person to sign in and sends no read without the credential
    Given the host answers the agent-signins fixture
    And the host answers the agent fixture
    And the host answers the agent-live fixture
    And the browser holds "apikey" as "{\"key\":\"hw_seed_0001_initial\",\"profile\":{\"id\":12,\"name\":\"Mark\",\"role\":\"admin\"}}"
    When I open "/"
    Then the dashboard draws its frame
    And the host was sent GET to "/api/stats" 1 times
    When I sign out from the account menu
    Then the path is "/login?returnTo=%2F"
    And the sign-in page draws the agent sign-ins
    And the browser holds no "apikey"
    And every GET to "/api/stats" carried the header "authorization"
    And every GET to "/api/machines" carried the header "authorization"
    And the host was sent GET to "/api/stats" 1 times

  Scenario: Agent loop: a 401 on a read ends the session once, the record forgotten, the person sent to sign in and nothing read again
    Given the host answers the agent-signins fixture
    And the host answers the agent-signins-unauthorized fixture
    And the browser holds "apikey" as "{\"key\":\"hw_seed_0001_initial\",\"profile\":{\"id\":12,\"name\":\"Mark\",\"role\":\"admin\"}}"
    When I open "/"
    Then the path is "/login?returnTo=%2F"
    And the sign-in page draws the agent sign-ins
    And the browser holds no "apikey"
    And the host was sent GET to "/api/stats" 1 times

  Scenario: Agent loop: the admin, configuration, agent settings and profile routes settle on the key session with no move to the sign-in page
    Given the host answers the agent-signins fixture
    And the browser holds "apikey" as "{\"key\":\"hw_seed_0001_initial\",\"profile\":{\"id\":12,\"name\":\"Mark\",\"role\":\"admin\"}}"
    And the page's navigations are watched
    When I open "/admin"
    Then the pathname is "/admin/config/app"
    And the page navigated to "/login" 0 times
    When I open "/admin/config"
    Then the pathname is "/admin/config/app"
    And the page navigated to "/login" 0 times
    When I open "/hosts/self/agent/api-keys"
    Then the pathname is "/hosts/self/agent/api-keys"
    And the page navigated to "/login" 0 times
    When I open "/profile"
    Then the pathname is "/profile"
    And the page navigated to "/login" 0 times

  Scenario: Agent loop: on the agent's own status a key session draws the dashboard, the Controls menu, the footer's tasks pane and the host page's panels, and no sidebar since the agent lists no sidebar token
    Given the host answers the agent-overview fixture
    And the host answers the agent fixture
    And the host answers the agent-live fixture
    And the browser holds "apikey" as "{\"key\":\"hw_seed_0001_initial\",\"profile\":{\"id\":12,\"name\":\"Mark\",\"role\":\"admin\"}}"
    When I open "/"
    Then the dashboard draws its frame
    And the chrome draws the account menu
    And the header draws the action menu
    And the footer holds the "tasks" toggle
    And the chrome draws no sidebar
    When I open "/hosts/self"
    Then the host page draws the "system-info" panel
    And the host page draws the "interfaces" panel
    And the host page draws the "performance" panel
    And the host page draws the "cpu" chart
    And the host page draws no "storage" panel

  Scenario: Agent loop: the same status with the sidebar token draws the Dashboard row at / above the one serving agent's node, open over its machines alone, and no Hosts row
    Given the host answers the agent-overview fixture
    And the host answers the agent fixture
    And the host answers the agent-live fixture
    And the host answers the agent-live-sidebar fixture
    And the browser holds "apikey" as "{\"key\":\"hw_seed_0001_initial\",\"profile\":{\"id\":12,\"name\":\"Mark\",\"role\":\"admin\"}}"
    When I open "/"
    Then the dashboard draws its frame
    And the chrome draws the sidebar row "Dashboard"
    And the sidebar row "Dashboard" links to "/"
    And the chrome draws the sidebar row "lab-1"
    And the chrome draws no sidebar row "Hosts"
    And the sidebar draws "Dashboard" above "lab-1"
    And the sidebar foot holds the account menu
    And the tree draws 0 page rows under the tree node "lab-1"
    And the tree draws 2 machine rows under the tree node "lab-1"
    And the tree node "lab-1" draws no status dot

  Scenario: Agent loop: a status without a links member boots and draws the account menu with no API reference row
    Given the host answers the agent fixture
    And the host answers the agent-live fixture
    And the host answers the agent-live-nolinks fixture
    And the browser holds "apikey" as "{\"key\":\"hw_seed_0001_initial\",\"profile\":{\"id\":12,\"name\":\"Mark\",\"role\":\"admin\"}}"
    When I open "/"
    Then the dashboard draws its frame
    And the chrome draws the account menu
    When I open the account menu
    Then the account menu offers the admin board
    And the account menu offers no API reference row

  Scenario: Agent loop: a refused key answered as the brief's msg body draws its sentence
    Given the host answers the agent-signins fixture
    And the host answers the agent-signins-dead fixture
    When I open "/login?sso=unavailable"
    And I press the sign-in page's "use-api-key" action
    And I press the sign-in page's "have-key" action
    And I type "hw_dead_key" into the sign-in field "apiKey"
    And I press the sign-in page's "api-key-sign-in" action
    Then the sign-in page draws an "danger" alert
    And I see "Invalid API key"
    And the browser holds no "apikey"

  Scenario: Agent loop: a refused key answered as a problem body draws its detail sentence
    Given the host answers the agent-signins fixture
    And the host answers the agent-signins-problem fixture
    When I open "/login?sso=unavailable"
    And I press the sign-in page's "use-api-key" action
    And I press the sign-in page's "have-key" action
    And I type "hw_dead_key" into the sign-in field "apiKey"
    And I press the sign-in page's "api-key-sign-in" action
    Then the sign-in page draws an "danger" alert
    And I see "Invalid API key"
    And the browser holds no "apikey"
