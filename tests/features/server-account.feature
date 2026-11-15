Feature: server-account

  Scenario: Deploy target: the Preferences section on a hyperweaver-server host draws the deploy target beside mode, theme and language from GET /api/user/deploy, local while unset, and a pick of this server's origin writes PATCH /api/user/deploy carrying deploy_target
    Given the host answers the server-account fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"access_token\":\"t\"}"
    When I open "/profile/preferences"
    Then the profile page draws the editable preferences
    And the host was sent GET to "/api/user/deploy"
    And the page field "profile-preferences/deploy_target" reads "local"
    When I pick "http://127.0.0.1:4173" in the profile select "profile-preferences/deploy_target"
    Then the host was sent PATCH to "/api/user/deploy" carrying "deploy_target" as "http://127.0.0.1:4173"
    And the host was sent PATCH to "/api/user/deploy" 1 times
    And the page field "profile-preferences/deploy_target" reads "http://127.0.0.1:4173"
    And the page raised 0 danger notices

  Scenario: Deploy target: a 422 at /deploy_target is painted on the field and a pick of local writes again
    Given the host answers the server-account fixture
    And the host refuses the next PATCH to "/api/user/deploy"
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"access_token\":\"t\"}"
    When I open "/profile/preferences"
    Then the page field "profile-preferences/deploy_target" reads "local"
    When I pick "http://127.0.0.1:4173" in the profile select "profile-preferences/deploy_target"
    Then the host was sent PATCH to "/api/user/deploy" carrying "deploy_target" as "http://127.0.0.1:4173"
    And the page field "profile-preferences/deploy_target" is marked invalid
    And the page raised 0 danger notices
    When I pick "local" in the profile select "profile-preferences/deploy_target"
    Then the host was sent PATCH to "/api/user/deploy" carrying "deploy_target" as "local"
    And the host was sent PATCH to "/api/user/deploy" 2 times
    And the page field "profile-preferences/deploy_target" is not marked invalid

  Scenario: Deploy target: a backend host that is not the hyperweaver-server role draws no deploy target and asks for none
    Given the host answers the server-account fixture
    And the host answers the server-account/boxvault fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"access_token\":\"t\"}"
    When I open "/profile/preferences"
    Then the profile page draws the editable preferences
    And the profile page draws no field "profile-preferences/deploy_target"
    And the host was not sent GET to "/api/user/deploy"

  Scenario: Change password: the Security section on a hyperweaver-server host asks the current password and sends POST /api/auth/change-password with current_password, new_password and confirm_password, never BoxVault's route
    Given the host answers the server-account fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"access_token\":\"t\"}"
    When I open "/profile/security"
    And I type "old-horse-battery-staple" into the page field "profile-password/current_password"
    And I type "new-horse-battery-staple" into the page field "profile-password/password"
    And I type "new-horse-battery-staple" into the page field "profile-password/confirm"
    And I press the page's "change-password" action
    Then the host was sent POST to "/api/auth/change-password" carrying "current_password" as "old-horse-battery-staple"
    And the host was sent POST to "/api/auth/change-password" carrying "new_password" as "new-horse-battery-staple"
    And the host was sent POST to "/api/auth/change-password" carrying "confirm_password" as "new-horse-battery-staple"
    And the host was sent POST to "/api/auth/change-password" 1 times
    And the host was not sent PUT to "/api/users/1/change-password"
    And the page raised 1 success notice

  Scenario: Delete account: the dialog on a hyperweaver-server host asks the password and the typed word DELETE, refuses another word in the dialog, and sends DELETE /api/auth/delete-account with password and confirm_text, the page then signed out
    Given the host answers the server-account fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"access_token\":\"t\"}"
    When I open "/profile/security"
    And I press the page's "delete-account" action
    And I type "old-horse-battery-staple" into the page field "profile-delete-password"
    And I type "delete" into the page field "profile-delete-word"
    And I press the page's "delete-account-confirm" action
    Then the host was not sent DELETE to "/api/auth/delete-account"
    And the profile page draws no field "profile-delete-email"
    When I type "DELETE" into the page field "profile-delete-word"
    And I press the page's "delete-account-confirm" action
    Then the host was sent DELETE to "/api/auth/delete-account" carrying "password" as "old-horse-battery-staple"
    And the host was sent DELETE to "/api/auth/delete-account" carrying "confirm_text" as "DELETE"
    And the host was sent DELETE to "/api/auth/delete-account" 1 times
    And the host was not sent DELETE to "/api/users/1"
    And the pathname is "/login"

  Scenario: Invitations: an invitation row on a hyperweaver-server host carries Resend, one POST /api/invitations/{id}/resend, a success notice and the invitations read again
    Given the host answers the server-account fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"access_token\":\"t\"}"
    And the browser holds "activeOrganization" as "0b7c1d52-6f0e-4c0a-9a54-3c1f6f2a9e11"
    When I open "/org-console"
    And I pick the console tab "invitations"
    Then the host was sent GET to "/api/invitations/active/acme" 1 times
    When I press the page's "invitation-resend" action
    Then the host was sent POST to "/api/invitations/7/resend" 1 times
    And the page raised 1 success notice
    And the host was sent GET to "/api/invitations/active/acme" 2 times

  Scenario: Counts: the organization console on a hyperweaver-server host reads GET /api/organization/{name}/stats once and draws the counts as badges on the members and invitations headings
    Given the host answers the server-account fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"access_token\":\"t\"}"
    And the browser holds "activeOrganization" as "0b7c1d52-6f0e-4c0a-9a54-3c1f6f2a9e11"
    When I open "/org-console"
    Then the host was sent GET to "/api/organization/acme/stats" 1 times
    And the stat "total" counts "12"
    And the stat "active" counts "10"
    And the stat "admins" counts "3"
    When I pick the console tab "invitations"
    Then the stat "pending" counts "2"
    And the stat "accepted" counts "1"
    And the stat "expired" counts "1"
    And the host was sent GET to "/api/organization/acme/stats" 1 times

  Scenario: Counts: a refused read of the counts draws no badge and raises no notice
    Given the host answers the server-account fixture
    And the host answers the server-account/no-stats fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"access_token\":\"t\"}"
    And the browser holds "activeOrganization" as "0b7c1d52-6f0e-4c0a-9a54-3c1f6f2a9e11"
    When I open "/org-console"
    Then the host was sent GET to "/api/organization/acme/stats"
    And the page draws no stat "total"
    And the page raised 0 danger notices

  Scenario: Counts and Resend: a backend host that is not the hyperweaver-server role asks for no counts and draws no Resend
    Given the host answers the server-account fixture
    And the host answers the server-account/boxvault fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"access_token\":\"t\"}"
    And the browser holds "activeOrganization" as "0b7c1d52-6f0e-4c0a-9a54-3c1f6f2a9e11"
    When I open "/org-console"
    And I pick the console tab "invitations"
    Then the host was sent GET to "/api/invitations/active/acme"
    And the page offers the "invitation-delete" action
    And the page offers no "invitation-resend" action
    And the page draws no stat "total"
    And the host was not sent GET to "/api/organization/acme/stats"
