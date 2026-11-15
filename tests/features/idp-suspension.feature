Feature: identity contract, suspension

  Background:
    Given the host answers the identity fixture
    And the host answers the idp-suspension fixture

  Scenario: a suspended account: the sign-in page draws `?error=account_suspended` with its own message
    Given the host answers the identity-signed-out fixture
    When I open "/login?error=account_suspended"
    Then I see "This account is suspended. Contact support for this site."

  Scenario: a suspended account: the admin users list labels Resume on a row whose `suspended` is true and Suspend on every other, an unconfirmed account included
    When I open "/admin/users"
    Then the suspension row "jgilbert@example.com" draws its status as "bg-warning"
    And the suspension row "jgilbert@example.com" offers the "resume" action
    And the suspension row "jgilbert@example.com" offers no "suspend" action
    And the suspension row "pat@acme.example" draws its status as "bg-secondary"
    And the suspension row "pat@acme.example" offers the "suspend" action
    And the suspension row "pat@acme.example" offers no "resume" action
    And the suspension row "lee@moonshine.dev" draws its status as "bg-success"
    And the suspension row "lee@moonshine.dev" offers the "suspend" action

  Scenario: a suspended account: Resume sends `enabled: true` and Suspend sends `enabled: false` through PATCH /api/admin/users/{id}
    When I open "/admin/users"
    And I press the "resume" action of the suspension row "jgilbert@example.com"
    Then the host was sent PATCH to "/api/admin/users/43" carrying "enabled" as "true"
    When I press the "suspend" action of the suspension row "pat@acme.example"
    Then the host was sent PATCH to "/api/admin/users/44" carrying "enabled" as "false"

  Scenario: a suspended account: the acting admin's own row of the admin users list offers no Suspend
    When I open "/admin/users"
    Then the suspension row "lee@moonshine.dev" offers the "suspend" action
    And the suspension row "mark@m4kr.net" offers no "suspend" action
    And the suspension row "mark@m4kr.net" offers no "resume" action

  Scenario: a suspended account: the admin record of the acting admin's own account offers no Suspend
    When I open "/admin/users/42"
    Then I see "mark@m4kr.net"
    And the suspension page offers no "suspend" action

  Scenario: a suspended organization: the organizations page badges a suspended organization and a suspended seat and disables Make primary, Regenerate and Manage on both
    When I open "/user/organizations"
    Then the suspension row "Acme" offers the "open" action
    And the suspension row "Acme" offers the "regenerate" action
    And the suspension row "Globex" carries the "suspended" badge
    And the suspension row "Globex" holds the "open" action disabled
    And the suspension row "Globex" holds the "make-primary" action disabled
    And the suspension row "Globex" holds the "regenerate" action disabled
    And the suspension row "Initech" carries the "membership-suspended" badge
    And I see "Your membership is suspended"
    And the suspension row "Initech" holds the "open" action disabled
    And the suspension row "Initech" holds the "make-primary" action disabled

  Scenario: a suspended organization: the organizations page draws the same badges and disabled controls in the card view
    Given the browser holds "table_prefs_organizations" as "{\"view\":\"cards\"}"
    When I open "/user/organizations"
    Then the suspension row "Globex" carries the "suspended" badge
    And the suspension row "Globex" holds the "open" action disabled
    And the suspension row "Initech" carries the "membership-suspended" badge
    And the suspension row "Initech" holds the "make-primary" action disabled

  Scenario: a suspended organization: a `#<uuid>` arrival naming a suspended organization opens nothing
    When I open "/user/organizations#0d6b7e2a-1111-4c0a-9a1e-000000000002"
    Then the suspension row "Globex" holds the "open" action disabled
    And the path is "/user/organizations#0d6b7e2a-1111-4c0a-9a1e-000000000002"

  Scenario: a suspended membership: a `#<uuid>` arrival naming a suspended seat opens nothing
    When I open "/user/organizations#0d6b7e2a-1111-4c0a-9a1e-000000000003"
    Then the suspension row "Initech" holds the "open" action disabled
    And the path is "/user/organizations#0d6b7e2a-1111-4c0a-9a1e-000000000003"

  Scenario: a suspended membership: the members list badges a suspended row and offers an owner Suspend or Resume on every row but their own and a managed one
    Given the browser holds "activeOrganization" as "0d6b7e2a-1111-4c0a-9a1e-000000000001"
    When I open "/org-console"
    And I pick the console tab "members"
    Then the suspension row "ada@example.com" offers the "suspend" action
    And the suspension row "linus@example.com" carries the "suspended" badge
    And the suspension row "linus@example.com" offers the "resume" action
    And the suspension row "mark@m4kr.net" offers no "suspend" action
    And the suspension row "grace@example.com" offers no "suspend" action
    And the suspension row "grace@example.com" offers no "resume" action

  Scenario: a suspended membership: Suspend and Resume of one row send PUT …/members/{userId}/suspended
    Given the browser holds "activeOrganization" as "0d6b7e2a-1111-4c0a-9a1e-000000000001"
    When I open "/org-console"
    And I pick the console tab "members"
    And I press the "suspend" action of the suspension row "ada@example.com"
    Then the host was sent PUT to "/api/user/organizations/0d6b7e2a-1111-4c0a-9a1e-000000000001/members/7/suspended" carrying "suspended" as "true"
    When I press the "resume" action of the suspension row "linus@example.com"
    Then the host was sent PUT to "/api/user/organizations/0d6b7e2a-1111-4c0a-9a1e-000000000001/members/8/suspended" carrying "suspended" as "false"

  Scenario: a suspended organization: a console open on an organization that the next read answers suspended draws its write controls disabled and still reads the members
    Given the browser holds "activeOrganization" as "0d6b7e2a-1111-4c0a-9a1e-000000000001"
    When I open "/org-console"
    And I pick the console tab "members"
    Then the suspension row "ada@example.com" offers the "suspend" action
    When the host answers the idp-suspension-held fixture
    And I press the "suspend" action of the suspension row "ada@example.com"
    Then the console heading carries the "suspended" badge
    And the suspension row "ada@example.com" carries the "suspended" badge
    And the suspension row "ada@example.com" holds the "resume" action disabled
    And the suspension row "linus@example.com" holds the "resume" action disabled

  Scenario: a suspended membership: the bulk Suspend sends one POST …/members/bulk and draws each error by its code
    Given the browser holds "activeOrganization" as "0d6b7e2a-1111-4c0a-9a1e-000000000001"
    When I open "/org-console"
    And I pick the console tab "members"
    And I tick the suspension row "mark@m4kr.net"
    And I tick the suspension row "ada@example.com"
    And I press the members' bulk "suspend" action
    And I confirm the open plain dialog
    Then the host was sent POST to "/api/user/organizations/0d6b7e2a-1111-4c0a-9a1e-000000000001/members/bulk" carrying "action" as "suspend"
    And the host was sent POST to "/api/user/organizations/0d6b7e2a-1111-4c0a-9a1e-000000000001/members/bulk" carrying "user_ids" as "42,7"
    And I see "Own membership (1)"

  Scenario: a suspended organization: the switcher draws a suspended entry disabled with its badge and never as the active organization
    When I open "/user/organizations"
    And I open the organization switcher from its "Acme" row
    Then the switcher row "Acme" is the active one
    And the switcher row "Globex" is disabled with the "suspended" badge
    And the switcher row "Initech" is disabled with the "membership-suspended" badge

  Scenario: a suspended organization: the admin organizations list labels Suspend or Resume from `suspended` and a personal organization offers neither
    When I open "/admin/organizations"
    Then the suspension row "Acme" offers the "suspend" action
    And the suspension row "Globex" offers the "resume" action
    And the suspension row "Mark Gilbert" offers no "suspend" action
    And the suspension row "Mark Gilbert" offers no "resume" action

  Scenario: a suspended organization: Suspend of one admin row sends the bulk route that one id
    When I open "/admin/organizations"
    And I press the "suspend" action of the suspension row "Acme"
    Then the host was sent POST to "/api/admin/organizations/bulk" carrying "action" as "suspend"
    And the host was sent POST to "/api/admin/organizations/bulk" carrying "organization_ids" as "1"
