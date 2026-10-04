Feature: agent-profile

  Scenario: Agent profile: a key a federated login minted draws the person's name and email in the menu, its Profile row landing on the issuer's profile page, the favorites read once under the key and drawn, and the bell with its unread count from one read of the inbox
    Given the host answers the agent-profile fixture
    And the browser holds "apikey" as "{\"key\":\"hw_seed_0001_initial\",\"profile\":{\"id\":12,\"name\":\"Mark\",\"role\":\"admin\"}}"
    When I open "/"
    Then the chrome draws the account menu
    And the host was sent GET to "/api/api-keys/info" carrying the header "authorization" as "Bearer hw_seed_0001_initial"
    And the host was sent GET to "/api/user" carrying the header "authorization" as "Bearer hw_seed_0001_initial"
    And the host was sent GET to "/api/user/favorites" carrying the header "authorization" as "Bearer hw_seed_0001_initial"
    And the host was sent GET to "/api/user/favorites" 1 times
    When I open the account menu
    Then the account menu draws the person "Mark" with the email "person@example.com"
    And the account menu's profile row opens "https://auth.example.com/user/profile"
    And the account menu's Preferences row opens "/profile/preferences"
    And the account menu offers the favorite "Conductor" at "https://conductor.example.com"
    And the account menu offers the favorite "Boxes" at "https://boxvault.example.com"
    And the account menu's Notifications row carries the count 2
    And the host was sent GET to "/api/notifications/unread-count" carrying the header "authorization" as "Bearer hw_seed_0001_initial"
    And the host was sent GET to "/api/notifications/unread-count" 1 times
    When I press the account menu's Notifications row
    Then the notifications modal lists 3 rows
    And the host was sent GET to "/api/notifications" 1 times

  Scenario: Agent profile: /profile on a key a federated login minted draws the record read-only with the Manage at identity provider link
    Given the host answers the agent-profile fixture
    And the browser holds "apikey" as "{\"key\":\"hw_seed_0001_initial\",\"profile\":{\"id\":12,\"name\":\"Mark\",\"role\":\"admin\"}}"
    When I open "/profile"
    Then the pathname is "/profile"
    And the profile page draws its record read-only
    And the profile page draws the Manage link to "https://auth.example.com/user/profile"
    And I see "person@example.com"
    When I open "/profile/preferences"
    Then the profile page draws the editable preferences
    When I pick "dark" in the profile select "profile-preferences-mode"
    Then the browser kept "mode" as "dark"
    And the host was not sent PATCH to "/api/user/preferences"

  Scenario: Agent profile: the full inbox page opens on a key whose agent lists inbox beside notifications and draws the relayed rows
    Given the host answers the agent-profile fixture
    And the browser holds "apikey" as "{\"key\":\"hw_seed_0001_initial\",\"profile\":{\"id\":12,\"name\":\"Mark\",\"role\":\"admin\"}}"
    When I open "/notifications"
    Then the pathname is "/notifications"
    And the inbox page lists 3 rows
    And the host was sent GET to "/api/notifications" carrying the header "authorization" as "Bearer hw_seed_0001_initial"

  Scenario: Agent profile: a push route answered 503 not-configured draws no error card
    Given the host answers the agent-profile fixture
    And the browser may show notifications
    And the browser holds "apikey" as "{\"key\":\"hw_seed_0001_initial\",\"profile\":{\"id\":12,\"name\":\"Mark\",\"role\":\"admin\"}}"
    When I open "/"
    And I open the account menu
    And I press the account menu's Notifications row
    And I turn the push switch on
    Then the host was sent GET to "/api/notifications/vapid-key" 1 times
    And the push switch stays off with its feedback
    And the page raised 0 danger notices

  Scenario: Agent profile: a plain key draws the local profile, no favorites and no inbox asked, and /profile the local record
    Given the host answers the agent-signins fixture
    And the host answers the agent-profile-plain fixture
    And the browser holds "apikey" as "{\"key\":\"hw_seed_0001_initial\",\"profile\":{\"id\":12,\"name\":\"Mark\",\"role\":\"admin\"}}"
    When I open "/"
    Then the chrome draws the account menu
    And the host was sent GET to "/api/user" 1 times
    When I open the account menu
    Then the account menu draws the person "Mark" with the email "person@example.com"
    And the account menu's profile row opens "/profile"
    And the account menu's Preferences row opens "/profile/preferences"
    And the account menu offers no Notifications row
    And the host was not sent GET to "/api/user/favorites"
    And the host was not sent GET to "/api/notifications/unread-count"
    When I open "/profile"
    Then the pathname is "/profile"
    And the profile page draws its record read-only
    And the profile page draws no Manage link
    And I see "person@example.com"

  Scenario: Agent profile: a plain key's Preferences card is editable, a mode picked lands in the browser's own key and nothing is sent, and the SHI theme picked writes ui.shi_mode through PUT /api/config/app, false again when another theme is picked
    Given the host answers the agent-signins fixture
    And the host answers the agent-profile-plain fixture
    And the browser holds "apikey" as "{\"key\":\"hw_seed_0001_initial\",\"profile\":{\"id\":12,\"name\":\"Mark\",\"role\":\"admin\"}}"
    When I open "/profile/preferences"
    Then the pathname is "/profile/preferences"
    And the chrome draws the sidebar row "Profile"
    And the chrome draws the sidebar row "Preferences"
    And the profile page draws the editable preferences
    When I pick "dark" in the profile select "profile-preferences-mode"
    Then the browser kept "mode" as "dark"
    And the host was not sent PATCH to "/api/user/preferences"
    When I pick "shi" in the profile select "profile-preferences-theme"
    Then the browser kept "theme" as "shi"
    And the host was sent PUT to "/api/config/app" carrying "true" at "/ui/shi_mode"
    When I pick "" in the profile select "profile-preferences-theme"
    Then the host was sent PUT to "/api/config/app" carrying "false" at "/ui/shi_mode"
    And the host was sent PUT to "/api/config/app" 2 times
    And the host was not sent PATCH to "/api/user/preferences"

  Scenario: Agent profile: a key whose GET /api/user answers 404 keeps the key's profile as the whole identity
    Given the host answers the agent-signins fixture
    And the browser holds "apikey" as "{\"key\":\"hw_seed_0001_initial\",\"profile\":{\"id\":12,\"name\":\"Mark\",\"role\":\"admin\"}}"
    When I open "/profile"
    Then the pathname is "/profile"
    And the host was sent GET to "/api/user"
    And the profile page draws its record read-only
    And the profile page draws no Manage link
    And I see "Mark"
    And the host was not sent GET to "/api/user/favorites"
