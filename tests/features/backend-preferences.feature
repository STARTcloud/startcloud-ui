Feature: backend-preferences

  Scenario: Backend preferences: a local account on a backend host draws the Preferences section editable with language, mode, theme and motion alone, no time zone, region, approval channel or PIN, the account's mode painted on load, and each of the four writes through the session as one PATCH /api/user/preferences carrying that member, the stored record carrying it, while Save sends nothing more
    Given the host answers the backend-preferences fixture
    And the browser holds "user" as "{\"id\":42,\"username\":\"mark\",\"access_token\":\"t\"}"
    When I open "/profile/preferences"
    Then the pathname is "/profile/preferences"
    And the chrome draws the sidebar row "Profile"
    And the chrome draws the sidebar row "Preferences"
    And the profile page draws the editable preferences
    And the profile page draws no field "profile-preferences/timezone"
    And the profile page draws no field "profile-preferences/region"
    And the profile page draws no field "profile-preferences/ciba_channel"
    And the profile page draws no field "profile-preferences/ciba_user_code"
    And the document carries "data-bs-theme" as "dark"
    And the host was not sent PATCH to "/api/user/preferences"
    When I pick "light" in the profile select "profile-preferences-mode"
    Then the host was sent PATCH to "/api/user/preferences" carrying "mode" as "light"
    And the document carries "data-bs-theme" as "light"
    And the browser kept "mode" as "light"
    And the browser holds "user" carrying "preferred_mode" as "light"
    When I pick "reduce" in the profile select "profile-preferences-motion"
    Then the host was sent PATCH to "/api/user/preferences" carrying "motion" as "reduce"
    And the document carries "data-motion" as "reduce"
    And the browser holds "user" carrying "preferred_motion" as "reduce"
    When I pick "lcars" in the profile select "profile-preferences-theme"
    Then the host was sent PATCH to "/api/user/preferences" carrying "theme" as "lcars"
    And the document carries "data-brand" as "lcars"
    And the browser holds "user" carrying "preferred_theme" as "lcars"
    When I pick "es" in the profile select "profile-preferences-language"
    Then the host was sent PATCH to "/api/user/preferences" carrying "language" as "es"
    And the host was sent PATCH to "/api/user/preferences" 4 times
    And the PATCH to "/api/user/preferences" carried the header "x-access-token"
    When I press the page's "save-preferences" action
    Then the page raised 1 success notice
    And the host was sent PATCH to "/api/user/preferences" 4 times

  Scenario: Backend preferences: an identity provider's session on a backend host draws the Preferences section read-only with the Manage at identity provider link and sends no preferences write
    Given the host answers the backend-preferences fixture
    And the host answers the backend-preferences/provider fixture
    And the browser holds "user" as "{\"id\":2,\"username\":\"admin\",\"provider\":\"oidc-auth\"}" signed in through "https://auth.example.com"
    When I open "/profile/preferences"
    Then the pathname is "/profile/preferences"
    And the chrome draws the sidebar row "Preferences"
    And the host was sent GET to "/api/auth/oidc/issuers"
    And the profile page draws its record read-only
    And the profile page draws the Manage link to "https://auth.example.com/user/profile"
    And the profile page draws no field "profile-preferences-timezone"
    And the profile page draws no field "profile-preferences-region"
    And the document carries "data-bs-theme" as "dark"
    And the host was not sent PATCH to "/api/user/preferences"
