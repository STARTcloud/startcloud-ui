Feature: navbar search

  Scenario: Search: a signed-out visitor on a host listing search filters the public listing from the navbar box
    Given the host answers the deploy-target-catalog fixture
    When I open "/"
    Then I see "hcl-domino"
    And the navbar draws the search icon
    When I press "/"
    Then the navbar search box holds the focus
    When I type "zzz" in the navbar search box
    Then the navbar search count reads "0 / 1"
    And I do not see "hcl-domino"
    When I type "domino" in the navbar search box
    Then the navbar search count reads "1 / 1"
    And I see "hcl-domino"
    And the host was not sent GET to "/api/userinfo/claims"

  Scenario: Search: the login page draws no search icon
    Given the host answers the identity fixture
    And the host answers the identity-signed-out fixture
    When I open "/login"
    Then the navbar draws no search icon

  Scenario: Search: a signed-in person on the same host sees the icon
    Given the host answers the deploy-target-catalog fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"access_token\":\"t\"}"
    When I open "/"
    Then I see "hcl-domino"
    And the navbar draws the search icon
