Feature: agent-profile

  Scenario: Agent profile: a key a federated login minted draws the person's name and email in the menu, its Profile row landing on the issuer's profile page, the favorites read once on the session and drawn, and the bell with its unread count from one read of the inbox
    Given the host answers the agent-profile fixture
    And the browser holds "apikey" as "{\"id\":12,\"name\":\"Mark\",\"role\":\"admin\"}"
    When I open "/"
    Then the chrome draws the account menu
    And the host was sent GET to "/api/api-keys/info"
    And the host was sent GET to "/api/user"
    And the host was sent GET to "/api/user/favorites"
    And no GET to "/api/api-keys/info" carried the header "authorization"
    And no GET to "/api/user" carried the header "authorization"
    And no GET to "/api/user/favorites" carried the header "authorization"
    And the host was sent GET to "/api/user/favorites" 1 times
    When I open the account menu
    Then the account menu draws the person "Mark" with the email "person@example.com"
    And the account menu's profile row opens "https://auth.example.com/user/profile"
    And the account menu's Preferences row opens "/profile/preferences"
    And the account menu offers the favorite "Conductor" at "https://conductor.example.com"
    And the account menu offers the favorite "Boxes" at "https://boxvault.example.com"
    And the account menu's Notifications row carries the count 2
    And no GET to "/api/notifications/unread-count" carried the header "authorization"
    And the host was sent GET to "/api/notifications/unread-count" 1 times
    When I press the account menu's Notifications row
    Then the notifications modal lists 3 rows
    And the host was sent GET to "/api/notifications" 1 times

  Scenario: Agent profile: /profile on a key a federated login minted draws the record read-only with the Manage at identity provider link
    Given the host answers the agent-profile fixture
    And the browser holds "apikey" as "{\"id\":12,\"name\":\"Mark\",\"role\":\"admin\"}"
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
    And the browser holds "apikey" as "{\"id\":12,\"name\":\"Mark\",\"role\":\"admin\"}"
    When I open "/notifications"
    Then the pathname is "/notifications"
    And the inbox page lists 3 rows
    And no GET to "/api/notifications" carried the header "authorization"

  Scenario: Agent profile: a push route answered 503 not-configured draws no error card
    Given the host answers the agent-profile fixture
    And the browser may show notifications
    And the browser holds "apikey" as "{\"id\":12,\"name\":\"Mark\",\"role\":\"admin\"}"
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
    And the browser holds "apikey" as "{\"id\":12,\"name\":\"Mark\",\"role\":\"admin\"}"
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
    And the browser holds "apikey" as "{\"id\":12,\"name\":\"Mark\",\"role\":\"admin\"}"
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

  Scenario: Agent profile: the Hosts card of the Preferences section on a host that lists hosts saves the default domain for new machines into the browser's hosts_prefs and nothing is sent
    Given the host answers the agent-signins fixture
    And the host answers the agent-profile-plain fixture
    And the browser holds "apikey" as "{\"id\":12,\"name\":\"Mark\",\"role\":\"admin\"}"
    When I open "/profile/preferences"
    Then the profile page draws the editable preferences
    And the page draws the panel "hosts-preferences"
    When I type "pref.example.com" into the page field "hosts-preferences-default_domain"
    And I press the page's "save-hosts-preferences" action
    Then the browser kept "hosts_prefs" as "{\"defaultDomain\":\"pref.example.com\"}"
    And the host was not sent PATCH to "/api/user/preferences"

  Scenario: Agent profile: a key whose GET /api/user answers 404 keeps the key's profile as the whole identity
    Given the host answers the agent-signins fixture
    And the browser holds "apikey" as "{\"id\":12,\"name\":\"Mark\",\"role\":\"admin\"}"
    When I open "/profile"
    Then the pathname is "/profile"
    And the host was sent GET to "/api/user"
    And the profile page draws its record read-only
    And the profile page draws no Manage link
    And I see "Mark"
    And the host was not sent GET to "/api/user/favorites"

  Scenario: Agent profile: the Certificates card is one form with one Save preferences and one destination switch, Sync to the backend on for a person who never chose, so a bundle dropped into the vault reaches the active organization as one POST a record and Save sends nothing more
    Given the host answers the certs fixture
    And the browser holds "user" as "{\"id\":2,\"username\":\"admin\",\"provider\":\"oidc-auth\",\"access_token\":\"t\"}"
    When I open "/certs"
    And I click "Add New"
    And I drop "vault.certs.json" into the vault
    Then I see "2 records imported"
    And the host was sent POST to "/api/certs" carrying "kind" as "certificate"
    And the host was sent POST to "/api/certs" carrying "kind" as "key"
    And the host was sent POST to "/api/certs" carrying "organization" as "acme"
    And the host was sent POST to "/api/certs" 2 times
    When I open "/profile/preferences"
    Then the page draws the panel "certs-preferences"
    And the certs preferences draw one Save and 1 destination switch
    And the certs control "certs-sync/hyperweaver-server" is checked
    When I press the page's "save-certs-preferences" action
    Then I see "Sync settings saved."
    And the host was sent POST to "/api/certs" 2 times

  Scenario: Agent profile: a destination switched off sends nothing on a drop, and switched on again its Save sends every unsent record of the vault
    Given the host answers the certs fixture
    And the browser keeps the vault's sync to "hyperweaver-server" off
    And the browser holds "user" as "{\"id\":2,\"username\":\"admin\",\"provider\":\"oidc-auth\",\"access_token\":\"t\"}"
    When I open "/certs"
    And I click "Add New"
    And I drop "vault.certs.json" into the vault
    Then the vault lists 2 rows
    And the host was not sent POST to "/api/certs"
    When I open "/profile/preferences"
    Then the certs control "certs-sync/hyperweaver-server" is not checked
    When I check the control "certs-sync/hyperweaver-server"
    And I press the page's "save-certs-preferences" action
    Then the host was sent POST to "/api/certs" carrying "organization" as "acme"
    And the host was sent POST to "/api/certs" 2 times
    And I see "Sync settings saved."

  Scenario: Agent profile: on an agent that lists certs-store for a person in no organization, the Vault sits under Account after Profile, the tools under System, no Browse store row, the host column's one store row Secrets, and the vault's records reach the host's own store under no organization
    Given the host answers the agent-signins fixture
    And the host answers the agent-profile-plain fixture
    And the host answers the agent-profile-certs fixture
    And the browser holds "apikey" as "{\"id\":12,\"name\":\"Mark\",\"role\":\"admin\"}"
    When I open "/certs"
    Then the sidebar section "account" opens with the row to "/profile"
    And the sidebar section "account" holds the row to "/certs"
    And the sidebar section "system" holds the row to "/certs/convert"
    And the sidebar draws no section "browse"
    When I click "Add New"
    And I drop "vault.certs.json" into the vault
    Then the vault lists 2 rows
    And the host was sent POST to "/api/certs" carrying "kind" as "certificate"
    And the host was sent POST to "/api/certs" carrying "organization" as ""
    When I open "/hosts/self/agent/api-keys"
    Then the host column draws the "secrets" row to "/hosts/self/agent/secrets"
    And the host column draws no "certificates" row
    When I open "/profile/preferences"
    Then the certs preferences draw one Save and 1 destination switch
    And the certs control "certs-sync/hyperweaver-agent" is checked
    When I press the page's "save-certs-preferences" action
    Then I see "Sync settings saved."

  Scenario: Agent profile: on an agent that lists certs-store, the Secrets page's Pick secret from the Vault store writes the picked record to the host's store as one POST under no organization and closes
    Given the host answers the agent-signins fixture
    And the host answers the agent-profile-plain fixture
    And the host answers the agent-profile-certs fixture
    And the browser keeps the vault's sync to "hyperweaver-agent" off
    And the browser holds "apikey" as "{\"id\":12,\"name\":\"Mark\",\"role\":\"admin\"}"
    When I open "/certs"
    And I click "Add New"
    And I drop "vault.certs.json" into the vault
    Then the vault lists 2 rows
    And the host was not sent POST to "/api/certs"
    When I open "/hosts/self/agent/secrets"
    Then the section page "secrets" draws
    When I press the agent page's "secret-pick" action
    Then the "pick-secret" dialog is open
    When I choose "vault" in the control "pick-secret-store"
    And I press "secret-pick-row" on the row "Local leaf" of the dialog table "secret-pick"
    Then the host was sent POST to "/api/certs" carrying "kind" as "certificate"
    And the host was sent POST to "/api/certs" carrying "organization" as ""
    And the host was sent POST to "/api/certs" 1 times
    And the "pick-secret" dialog is closed
