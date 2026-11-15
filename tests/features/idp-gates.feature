Feature: the identity provider's gates, the step-up dialog's code entry and Disable two-factor under a site rule

  Background:
    Given the host answers the identity fixture

  Scenario: the gates: the shell follows a mid-session `403` `second_factor_required` on any request to `next` and keeps the page the person was on as the place to return to
    Given the host answers the idp-gates fixture
    When I open "/user/profile"
    Then the host was sent GET to "/api/config/places"
    And the path is "/authenticator"
    And the browser remembers "/user/profile" under "intended_url"
    And the browser holds "account" naming "Mark Gilbert"
    And the code entry "tfa-code" draws 6 boxes

  Scenario: the gates: the shell follows a mid-session `403` `onboarding_required` that carries no profile, keeps the page and leaves the cached profile as it is
    Given the host answers the idp-gates/onboarding fixture
    When I open "/user/profile"
    Then the host was sent GET to "/api/config/places"
    And the path is "/complete-onboarding/choose-2fa-method"
    And the browser remembers "/user/profile" under "intended_url"
    And the browser holds "account" naming "Mark Gilbert"

  Scenario: the gates: a remembered device asked for its code on `GET /api/user` lands on the code step with the cached profile never overwritten by a body that carries none
    Given the host answers the idp-gates/remembered fixture
    And the browser holds the identity fixture's account
    When I open "/user/profile"
    Then the path is "/authenticator"
    And the browser remembers "/user/profile" under "intended_url"
    And the browser holds "account" naming "Mark Gilbert"
    And the code entry "tfa-code" draws 6 boxes

  Scenario: the gates: a gate answered on an auth page moves to `next` and remembers no return path
    Given the host answers the idp-gates/remembered fixture
    When I open "/login"
    Then the path is "/authenticator"
    And the browser holds no "intended_url"

  Scenario: the gates: a gate answered on a page of its own chain moves nobody, the method picker staying while the code step is owed
    Given the host answers the idp-gates/remembered fixture
    When I open "/authenticator-method"
    Then the host was sent GET to "/api/user"
    And the host was sent GET to "/api/auth/tfa/methods"
    And the path is "/authenticator-method"
    And the browser holds no "intended_url"

  Scenario: the step-up dialog: an authenticator code draws the shared six-box code entry, and a backup code a plain text field behind its own link
    Given the host answers the idp-gates/step-up fixture
    When I open "/user/profile/security"
    And I click "Disable two-factor"
    And I confirm the dialog with "Disable two-factor"
    Then the host was sent PUT to "/api/user/tfa" carrying "enabled" as "false"
    And the code entry "step-up-code" draws 6 boxes
    And the step-up dialog links to its "backup" entry
    And the step-up dialog links to no "password" entry
    And I see "Use a backup code instead"
    When I switch the step-up dialog to its "backup" entry
    Then the open dialog draws the field "step-up-secret"
    And the page draws no code entry "step-up-code"
    When I switch the step-up dialog to its "code" entry
    Then the code entry "step-up-code" draws 6 boxes

  Scenario: Disable two-factor: while the profile's `tfa.required` is true the control is disabled with the reason as its title and the card says so in a line
    Given the host answers the idp-gates/required fixture
    When I open "/user/profile/security"
    Then I see "This site requires two-factor authentication. It cannot be turned off here."
    And the button "Disable two-factor" carries the reason "This site requires two-factor authentication. It cannot be turned off here."

  Scenario: Disable two-factor: the `409` `tfa_required` refusal draws its own message and the section re-reads nothing
    Given the host answers the idp-gates/refused fixture
    When I open "/user/profile/security"
    And I click "Disable two-factor"
    And I confirm the dialog with "Disable two-factor"
    Then the host was sent PUT to "/api/user/tfa" carrying "enabled" as "false"
    And I see "This site requires two-factor authentication. It cannot be turned off here."
    And the host was sent GET to "/api/user/tfa/methods" 1 times
