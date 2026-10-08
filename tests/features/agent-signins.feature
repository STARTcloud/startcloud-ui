Feature: agent-signins

  Scenario: Agent sign-ins: the apikey host draws its paths alone, Login with SSO first, Login Locally on a loopback page, the key form demoted, the first boot behind bootstrapAvailable, no password form and no methods read, and the one silent probe on a loopback page
    Given the host answers the agent-signins fixture
    When I open "/login"
    Then the sign-in page draws the agent sign-ins
    And the sign-in page offers "code-start"
    And the sign-in page offers "desktop-sign-in"
    And the sign-in page offers "use-api-key"
    And the sign-in page offers no "device-start"
    And the sign-in page notes no "first-boot"
    And the sign-in page offers no "api-key-sign-in"
    And the sign-in page draws no password form
    And the host was sent POST to "/api/auth/oidc/silent-start" 1 times
    And the host was not sent GET to "/api/auth/methods"
    And the page draws no key under "auth"
    When I press the sign-in page's "use-api-key" action
    Then the sign-in page notes "first-boot"
    And the sign-in page offers "bootstrap"
    And the sign-in page offers no "use-api-key"
    When I press the sign-in page's "have-key" action
    Then the sign-in page offers "api-key-sign-in"
    And the sign-in page notes no "first-boot"

  Scenario: Agent sign-ins: a pasted key is handed to POST /api/auth/session, the profile read on the session cookie, the key never cached, and no request or event stream carries a credential header
    Given the host answers the agent-signins fixture
    When I open "/login"
    And I press the sign-in page's "use-api-key" action
    And I press the sign-in page's "have-key" action
    And I type "hw_seed_0001_initial" into the sign-in field "apiKey"
    And I press the sign-in page's "api-key-sign-in" action
    Then the host was sent POST to "/api/auth/session" carrying "api_key" as "hw_seed_0001_initial"
    And the host was sent GET to "/api/api-keys/info"
    And the path is "/"
    And the chrome draws the account menu
    And the browser holds "apikey" carrying no "key"
    And the host was sent GET to "/api/stats"
    And the host was sent GET to "/api/events"
    And no GET to "/api/api-keys/info" carried the header "authorization"
    And no GET to "/api/stats" carried the header "authorization"
    And no GET to "/api/events" carried the header "authorization"
    And the host was sent GET to "/api/api-keys/info" 1 times

  Scenario: Agent sign-ins: a cached profile is read again on load, and a dead session's 401 on GET /api/api-keys/info ends the session and sends the visitor to sign in
    Given the host answers the agent-signins fixture
    And the host answers the agent-signins-dead fixture
    And the browser holds "apikey" as "{\"id\":12,\"name\":\"Mark\",\"role\":\"admin\"}"
    When I open "/"
    Then the host was sent GET to "/api/api-keys/info"
    And the path is "/login?returnTo=%2F"
    And the sign-in page draws the agent sign-ins
    And the browser holds no "apikey"

  Scenario: Agent sign-ins: a 403 on another route is a role too low and keeps the session
    Given the host answers the agent-signins fixture
    And the host answers the agent-signins-forbidden fixture
    And the browser holds "apikey" as "{\"id\":13,\"name\":\"ci-runner\",\"role\":\"operator\"}"
    When I open "/"
    Then the host was sent GET to "/api/stats"
    And the chrome draws the account menu
    And the browser still holds "apikey"

  Scenario: Agent sign-ins: a tray token in the fragment is claimed once with the fragment stripped first, the profile read on the session it set, and no silent probe runs beside it
    Given the host answers the agent-signins fixture
    When I open "/login#tray=tray-demo-token"
    Then the host was sent POST to "/api/auth/tray-claim" carrying "token" as "tray-demo-token"
    And the host was sent GET to "/api/api-keys/info"
    And the path is "/"
    And the address carries no fragment
    And the tab stays open
    And the host was sent POST to "/api/auth/tray-claim" 1 times
    And the host was sent GET to "/api/api-keys/info" 1 times
    And the browser holds "apikey" carrying no "key"
    And the host was not sent POST to "/api/auth/oidc/silent-start"

  Scenario: Agent sign-ins: a cached session that still validates outranks the tray claim, the fragment stripped unclaimed and the session kept
    Given the host answers the agent-signins fixture
    And the browser holds "apikey" as "{\"id\":12,\"name\":\"Mark\",\"role\":\"admin\"}"
    When I open "/#tray=tray-demo-token"
    Then the host was sent GET to "/api/api-keys/info"
    And the chrome draws the account menu
    And the address carries no fragment
    And the tab stays open
    And the host was not sent POST to "/api/auth/tray-claim"

  Scenario: Agent sign-ins: the ?sso=unavailable bounce draws the chooser with its quiet line and starts no silent probe
    Given the host answers the agent-signins fixture
    When I open "/login?sso=unavailable"
    Then the sign-in page draws the agent sign-ins
    And the sign-in page offers "code-start"
    And the sign-in page draws an "info" alert
    And the host was not sent POST to "/api/auth/oidc/silent-start"

  Scenario: Agent sign-ins: Login with SSO starts one flow through the provider, opens the authorize URL, reads the agent's answer as soon as the flow is held, and the approved session is adopted with no key posted
    Given the host answers the agent-signins fixture
    When I open "/login?sso=unavailable"
    And I press the sign-in page's "code-start" action
    Then the host was sent POST to "/api/auth/oidc/code-start" 1 times
    And the host was sent GET to "/api/auth/oidc/device-status" 1 times
    And the host was not sent POST to "/api/auth/oidc/device-start"
    And the host was sent GET to "/api/api-keys/info"
    And the path is "/"
    And the host was not sent POST to "/api/auth/session"

  Scenario: Agent sign-ins: the first key is generated with setup_token, shown once, and signed in with on Saved, continue
    Given the host answers the agent-signins fixture
    When I open "/login?sso=unavailable"
    And I press the sign-in page's "use-api-key" action
    And I type "mock-setup-token" into the sign-in field "setupToken"
    And I press the sign-in page's "bootstrap" action
    Then the host was sent POST to "/api/api-keys/bootstrap" carrying "setup_token" as "mock-setup-token"
    And the host was sent POST to "/api/api-keys/bootstrap" carrying "name" as "Direct-Login"
    And the sign-in page notes "bootstrapped-key"
    And the sign-in page shows the key "hw_first_boot_key"
    And the host was not sent GET to "/api/api-keys/info"
    When I press the sign-in page's "key-saved" action
    Then the host was sent POST to "/api/auth/session" carrying "api_key" as "hw_first_boot_key"
    And the host was sent GET to "/api/api-keys/info"
    And the path is "/"

  Scenario: Agent sign-ins: the key's admin role reaches the host's highest role, and sign-out forgets the record, posts POST /api/auth/logout with no header of its own and sends the person to sign in
    Given the host answers the agent-signins fixture
    And the browser holds "apikey" as "{\"id\":12,\"name\":\"Mark\",\"role\":\"admin\"}"
    When I open "/"
    Then the chrome draws the account menu
    And I see "Mark"
    When I open the account menu
    Then the account menu offers the admin board
    When I sign out from the account menu
    Then the browser holds no "apikey"
    And the path is "/login?returnTo=%2F"
    And the sign-in page draws the agent sign-ins
    And the host was sent POST to "/api/auth/logout" 1 times
    And no POST to "/api/auth/logout" carried the header "x-xsrf-token"
    And no POST to "/api/auth/logout" carried the header "authorization"
    And the host was not sent POST to "/api/auth/oidc/logout"
