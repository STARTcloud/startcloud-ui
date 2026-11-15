Feature: identity contract, the `teams` sub flag of `org-console`

  Background:
    Given the host answers the identity fixture
    And the host answers the idp-organizations fixture

  Scenario: teams on: the organizations page draws Create a team beside the memberships and their Manage
    When I open "/user/organizations"
    Then the suspension row "Acme" offers the "open" action
    And I see "Create a team"

  Scenario: teams on: the console of a personal organization its owner opened draws Convert to a team
    Given the browser holds "activeOrganization" as "0d6b7e2a-1111-4c0a-9a1e-000000000009"
    When I open "/org-console"
    And I pick the console tab "members"
    Then the suspension row "mark@m4kr.net" offers no "suspend" action
    And I see "Convert to a team"

  Scenario: teams on: the account-type step offers its two tiles
    When I open "/complete-onboarding/account-type"
    Then the host was sent GET to "/api/auth/onboarding"
    And the page offers 2 choice tiles
    And the path is "/complete-onboarding/account-type"

  Scenario: teams off: the organizations page lists the memberships with Manage and draws no Create a team
    Given the host answers the idp-organizations/teams-off fixture
    When I open "/user/organizations"
    Then the suspension row "Acme" offers the "open" action
    And I do not see "Create a team"

  Scenario: teams off: the console of a personal organization draws no Convert to a team
    Given the host answers the idp-organizations/teams-off fixture
    And the browser holds "activeOrganization" as "0d6b7e2a-1111-4c0a-9a1e-000000000009"
    When I open "/org-console"
    And I pick the console tab "members"
    Then the suspension row "mark@m4kr.net" offers no "suspend" action
    And I do not see "Convert to a team"

  Scenario: teams off: the account-type step draws no tiles and follows the state's own `next`
    Given the host answers the idp-organizations/teams-off fixture
    When I open "/complete-onboarding/account-type"
    Then the host was sent GET to "/api/auth/onboarding"
    And the path is "/complete-onboarding/name"
    And the page offers 0 choice tiles

  Scenario: teams on: a guest-only account sees its membership and no Create a team
    Given the host answers the idp-organizations/guest fixture
    When I open "/user/organizations"
    Then the suspension row "Acme" offers the "open" action
    And I do not see "Create a team"

  Scenario: no membership, teams on: the organizations page draws its empty state, no row and Create a team
    Given the host answers the idp-organizations/none fixture
    When I open "/user/organizations"
    Then the host was sent GET to "/api/user/organizations"
    And the organizations page counts 0 memberships
    And I see "Create a team"

  Scenario: no membership, teams off: the organizations page draws its empty state, no row and no Create a team
    Given the host answers the idp-organizations/none fixture
    And the host answers the idp-organizations/teams-off fixture
    When I open "/user/organizations"
    Then the host was sent GET to "/api/user/organizations"
    And the organizations page counts 0 memberships
    And I do not see "Create a team"

  Scenario: no membership: the account menu opens with no organization row and no console link
    Given the host answers the idp-organizations/none fixture
    When I open "/user/organizations"
    And I open the account menu
    Then the account menu offers no organization row and no console link
