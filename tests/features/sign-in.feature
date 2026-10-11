Feature: the sign-in affordances a host closes

  Scenario: Sign-in: the issuer's page leaves out the link the methods answer closes, the open ones drawn
    Given the host answers the identity fixture
    And the host answers the identity-signed-out fixture
    When I open "/login"
    Then the host was sent GET to "/api/auth/methods"
    And I see "GitHub"
    And I see "Create an account"
    And I see "Sign in"
    And I do not see "Forgot password?"

  Scenario: Sign-in: a backend host's page leaves Create an account out while the answer closes registration, the open methods drawn
    Given the host answers the sign-in-backend fixture
    When I open "/login"
    Then the host was sent GET to "/api/auth/methods"
    And I see "GitHub"
    And I see "Sign in"
    And I do not see "Create an account"
