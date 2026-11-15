Feature: feature flags that carry sub flags inside their feature

  Background:
    Given the host answers the identity fixture

  Scenario: features: a list of plain strings is read as it is, `tfa` as a word mounting the two-factor pages
    Given the host answers the idp-features fixture
    When I open "/authenticator"
    Then the host was sent GET to "/api/auth/tfa"
    And the code entry "tfa-code" draws 6 boxes
    And the route draws no not-available stub
    When I open "/authenticator-method"
    Then the page offers 1 options
    And the path is "/authenticator-method"
    And the route draws no not-available stub

  Scenario: features: a host that answers `tfa` as a one-key object over its sub flag `app` still mounts the two-factor pages
    Given the host answers the idp-features fixture
    And the host answers the idp-features/object fixture
    When I open "/authenticator"
    Then the host was sent GET to "/api/auth/tfa"
    And the code entry "tfa-code" draws 6 boxes
    And the route draws no not-available stub
    When I open "/authenticator-method"
    Then the page offers 1 options
    And the path is "/authenticator-method"
    And the route draws no not-available stub

  Scenario: features: a host that lists no `tfa` draws the not-available stub on the two-factor routes
    Given the host answers the idp-features/closed fixture
    When I open "/authenticator"
    Then the route draws the not-available stub
    And the page draws no code entry "tfa-code"
    When I open "/authenticator-method"
    Then the route draws the not-available stub
