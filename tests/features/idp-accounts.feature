Feature: several accounts on one browser, the chooser page and the account switcher

  Background:
    Given the host answers the identity fixture

  Scenario: the chooser: /select-account lists the browser's accounts, the active and the remembered one marked, and names the application that waits
    Given the host answers the idp-accounts fixture
    When I open "/select-account"
    Then the host was sent GET to "/api/auth/accounts"
    And the page lists 2 accounts
    And the suspension row "ada@example.com" carries the "active" badge
    And the suspension row "grace@example.com" carries the "remembered" badge
    And the suspension row "grace@example.com" offers the "sign-out" action
    And I see "Web Mail"

  Scenario: the chooser: a row picked posts the choice, replaces the cached account and leaves for the authorize request as a top-level navigation
    Given the host answers the idp-accounts fixture
    And the browser answers "**/oauth2/authorize**" with an empty page
    When I open "/select-account"
    And I pick the account "grace@example.com"
    Then the host was sent POST to "/api/auth/accounts/rQ9/choose"
    And the path is "/oauth2/authorize?response_type=code&client_id=mail&state=s1&prompt=select_account"
    And the browser holds "account" carrying "email" as "grace@example.com"

  Scenario: the chooser: Use another account posts the add and leaves for the sign-in page, whose form draws while the session cookie still names someone
    Given the host answers the idp-accounts fixture
    And the page's navigations are watched
    When I open "/select-account"
    And I press the page's "add-account" action
    Then the host was sent POST to "/api/auth/accounts/add"
    And the path is "/login"
    And the host was sent GET to "/api/auth/methods"
    And the page navigated to "/" 0 times
    And the path is "/login"

  Scenario: the chooser: a row's sign-out answered 204 reads the list again and moves nobody
    Given the host answers the idp-accounts fixture
    When I open "/select-account"
    And I press the "sign-out" action of the suspension row "grace@example.com"
    Then the host was sent DELETE to "/api/auth/accounts/rQ9"
    And the host was sent GET to "/api/auth/accounts" 2 times
    And the path is "/select-account"

  Scenario: the chooser: the active account's sign-out leaves for the chooser as a top-level navigation
    Given the host answers the idp-accounts fixture
    And the host answers the identity-signed-out fixture
    When I open "/select-account"
    And I press the "sign-out" action of the suspension row "ada@example.com"
    Then the host was sent DELETE to "/api/auth/accounts/pX3"
    And the path is "/select-account"
    And the host was sent GET to "/api/auth/accounts" 2 times

  Scenario: the chooser: the last account's sign-out leaves for the sign-in page with the logout notice
    Given the host answers the idp-accounts fixture
    And the host answers the idp-accounts/last fixture
    And the host answers the identity-signed-out fixture
    When I open "/select-account"
    And I press the "sign-out" action of the suspension row "ada@example.com"
    Then the host was sent DELETE to "/api/auth/accounts/pX3"
    And the path is "/login?logout"

  Scenario: the chooser: Sign out all deletes every account, forgets the cached account and leaves for the sign-in page
    Given the host answers the idp-accounts fixture
    And the browser answers "**/login?logout" with an empty page
    When I open "/select-account"
    And I press the page's "sign-out-all" action
    Then the host was sent DELETE to "/api/auth/accounts"
    And the path is "/login?logout"
    And the browser holds no "account"

  Scenario: the chooser: a sign-out while front-channel frames wait leaves for the front-channel page
    Given the host answers the idp-accounts fixture
    And the host answers the idp-accounts/frontchannel fixture
    And the browser leaves "https://app.example/**" unanswered
    When I open "/select-account"
    And I press the "sign-out" action of the suspension row "ada@example.com"
    Then the host was sent DELETE to "/api/auth/accounts/pX3"
    And the path is "/connect/logout/frontchannel"
    And I see "Signing out"

  Scenario: the chooser: a 404 not_found reads the list again and draws the problem
    Given the host answers the idp-accounts fixture
    And the host answers the idp-accounts/gone fixture
    When I open "/select-account"
    And I press the "sign-out" action of the suspension row "grace@example.com"
    Then the host was sent DELETE to "/api/auth/accounts/rQ9"
    And the page draws 1 danger alerts
    And the host was sent GET to "/api/auth/accounts" 2 times
    And the page lists 2 accounts

  Scenario: the chooser: the empty answer draws the way to sign in
    Given the host answers the idp-accounts/empty fixture
    And the host answers the identity-signed-out fixture
    When I open "/select-account"
    Then the host was sent GET to "/api/auth/accounts"
    And the page links to "/login"
    And the page lists 0 accounts

  Scenario: the switcher: the account menu offers Switch account on the identity provider and its modal lists the same accounts
    Given the host answers the idp-accounts fixture
    When I open "/user/profile"
    And I open the account menu
    Then the account menu offers the account switcher
    When I press the account menu's account switcher
    Then the host was sent GET to "/api/auth/accounts"
    And the page lists 2 accounts
    And the suspension row "ada@example.com" carries the "active" badge

  Scenario: the switcher: a row picked switches through choose as a top-level navigation
    Given the host answers the idp-accounts fixture
    And the browser answers "**/oauth2/authorize**" with an empty page
    When I open "/user/profile"
    And I open the account menu
    And I press the account menu's account switcher
    And I pick the account "grace@example.com"
    Then the host was sent POST to "/api/auth/accounts/rQ9/choose"
    And the path is "/oauth2/authorize?response_type=code&client_id=mail&state=s1&prompt=select_account"

  Scenario: the switcher: Add another account posts the add and leaves for the sign-in page, whose form draws while the session cookie still names someone
    Given the host answers the idp-accounts fixture
    And the page's navigations are watched
    When I open "/user/profile"
    And I open the account menu
    And I press the account menu's account switcher
    And I press the open dialog's "add-account" action
    Then the host was sent POST to "/api/auth/accounts/add"
    And the path is "/login"
    And the host was sent GET to "/api/auth/methods"
    And the page navigated to "/" 0 times
    And the path is "/login"

  Scenario: the switcher: Sign out all deletes every account, forgets the cached account and leaves for the sign-in page
    Given the host answers the idp-accounts fixture
    And the browser answers "**/login?logout" with an empty page
    When I open "/user/profile"
    And I open the account menu
    And I press the account menu's account switcher
    And I press the open dialog's "sign-out-all" action
    Then the host was sent DELETE to "/api/auth/accounts"
    And the path is "/login?logout"
    And the browser holds no "account"

  Scenario: the switcher: a row picked with nothing waiting reloads the app at home on the replaced record
    Given the host answers the idp-accounts fixture
    And the host answers the idp-accounts/home fixture
    When I open "/user/profile"
    And I open the account menu
    And I press the account menu's account switcher
    And I pick the account "grace@example.com"
    Then the host was sent POST to "/api/auth/accounts/rQ9/choose"
    And the path is "/"
    And the chrome draws the account menu

  Scenario: the switcher: a backend host's account menu offers no Switch account
    Given the host answers the agent fixture
    And the host answers the agent-links fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/self"
    And I open the account menu
    Then the account menu offers no account switcher

  Scenario: the switcher: an identity provider whose accounts carries no switch sub flag offers no Switch account
    Given the host answers the idp-accounts fixture
    And the host answers the idp-accounts/no-switch fixture
    When I open "/user/profile"
    And I open the account menu
    Then the account menu offers no account switcher

  Scenario: the switcher: a sibling tab of the origin reloads into the active person after a switch
    Given the host answers the idp-accounts fixture
    And the browser answers "**/oauth2/authorize**" with an empty page
    When I open "/user/profile"
    Then the chrome draws the account menu
    When I open "/user/profile" in a second tab
    Then the sibling tab draws the account menu
    When I open the account menu
    And I press the account menu's account switcher
    And I pick the account "grace@example.com"
    Then the host was sent POST to "/api/auth/accounts/rQ9/choose"
    And the sibling tab reloaded

  Scenario: /activate: the chooser step draws first while the browser holds two accounts, the active row leading to the code step with no request
    Given the host answers the idp-accounts fixture
    When I open "/activate?user_code=ABCD-EFGH"
    Then the page lists 2 accounts
    When I pick the account "ada@example.com"
    Then the field "Device code" holds "ABCD-EFGH"
    And the host was not sent POST to "/api/auth/accounts/pX3/choose"

  Scenario: /activate: another row picked posts the choice and returns to the device page with its code when next is /
    Given the host answers the idp-accounts fixture
    And the host answers the idp-accounts/home fixture
    When I open "/activate?user_code=ABCD-EFGH"
    And I pick the account "grace@example.com"
    Then the host was sent POST to "/api/auth/accounts/rQ9/choose"
    And the path is "/activate?user_code=ABCD-EFGH"
    And the page lists 2 accounts

  Scenario: /activate: one account draws the code step at once
    When I open "/activate?user_code=ABCD-EFGH"
    Then the field "Device code" holds "ABCD-EFGH"
    And the page lists 0 accounts
